import Image from "next/image";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addToCart } from "./cartActions";
import { ShoppingCart } from "lucide-react";
import { canPurchaseCard } from "@/lib/cardAvailability";

type PopulatedBrand = { _id: unknown; name: string };

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const card = await Card.findById(id).populate("brand");
  if (!card) notFound();

  const isInactive = card.isActive === false || card.status === "inactive";
  const isSold = card.status === "sold";
  const isBulk = card.inventoryType === "bulk";
  const stock = typeof card.stock === "number" ? card.stock : 1;
  const canBuy = canPurchaseCard(card);

  return (
    <div className="min-h-screen py-12 md:py-24">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/shop" className="hover:text-foreground transition-colors">
            Store
          </Link>
          <span>/</span>
          <Link
            href={`/shop?brand=${(card.brand as PopulatedBrand)._id}`}
            className="hover:text-foreground transition-colors"
          >
            {(card.brand as PopulatedBrand).name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{card.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-6">
          <div className="bg-muted rounded-2xl aspect-[2.5/3.5] border border-border flex items-center justify-center overflow-hidden relative">
            {card.image ? (
              <Image src={card.image} alt={card.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            ) : (
              <span className="text-muted-foreground text-6xl font-bold">TCG</span>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-primary font-mono tracking-widest uppercase text-xs mb-2">
              {(card.brand as PopulatedBrand).name} / {card.rarity}
            </span>

            <h1 className="text-5xl md:text-7xl brand-heading mb-4">{card.name}</h1>

            <p className="text-4xl font-mono mb-6">${card.price}</p>

            <div className="flex items-center gap-3 mb-8">
              <span className="text-xs uppercase font-mono tracking-wide text-muted-foreground px-2 py-1 bg-muted rounded">
                {isBulk ? "Bulk" : "Single"}
              </span>
              {isBulk && (
                <span className="text-xs uppercase font-mono tracking-wide text-muted-foreground px-2 py-1 bg-muted rounded">
                  Stock: {stock}
                </span>
              )}
              {(isInactive || isSold) && (
                <span className="text-xs uppercase font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                  {isSold ? "Sold" : "Inactive"}
                </span>
              )}
            </div>

            <div className="p-6 border border-border rounded-2xl bg-card mb-8">
              <h3 className="text-muted-foreground uppercase text-xs font-bold mb-2">Description</h3>
              <p className="text-foreground/80">
                {card.description
                  ? card.description
                  : `A certified ${card.rarity} collectible from the ${(card.brand as PopulatedBrand).name} set. Stored in a smoke-free environment in a top-loader.`}
              </p>
            </div>

            {canBuy ? (
              <form action={addToCart}>
                <input type="hidden" name="cardId" value={card._id.toString()} />
                {isBulk && stock > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs uppercase font-mono tracking-wide text-muted-foreground">
                      Quantity
                    </label>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      max={stock}
                      defaultValue={1}
                      className="w-24 bg-background border border-border px-4 py-3 rounded-xl text-foreground font-mono text-center outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                    <span className="text-xs text-muted-foreground">
                      of {stock} available
                    </span>
                  </div>
                )}
                <button className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-primary/20">
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </button>
              </form>
            ) : (
              <button
                disabled
                aria-disabled="true"
                className="py-4 bg-muted text-muted-foreground font-bold text-lg rounded-medium-soft w-full cursor-not-allowed border border-border"
              >
                Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
