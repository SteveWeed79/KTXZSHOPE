import { describe, it, expect } from "vitest";

/**
 * Tests for Stripe webhook and checkout logic.
 * Extracted from stripe/webhook/route.ts and stripe/checkout/route.ts
 */

// --- Extracted money formatting (used in checkout success) ---

function moneyFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// --- Extracted line item mapping ---

function extractLineItemInfo(li: any): { name: string; qty: number; amount: number } {
  const name = li?.price?.product?.name || li?.description || "Unknown Item";
  const qty = li?.quantity || 1;
  const amount = typeof li?.amount_total === "number" ? li.amount_total : 0;
  return { name, qty, amount };
}

// --- Extracted checkout URL builder ---

function buildCheckoutUrls(baseUrl: string, sessionIdPlaceholder: string) {
  const success = `${baseUrl}/checkout/success?session_id=${sessionIdPlaceholder}`;
  const cancel = `${baseUrl}/cart`;
  return { success, cancel };
}

// --- Tests ---

describe("Stripe money formatting", () => {
  it("converts cents to dollar string", () => {
    expect(moneyFromCents(1000)).toBe("$10.00");
    expect(moneyFromCents(999)).toBe("$9.99");
    expect(moneyFromCents(50)).toBe("$0.50");
    expect(moneyFromCents(0)).toBe("$0.00");
  });

  it("handles large amounts", () => {
    expect(moneyFromCents(100000)).toBe("$1000.00");
    expect(moneyFromCents(1234567)).toBe("$12345.67");
  });

  it("handles odd cent values", () => {
    expect(moneyFromCents(1)).toBe("$0.01");
    expect(moneyFromCents(3)).toBe("$0.03");
  });
});

describe("Stripe line item extraction", () => {
  it("extracts name from product.name", () => {
    const li = { price: { product: { name: "Charizard VMAX" } }, quantity: 2, amount_total: 5000 };
    const result = extractLineItemInfo(li);
    expect(result.name).toBe("Charizard VMAX");
    expect(result.qty).toBe(2);
    expect(result.amount).toBe(5000);
  });

  it("falls back to description when no product name", () => {
    const li = { description: "Trading Card", quantity: 1, amount_total: 1500 };
    const result = extractLineItemInfo(li);
    expect(result.name).toBe("Trading Card");
  });

  it("uses 'Unknown Item' as final fallback", () => {
    const li = { quantity: 1, amount_total: 0 };
    const result = extractLineItemInfo(li);
    expect(result.name).toBe("Unknown Item");
  });

  it("defaults quantity to 1 when missing", () => {
    const li = { amount_total: 1000 };
    const result = extractLineItemInfo(li);
    expect(result.qty).toBe(1);
  });

  it("defaults amount to 0 when missing", () => {
    const li = {};
    const result = extractLineItemInfo(li);
    expect(result.amount).toBe(0);
  });

  it("handles null line item gracefully", () => {
    const result = extractLineItemInfo(null);
    expect(result.name).toBe("Unknown Item");
    expect(result.qty).toBe(1);
    expect(result.amount).toBe(0);
  });
});

describe("Checkout URL construction", () => {
  it("builds correct success and cancel URLs", () => {
    const urls = buildCheckoutUrls("https://ktxz.shop", "{CHECKOUT_SESSION_ID}");
    expect(urls.success).toBe("https://ktxz.shop/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(urls.cancel).toBe("https://ktxz.shop/cart");
  });

  it("works with localhost", () => {
    const urls = buildCheckoutUrls("http://localhost:3000", "sess_123");
    expect(urls.success).toBe("http://localhost:3000/checkout/success?session_id=sess_123");
    expect(urls.cancel).toBe("http://localhost:3000/cart");
  });
});

describe("Webhook payment status handling", () => {
  function shouldClearCart(paymentStatus: string): boolean {
    return paymentStatus === "paid";
  }

  function calculateOrderTotals(session: {
    amount_total?: number | null;
    amount_subtotal?: number | null;
    total_details?: {
      amount_tax?: number | null;
      amount_shipping?: number | null;
    } | null;
  }) {
    const total = typeof session.amount_total === "number" ? session.amount_total : 0;
    const subtotal = typeof session.amount_subtotal === "number" ? session.amount_subtotal : 0;
    const tax = typeof session.total_details?.amount_tax === "number" ? session.total_details.amount_tax : 0;
    const shipping = typeof session.total_details?.amount_shipping === "number" ? session.total_details.amount_shipping : 0;
    return { total, subtotal, tax, shipping };
  }

  it("clears cart only when payment status is 'paid'", () => {
    expect(shouldClearCart("paid")).toBe(true);
    expect(shouldClearCart("unpaid")).toBe(false);
    expect(shouldClearCart("no_payment_required")).toBe(false);
    expect(shouldClearCart("")).toBe(false);
  });

  it("extracts order totals from session", () => {
    const session = {
      amount_total: 15000,
      amount_subtotal: 12000,
      total_details: { amount_tax: 1500, amount_shipping: 1500 },
    };
    const totals = calculateOrderTotals(session);
    expect(totals).toEqual({ total: 15000, subtotal: 12000, tax: 1500, shipping: 1500 });
  });

  it("defaults missing totals to 0", () => {
    const totals = calculateOrderTotals({});
    expect(totals).toEqual({ total: 0, subtotal: 0, tax: 0, shipping: 0 });
  });

  it("handles null total_details", () => {
    const totals = calculateOrderTotals({ amount_total: 5000, total_details: null });
    expect(totals).toEqual({ total: 5000, subtotal: 0, tax: 0, shipping: 0 });
  });
});
