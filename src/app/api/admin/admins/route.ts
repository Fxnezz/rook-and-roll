import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { ADMIN_OWNER_EMAIL } from "@/lib/admin/owner";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, username: true, email: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json({
    admins: admins.map((a) => ({ ...a, isOwner: a.email.toLowerCase() === ADMIN_OWNER_EMAIL.toLowerCase() })),
  });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, username: true, email: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "No user with that email." }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: "Already an admin." }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { isAdmin: true },
    select: { id: true, username: true, email: true },
  });
  await audit({ action: "admin_added", targetType: "user", targetId: updated.id, ip: clientIp(req), detail: { email: updated.email } });

  return NextResponse.json({ ok: true, admin: { ...updated, isOwner: false } }, { status: 201 });
}
