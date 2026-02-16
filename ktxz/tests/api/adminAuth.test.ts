import { describe, it, expect } from "vitest";

/**
 * Tests for admin authorization logic.
 * Extracted from lib/authHelpers.ts and lib/requireAdmin.ts
 */

// --- Extracted admin check logic ---

function isAdminUser(user: { email?: string; role?: string } | null | undefined, adminEmail?: string): boolean {
  if (!user) return false;
  return user.role === "admin" || (!!user.email && user.email === adminEmail);
}

// --- Tests ---

describe("Admin role check (isAdminUser)", () => {
  it("returns true for role=admin", () => {
    expect(isAdminUser({ email: "user@test.com", role: "admin" })).toBe(true);
  });

  it("returns true when email matches ADMIN_EMAIL", () => {
    expect(
      isAdminUser({ email: "boss@ktxz.com", role: "customer" }, "boss@ktxz.com")
    ).toBe(true);
  });

  it("returns false for regular customers", () => {
    expect(
      isAdminUser({ email: "user@test.com", role: "customer" }, "admin@ktxz.com")
    ).toBe(false);
  });

  it("returns false for null/undefined user", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("returns false when no role and no ADMIN_EMAIL match", () => {
    expect(isAdminUser({ email: "user@test.com" })).toBe(false);
  });

  it("returns false when ADMIN_EMAIL is not set and role is not admin", () => {
    expect(isAdminUser({ email: "user@test.com", role: "customer" }, undefined)).toBe(false);
  });

  it("is case-sensitive for email matching", () => {
    expect(
      isAdminUser({ email: "Admin@KTXZ.com", role: "customer" }, "admin@ktxz.com")
    ).toBe(false);
  });
});

describe("Admin API route protection pattern", () => {
  // Simulates the requireAdmin() check pattern used in all admin routes
  type MockSession = { user: { email: string; role: string } } | null;

  function simulateRequireAdmin(
    session: MockSession,
    adminEmail?: string
  ): { status: number; error?: string } | MockSession {
    if (!session?.user) {
      return { status: 401, error: "Unauthorized" };
    }
    if (!isAdminUser(session.user, adminEmail)) {
      return { status: 403, error: "Forbidden" };
    }
    return session;
  }

  it("returns 401 when no session", () => {
    const result = simulateRequireAdmin(null);
    expect(result).toEqual({ status: 401, error: "Unauthorized" });
  });

  it("returns 403 for non-admin users", () => {
    const result = simulateRequireAdmin({
      user: { email: "user@test.com", role: "customer" },
    });
    expect(result).toEqual({ status: 403, error: "Forbidden" });
  });

  it("returns session for admin role users", () => {
    const session = { user: { email: "admin@test.com", role: "admin" } };
    const result = simulateRequireAdmin(session);
    expect(result).toEqual(session);
  });

  it("returns session for ADMIN_EMAIL match", () => {
    const session = { user: { email: "boss@ktxz.com", role: "customer" } };
    const result = simulateRequireAdmin(session, "boss@ktxz.com");
    expect(result).toEqual(session);
  });
});

describe("Admin settings allowlist", () => {
  const ALLOWED_FIELDS = [
    "storeName",
    "supportEmail",
    "returnPolicy",
    "termsOfService",
    "isVaultLive",
    "dropCountdown",
    "maintenanceMode",
  ];

  function filterAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        update[key] = body[key];
      }
    }
    return update;
  }

  it("passes through allowed fields", () => {
    const input = { storeName: "KTXZ", supportEmail: "hi@ktxz.com" };
    expect(filterAllowedFields(input)).toEqual(input);
  });

  it("strips disallowed fields", () => {
    const input = {
      storeName: "KTXZ",
      _id: "hacked",
      __v: 999,
      isAdmin: true,
      password: "stolen",
    };
    expect(filterAllowedFields(input)).toEqual({ storeName: "KTXZ" });
  });

  it("returns empty object when no allowed fields provided", () => {
    expect(filterAllowedFields({ evil: "payload" })).toEqual({});
  });

  it("handles all 7 allowed fields", () => {
    const input = {
      storeName: "X",
      supportEmail: "x@x.com",
      returnPolicy: "No returns",
      termsOfService: "TOS",
      isVaultLive: true,
      dropCountdown: "2026-01-01",
      maintenanceMode: false,
    };
    expect(Object.keys(filterAllowedFields(input))).toHaveLength(7);
  });
});
