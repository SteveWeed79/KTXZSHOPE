/**
 * ============================================================================
 * FILE: ktxz/app/checkout/actions.ts
 * STATUS: MODIFIED (Atomic inventory + rate limiting)
 * ============================================================================
 *
 * Create Stripe checkout session with atomic inventory reservation.
 *
 * SECURITY:
 * - Atomic findOneAndUpdate prevents overselling (no TOCTOU race)
 * - Stock is decremented at checkout, restored on expiry/cancellation
 * - Rate limited to prevent abuse
 */

"use server";

import { redirect } from "next/navigation";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { getStripe } from "@/lib/stripe";
import { loadCart } from "@/lib/cartHelpers";
import Reservation from "@/models/Reservation";
import { checkActionRateLimit } from "@/lib/rateLimit";

const HOLD_MINUTES = 10;

function getSiteUrl() {
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Missing NEXTAUTH_URL (or NEXT_PUBLIC_SITE_URL) env var.");
  return url.replace(/\/+$/, "");
}

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
          { $set: { status: "active", isActive: true }, $inc: { stock: 1 } }
        );
      } else {
        await Card.findOneAndUpdate(
          { _id: item.cardId, inventoryType: "bulk" },
          { $inc: { stock: item.qty }, $set: { status: "active", isActive: true } }
        );
      }
    } catch (err) {
      console.error(`Failed to rollback stock for card ${item.cardId}:`, err);
    }
  }
}

export async function createCheckoutSession() {
  // Rate limit: 5 checkout attempts per minute per IP
  const rl = await checkActionRateLimit("strict", 5, "createCheckoutSession");
  if (!rl.success) {
    redirect("/cart?error=rate-limit");
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");

  await dbConnect();

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Load cart from database or cookie
  const cart = await loadCart(userId);
  const items = cart.items ?? [];

  if (!items.length) {
    redirect("/cart");
  }

  const ids = items.map((i) => i.cardId).filter(Boolean);
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== ids.length) {
    redirect("/cart?error=invalid-item");
  }

  const cards = await Card.find({ _id: { $in: validIds } }).populate("brand").lean();

  const cardsById = new Map<string, Record<string, unknown>>();
  for (const c of cards) cardsById.set(String(c._id), c);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  // ---------------------------------------------------------------
  // ATOMIC INVENTORY RESERVATION
  //
  // To prevent overselling, we atomically decrement stock at
  // checkout time using findOneAndUpdate with stock guards.
  // If checkout fails or the reservation expires, stock is restored.
  // ---------------------------------------------------------------
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

  const reservationItems: Array<{ card: mongoose.Types.ObjectId; quantity: number }> = [];
  // Track items we've already reserved so we can roll back on failure
  const reservedCards: Array<{ cardId: string; qty: number; inventoryType: string }> = [];

  for (const it of items) {
    const card = cardsById.get(it.cardId);
    if (!card) {
      // Roll back any stock already reserved for earlier items
      await rollbackReservedStock(reservedCards);
      redirect("/cart?error=missing-item");
    }

    const price = Number(card.price);
    if (!Number.isFinite(price) || price <= 0) {
      await rollbackReservedStock(reservedCards);
      redirect("/cart?error=bad-price");
    }

    const inventoryType = (card.inventoryType || "single") as "single" | "bulk";
    const isBulk = inventoryType === "bulk";
    const qtyRequested = isBulk ? Math.max(1, Math.floor(Number(it.qty || 1))) : 1;

    if (inventoryType === "single") {
      // Atomically reserve a single card — only succeeds if active + stock >= 1
      const reserved = await Card.findOneAndUpdate(
        {
          _id: it.cardId,
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
        // Item unavailable — roll back earlier reservations
        await rollbackReservedStock(reservedCards);
        redirect("/cart?error=reserved");
      }

      reservedCards.push({ cardId: it.cardId, qty: 1, inventoryType: "single" });
    } else {
      // Bulk: atomically decrement stock with guard
      const reserved = await Card.findOneAndUpdate(
        {
          _id: it.cardId,
          inventoryType: "bulk",
          status: "active",
          isActive: true,
          stock: { $gte: qtyRequested },
        },
        {
          $inc: { stock: -qtyRequested },
        },
        { new: true }
      );

      if (!reserved) {
        // Insufficient stock — roll back earlier reservations
        await rollbackReservedStock(reservedCards);
        redirect("/cart?error=insufficient-stock");
      }

      reservedCards.push({ cardId: it.cardId, qty: qtyRequested, inventoryType: "bulk" });
    }

    const qty = isBulk ? qtyRequested : 1;
    const unitAmount = Math.round(price * 100);

    reservationItems.push({ card: new mongoose.Types.ObjectId(String(card._id)), quantity: qty });

    const brandObj = card.brand as { name?: string } | null | undefined;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: String(card.name || "Item"),
          description: (card.description as string) || undefined,
          images: card.image ? [String(card.image)] : undefined,
          metadata: {
            cardId: String(card._id),
            brand: brandObj?.name ? String(brandObj.name) : "",
            rarity: card.rarity ? String(card.rarity) : "",
            inventoryType: String(inventoryType),
          },
        },
        unit_amount: unitAmount,
      },
      quantity: qty,
    });
  }

  if (!reservationItems.length) {
    redirect("/cart");
  }

  const siteUrl = getSiteUrl();

  const holderType: "user" | "guest" = userId ? "user" : "guest";
  const holderKey = userId || cart.id || "";

  // If holderKey is empty (shouldn't happen), roll back and abort
  if (!holderKey) {
    await rollbackReservedStock(reservedCards);
    redirect("/cart?error=session-error");
  }

  // Cancel any existing active reservations for this holder
  await Reservation.updateMany(
    { holderType, holderKey, status: "active" },
    { $set: { status: "cancelled" } }
  );

  const reservation = await Reservation.create({
    holderType,
    holderKey,
    status: "active",
    expiresAt,
    items: reservationItems,
  });

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
        reservationId: String(reservation._id),
        holdMinutes: String(HOLD_MINUTES),
        source: "ktxz_checkout",
        userId: userId || "",
        holderKey,
      },

      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    await Reservation.updateOne(
      { _id: reservation._id },
      { $set: { stripeCheckoutSessionId: checkoutSession.id } }
    );

    if (!checkoutSession.url) throw new Error("Stripe did not return a checkout URL.");

    // Store the URL before redirecting so we can redirect outside the try-catch.
    // Next.js redirect() throws a special NEXT_REDIRECT error that must NOT be caught.
    const stripeUrl = checkoutSession.url;
    redirect(stripeUrl);
  } catch (e: unknown) {
    // Next.js redirect() works by throwing. Don't cancel the reservation for redirects.
    const typedE = e as { digest?: string; message?: string };
    const isRedirect =
      typedE?.digest?.startsWith?.("NEXT_REDIRECT") || typedE?.message === "NEXT_REDIRECT";
    if (isRedirect) throw e;

    // Actual error: roll back atomic stock decrements and cancel reservation
    await rollbackReservedStock(reservedCards);
    await Reservation.updateOne({ _id: reservation._id }, { $set: { status: "cancelled" } });
    throw e;
  }
}
