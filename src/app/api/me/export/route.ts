import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** Downloadable JSON dump of everything tied to the signed-in account. */
export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ error: "Accounts are not available." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = session.user.id;

  const [profile, games, ratingHistory, achievements, highScores, friendships, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        createdAt: true,
        ratingBullet: true,
        ratingBlitz: true,
        ratingRapid: true,
        ratingClassical: true,
        puzzleRating: true,
        puzzleStreak: true,
      },
    }),
    prisma.game.findMany({
      where: { OR: [{ whiteId: userId }, { blackId: userId }] },
      select: {
        id: true,
        whiteName: true,
        blackName: true,
        result: true,
        category: true,
        timeControl: true,
        rated: true,
        termination: true,
        pgn: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ratingHistory.findMany({
      where: { userId },
      select: { category: true, rating: true, delta: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true, earnedAt: true } }),
    prisma.highScore.findMany({ where: { userId }, select: { game: true, score: true, level: true, createdAt: true } }),
    prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { status: true, requesterId: true, addresseeId: true, createdAt: true },
    }),
    prisma.notification.findMany({ where: { userId }, select: { title: true, body: true, type: true, readAt: true, createdAt: true } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    games,
    ratingHistory,
    achievements,
    highScores,
    friendships,
    notifications,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sams-arcade-data-${userId}.json"`,
    },
  });
}
