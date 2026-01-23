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
      
      // Determine if the current user has admin rights [cite: 54, 55]
      const isAdmin = 
        userRole === "admin" || 
        (userEmail && userEmail === process.env.ADMIN_EMAIL);

      if (isAdminPage) {
        return isLoggedIn && isAdmin;
      }
      return true;
    },
  },
  providers: [], 
} satisfies NextAuthConfig;