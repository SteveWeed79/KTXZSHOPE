/**
 * ============================================================================
 * FILE: app/admin/orders/[id]/page.tsx
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Admin Order Detail Page
 * - Complete order information
 * - Status management
 * - Tracking management
 * - Email sending
 * - Print invoice
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Order {
  _id: string;
  orderNumber: string;
  email: string;
  items: Array<{
    card: {
      _id: string;
      name: string;
      setName?: string;
      imageUrl?: string;
    };
    name: string;
    image?: string;
    brandName?: string;
    rarity?: string;
    unitPrice: number;
    quantity: number;
  }>;
  amounts: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  status: string;
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  fulfilledAt?: string;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${params.id}`);
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
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`Change order status to ${newStatus}?`)) return;
    
    try {
      setUpdating(true);
      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: params.id, status: newStatus }),
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
        body: JSON.stringify({
          orderId: params.id,
          trackingNumber,
          carrier,
          notes,
        }),
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
        body: JSON.stringify({ orderId: params.id, emailType }),
      });

      if (!response.ok) throw new Error("Failed to send email");
      
      alert("Email sent successfully!");
    } catch (err) {
      console.error("Error sending email:", err);
      alert("Failed to send email");
    }
  };

  const printInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Link href="/admin/orders" className="mt-4 text-blue-600 hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={printInvoice}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              🖨️ Print
            </button>
            <Link
              href="/admin/orders"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                    <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {item.brandName} • {item.rarity}
                      </p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(item.unitPrice / 100).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        ${((item.unitPrice * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${(order.amounts.subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>${(order.amounts.shipping / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>${(order.amounts.tax / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>${(order.amounts.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
                  <div className="text-sm text-gray-600">
                    {order.shippingAddress?.name && <p>{order.shippingAddress.name}</p>}
                    {order.shippingAddress?.line1 && <p>{order.shippingAddress.line1}</p>}
                    {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
                    {order.shippingAddress?.city && (
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                        {order.shippingAddress.postalCode}
                      </p>
                    )}
                    {order.shippingAddress?.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Billing Address</h3>
                  <div className="text-sm text-gray-600">
                    {order.billingAddress?.name && <p>{order.billingAddress.name}</p>}
                    {order.billingAddress?.line1 && <p>{order.billingAddress.line1}</p>}
                    {order.billingAddress?.line2 && <p>{order.billingAddress.line2}</p>}
                    {order.billingAddress?.city && (
                      <p>
                        {order.billingAddress.city}, {order.billingAddress.state}{" "}
                        {order.billingAddress.postalCode}
                      </p>
                    )}
                    {order.billingAddress?.country && <p>{order.billingAddress.country}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm"><span className="font-medium">Email:</span> {order.email}</p>
              </div>
            </div>

            {/* Tracking */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Tracking Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Carrier</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select carrier</option>
                    <option value="USPS">USPS</option>
                    <option value="UPS">UPS</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Add internal notes..."
                  />
                </div>
                <button
                  onClick={updateTracking}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Tracking"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Order Status</h2>
              <div className="mb-4">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                  order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  order.status === "paid" ? "bg-blue-100 text-blue-800" :
                  order.status === "fulfilled" ? "bg-green-100 text-green-800" :
                  order.status === "cancelled" ? "bg-gray-100 text-gray-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2">
                {order.status === "pending" && (
                  <button
                    onClick={() => updateStatus("paid")}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Mark as Paid
                  </button>
                )}
                {order.status === "paid" && (
                  <button
                    onClick={() => updateStatus("fulfilled")}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark as Fulfilled
                  </button>
                )}
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel Order
                </button>
                <button
                  onClick={() => updateStatus("refunded")}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Refund Order
                </button>
              </div>
            </div>

            {/* Email Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Email Customer</h2>
              <div className="space-y-2">
                <button
                  onClick={() => sendEmail("confirmation")}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  📧 Send Confirmation
                </button>
                <button
                  onClick={() => sendEmail("shipping")}
                  disabled={!trackingNumber}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  📦 Send Shipping Notice
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                  <div>
                    <p className="text-sm font-medium">Order Placed</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {order.paidAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-600"></div>
                    <div>
                      <p className="text-sm font-medium">Payment Received</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.paidAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {order.fulfilledAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-600"></div>
                    <div>
                      <p className="text-sm font-medium">Order Fulfilled</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.fulfilledAt).toLocaleString()}
                      </p>
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