import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/isAdmin";

/**
 * Shared admin authorization check for API routes.
 *
 * Returns the session if the user is an admin, or a NextResponse error.
 * Usage in API routes:
 *
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   const session = result;
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(session.user as { email?: string; role?: string })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}
