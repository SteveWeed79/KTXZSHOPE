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
import { requireAdmin } from "@/lib/requireAdmin";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { errorResponse } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult instanceof NextResponse) return adminResult;

    const { id } = await params;

    await dbConnect();

    const order = await Order.findById(id)
      .populate({
        path: "items.card",
        select: "name image price rarity",
      })
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    return errorResponse(error);
  }
}