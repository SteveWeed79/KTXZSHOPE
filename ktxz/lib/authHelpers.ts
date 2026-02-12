/**
 * ============================================================================
 * FILE: lib/authHelpers.ts
 * ============================================================================
 *
 * Authentication Helper Functions
 *
 * NOTE: For API route admin checks, use lib/requireAdmin.ts (returns NextResponse).
 * This file provides lightweight helpers for non-API contexts.
 */

import { auth } from "@/auth";

/**
 * Check if user object has admin privileges.
 */
export function isAdmin(user: any): boolean {
  if (!user) return false;

  const userRole = user.role;
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;

  return userRole === "admin" || (!!userEmail && userEmail === adminEmail);
}

/**
 * Get current session user (any authenticated user).
 * Returns null if not authenticated.
 */
export async function requireAuth() {
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}