// ktxz/components/VaultTimer.tsx
"use client";

import React, { useEffect, useState } from 'react';

interface VaultTimerProps {
  expiryDate: Date;
}

const VaultTimer: React.FC<VaultTimerProps> = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(expiryDate); // Ensure it's a Date object
      const difference = expiry.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft("Expired!");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(
        `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`
      );
    };

    calculateTimeLeft(); // Initial calculation
    const timer = setInterval(calculateTimeLeft, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on unmount
  }, [expiryDate]);

  if (!expiryDate || timeLeft === "Expired!") {
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