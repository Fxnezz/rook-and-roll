import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      /** true when an admin is impersonating this user */
      imp?: boolean;
    } & DefaultSession["user"];
  }
}

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // IP bans are checked before anything else — a banned IP can't even
        // reach the password check, regardless of which account it targets.
        const ip = (request?.headers?.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
        if (ip && (await prisma.bannedIp.findUnique({ where: { ip } }))) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Blocked accounts cannot sign in (banned permanently, or until a date).
        const blocked =
          (user.status === "BANNED" || user.status === "SUSPENDED") &&
          (!user.bannedUntil || user.bannedUntil > new Date());
        if (blocked) return null;

        // Record the login (IP/UA) for admin review — best-effort.
        try {
          await prisma.loginEvent.create({
            data: {
              userId: user.id,
              ip,
              userAgent: request?.headers?.get("user-agent") ?? undefined,
              method: "credentials",
            },
          });
        } catch {
          /* non-fatal */
        }

        return {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email,
          image: user.image,
          username: user.username,
        };
      },
    }),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.username = (user as { username?: string | null }).username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.username = (token.username as string | null) ?? null;
        session.user.imp = Boolean(token.imp);
      }
      return session;
    },
  },
});
