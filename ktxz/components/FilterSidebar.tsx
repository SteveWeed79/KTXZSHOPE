"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Brand {
  _id: string;
  name: string;
}

export default function FilterSidebar({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBrandId = searchParams.get("brand");

  const handleFilterChange = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (id) {
      params.set("brand", id);
    } else {
      params.delete("brand"); // Clears filter if "All" is selected
    }

    // This updates the URL without a full page refresh
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="space-y-8 bg-gray-950/50 p-6 rounded-2xl border border-gray-900">
      <div>
        <h3 className="text-white font-black uppercase italic text-xs tracking-[0.2em] mb-4">
          Categories
        </h3>
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => handleFilterChange(null)}
              className={`w-full text-left text-xs uppercase font-mono py-2 px-3 rounded-lg transition-colors ${
                !activeBrandId ? "bg-red-600 text-white" : "text-gray-500 hover:text-white"
              }`}
            >
              All Assets
            </button>
          </li>
          {brands.map((brand) => (
            <li key={brand._id}>
              <button
                onClick={() => handleFilterChange(brand._id)}
                className={`w-full text-left text-xs uppercase font-mono py-2 px-3 rounded-lg transition-colors ${
                  activeBrandId === brand._id ? "bg-red-600 text-white" : "text-gray-500 hover:text-white"
                }`}
              >
                {brand.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-gray-900">
        <p className="text-[9px] text-gray-700 uppercase font-mono leading-relaxed">
          Select a sector to view specialized secondary market inventory.
        </p>
      </div>
    </div>
  );
}