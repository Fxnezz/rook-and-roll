import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const GAMES = new Set([
  "snake",
  "tetris",
  "2048",
  "racing",
  "platformer",
  "minesweeper",
  "memorymatch",
  "15puzzle",
  "simon",
  "sudoku",
  "solitaire",
  "breakout",
  "whackamole",
  "hangman",
  "blackjack",
  "yahtzee",
  "freecell",
  "klotski",
  "flappyrook",
  "pegsolitaire",
  "lightsout",
  "hanoi",
  "mastermind",
  "battleship",
  "videopoker",
  "war",
  "pyramidsolitaire",
  "pong",
  "spaceinvaders",
  "sokoban",
  "floodit",
]);
const LOWER_IS_BETTER = new Set([
  "minesweeper",
  "memorymatch",
  "15puzzle",
  "sudoku",
  "solitaire",
  "freecell",
  "klotski",
  "pegsolitaire",
  "lightsout",
  "hanoi",
  "mastermind",
  "battleship",
  "war",
  "pyramidsolitaire",
  "sokoban",
  "floodit",
]);

/** Personal best (+ top-10 leaderboard) for a game, optionally scoped to a level. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game") ?? "";
  const level = url.searchParams.get("level");
  if (!GAMES.has(game)) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  if (!isDbConfigured) return NextResponse.json({ best: null, leaderboard: [] });

  const session = await auth();
  // Platformer is time-based (lower is better) per hand-built/random level,
  // except the "infinite" bucket which scores distance (higher is better).
  const higherIsBetter =
    game === "platformer" ? level === "infinite" : !(game === "racing" || LOWER_IS_BETTER.has(game));

  const [best, leaderboard] = await Promise.all([
    session?.user?.id
      ? prisma.highScore.findFirst({
          where: { userId: session.user.id, game, level: level ?? null },
          orderBy: { score: higherIsBetter ? "desc" : "asc" },
        })
      : null,
    prisma.highScore.findMany({
      where: { game, level: level ?? null },
      orderBy: { score: higherIsBetter ? "desc" : "asc" },
      take: 10,
      include: { user: { select: { username: true } } },
    }),
  ]);

  return NextResponse.json({
    best: best?.score ?? null,
    leaderboard: leaderboard.map((s) => ({ username: s.user.username, score: s.score })),
  });
}

/** Submit a score. Always recorded — the API/UI decide what counts as a "new best". */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Sign in to save scores" }, { status: 401 });

  let body: { game?: string; score?: number; level?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const game = String(body.game ?? "");
  if (!GAMES.has(game)) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  const score = Math.round(Number(body.score));
  if (!Number.isFinite(score) || score < 0) return NextResponse.json({ error: "Bad score" }, { status: 400 });

  await prisma.highScore.create({
    data: { userId: session.user.id, game, score, level: body.level ?? null },
  });
  return NextResponse.json({ ok: true });
}
