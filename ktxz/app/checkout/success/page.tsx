/**
 * ============================================================================
 * FILE: ktxz/app/checkout/success/page.tsx
 * STATUS: MODIFIED (Database cart support)
 * ============================================================================
 * 
 * Checkout success page with cart clearing for both database and cookie carts
 */

import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { auth } from "@/auth";
import { clearCart } from "@/lib/cartHelpers";

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
        <div className="border border-border bg-card rounded-3xl p-10 text-center">
          <h1 className="text-3xl brand-heading-italic">
            Checkout Complete
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
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
        <div className="border border-border bg-card rounded-3xl p-10 text-center">
          <h1 className="text-3xl brand-heading-italic">
            Checkout Complete
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
            Missing session reference
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-10">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  // Authenticate user first to validate ownership
  const userSession = await auth();
  const userId = userSession?.user?.id ?? null;
  const userEmail = userSession?.user?.email?.toLowerCase() ?? "";

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items.data.price.product"],
    });
  } catch {
    return (
      <main className="min-h-[80vh] py-16 max-w-4xl mx-auto">
        <div className="border border-border bg-card rounded-3xl p-10 text-center">
          <h1 className="text-3xl brand-heading-italic">Invalid Session</h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
            The checkout session could not be found
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-10">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  // Validate that this session belongs to the current user
  const sessionEmail = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  if (userEmail && sessionEmail && userEmail !== sessionEmail) {
    return (
      <main className="min-h-[80vh] py-16 max-w-4xl mx-auto">
        <div className="border border-border bg-card rounded-3xl p-10 text-center">
          <h1 className="text-3xl brand-heading-italic">Access Denied</h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-4">
            This order does not belong to your account
          </p>
          <Link href="/shop" className="btn-primary inline-block mt-10">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  const paid = session.payment_status === "paid";

  if (paid) {
    // Clear cart (handles both database and cookie)
    await clearCart(userId);
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
    <main className="min-h-[80vh] section-spacing max-w-5xl mx-auto">
      <div className="border border-border bg-card rounded-3xl p-10">
        <div className="text-center">
          <h1 className="text-4xl brand-heading-italic">
            {paid ? "Payment Authorized" : "Payment Pending"}
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-3">
            Your order is being processed
          </p>

          <div
            className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              paid
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {paid ? "Status: Paid" : "Status: Not Paid"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 grid-spacing">
          <section className="lg:col-span-7">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
              Items
            </h2>

            <div className="space-y-3">
              {lineItems.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-6">
                  <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
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
                      className="border border-border bg-card rounded-2xl p-5 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-foreground font-black uppercase tracking-tight">{name}</p>
                        <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] mt-2">
                          Qty: {qty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-bold">{money(amount)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <aside className="lg:col-span-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
              Totals
            </h2>

            <div className="border border-border bg-card rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-bold">{money(amountSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground font-bold">{money(amountShipping)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground font-bold">{money(amountTax)}</span>
              </div>

              <div className="h-px bg-border my-2" />

              <div className="flex justify-between">
                <span className="text-foreground font-black uppercase tracking-widest text-[10px]">
                  Total
                </span>
                <span className="text-foreground font-black">{money(amountTotal)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/shop" className="flex-1 btn-primary text-center">
                Return to Shop
              </Link>
              <Link
                href="/profile"
                className="flex-1 btn-outline text-center"
              >
                Account
              </Link>
            </div>

            <p className="text-[9px] text-muted-foreground uppercase font-mono leading-relaxed mt-6">
              Your cart has been cleared. Order confirmation sent to your email.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}