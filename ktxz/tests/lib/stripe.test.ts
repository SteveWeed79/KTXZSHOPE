import { describe, it, expect } from "vitest";
import { toCents, fromCents } from "@/lib/stripe";

describe("Stripe helpers", () => {
  describe("toCents", () => {
    it("converts whole dollar amounts", () => {
      expect(toCents(10)).toBe(1000);
      expect(toCents(1)).toBe(100);
      expect(toCents(0)).toBe(0);
    });

    it("converts decimal amounts correctly", () => {
      expect(toCents(9.99)).toBe(999);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(19.95)).toBe(1995);
    });

    it("handles floating point edge cases via rounding", () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(toCents(0.1 + 0.2)).toBe(30);
    });

    it("handles large amounts", () => {
      expect(toCents(999.99)).toBe(99999);
      expect(toCents(10000)).toBe(1000000);
    });
  });

  describe("fromCents", () => {
    it("converts cent amounts to dollars", () => {
      expect(fromCents(999)).toBe(9.99);
      expect(fromCents(100)).toBe(1);
      expect(fromCents(0)).toBe(0);
    });

    it("handles null and undefined", () => {
      expect(fromCents(null)).toBe(0);
      expect(fromCents(undefined)).toBe(0);
    });

    it("handles large amounts", () => {
      expect(fromCents(99999)).toBe(999.99);
    });
  });
});
