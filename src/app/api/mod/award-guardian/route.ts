import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { isAdminOwnerEmail } from "@/lib/admin/owner";

export const runtime = "nodejs";

/**
 * Idempotent award for the "Community Guardian" achievement, triggered
 * client-side once the moderator's local action-count crosses the threshold
 * (see useModStats). Same findFirst-then-create idempotency pattern as
 * checkAndAwardAchievements in src/lib/achievements/award.ts, just outside
 * the game-result-triggered flow since this isn't tied to a game ending.
 */
export async function POST() {
  const session = await auth();
  const owner = session?.user;
  if (!owner || !isAdminOwnerEmail(owner.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  const existing = await prisma.userAchievement.findFirst({
    where: { userId: owner.id, achievementId: "community_guardian" },
  });
  if (existing) return NextResponse.json({ ok: true, awarded: false });

  await prisma.userAchievement.create({
    data: { userId: owner.id, achievementId: "community_guardian" },
  });
  return NextResponse.json({ ok: true, awarded: true });
}
