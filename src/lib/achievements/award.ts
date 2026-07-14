import { prisma } from "@/lib/db/prisma";
import { ACHIEVEMENT_BY_ID, type AchievementId } from "./catalog";

export interface AwardContext {
  userId: string;
  color: "w" | "b";
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW" | "ABORTED";
  category: string;
  rated: boolean;
  termination: string;
  /** Rating in this category immediately before/after this game — only set for rated games — used to detect milestone crossings. */
  ratingBefore?: number;
  ratingAfter?: number;
}

const RATING_MILESTONES: { threshold: number; id: AchievementId }[] = [
  { threshold: 1200, id: "rating_1200" },
  { threshold: 1400, id: "rating_1400" },
  { threshold: 1600, id: "rating_1600" },
  { threshold: 1800, id: "rating_1800" },
  { threshold: 2000, id: "rating_2000" },
];

/** Checks the just-saved game against the achievement rules and awards any newly-earned ones (idempotent). */
export async function checkAndAwardAchievements(ctx: AwardContext): Promise<AchievementId[]> {
  if (ctx.result === "ABORTED" || ctx.userId.startsWith("guest:")) return [];
  const { userId, color, result, category, rated, termination } = ctx;
  const won = (result === "WHITE_WINS") === (color === "w");
  const drew = result === "DRAW";

  const totalGames = await prisma.game.count({
    where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" } },
  });

  const toAward: AchievementId[] = [];
  if (totalGames >= 1) toAward.push("first_game");
  if (totalGames >= 10) toAward.push("ten_games");
  if (totalGames >= 50) toAward.push("fifty_games");

  if (won) {
    toAward.push("first_win");
    if (termination === "Checkmate") toAward.push("checkmate_win");
    if (rated) {
      if (category === "bullet") toAward.push("bullet_win");
      if (category === "blitz") toAward.push("blitz_win");
      if (category === "rapid") toAward.push("rapid_win");
      if (category === "classical") toAward.push("classical_win");
    }

    const recent = await prisma.game.findMany({
      where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { result: true, whiteId: true },
    });
    let streak = 0;
    for (const g of recent) {
      const isWhite = g.whiteId === userId;
      const gWon = (g.result === "WHITE_WINS") === isWhite;
      if (gWon) streak++;
      else break;
    }
    if (streak >= 3) toAward.push("win_streak_3");
    if (streak >= 5) toAward.push("win_streak_5");
  }

  if (drew) toAward.push("first_draw");

  if (ctx.ratingBefore != null && ctx.ratingAfter != null) {
    for (const m of RATING_MILESTONES) {
      if (ctx.ratingBefore < m.threshold && ctx.ratingAfter >= m.threshold) toAward.push(m.id);
    }
  }

  if (toAward.length === 0) return [];

  const existing = await prisma.userAchievement.findMany({
    where: { userId, achievementId: { in: toAward } },
    select: { achievementId: true },
  });
  const already = new Set(existing.map((e) => e.achievementId));
  const newOnes = [...new Set(toAward)].filter((a) => !already.has(a));
  if (newOnes.length === 0) return [];

  await prisma.userAchievement.createMany({
    data: newOnes.map((achievementId) => ({ userId, achievementId })),
    skipDuplicates: true,
  });

  const rec = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, notifyAchievements: true } });
  if (rec?.notifyAchievements) {
    await prisma.notification.createMany({
      data: newOnes.map((id) => {
        const def = ACHIEVEMENT_BY_ID[id];
        return {
          userId,
          title: "Achievement unlocked",
          body: `${def.icon} ${def.name} — ${def.description}`,
          type: "ACHIEVEMENT" as const,
          href: rec.username ? `/u/${rec.username}` : "/account",
        };
      }),
    });
  }

  return newOnes;
}
