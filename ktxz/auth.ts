import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials"; // Import Credentials
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // 1. Google Provider
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    // 2. Credentials Provider (The Manual Login)
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();

        // Find user and explicitly include password since it's likely hidden by default in schema
        const user = await User.findOne({ email: credentials?.email }).select("+password");

        if (!user || !user.password) {
          throw new Error("No user found with this email.");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new Error("Incorrect password.");
        }

        // Return user object to be encrypted in the JWT
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role, // We pass the role so we can use it in the session
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // If this is the first time the user logs in, add the role to the token
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the role from the token to the session so the frontend can see it
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt", // Credentials requires JWT strategy
  },
});