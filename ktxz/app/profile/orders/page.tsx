/**
 * ============================================================================
 * FILE: ktxz/app/profile/orders/page.tsx
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Customer order history list
 * Shows all orders for the logged-in user
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Link from "next/link";

function formatDate(date: Date | string | undefined | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function getStatusColor(status: string) {
  const colors = {
    pending: "text-primary/70 bg-primary/10 border-primary/20",
    paid: "text-primary bg-primary/10 border-primary/30",
    fulfilled: "text-foreground bg-muted border-border",
    cancelled: "text-muted-foreground bg-muted border-border",
    refunded: "text-muted-foreground bg-muted border-border",
  };
  return colors[status as keyof typeof colors] || colors.pending;
}

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await dbConnect();

  const userId = session.user?.id;

  // Load all orders for this user, sorted by newest first
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="section-spacing max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl brand-heading">
            Order History
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase mt-2">
            Mission Archive // {orders.length} Total Transmissions
          </p>
        </div>

        <Link
          href="/profile"
          className="brand-label hover:text-foreground flex items-center gap-2 transition-colors"
        >
          ← Back to Profile
        </Link>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div className="border border-dashed border-border rounded-2xl bg-card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 opacity-20">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
            </svg>
          </div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            No Orders Found
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase mb-6">
            Your order archive is currently empty
          </p>
          <Link href="/shop" className="btn-primary inline-block">
            Browse Inventory
          </Link>
        </div>
      ) : (
        /* Order List */
        <div className="space-y-4">
          {(orders as Array<{ _id: unknown; amounts?: { total?: number }; items?: unknown[]; status?: string; createdAt?: Date | string | null; trackingNumber?: string }>).map((order) => {
            const orderId = String(order._id);
            const total = order.amounts?.total || 0;
            const itemCount = order.items?.length || 0;
            const status = order.status || "pending";
            const createdAt = order.createdAt;

            return (
              <Link
                key={orderId}
                href={`/profile/orders/${orderId}`}
                className="block border border-border bg-card rounded-2xl p-6 hover:border-primary transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-foreground font-black uppercase tracking-tight text-sm">
                        Order #{orderId.slice(-8)}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getStatusColor(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em]">
                      {formatDate(createdAt)} {"//"} {itemCount} Item{itemCount !== 1 ? "s" : ""}
                    </p>

                    {/* Tracking Number (if available) */}
                    {order.trackingNumber && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground uppercase font-mono">
                          Tracking:
                        </span>
                        <span className="text-[9px] text-primary font-mono">
                          {order.trackingNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Amount + Arrow */}
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">
                        Total
                      </p>
                      <p className="text-foreground font-black text-xl">
                        {formatMoney(total)}
                      </p>
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      →
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}