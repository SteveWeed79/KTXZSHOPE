/**
 * ============================================================================
 * FILE: ktxz/app/cart/page.tsx
 * STATUS: MODIFIED (Database cart support)
 * ============================================================================
 * 
 * Cart page with database support for logged-in users
 * - Logged-in users: Load from database
 * - Guests: Load from cookie
 */

import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { loadCart } from "@/lib/cartHelpers";

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
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
          Cart
        </h1>
        <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
          {session ? "Your cart" : "Guest cart (cookie-based)"}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-900 rounded-3xl bg-gray-950/20 p-12 text-center">
          <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">
            No assets in cart.
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-8">
            Browse Inventory
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
                  className="border border-gray-900 bg-black/40 rounded-2xl p-5 flex gap-5"
                >
                  <div className="w-20 shrink-0">
                    <div className="aspect-[2.5/3.5] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 font-black">
                          TCG
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-black uppercase tracking-tight">
                          {r.name}
                        </p>
                        <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mt-2">
                          {r.brandName} // {r.rarity}
                        </p>
                        <p className="text-white font-bold mt-2">
                          {money(r.price)}
                        </p>
                      </div>

                      <Link
                        href={`/card/${r.cardId}`}
                        className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest"
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
                          <label className="text-[10px] text-gray-600 uppercase font-mono">
                            Qty
                          </label>
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            max={Math.max(1, r.stock || 1)}
                            defaultValue={r.qty}
                            className="w-20 bg-black border border-gray-800 p-2 rounded-lg text-[10px] text-white font-mono"
                          />
                          <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 border border-blue-900/50 px-3 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                            Update
                          </button>
                          <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest">
                            Stock: {r.stock}
                          </span>
                        </form>
                      ) : (
                        <span className="text-[10px] text-gray-700 font-mono uppercase tracking-widest">
                          Qty: 1 (single)
                        </span>
                      )}

                      <form action={`/api/cart/remove`} method="post">
                        <input type="hidden" name="cardId" value={r.cardId} />
                        <button className="text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                          Remove
                        </button>
                      </form>

                      <div className="ml-auto text-right">
                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                          Line Total
                        </p>
                        <p className="text-white font-black">
                          {money(r.lineTotal)}
                        </p>
                      </div>
                    </div>

                    {(unavailable || bulkLowStock) && (
                      <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-red-400 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
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
            <div className="border border-gray-900 bg-black/40 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Summary
              </h2>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-white font-bold">{money(subtotal)}</span>
              </div>

              <p className="text-[9px] text-gray-700 uppercase font-mono leading-relaxed mt-4">
                Tax + shipping calculated by Stripe at checkout (based on address).
              </p>

              <form action="/api/cart/checkout" method="post" className="mt-6">
                <button className="w-full btn-primary">Proceed to Checkout</button>
              </form>

              <Link
                href="/shop"
                className="mt-3 block text-center border-2 border-gray-900 text-gray-200 font-bold py-3 px-6 rounded-xl transition-all duration-200 uppercase text-xs tracking-widest hover:bg-gray-900 hover:text-white"
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