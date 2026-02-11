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

import { NextRequest, NextResponse } from "next/server";
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
    typeof (res as any).upsertedCount === "number" ? (res as any).upsertedCount : undefined;
  const upsertedId = (res as any).upsertedId;

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

async function markCardsSoldOrDecrementStock(items: Array<{ cardId: string; qty: number }>) {
  for (const it of items) {
    const qty = Math.max(1, Number(it.qty || 1));

    // Attempt atomic decrement for bulk items first
    const bulkResult = await Card.findOneAndUpdate(
      { _id: it.cardId, inventoryType: "bulk", stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (bulkResult) {
      // If stock hit zero, mark as sold
      if ((bulkResult as any).stock <= 0) {
        await Card.updateOne(
          { _id: it.cardId },
          { $set: { status: "sold", isActive: false } }
        );
      }
      continue;
    }

    // Single item or bulk that didn't match — mark as sold atomically
    await Card.findOneAndUpdate(
      { _id: it.cardId },
      { $set: { status: "sold", isActive: false, stock: 0 } }
    );
  }
}

async function sendOrderConfirmationEmail(order: any) {
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
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err?.message || "unknown"}` },
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
        await Reservation.updateOne(
          { _id: reservationId, status: "active" },
          { $set: { status: "cancelled" } }
        );
        console.log(`✅ Reservation ${reservationId} cancelled (${event.type})`);
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
      return NextResponse.json({ error: "Stripe session missing customer email." }, { status: 400 });
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
          : typeof (li as any).amount_total === "number"
            ? Math.round(((li as any).amount_total as number) / Math.max(1, qty))
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
      return NextResponse.json(
        { error: "No purchasable items found in session line items." },
        { status: 400 }
      );
    }

    // Link to user account
    const user = await User.findOne({ email }).select("_id").lean();

    // Addresses
    const shippingDetails = (session as any).shipping_details as
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

    let order: any;
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
    } catch (orderErr: any) {
      // Order creation failed — unclaim event so Stripe will retry
      console.error("Order creation failed, unclaiming event for retry:", orderErr);
      await unclaimStripeEvent(event.id);
      return NextResponse.json(
        { error: "Order creation failed — will retry" },
        { status: 500 }
      );
    }

    // Consume reservation + update inventory
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
        await markCardsSoldOrDecrementStock(stockItems);
      } catch (stockErr: any) {
        // Stock update failed — order exists but inventory not updated
        // Flag for manual review rather than crashing (payment already succeeded)
        console.error("Stock decrement failed after order creation:", stockErr);
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              notes: "NEEDS REVIEW: Stock decrement failed after payment. " +
                     `Error: ${stockErr?.message || "unknown"}. ` +
                     "Verify inventory manually.",
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

    return NextResponse.json({
      received: true,
      orderId: order._id.toString(),
      paid,
      emailSent,
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err?.message || "Webhook error" }, { status: 500 });
  }
}