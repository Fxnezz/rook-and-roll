import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { ACHIEVEMENT_BY_ID, type AchievementId } from "@/lib/achievements/catalog";

export const runtime = "nodejs";

/** Board games with a bot opponent — the only mini-games with an unambiguous win/loss signal. */
const BOARD_GAME_KEYS = new Set([
  "amazons",
  "breakthrough",
  "checkers",
  "connect-four",
  "connect6",
  "domineering",
  "dots-and-boxes",
  "fanorona",
  "gomoku",
  "halma",
  "hex",
  "l-game",
  "lines-of-action",
  "mancala",
  "nim",
  "nine-mens-morris",
  "othello",
  "pentago",
  "quarto",
  "quoridor",
  "sim",
  "tic-tac-toe",
  "ultimate-tic-tac-toe",
  "y-game",
  "yavalath",
]);

/** Records a bot-mode board game win and checks/awards the two board-game achievements (idempotent). */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ achievements: [] });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ achievements: [] });

  let body: { game?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const game = String(body.game ?? "");
  if (!BOARD_GAME_KEYS.has(game)) return NextResponse.json({ error: "Unknown game" }, { status: 400 });

  const userId = session.user.id;
  await prisma.highScore.create({ data: { userId, game, score: 1, level: null } });

  const distinctWon = await prisma.highScore.findMany({
    where: { userId, game: { in: [...BOARD_GAME_KEYS] } },
    distinct: ["game"],
    select: { game: true },
  });

  const toAward: AchievementId[] = ["board_game_win"];
  if (distinctWon.length >= 5) toAward.push("five_board_games_won");

  const existing = await prisma.userAchievement.findMany({
    where: { userId, achievementId: { in: toAward } },
    select: { achievementId: true },
  });
  const already = new Set(existing.map((e) => e.achievementId));
  const newOnes = toAward.filter((a) => !already.has(a));
  if (newOnes.length === 0) return NextResponse.json({ achievements: [] });

  // The Achievement catalog isn't guaranteed to be seeded into the DB yet — ensure
  // the rows exist before referencing them from UserAchievement's foreign key.
  await Promise.all(
    newOnes.map((id) => {
      const def = ACHIEVEMENT_BY_ID[id];
      return prisma.achievement.upsert({
        where: { id },
        create: { id, name: def.name, description: def.description, category: def.category, icon: def.icon },
        update: {},
      });
    }),
  );

  await prisma.userAchievement.createMany({
    data: newOnes.map((achievementId) => ({ userId, achievementId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ achievements: newOnes });
}
