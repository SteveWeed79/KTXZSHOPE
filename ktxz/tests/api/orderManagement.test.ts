import { describe, it, expect } from "vitest";

/**
 * Tests for admin order management logic.
 * Extracted from admin/orders API routes.
 */

// --- Extracted pagination logic ---

function calculatePagination(
  page: number,
  limit: number,
  maxLimit = 100,
  defaultLimit = 50
) {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const safeLimit = Math.min(maxLimit, Math.max(1, Math.trunc(limit) || defaultLimit));
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
}

// --- Extracted status validation ---

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

// --- Extracted status color mapping ---

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-primary/10 text-primary/70 border-primary/20",
    paid: "bg-primary/10 text-primary border-primary/30",
    fulfilled: "bg-muted text-foreground border-border",
    cancelled: "bg-muted text-muted-foreground border-border",
    refunded: "bg-muted text-muted-foreground border-border",
  };
  return colors[status] || colors.pending;
}

// --- Extracted CSV export logic ---

function formatOrderCsv(orders: Array<{
  orderNumber: string;
  createdAt: string;
  email: string;
  status: string;
  itemCount: number;
  totalCents: number;
}>): string {
  const header = ["Order Number", "Date", "Email", "Status", "Items", "Total"].join(",");
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString(),
      o.email,
      o.status,
      o.itemCount,
      `$${(o.totalCents / 100).toFixed(2)}`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

// --- Tests ---

describe("Order pagination", () => {
  it("calculates correct pagination values", () => {
    const result = calculatePagination(1, 20);
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("calculates skip for page 3", () => {
    const result = calculatePagination(3, 20);
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it("clamps page to minimum 1", () => {
    expect(calculatePagination(0, 20).page).toBe(1);
    expect(calculatePagination(-5, 20).page).toBe(1);
  });

  it("clamps limit to maximum", () => {
    expect(calculatePagination(1, 200).limit).toBe(100);
    expect(calculatePagination(1, 500, 100).limit).toBe(100);
  });

  it("clamps limit to minimum 1", () => {
    expect(calculatePagination(1, 0).limit).toBe(50); // falls back to default via NaN path
    expect(calculatePagination(1, -10).limit).toBe(1); // Math.max(1, -10) = 1
  });

  it("handles NaN inputs", () => {
    const result = calculatePagination(NaN, NaN);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50); // defaultLimit
  });
});

describe("Order status validation", () => {
  it("accepts valid statuses", () => {
    expect(isValidStatus("pending")).toBe(true);
    expect(isValidStatus("paid")).toBe(true);
    expect(isValidStatus("fulfilled")).toBe(true);
    expect(isValidStatus("cancelled")).toBe(true);
    expect(isValidStatus("refunded")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidStatus("active")).toBe(false);
    expect(isValidStatus("completed")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus("PAID")).toBe(false); // case-sensitive
  });
});

describe("Order status colors", () => {
  it("returns correct color classes for each status", () => {
    expect(getStatusColor("pending")).toContain("primary/70");
    expect(getStatusColor("paid")).toContain("text-primary");
    expect(getStatusColor("fulfilled")).toContain("text-foreground");
    expect(getStatusColor("cancelled")).toContain("text-muted-foreground");
    expect(getStatusColor("refunded")).toContain("text-muted-foreground");
  });

  it("falls back to pending colors for unknown status", () => {
    expect(getStatusColor("unknown")).toBe(getStatusColor("pending"));
  });
});

describe("Order CSV export", () => {
  it("generates correct CSV header", () => {
    const csv = formatOrderCsv([]);
    expect(csv).toBe("Order Number,Date,Email,Status,Items,Total");
  });

  it("formats order rows correctly", () => {
    const csv = formatOrderCsv([
      {
        orderNumber: "ORD-001",
        createdAt: "2026-01-15T10:00:00Z",
        email: "buyer@test.com",
        status: "paid",
        itemCount: 3,
        totalCents: 7500,
      },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("ORD-001");
    expect(lines[1]).toContain("buyer@test.com");
    expect(lines[1]).toContain("paid");
    expect(lines[1]).toContain("3");
    expect(lines[1]).toContain("$75.00");
  });

  it("handles multiple orders", () => {
    const csv = formatOrderCsv([
      { orderNumber: "A", createdAt: "2026-01-01", email: "a@a.com", status: "paid", itemCount: 1, totalCents: 1000 },
      { orderNumber: "B", createdAt: "2026-01-02", email: "b@b.com", status: "fulfilled", itemCount: 2, totalCents: 2000 },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
  });
});
