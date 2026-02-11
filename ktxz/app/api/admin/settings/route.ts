import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

export async function GET() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  await dbConnect();
  const settings = await Settings.getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  await dbConnect();
  const body = await req.json();

  const allowedFields = [
    "storeName",
    "supportEmail",
    "returnPolicy",
    "termsOfService",
    "isVaultLive",
    "dropCountdown",
    "maintenanceMode",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      update[key] = body[key];
    }
  }

  const settings = await Settings.findByIdAndUpdate(
    "global",
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

  return NextResponse.json({ settings });
}
