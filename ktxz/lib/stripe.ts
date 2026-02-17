// ktxz/lib/stripe.ts
import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

/**
 * Safe accessor:
 * - Returns a Stripe client if STRIPE_SECRET_KEY is present
 * - Returns null if Stripe isn't configured yet (no account/keys)
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey, {
      // Use a pinned API version once you have Stripe set up.
      // This value is valid for the currently installed Stripe SDK types.
      apiVersion: "2026-01-28.clover",
    });
  }

  return cachedStripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

/** Helper: dollars -> cents (Stripe uses integers) */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Helper: cents -> dollars */
export function fromCents(cents: number | null | undefined): number {
  const n = typeof cents === "number" ? cents : 0;
  return Math.round(n) / 100;
}

/** Like getStripe() but throws if Stripe is not configured. */
export function mustGetStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");
  return stripe;
}
