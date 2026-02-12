import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import Link from "next/link";

const CARDS_PER_PAGE = 24;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; page?: string }>;
}) {
  await dbConnect();
  const filters = await searchParams;

  const now = new Date();
  const currentPage = Math.max(1, parseInt(filters.page || "1", 10) || 1);
  const skip = (currentPage - 1) * CARDS_PER_PAGE;

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

  // Show: non-vault cards OR vault cards whose vault period has ended
  // Hide: vault cards currently live (shown on homepage) and unreleased vault cards
  const vaultVisibilityFilter: any = {
    $or: [
      { isVault: { $ne: true } },
      { isVault: true, vaultExpiryDate: { $exists: true, $lt: now } },
    ],
  };

  const query: any = {
    $and: [publicInventoryFilter, vaultVisibilityFilter],
  };

  if (filters.brand) {
    query.$and.push({ brand: filters.brand });
  }

  const [rawCards, totalCards, rawBrands] = await Promise.all([
    Card.find(query)
      .populate("brand")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(CARDS_PER_PAGE)
      .lean(),
    Card.countDocuments(query),
    Brand.find({}).sort({ name: 1 }).lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCards / CARDS_PER_PAGE));

  const brands = rawBrands.map((brand: any) => ({
    ...brand,
    _id: brand._id.toString(),
  }));

  const marketplaceCards = rawCards.map((card: any) => {
    // Strip vault flags from expired vault cards so they display as normal cards
    const vaultExpired =
      card.isVault && card.vaultExpiryDate && new Date(card.vaultExpiryDate) < now;

    return {
      ...card,
      _id: card._id.toString(),
      brand: card.brand ? { ...card.brand, _id: card.brand._id.toString() } : null,
      createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
      updatedAt: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt,
      // Clear vault display for expired cards — shoppers just see a normal listing
      isVault: vaultExpired ? false : card.isVault,
      vaultReleaseDate: vaultExpired ? null : (card.vaultReleaseDate instanceof Date ? card.vaultReleaseDate.toISOString() : card.vaultReleaseDate),
      vaultExpiryDate: vaultExpired ? null : (card.vaultExpiryDate instanceof Date ? card.vaultExpiryDate.toISOString() : card.vaultExpiryDate),
    };
  });

  // Build pagination href preserving brand filter
  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (filters.brand) params.set("brand", filters.brand);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/shop${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6">
      <div className="flex flex-col md:flex-row grid-spacing section-spacing">
        <aside className="w-full md:w-64 shrink-0">
          <FilterSidebar brands={brands} />
        </aside>

        <section className="flex-1">
          <header className="mb-10">
            <h1 className="text-4xl brand-heading">
              {filters.brand ? "Filtered Results" : "Store"}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="h-px w-12 bg-primary" />
              <p className="text-muted-foreground text-sm">
                {totalCards} {totalCards === 1 ? "card" : "cards"} available
              </p>
            </div>
          </header>

          {marketplaceCards.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-spacing">
                {marketplaceCards.map((card: any) => (
                  <ProductCard key={card._id} card={card} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-12 flex items-center justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={pageHref(currentPage - 1)}
                      className="text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors"
                    >
                      Prev
                    </Link>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, and pages near current
                      return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2;
                    })
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <span key={p} className="flex items-center gap-2">
                          {showEllipsis && (
                            <span className="text-muted-foreground text-xs px-1">...</span>
                          )}
                          <Link
                            href={pageHref(p)}
                            className={`text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition-colors ${
                              p === currentPage
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground border border-border"
                            }`}
                          >
                            {p}
                          </Link>
                        </span>
                      );
                    })}

                  {currentPage < totalPages && (
                    <Link
                      href={pageHref(currentPage + 1)}
                      className="text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
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
