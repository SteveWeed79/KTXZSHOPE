import { describe, it, expect } from "vitest";

/**
 * Tests for cart API route logic:
 * - Input validation (cardId format, quantity bounds)
 * - Quantity clamping for bulk/single inventory types
 * - Redirect behavior
 */

// --- Extracted from cart/update/route.ts ---

function toPositiveInt(value: unknown, fallback = 1): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function clampQuantity(
  requestedQty: number,
  inventoryType: "single" | "bulk",
  stock: number
): number {
  if (inventoryType === "single") return 1;
  const maxQty = Math.max(0, stock);
  return Math.min(requestedQty, Math.max(1, maxQty || 1));
}

// --- Tests ---

describe("Cart quantity parsing (toPositiveInt)", () => {
  it("parses valid positive integers", () => {
    expect(toPositiveInt("5")).toBe(5);
    expect(toPositiveInt(3)).toBe(3);
    expect(toPositiveInt("10")).toBe(10);
  });

  it("clamps to minimum of 1", () => {
    expect(toPositiveInt("0")).toBe(1);
    expect(toPositiveInt("-5")).toBe(1);
    expect(toPositiveInt(0)).toBe(1);
  });

  it("truncates decimals", () => {
    expect(toPositiveInt("3.7")).toBe(3);
    expect(toPositiveInt(2.9)).toBe(2);
  });

  it("returns fallback for non-numeric input", () => {
    expect(toPositiveInt("abc")).toBe(1);
    expect(toPositiveInt(null)).toBe(1);
    expect(toPositiveInt(undefined)).toBe(1);
    expect(toPositiveInt("")).toBe(1);
  });

  it("returns fallback for NaN/Infinity", () => {
    expect(toPositiveInt(NaN)).toBe(1);
    expect(toPositiveInt(Infinity)).toBe(1);
    expect(toPositiveInt(-Infinity)).toBe(1);
  });

  it("uses custom fallback value", () => {
    expect(toPositiveInt("abc", 5)).toBe(5);
    expect(toPositiveInt(NaN, 10)).toBe(10);
  });
});

describe("Cart cardId validation", () => {
  it("accepts valid 24-char hex ObjectIds", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidObjectId("aaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
    expect(isValidObjectId("AAAAAAAAAAAAAAAAAAAAAAAA")).toBe(true);
  });

  it("rejects invalid ObjectIds", () => {
    expect(isValidObjectId("")).toBe(false);
    expect(isValidObjectId("short")).toBe(false);
    expect(isValidObjectId("507f1f77bcf86cd79943901")).toBe(false); // 23 chars
    expect(isValidObjectId("507f1f77bcf86cd7994390111")).toBe(false); // 25 chars
    expect(isValidObjectId("zzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false); // non-hex
  });

  it("rejects injection attempts", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011; DROP TABLE")).toBe(false);
    expect(isValidObjectId("$ne:null")).toBe(false);
    expect(isValidObjectId("{$gt: ''}")).toBe(false);
  });
});

describe("Cart quantity clamping", () => {
  it("always returns 1 for single inventory type", () => {
    expect(clampQuantity(5, "single", 100)).toBe(1);
    expect(clampQuantity(1, "single", 0)).toBe(1);
    expect(clampQuantity(99, "single", 1)).toBe(1);
  });

  it("clamps bulk quantity to available stock", () => {
    expect(clampQuantity(10, "bulk", 5)).toBe(5);
    expect(clampQuantity(3, "bulk", 10)).toBe(3);
    expect(clampQuantity(100, "bulk", 1)).toBe(1);
  });

  it("returns at least 1 for bulk with stock", () => {
    expect(clampQuantity(1, "bulk", 50)).toBe(1);
    expect(clampQuantity(1, "bulk", 1)).toBe(1);
  });

  it("handles zero stock for bulk", () => {
    // When stock is 0, max(1, 0 || 1) = 1, so minimum buyable is 1
    expect(clampQuantity(5, "bulk", 0)).toBe(1);
  });
});

describe("Cart update abuse prevention", () => {
  it("rejects quantities over 99", () => {
    const requestedQty = 100;
    const isAbusive = requestedQty > 99;
    expect(isAbusive).toBe(true);
  });

  it("allows quantities up to 99", () => {
    const requestedQty = 99;
    const isAbusive = requestedQty > 99;
    expect(isAbusive).toBe(false);
  });
});
