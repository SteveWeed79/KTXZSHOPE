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

/**
 * Roll back atomically reserved stock if checkout fails partway through.
 * Restores stock for items that were already decremented.
 */
async function rollbackReservedStock(
  reserved: Array<{ cardId: string; qty: number; inventoryType: string }>
) {
  for (const item of reserved) {
    try {
      if (item.inventoryType === "single") {
        await Card.findOneAndUpdate(
          { _id: item.cardId, status: "reserved" },
          { $set: { status: "active" }, $inc: { stock: 1 } }
        );
      } else {
        await Card.findOneAndUpdate(
          { _id: item.cardId, inventoryType: "bulk" },
          { $inc: { stock: item.qty } }
        );
      }
    } catch (err) {
      console.error(`Failed to rollback stock for card ${item.cardId}:`, err);
    }
  }
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

    const siteUrl = mustGetEnv("NEXTAUTH_URL");
    const stripe = mustGetStripe();

    const body = (await req.json()) as CheckoutBody;

    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    await dbConnect();

    // ---------------------------------------------------------------
    // ATOMIC INVENTORY RESERVATION
    //
    // To prevent overselling, we atomically decrement stock at
    // checkout time using findOneAndUpdate with stock guards.
    // If checkout fails or the reservation expires, stock is restored.
    // ---------------------------------------------------------------
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const reservationItems: Array<{ card: mongoose.Types.ObjectId; quantity: number }> = [];
    // Track items we've already reserved so we can roll back on failure
    const reservedCards: Array<{ cardId: string; qty: number; inventoryType: string }> = [];

    try {
      for (const item of body.items) {
        const cardId = (item.cardId || "").trim();
        const qty = Math.min(99, Math.max(1, Number(item.quantity || 1)));

        if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
          throw Object.assign(
            new Error("Invalid cart item (missing or malformed cardId)."),
            { statusCode: 400 }
          );
        }

        // For single items: atomically claim the card by setting status to "reserved"
        // For bulk items: atomically decrement stock with a guard
        const card = await Card.findById(cardId).populate("brand");
        if (!card) {
          throw Object.assign(new Error(`Card not found: ${cardId}`), { statusCode: 404 });
        }

        const inventoryType = (card as Record<string, unknown>).inventoryType || "single";

        if (inventoryType === "single") {
          // Atomically reserve a single card — only succeeds if active + stock >= 1
          const reserved = await Card.findOneAndUpdate(
            {
              _id: cardId,
              status: "active",
              isActive: true,
              stock: { $gte: 1 },
            },
            {
              $set: { status: "reserved" },
              $inc: { stock: -1 },
            },
            { new: true }
          );

          if (!reserved) {
            throw Object.assign(
              new Error(`Item unavailable (already sold or reserved): ${card.name}`),
              { statusCode: 409 }
            );
          }

          reservedCards.push({ cardId, qty: 1, inventoryType: "single" });

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
                  brand: String((card as Record<string, unknown> & { brand?: { name?: string } }).brand?.name || ""),
                  rarity: String((card as Record<string, unknown>).rarity || ""),
                  inventoryType: "single",
                },
              },
            },
          });
          reservationItems.push({ card: card._id, quantity: 1 });
          continue;
        }

        // Bulk: atomically decrement stock with guard
        const reserved = await Card.findOneAndUpdate(
          {
            _id: cardId,
            inventoryType: "bulk",
            status: "active",
            isActive: true,
            stock: { $gte: qty },
          },
          {
            $inc: { stock: -qty },
          },
          { new: true }
        );

        if (!reserved) {
          // Re-read to give a helpful error message
          const current = await Card.findById(cardId).select("stock name status isActive").lean() as Record<string, unknown> | null;
          if (!current || current.status === "sold" || !current.isActive) {
            throw Object.assign(
              new Error(`Item unavailable: ${card.name}`),
              { statusCode: 409 }
            );
          }
          throw Object.assign(
            new Error(
              `Not enough stock for ${card.name}. Requested ${qty}, available ${current.stock ?? 0}.`
            ),
            { statusCode: 409 }
          );
        }

        reservedCards.push({ cardId, qty, inventoryType: "bulk" });

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
                brand: String((card as Record<string, unknown> & { brand?: { name?: string } }).brand?.name || ""),
                rarity: String((card as Record<string, unknown>).rarity || ""),
                inventoryType: "bulk",
              },
            },
          },
        });
        reservationItems.push({ card: card._id, quantity: qty });
      }
    } catch (reserveErr: unknown) {
      // Roll back any stock we already reserved for earlier items
      await rollbackReservedStock(reservedCards);
      const typedErr = reserveErr as { statusCode?: number; message?: string };
      if (typedErr.statusCode) {
        return NextResponse.json(
          { error: typedErr.message },
          { status: typedErr.statusCode }
        );
      }
      throw reserveErr;
    }

    // Create inventory reservation record (for tracking/cleanup)
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
