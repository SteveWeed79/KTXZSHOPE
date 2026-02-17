// ktxz/components/VaultAutoRefresh.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VaultAutoRefreshProps = {
  // Accept serializable values from Server Components (Date becomes string)
  events: Array<string | number | Date | null | undefined>;
};

function toMillis(value: VaultAutoRefreshProps["events"][number]): number | null {
  if (!value) return null;
  const t = new Date(value as string | number | Date).getTime();
  return Number.isFinite(t) ? t : null;
}

export default function VaultAutoRefresh({ events }: VaultAutoRefreshProps) {
  const router = useRouter();

  // Used only to re-run the effect after an intentional refresh.
  const [lastRefresh, setLastRefresh] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which exact event timestamp we scheduled/fired for to prevent duplicates.
  const scheduledEventMsRef = useRef<number | null>(null);
  const lastFiredEventMsRef = useRef<number | null>(null);

  // Hard stop against runaway loops (dev/prod safety).
  const lastFiredAtMsRef = useRef<number>(0);

  useEffect(() => {
    // Always clear any prior timer when inputs change (or on strict-mode re-run).
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!events || events.length === 0) return;

    const now = Date.now();

    const upcoming = events
      .map(toMillis)
      .filter((t): t is number => typeof t === "number" && t > now)
      .sort((a, b) => a - b);

    if (upcoming.length === 0) return;

    const nextEventMs = upcoming[0];

    // Schedule refresh slightly after the event time (buffer for DB writes / clocks).
    const delayMs = Math.max(nextEventMs - now + 1000, 250);

    scheduledEventMsRef.current = nextEventMs;

    timerRef.current = setTimeout(() => {
      const firedAt = Date.now();
      const scheduledFor = scheduledEventMsRef.current;

      // Guard 1: never refresh twice for the exact same event timestamp.
      if (scheduledFor !== null && lastFiredEventMsRef.current === scheduledFor) {
        return;
      }

      // Guard 2: cooldown against runaway loops.
      const COOLDOWN_MS = 5000;
      if (firedAt - lastFiredAtMsRef.current < COOLDOWN_MS) {
        return;
      }

      if (scheduledFor !== null) lastFiredEventMsRef.current = scheduledFor;
      lastFiredAtMsRef.current = firedAt;

      router.refresh();
      setLastRefresh(firedAt);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [events, lastRefresh, router]);

  return null;
}
