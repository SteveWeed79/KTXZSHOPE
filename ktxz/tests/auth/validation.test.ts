import { describe, it, expect } from "vitest";

/**
 * Tests for authentication validation rules.
 * Extracted from the signUp action and login page.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;

describe("Email validation", () => {
  it("accepts valid email addresses", () => {
    expect(EMAIL_REGEX.test("user@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("admin@ktxz.com")).toBe(true);
    expect(EMAIL_REGEX.test("test.user+tag@domain.co")).toBe(true);
  });

  it("rejects emails without @", () => {
    expect(EMAIL_REGEX.test("notanemail")).toBe(false);
  });

  it("rejects emails without domain", () => {
    expect(EMAIL_REGEX.test("user@")).toBe(false);
  });

  it("rejects emails with spaces", () => {
    expect(EMAIL_REGEX.test("user @example.com")).toBe(false);
    expect(EMAIL_REGEX.test(" user@example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(EMAIL_REGEX.test("")).toBe(false);
  });
});

describe("Password validation", () => {
  it("accepts passwords with letters, numbers, and 8+ chars", () => {
    expect(PASSWORD_REGEX.test("Password1")).toBe(true);
    expect(PASSWORD_REGEX.test("abc12345")).toBe(true);
    expect(PASSWORD_REGEX.test("Str0ngP@ss")).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(PASSWORD_REGEX.test("Pass1")).toBe(false);
    expect(PASSWORD_REGEX.test("Ab1")).toBe(false);
  });

  it("rejects passwords without letters", () => {
    expect(PASSWORD_REGEX.test("12345678")).toBe(false);
  });

  it("rejects passwords without numbers", () => {
    expect(PASSWORD_REGEX.test("abcdefgh")).toBe(false);
    expect(PASSWORD_REGEX.test("Password")).toBe(false);
  });

  it("accepts passwords with special characters", () => {
    expect(PASSWORD_REGEX.test("P@ssw0rd")).toBe(true);
    expect(PASSWORD_REGEX.test("My!Pass1")).toBe(true);
  });
});

describe("Next URL validation", () => {
  function sanitizeNextUrl(n: string | null | undefined): string {
    if (!n || typeof n !== "string") return "/";
    // Must start with / but not // (protocol-relative URL = open redirect)
    if (!n.startsWith("/") || n.startsWith("//")) return "/";
    return n;
  }

  it("returns / for null/undefined input", () => {
    expect(sanitizeNextUrl(null)).toBe("/");
    expect(sanitizeNextUrl(undefined)).toBe("/");
  });

  it("returns / for empty string", () => {
    expect(sanitizeNextUrl("")).toBe("/");
  });

  it("accepts valid relative paths", () => {
    expect(sanitizeNextUrl("/profile")).toBe("/profile");
    expect(sanitizeNextUrl("/admin")).toBe("/admin");
    expect(sanitizeNextUrl("/cart")).toBe("/cart");
  });

  it("rejects absolute URLs (open redirect prevention)", () => {
    expect(sanitizeNextUrl("https://evil.com")).toBe("/");
    expect(sanitizeNextUrl("http://attacker.com/phish")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextUrl("//evil.com")).toBe("/");
  });
});
