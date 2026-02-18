/**
 * ============================================================================
 * FILE: app/api/admin/orders/[id]/label/route.ts
 * ============================================================================
 *
 * Shippo shipping label endpoints for a specific order.
 *
 * GET  /api/admin/orders/[id]/label?weightLb=1
 *   Returns available shipping rates from Shippo for this order's destination.
 *   Query params:
 *     weightLb  — Package weight in pounds (default: 1, max: 150)
 *
 * POST /api/admin/orders/[id]/label
 *   Purchases the selected Shippo rate, saves the label URL + tracking number
 *   to the order, and fires the shipping notification email if the order is
 *   already in "fulfilled" status and the email hasn't been sent yet.
 *   Body: { rateObjectId: string }
 *
 * Requires: SHIPPO_API_KEY + SHIPPO_FROM_* environment variables.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { errorResponse } from "@/lib/apiResponse";
import { createShipment, purchaseRate } from "@/lib/shippo";
import { getResend, EMAIL_FROM, EMAIL_FROM_NAME, SITE_URL } from "@/lib/emailConfig";
import { generateShippingNotificationEmail } from "@/lib/emails/shippingNotification";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET — fetch available shipping rates for the order's destination
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const adminResult = await requireAdmin(req, { limit: 30, limiter: "generous" });
    if (adminResult instanceof NextResponse) return adminResult;

    const { id } = await params;

    await dbConnect();

    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.shippingAddress?.line1) {
      return NextResponse.json(
        { error: "Order has no shipping address — cannot generate rates" },
        { status: 422 }
      );
    }

    const weightLbParam = req.nextUrl.searchParams.get("weightLb");
    const weightLb = weightLbParam ? parseFloat(weightLbParam) : 1;

    if (isNaN(weightLb) || weightLb <= 0 || weightLb > 150) {
      return NextResponse.json(
        { error: "weightLb must be a number between 0 and 150" },
        { status: 400 }
      );
    }

    const { shipmentObjectId, rates } = await createShipment(
      order.shippingAddress,
      weightLb
    );

    return NextResponse.json({ shipmentObjectId, rates, weightLb });
  } catch (error) {
    return errorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST — purchase a rate and save the label to the order
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const adminResult = await requireAdmin(req, { limit: 20 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

    const { id } = await params;

    const body = await req.json();
    const { rateObjectId } = body as { rateObjectId?: unknown };

    if (!rateObjectId || typeof rateObjectId !== "string") {
      return NextResponse.json(
        { error: "rateObjectId (string) is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Idempotency: do not purchase a second label if one already exists.
    if (order.labelUrl) {
      return NextResponse.json(
        {
          error: "A shipping label has already been purchased for this order",
          labelUrl: order.labelUrl,
          trackingNumber: order.trackingNumber,
        },
        { status: 409 }
      );
    }

    // Purchase the label via Shippo
    const transaction = await purchaseRate(rateObjectId);

    // Persist label + tracking info to the order
    order.trackingNumber = transaction.trackingNumber;
    order.carrier = transaction.carrier;
    order.shippoTransactionId = transaction.objectId;
    order.labelUrl = transaction.labelUrl;
    await order.save();

    // Auto-send shipping notification email if the order is fulfilled and
    // the email hasn't been sent yet. Mirrors the logic in update-tracking.
    let emailSent = false;
    if (order.status === "fulfilled" && !order.shippingEmailSentAt) {
      try {
        const orderData = order.toObject();
        const orderNumber = orderData.orderNumber || id;
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
          await Order.updateOne(
            { _id: order._id },
            { $set: { shippingEmailSentAt: new Date() } }
          );
        }
      } catch (emailErr) {
        console.error("Failed to send shipping email after label purchase:", emailErr);
      }
    }

    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "SHIPPING_LABEL_PURCHASED",
      targetType: "order",
      targetId: id,
      metadata: {
        orderNumber: order.orderNumber,
        trackingNumber: transaction.trackingNumber,
        carrier: transaction.carrier,
        labelUrl: transaction.labelUrl,
        transactionId: transaction.objectId,
        emailSent,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      trackingNumber: transaction.trackingNumber,
      carrier: transaction.carrier,
      labelUrl: transaction.labelUrl,
      trackingUrlProvider: transaction.trackingUrlProvider,
      emailSent,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
