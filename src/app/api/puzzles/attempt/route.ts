import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getPuzzle } from "@/lib/puzzles";

export const runtime = "nodejs";

/**
 * Records a puzzle attempt for a signed-in user and syncs their puzzle
 * rating/streak. Guests track progress in localStorage only.
 */
export async function POST(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { puzzleId?: string; solved?: boolean; ratingBefore?: number; ratingAfter?: number; streak?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const def = getPuzzle(String(body.puzzleId ?? ""));
  if (!def) return NextResponse.json({ error: "Unknown puzzle" }, { status: 400 });
  const ratingAfter = Math.max(100, Math.min(3500, Math.round(Number(body.ratingAfter ?? 1000))));
  const streak = Math.max(0, Math.round(Number(body.streak ?? 0)));

  try {
    // The static bank lives in code; mirror the puzzle row on demand so
    // attempts have a foreign key to point at.
    await prisma.puzzle.upsert({
      where: { id: def.id },
      update: {},
      create: { id: def.id, fen: def.fen, solution: def.solution, themes: def.themes, rating: def.rating },
    });
    await prisma.puzzleAttempt.create({
      data: {
        userId: session.user.id,
        puzzleId: def.id,
        solved: Boolean(body.solved),
        ratingBefore: Math.round(Number(body.ratingBefore ?? 1000)),
        ratingAfter,
      },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { puzzleRating: ratingAfter, puzzleStreak: streak },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("puzzle attempt failed", e);
    return NextResponse.json({ error: "Could not record attempt" }, { status: 500 });
  }
}
