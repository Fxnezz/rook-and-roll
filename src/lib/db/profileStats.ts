import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureOpenings } from "@/lib/openings/heal";
import { getTier, type BotTierId } from "@/lib/engine/bots";

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

export interface OpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RatedGameHighlight extends GameSummary {
  opponentRating: number;
}

export interface PersonalRecords {
  biggestUpset: RatedGameHighlight | null;
  longestWinStreak: number;
  mostGamesInADay: number;
}

export interface OpponentStat {
  opponent: string;
  wins: number;
  losses: number;
  draws: number;
  avgOpponentRating: number | null;
}

export interface BotRecordStat {
  botTier: BotTierId;
  wins: number;
  losses: number;
  draws: number;
}

export interface ProfileExtras {
  colorStats: { white: ColorStats; black: ColorStats };
  categoryStats: CategoryStat[];
  terminationStats: TerminationStat[];
  longestGame: GameSummary | null;
  fastestCheckmate: GameSummary | null;
  recentGames: GameSummary[];
  activityHeatmap: HeatmapDay[];
  /** Most-played book openings with the user's score in each (recent games window). */
  openingsReport: OpeningStat[];
  records: PersonalRecords;
  /** The rated win against the highest-rated opponent (recent games window). */
  bestWin: RatedGameHighlight | null;
  /** The rated loss to the lowest-rated opponent — the most surprising defeat (recent games window). */
  toughestLoss: RatedGameHighlight | null;
  /** Per-opponent record, most-played first (recent games window). */
  opponentsTable: OpponentStat[];
  /** Per-bot-tier win/loss/draw record, full history (not windowed). */
  botRecords: BotRecordStat[];
  /** Sum of per-ply think time across bot/local games only — online rated games don't record this, so this is a partial "time played" figure, not a true lifetime total. */
  partialTimePlayedMs: number;
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

  const [
    whiteGroups,
    blackGroups,
    terminationGroups,
    longestGame,
    fastestCheckmate,
    recentGames,
    heatmapGames,
    openingGames,
    botGroupsWhite,
    botGroupsBlack,
    moveTimeGames,
  ] = await Promise.all([
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
      prisma.game.findMany({
        where: { OR: orFilter, NOT: { result: "ABORTED" } },
        orderBy: { createdAt: "desc" },
        take: 300, // bounded window so healing missing opening columns / records queries stay cheap
        select: {
          id: true,
          whiteId: true,
          blackId: true,
          whiteName: true,
          blackName: true,
          result: true,
          category: true,
          ply: true,
          createdAt: true,
          opening: true,
          eco: true,
          pgn: true,
          opponentType: true,
          botTier: true,
          whiteRatingBefore: true,
          blackRatingBefore: true,
        },
      }),
      // Full-history (unbounded) per-bot-tier record — separate from the 300-game windowed opponentsTable.
      prisma.game.groupBy({
        by: ["botTier", "result"],
        where: { whiteId: userId, opponentType: "BOT", NOT: { result: "ABORTED" } },
        _count: true,
      }),
      prisma.game.groupBy({
        by: ["botTier", "result"],
        where: { blackId: userId, opponentType: "BOT", NOT: { result: "ABORTED" } },
        _count: true,
      }),
      // moveTimes is only ever populated for bot/local games — this is an honest partial
      // "time played" figure, not a true lifetime total (online games aren't included).
      prisma.game.findMany({
        where: { OR: orFilter, moveTimes: { not: Prisma.JsonNull } },
        select: { moveTimes: true },
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

  const healedGames = ensureOpenings(openingGames);

  const opponentRatingFor = (g: (typeof healedGames)[number]): number | null => {
    const isWhite = g.whiteId === userId;
    if (g.opponentType === "BOT") return getTier((g.botTier ?? "cass") as BotTierId).elo;
    return (isWhite ? g.blackRatingBefore : g.whiteRatingBefore) ?? null;
  };

  const toHighlight = (g: (typeof healedGames)[number], opponentRating: number): RatedGameHighlight => ({
    ...toSummary(userId, g),
    opponentRating,
  });

  let biggestUpset: RatedGameHighlight | null = null;
  let biggestUpsetGap = -Infinity;
  let bestWin: RatedGameHighlight | null = null;
  let bestWinRating = -Infinity;
  let toughestLoss: RatedGameHighlight | null = null;
  let toughestLossRating = Infinity;
  const opponentMap = new Map<string, OpponentStat & { ratingSum: number; ratingCount: number }>();
  const dayCounts = new Map<string, number>();

  for (const g of healedGames) {
    const isWhite = g.whiteId === userId;
    const outcome: "win" | "loss" | "draw" = g.result === "DRAW" ? "draw" : (g.result === "WHITE_WINS") === isWhite ? "win" : "loss";
    const opponentRating = opponentRatingFor(g);

    const opponentName = isWhite ? g.blackName : g.whiteName;
    const opp = opponentMap.get(opponentName) ?? { opponent: opponentName, wins: 0, losses: 0, draws: 0, avgOpponentRating: null, ratingSum: 0, ratingCount: 0 };
    if (outcome === "win") opp.wins += 1;
    else if (outcome === "loss") opp.losses += 1;
    else opp.draws += 1;
    if (opponentRating != null) {
      opp.ratingSum += opponentRating;
      opp.ratingCount += 1;
    }
    opponentMap.set(opponentName, opp);

    const dayKey = g.createdAt.toISOString().slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);

    if (opponentRating == null) continue;
    if (outcome === "win") {
      const yourRating = isWhite ? g.whiteRatingBefore : g.blackRatingBefore;
      const gap = yourRating != null ? opponentRating - yourRating : -Infinity;
      if (gap > biggestUpsetGap) {
        biggestUpsetGap = gap;
        biggestUpset = toHighlight(g, opponentRating);
      }
      if (opponentRating > bestWinRating) {
        bestWinRating = opponentRating;
        bestWin = toHighlight(g, opponentRating);
      }
    } else if (outcome === "loss") {
      if (opponentRating < toughestLossRating) {
        toughestLossRating = opponentRating;
        toughestLoss = toHighlight(g, opponentRating);
      }
    }
  }

  let longestWinStreak = 0;
  let currentStreak = 0;
  for (const g of [...healedGames].reverse()) {
    const isWhite = g.whiteId === userId;
    const won = g.result !== "DRAW" && (g.result === "WHITE_WINS") === isWhite;
    currentStreak = won ? currentStreak + 1 : 0;
    longestWinStreak = Math.max(longestWinStreak, currentStreak);
  }
  const mostGamesInADay = Math.max(0, ...dayCounts.values());

  const opponentsTable: OpponentStat[] = Array.from(opponentMap.values())
    .map(({ ratingSum, ratingCount, ...rest }) => ({ ...rest, avgOpponentRating: ratingCount > 0 ? Math.round(ratingSum / ratingCount) : null }))
    .sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws));

  const records: PersonalRecords = { biggestUpset, longestWinStreak, mostGamesInADay };

  const openingMap = new Map<string, OpeningStat>();
  for (const g of healedGames) {
    if (!g.opening || !g.eco) continue;
    const entry = openingMap.get(g.opening) ?? { eco: g.eco, name: g.opening, games: 0, wins: 0, losses: 0, draws: 0 };
    entry.games += 1;
    const isWhite = g.whiteId === userId;
    if (g.result === "DRAW") entry.draws += 1;
    else if ((g.result === "WHITE_WINS") === isWhite) entry.wins += 1;
    else entry.losses += 1;
    openingMap.set(g.opening, entry);
  }
  const openingsReport = Array.from(openingMap.values())
    .sort((a, b) => b.games - a.games)
    .slice(0, 6);

  const botMap = new Map<string, BotRecordStat>();
  const bumpBot = (tier: string | null, result: string, asWhite: boolean, count: number) => {
    if (!tier) return;
    const entry = botMap.get(tier) ?? { botTier: tier as BotTierId, wins: 0, losses: 0, draws: 0 };
    if (result === "DRAW") entry.draws += count;
    else if ((result === "WHITE_WINS") === asWhite) entry.wins += count;
    else entry.losses += count;
    botMap.set(tier, entry);
  };
  for (const g of botGroupsWhite) bumpBot(g.botTier, g.result, true, g._count);
  for (const g of botGroupsBlack) bumpBot(g.botTier, g.result, false, g._count);
  const botRecords = Array.from(botMap.values()).sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws));

  let partialTimePlayedMs = 0;
  for (const g of moveTimeGames) {
    if (Array.isArray(g.moveTimes)) {
      for (const t of g.moveTimes) {
        if (typeof t === "number") partialTimePlayedMs += t;
      }
    }
  }

  return {
    colorStats,
    categoryStats,
    terminationStats,
    longestGame: longestGame ? toSummary(userId, longestGame) : null,
    fastestCheckmate: fastestCheckmate ? toSummary(userId, fastestCheckmate) : null,
    recentGames: recentGames.map((g) => toSummary(userId, g)),
    activityHeatmap,
    openingsReport,
    records,
    bestWin,
    toughestLoss,
    opponentsTable,
    botRecords,
    partialTimePlayedMs,
  };
}
