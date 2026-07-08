import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ResultFilter = "all" | "win" | "loss" | "draw";
export type CategoryFilter = "all" | "bullet" | "blitz" | "rapid" | "classical" | "untimed";

export interface GameHistoryQuery {
  userId: string;
  cursor?: string;
  limit?: number;
  result?: ResultFilter;
  category?: CategoryFilter;
}

function resultWhere(userId: string, result: ResultFilter | undefined): Prisma.GameWhereInput {
  switch (result) {
    case "win":
      return { OR: [{ whiteId: userId, result: "WHITE_WINS" }, { blackId: userId, result: "BLACK_WINS" }] };
    case "loss":
      return { OR: [{ whiteId: userId, result: "BLACK_WINS" }, { blackId: userId, result: "WHITE_WINS" }] };
    case "draw":
      return { OR: [{ whiteId: userId }, { blackId: userId }], result: "DRAW" };
    default:
      return { OR: [{ whiteId: userId }, { blackId: userId }] };
  }
}

export async function fetchGameHistory({ userId, cursor, limit = 20, result, category }: GameHistoryQuery) {
  const take = Math.min(Math.max(limit, 1), 50);
  const where: Prisma.GameWhereInput = {
    ...resultWhere(userId, result),
    ...(category && category !== "all" ? { category } : {}),
  };

  const games = await prisma.game.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = games.length > take;
  const page = hasMore ? games.slice(0, take) : games;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return { games: page, nextCursor };
}
