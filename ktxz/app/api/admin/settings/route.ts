import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";

export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    ((session.user as { role?: string })?.role !== "admin" &&
      session.user.email !== "steveweed1979@gmail.com")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const settings = await Settings.getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (
    !session?.user ||
    ((session.user as { role?: string })?.role !== "admin" &&
      session.user.email !== "steveweed1979@gmail.com")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
