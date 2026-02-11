/**
 * ============================================================================
 * FILE: app/api/admin/orders/route.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * GET /api/admin/orders
 * Fetches all orders from database with admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

export async function GET(_req: NextRequest) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult instanceof NextResponse) return adminResult;

    await dbConnect();

    const orders = await Order.find({})
      .populate({
        path: "items.card",
        select: "name image",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}