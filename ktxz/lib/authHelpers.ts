/**
 * ============================================================================
 * FILE: lib/authHelpers.ts
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Authentication Helper Functions
 * Reusable auth checks for API routes
 */

import { auth } from "@/auth";

/**
 * Check if user is admin
 */
export function isAdmin(user: any): boolean {
  if (!user) return false;
  
  const userRole = user.role;
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  return userRole === "admin" || (userEmail && userEmail === adminEmail);
}

/**
 * Get current session and verify admin access
 * Returns user object if admin, null otherwise
 */
export async function requireAdmin() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return null;
    }
    
    if (!isAdmin(session.user)) {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

/**
 * Get current session user (any authenticated user)
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