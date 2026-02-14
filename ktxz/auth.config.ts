// ktxz/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Do NOT gate here. Middleware handles /admin and /profile.
    authorized() {
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
