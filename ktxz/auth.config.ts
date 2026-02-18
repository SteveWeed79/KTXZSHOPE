// ktxz/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Do NOT gate here. Proxy handles /admin and /profile.
    authorized() {
      return true;
    },
    // Forward role from the JWT token into the session so that proxy.ts
    // can read req.auth.user.role without a DB round-trip on every request.
    session({ session, token }) {
      if (session.user && token.role) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
