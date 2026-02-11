"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { Search } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return router.push("/");
    router.push(`/search?q=${encodeURIComponent(query)}`);
    inputRef.current?.blur();
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`relative transition-all duration-300 ease-out ${
        focused ? "w-full max-w-md" : "w-full max-w-[220px]"
      }`}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search..."
        className="w-full bg-muted/60 border border-transparent text-foreground text-xs rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-muted transition-all duration-300 placeholder:text-muted-foreground/60"
      />
    </form>
  );
}
