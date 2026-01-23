"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VaultAutoRefresh({ events }: { events: Date[] }) {
  const router = useRouter();
  // We use a bit of local state to trigger a re-evaluation after a refresh
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    
    // 1. Convert all incoming dates to timestamps
    // 2. Filter out past events
    // 3. Sort to find the absolute soonest one
    const upcomingEvents = events
      .map(d => new Date(d).getTime())
      .filter(t => t > now)
      .sort((a, b) => a - b);

    // If no future events exist, stop the effect
    if (upcomingEvents.length === 0) return;

    const nextEventTime = upcomingEvents[0];
    const timeUntilEvent = nextEventTime - now;

    // Logic: Set the timer to trigger the refresh
    // We add a 1000ms (1s) buffer. 500ms is sometimes too tight for 
    // the server-side environment to register the new second.
    const timer = setTimeout(() => {
      router.refresh();
      // Update local state to force the useEffect to re-run 
      // and look for the NEXT event in the list
      setLastRefresh(Date.now());
    }, timeUntilEvent + 1000);

    // Cleanup: Crucial to prevent multiple timers if the component re-renders
    return () => clearTimeout(timer);
  }, [events, router, lastRefresh]);

  return null;
}