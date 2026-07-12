import { prisma } from "@/lib/db/prisma";

export interface ColorStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface CategoryStat {
  category: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface TerminationStat {
  termination: string;
  count: number;
}

export interface GameSummary {
  id: string;
  opponent: string;
  outcome: "win" | "loss" | "draw";
  category: string;
  ply: number;
  createdAt: Date;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ProfileExtras {
  colorStats: { white: ColorStats; black: ColorStats };
  categoryStats: CategoryStat[];
  terminationStats: TerminationStat[];
  longestGame: GameSummary | null;
  fastestCheckmate: GameSummary | null;
  recentGames: GameSummary[];
  activityHeatmap: HeatmapDay[];
}

const emptyColorStats = (): ColorStats => ({ wins: 0, losses: 0, draws: 0 });

const GAME_SUMMARY_SELECT = {
  id: true,
  whiteId: true,
  whiteName: true,
  blackName: true,
  result: true,
  category: true,
  ply: true,
  createdAt: true,
} as const;

type RawGame = {
  id: string;
  whiteId: string | null;
  whiteName: string;
  blackName: string;
  result: string;
  category: string;
  ply: number;
  createdAt: Date;
};

function toSummary(userId: string, g: RawGame): GameSummary {
  const isWhite = g.whiteId === userId;
  const outcome: "win" | "loss" | "draw" =
    g.result === "DRAW" ? "draw" : (g.result === "WHITE_WINS") === isWhite ? "win" : "loss";
  return {
    id: g.id,
    opponent: isWhite ? g.blackName : g.whiteName,
    outcome,
    category: g.category,
    ply: g.ply,
    createdAt: g.createdAt,
  };
}

/** Aggregated profile stats beyond the basic win/loss/draw totals — color splits, category splits, termination breakdown, records, recent games, and a daily activity heatmap. */
export async function computeProfileExtras(userId: string): Promise<ProfileExtras> {
  const orFilter = [{ whiteId: userId }, { blackId: userId }];
  const heatmapStart = new Date();
  heatmapStart.setHours(0, 0, 0, 0);
  heatmapStart.setDate(heatmapStart.getDate() - 89);

  const [whiteGroups, blackGroups, terminationGroups, longestGame, fastestCheckmate, recentGames, heatmapGames] =
    await Promise.all([
      prisma.game.groupBy({
        by: ["result", "category"],
        where: { whiteId: userId, NOT: { result: "ABORTED" } },
        _count: true,
      }),
      prisma.game.groupBy({
        by: ["result", "category"],
        where: { blackId: userId, NOT: { result: "ABORTED" } },
        _count: true,
      }),
      prisma.game.groupBy({
        by: ["termination"],
        where: { OR: orFilter, NOT: { result: "ABORTED" } },
        _count: true,
      }),
      prisma.game.findFirst({
        where: { OR: orFilter, NOT: { result: "ABORTED" }, ply: { gt: 0 } },
        orderBy: { ply: "desc" },
        select: GAME_SUMMARY_SELECT,
      }),
      prisma.game.findFirst({
        where: { OR: orFilter, termination: "Checkmate" },
        orderBy: { ply: "asc" },
        select: GAME_SUMMARY_SELECT,
      }),
      prisma.game.findMany({
        where: { OR: orFilter },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: GAME_SUMMARY_SELECT,
      }),
      prisma.game.findMany({
        where: { OR: orFilter, createdAt: { gte: heatmapStart } },
        select: { createdAt: true },
      }),
    ]);

  const colorStats = { white: emptyColorStats(), black: emptyColorStats() };
  for (const g of whiteGroups) {
    if (g.result === "WHITE_WINS") colorStats.white.wins += g._count;
    else if (g.result === "BLACK_WINS") colorStats.white.losses += g._count;
    else colorStats.white.draws += g._count;
  }
  for (const g of blackGroups) {
    if (g.result === "BLACK_WINS") colorStats.black.wins += g._count;
    else if (g.result === "WHITE_WINS") colorStats.black.losses += g._count;
    else colorStats.black.draws += g._count;
  }

  const categoryMap = new Map<string, CategoryStat>();
  const bump = (category: string, key: "wins" | "losses" | "draws", n: number) => {
    const entry = categoryMap.get(category) ?? { category, wins: 0, losses: 0, draws: 0 };
    entry[key] += n;
    categoryMap.set(category, entry);
  };
  for (const g of whiteGroups) {
    bump(g.category, g.result === "WHITE_WINS" ? "wins" : g.result === "BLACK_WINS" ? "losses" : "draws", g._count);
  }
  for (const g of blackGroups) {
    bump(g.category, g.result === "BLACK_WINS" ? "wins" : g.result === "WHITE_WINS" ? "losses" : "draws", g._count);
  }
  const categoryStats = Array.from(categoryMap.values()).sort(
    (a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws),
  );

  const terminationStats: TerminationStat[] = terminationGroups
    .map((g) => ({ termination: g.termination, count: g._count }))
    .sort((a, b) => b.count - a.count);

  const activityCounts = new Map<string, number>();
  for (const g of heatmapGames) {
    const key = g.createdAt.toISOString().slice(0, 10);
    activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
  }
  const activityHeatmap: HeatmapDay[] = [];
  const cursor = new Date(heatmapStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    activityHeatmap.push({ date: key, count: activityCounts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    colorStats,
    categoryStats,
    terminationStats,
    longestGame: longestGame ? toSummary(userId, longestGame) : null,
    fastestCheckmate: fastestCheckmate ? toSummary(userId, fastestCheckmate) : null,
    recentGames: recentGames.map((g) => toSummary(userId, g)),
    activityHeatmap,
  };
}
