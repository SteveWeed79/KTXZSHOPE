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
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

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

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}