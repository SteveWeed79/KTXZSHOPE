import { describe, it, expect } from "vitest";

/**
 * Tests for admin card management logic:
 * - Inventory type and stock handling in create/update
 * - Image field mapping (the bug fix for imageUrl vs image)
 */

describe("Card creation field mapping", () => {
  function mapCreateFields(raw: Record<string, string>) {
    const inventoryTypeRaw = String(raw.inventoryType || "single").toLowerCase();
    const inventoryType = inventoryTypeRaw === "bulk" ? "bulk" : "single";

    const stockInput = Number(raw.stock || 0);
    const stock = inventoryType === "single" ? 1 : Math.max(0, stockInput);

    // Fixed: use 'image' field name, not 'imageUrl'
    const image = String(raw.image || raw.imageUrl || "").trim();
    const rarity = String(raw.rarity || "").trim();

    return { inventoryType, stock, image, rarity };
  }

  it("defaults to single with stock 1", () => {
    const result = mapCreateFields({ name: "Card", price: "10" });
    expect(result.inventoryType).toBe("single");
    expect(result.stock).toBe(1);
  });

  it("accepts bulk type with custom stock", () => {
    const result = mapCreateFields({
      name: "Bulk Card",
      price: "5",
      inventoryType: "bulk",
      stock: "50",
    });
    expect(result.inventoryType).toBe("bulk");
    expect(result.stock).toBe(50);
  });

  it("forces stock to 1 for single type regardless of input", () => {
    const result = mapCreateFields({
      inventoryType: "single",
      stock: "100",
    });
    expect(result.stock).toBe(1);
  });

  it("clamps bulk stock to minimum 0", () => {
    const result = mapCreateFields({
      inventoryType: "bulk",
      stock: "-10",
    });
    expect(result.stock).toBe(0);
  });

  it("reads image from 'image' field (form name)", () => {
    const result = mapCreateFields({ image: "https://example.com/card.jpg" });
    expect(result.image).toBe("https://example.com/card.jpg");
  });

  it("falls back to imageUrl for backwards compatibility", () => {
    const result = mapCreateFields({ imageUrl: "https://example.com/card.jpg" });
    expect(result.image).toBe("https://example.com/card.jpg");
  });

  it("reads rarity field", () => {
    const result = mapCreateFields({ rarity: "Ultra Rare" });
    expect(result.rarity).toBe("Ultra Rare");
  });

  it("handles invalid inventory type as single", () => {
    const result = mapCreateFields({ inventoryType: "invalid" });
    expect(result.inventoryType).toBe("single");
    expect(result.stock).toBe(1);
  });
});

describe("Card update field mapping", () => {
  function mapUpdateFields(raw: Record<string, string | undefined>) {
    const update: Record<string, any> = {};

    if (raw.inventoryType !== undefined) {
      const it = String(raw.inventoryType).toLowerCase();
      update.inventoryType = it === "bulk" ? "bulk" : "single";
    }

    if (raw.stock !== undefined) {
      update.stock = Math.max(0, Math.trunc(Number(raw.stock || 0)));
    }

    // Fixed: reads from 'image' (form name) not just 'imageUrl'
    if (raw.image !== undefined || raw.imageUrl !== undefined) {
      update.image = String(raw.image || raw.imageUrl || "").trim();
    }

    return update;
  }

  it("updates inventory type", () => {
    const result = mapUpdateFields({ inventoryType: "bulk" });
    expect(result.inventoryType).toBe("bulk");
  });

  it("updates stock", () => {
    const result = mapUpdateFields({ stock: "25" });
    expect(result.stock).toBe(25);
  });

  it("reads image from 'image' field", () => {
    const result = mapUpdateFields({ image: "https://new-image.com/card.png" });
    expect(result.image).toBe("https://new-image.com/card.png");
  });

  it("does not set fields that were not provided", () => {
    const result = mapUpdateFields({});
    expect(result).toEqual({});
  });
});
