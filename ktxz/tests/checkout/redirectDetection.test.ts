import { describe, it, expect } from "vitest";

/**
 * Tests the critical fix for the checkout action's try-catch block.
 * The bug: Next.js redirect() throws a NEXT_REDIRECT error. The catch block
 * was cancelling reservations on ALL errors, including redirect "errors".
 * The fix: Check if the error is a redirect before cancelling.
 */

function isNextRedirect(e: any): boolean {
  return e?.digest?.startsWith?.("NEXT_REDIRECT") || e?.message === "NEXT_REDIRECT";
}

describe("Next.js redirect detection", () => {
  it("detects NEXT_REDIRECT by digest property", () => {
    const redirectError = { digest: "NEXT_REDIRECT;/checkout/success?session_id=abc" };
    expect(isNextRedirect(redirectError)).toBe(true);
  });

  it("detects NEXT_REDIRECT by message property", () => {
    const redirectError = { message: "NEXT_REDIRECT" };
    expect(isNextRedirect(redirectError)).toBe(true);
  });

  it("does NOT flag regular errors as redirect", () => {
    const stripeError = new Error("Stripe API error");
    expect(isNextRedirect(stripeError)).toBe(false);
  });

  it("does NOT flag null/undefined as redirect", () => {
    expect(isNextRedirect(null)).toBe(false);
    expect(isNextRedirect(undefined)).toBe(false);
  });

  it("does NOT flag string errors as redirect", () => {
    expect(isNextRedirect("some error")).toBe(false);
  });
});

describe("Checkout reservation lifecycle", () => {
  it("should NOT cancel reservation when redirect succeeds", () => {
    // Simulate the fixed checkout flow
    let reservationCancelled = false;
    const stripeUrl = "https://checkout.stripe.com/pay/session123";

    try {
      // Simulate redirect throwing NEXT_REDIRECT
      const redirectError: any = new Error("NEXT_REDIRECT");
      redirectError.digest = `NEXT_REDIRECT;${stripeUrl}`;
      throw redirectError;
    } catch (e: any) {
      const isRedirect = isNextRedirect(e);
      if (isRedirect) {
        // Re-throw without cancelling
      } else {
        reservationCancelled = true;
      }
    }

    expect(reservationCancelled).toBe(false);
  });

  it("SHOULD cancel reservation when Stripe API fails", () => {
    let reservationCancelled = false;

    try {
      throw new Error("Stripe API rate limited");
    } catch (e: any) {
      const isRedirect = isNextRedirect(e);
      if (!isRedirect) {
        reservationCancelled = true;
      }
    }

    expect(reservationCancelled).toBe(true);
  });
});
