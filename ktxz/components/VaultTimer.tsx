// ktxz/components/VaultTimer.tsx
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
        setTimeLeft("Vault Active");
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
      <span className="text-[9px] text-orange-300 font-bold uppercase tracking-wider bg-orange-950/60 px-2 py-1 rounded border border-orange-500/20">
        Vault Expired
      </span>
    );
  }

  if (timeLeft === "Vault Active" || !timeLeft) {
    return (
      <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider bg-red-900/30 px-2 py-1 rounded">
        Vault Active
      </span>
    );
  }

  return (
    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider bg-red-900/30 px-2 py-1 rounded">
      Ends In: {timeLeft}
    </span>
  );
};

export default VaultTimer;
