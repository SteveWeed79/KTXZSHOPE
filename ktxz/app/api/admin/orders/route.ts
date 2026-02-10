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
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

export async function GET(_req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userRole = (session.user as { role?: string })?.role;
    const isAdmin = userRole === "admin" || userEmail === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const orders = await Order.find({})
      .populate({
        path: "items.card",
        select: "name image",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Generate order numbers if missing
    const ordersWithNumbers = orders.map((order: Record<string, unknown>) => ({
      ...order,
      orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
    }));

    return NextResponse.json({
      success: true,
      orders: ordersWithNumbers,
      count: ordersWithNumbers.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}