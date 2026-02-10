import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadCart } from "@/lib/cartHelpers";
import { createCheckoutSession } from "./actions";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default async function CheckoutPage() {
  await dbConnect();

  const session = await auth();
  const userId = session?.user ? (session.user as { id?: string }).id ?? null : null;

  const cart = await loadCart(userId);
  const items = cart.items ?? [];
  if (items.length === 0) redirect("/cart");

  const ids = items.map((i) => i.cardId).filter(Boolean);
  const cards = await Card.find({ _id: { $in: ids } }).populate("brand").lean();

  const cardsById = new Map<string, any>();
  for (const c of cards) cardsById.set(String(c._id), c);

  const rows = items
    .map((it) => {
      const card = cardsById.get(it.cardId);
      if (!card) return null;
      const isInactive = (card as any).isActive === false || (card as any).status === "inactive";
      const isSold = (card as any).status === "sold";
      const inventoryType = (card as any).inventoryType || "single";
      const isBulk = inventoryType === "bulk";
      const stock = typeof (card as any).stock === "number" ? (card as any).stock : 1;
      const canBuy = !isInactive && !isSold && (!isBulk || stock > 0);
      const qty = !isBulk ? 1 : Math.max(1, Math.min(it.qty || 1, stock));
      return { card, qty, canBuy };
    })
    .filter(Boolean) as Array<{ card: any; qty: number; canBuy: boolean }>;

  if (rows.length === 0) redirect("/cart");

  const hasUnavailable = rows.some((r) => !r.canBuy);
  const subtotal = rows.reduce((sum, r) => sum + Number(r.card.price || 0) * r.qty, 0);

  return (
    <main className="min-h-[80vh] py-12 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">Checkout</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Shipping + tax calculated at payment
          </p>
        </div>
        <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 space-y-4">
          <div className="border border-border bg-card rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
              Order Review
            </h2>

            <div className="space-y-4">
              {rows.map((r) => (
                <div
                  key={String(r.card._id)}
                  className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 shrink-0">
                      <div className="aspect-[2.5/3.5] rounded-xl overflow-hidden border border-border bg-muted">
                        <img
                          src={r.card.image || "/placeholder-card.png"}
                          alt={r.card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-tight">{r.card.name}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {r.card.rarity} / {r.card.brand?.name}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">Qty: {r.qty}</p>
                      {!r.canBuy && (
                        <p className="text-primary text-xs font-bold mt-2">
                          Unavailable — remove from cart to continue
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(r.card.price).toFixed(2)}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Line: ${(Number(r.card.price) * r.qty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {hasUnavailable && (
              <div className="mt-6 border border-primary/30 bg-primary/5 rounded-xl p-4">
                <p className="text-primary text-xs">
                  Some items are unavailable. Go back to cart and remove them before checkout.
                </p>
                <Link href="/cart" className="inline-block mt-2 text-xs font-bold text-primary hover:underline">
                  Fix Cart
                </Link>
              </div>
            )}
          </div>

          <div className="border border-border bg-card rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Shipping Address
            </h2>
            <p className="text-xs text-muted-foreground">
              Shipping address is collected during the Stripe Checkout step.
            </p>
          </div>
        </section>

        <aside className="lg:col-span-5">
          <div className="border border-border bg-card rounded-2xl p-6 sticky top-24">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
              Payment Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">At payment</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-muted-foreground">At payment</span>
              </div>

              <div className="h-px bg-border my-4" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <form action={createCheckoutSession} className="mt-6">
              <button
                disabled={hasUnavailable}
                className={`w-full font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${
                  hasUnavailable
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-primary text-primary-foreground hover:brightness-90 shadow-lg shadow-primary/20"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Continue to Payment
              </button>
            </form>

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Secure checkout powered by Stripe
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
