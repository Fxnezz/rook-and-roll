import { prisma } from "@/lib/db/prisma";

export interface StatsComparisonSide {
  username: string;
  ratingBullet: number;
  ratingBlitz: number;
  ratingRapid: number;
  ratingClassical: number;
  puzzleRating: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface StatsComparison {
  viewer: StatsComparisonSide;
  other: StatsComparisonSide;
}

async function sideStats(userId: string): Promise<StatsComparisonSide | null> {
  const [user, wins, losses, draws] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, ratingBullet: true, ratingBlitz: true, ratingRapid: true, ratingClassical: true, puzzleRating: true },
    }),
    prisma.game.count({ where: { OR: [{ whiteId: userId, result: "WHITE_WINS" }, { blackId: userId, result: "BLACK_WINS" }] } }),
    prisma.game.count({ where: { OR: [{ whiteId: userId, result: "BLACK_WINS" }, { blackId: userId, result: "WHITE_WINS" }] } }),
    prisma.game.count({ where: { OR: [{ whiteId: userId }, { blackId: userId }], result: "DRAW" } }),
  ]);
  if (!user) return null;
  return { ...user, username: user.username ?? "?", wins, losses, draws };
}

/** Side-by-side rating/win-rate comparison between two users — distinct from computeHeadToHead, which counts only games played *against each other*. */
export async function computeStatsComparison(viewerId: string, otherId: string): Promise<StatsComparison | null> {
  const [viewer, other] = await Promise.all([sideStats(viewerId), sideStats(otherId)]);
  if (!viewer || !other) return null;
  return { viewer, other };
}
