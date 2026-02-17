// ktxz/auth.ts
/**
 * NextAuth config (JWT strategy) with:
 * - Credentials login (email/password from MongoDB)
 * - Google OAuth login
 * - Role + id hydration from MongoDB by email (SOURCE OF TRUTH)
 * - Merge cookie cart into user cart once per login
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { mergeCookieCartIntoUserCart } from "@/lib/cartHelpers";
import { authConfig } from "./auth.config";

type DbUser = {
  _id: { toString(): string };
  email: string;
  name?: string | null;
  image?: string | null;
  password?: string;
  role?: "admin" | "customer";
};

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.toLowerCase().trim();
  return v.length ? v : null;
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  await dbConnect();
  return (await User.findOne({ email })) as DbUser | null;
}

async function findOrCreateOAuthUser(params: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<DbUser> {
  await dbConnect();

  const existing = (await User.findOne({ email: params.email })) as DbUser | null;
  if (existing) return existing;

  // Create a baseline user for OAuth logins
  const created = (await User.create({
    email: params.email,
    name: params.name ?? undefined,
    image: params.image ?? undefined,
    role: "customer",
  })) as DbUser;

  return created;
}

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

        const email = normalizeEmail(credentials?.email);
        const password = typeof credentials?.password === "string" ? credentials.password : null;
        if (!email || !password) return null;

        const userDoc = (await User.findOne({ email }).select("+password")) as DbUser | null;
        if (!userDoc?.password) return null;

        const ok = await bcrypt.compare(password, userDoc.password);
        if (!ok) return null;

        return {
          id: userDoc._id.toString(),
          email: userDoc.email,
          name: userDoc.name ?? undefined,
          role: userDoc.role ?? "customer",
        } as Record<string, unknown>;
      },
    }),
  ],

  callbacks: {
    /**
     * JWT is the source of truth for proxy authorization.
     * We ensure token.id + token.role ALWAYS come from MongoDB by email.
     */
    async jwt({ token, user, account }) {
      const email = normalizeEmail(user?.email ?? token.email);

      if (email) token.email = email;

      // On first login, ensure an OAuth user exists in DB.
      if (account?.provider === "google" && email) {
        try {
          const dbUser = await findOrCreateOAuthUser({
            email,
            name: user?.name ?? null,
            image: ((user as Record<string, unknown>)?.image as string | null) ?? null,
          });

          token.id = dbUser._id.toString();
          token.role = dbUser.role === "admin" ? "admin" : "customer";
        } catch (err) {
          console.error("OAuth DB hydrate error:", err);
          token.role = "customer";
        }
      }

      // For credentials login, user.id/role will exist, but we still re-hydrate from DB
      // to guarantee consistency (and to catch role changes).
      if (email) {
        try {
          const dbUser = await findUserByEmail(email);
          if (dbUser?._id) token.id = dbUser._id.toString();
          token.role = dbUser?.role === "admin" ? "admin" : "customer";
        } catch (err) {
          console.error("DB hydrate error:", err);
          // keep existing token.role if present
          if (token.role !== "admin" && token.role !== "customer") token.role = "customer";
        }
      }

      // Merge cookie cart into user cart ONCE per login event.
      // We treat "user present" as a login event.
      if (user && typeof token.id === "string" && token.id.length > 0) {
        try {
          // avoid repeat work if NextAuth calls jwt multiple times in a single flow
          if (!(token as Record<string, unknown>).cartMerged) {
            await mergeCookieCartIntoUserCart(token.id);
            (token as Record<string, unknown>).cartMerged = true;
          }
        } catch (err) {
          console.error("Cart merge error on login:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id = typeof token.id === "string" ? token.id : undefined;
        (session.user as unknown as Record<string, unknown>).role = typeof token.role === "string" ? token.role : undefined;
        // keep email as NextAuth already does
      }
      return session;
    },
  },
});
