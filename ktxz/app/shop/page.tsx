import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  await dbConnect();
  const filters = await searchParams;

  const now = new Date();

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

  const vaultVisibilityFilter: any = {
    $or: [
      { isVault: { $ne: true } },
      { vaultExpiryDate: { $lt: now } },
      { vaultReleaseDate: { $gt: now } },
    ],
  };

  const query: any = {
    $and: [publicInventoryFilter, vaultVisibilityFilter],
  };

  if (filters.brand) {
    query.$and.push({ brand: filters.brand });
  }

  const rawCards = await Card.find(query)
    .populate("brand")
    .sort({ createdAt: -1 })
    .lean();

  const rawBrands = await Brand.find({}).sort({ name: 1 }).lean();

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
        </aside>

        <section className="flex-1">
          <header className="mb-10">
            <h1 className="text-4xl font-bold tracking-tighter uppercase">
              {filters.brand ? "Filtered Results" : "Store"}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="h-px w-12 bg-primary" />
              <p className="text-muted-foreground text-sm">
                {filters.brand ? "Showing filtered inventory" : "Browse all available cards"}
              </p>
            </div>
          </header>

          {marketplaceCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {marketplaceCards.map((card: any) => (
                <ProductCard key={card._id} card={card} />
              ))}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl">
              <p className="text-muted-foreground text-sm text-center px-6">
                No cards found in this category. <br /> Check back for new listings.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
