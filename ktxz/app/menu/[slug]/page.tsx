import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await dbConnect();
  const { slug } = await params;

  const brand = await Brand.findOne({ slug });
  if (!brand) notFound();

  const cards = await Card.find({
    brand: brand._id,
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
  })
    .populate("brand")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="min-h-screen section-spacing">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl brand-heading">
              {brand.name} Collection
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="h-px w-12 bg-primary" />
              <p className="text-muted-foreground text-sm">
                {cards.length} {cards.length === 1 ? "card" : "cards"} available
              </p>
            </div>
          </div>

          <Link
            href="/shop"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Shop
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No active listings in this category yet.
            </p>
            <Link href="/shop" className="btn-primary inline-block mt-8">
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-spacing">
            {(cards as Array<{ _id: { toString(): string }; name: string; image?: string; price: number; rarity?: string; brand?: { name: string } | null; isVault?: boolean; vaultExpiryDate?: string | Date | null }>).map((card) => (
              <ProductCard
                key={card._id.toString()}
                card={{
                  _id: card._id.toString(),
                  name: card.name,
                  image: card.image,
                  price: card.price,
                  rarity: card.rarity,
                  brand: card.brand,
                  isVault: card.isVault,
                  vaultExpiryDate: card.vaultExpiryDate,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
