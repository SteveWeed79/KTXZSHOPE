/**
 * ============================================================================
 * FILE: app/api/stripe/webhook/route.ts
 * STATUS: MODIFIED (Replace existing file)
 * ============================================================================
 * 
 * Stripe Webhook Handler with Automatic Email Notifications
 * - Creates orders in database
 * - Updates inventory
 * - Sends confirmation emails automatically
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import type { Collection } from "mongodb";
import Card from "@/models/Card";
import Order from "@/models/Order";
import User from "@/models/User";
import Reservation from "@/models/Reservation";
import { generateOrderConfirmationEmail } from "@/lib/emails/orderConfirmation";
import { mustGetStripe, fromCents } from "@/lib/stripe";
import { mustGetEnv } from "@/lib/envValidation";
import { getResend, EMAIL_FROM, EMAIL_FROM_NAME, SITE_URL } from "@/lib/emailConfig";

export const runtime = "nodejs";

function normalizeStripeAddress(a: Stripe.Address | null | undefined) {
  return {
    line1: a?.line1 ?? "",
    line2: a?.line2 ?? "",
    city: a?.city ?? "",
    state: a?.state ?? "",
    postalCode: a?.postal_code ?? "",
    country: a?.country ?? "US",
  };
}

type StripeEventDoc = {
  _id: string;
  claimedAt: Date;
};

function isStripeProduct(p: Stripe.Product | string | null | undefined): p is Stripe.Product {
  return !!p && typeof p === "object";
}

async function claimStripeEventOnce(eventId: string) {
  const col = mongoose.connection.collection("stripe_events") as Collection<StripeEventDoc>;

  const res = await col.updateOne(
    { _id: eventId },
    { $setOnInsert: { _id: eventId, claimedAt: new Date() } },
    { upsert: true }
  );

  const upsertedCount =
    typeof (res as Record<string, unknown>).upsertedCount === "number" ? (res as Record<string, unknown>).upsertedCount : undefined;
  const upsertedId = (res as Record<string, unknown>).upsertedId;

  const inserted = upsertedCount !== undefined ? upsertedCount > 0 : !!upsertedId;
  return { alreadyClaimed: !inserted };
}

/**
 * Release a claimed event so Stripe can retry delivery.
 * Called when we claimed the event but then failed to process it.
 */
async function unclaimStripeEvent(eventId: string) {
  const col = mongoose.connection.collection("stripe_events") as Collection<StripeEventDoc>;
  await col.deleteOne({ _id: eventId });
}

/**
 * Finalize inventory after payment succeeds.
 *
 * Stock was already atomically decremented at checkout time. This function
 * handles the status transitions:
 * - Single items: "reserved" → "sold"
 * - Bulk items: mark "sold" if stock reached 0
 */
async function finalizeInventoryAfterPayment(items: Array<{ cardId: string; qty: number }>) {
  for (const it of items) {
    // Single items: transition reserved → sold
    const singleResult = await Card.findOneAndUpdate(
      { _id: it.cardId, inventoryType: "single", status: "reserved" },
      { $set: { status: "sold", isActive: false, stock: 0 } }
    );
    if (singleResult) continue;

    // Bulk items: check if stock hit zero, mark sold if so
    const card = await Card.findById(it.cardId).select("inventoryType stock").lean() as Record<string, unknown>;
    if (card && card.inventoryType === "bulk" && card.stock <= 0) {
      await Card.updateOne(
        { _id: it.cardId, stock: { $lte: 0 } },
        { $set: { status: "sold", isActive: false } }
      );
    }
  }
}

/**
 * Restore stock when a checkout session expires or payment fails.
 * Reverses the atomic decrements made during checkout.
 */
async function restoreReservedStock(reservationId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation || !reservation.items) return;

  for (const item of reservation.items) {
    const cardId = item.card.toString();
    const qty = item.quantity || 1;

    // Single items: reserved → active
    const singleResult = await Card.findOneAndUpdate(
      { _id: cardId, inventoryType: "single", status: "reserved" },
      { $set: { status: "active", isActive: true }, $inc: { stock: 1 } }
    );
    if (singleResult) continue;

    // Bulk items: restore stock
    await Card.findOneAndUpdate(
      { _id: cardId, inventoryType: "bulk" },
      { $inc: { stock: qty }, $set: { status: "active", isActive: true } }
    );
  }
}

async function sendOrderConfirmationEmail(order: Record<string, unknown>) {
  try {
    const orderNumber = order.orderNumber;
    
    const emailContent = generateOrderConfirmationEmail(
      {
        ...order,
        orderNumber,
      },
      SITE_URL
    );

    const result = await getResend().emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: order.email,
      subject: `Order Confirmation #${orderNumber} - KTXZ`,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (result.data) {
      console.log(`✅ Confirmation email sent to ${order.email}:`, result.data.id);
      return true;
    } else {
      console.error("❌ Failed to send confirmation email:", result.error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const webhookSecret = mustGetEnv("STRIPE_WEBHOOK_SECRET");
    const stripe = mustGetStripe();

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: unknown) {
      console.error("Stripe signature verification failed:", (err as Error)?.message);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Idempotency gate
    const { alreadyClaimed } = await claimStripeEventOnce(event.id);
    if (alreadyClaimed) {
      return NextResponse.json({ received: true, deduped: true });
    }

    // Handle session expiry and payment failures — cancel reservations
    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const expiredSession = event.data.object as Stripe.Checkout.Session;
      const reservationId = expiredSession.metadata?.reservationId;

      if (reservationId) {
        // Restore stock that was atomically decremented at checkout
        await restoreReservedStock(reservationId);
        await Reservation.updateOne(
          { _id: reservationId, status: "active" },
          { $set: { status: "cancelled" } }
        );
        console.log(`✅ Reservation ${reservationId} cancelled + stock restored (${event.type})`);
      }

      return NextResponse.json({ received: true, handled: event.type });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true, ignored: true, type: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const paid = session.payment_status === "paid";

    const sessionId = session.id;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : "";
    const customerId = typeof session.customer === "string" ? session.customer : "";

    const emailRaw = session.customer_details?.email || session.customer_email || "";
    const email = (emailRaw || "").toLowerCase().trim();

    if (!email) {
      console.error("Webhook: Stripe session missing customer email", sessionId);
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    // Check if order already exists
    const existing = await Order.findOne({ stripeCheckoutSessionId: sessionId });
    if (existing) {
      return NextResponse.json({ received: true, alreadyRecorded: true });
    }

    // Pull line items
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      expand: ["data.price.product"],
      limit: 100,
    });

    const purchased: Array<{
      cardId: string;
      qty: number;
      name: string;
      image: string;
      brandName: string;
      rarity: string;
      unitPrice: number;
    }> = [];

    for (const li of lineItems.data) {
      const qty = li.quantity ?? 1;

      const product = li.price?.product as Stripe.Product | string | null | undefined;
      const productObj = isStripeProduct(product) ? product : null;

      const metadata = productObj?.metadata ?? {};
      const cardId = (metadata.cardId as string) || "";

      const name = productObj?.name || li.description || "Item";
      const image = productObj?.images?.[0] || "";
      const brandName = (metadata.brand as string) || "";
      const rarity = (metadata.rarity as string) || "";

      const unitAmountCents =
        typeof li.price?.unit_amount === "number"
          ? li.price.unit_amount
          : typeof (li as Record<string, unknown>).amount_total === "number"
            ? Math.round(((li as Record<string, unknown>).amount_total as number) / Math.max(1, qty))
            : 0;

      const unitPrice = fromCents(unitAmountCents);

      if (cardId) {
        purchased.push({
          cardId,
          qty,
          name,
          image,
          brandName,
          rarity,
          unitPrice,
        });
      }
    }

    if (purchased.length === 0) {
      console.error("Webhook: No purchasable items in session line items", sessionId);
      return NextResponse.json(
        { error: "Invalid session data" },
        { status: 400 }
      );
    }

    // Link to user account
    const user = await User.findOne({ email }).select("_id").lean();

    // Addresses
    const shippingDetails = (session as Stripe.Checkout.Session & { shipping_details?: { name?: string; address?: Stripe.Address | null } }).shipping_details as
      | { name?: string; address?: Stripe.Address | null }
      | null
      | undefined;

    const shippingAddress = {
      name: shippingDetails?.name ?? "",
      ...normalizeStripeAddress(shippingDetails?.address ?? null),
    };

    const billingAddress = {
      name: session.customer_details?.name ?? "",
      ...normalizeStripeAddress(session.customer_details?.address ?? null),
    };

    // Amounts in dollars
    const subtotal = fromCents(session.amount_subtotal);
    const total = fromCents(session.amount_total);
    const tax = fromCents(session.total_details?.amount_tax ?? 0);
    const shipping = fromCents(session.total_details?.amount_shipping ?? 0);

    // --- FULFILLMENT WITH ERROR RECOVERY ---
    // Order of operations: create order → consume reservation → decrement stock → email
    // If order creation fails, unclaim the event so Stripe retries.
    // If stock decrement fails, flag the order for manual review.

    let order: InstanceType<typeof Order>;
    try {
      order = await Order.create({
        user: user?._id,
        email,
        items: purchased.map((p) => ({
          card: new mongoose.Types.ObjectId(p.cardId),
          name: p.name,
          image: p.image,
          brandName: p.brandName,
          rarity: p.rarity,
          unitPrice: p.unitPrice,
          quantity: p.qty,
        })),
        amounts: { subtotal, tax, shipping, total },
        currency: (session.currency || "usd").toLowerCase(),

        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId || undefined,
        stripeCustomerId: customerId || undefined,

        shippingAddress,
        billingAddress,

        status: paid ? "paid" : "pending",
        paidAt: paid ? new Date() : undefined,

        trackingNumber: "",
        carrier: "",
        notes: paid
          ? "Paid via Stripe. Awaiting fulfillment."
          : "Checkout completed but not marked paid yet.",
      });
    } catch (orderErr: unknown) {
      // Order creation failed — unclaim event so Stripe will retry
      console.error("Order creation failed, unclaiming event for retry:", orderErr);
      await unclaimStripeEvent(event.id);
      return NextResponse.json(
        { error: "Processing failed" },
        { status: 500 }
      );
    }

    // Consume reservation + finalize inventory status
    // NOTE: Stock was already atomically decremented at checkout time.
    // The webhook only needs to finalize status transitions (reserved→sold).
    const stockItems = purchased.map((p) => ({ cardId: p.cardId, qty: p.qty }));

    if (paid) {
      const reservationId = session.metadata?.reservationId;
      if (reservationId) {
        await Reservation.updateOne(
          { _id: reservationId, status: "active" },
          { $set: { status: "consumed", orderId: order._id } }
        );
      }

      try {
        await finalizeInventoryAfterPayment(stockItems);
      } catch (stockErr: unknown) {
        // Status transition failed — stock is correct but status may be stale
        // Flag for manual review rather than crashing (payment already succeeded)
        console.error("Inventory finalization failed after order creation:", stockErr);
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              notes: "NEEDS REVIEW: Inventory status finalization failed after payment. " +
                     `Error: ${(stockErr as Error)?.message || "unknown"}. ` +
                     "Verify inventory status manually.",
            },
          }
        );
      }
    }

    // Send confirmation email (non-critical — never block the webhook response)
    let emailSent = false;
    if (paid) {
      emailSent = await sendOrderConfirmationEmail(order.toObject());
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            emailStatus: emailSent ? "sent" : "failed",
            emailError: emailSent ? "" : "Email delivery failed — check logs",
          },
        }
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}