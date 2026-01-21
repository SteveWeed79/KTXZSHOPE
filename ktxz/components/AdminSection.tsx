"use client";
import { useState } from "react";

export default function AdminSection({ 
  title, 
  subtitle, 
  children, 
  badge 
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode; 
  badge?: string | number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={`border border-gray-900 rounded-3xl bg-gray-950/50 transition-all ${isOpen ? 'ring-1 ring-gray-700' : ''}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 flex items-center justify-between text-left hover:bg-white/[0.02] rounded-3xl transition-colors"
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white">{title}</h2>
            {badge !== undefined && (
              <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-widest">{subtitle}</p>}
        </div>
        <span className={`text-xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      
      {isOpen && (
        <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pt-2 border-t border-gray-900/50 mt-2">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}