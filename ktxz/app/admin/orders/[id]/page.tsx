"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { StatusStepper } from "@/components/StatusStepper";
import { Printer, Mail, Package, Send } from "lucide-react";

interface Order {
  _id: string;
  orderNumber: string;
  email: string;
  items: Array<{
    card: { _id: string; name: string; setName?: string; imageUrl?: string };
    name: string;
    image?: string;
    brandName?: string;
    rarity?: string;
    unitPrice: number;
    quantity: number;
  }>;
  amounts: { subtotal: number; tax: number; shipping: number; total: number };
  status: string;
  shippingAddress?: {
    name?: string; line1?: string; line2?: string;
    city?: string; state?: string; postalCode?: string; country?: string;
  };
  billingAddress?: {
    name?: string; line1?: string; line2?: string;
    city?: string; state?: string; postalCode?: string; country?: string;
  };
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  fulfilledAt?: string;
}

const inputClass =
  "w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch order");
      const data = await response.json();
      setOrder(data.order);
      setTrackingNumber(data.order.trackingNumber || "");
      setCarrier(data.order.carrier || "");
      setNotes(data.order.notes || "");
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`Change order status to ${newStatus}?`)) return;
    try {
      setUpdating(true);
      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      await fetchOrder();
      alert("Status updated successfully!");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const updateTracking = async () => {
    try {
      setUpdating(true);
      const response = await fetch("/api/admin/orders/update-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, trackingNumber, carrier, notes }),
      });
      if (!response.ok) throw new Error("Failed to update tracking");
      await fetchOrder();
      alert("Tracking information updated!");
    } catch (err) {
      console.error("Error updating tracking:", err);
      alert("Failed to update tracking");
    } finally {
      setUpdating(false);
    }
  };

  const sendEmail = async (emailType: "confirmation" | "shipping") => {
    if (!confirm(`Send ${emailType} email to customer?`)) return;
    try {
      const response = await fetch("/api/admin/orders/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, emailType }),
      });
      if (!response.ok) throw new Error("Failed to send email");
      alert("Email sent successfully!");
    } catch (err) {
      console.error("Error sending email:", err);
      alert("Failed to send email");
    }
  };

  const processRefund = async () => {
    const isPartial = refundType === "partial";
    const amt = isPartial ? parseFloat(refundAmount) : null;
    if (isPartial && (!amt || amt <= 0)) { alert("Please enter a valid refund amount"); return; }
    const confirmMsg = isPartial ? `Process a partial refund of $${amt?.toFixed(2)}?` : "Process a FULL refund for this order?";
    if (!confirm(confirmMsg)) return;
    try {
      setRefunding(true);
      const response = await fetch("/api/admin/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, amount: isPartial ? amt : undefined, reason: refundReason || undefined }),
      });
      const data = await response.json();
      if (!response.ok) { alert(data.error || "Failed to process refund"); return; }
      alert(data.message);
      setShowRefundForm(false);
      await fetchOrder();
    } catch (err) {
      console.error("Error processing refund:", err);
      alert("Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Order not found</p>
          <Link href="/admin/orders" className="text-primary hover:underline">Back to Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-2 text-xs">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        {/* Status Stepper */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <StatusStepper status={order.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 border-b border-border pb-4 last:border-b-0">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground text-xs">No img</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.brandName} &middot; {item.rarity}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(item.unitPrice / 100).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">${((item.unitPrice * item.quantity) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>${(order.amounts.subtotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>${(order.amounts.shipping / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>${(order.amounts.tax / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border"><span>Total</span><span>${(order.amounts.total / 100).toFixed(2)}</span></div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Shipping Address</h3>
                  <div className="text-sm space-y-0.5">
                    {order.shippingAddress?.name && <p>{order.shippingAddress.name}</p>}
                    {order.shippingAddress?.line1 && <p>{order.shippingAddress.line1}</p>}
                    {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
                    {order.shippingAddress?.city && <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>}
                    {order.shippingAddress?.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Billing Address</h3>
                  <div className="text-sm space-y-0.5">
                    {order.billingAddress?.name && <p>{order.billingAddress.name}</p>}
                    {order.billingAddress?.line1 && <p>{order.billingAddress.line1}</p>}
                    {order.billingAddress?.line2 && <p>{order.billingAddress.line2}</p>}
                    {order.billingAddress?.city && <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}</p>}
                    {order.billingAddress?.country && <p>{order.billingAddress.country}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm"><span className="font-medium">Email:</span> {order.email}</p>
              </div>
            </div>

            {/* Tracking */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Tracking Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Tracking Number</label>
                  <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className={inputClass} placeholder="Enter tracking number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Carrier</label>
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputClass}>
                    <option value="">Select carrier</option>
                    <option value="USPS">USPS</option>
                    <option value="UPS">UPS</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Internal Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Add internal notes..." />
                </div>
                <button onClick={updateTracking} disabled={updating} className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:brightness-90 transition-all disabled:opacity-50">
                  {updating ? "Updating..." : "Update Tracking"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status Actions */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Status Actions</h2>
              <div className="space-y-2">
                {order.status === "pending" && (
                  <button onClick={() => updateStatus("paid")} disabled={updating} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-90 font-medium">Mark as Paid</button>
                )}
                {order.status === "paid" && (
                  <button onClick={() => updateStatus("fulfilled")} disabled={updating} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-90 font-medium">Mark as Fulfilled</button>
                )}
                {order.status !== "cancelled" && order.status !== "refunded" && (
                  <button onClick={() => updateStatus("cancelled")} disabled={updating} className="w-full py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 font-medium">Cancel Order</button>
                )}
                {order.status !== "refunded" && order.status !== "pending" && (
                  <button onClick={() => setShowRefundForm(!showRefundForm)} disabled={refunding} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-90 font-medium">Refund Order</button>
                )}
              </div>
            </div>

            {/* Refund Form */}
            {showRefundForm && (
              <div className="bg-card border-2 border-primary/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 text-primary">Process Refund</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="refundType" value="full" checked={refundType === "full"} onChange={() => setRefundType("full")} className="accent-primary" />
                      <span className="text-sm font-medium">Full Refund</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="refundType" value="partial" checked={refundType === "partial"} onChange={() => setRefundType("partial")} className="accent-primary" />
                      <span className="text-sm font-medium">Partial Refund</span>
                    </label>
                  </div>
                  {refundType === "partial" && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Refund Amount ($)</label>
                      <input type="number" step="0.01" min="0.01" max={order.amounts.total} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className={inputClass} placeholder="0.00" />
                      <p className="text-xs text-muted-foreground mt-1">Order total: ${order.amounts.total.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Reason (optional)</label>
                    <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className={inputClass}>
                      <option value="">No reason specified</option>
                      <option value="requested_by_customer">Customer request</option>
                      <option value="duplicate">Duplicate charge</option>
                      <option value="fraudulent">Fraudulent</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={processRefund} disabled={refunding} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-90 font-medium disabled:opacity-50">
                      {refunding ? "Processing..." : "Confirm Refund"}
                    </button>
                    <button onClick={() => setShowRefundForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Email Actions */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Email Customer</h2>
              <div className="space-y-2">
                <button onClick={() => sendEmail("confirmation")} className="w-full py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" /> Send Confirmation
                </button>
                <button onClick={() => sendEmail("shipping")} disabled={!trackingNumber} className="w-full py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="h-4 w-4" /> Send Shipping Notice
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">Order Placed</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {order.paidAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">Payment Received</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.paidAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {order.fulfilledAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">Order Fulfilled</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.fulfilledAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
