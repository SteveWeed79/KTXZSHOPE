/**
 * ============================================================================
 * FILE: app/api/admin/orders/update-tracking/route.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * POST /api/admin/orders/update-tracking
 * Updates order tracking information with admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { errorResponse } from "@/lib/apiResponse";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";
import { getResend, EMAIL_FROM, EMAIL_FROM_NAME, SITE_URL } from "@/lib/emailConfig";

const VALID_CARRIERS = ["USPS", "UPS", "FedEx", "DHL"];

export async function POST(req: NextRequest) {
  try {
    const adminResult = await requireAdmin(req, { limit: 20 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

    const body = await req.json();
    const { orderId, trackingNumber, carrier, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Validate carrier
    if (carrier && !VALID_CARRIERS.includes(carrier)) {
      return NextResponse.json(
        { error: `Invalid carrier. Must be one of: ${VALID_CARRIERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate tracking number format (alphanumeric, spaces, dashes; max 50 chars)
    if (trackingNumber && (trackingNumber.length > 50 || !/^[a-zA-Z0-9\-\s]+$/.test(trackingNumber))) {
      return NextResponse.json(
        { error: "Invalid tracking number format" },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    order.trackingNumber = trackingNumber || "";
    order.carrier = carrier || "";
    order.notes = notes || "";

    await order.save();

    // Auto-send shipping notification if the order is already fulfilled, tracking
    // info was just provided, and the email hasn't been sent before.
    // shippingEmailSentAt is the idempotency guard — once set, no re-send.
    let emailSent = false;
    if (
      order.status === "fulfilled" &&
      order.trackingNumber &&
      order.carrier &&
      !order.shippingEmailSentAt
    ) {
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
          console.log(`✅ Shipping email sent to ${order.email}:`, result.data.id);
          await Order.updateOne({ _id: order._id }, { $set: { shippingEmailSentAt: new Date() } });
        }
      } catch (emailErr) {
        console.error("Failed to send shipping email after tracking update:", emailErr);
      }
    }

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "ORDER_TRACKING_UPDATE",
      targetType: "order",
      targetId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        trackingNumber: trackingNumber || "",
        carrier: carrier || "",
        emailSent,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Tracking updated and shipping notification sent"
        : "Tracking information updated successfully",
      order,
      emailSent,
    });
  } catch (error) {
    return errorResponse(error);
  }
}