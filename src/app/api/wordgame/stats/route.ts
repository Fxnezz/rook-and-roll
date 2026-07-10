import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { dailyKey, MAX_GUESSES } from "@/lib/wordgame";

export const runtime = "nodejs";

const EMPTY_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDist: [0, 0, 0, 0, 0, 0],
  lastPlayedDate: null as string | null,
};

export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ stats: EMPTY_STATS, playedToday: false });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ stats: EMPTY_STATS, playedToday: false });

  const row = await prisma.wordGameStats.findUnique({ where: { userId: session.user.id } });
  const today = dailyKey();
  return NextResponse.json({
    stats: row ?? EMPTY_STATS,
    playedToday: row?.lastPlayedDate === today,
  });
}

/** Record a completed DAILY game. Practice-mode games aren't persisted (no streak implications). */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Sign in to save stats" }, { status: 401 });

  let body: { solved?: boolean; guessCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const solved = Boolean(body.solved);
  const guessCount = Math.round(Number(body.guessCount));
  const today = dailyKey();

  const existing = await prisma.wordGameStats.findUnique({ where: { userId: session.user.id } });
  if (existing?.lastPlayedDate === today) {
    // Already recorded today — return current stats rather than double-counting.
    return NextResponse.json({ ok: true, stats: existing });
  }

  const yesterday = dailyKey(new Date(Date.now() - 86_400_000));
  const continuedStreak = existing?.lastPlayedDate === yesterday;
  const currentStreak = solved ? (continuedStreak ? (existing?.currentStreak ?? 0) + 1 : 1) : 0;
  const guessDist = existing?.guessDist ? [...existing.guessDist] : [0, 0, 0, 0, 0, 0];
  if (solved && guessCount >= 1 && guessCount <= MAX_GUESSES) guessDist[guessCount - 1] += 1;

  const updated = await prisma.wordGameStats.upsert({
    where: { userId: session.user.id },
    update: {
      played: (existing?.played ?? 0) + 1,
      wins: (existing?.wins ?? 0) + (solved ? 1 : 0),
      currentStreak,
      maxStreak: Math.max(existing?.maxStreak ?? 0, currentStreak),
      guessDist,
      lastPlayedDate: today,
    },
    create: {
      userId: session.user.id,
      played: 1,
      wins: solved ? 1 : 0,
      currentStreak: solved ? 1 : 0,
      maxStreak: solved ? 1 : 0,
      guessDist,
      lastPlayedDate: today,
    },
  });

  // Also record on the shared arcade high-score ledger (best streak so far) so
  // Word Game participates in the same cross-game leaderboard infrastructure
  // as the rest of the arcade — additive, doesn't replace the richer
  // streak/guess-distribution stats tracked above.
  await prisma.highScore.create({ data: { userId: session.user.id, game: "wordle", score: updated.maxStreak, level: null } });

  return NextResponse.json({ ok: true, stats: updated });
}
