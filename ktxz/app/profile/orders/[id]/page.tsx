/**
 * ============================================================================
 * FILE: ktxz/app/profile/orders/[id]/page.tsx
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Customer order detail page
 * Shows full order information including items, addresses, tracking
 */

import Image from "next/image";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Link from "next/link";

function formatDate(date: Date | string | undefined | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await dbConnect();

  const { id } = await params;
  const userId = session.user?.id;

  // Load order and verify it belongs to this user
  const order = await Order.findOne({
    _id: id,
    user: userId,
  })
    .populate("items.card")
    .lean();

  if (!order) {
    notFound();
  }

  const orderId = String(order._id);
  const status = order.status || "pending";
  const items = order.items || [];
  const amounts = order.amounts || { subtotal: 0, tax: 0, shipping: 0, total: 0 };
  const shippingAddr = order.shippingAddress || {};

  return (
    <main className="section-spacing max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl brand-heading-italic">
              Order #{orderId.slice(-8)}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border ${getStatusColor(
                status
              )}`}
            >
              {status}
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase">
            Placed: {formatDate(order.createdAt)}
          </p>
        </div>

        <Link
          href="/profile/orders"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Orders
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 grid-spacing">
        {/* Main Content - Order Items */}
        <section className="lg:col-span-8 space-y-6">
          {/* Items */}
          <div className="border border-border bg-card rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
              Items Secured
            </h2>

            <div className="space-y-4">
              {(items as Array<{ name: string; image?: string; rarity?: string; brandName?: string; unitPrice: number; quantity: number }>).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  {/* Image */}
                  <div className="w-16 shrink-0">
                    <div className="aspect-[2.5/3.5] bg-muted border border-border rounded-xl overflow-hidden relative">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black text-xs">
                          TCG
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <p className="text-foreground font-black uppercase tracking-tight text-sm">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] mt-1">
                      {item.rarity} {"//"} {item.brandName}
                    </p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] mt-2">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-foreground font-bold">
                      {formatMoney(item.unitPrice)}
                    </p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] mt-1">
                      Unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking (if available) */}
          {order.trackingNumber && (
            <div className="border border-primary/30 bg-primary/5 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary mb-4">
                Tracking Information
              </h2>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    Carrier
                  </span>
                  <span className="text-[10px] text-foreground font-mono uppercase">
                    {order.carrier || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    Tracking Number
                  </span>
                  <span className="text-[10px] text-primary font-mono">
                    {order.trackingNumber}
                  </span>
                </div>

                {order.fulfilledAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      Shipped
                    </span>
                    <span className="text-[10px] text-foreground font-mono">
                      {formatDate(order.fulfilledAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping Address */}
          <div className="border border-border bg-card rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
              Shipping Address
            </h2>

            <div className="text-[10px] text-foreground font-mono leading-relaxed">
              <p>{shippingAddr.name || "—"}</p>
              <p>{shippingAddr.line1 || "—"}</p>
              {shippingAddr.line2 && <p>{shippingAddr.line2}</p>}
              <p>
                {shippingAddr.city || "—"}, {shippingAddr.state || "—"}{" "}
                {shippingAddr.postalCode || "—"}
              </p>
              <p>{shippingAddr.country || "—"}</p>
            </div>
          </div>
        </section>

        {/* Sidebar - Summary */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Order Summary */}
          <div className="border border-border bg-card rounded-2xl p-6 sticky top-24">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-bold">
                  {formatMoney(amounts.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground font-bold">
                  {formatMoney(amounts.shipping)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground font-bold">
                  {formatMoney(amounts.tax)}
                </span>
              </div>

              <div className="h-px bg-muted my-4" />

              <div className="flex justify-between">
                <span className="text-foreground font-black uppercase tracking-widest text-[10px]">
                  Total
                </span>
                <span className="text-foreground font-black text-xl">
                  {formatMoney(amounts.total)}
                </span>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                Status Timeline
              </h3>

              <div className="space-y-3">
                {order.paidAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <div>
                      <p className="text-[9px] text-foreground font-bold uppercase">
                        Payment Confirmed
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {formatDate(order.paidAt)}
                      </p>
                    </div>
                  </div>
                )}

                {order.fulfilledAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <div>
                      <p className="text-[9px] text-foreground font-bold uppercase">
                        Order Shipped
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {formatDate(order.fulfilledAt)}
                      </p>
                    </div>
                  </div>
                )}

                {order.cancelledAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">✕</span>
                    <div>
                      <p className="text-[9px] text-foreground font-bold uppercase">
                        Order Cancelled
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {formatDate(order.cancelledAt)}
                      </p>
                    </div>
                  </div>
                )}

                {order.refundedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">↻</span>
                    <div>
                      <p className="text-[9px] text-foreground font-bold uppercase">
                        Payment Refunded
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {formatDate(order.refundedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}