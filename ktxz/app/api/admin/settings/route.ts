import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import Settings from "@/models/Settings";
import { errorResponse } from "@/lib/apiResponse";

export async function GET() {
  try {
    const adminResult = await requireAdmin();
    if (adminResult instanceof NextResponse) return adminResult;

    await dbConnect();
    const settings = await Settings.getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: Request) {
  try {
    const adminResult = await requireAdmin(req, { limit: 10 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

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
      "taxEnabled",
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

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "SETTINGS_UPDATED",
      targetType: "settings",
      targetId: "global",
      metadata: { fieldsUpdated: Object.keys(update) },
      req,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
