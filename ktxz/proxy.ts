/**
 * ============================================================================
 * FILE: ktxz/proxy.ts
 * STATUS: MODIFIED (Replace existing file)
 * ============================================================================
 *
 * Fix: getToken() from next-auth/jwt cannot read the NextAuth v5 session cookie.
 * On HTTPS (Vercel) v5 names it __Secure-authjs.session-token — getToken() looks
 * for the old v4 name and always returns null, causing every protected route to
 * redirect to login even when the user is authenticated.
 *
 * Fix: use NextAuth(authConfig) directly in the proxy — the Auth.js v5 recommended
 * pattern. authConfig has no DB/bcrypt imports so it's safe for the Edge runtime.
 * req.auth is populated correctly in all environments.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

// Lightweight NextAuth instance — authConfig only, no DB deps, Edge-safe.
const { auth } = NextAuth(authConfig);

export const proxy = auth(function middleware(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isProfileRoute = pathname.startsWith("/profile");

  if (!isAdminRoute && !isProfileRoute) return NextResponse.next();

  const session = req.auth;

  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isProfileRoute) return NextResponse.next();

  // /admin/* — check role or ADMIN_EMAIL
  const user = session.user as { email?: string | null; role?: string };
  const isAdmin =
    user.role === "admin" ||
    (!!user.email && user.email === process.env.ADMIN_EMAIL);

  if (!isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};