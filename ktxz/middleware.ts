import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// We do NOT import from "@/auth" here. 
// We create a "light" version of the auth helper that only knows the routes.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};