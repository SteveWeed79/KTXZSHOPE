import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminPage = nextUrl.pathname.startsWith("/admin");
      const adminEmail = process.env.ADMIN_EMAIL;

      if (isAdminPage) {
        if (isLoggedIn && auth?.user?.email === adminEmail) {
          return true;
        }
        // Redirect non-admins or logged-out users to home or login
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;