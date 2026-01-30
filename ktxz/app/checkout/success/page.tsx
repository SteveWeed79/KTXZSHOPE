import Link from "next/link";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";

const CART_COOKIE = "ktxz_cart_v1";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return (
      <main className="min-h-[80vh] py-16 max-w-4xl mx-auto">
        <div className="border border-gray-900 bg-gray-950/30 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Checkout Complete
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
            Stripe is not configured
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-10">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <main className="min-h-[80vh] py-16 max-w-4xl mx-auto">
        <div className="border border-gray-900 bg-gray-950/30 rounded-3xl p-10 text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            Checkout Complete
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
            Missing session reference
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-10">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["line_items.data.price.product"],
  });

  const paid = session.payment_status === "paid";

  if (paid) {
    const cookieStore = await cookies();
    cookieStore.set(CART_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  const lineItems = (session as any).line_items?.data ?? [];
  const amountTotal = typeof session.amount_total === "number" ? session.amount_total : 0;
  const amountSubtotal = typeof session.amount_subtotal === "number" ? session.amount_subtotal : 0;
  const amountTax =
    typeof session.total_details?.amount_tax === "number" ? session.total_details.amount_tax : 0;
  const amountShipping =
    typeof session.total_details?.amount_shipping === "number"
      ? session.total_details.amount_shipping
      : 0;

  await dbConnect();
  void Card;

  return (
    <main className="min-h-[80vh] py-12 max-w-5xl mx-auto">
      <div className="border border-gray-900 bg-gray-950/30 rounded-3xl p-10">
        <div className="text-center">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            {paid ? "Payment Authorized" : "Payment Pending"}
          </h1>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase mt-3">
            Session: {session.id}
          </p>

          <div
            className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              paid
                ? "border-green-700/50 bg-green-950/30 text-green-400"
                : "border-yellow-700/50 bg-yellow-950/30 text-yellow-400"
            }`}
          >
            {paid ? "Status: Paid" : "Status: Not Paid"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
              Items
            </h2>

            <div className="space-y-3">
              {lineItems.length === 0 ? (
                <div className="border border-dashed border-gray-900 rounded-2xl p-6">
                  <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">
                    No line items found.
                  </p>
                </div>
              ) : (
                lineItems.map((li: any, idx: number) => {
                  const name = li?.price?.product?.name || li?.description || `Item ${idx + 1}`;
                  const qty = li?.quantity || 1;
                  const amount = typeof li?.amount_total === "number" ? li.amount_total : 0;

                  return (
                    <div
                      key={li?.id || idx}
                      className="border border-gray-900 bg-black/40 rounded-2xl p-5 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-white font-black uppercase tracking-tight">{name}</p>
                        <p className="text-gray-600 text-[10px] font-mono uppercase tracking-[0.3em] mt-2">
                          Qty: {qty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{money(amount)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <aside className="lg:col-span-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
              Totals
            </h2>

            <div className="border border-gray-900 bg-black/40 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-white font-bold">{money(amountSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-white font-bold">{money(amountShipping)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-white font-bold">{money(amountTax)}</span>
              </div>

              <div className="h-px bg-gray-900 my-2" />

              <div className="flex justify-between">
                <span className="text-white font-black uppercase tracking-widest text-[10px]">
                  Total
                </span>
                <span className="text-white font-black">{money(amountTotal)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/shop" className="flex-1 btn-primary text-center">
                Return to Shop
              </Link>
              <Link
                href="/profile"
                className="flex-1 border-2 border-gray-900 text-gray-200 font-bold py-3 px-6 rounded-xl transition-all duration-200 uppercase text-xs tracking-widest hover:bg-gray-900 hover:text-white text-center"
              >
                Account
              </Link>
            </div>

            <p className="text-[9px] text-gray-700 uppercase font-mono leading-relaxed mt-6">
              Next: Stripe webhooks → Orders DB, inventory holds, Shippo fulfillment.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
