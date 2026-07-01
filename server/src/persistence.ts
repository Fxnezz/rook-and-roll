// Optional persistence: if DATABASE_URL is set AND @prisma/client is
// resolvable, finished rated games are stored and ratings updated. Otherwise
// the server runs fully in-memory (games just aren't saved).
//
// To enable: install @prisma/client in this package (or hoist from the root)
// and `prisma generate` against ../prisma/schema.prisma.

import { updateElo } from "./elo.js";
import type { GameRoom } from "./GameRoom.js";

type PrismaLike = {
  user: {
    findUnique: (a: unknown) => Promise<{ [k: string]: unknown } | null>;
    update: (a: unknown) => Promise<unknown>;
  };
  game: {
    create: (a: unknown) => Promise<{ id: string }>;
    count: (a: unknown) => Promise<number>;
  };
  ratingHistory: { create: (a: unknown) => Promise<unknown> };
};

let prisma: PrismaLike | null = null;
let enabled = false;

export async function initPersistence(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.log("[persistence] DATABASE_URL not set — games will not be saved.");
    return false;
  }
  try {
    const mod = await import("@prisma/client");
    const PrismaClient = (mod as { PrismaClient: new () => PrismaLike }).PrismaClient;
    prisma = new PrismaClient();
    enabled = true;
    console.log("[persistence] Prisma connected — rated games will be saved.");
    return true;
  } catch (e) {
    console.warn("[persistence] @prisma/client not available; persistence disabled.", (e as Error).message);
    return false;
  }
}

const FIELD: Record<string, string> = {
  bullet: "ratingBullet",
  blitz: "ratingBlitz",
  rapid: "ratingRapid",
  classical: "ratingClassical",
};

const RESULT_ENUM: Record<string, string> = {
  "1-0": "WHITE_WINS",
  "0-1": "BLACK_WINS",
  "1/2-1/2": "DRAW",
};

/** Persist a finished room and update Elo. Returns rating deltas if applied. */
export async function saveFinishedGame(
  room: GameRoom,
): Promise<{ white: number; black: number } | null> {
  if (!enabled || !prisma || !room.status) return null;
  const cat = room.timeControl.category;
  const field = FIELD[cat];
  const result = room.status.result;

  let whiteBefore: number | null = null;
  let blackBefore: number | null = null;
  let whiteAfter: number | null = null;
  let blackAfter: number | null = null;
  let deltas: { white: number; black: number } | null = null;

  const whiteReal = !room.white.userId.startsWith("guest:");
  const blackReal = !room.black.userId.startsWith("guest:");

  try {
    if (room.rated && field && whiteReal && blackReal && result !== undefined) {
      const [wu, bu] = await Promise.all([
        prisma.user.findUnique({ where: { id: room.white.userId } }),
        prisma.user.findUnique({ where: { id: room.black.userId } }),
      ]);
      if (wu && bu) {
        const wr = Number(wu[field] ?? 1200);
        const br = Number(bu[field] ?? 1200);
        const wScore = result === "1-0" ? 1 : result === "1/2-1/2" ? 0.5 : 0;
        const bScore = (1 - wScore) as 1 | 0.5 | 0;
        const [wGames, bGames] = await Promise.all([
          prisma.game.count({ where: { OR: [{ whiteId: room.white.userId }, { blackId: room.white.userId }], rated: true, category: cat } }),
          prisma.game.count({ where: { OR: [{ whiteId: room.black.userId }, { blackId: room.black.userId }], rated: true, category: cat } }),
        ]);
        const wUpd = updateElo(wr, br, wScore as 1 | 0.5 | 0, wGames);
        const bUpd = updateElo(br, wr, bScore, bGames);
        whiteBefore = wr;
        blackBefore = br;
        whiteAfter = wUpd.rating;
        blackAfter = bUpd.rating;
        deltas = { white: wUpd.delta, black: bUpd.delta };
        await Promise.all([
          prisma.user.update({ where: { id: room.white.userId }, data: { [field]: wUpd.rating } }),
          prisma.user.update({ where: { id: room.black.userId }, data: { [field]: bUpd.rating } }),
        ]);
      }
    }

    const game = await prisma.game.create({
      data: {
        whiteId: whiteReal ? room.white.userId : null,
        blackId: blackReal ? room.black.userId : null,
        whiteName: room.white.username,
        blackName: room.black.username,
        opponentType: "HUMAN",
        rated: room.rated && whiteReal && blackReal,
        category: cat,
        timeControl: room.timeControl.id,
        result: RESULT_ENUM[result],
        termination: room.status.reason,
        pgn: room.chess.pgn(),
        finalFen: room.chess.fen(),
        ply: room.moves().length,
        whiteRatingBefore: whiteBefore,
        blackRatingBefore: blackBefore,
        whiteRatingAfter: whiteAfter,
        blackRatingAfter: blackAfter,
      },
    });

    if (deltas) {
      await Promise.all([
        prisma.ratingHistory.create({
          data: { userId: room.white.userId, category: cat, rating: whiteAfter!, delta: deltas.white, gameId: game.id },
        }),
        prisma.ratingHistory.create({
          data: { userId: room.black.userId, category: cat, rating: blackAfter!, delta: deltas.black, gameId: game.id },
        }),
      ]);
    }
    return deltas;
  } catch (e) {
    console.error("[persistence] failed to save game", (e as Error).message);
    return null;
  }
}
