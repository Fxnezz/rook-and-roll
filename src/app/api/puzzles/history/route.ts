import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

/** Recent puzzle attempts for the signed-in user, most recent first. `?before=<ISO createdAt>` fetches the next older page. */
export async function GET(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ attempts: [], hasMore: false });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ attempts: [], hasMore: false });

  const url = new URL(req.url);
  const beforeParam = url.searchParams.get("before");
  const before = beforeParam ? new Date(beforeParam) : null;

  const page = await prisma.puzzleAttempt.findMany({
    where: {
      userId: session.user.id,
      ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    include: { puzzle: { select: { rating: true, themes: true } } },
  });

  const hasMore = page.length > PAGE_SIZE;
  const attempts = hasMore ? page.slice(0, PAGE_SIZE) : page;

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
    hasMore,
  });
}
