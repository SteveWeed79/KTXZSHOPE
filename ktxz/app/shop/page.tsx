import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import { auth } from "@/auth";
import Link from "next/link";

// Next.js 15/16 requires searchParams to be awaited as a Promise
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  await dbConnect();
  const filters = await searchParams;
  const session = await auth();

  // Check if current user is the admin to show the Command Center link
  const isAdmin = session?.user?.email === "steveweed1979@gmail.com" || (session?.user as any)?.role === "admin";

  // 1. Define 'now' for Vault logic consistency
  const now = new Date();

  // 2. Build the Query Object
  // Logic: Only show items that are NOT currently active in the Vault.
  const query: any = {
    $or: [
      { isVault: { $ne: true } },             // Case A: Standard marketplace items
      { vaultExpiryDate: { $lt: now } },      // Case B: Vault run has already finished
      { vaultReleaseDate: { $gt: now } }      // Case C: Scheduled for future Vault, but visible for now
    ]
  };

  // 3. Add Brand Filter if a user selected one in the Sidebar
  if (filters.brand) {
    query.brand = filters.brand;
  }

  // 4. Execute Queries with .lean() for high performance in Next.js 16
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
    // Ensure nested brand ID is also a string
    brand: card.brand ? { ...card.brand, _id: card.brand._id.toString() } : null,
    // Convert Dates to ISO strings to prevent 'toJSON' serialization errors in Turbopack
    createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
    updatedAt: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt,
    vaultReleaseDate: card.vaultReleaseDate instanceof Date ? card.vaultReleaseDate.toISOString() : card.vaultReleaseDate,
    vaultExpiryDate: card.vaultExpiryDate instanceof Date ? card.vaultExpiryDate.toISOString() : card.vaultExpiryDate,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-6">
      <div className="flex flex-col md:flex-row gap-8 py-12">
        
        {/* SIDEBAR - Fixed width on desktop */}
        <aside className="w-full md:w-64 shrink-0">
          <FilterSidebar brands={brands} activeBrandId={filters.brand} />
          
          {isAdmin && (
            <Link 
              href="/admin" 
              className="mt-8 flex items-center justify-center p-4 border border-dashed border-red-900/50 rounded-xl group hover:border-red-600 transition-all"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-900 group-hover:text-red-500">
                [ Command Center ]
              </span>
            </Link>
          )}
        </aside>

        {/* MAIN GRID */}
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
                No assets currently detected in this sector. <br/> Check back for new drops.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}