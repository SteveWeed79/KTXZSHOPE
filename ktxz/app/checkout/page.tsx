import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createCheckoutSession } from "./actions";

type CookieCartItem = {
  cardId: string;
  qty: number;
};

type CookieCart = {
  id: string;
  items: CookieCartItem[];
  updatedAt: number;
};

const CART_COOKIE = "ktxz_cart_v1";

function safeParseCart(raw: string | undefined): CookieCart | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieCart;
    if (!parsed?.id || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function CheckoutPage() {
  await dbConnect();

  const cookieStore = await cookies();
  const cart = safeParseCart(cookieStore.get(CART_COOKIE)?.value);

  const items = cart?.items ?? [];
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
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Checkout
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
            Shipping + tax calculated at payment
          </p>
        </div>

        <Link
          href="/cart"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
        >
          ← Back to Cart
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 space-y-4">
          <div className="border border-gray-900 bg-gray-950/30 rounded-3xl p-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">
              Order Review
            </h2>

            <div className="space-y-4">
              {rows.map((r) => (
                <div
                  key={String(r.card._id)}
                  className="flex items-start justify-between gap-4 border-b border-gray-900 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 shrink-0">
                      <div className="aspect-[2.5/3.5] rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                        <img
                          src={r.card.image || "/placeholder-card.png"}
                          alt={r.card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-white font-black uppercase tracking-tight">{r.card.name}</p>
                      <p className="text-gray-500 text-[10px] font-mono uppercase mt-1 tracking-widest">
                        {r.card.rarity} // {r.card.brand?.name}
                      </p>
                      <p className="text-gray-600 text-[10px] font-mono uppercase mt-2 tracking-[0.3em]">
                        Qty: {r.qty}
                      </p>

                      {!r.canBuy && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2">
                          Unavailable — remove from cart to continue
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white font-bold">${Number(r.card.price).toFixed(2)}</p>
                    <p className="text-gray-600 text-[10px] font-mono uppercase tracking-[0.3em] mt-1">
                      Line: ${(Number(r.card.price) * r.qty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {hasUnavailable && (
              <div className="mt-6 border border-red-900/50 bg-red-950/20 rounded-2xl p-4">
                <p className="text-red-400 text-[10px] uppercase font-mono tracking-widest">
                  Some items are unavailable. Go back to cart and remove them before checkout.
                </p>
                <Link
                  href="/cart"
                  className="inline-block mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-white transition-colors"
                >
                  Fix Cart →
                </Link>
              </div>
            )}
          </div>

          <div className="border border-gray-900 bg-gray-950/20 rounded-3xl p-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Shipping Address
            </h2>
            <p className="text-[9px] text-gray-700 uppercase font-mono leading-relaxed">
              Address collection happens in Stripe Checkout (for now). Later we can bring it
              in-house if you want.
            </p>
          </div>
        </section>

        <aside className="lg:col-span-5">
          <div className="border border-gray-900 bg-gray-950/40 rounded-3xl p-8 sticky top-24">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">
              Payment Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-bold">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-600">Calculated in payment</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-600">Calculated in payment</span>
              </div>

              <div className="h-px bg-gray-900 my-4" />

              <div className="flex justify-between">
                <span className="text-white font-black uppercase tracking-widest text-[10px]">
                  Total
                </span>
                <span className="text-white font-black">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <form action={createCheckoutSession} className="mt-8">
              <button
                disabled={hasUnavailable}
                className={`w-full text-center font-black py-4 rounded-xl transition-all uppercase text-xs tracking-[0.2em] ${
                  hasUnavailable
                    ? "bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800"
                    : "bg-white text-black hover:bg-green-500"
                }`}
              >
                Continue to Payment
              </button>
            </form>

            <p className="text-[9px] text-gray-700 uppercase font-mono leading-relaxed mt-6">
              Next: Stripe Checkout Session (cards → line items, tax + address, success/cancel).
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
