import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

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
        console.log("--- AUTH START ---");
        if (!credentials?.email || !credentials?.password) {
          console.log("DEBUG: Missing email or password in form");
          return null;
        }

        await dbConnect();
        console.log("DEBUG: Database Connected");

        const email = (credentials.email as string).toLowerCase().trim();
        
        // FIX: Added .select("+password") because the schema hides it by default
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
          console.log(`DEBUG: User NOT found for email: ${email}`);
          return null;
        }
        console.log("DEBUG: User found in DB");

        if (!user.password) {
          console.log("DEBUG: User has no password (Google user?)");
          return null;
        }

        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isMatch) {
          console.log("DEBUG: Password MISMATCH");
          return null;
        }

        console.log("DEBUG: Authentication SUCCESSFUL");
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Ensure admin override for your specific email
        token.role = user.email === "steveweed1979@gmail.com" ? "admin" : (user as any).role;
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