"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function AdminSection({
  title,
  subtitle,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: string | number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      className={`border border-border rounded-2xl bg-card transition-all ${
        isOpen ? "ring-1 ring-ring/20" : ""
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/50 rounded-2xl transition-colors"
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold uppercase tracking-tight">
              {title}
            </h2>
            {badge !== undefined && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-6">
          <div className="pt-4 border-t border-border">{children}</div>
        </div>
      )}
    </section>
  );
}
