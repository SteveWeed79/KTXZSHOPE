/**
 * ============================================================================
 * FILE: middleware.ts
 * STATUS: MODIFIED (Replace existing file)
 * ============================================================================
 * 
 * Enhanced Middleware with Admin Protection
 * Protects /admin/* routes (requires admin role)
 * Protects /profile/* routes (requires authentication)
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
  ],
};