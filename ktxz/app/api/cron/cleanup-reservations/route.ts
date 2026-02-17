/**
 * GET /api/cron/cleanup-reservations
 *
 * Finds expired active reservations, restores their reserved stock,
 * then marks them as "expired". Call via Vercel Cron, external cron
 * service, or manually.
 *
 * Protected by CRON_SECRET env var to prevent unauthorized access.
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Reservation from "@/models/Reservation";

export const runtime = "nodejs";

/**
 * Restore stock that was atomically decremented at checkout time.
 * Must run BEFORE marking the reservation as expired, otherwise a
 * concurrent webhook would see status:"expired" and skip restoration.
 */
async function restoreReservedStock(reservation: {
  items?: Array<{ card: { toString(): string }; quantity?: number }>;
}) {
  if (!reservation?.items) return;

  for (const item of reservation.items) {
    const cardId = item.card.toString();
    const qty = item.quantity || 1;

    // Single items: reserved → active
    const singleResult = await Card.findOneAndUpdate(
      { _id: cardId, inventoryType: "single", status: "reserved" },
      { $set: { status: "active", isActive: true }, $inc: { stock: 1 } }
    );
    if (singleResult) continue;

    // Bulk items: restore stock
    await Card.findOneAndUpdate(
      { _id: cardId, inventoryType: "bulk" },
      { $inc: { stock: qty }, $set: { status: "active", isActive: true } }
    );
  }
}

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

  // Find all active reservations past their expiry (don't mark expired yet)
  const expired = await Reservation.find({
    status: "active",
    expiresAt: { $lte: now },
  });

  let cleaned = 0;

  for (const reservation of expired) {
    try {
      // Restore stock FIRST, while status is still "active"
      await restoreReservedStock(reservation);

      // Now mark as expired
      await Reservation.updateOne(
        { _id: reservation._id, status: "active" },
        { $set: { status: "expired" } }
      );

      cleaned++;
    } catch (err) {
      console.error(`Failed to clean up reservation ${reservation._id}:`, err);
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired reservation(s) and restored stock`);
  }

  return NextResponse.json({
    success: true,
    cleaned,
    timestamp: now.toISOString(),
  });
}
