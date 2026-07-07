import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

/** Recent puzzle attempts for the signed-in user, most recent first. */
export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ attempts: [] });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ attempts: [] });

  const attempts = await prisma.puzzleAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { puzzle: { select: { rating: true, themes: true } } },
  });

  return NextResponse.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      puzzleId: a.puzzleId,
      solved: a.solved,
      ratingBefore: a.ratingBefore,
      ratingAfter: a.ratingAfter,
      createdAt: a.createdAt.toISOString(),
      puzzleRating: a.puzzle.rating,
      themes: a.puzzle.themes,
    })),
  });
}
