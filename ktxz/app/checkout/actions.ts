"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { getStripe } from "@/lib/stripe";
import { getCartFromCookies } from "@/lib/cartCookie";
import Reservation from "@/models/Reservation";

/**
 * Inventory hold window (MVP)
 * - We create a Reservation before Stripe redirect
 * - Webhook will later "consume" it when paid (next file after this)
 */
const HOLD_MINUTES = 10;

function getSiteUrl() {
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Missing NEXTAUTH_URL (or NEXT_PUBLIC_SITE_URL) env var.");
  return url.replace(/\/+$/, "");
}

/**
 * Compute total reserved qty per cardId for active, unexpired reservations.
 * Canonical Reservation shape is: items[*] = { card: ObjectId, quantity: number }.
 */
async function getActiveReservedQtyByCardId(cardIds: string[], now: Date) {
  const map = new Map<string, number>();
  if (cardIds.length === 0) return map;

  const objectIds = cardIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return map;

  const rows = await Reservation.aggregate([
    {
      $match: {
        status: "active",
        expiresAt: { $gt: now },
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.card": { $in: objectIds },
      },
    },
    {
      $group: {
        _id: "$items.card",
        qty: { $sum: "$items.quantity" },
      },
    },
  ]);

  for (const r of rows) {
    map.set(String(r._id), Number(r.qty || 0));
  }

  return map;
}

export async function createCheckoutSession() {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");

  await dbConnect();

  const cookieStore = await cookies();
  const cart = getCartFromCookies(cookieStore);
  const items = cart.items ?? [];

  if (!items.length) {
    redirect("/cart");
  }

  // Cart cookie stores cardId as a string; validate before passing into mongoose queries.
  const ids = items.map((i) => i.cardId).filter(Boolean);
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== ids.length) {
    redirect("/cart?error=invalid-item");
  }

  const cards = await Card.find({ _id: { $in: validIds } }).populate("brand").lean();

  const cardsById = new Map<string, any>();
  for (const c of cards) cardsById.set(String(c._id), c);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  // Prevent oversells by accounting for other active holds
  const reservedQtyByCardId = await getActiveReservedQtyByCardId(validIds, now);

  const lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
        metadata?: Record<string, string>;
      };
      unit_amount: number;
    };
    quantity: number;
  }> = [];

  // Reservation items in canonical shape: { card, quantity }
  const reservationItems: Array<{ card: mongoose.Types.ObjectId; quantity: number }> = [];

  for (const it of items) {
    const card = cardsById.get(it.cardId);
    if (!card) redirect("/cart?error=missing-item");

    const price = Number(card.price);
    if (!Number.isFinite(price) || price <= 0) redirect("/cart?error=bad-price");

    const isInactive = card.isActive === false || card.status === "inactive";
    const isSold = card.status === "sold";
    const inventoryType = (card.inventoryType || "single") as "single" | "bulk";
    const isBulk = inventoryType === "bulk";
    const stock = typeof card.stock === "number" ? card.stock : isBulk ? 0 : 1;

    const canBuy = !isInactive && !isSold && (!isBulk || stock > 0);
    if (!canBuy) redirect("/cart?error=unavailable");

    const qtyRequested = isBulk ? Math.max(1, Math.floor(Number(it.qty || 1))) : 1;

    if (inventoryType === "single") {
      // A single is unavailable if *any* active hold exists for it.
      const alreadyReserved = reservedQtyByCardId.get(String(card._id)) ?? 0;
      if (alreadyReserved > 0) {
        redirect("/cart?error=reserved");
      }
    } else {
      // bulk: available = stock - activeReserved
      const alreadyReserved = reservedQtyByCardId.get(String(card._id)) ?? 0;
      const available = Math.max(0, stock - alreadyReserved);

      if (available <= 0) redirect("/cart?error=out-of-stock");
      if (qtyRequested > available) redirect("/cart?error=insufficient-stock");
    }

    const qty = isBulk ? qtyRequested : 1;
    const unitAmount = Math.round(price * 100);

    reservationItems.push({ card: new mongoose.Types.ObjectId(String(card._id)), quantity: qty });

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: card.name,
          description: card.description || undefined,
          images: card.image ? [card.image] : undefined,
          metadata: {
            cardId: String(card._id),
            brand: card.brand?.name ? String(card.brand.name) : "",
            rarity: card.rarity ? String(card.rarity) : "",
            inventoryType: String(inventoryType),
          },
        },
        unit_amount: unitAmount,
      },
      quantity: qty,
    });
  }

  if (!reservationItems.length) redirect("/cart");

  const siteUrl = getSiteUrl();
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : "";

  const holderType: "user" | "guest" = userId ? "user" : "guest";
  const holderKey = userId || cart.id;

  // If user clicks multiple times, cancel previous active holds for this holderKey
  await Reservation.updateMany(
    { holderType, holderKey, status: "active" },
    { $set: { status: "cancelled" } }
  );

  // 1) Create Reservation (the hold)
  const reservation = await Reservation.create({
    holderType,
    holderKey,
    status: "active",
    expiresAt,
    items: reservationItems,
  });

  // 2) Create Stripe Checkout Session (attach reservationId)
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      allow_promotion_codes: true,

      customer_email: session?.user?.email || undefined,

      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      automatic_tax: { enabled: true },

      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Standard Shipping",
            type: "fixed_amount",
            fixed_amount: { amount: 899, currency: "usd" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            display_name: "Local Pickup",
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
          },
        },
      ],

      metadata: {
        cartId: cart.id,
        reservationId: String(reservation._id),
        holdMinutes: String(HOLD_MINUTES),
        source: "ktxz_checkout",
        userId,
      },

      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    // 3) Link reservation → Stripe session id for easy webhook lookup
    await Reservation.updateOne(
      { _id: reservation._id },
      { $set: { stripeCheckoutSessionId: checkoutSession.id } }
    );

    if (!checkoutSession.url) throw new Error("Stripe did not return a checkout URL.");
    redirect(checkoutSession.url);
  } catch (e) {
    // If Stripe creation fails, release the hold
    await Reservation.updateOne({ _id: reservation._id }, { $set: { status: "cancelled" } });
    throw e;
  }
}
