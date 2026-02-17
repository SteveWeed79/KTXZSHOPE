"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 60; // stop after ~5 minutes

/**
 * Auto-refreshes the page while payment is pending.
 * Once payment resolves (page re-renders without this component) or
 * max polls are reached, it stops and shows a manual fallback.
 */
export default function PendingPaymentRefresh() {
  const router = useRouter();
  const [polls, setPolls] = useState(0);

  const stopped = polls >= MAX_POLLS;

  useEffect(() => {
    if (stopped) return;

    const timer = setTimeout(() => {
      setPolls((p) => p + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [polls, stopped, router]);

  if (stopped) {
    return (
      <p className="text-[10px] text-muted-foreground uppercase font-mono mt-4">
        Still waiting for payment confirmation.{" "}
        <button
          onClick={() => setPolls(0)}
          className="text-primary hover:underline"
        >
          Retry
        </button>{" "}
        or check your email for confirmation.
      </p>
    );
  }

  return (
    <p className="text-[10px] text-muted-foreground uppercase font-mono mt-4 animate-pulse">
      Checking payment status&hellip;
    </p>
  );
}
