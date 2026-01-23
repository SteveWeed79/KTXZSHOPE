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

      const isAdminPage = nextUrl.pathname.startsWith("/admin");
      const isProfilePage = nextUrl.pathname.startsWith("/profile");

      // LOGIC: Check both the role AND the hardcoded email as a backup
      const isAdmin = userEmail === "steveweed1979@gmail.com" || userRole === "admin";

      if (isAdminPage) {
        if (isLoggedIn && isAdmin) return true;
        // This is where it's failing you: if this returns false, it redirects
        return false; 
      }

      if (isProfilePage) {
        return isLoggedIn;
      }

      return true;
    },
  },
  providers: [], 
} satisfies NextAuthConfig;