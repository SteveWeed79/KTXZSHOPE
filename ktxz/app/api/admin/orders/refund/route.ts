/**
 * POST /api/admin/orders/refund
 *
 * Process a Stripe refund for an order.
 * - Full refund by default
 * - Optional partial refund via `amount` param (in dollars)
 * - Updates order status to "refunded"
 * - Restores inventory for cancelled stock
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Card from "@/models/Card";

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
      card.stock = 1;
      card.status = "active";
      card.isActive = true;
    }

    await card.save();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    const isAdmin = userRole === "admin" || session.user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, amount, reason } = body;

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

    // Initialize Stripe
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2026-01-28.clover",
    });

    // Build refund params
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripePaymentIntentId,
    };

    // Partial refund: amount in dollars, convert to cents
    if (amount && typeof amount === "number" && amount > 0) {
      const amountCents = Math.round(amount * 100);
      const totalCents = Math.round((order.amounts?.total || 0) * 100);

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
    const isFullRefund = !amount || Math.round(amount * 100) >= Math.round((order.amounts?.total || 0) * 100);

    // Update order
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
    console.error("Error processing refund:", error);

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
