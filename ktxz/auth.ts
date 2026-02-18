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
     *
     * DB hydration strategy (avoids a MongoDB query on every request):
     *   - Always hydrate on login events (user or account present).
     *   - On subsequent requests, re-hydrate only when roleHydratedAt is
     *     older than ROLE_TTL_MS (5 min), so role changes propagate quickly
     *     without a round-trip to MongoDB on every authenticated request.
     */
    async jwt({ token, user, account }) {
      const ROLE_TTL_MS = 5 * 60 * 1000; // 5 minutes

      const email = normalizeEmail(user?.email ?? token.email);
      if (email) token.email = email;

      // Track whether we already hit the DB in this callback invocation so
      // we don't issue a second query for OAuth logins.
      let hydratedThisCall = false;

      // On OAuth login: find-or-create the user record in MongoDB.
      if (account?.provider === "google" && email) {
        try {
          const dbUser = await findOrCreateOAuthUser({
            email,
            name: user?.name ?? null,
            image: ((user as Record<string, unknown>)?.image as string | null) ?? null,
          });

          token.id = dbUser._id.toString();
          token.role = dbUser.role === "admin" ? "admin" : "customer";
          token.roleHydratedAt = Date.now();
          hydratedThisCall = true;
        } catch (err) {
          console.error("OAuth DB hydrate error:", err);
          token.role = "customer";
        }
      }

      // For credentials logins and periodic TTL re-checks: hydrate role + id
      // from MongoDB. Skipped when the OAuth block already ran this invocation.
      const isLoginEvent = !!(user || account);
      const isStale =
        !token.roleHydratedAt ||
        Date.now() - token.roleHydratedAt > ROLE_TTL_MS;

      if (email && !hydratedThisCall && (isLoginEvent || isStale)) {
        try {
          const dbUser = await findUserByEmail(email);
          if (dbUser?._id) token.id = dbUser._id.toString();
          token.role = dbUser?.role === "admin" ? "admin" : "customer";
          token.roleHydratedAt = Date.now();
        } catch (err) {
          console.error("DB hydrate error:", err);
          if (token.role !== "admin" && token.role !== "customer") token.role = "customer";
        }
      }

      // Merge cookie cart into user cart ONCE per login event.
      if (user && typeof token.id === "string" && token.id.length > 0) {
        try {
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
