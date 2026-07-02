import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

const PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PROD ? "__Secure-authjs.session-token" : "authjs.session-token";
export const PREV_COOKIE = "rr_imp_prev";

/**
 * Start impersonating a user: mint a real Auth.js session token for them (with
 * an `imp` flag so the app shows a banner), while preserving any existing real
 * session so it can be restored on exit. The admin's own admin cookie is
 * untouched, so they remain an admin throughout.
 */
export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: String(body.userId ?? "") },
    select: { id: true, username: true, name: true, email: true, image: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.username ?? user.name,
      email: user.email,
      picture: user.image,
      username: user.username,
      imp: true,
    },
    secret: process.env.AUTH_SECRET!,
    salt: SESSION_COOKIE,
  });

  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) {
    jar.set(PREV_COOKIE, existing, { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", maxAge: 3600 });
  }
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: PROD, sameSite: "lax", path: "/", maxAge: 1800 });

  await prisma.loginEvent.create({
    data: {
      userId: user.id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
      method: "impersonation",
    },
  });
  await audit({
    action: "impersonate_start",
    targetType: "user",
    targetId: user.id,
    ip: clientIp(req),
    detail: { username: user.username },
  });

  return NextResponse.json({ ok: true, username: user.username });
}
