import { prisma } from "@/lib/db/prisma";
import { ALL_HIGHSCORE_GAMES, highScoreGameLabel } from "@/lib/games/scoreDirection";

export interface ArcadeSummary {
  totalPlays: number;
  gamesPlayed: number;
  favoriteGame: { game: string; label: string; plays: number } | null;
}

/** Aggregate stats across all ~40+ HighScore-tracked arcade games — total plays and distinct games touched, computed server-side from the shared HighScore table. */
export async function computeArcadeSummary(userId: string): Promise<ArcadeSummary> {
  const byGame = await prisma.highScore.groupBy({
    by: ["game"],
    where: { userId, game: { in: ALL_HIGHSCORE_GAMES } },
    _count: { _all: true },
  });

  if (byGame.length === 0) {
    return { totalPlays: 0, gamesPlayed: 0, favoriteGame: null };
  }

  const totalPlays = byGame.reduce((sum, g) => sum + g._count._all, 0);
  const top = byGame.reduce((a, b) => (b._count._all > a._count._all ? b : a));

  return {
    totalPlays,
    gamesPlayed: byGame.length,
    favoriteGame: { game: top.game, label: highScoreGameLabel(top.game), plays: top._count._all },
  };
}
