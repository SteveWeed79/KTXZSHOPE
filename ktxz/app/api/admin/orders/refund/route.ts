/**
 * POST /api/admin/orders/refund
 *
 * Process a Stripe refund for an order.
 * - Full refund by default
 * - Optional partial refund via `amount` param (in dollars)
 * - Updates order status to "refunded"
 * - Restores inventory for cancelled stock
 * - Requires step-up authentication (password re-confirmation)
 * - Rate limited: 10 req/min
 * - Audit logged
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireStepUpAuth } from "@/lib/stepUpAuth";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { errorResponse } from "@/lib/apiResponse";
import { mustGetStripe, toCents } from "@/lib/stripe";
import { restoreInventory } from "@/lib/inventory";

export async function POST(req: NextRequest) {
  try {
    const adminResult = await requireAdmin(req, { limit: 10 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

    const body = await req.json();
    const { orderId, amount, reason, confirmPassword } = body;

    // Step-up auth required for refunds
    const stepUpError = await requireStepUpAuth(session, confirmPassword);
    if (stepUpError) return stepUpError;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    await dbConnect();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "refunded") {
      return NextResponse.json({ error: "Order is already refunded" }, { status: 400 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Cannot refund a cancelled order" }, { status: 400 });
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No Stripe payment intent found for this order. Refund must be done manually in Stripe dashboard." },
        { status: 400 }
      );
    }

    const stripe = mustGetStripe();

    // Build refund params
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripePaymentIntentId,
    };

    // Partial refund: amount in dollars, convert to cents
    if (amount && typeof amount === "number" && amount > 0) {
      const amountCents = toCents(amount);
      const totalCents = toCents(order.amounts?.total || 0);

      if (amountCents > totalCents) {
        return NextResponse.json(
          { error: `Refund amount ($${amount}) exceeds order total ($${order.amounts?.total})` },
          { status: 400 }
        );
      }

      refundParams.amount = amountCents;
    }

    if (reason) {
      const validReasons: Stripe.RefundCreateParams.Reason[] = [
        "duplicate",
        "fraudulent",
        "requested_by_customer",
      ];
      if (validReasons.includes(reason)) {
        refundParams.reason = reason;
      }
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create(refundParams);

    // Determine if full or partial refund
    const isFullRefund = !amount || toCents(amount) >= toCents(order.amounts?.total || 0);

    // Update order
    const previousStatus = order.status;
    order.status = "refunded";
    order.refundedAt = new Date();
    order.notes = `${order.notes || ""}\nRefund processed: ${refund.id} (${isFullRefund ? "full" : `partial: $${amount}`}) — ${new Date().toISOString()}`.trim();
    await order.save();

    // Restore inventory on full refund
    let inventoryRestored = false;
    if (isFullRefund) {
      try {
        await restoreInventory(order.items);
        inventoryRestored = true;
      } catch (err) {
        console.error("Failed to restore inventory after refund:", err);
      }
    }

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "ORDER_REFUND",
      targetType: "order",
      targetId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        previousStatus,
        refundId: refund.id,
        isFullRefund,
        amount: amount || order.amounts?.total,
        reason: reason || "none",
        inventoryRestored,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: isFullRefund
        ? "Full refund processed successfully"
        : `Partial refund of $${amount} processed successfully`,
      refundId: refund.id,
      refundStatus: refund.status,
      inventoryRestored,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}`, code: "STRIPE_ERROR" },
        { status: 400 }
      );
    }
    return errorResponse(error);
  }
}
