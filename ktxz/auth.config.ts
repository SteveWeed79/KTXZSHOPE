// ktxz/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as any)?.role;
      const userEmail = auth?.user?.email;

      const pathname = nextUrl.pathname;

      const isAdminPage = pathname.startsWith("/admin");
      const isProfilePage = pathname.startsWith("/profile");

      // Admin if DB role is admin OR email matches env ADMIN_EMAIL
      const isAdmin =
        userRole === "admin" ||
        (!!userEmail && userEmail === process.env.ADMIN_EMAIL);

      if (isAdminPage) return isLoggedIn && isAdmin;
      if (isProfilePage) return isLoggedIn;

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
