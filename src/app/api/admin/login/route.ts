import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { issueAdminSession } from "@/lib/admin/auth";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const hash = process.env.ADMIN_PASSWORD_HASH;

  // If no admin password is configured, behave like the route doesn't exist.
  if (!hash) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Aggressive, DB-backed rate limit: count recent failed attempts for this IP.
  if (isDbConfigured) {
    const since = new Date(Date.now() - WINDOW_MS);
    const fails = await prisma.adminAuditLog.count({
      where: { action: "admin_login_failed", ip, createdAt: { gt: since } },
    });
    if (fails >= MAX_FAILS) {
      await audit({ action: "admin_login_blocked", ip });
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const ok = password.length > 0 && (await bcrypt.compare(password, hash));

  if (!ok) {
    await audit({ action: "admin_login_failed", ip, detail: { at: new Date().toISOString() } });
    // Deliberately vague — no hint whether the sequence/route is "right".
    return NextResponse.json({ error: "Incorrect." }, { status: 401 });
  }

  await issueAdminSession();
  await audit({ action: "admin_login_success", ip });
  return NextResponse.json({ ok: true });
}
