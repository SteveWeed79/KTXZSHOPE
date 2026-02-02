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
import { Resend } from "resend";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { generateOrderConfirmationEmail } from "@/lib/emails/orderConfirmation";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "KTXZ SHOP";
const SITE_URL = process.env.NEXTAUTH_URL || process.env.SITE_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === "admin" || userEmail === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      if (!(order as any).trackingNumber) {
        return NextResponse.json(
          { error: "Cannot send shipping email without tracking number" },
          { status: 400 }
        );
      }
    }

    // Generate email content based on type
    let emailSubject = "";
    let emailContent = { html: "", text: "" };

    const orderNumber = (order as any).orderNumber || orderId.toString().slice(-8).toUpperCase();
    const orderData = {
      ...order,
      orderNumber,
    } as any;

    if (emailType === "confirmation") {
      emailSubject = `Order Confirmation #${orderNumber} - KTXZ`;
      emailContent = generateOrderConfirmationEmail(orderData, SITE_URL);
    } else if (emailType === "shipping") {
      emailSubject = `Your Order Has Shipped #${orderNumber} - KTXZ`;
      emailContent = generateShippingNotificationEmail(orderData, SITE_URL);
    }

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: (order as any).email,
      subject: emailSubject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Check for errors
    if (!emailResult.data) {
      console.error("Resend error:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email", details: emailResult.error },
        { status: 500 }
      );
    }

    console.log(`✅ ${emailType} email sent:`, emailResult.data.id);

    return NextResponse.json({
      success: true,
      message: `${emailType} email sent successfully`,
      emailId: emailResult.data.id,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 }
    );
  }
}