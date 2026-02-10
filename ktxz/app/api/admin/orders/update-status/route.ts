/**
 * ============================================================================
 * FILE: app/api/admin/orders/update-status/route.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * POST /api/admin/orders/update-status
 * Updates an order's status with admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Card from "@/models/Card";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "KTXZ SHOP";
const SITE_URL = process.env.NEXTAUTH_URL || process.env.SITE_URL || "http://localhost:3000";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

// Statuses where inventory was deducted (paid or fulfilled orders)
const INVENTORY_DEDUCTED_STATUSES = ["paid", "fulfilled"];

async function restoreInventory(orderItems: Array<{ card: string; quantity: number }>) {
  for (const item of orderItems) {
    const card = await Card.findById(item.card);
    if (!card) continue;

    const inventoryType = card.inventoryType || "single";

    if (inventoryType === "bulk") {
      card.stock = (card.stock || 0) + item.quantity;
      if (card.status === "sold") {
        card.status = "active";
        card.isActive = true;
      }
    } else {
      // single item — restore to available
      card.stock = 1;
      card.status = "active";
      card.isActive = true;
    }

    await card.save();
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userRole = (session.user as { role?: string })?.role;
    const isAdmin = userRole === "admin" || userEmail === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Order ID and status are required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    await dbConnect();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const previousStatus = order.status;
    order.status = status;

    const now = new Date();
    switch (status) {
      case "paid":
        if (!order.paidAt) order.paidAt = now;
        break;
      case "fulfilled":
        if (!order.fulfilledAt) order.fulfilledAt = now;
        if (!order.paidAt) order.paidAt = now;
        break;
      case "cancelled":
        if (!order.cancelledAt) order.cancelledAt = now;
        break;
      case "refunded":
        if (!order.refundedAt) order.refundedAt = now;
        break;
    }

    await order.save();

    // Restore inventory when cancelling/refunding a paid or fulfilled order
    let inventoryRestored = false;
    if (
      (status === "cancelled" || status === "refunded") &&
      INVENTORY_DEDUCTED_STATUSES.includes(previousStatus)
    ) {
      try {
        await restoreInventory(order.items);
        inventoryRestored = true;
        console.log(`✅ Inventory restored for order ${order.orderNumber || orderId}`);
      } catch (invErr) {
        console.error("Failed to restore inventory:", invErr);
      }
    }

    // Auto-send shipping notification when fulfilled with tracking info
    let emailSent = false;
    if (status === "fulfilled" && order.trackingNumber && order.carrier) {
      try {
        const orderData = order.toObject();
        const orderNumber = orderData.orderNumber || orderId;
        const emailContent = generateShippingNotificationEmail(
          { ...orderData, orderNumber },
          SITE_URL
        );

        const result = await resend.emails.send({
          from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
          to: order.email,
          subject: `Your Order Has Shipped #${orderNumber} - KTXZ`,
          html: emailContent.html,
          text: emailContent.text,
        });

        emailSent = !!result.data;
        if (result.data) {
          console.log(`✅ Shipping email auto-sent to ${order.email}:`, result.data.id);
        }
      } catch (emailErr) {
        console.error("Failed to auto-send shipping email:", emailErr);
      }
    }

    let message = "Order status updated successfully";
    if (emailSent) message = "Order fulfilled and shipping notification sent";
    if (inventoryRestored) message += ". Inventory restored.";

    return NextResponse.json({
      success: true,
      message,
      order,
      emailSent,
      inventoryRestored,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}