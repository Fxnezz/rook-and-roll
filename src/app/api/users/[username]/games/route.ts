import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { fetchGameHistory, type CategoryFilter, type ResultFilter } from "@/lib/games/history";

export const runtime = "nodejs";

const RESULT_FILTERS: ResultFilter[] = ["all", "win", "loss", "draw"];
const CATEGORY_FILTERS: CategoryFilter[] = ["all", "bullet", "blitz", "rapid", "classical", "untimed"];

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const resultParam = url.searchParams.get("result") ?? "all";
  const categoryParam = url.searchParams.get("category") ?? "all";
  const result = (RESULT_FILTERS as string[]).includes(resultParam) ? (resultParam as ResultFilter) : "all";
  const category = (CATEGORY_FILTERS as string[]).includes(categoryParam) ? (categoryParam as CategoryFilter) : "all";

  const { games, nextCursor } = await fetchGameHistory({ userId: user.id, cursor, limit, result, category });

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      whiteName: g.whiteName,
      blackName: g.blackName,
      whiteId: g.whiteId,
      blackId: g.blackId,
      result: g.result,
      termination: g.termination,
      category: g.category,
      timeControl: g.timeControl,
      rated: g.rated,
      ply: g.ply,
      createdAt: g.createdAt,
    })),
    nextCursor,
  });
}
