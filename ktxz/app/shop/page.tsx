/**
 * ============================================================================
 * FILE: app/shop/page.tsx
 * STATUS: MODIFIED (Remove redundant admin link from sidebar)
 * ============================================================================
 * 
 * CHANGES:
 * - Removed admin "Command Center" link from FilterSidebar area
 */

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import { auth } from "@/auth";
import Link from "next/link";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  await dbConnect();
  const filters = await searchParams;
  const session = await auth();

  const now = new Date();

  /**
   * Public inventory rules:
   * - isActive is not false (missing treated as true)
   * - status is "active" OR missing (missing treated as active)
   * - inventoryType:
   *    - missing treated as single
   *    - single always allowed (unless sold/inactive)
   *    - bulk allowed only if stock > 0
   */
  const publicInventoryFilter: any = {
    $and: [
      { isActive: { $ne: false } },
      { $or: [{ status: { $exists: false } }, { status: "active" }] },
      {
        $or: [
          { inventoryType: { $exists: false } },
          { inventoryType: "single" },
          { inventoryType: "bulk", stock: { $gt: 0 } },
        ],
      },
    ],
  };

  /**
   * Vault visibility rules:
   * Show items NOT currently active in the Vault.
   */
  const vaultVisibilityFilter: any = {
    $or: [
      { isVault: { $ne: true } },
      { vaultExpiryDate: { $lt: now } },
      { vaultReleaseDate: { $gt: now } },
    ],
  };

  // Combine into one query
  const query: any = {
    $and: [publicInventoryFilter, vaultVisibilityFilter],
  };

  // Brand filter
  if (filters.brand) {
    query.$and.push({ brand: filters.brand });
  }

  const rawCards = await Card.find(query)
    .populate("brand")
    .sort({ createdAt: -1 })
    .lean();

  const rawBrands = await Brand.find({}).sort({ name: 1 }).lean();

  // Serialize for client components
  const brands = rawBrands.map((brand: any) => ({
    ...brand,
    _id: brand._id.toString(),
  }));

  const marketplaceCards = rawCards.map((card: any) => ({
    ...card,
    _id: card._id.toString(),
    brand: card.brand ? { ...card.brand, _id: card.brand._id.toString() } : null,
    createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
    updatedAt: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt,
    vaultReleaseDate:
      card.vaultReleaseDate instanceof Date ? card.vaultReleaseDate.toISOString() : card.vaultReleaseDate,
    vaultExpiryDate:
      card.vaultExpiryDate instanceof Date ? card.vaultExpiryDate.toISOString() : card.vaultExpiryDate,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-6">
      <div className="flex flex-col md:flex-row gap-8 py-12">
        <aside className="w-full md:w-64 shrink-0">
          <FilterSidebar brands={brands} />

          {/* REMOVED: Admin link - now only in Navbar */}
        </aside>

        <section className="flex-1">
          <header className="mb-12">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
              {filters.brand ? "Filtered Sector" : "Live Inventory"}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="h-[1px] w-12 bg-green-600"></span>
              <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase">
                {filters.brand ? "Showing specialized assets" : "Verified Secondary Market // Phase 1"}
              </p>
            </div>
          </header>

          {marketplaceCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {marketplaceCards.map((card: any) => (
                <ProductCard key={card._id} card={card} />
              ))}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border border-dashed border-gray-900 rounded-3xl bg-gray-950/20">
              <div className="w-12 h-12 border-2 border-gray-900 rounded-full flex items-center justify-center mb-4">
                <span className="text-gray-800 font-black">!</span>
              </div>
              <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest text-center px-6">
                No assets currently detected in this sector. <br /> Check back for new drops.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}