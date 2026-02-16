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
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";
import { errorResponse } from "@/lib/apiResponse";
import { restoreInventory } from "@/lib/inventory";
import { getResend, EMAIL_FROM, EMAIL_FROM_NAME, SITE_URL } from "@/lib/emailConfig";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

// Statuses where inventory was deducted (paid or fulfilled orders)
const INVENTORY_DEDUCTED_STATUSES = ["paid", "fulfilled"];

export async function POST(req: NextRequest) {
  try {
    const adminResult = await requireAdmin(req, { limit: 20 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

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

        const result = await getResend().emails.send({
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

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "ORDER_STATUS_UPDATE",
      targetType: "order",
      targetId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus,
        newStatus: status,
        inventoryRestored,
        emailSent,
      },
      req,
    });

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
    return errorResponse(error);
  }
}