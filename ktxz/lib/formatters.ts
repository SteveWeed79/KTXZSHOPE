/** Shared formatting utilities used across the app. */

/** Format a dollar amount to $X.XX */
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format a Stripe cent amount to $X.XX */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a date for short display (e.g. "Jan 1, 2025") */
export function formatDateShort(date: Date | string | undefined | null): string {
  if (!date) return "\u2014";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a date for long display with time (e.g. "January 1, 2025, 02:30 PM") */
export function formatDateLong(date: Date | string | undefined | null): string {
  if (!date) return "\u2014";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Order status color classes (shared across profile and admin pages). */
const STATUS_COLORS: Record<string, string> = {
  pending: "text-primary/70 bg-primary/10 border-primary/20",
  paid: "text-primary bg-primary/10 border-primary/30",
  fulfilled: "text-foreground bg-muted border-border",
  cancelled: "text-muted-foreground bg-muted border-border",
  refunded: "text-muted-foreground bg-muted border-border",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.pending;
}
