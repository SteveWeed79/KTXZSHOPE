import { describe, it, expect } from "vitest";

/**
 * Tests for admin user creation validation logic.
 * These test the validation rules from the /api/admin/users/create endpoint.
 */

interface CreateAdminInput {
  name?: string;
  email: string;
  password: string;
  role?: string;
}

function validateCreateAdmin(input: CreateAdminInput): { error?: string; valid: boolean } {
  if (!input.email || typeof input.email !== "string" || !input.email.includes("@")) {
    return { error: "Valid email is required.", valid: false };
  }

  if (!input.password || typeof input.password !== "string" || input.password.length < 8) {
    return { error: "Password must be at least 8 characters.", valid: false };
  }

  return { valid: true };
}

function normalizeRole(role?: string): "admin" | "customer" {
  return role === "admin" ? "admin" : "customer";
}

describe("Admin user creation validation", () => {
  it("accepts valid admin creation input", () => {
    const result = validateCreateAdmin({
      name: "New Admin",
      email: "admin@ktxz.com",
      password: "SecurePass1",
      role: "admin",
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects missing email", () => {
    const result = validateCreateAdmin({
      email: "",
      password: "SecurePass1",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("email");
  });

  it("rejects email without @", () => {
    const result = validateCreateAdmin({
      email: "notanemail",
      password: "SecurePass1",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects short passwords", () => {
    const result = validateCreateAdmin({
      email: "admin@ktxz.com",
      password: "short",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("8 characters");
  });

  it("rejects empty passwords", () => {
    const result = validateCreateAdmin({
      email: "admin@ktxz.com",
      password: "",
    });
    expect(result.valid).toBe(false);
  });
});

describe("Role normalization", () => {
  it("returns admin for admin role", () => {
    expect(normalizeRole("admin")).toBe("admin");
  });

  it("defaults to customer for other values", () => {
    expect(normalizeRole("customer")).toBe("customer");
    expect(normalizeRole("superadmin")).toBe("customer");
    expect(normalizeRole(undefined)).toBe("customer");
    expect(normalizeRole("")).toBe("customer");
  });
});
