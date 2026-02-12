/**
 * ============================================================================
 * FILE: ktxz/auth.ts
 * STATUS: MODIFIED (Cart merging on login)
 * ============================================================================
 * 
 * Authentication configuration with cart merging
 * - When user logs in, merge cookie cart into database cart
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { mergeCookieCartIntoUserCart } from "@/lib/cartHelpers";
import { isAdminUser } from "@/lib/isAdmin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        await dbConnect();
        const email = (credentials?.email as string)?.toLowerCase().trim();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await User.findOne({ email }).select("+password");
        if (!user || !user.password) return null;

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "customer",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = isAdminUser(user as { email?: string; role?: string }) ? "admin" : "customer";

        // IMPORTANT: Merge cookie cart into user cart on login
        // This happens once per login session
        try {
          if (user.id) {
            await mergeCookieCartIntoUserCart(user.id);
          }
        } catch (err) {
          console.error("Cart merge error on login:", err);
          // Don't block login if cart merge fails
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});