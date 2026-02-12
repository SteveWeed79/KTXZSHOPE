/**
 * GET /api/cron/cleanup-reservations
 *
 * Marks expired active reservations as "expired" and logs the count.
 * Call this via Vercel Cron, external cron service, or manually.
 *
 * Protected by CRON_SECRET env var to prevent unauthorized access.
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Reservation from "@/models/Reservation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Verify cron secret — always required
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const now = new Date();

  // Mark all active reservations past their expiry as expired
  const result = await Reservation.updateMany(
    { status: "active", expiresAt: { $lte: now } },
    { $set: { status: "expired" } }
  );

  const cleaned = result.modifiedCount || 0;

  if (cleaned > 0) {
    console.log(`✅ Cleaned up ${cleaned} expired reservation(s)`);
  }

  return NextResponse.json({
    success: true,
    cleaned,
    timestamp: now.toISOString(),
  });
}
