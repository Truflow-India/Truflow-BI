import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { zohoDb } from "@/lib/database/zoho-db";
import { visitDb } from "@/lib/database/visit-db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "truflow-bi-dashboard-secret-key-2026-super-secure",
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        try {
          // 1. Primary: check in zohoDb.user
          const user = await zohoDb.user.findFirst({
            where: {
              email: { equals: email, mode: "insensitive" },
              status: "ACTIVE",
            },
          });

          if (user && user.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              };
            }
          }

          // 2. Fallback: check in visitDb.user
          const visitUser = await visitDb.user.findFirst({
            where: {
              email: { equals: email, mode: "insensitive" },
              status: "ACTIVE",
            },
          });

          if (visitUser && visitUser.password) {
            const isValid = await bcrypt.compare(password, visitUser.password);
            if (isValid) {
              return {
                id: visitUser.id,
                name: visitUser.name,
                email: visitUser.email,
                role: visitUser.role,
              };
            }
          }

          return null;
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || token.sub || "";
        (session.user as any).role = token.role || "ADMIN";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
});
