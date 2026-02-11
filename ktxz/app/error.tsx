"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-3xl font-bold uppercase tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-widest hover:brightness-90 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
