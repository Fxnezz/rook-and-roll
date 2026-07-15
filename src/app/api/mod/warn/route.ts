import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

export const runtime = "nodejs";

/**
 * In-game moderator's warn action — persists a Warning row for the target
 * player, same model/pattern as the admin god-mode's warn action in
 * /api/admin/users/[id]/moderate, but gated on session.user.isModerator
 * instead of the separate admin JWT. The in-game system-message delivery
 * itself goes over the mod:warn socket event; this endpoint only persists
 * the record. Guest opponents have no User row, so there's nothing to
 * persist for them — that's not an error, just a no-op.
 */
export async function POST(req: Request) {
  const session = await auth();
  const owner = session?.user;
  if (!owner || !isAdminOwnerEmail(owner.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  let body: { targetUsername?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = String(body.targetUsername ?? "").trim();
  const reason = String(body.reason ?? "").trim().slice(0, 300);
  if (!username || !reason) {
    return NextResponse.json({ error: "A player and a reason are required." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ ok: true, persisted: false });
  if (target.id === owner.id) {
    return NextResponse.json({ error: "You can't warn yourself." }, { status: 400 });
  }

  await prisma.warning.create({ data: { userId: target.id, reason } });
  return NextResponse.json({ ok: true, persisted: true });
}
