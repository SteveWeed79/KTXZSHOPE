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
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

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
    const { orderId, trackingNumber, carrier, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      message: "Tracking information updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating tracking information:", error);
    return NextResponse.json(
      { error: "Failed to update tracking information" },
      { status: 500 }
    );
  }
}