import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import type { Collection } from "mongodb";
import Card from "@/models/Card";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var.`);
  return v;
}

function centsToDollars(cents: number | null | undefined) {
  const n = typeof cents === "number" ? cents : 0;
  return Math.round(n) / 100;
}

// IMPORTANT: do NOT include `name` here; name is set by the caller.
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
  _id: string; // Stripe event id
  claimedAt: Date;
};

function isStripeProduct(p: Stripe.Product | string | null | undefined): p is Stripe.Product {
  return !!p && typeof p === "object";
}

async function claimStripeEventOnce(eventId: string) {
  // Store Stripe event IDs as string _id (idempotency gate)
  const col = mongoose.connection.collection("stripe_events") as Collection<StripeEventDoc>;

  // Use updateOne+upsert to avoid findOneAndUpdate typing differences across driver overloads.
  const res = await col.updateOne(
    { _id: eventId },
    { $setOnInsert: { _id: eventId, claimedAt: new Date() } },
    { upsert: true }
  );

  // If we inserted (upserted) a doc, it was NOT previously claimed.
  const upsertedCount =
    typeof (res as any).upsertedCount === "number" ? (res as any).upsertedCount : undefined;
  const upsertedId = (res as any).upsertedId;

  const inserted = upsertedCount !== undefined ? upsertedCount > 0 : !!upsertedId;
  return { alreadyClaimed: !inserted };
}

async function markCardsSoldOrDecrementStock(items: Array<{ cardId: string; qty: number }>) {
  for (const it of items) {
    const card = await Card.findById(it.cardId);
    if (!card) continue;

    const inventoryType = ((card as any).inventoryType || "single") as "single" | "bulk";
    const qty = Math.max(1, Number(it.qty || 1));

    if (inventoryType === "bulk") {
      const currentStock = typeof (card as any).stock === "number" ? (card as any).stock : 0;
      const nextStock = Math.max(0, currentStock - qty);
      (card as any).stock = nextStock;

      if (nextStock === 0) {
        (card as any).status = "sold";
        (card as any).isActive = false;
      } else {
        (card as any).status = (card as any).status || "active";
        (card as any).isActive = (card as any).isActive ?? true;
      }

      await card.save();
      continue;
    }

    // single
    (card as any).status = "sold";
    (card as any).isActive = false;
    if (typeof (card as any).stock === "number") (card as any).stock = 0;
    await card.save();
  }
}

export async function POST(req: Request) {
  try {
    const stripeSecret = mustGetEnv("STRIPE_SECRET_KEY");
    const webhookSecret = mustGetEnv("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2026-01-28.clover",
    });

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

    // Idempotency gate (prevents double-processing)
    const { alreadyClaimed } = await claimStripeEventOnce(event.id);
    if (alreadyClaimed) {
      return NextResponse.json({ received: true, deduped: true });
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

    // Extra safety: if order already exists for this session, do nothing
    const existing = await Order.findOne({ stripeCheckoutSessionId: sessionId });
    if (existing) {
      return NextResponse.json({ received: true, alreadyRecorded: true });
    }

    // Pull line items to build Order.items (and to get cardId from metadata)
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
      unitPrice: number; // dollars
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

      // Prefer Stripe unit_amount (cents) if present, else derive from amount_total/qty
      const unitAmountCents =
        typeof li.price?.unit_amount === "number"
          ? li.price.unit_amount
          : typeof (li as any).amount_total === "number"
            ? Math.round(((li as any).amount_total as number) / Math.max(1, qty))
            : 0;

      const unitPrice = centsToDollars(unitAmountCents);

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

    // Link to a user account if the email exists
    const user = await User.findOne({ email }).select("_id").lean();

    // Addresses
    // Stripe's TS types for Checkout.Session vary by SDK version; some don't include shipping_details.
    // Runtime can still provide it, so we safely access it via `any`.
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

    // Amounts in dollars (Order schema expects dollars)
    const subtotal = centsToDollars(session.amount_subtotal);
    const total = centsToDollars(session.amount_total);
    const tax = centsToDollars(session.total_details?.amount_tax ?? 0);
    const shipping = centsToDollars(session.total_details?.amount_shipping ?? 0);

    const order = await Order.create({
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
        ? "Paid via Stripe. Fulfillment pending (Shippo not configured yet)."
        : "Checkout completed but not marked paid yet.",
    });

    // Inventory updates only if paid
    if (paid) {
      await markCardsSoldOrDecrementStock(purchased.map((p) => ({ cardId: p.cardId, qty: p.qty })));
    }

    return NextResponse.json({ received: true, orderId: order._id.toString(), paid });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Webhook error" }, { status: 500 });
  }
}
