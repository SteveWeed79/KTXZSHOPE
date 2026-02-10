export function StatusStepper({ status }: { status: string }) {
  const steps = ["Paid", "Processing", "Shipped", "Delivered"];
  const statusMap: Record<string, number> = {
    paid: 0,
    processing: 1,
    fulfilled: 2,
    shipped: 2,
    delivered: 3,
  };
  const currentIdx = statusMap[status.toLowerCase()] ?? -1;

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
