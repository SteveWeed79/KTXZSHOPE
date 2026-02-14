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
import { errorResponse } from "@/lib/apiResponse";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult instanceof NextResponse) return adminResult;

    await dbConnect();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      Order.find({})
        .populate({
          path: "items.card",
          select: "name image",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({}),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}