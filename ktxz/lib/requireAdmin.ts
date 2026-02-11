import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

  const userRole = (session.user as { role?: string })?.role;
  const isAdmin =
    userRole === "admin" || session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}
