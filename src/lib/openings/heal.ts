import { Chess } from "chess.js";
import { prisma } from "@/lib/db/prisma";
import { openingFor } from "./index";

export interface HealableGame {
  id: string;
  pgn: string;
  opening: string | null;
  eco: string | null;
}

/**
 * Fill in the opening/eco columns for rows saved without them (online games
 * are written by the realtime server, which doesn't carry the opening book;
 * older rows predate the columns entirely). Mutates the passed rows so the
 * caller can render the computed values immediately, and persists them
 * fire-and-forget so each game is only ever computed once.
 */
export function ensureOpenings<T extends HealableGame>(games: T[]): T[] {
  const updates: { id: string; opening: string; eco: string }[] = [];
  for (const g of games) {
    if (g.opening !== null || !g.pgn) continue;
    try {
      const chess = new Chess();
      chess.loadPgn(g.pgn);
      const op = openingFor(chess.history());
      if (op) {
        g.opening = op.name;
        g.eco = op.eco;
        updates.push({ id: g.id, opening: op.name, eco: op.eco });
      }
    } catch {
      /* unparseable PGN — leave as-is */
    }
  }
  if (updates.length > 0) {
    Promise.all(
      updates.map((u) =>
        prisma.game.update({ where: { id: u.id }, data: { opening: u.opening, eco: u.eco } }),
      ),
    ).catch(() => {});
  }
  return games;
}
