import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** A random past game (with real move history) for the "guess the move" trainer. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ error: "Not available" }, { status: 503 });

  const userId = session.user.id;
  const count = await prisma.game.count({
    where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" }, ply: { gte: 10 } },
  });
  if (count === 0) return NextResponse.json({ game: null });

  const game = await prisma.game.findFirst({
    where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" }, ply: { gte: 10 } },
    skip: Math.floor(Math.random() * count),
    select: { id: true, whiteId: true, whiteName: true, blackName: true, pgn: true, opening: true, createdAt: true },
  });
  if (!game) return NextResponse.json({ game: null });

  return NextResponse.json({
    game: {
      id: game.id,
      yourColor: game.whiteId === userId ? "w" : "b",
      whiteName: game.whiteName,
      blackName: game.blackName,
      pgn: game.pgn,
      opening: game.opening,
      createdAt: game.createdAt,
    },
  });
}
