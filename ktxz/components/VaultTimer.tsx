"use client";

import React, { useEffect, useState } from "react";

interface VaultTimerProps {
  expiryDate: Date;
}

const VaultTimer: React.FC<VaultTimerProps> = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = new Date(expiryDate).getTime();

      if (!Number.isFinite(expiry)) {
        setTimeLeft("Featured");
        return;
      }

      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (timeLeft === "Expired") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
        Expired
      </span>
    );
  }

  if (timeLeft === "Featured" || !timeLeft) {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
        Featured
      </span>
    );
  }

  return (
    <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
      Ends In: {timeLeft}
    </span>
  );
};

export default VaultTimer;
