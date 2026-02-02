/**
 * ============================================================================
 * FILE: app/api/admin/orders/[id]/route.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * GET /api/admin/orders/[id]
 * Fetches a single order by ID with admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await dbConnect();

    const order = await Order.findById(params.id)
      .populate({
        path: "items.card",
        select: "name image price rarity",
      })
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Generate order number if missing
    const orderWithNumber = {
      ...order,
      orderNumber: (order as any).orderNumber || params.id.slice(-8).toUpperCase(),
    };

    return NextResponse.json({
      success: true,
      order: orderWithNumber,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}