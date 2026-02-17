/**
 * ============================================================================
 * FILE: app/api/admin/orders/send-email/route.ts
 * STATUS: MODIFIED (Replace existing file)
 * ============================================================================
 * 
 * POST /api/admin/orders/send-email
 * Sends order-related emails using Resend
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { generateOrderConfirmationEmail } from "@/lib/emails/orderConfirmation";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";
import { errorResponse } from "@/lib/apiResponse";
import { getResend, EMAIL_FROM, EMAIL_FROM_NAME, SITE_URL } from "@/lib/emailConfig";

export async function POST(req: NextRequest) {
  try {
    const adminResult = await requireAdmin(req, { limit: 10 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

    const body = await req.json();
    const { orderId, emailType } = body;

    // Validate inputs
    if (!orderId || !emailType) {
      return NextResponse.json(
        { error: "Order ID and email type are required" },
        { status: 400 }
      );
    }

    if (!["confirmation", "shipping"].includes(emailType)) {
      return NextResponse.json(
        { error: "Invalid email type. Must be 'confirmation' or 'shipping'" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch order with populated card data
    const order = await Order.findById(orderId)
      .populate({
        path: "items.card",
        select: "name image",
      })
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate tracking number for shipping emails
    if (emailType === "shipping") {
      if (!(order as Record<string, unknown>).trackingNumber) {
        return NextResponse.json(
          { error: "Cannot send shipping email without tracking number" },
          { status: 400 }
        );
      }
    }

    // Generate email content based on type
    let emailSubject = "";
    let emailContent = { html: "", text: "" };

    const orderObj = order as Record<string, unknown>;
    const orderNumber = orderObj.orderNumber || orderId;
    const orderData = { ...orderObj, orderNumber } as Parameters<typeof generateOrderConfirmationEmail>[0];

    if (emailType === "confirmation") {
      emailSubject = `Order Confirmation #${orderNumber} - KTXZ`;
      emailContent = generateOrderConfirmationEmail(orderData, SITE_URL);
    } else if (emailType === "shipping") {
      emailSubject = `Your Order Has Shipped #${orderNumber} - KTXZ`;
      emailContent = generateShippingNotificationEmail(orderData as unknown as Parameters<typeof generateShippingNotificationEmail>[0], SITE_URL);
    }

    // Send email via Resend
    const emailResult = await getResend().emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: orderObj.email as string,
      subject: emailSubject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Check for errors
    if (!emailResult.data) {
      console.error("Resend error:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email", code: "EMAIL_SEND_FAILED" },
        { status: 500 }
      );
    }

    console.log(`✅ ${emailType} email sent:`, emailResult.data.id);

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "ORDER_EMAIL_SENT",
      targetType: "order",
      targetId: orderId,
      metadata: {
        orderNumber,
        emailType,
        recipientEmail: orderObj.email,
        emailId: emailResult.data.id,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `${emailType} email sent successfully`,
      emailId: emailResult.data.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}