// ktxz/lib/stripe.ts
import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

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
      // This value is valid, but you can update it later from Stripe Workbench.
      apiVersion: "2025-01-27.acacia",
    });
  }

  return cachedStripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

/** Helper: dollars -> cents (Stripe uses integers) */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
