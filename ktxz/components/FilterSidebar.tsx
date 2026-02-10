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
      params.delete("brand");
    }

    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="space-y-8 bg-card p-6 rounded-2xl border border-border">
      <div>
        <h3 className="text-foreground font-bold uppercase text-xs tracking-[0.15em] mb-4">
          Categories
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => handleFilterChange(null)}
              className={`w-full text-left text-xs uppercase font-mono py-2 px-3 rounded-lg transition-colors ${
                !activeBrandId ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All Cards
            </button>
          </li>
          {brands.map((brand) => (
            <li key={brand._id}>
              <button
                onClick={() => handleFilterChange(brand._id)}
                className={`w-full text-left text-xs uppercase font-mono py-2 px-3 rounded-lg transition-colors ${
                  activeBrandId === brand._id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {brand.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
          Filter by game to browse specific inventory.
        </p>
      </div>
    </div>
  );
}
