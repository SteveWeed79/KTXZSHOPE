// ktxz/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { isAdminUser } from "@/lib/isAdmin";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isAdminPage = pathname.startsWith("/admin");
      const isProfilePage = pathname.startsWith("/profile");

      if (isAdminPage) return isLoggedIn && isAdminUser(auth?.user as { email?: string; role?: string });
      if (isProfilePage) return isLoggedIn;

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
