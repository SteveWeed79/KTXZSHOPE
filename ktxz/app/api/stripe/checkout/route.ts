import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { RateLimiters, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var.`);
  return v;
}

function dollarsToCents(dollars: number) {
  // Safe conversion for 2-decimal USD style pricing
  return Math.round((Number(dollars) || 0) * 100);
}

type CheckoutBody = {
  items: Array<{
    cardId: string;
    quantity?: number;
  }>;
};

export async function POST(req: Request) {
  try {
    // Rate limit: 5 checkout attempts per minute per IP
    const rl = await RateLimiters.strict.check(req, 5);
    if (!rl.success) return rateLimitResponse(rl);

    // Require authentication — no anonymous checkout via this route
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const stripeSecret = mustGetEnv("STRIPE_SECRET_KEY");
    const siteUrl = mustGetEnv("NEXTAUTH_URL"); // you already use this for password reset links

    const stripe = new Stripe(stripeSecret, {
      // NOTE: Must match the Stripe SDK's allowed literal type union for apiVersion.
      apiVersion: "2026-01-28.clover",
    });

    const body = (await req.json()) as CheckoutBody;

    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    await dbConnect();

    // Load cards & validate availability
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of body.items) {
      const cardId = (item.cardId || "").trim();
      const qty = Math.min(99, Math.max(1, Number(item.quantity || 1)));

      if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
        return NextResponse.json(
          { error: "Invalid cart item (missing or malformed cardId)." },
          { status: 400 }
        );
      }

      const card = await Card.findById(cardId).populate("brand");
      if (!card) {
        return NextResponse.json({ error: `Card not found: ${cardId}` }, { status: 404 });
      }

      // Sold / inactive protection (your schema updates)
      const isActive = (card as any).isActive ?? true;
      const status = (card as any).status ?? "active";

      if (!isActive || status === "sold") {
        return NextResponse.json(
          { error: `Item unavailable (already sold): ${card.name}` },
          { status: 409 }
        );
      }

      const inventoryType = (card as any).inventoryType || "single"; // single | bulk

      if (inventoryType === "single") {
        // force quantity = 1 for singles
        const unitPriceCents = dollarsToCents(Number(card.price));
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitPriceCents,
            product_data: {
              name: String(card.name),
              images: card.image ? [String(card.image)] : [],
              metadata: {
                cardId: String(card._id),
                brand: String((card as any).brand?.name || ""),
                rarity: String((card as any).rarity || ""),
                inventoryType: "single",
              },
            },
          },
        });
        continue;
      }

      // bulk
      const stock = typeof (card as any).stock === "number" ? (card as any).stock : 0;
      if (stock <= 0) {
        return NextResponse.json(
          { error: `Item out of stock: ${card.name}` },
          { status: 409 }
        );
      }
      if (qty > stock) {
        return NextResponse.json(
          {
            error: `Not enough stock for ${card.name}. Requested ${qty}, available ${stock}.`,
          },
          { status: 409 }
        );
      }

      const unitPriceCents = dollarsToCents(Number(card.price));
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: "usd",
          unit_amount: unitPriceCents,
          product_data: {
            name: String(card.name),
            images: card.image ? [String(card.image)] : [],
            metadata: {
              cardId: String(card._id),
              brand: String((card as any).brand?.name || ""),
              rarity: String((card as any).rarity || ""),
              inventoryType: "bulk",
            },
          },
        },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,

      // Guest allowed; Stripe collects email
      customer_creation: "if_required",

      // Address collection for shipping + accurate tax
      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      // Stripe Tax (needs to be enabled/configured in Stripe dashboard)
      automatic_tax: { enabled: true },

      // You can later add shipping rates (Shippo phase). For now, no shipping charge.
      // If you want a flat shipping price now, we can add a shipping_rate here later.

      success_url: `${siteUrl}/shop?success=1`,
      cancel_url: `${siteUrl}/cart?canceled=1`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Checkout error" }, { status: 500 });
  }
}
