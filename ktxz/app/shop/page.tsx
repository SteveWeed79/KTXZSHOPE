import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";

// Next.js 15/16 requires searchParams to be awaited
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  await dbConnect();
  const filters = await searchParams;

  // 1. Define 'now' for Vault logic
  const now = new Date();

  // 2. Build the Query Object
  const query: any = {
    $or: [
      { isVault: false },                   // Case A: Standard marketplace items
      { vaultExpiryDate: { $lt: now } },    // Case B: Vault run has finished
      { vaultReleaseDate: { $gt: now } }    // Case C: Scheduled for future Vault
    ]
  };

  // 3. Add Brand Filter if it exists
  if (filters.brand) {
    query.brand = filters.brand;
  }

  // 4. Execute Queries with .lean()
  const rawCards = await Card.find(query)
    .populate('brand')
    .sort({ createdAt: -1 })
    .lean();

  const rawBrands = await Brand.find({}).sort({ name: 1 }).lean();

  // 5. DATA SANITIZATION (Critical Fix for Serialization Error)
  // Converts MongoDB ObjectIds and Dates into plain strings for Client Components
  const brands = rawBrands.map((brand: any) => ({
    ...brand,
    _id: brand._id.toString(),
  }));

  const marketplaceCards = rawCards.map((card: any) => ({
    ...card,
    _id: card._id.toString(),
    // Ensure nested brand ID is also a string if it exists
    brand: card.brand ? { ...card.brand, _id: card.brand._id.toString() } : null,
    // Convert Dates to strings to prevent 'toJSON' serialization errors
    createdAt: card.createdAt?.toISOString(),
    updatedAt: card.updatedAt?.toISOString(),
    vaultReleaseDate: card.vaultReleaseDate?.toISOString(),
    vaultExpiryDate: card.vaultExpiryDate?.toISOString(),
  }));

  return (
    <div className="flex flex-col md:flex-row gap-8 py-12">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 shrink-0">
        <FilterSidebar brands={brands} activeBrandId={filters.brand} />
      </aside>

      {/* MAIN GRID */}
      <section className="flex-1">
        <header className="mb-12">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            {filters.brand ? "Filtered Sector" : "Live Inventory"}
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
            {filters.brand ? "Showing specialized assets" : "Verified Secondary Market // Phase 1"}
          </p>
        </header>

        {marketplaceCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {marketplaceCards.map((card: any) => (
              <ProductCard key={card._id} card={card} />
            ))}
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center border border-dashed border-gray-900 rounded-3xl">
            <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">
              No assets found in this sector.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}