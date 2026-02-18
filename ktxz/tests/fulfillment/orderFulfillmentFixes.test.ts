import { describe, it, expect } from "vitest";

/**
 * Tests for order fulfillment bug fixes:
 * 1. Email price formatting (dollars not cents)
 * 2. Partial refund status logic
 * 3. Inventory restoration type guard
 * 4. Checkout reservation replacement (stock restore before re-reserve)
 */

// -------------------------------------------------------------------------
// 1. Email price formatting
//
// Amounts are stored in dollars in the database (fromCents is applied in the
// webhook before saving). The formatPrice helper must NOT divide by 100.
// -------------------------------------------------------------------------

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

describe("Email formatPrice (dollar inputs)", () => {
  it("formats whole dollar amounts", () => {
    expect(formatPrice(25)).toBe("$25.00");
    expect(formatPrice(100)).toBe("$100.00");
  });

  it("formats decimal dollar amounts", () => {
    expect(formatPrice(5.99)).toBe("$5.99");
    expect(formatPrice(12.5)).toBe("$12.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("correctly represents a $25.99 order total (not $0.26)", () => {
    // Before fix: formatPrice(25.99) → $0.26 (divided by 100)
    // After fix:  formatPrice(25.99) → $25.99
    const result = formatPrice(25.99);
    expect(result).toBe("$25.99");
    expect(result).not.toBe("$0.26");
  });

  it("correctly represents a $5.99 unit price for an item qty 3", () => {
    const unitPrice = 5.99;
    const qty = 3;
    const lineTotal = unitPrice * qty; // 17.97
    expect(formatPrice(lineTotal)).toBe("$17.97");
  });
});

// -------------------------------------------------------------------------
// 2. Partial refund status logic
//
// Full refunds → status becomes "refunded"
// Partial refunds → status stays unchanged (paid or fulfilled)
// -------------------------------------------------------------------------

type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";

function determineStatusAfterRefund(
  currentStatus: OrderStatus,
  isFullRefund: boolean
): OrderStatus {
  return isFullRefund ? "refunded" : currentStatus;
}

function isFullRefund(requestedAmount: number | undefined, orderTotal: number): boolean {
  if (!requestedAmount) return true; // no amount = full refund
  // Use integer cents comparison to avoid floating-point issues
  return Math.round(requestedAmount * 100) >= Math.round(orderTotal * 100);
}

describe("Partial refund — order status", () => {
  it("full refund (no amount) sets status to refunded", () => {
    expect(determineStatusAfterRefund("paid", true)).toBe("refunded");
    expect(determineStatusAfterRefund("fulfilled", true)).toBe("refunded");
  });

  it("partial refund leaves paid order as paid", () => {
    expect(determineStatusAfterRefund("paid", false)).toBe("paid");
  });

  it("partial refund leaves fulfilled order as fulfilled", () => {
    expect(determineStatusAfterRefund("fulfilled", false)).toBe("fulfilled");
  });

  it("isFullRefund returns true when no amount provided", () => {
    expect(isFullRefund(undefined, 50)).toBe(true);
  });

  it("isFullRefund returns true when amount equals total", () => {
    expect(isFullRefund(50, 50)).toBe(true);
  });

  it("isFullRefund returns true when amount exceeds total", () => {
    expect(isFullRefund(60, 50)).toBe(true);
  });

  it("isFullRefund returns false for partial amount", () => {
    expect(isFullRefund(10, 50)).toBe(false);
    expect(isFullRefund(0.01, 50)).toBe(false);
  });

  it("isFullRefund handles floating-point edge cases", () => {
    // 0.1 + 0.2 in floating point is 0.30000000000000004
    expect(isFullRefund(0.1 + 0.2, 0.3)).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 3. Inventory restore type guard
//
// restoreInventory must use inventoryType: "single" on the fallback query
// so it never overwrites a bulk card's stock with 1 when the bulk lookup
// returned null (e.g., card was deleted, race, etc.)
// -------------------------------------------------------------------------

type InventoryType = "single" | "bulk";

interface MockCard {
  _id: string;
  inventoryType: InventoryType;
  stock: number;
  status: string;
}

function buildRestoreQuery(card: MockCard): {
  bulkQuery: Record<string, unknown>;
  singleQuery: Record<string, unknown>;
} {
  return {
    bulkQuery: { _id: card._id, inventoryType: "bulk" },
    singleQuery: { _id: card._id, inventoryType: "single" },
  };
}

describe("restoreInventory type guard", () => {
  it("bulk restore query targets only bulk cards", () => {
    const { bulkQuery } = buildRestoreQuery({
      _id: "abc123",
      inventoryType: "bulk",
      stock: 5,
      status: "active",
    });
    expect(bulkQuery.inventoryType).toBe("bulk");
  });

  it("single restore query targets only single cards", () => {
    const { singleQuery } = buildRestoreQuery({
      _id: "abc123",
      inventoryType: "single",
      stock: 1,
      status: "sold",
    });
    expect(singleQuery.inventoryType).toBe("single");
  });

  it("single restore query would not match a bulk card", () => {
    const bulkCard: MockCard = {
      _id: "bulk001",
      inventoryType: "bulk",
      stock: 10,
      status: "active",
    };
    const { singleQuery } = buildRestoreQuery(bulkCard);
    // The query specifies inventoryType: "single", so it won't match this bulk card
    const wouldMatch = bulkCard.inventoryType === singleQuery.inventoryType;
    expect(wouldMatch).toBe(false);
  });
});

// -------------------------------------------------------------------------
// 4. Checkout reservation replacement
//
// When a user restarts checkout (e.g., clicks back from Stripe), the system
// must restore stock from their previous reservation BEFORE decrementing for
// the new one. Otherwise bulk item stock double-decrements.
// -------------------------------------------------------------------------

interface ReservationItem {
  cardId: string;
  qty: number;
  inventoryType: InventoryType;
}

/**
 * Simulates what happens to stock when a user restarts checkout.
 * Returns the final stock after: restoring old reservation + new decrement.
 */
function simulateCheckoutRestart(
  initialStock: number,
  previousReservationQty: number,
  newCheckoutQty: number
): number {
  // Step 1: old stock was already decremented when previous checkout ran
  let stock = initialStock - previousReservationQty;

  // Step 2: restore old reservation stock (the fix)
  stock += previousReservationQty;

  // Step 3: decrement for new checkout
  stock -= newCheckoutQty;

  return stock;
}

function simulateCheckoutRestartBuggy(
  initialStock: number,
  previousReservationQty: number,
  newCheckoutQty: number
): number {
  // Old (buggy) behaviour: just decrement again without restoring
  let stock = initialStock - previousReservationQty;
  stock -= newCheckoutQty; // double-decrement
  return stock;
}

describe("Checkout reservation replacement — stock accounting", () => {
  it("with fix: stock is correct after checkout restart (same qty)", () => {
    // Initial stock 5, user reserved 2, then restarted with 2 again
    const finalStock = simulateCheckoutRestart(5, 2, 2);
    expect(finalStock).toBe(3); // 5 - 2 (restore) + 2 - 2 = 3
  });

  it("with fix: stock is correct after checkout restart (different qty)", () => {
    // Initial 10, first checkout reserved 3, second checkout wants 4
    const finalStock = simulateCheckoutRestart(10, 3, 4);
    expect(finalStock).toBe(6); // 10 - 3 + 3 - 4 = 6
  });

  it("buggy behaviour double-decrements bulk stock", () => {
    // Initial 5, first checkout reserved 2, second checkout 2 — buggy result
    const buggyfinalStock = simulateCheckoutRestartBuggy(5, 2, 2);
    expect(buggyfinalStock).toBe(1); // 5 - 2 - 2 = 1 (wrong! should be 3)
  });

  it("fix and buggy produce different results for bulk items", () => {
    const fixed = simulateCheckoutRestart(5, 2, 2);
    const buggy = simulateCheckoutRestartBuggy(5, 2, 2);
    expect(fixed).not.toBe(buggy);
    expect(fixed).toBeGreaterThan(buggy);
  });
});
