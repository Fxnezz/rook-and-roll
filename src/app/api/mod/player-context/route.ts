import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

const NEW_ACCOUNT_DAYS = 7;

/**
 * Read-only context about an opponent for the in-game moderator — aggregate
 * report count, historical admin-mute count (reused from the existing
 * AdminAuditLog trail, no new schema needed), and account age. Gated on
 * session.user.isModerator, distinct from the admin god-mode's own
 * per-user history views.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.isModerator) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  const username = new URL(req.url).searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "A username is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, createdAt: true } });
  if (!user) return NextResponse.json({ found: false });

  const [reportsReceived, muteCount] = await Promise.all([
    prisma.report.count({ where: { reportedId: user.id } }),
    prisma.adminAuditLog.count({ where: { targetType: "user", targetId: user.id, action: "user_mute" } }),
  ]);
  const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);

  return NextResponse.json({
    found: true,
    reportsReceived,
    muteCount,
    accountAgeDays,
    isNewAccount: accountAgeDays < NEW_ACCOUNT_DAYS,
  });
}
