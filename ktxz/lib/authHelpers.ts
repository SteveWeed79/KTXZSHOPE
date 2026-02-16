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
import { isAdminUser } from "@/lib/isAdmin";

/**
 * Check if user object has admin privileges.
 * Re-exports isAdminUser for backward compatibility.
 */
export const isAdmin = isAdminUser;

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
