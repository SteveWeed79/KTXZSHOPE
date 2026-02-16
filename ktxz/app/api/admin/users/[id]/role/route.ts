import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireStepUpAuth } from "@/lib/stepUpAuth";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin(req, { limit: 10 });
  if (adminResult instanceof NextResponse) return adminResult;

  await dbConnect();

  const { id } = await params;
  const { role, confirmPassword } = await req.json();

  // Step-up auth required for role changes
  const stepUpError = await requireStepUpAuth(adminResult, confirmPassword);
  if (stepUpError) return stepUpError;

  if (role !== "admin" && role !== "customer") {
    return NextResponse.json(
      { error: "Invalid role. Must be 'admin' or 'customer'." },
      { status: 400 }
    );
  }

  // Prevent the env-based super admin from being demoted
  const targetUser = await User.findById(id).select("email role");
  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (
    targetUser.email === process.env.ADMIN_EMAIL &&
    role === "customer"
  ) {
    return NextResponse.json(
      { error: "Cannot revoke access from the primary admin." },
      { status: 403 }
    );
  }

  // Prevent admin from demoting themselves
  if (adminResult.user.id === id && role === "customer") {
    return NextResponse.json(
      { error: "You cannot revoke your own admin access." },
      { status: 403 }
    );
  }

  const previousRole = targetUser.role;

  const updated = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  ).select("name email role image createdAt");

  // Audit log
  logAdminAction({
    adminId: adminResult.user.id,
    adminEmail: adminResult.user.email,
    action: "USER_ROLE_CHANGED",
    targetType: "user",
    targetId: id,
    metadata: {
      targetEmail: targetUser.email,
      previousRole,
      newRole: role,
    },
    req,
  });

  return NextResponse.json({ user: updated });
}
