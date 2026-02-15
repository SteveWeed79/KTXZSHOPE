import { describe, it, expect } from "vitest";

/**
 * Tests for inventory type logic: single vs bulk cards.
 * These test the business rules extracted from the card model and actions.
 */

type InventoryType = "single" | "bulk";

interface CardInventory {
  inventoryType: InventoryType;
  stock: number;
  status: "active" | "sold" | "inactive" | "reserved";
  isActive: boolean;
}

function canPurchase(card: CardInventory): boolean {
  const isInactive = !card.isActive || card.status === "inactive";
  const isSold = card.status === "sold";
  const isBulk = card.inventoryType === "bulk";
  return !isInactive && !isSold && (!isBulk || card.stock > 0);
}

function calculateCartQty(
  inventoryType: InventoryType,
  stock: number,
  currentQtyInCart: number,
  requestedQty: number | null
): number {
  if (inventoryType === "single") return 1;

  if (requestedQty !== null) {
    // Explicit quantity from form
    return Math.min(Math.max(1, requestedQty), stock);
  }

  // Increment by 1
  return Math.min(currentQtyInCart + 1, stock);
}

function determineStockAfterCreate(
  inventoryType: InventoryType,
  stockInput: number
): number {
  return inventoryType === "single" ? 1 : Math.max(0, stockInput);
}

describe("Card purchase eligibility", () => {
  it("allows purchase of active single card", () => {
    expect(canPurchase({ inventoryType: "single", stock: 1, status: "active", isActive: true }))
      .toBe(true);
  });

  it("allows purchase of bulk card with stock", () => {
    expect(canPurchase({ inventoryType: "bulk", stock: 10, status: "active", isActive: true }))
      .toBe(true);
  });

  it("rejects sold cards", () => {
    expect(canPurchase({ inventoryType: "single", stock: 0, status: "sold", isActive: false }))
      .toBe(false);
  });

  it("rejects inactive cards", () => {
    expect(canPurchase({ inventoryType: "single", stock: 1, status: "inactive", isActive: false }))
      .toBe(false);
  });

  it("rejects bulk cards with 0 stock", () => {
    expect(canPurchase({ inventoryType: "bulk", stock: 0, status: "active", isActive: true }))
      .toBe(false);
  });

  it("rejects cards where isActive is false even if status is active", () => {
    expect(canPurchase({ inventoryType: "single", stock: 1, status: "active", isActive: false }))
      .toBe(false);
  });
});

describe("Cart quantity calculation", () => {
  it("single cards always return qty 1", () => {
    expect(calculateCartQty("single", 1, 0, null)).toBe(1);
    expect(calculateCartQty("single", 1, 0, 5)).toBe(1);
  });

  it("bulk cards increment by 1 when no explicit quantity", () => {
    expect(calculateCartQty("bulk", 10, 0, null)).toBe(1);
    expect(calculateCartQty("bulk", 10, 3, null)).toBe(4);
  });

  it("bulk cards respect explicit quantity from form", () => {
    expect(calculateCartQty("bulk", 10, 0, 5)).toBe(5);
  });

  it("bulk cards cap at available stock", () => {
    expect(calculateCartQty("bulk", 3, 0, 10)).toBe(3);
    expect(calculateCartQty("bulk", 3, 2, null)).toBe(3);
  });

  it("bulk cards enforce minimum of 1", () => {
    expect(calculateCartQty("bulk", 10, 0, 0)).toBe(1);
    expect(calculateCartQty("bulk", 10, 0, -5)).toBe(1);
  });
});

describe("Stock after card creation", () => {
  it("single cards always have stock 1", () => {
    expect(determineStockAfterCreate("single", 0)).toBe(1);
    expect(determineStockAfterCreate("single", 100)).toBe(1);
  });

  it("bulk cards use provided stock", () => {
    expect(determineStockAfterCreate("bulk", 50)).toBe(50);
    expect(determineStockAfterCreate("bulk", 0)).toBe(0);
  });

  it("bulk cards clamp negative stock to 0", () => {
    expect(determineStockAfterCreate("bulk", -5)).toBe(0);
  });
});
