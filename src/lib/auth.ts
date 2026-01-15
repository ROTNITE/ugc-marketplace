import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validators";
import { getServerSession } from "next-auth/next";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        const authUser: User = {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as User;
        token.uid = authUser.id;
        token.role = authUser.role;
      }
      const userId = token.uid ?? token.sub;
      if (userId && (token.brandProfileId === undefined || token.creatorProfileId === undefined)) {
        const [brandProfile, creatorProfile] = await prisma.$transaction([
          prisma.brandProfile.findUnique({
            where: { userId },
            select: { id: true },
          }),
          prisma.creatorProfile.findUnique({
            where: { userId },
            select: { id: true },
          }),
        ]);
        token.brandProfileId = brandProfile?.id ?? null;
        token.creatorProfileId = creatorProfile?.id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.uid) session.user.id = token.uid;
        if (token.role) session.user.role = token.role;
        session.user.brandProfileId = token.brandProfileId ?? null;
        session.user.creatorProfileId = token.creatorProfileId ?? null;
      }
      return session;
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
