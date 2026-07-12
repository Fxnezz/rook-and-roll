import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isLowerBetter } from "@/lib/games/scoreDirection";

export type Period = "all" | "week" | "month";
export type CatKey = "ratingBullet" | "ratingBlitz" | "ratingRapid" | "ratingClassical" | "puzzleRating";

export interface RankedRow extends LeaderboardRow {
  rank: number;
}

const CATEGORY_FOR_FIELD: Record<CatKey, string> = {
  ratingBullet: "bullet",
  ratingBlitz: "blitz",
  ratingRapid: "rapid",
  ratingClassical: "classical",
  puzzleRating: "puzzle",
};

export interface LeaderboardRow {
  id: string;
  username: string;
  value: number;
}

function periodCutoff(period: Period): Date | null {
  if (period === "all") return null;
  const days = period === "week" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

interface FetchArgs {
  field: CatKey;
  period: Period;
  friendIds?: string[];
  search?: string;
  page: number;
  pageSize?: number;
}

export async function fetchLeaderboard({ field, period, friendIds, search, page, pageSize = 25 }: FetchArgs): Promise<{ rows: LeaderboardRow[]; total: number }> {
  const cutoff = periodCutoff(period);
  const skip = (page - 1) * pageSize;

  if (!cutoff) {
    const where: Prisma.UserWhereInput = {
      username: { not: null },
      ...(friendIds ? { id: { in: friendIds } } : {}),
      ...(search ? { username: { contains: search, mode: "insensitive" } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [field]: "desc" },
        skip,
        take: pageSize,
        select: { id: true, username: true, [field]: true } as Prisma.UserSelect,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => {
        const row = r as unknown as { id: string; username: string } & Record<CatKey, number>;
        return { id: row.id, username: row.username, value: row[field] };
      }),
    };
  }

  const category = CATEGORY_FOR_FIELD[field];
  let candidateIds: string[] | undefined = friendIds;
  if (search) {
    const matched = await prisma.user.findMany({
      where: { username: { contains: search, mode: "insensitive" }, ...(friendIds ? { id: { in: friendIds } } : {}) },
      select: { id: true },
    });
    candidateIds = matched.map((m) => m.id);
  }

  const grouped = await prisma.ratingHistory.groupBy({
    by: ["userId"],
    where: { category, createdAt: { gte: cutoff }, ...(candidateIds ? { userId: { in: candidateIds } } : {}) },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
  });

  const total = grouped.length;
  const page_ = grouped.slice(skip, skip + pageSize);
  const users = await prisma.user.findMany({ where: { id: { in: page_.map((g) => g.userId) } }, select: { id: true, username: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = page_
    .map((g) => ({ id: g.userId, username: byId.get(g.userId)?.username ?? null, value: g._sum.delta ?? 0 }))
    .filter((r): r is LeaderboardRow => r.username !== null);
  return { rows, total };
}

export async function fetchUserRank({
  field,
  period,
  friendIds,
  userId,
}: {
  field: CatKey;
  period: Period;
  friendIds?: string[];
  userId: string;
}): Promise<{ rank: number; value: number } | null> {
  const cutoff = periodCutoff(period);

  if (!cutoff) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { [field]: true } as Prisma.UserSelect });
    if (!me) return null;
    const value = (me as unknown as Record<CatKey, number>)[field];
    const where = {
      username: { not: null },
      [field]: { gt: value },
      ...(friendIds ? { id: { in: friendIds } } : {}),
    } as Prisma.UserWhereInput;
    const higher = await prisma.user.count({ where });
    return { rank: higher + 1, value };
  }

  const category = CATEGORY_FOR_FIELD[field];
  const grouped = await prisma.ratingHistory.groupBy({
    by: ["userId"],
    where: { category, createdAt: { gte: cutoff }, ...(friendIds ? { userId: { in: friendIds } } : {}) },
    _sum: { delta: true },
  });
  const sorted = grouped.map((g) => ({ userId: g.userId, value: g._sum.delta ?? 0 })).sort((a, b) => b.value - a.value);
  const idx = sorted.findIndex((s) => s.userId === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, value: sorted[idx].value };
}

/**
 * "Players near your rank" — a window of `window` rows above and below the
 * viewer for the given rating category/period, instead of top-N.
 */
export async function fetchNearRank({
  field,
  period,
  friendIds,
  userId,
  window = 5,
}: {
  field: CatKey;
  period: Period;
  friendIds?: string[];
  userId: string;
  window?: number;
}): Promise<{ rows: RankedRow[]; viewerRank: number } | null> {
  const cutoff = periodCutoff(period);

  if (!cutoff) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { [field]: true } as Prisma.UserSelect });
    if (!me) return null;
    const value = (me as unknown as Record<CatKey, number>)[field];
    const whereAll = {
      username: { not: null },
      ...(friendIds ? { id: { in: friendIds } } : {}),
    } as Prisma.UserWhereInput;
    const higher = await prisma.user.count({ where: { ...whereAll, [field]: { gt: value } } as Prisma.UserWhereInput });
    const viewerRank = higher + 1;
    const start = Math.max(1, viewerRank - window);
    const rows = await prisma.user.findMany({
      where: whereAll,
      orderBy: { [field]: "desc" },
      skip: start - 1,
      take: window * 2 + 1,
      select: { id: true, username: true, [field]: true } as Prisma.UserSelect,
    });
    return {
      viewerRank,
      rows: rows.map((r, i) => {
        const row = r as unknown as { id: string; username: string } & Record<CatKey, number>;
        return { id: row.id, username: row.username, value: row[field], rank: start + i };
      }),
    };
  }

  const category = CATEGORY_FOR_FIELD[field];
  const grouped = await prisma.ratingHistory.groupBy({
    by: ["userId"],
    where: { category, createdAt: { gte: cutoff }, ...(friendIds ? { userId: { in: friendIds } } : {}) },
    _sum: { delta: true },
  });
  const sorted = grouped.map((g) => ({ userId: g.userId, value: g._sum.delta ?? 0 })).sort((a, b) => b.value - a.value);
  const idx = sorted.findIndex((s) => s.userId === userId);
  if (idx === -1) return null;
  return nearRankFromSorted(sorted, idx, window);
}

async function nearRankFromSorted(
  sorted: { userId: string; value: number }[],
  idx: number,
  window: number,
): Promise<{ rows: RankedRow[]; viewerRank: number }> {
  const start = Math.max(0, idx - window);
  const end = Math.min(sorted.length, idx + window + 1);
  const slice = sorted.slice(start, end);
  const users = await prisma.user.findMany({ where: { id: { in: slice.map((s) => s.userId) } }, select: { id: true, username: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = slice
    .map((s, i) => ({ id: s.userId, username: byId.get(s.userId)?.username ?? null, value: s.value, rank: start + i + 1 }))
    .filter((r): r is RankedRow => r.username !== null);
  return { viewerRank: idx + 1, rows };
}

// ---- Per-mini-game (HighScore) leaderboards --------------------------------

export async function fetchHighScoreLeaderboard({
  game,
  search,
  page,
  pageSize = 25,
}: {
  game: string;
  search?: string;
  page: number;
  pageSize?: number;
}): Promise<{ rows: LeaderboardRow[]; total: number }> {
  const lower = isLowerBetter(game);
  let candidateIds: string[] | undefined;
  if (search) {
    const matched = await prisma.user.findMany({
      where: { username: { contains: search, mode: "insensitive" } },
      select: { id: true },
    });
    candidateIds = matched.map((m) => m.id);
  }

  const where = { game, ...(candidateIds ? { userId: { in: candidateIds } } : {}) };
  const grouped = lower
    ? await prisma.highScore.groupBy({ by: ["userId"], where, _min: { score: true } })
    : await prisma.highScore.groupBy({ by: ["userId"], where, _max: { score: true } });
  const withValue = grouped
    .map((g) => ({ userId: g.userId, value: (lower ? (g as { _min: { score: number | null } })._min.score : (g as { _max: { score: number | null } })._max.score) ?? 0 }))
    .sort((a, b) => (lower ? a.value - b.value : b.value - a.value));

  const total = withValue.length;
  const skip = (page - 1) * pageSize;
  const pageSlice = withValue.slice(skip, skip + pageSize);
  const users = await prisma.user.findMany({ where: { id: { in: pageSlice.map((p) => p.userId) } }, select: { id: true, username: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = pageSlice
    .map((p) => ({ id: p.userId, username: byId.get(p.userId)?.username ?? null, value: p.value }))
    .filter((r): r is LeaderboardRow => r.username !== null);
  return { rows, total };
}

async function highScoreSorted(game: string): Promise<{ userId: string; value: number }[]> {
  const lower = isLowerBetter(game);
  const grouped = lower
    ? await prisma.highScore.groupBy({ by: ["userId"], where: { game }, _min: { score: true } })
    : await prisma.highScore.groupBy({ by: ["userId"], where: { game }, _max: { score: true } });
  return grouped
    .map((g) => ({ userId: g.userId, value: (lower ? (g as { _min: { score: number | null } })._min.score : (g as { _max: { score: number | null } })._max.score) ?? 0 }))
    .sort((a, b) => (lower ? a.value - b.value : b.value - a.value));
}

export async function fetchHighScoreUserRank({ game, userId }: { game: string; userId: string }): Promise<{ rank: number; value: number } | null> {
  const sorted = await highScoreSorted(game);
  const idx = sorted.findIndex((s) => s.userId === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, value: sorted[idx].value };
}

export async function fetchHighScoreNearRank({
  game,
  userId,
  window = 5,
}: {
  game: string;
  userId: string;
  window?: number;
}): Promise<{ rows: RankedRow[]; viewerRank: number } | null> {
  const sorted = await highScoreSorted(game);
  const idx = sorted.findIndex((s) => s.userId === userId);
  if (idx === -1) return null;
  return nearRankFromSorted(sorted, idx, window);
}
