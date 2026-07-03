// Optional persistence for the generic board games (Connect Four, Checkers).
// Reuses the same Prisma connection as chess's persistence.ts; a no-op when
// no database is configured (rated play simply doesn't update anything).
import { getPrisma } from "../persistence.js";
import { updateElo } from "../elo.js";
import type { MatchRoom } from "./MatchRoom.js";

type GameRatingClient = {
  gameRating: {
    findUnique: (a: unknown) => Promise<{ rating: number; wins: number; losses: number; draws: number } | null>;
    upsert: (a: unknown) => Promise<unknown>;
  };
};

/** Real (non-guest) user ids look like cuids; guests are prefixed "guest:". */
function isRealUser(userId: string): boolean {
  return !userId.startsWith("guest:") && !userId.startsWith("spectator:");
}

/**
 * Applies Elo to both players (if rated + both are real accounts) and updates
 * their win/loss/draw counts. `game` is the rating category, e.g. "connect4".
 */
export async function saveBoardGameResult(
  game: string,
  room: MatchRoom<unknown, unknown>,
): Promise<{ a: number; b: number } | null> {
  const prisma = getPrisma() as unknown as GameRatingClient | null;
  if (!prisma || !room.status) return null;

  const aReal = isRealUser(room.a.userId);
  const bReal = isRealUser(room.b.userId);
  if (!room.rated || !aReal || !bReal) return null;

  try {
    const [aRow, bRow] = await Promise.all([
      prisma.gameRating.findUnique({ where: { userId_game: { userId: room.a.userId, game } } }),
      prisma.gameRating.findUnique({ where: { userId_game: { userId: room.b.userId, game } } }),
    ]);
    const aRating = aRow?.rating ?? 1200;
    const bRating = bRow?.rating ?? 1200;
    const aGames = (aRow?.wins ?? 0) + (aRow?.losses ?? 0) + (aRow?.draws ?? 0);
    const bGames = (bRow?.wins ?? 0) + (bRow?.losses ?? 0) + (bRow?.draws ?? 0);

    const aScore: 1 | 0.5 | 0 = room.status.winner === "a" ? 1 : room.status.winner === null ? 0.5 : 0;
    const bScore: 1 | 0.5 | 0 = (1 - aScore) as 1 | 0.5 | 0;
    const aUpd = updateElo(aRating, bRating, aScore, aGames);
    const bUpd = updateElo(bRating, aRating, bScore, bGames);

    const bump = (row: typeof aRow, score: 1 | 0.5 | 0) => ({
      wins: (row?.wins ?? 0) + (score === 1 ? 1 : 0),
      losses: (row?.losses ?? 0) + (score === 0 ? 1 : 0),
      draws: (row?.draws ?? 0) + (score === 0.5 ? 1 : 0),
    });
    const aBump = bump(aRow, aScore);
    const bBump = bump(bRow, bScore);

    await Promise.all([
      prisma.gameRating.upsert({
        where: { userId_game: { userId: room.a.userId, game } },
        update: { rating: aUpd.rating, ...aBump },
        create: { userId: room.a.userId, game, rating: aUpd.rating, ...aBump },
      }),
      prisma.gameRating.upsert({
        where: { userId_game: { userId: room.b.userId, game } },
        update: { rating: bUpd.rating, ...bBump },
        create: { userId: room.b.userId, game, rating: bUpd.rating, ...bBump },
      }),
    ]);

    return { a: aUpd.delta, b: bUpd.delta };
  } catch (e) {
    console.error("[boardgames/persistence] failed to save result", (e as Error).message);
    return null;
  }
}
