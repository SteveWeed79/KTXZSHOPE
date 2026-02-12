import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Reservation from "@/models/Reservation";
import { auth } from "@/auth";
import { RateLimiters, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse } from "@/lib/apiResponse";
import { mustGetStripe, toCents } from "@/lib/stripe";
import { mustGetEnv } from "@/lib/envValidation";

const RESERVATION_TTL_MINUTES = 30;

export const runtime = "nodejs";

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

    const siteUrl = mustGetEnv("NEXTAUTH_URL");
    const stripe = mustGetStripe();

    const body = (await req.json()) as CheckoutBody;

    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    await dbConnect();

    // Load cards & validate availability
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const reservationItems: Array<{ card: mongoose.Types.ObjectId; quantity: number }> = [];

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
        const unitPriceCents = toCents(Number(card.price));
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
        reservationItems.push({ card: card._id, quantity: 1 });
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

      const unitPriceCents = toCents(Number(card.price));
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
      reservationItems.push({ card: card._id, quantity: qty });
    }

    // Create inventory reservation to hold items during Stripe checkout
    const reservation = await Reservation.create({
      holderKey: session.user.id,
      holderType: "user",
      items: reservationItems,
      status: "active",
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000),
    });

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

      // Link reservation so webhook can consume it on payment success
      metadata: {
        reservationId: reservation._id.toString(),
        userId: session.user.id ?? "",
      },

      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart?canceled=1`,
    });

    // Link the Stripe session back to the reservation
    await Reservation.updateOne(
      { _id: reservation._id },
      { $set: { stripeCheckoutSessionId: checkoutSession.id } }
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return errorResponse(error);
  }
}
