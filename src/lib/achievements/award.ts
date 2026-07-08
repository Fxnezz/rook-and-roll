import { prisma } from "@/lib/db/prisma";
import type { AchievementId } from "./catalog";

export interface AwardContext {
  userId: string;
  color: "w" | "b";
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW" | "ABORTED";
  category: string;
  rated: boolean;
  termination: string;
}

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

  return newOnes;
}
