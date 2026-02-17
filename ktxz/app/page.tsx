import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { auth } from "@/auth";
import VaultAutoRefresh from "@/components/VaultAutoRefresh";
import { ArrowRight } from "lucide-react";

type VaultTimestampsLean = {
  vaultReleaseDate?: Date | null;
  vaultExpiryDate?: Date | null;
};

export default async function Home() {
  await dbConnect();

  const session = await auth();
  const now = new Date();

  // 1. Fetch active vault cards
  const vaultCards = await Card.find({
    isVault: true,
    vaultReleaseDate: { $lte: now },
    vaultExpiryDate: { $gt: now },
  })
    .populate("brand")
    .sort({ vaultReleaseDate: -1 })
    .limit(8)
    .lean();

  // 2. Collect timestamps for auto-refresh
  const allVaultTimestamps =
    (await Card.find({ isVault: true }, "vaultReleaseDate vaultExpiryDate").lean()) as VaultTimestampsLean[];

  const events = allVaultTimestamps
    .flatMap((c) => [c.vaultReleaseDate, c.vaultExpiryDate])
    .filter((d): d is Date => !!d);

  return (
    <main className="min-h-[80vh] flex flex-col items-center text-center px-4 relative">
      <VaultAutoRefresh events={events} />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full" />

        <div className="relative z-10 space-y-8">
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter uppercase leading-[0.9]">
            KTXZ
          </h1>

          <p className="text-muted-foreground font-mono tracking-[0.3em] uppercase text-[10px]">
            Elite Trading Card Marketplace
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/shop"
              className="btn-primary px-10 py-4 flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              Enter Storefront <ArrowRight className="h-4 w-4" />
            </Link>
            {session && (
              <Link href="/profile" className="btn-secondary">
                My Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      {vaultCards.length > 0 && (
        <section className="w-full border-t border-border py-16 mt-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-[10px] font-bold uppercase tracking-widest mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Featured
              </div>
              <p className="text-sm text-muted-foreground">Limited drops, available for a limited time</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(vaultCards as Array<{ _id: { toString(): string }; name: string; image?: string; price: number; rarity?: string; brand?: { name: string } | null; isVault?: boolean; vaultExpiryDate?: string | Date | null }>).map((card) => (
                <ProductCard key={card._id.toString()} card={{ ...card, _id: card._id.toString() }} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
