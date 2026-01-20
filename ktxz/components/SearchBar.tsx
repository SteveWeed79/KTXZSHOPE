"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return router.push("/");
    // This sends the user to a search results page
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards (e.g. Charizard)..."
        className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 transition-all font-mono"
      />
      <button type="submit" className="absolute right-3 top-2 text-gray-500 hover:text-green-500">
        🔍
      </button>
    </form>
  );
}