import type { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { ChessHome, type ChessHomeData, type ChessRecentGame } from "@/components/chess/ChessHome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chess Home",
  description: "Your personal chess command center for quick play, ratings, review, training, openings, bots, and friends.",
};

const GUEST_DATA: ChessHomeData = {
  signedIn: false,
  username: "Player",
  ratings: { bullet: 1200, blitz: 1200, rapid: 1200, classical: 1200, puzzle: 1000 },
  stats: { totalGames: 0, reviewedGames: 0, recentWins: 0, recentDraws: 0, recentLosses: 0, puzzlesThisWeek: 0, achievements: 0, friends: 0 },
  recentGames: [],
};

function resultFor(game: {
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW" | "ABORTED";
  whiteId: string | null;
}, userId: string): ChessRecentGame["result"] {
  if (game.result === "DRAW") return "draw";
  if (game.result === "ABORTED") return "aborted";
  const userIsWhite = game.whiteId === userId;
  return (game.result === "WHITE_WINS") === userIsWhite ? "win" : "loss";
}

async function loadChessHomeData(): Promise<ChessHomeData> {
  const session = await auth();
  if (!session?.user?.id || !isDbConfigured) {
    return { ...GUEST_DATA, username: session?.user?.username ?? session?.user?.name ?? "Player" };
  }

  try {
    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        name: true,
        ratingBullet: true,
        ratingBlitz: true,
        ratingRapid: true,
        ratingClassical: true,
        puzzleRating: true,
      },
    });
    if (!user) return GUEST_DATA;

    const gameWhere = { OR: [{ whiteId: userId }, { blackId: userId }] };
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [games, totalGames, reviewedGames, puzzlesThisWeek, achievements, friends] = await Promise.all([
      prisma.game.findMany({
        where: gameWhere,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          whiteId: true,
          blackId: true,
          whiteName: true,
          blackName: true,
          result: true,
          category: true,
          timeControl: true,
          opening: true,
          eco: true,
          accuracyW: true,
          accuracyB: true,
          whiteRatingBefore: true,
          whiteRatingAfter: true,
          blackRatingBefore: true,
          blackRatingAfter: true,
          createdAt: true,
        },
      }),
      prisma.game.count({ where: gameWhere }),
      prisma.game.count({
        where: {
          OR: [
            { whiteId: userId, accuracyW: { not: null } },
            { blackId: userId, accuracyB: { not: null } },
          ],
        },
      }),
      prisma.puzzleAttempt.count({ where: { userId, solved: true, createdAt: { gte: weekAgo } } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
    ]);

    const recentGames: ChessRecentGame[] = games.slice(0, 6).map((game) => {
      const userIsWhite = game.whiteId === userId;
      const before = userIsWhite ? game.whiteRatingBefore : game.blackRatingBefore;
      const after = userIsWhite ? game.whiteRatingAfter : game.blackRatingAfter;
      return {
        id: game.id,
        opponent: userIsWhite ? game.blackName : game.whiteName,
        result: resultFor(game, userId),
        category: game.category,
        timeControl: game.timeControl,
        opening: game.opening,
        eco: game.eco,
        accuracy: userIsWhite ? game.accuracyW : game.accuracyB,
        ratingDelta: before != null && after != null ? after - before : null,
        createdAt: game.createdAt.toISOString(),
      };
    });
    const form = games.slice(0, 10).map((game) => resultFor(game, userId));

    return {
      signedIn: true,
      username: user.username ?? user.name ?? "Player",
      ratings: {
        bullet: user.ratingBullet,
        blitz: user.ratingBlitz,
        rapid: user.ratingRapid,
        classical: user.ratingClassical,
        puzzle: user.puzzleRating,
      },
      stats: {
        totalGames,
        reviewedGames,
        recentWins: form.filter((result) => result === "win").length,
        recentDraws: form.filter((result) => result === "draw").length,
        recentLosses: form.filter((result) => result === "loss").length,
        puzzlesThisWeek,
        achievements,
        friends,
      },
      recentGames,
    };
  } catch {
    return {
      ...GUEST_DATA,
      signedIn: Boolean(session.user),
      username: session.user.username ?? session.user.name ?? "Player",
    };
  }
}

export default async function ChessPage() {
  return <ChessHome data={await loadChessHomeData()} />;
}
