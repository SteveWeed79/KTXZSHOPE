import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { AdminSession } from "@/lib/requireAdmin";

/**
 * Step-up authentication for dangerous admin operations.
 *
 * Requires the admin to re-confirm their password before performing
 * high-risk actions like refunds, role changes, and deletions.
 *
 * For OAuth-only admins (Google sign-in, no password), step-up auth
 * is bypassed — these accounts rely on the OAuth provider's own MFA.
 *
 * Returns null on success, or a NextResponse error on failure.
 */
export async function requireStepUpAuth(
  session: AdminSession,
  confirmPassword: unknown
): Promise<NextResponse | null> {
  if (!confirmPassword || typeof confirmPassword !== "string") {
    return NextResponse.json(
      {
        error: "This action requires re-authentication. Please provide your password.",
        code: "STEP_UP_REQUIRED",
      },
      { status: 403 }
    );
  }

  await dbConnect();

  // Fetch the user with their password hash (normally hidden via select: false)
  const user = await User.findById(session.user.id).select("+password");
  if (!user) {
    return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
  }

  // OAuth-only users have no password — skip step-up (they rely on provider MFA)
  if (!user.password) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(confirmPassword, user.password);
  if (!passwordMatch) {
    return NextResponse.json(
      {
        error: "Incorrect password. Step-up authentication failed.",
        code: "STEP_UP_FAILED",
      },
      { status: 403 }
    );
  }

  return null;
}
