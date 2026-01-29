// ktxz/middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Do NOT import from "@/auth" here (Edge runtime).
// Use the lightweight config-only helper.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

// Next.js Middleware route matcher (must be named `config`)
export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
