import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { loadCart } from "@/lib/cartHelpers";
import { Trash2 } from "lucide-react";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default async function CartPage() {
  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;

  // Load cart from database or cookie
  const cart = await loadCart(userId);
  const items = cart.items;

  await dbConnect();

  const ids = items.map((c) => c.cardId);
  const cardsRaw = ids.length
    ? await Card.find({ _id: { $in: ids } }).populate("brand").lean()
    : [];

  const cardMap = new Map<string, any>();
  for (const c of cardsRaw) cardMap.set(String(c._id), c);

  const rows = items
    .map((ci) => {
      const card = cardMap.get(ci.cardId);
      if (!card) return null;

      const inventoryType = card.inventoryType || "single";
      const stock = typeof card.stock === "number" ? card.stock : 0;
      const isActive = card.isActive ?? true;
      const status = card.status ?? "active";

      const qtyRequested = Math.max(1, Number(ci.qty || 1));
      const qty =
        inventoryType === "single"
          ? 1
          : Math.min(qtyRequested, Math.max(0, stock || qtyRequested));

      const lineTotal = Number(card.price) * qty;

      return {
        cardId: String(card._id),
        name: String(card.name),
        image: String(card.image || ""),
        price: Number(card.price),
        brandName: String(card.brand?.name || ""),
        rarity: String(card.rarity || ""),
        inventoryType: String(inventoryType),
        stock,
        isActive,
        status,
        qty,
        lineTotal,
      };
    })
    .filter(Boolean) as Array<any>;

  const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);

  return (
    <main className="min-h-[80vh] py-12 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tighter uppercase">
          Your Cart
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {session ? "Saved to your account" : "Guest cart (saved in browser)"}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Your cart is empty.
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-8">
            Browse Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-4">
            {rows.map((r) => {
              const unavailable = !r.isActive || r.status === "sold";
              const bulkLowStock =
                r.inventoryType === "bulk" && r.stock > 0 && r.qty > r.stock;

              return (
                <div
                  key={r.cardId}
                  className="border border-border bg-card rounded-2xl p-5 flex gap-5"
                >
                  <div className="w-20 shrink-0">
                    <div className="aspect-[2.5/3.5] bg-muted border border-border rounded-xl overflow-hidden">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                          TCG
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-foreground font-bold uppercase tracking-tight">
                          {r.name}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {r.brandName} &middot; {r.rarity}
                        </p>
                        <p className="text-foreground font-bold mt-2">
                          {money(r.price)}
                        </p>
                      </div>

                      <Link
                        href={`/card/${r.cardId}`}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                      >
                        View
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {r.inventoryType === "bulk" ? (
                        <form
                          action={`/api/cart/update`}
                          method="post"
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="cardId" value={r.cardId} />
                          <label className="text-xs text-muted-foreground">
                            Qty
                          </label>
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            max={Math.max(1, r.stock || 1)}
                            defaultValue={r.qty}
                            className="w-20 bg-background border border-border p-2 rounded-lg text-sm text-foreground font-mono"
                          />
                          <button className="text-xs font-bold text-primary border border-primary/30 px-3 py-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all">
                            Update
                          </button>
                          <span className="text-xs text-muted-foreground">
                            Stock: {r.stock}
                          </span>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Qty: 1
                        </span>
                      )}

                      <form action={`/api/cart/remove`} method="post">
                        <input type="hidden" name="cardId" value={r.cardId} />
                        <button className="text-muted-foreground hover:text-primary transition-colors p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>

                      <div className="ml-auto text-right">
                        <p className="text-xs text-muted-foreground">
                          Line Total
                        </p>
                        <p className="text-foreground font-bold">
                          {money(r.lineTotal)}
                        </p>
                      </div>
                    </div>

                    {(unavailable || bulkLowStock) && (
                      <div className="mt-4 text-xs text-primary border border-primary/30 bg-primary/5 rounded-xl p-3">
                        {unavailable
                          ? "This item is no longer available. Remove it to proceed."
                          : "Quantity exceeds stock. Update quantity to proceed."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <aside className="lg:col-span-4">
            <div className="border border-border bg-card rounded-2xl p-6 sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Summary
              </h2>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-bold">{money(subtotal)}</span>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed mt-4">
                Tax + shipping calculated at checkout.
              </p>

              <form action="/api/cart/checkout" method="post" className="mt-6">
                <button className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:brightness-90 transition-all">
                  Secure Checkout
                </button>
              </form>

              <Link
                href="/shop"
                className="mt-3 block text-center btn-outline"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
