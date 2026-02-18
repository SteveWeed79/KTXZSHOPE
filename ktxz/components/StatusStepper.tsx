export function StatusStepper({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  // Terminal states that don't fit the linear progress flow
  if (normalized === "cancelled") {
    return (
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-muted-foreground" />
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Order Cancelled
        </span>
      </div>
    );
  }

  if (normalized === "refunded") {
    return (
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-muted-foreground" />
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Order Refunded
        </span>
      </div>
    );
  }

  // Linear progress steps for active orders:
  // pending(0) → paid(1) → fulfilled/shipped(2) → delivered(3)
  const steps = ["Pending", "Paid", "Shipped", "Delivered"];
  const statusMap: Record<string, number> = {
    pending: 0,
    paid: 1,
    processing: 1,
    fulfilled: 2,
    shipped: 2,
    delivered: 3,
  };
  const currentIdx = statusMap[normalized] ?? 0;

  return (
    <div className="flex items-center w-full gap-2">
      {steps.map((step, idx) => (
        <div key={step} className="flex flex-1 items-center gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              idx <= currentIdx ? "bg-primary" : "bg-muted"
            }`}
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
              idx <= currentIdx ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}
