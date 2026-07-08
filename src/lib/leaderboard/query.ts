import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type Period = "all" | "week" | "month";
export type CatKey = "ratingBullet" | "ratingBlitz" | "ratingRapid" | "ratingClassical" | "puzzleRating";

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
