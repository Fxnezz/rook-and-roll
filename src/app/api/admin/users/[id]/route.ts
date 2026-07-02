import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";

export const runtime = "nodejs";

/**
 * Full private detail for one user — email, login/IP history, linked OAuth
 * accounts, rating history. Sensitive: every access is written to the audit
 * log (who viewed whose data), and this data is never exposed to non-admins.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      status: true,
      moderationReason: true,
      bannedUntil: true,
      mutedUntil: true,
      ratingBullet: true,
      ratingBlitz: true,
      ratingRapid: true,
      ratingClassical: true,
      puzzleRating: true,
      accounts: { select: { provider: true, providerAccountId: true, type: true } },
      loginEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      ratingHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { gamesAsWhite: true, gamesAsBlack: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit({
    action: "user_view_private",
    targetType: "user",
    targetId: id,
    ip: clientIp(req),
    detail: { username: user.username },
  });

  return NextResponse.json({ user });
}
