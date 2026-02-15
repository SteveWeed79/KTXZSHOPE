import { describe, it, expect } from "vitest";
import {
  setCartItem,
  removeCartItem,
  clearCart,
  parseCartCookieValue,
  newCart,
  type CookieCart,
} from "@/lib/cartCookie";

function makeCart(items: Array<{ cardId: string; qty: number }> = []): CookieCart {
  return { id: "test-cart-id", items, updatedAt: Date.now() };
}

describe("cartCookie helpers", () => {
  describe("setCartItem", () => {
    it("adds a new item to an empty cart", () => {
      const cart = makeCart();
      setCartItem(cart, "card1", 1);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toEqual({ cardId: "card1", qty: 1 });
    });

    it("updates quantity for an existing item", () => {
      const cart = makeCart([{ cardId: "card1", qty: 1 }]);
      setCartItem(cart, "card1", 5);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].qty).toBe(5);
    });

    it("adds multiple different items", () => {
      const cart = makeCart();
      setCartItem(cart, "card1", 1);
      setCartItem(cart, "card2", 3);
      expect(cart.items).toHaveLength(2);
    });

    it("clamps quantity to minimum of 1", () => {
      const cart = makeCart();
      setCartItem(cart, "card1", 0);
      expect(cart.items[0].qty).toBe(1);
    });

    it("clamps quantity to maximum of 999", () => {
      const cart = makeCart();
      setCartItem(cart, "card1", 5000);
      expect(cart.items[0].qty).toBe(999);
    });

    it("ignores empty cardId", () => {
      const cart = makeCart();
      setCartItem(cart, "", 1);
      expect(cart.items).toHaveLength(0);
    });

    it("updates the updatedAt timestamp", () => {
      const cart = makeCart();
      const before = cart.updatedAt;
      setCartItem(cart, "card1", 1, before + 1000);
      expect(cart.updatedAt).toBe(before + 1000);
    });
  });

  describe("removeCartItem", () => {
    it("removes an existing item", () => {
      const cart = makeCart([
        { cardId: "card1", qty: 1 },
        { cardId: "card2", qty: 2 },
      ]);
      removeCartItem(cart, "card1");
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].cardId).toBe("card2");
    });

    it("does nothing when removing a non-existent item", () => {
      const cart = makeCart([{ cardId: "card1", qty: 1 }]);
      removeCartItem(cart, "nonexistent");
      expect(cart.items).toHaveLength(1);
    });

    it("handles empty cardId gracefully", () => {
      const cart = makeCart([{ cardId: "card1", qty: 1 }]);
      removeCartItem(cart, "");
      expect(cart.items).toHaveLength(1);
    });
  });

  describe("clearCart", () => {
    it("removes all items from cart", () => {
      const cart = makeCart([
        { cardId: "card1", qty: 1 },
        { cardId: "card2", qty: 2 },
      ]);
      clearCart(cart);
      expect(cart.items).toHaveLength(0);
    });

    it("preserves cart id", () => {
      const cart = makeCart([{ cardId: "card1", qty: 1 }]);
      clearCart(cart);
      expect(cart.id).toBe("test-cart-id");
    });
  });

  describe("newCart", () => {
    it("creates a cart with a unique id", () => {
      const cart1 = newCart();
      const cart2 = newCart();
      expect(cart1.id).toBeTruthy();
      expect(cart2.id).toBeTruthy();
      expect(cart1.id).not.toBe(cart2.id);
    });

    it("creates a cart with empty items", () => {
      const cart = newCart();
      expect(cart.items).toEqual([]);
    });
  });

  describe("parseCartCookieValue", () => {
    it("returns null for empty/undefined input", () => {
      expect(parseCartCookieValue(undefined)).toBeNull();
      expect(parseCartCookieValue("")).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      expect(parseCartCookieValue("{bad json}")).toBeNull();
    });

    it("parses canonical cart format", () => {
      const raw = JSON.stringify({
        id: "abc123",
        items: [{ cardId: "card1", qty: 2 }],
        updatedAt: 1700000000000,
      });
      const cart = parseCartCookieValue(raw);
      expect(cart).not.toBeNull();
      expect(cart!.id).toBe("abc123");
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0]).toEqual({ cardId: "card1", qty: 2 });
    });

    it("parses legacy array format", () => {
      const raw = JSON.stringify([
        { cardId: "card1", quantity: 3 },
        { cardId: "card2", quantity: 1 },
      ]);
      const cart = parseCartCookieValue(raw);
      expect(cart).not.toBeNull();
      expect(cart!.items).toHaveLength(2);
      expect(cart!.items[0].qty).toBe(3);
    });

    it("filters out items with empty cardId", () => {
      const raw = JSON.stringify({
        id: "test",
        items: [
          { cardId: "", qty: 1 },
          { cardId: "valid", qty: 2 },
        ],
        updatedAt: Date.now(),
      });
      const cart = parseCartCookieValue(raw);
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].cardId).toBe("valid");
    });

    it("returns null for non-object non-array", () => {
      expect(parseCartCookieValue('"just a string"')).toBeNull();
      expect(parseCartCookieValue("42")).toBeNull();
    });
  });
});
