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
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult instanceof NextResponse) return adminResult;

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
    return errorResponse(error);
  }
}