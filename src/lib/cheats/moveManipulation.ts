import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

/**
 * Board-manipulation cheats for bot games — all operate on a FEN string and
 * return a new one, bypassing normal chess.js move legality entirely (that's
 * the point). Scoped to solo vs-Stockfish games only; never wired into any
 * multiplayer/synced game state.
 */

function stripCastlingRights(fen: string, color: Color): string {
  const parts = fen.split(" ");
  const remove = color === "w" ? ["K", "Q"] : ["k", "q"];
  parts[2] = [...parts[2]].filter((c) => !remove.includes(c)).join("") || "-";
  return parts.join(" ");
}

export function illegalCastleFen(fen: string, color: Color, side: "k" | "q"): string | null {
  const g = new Chess(fen);
  const backRank = color === "w" ? "1" : "8";
  const kingFrom = `e${backRank}` as Square;
  const rookFrom = (side === "k" ? `h${backRank}` : `a${backRank}`) as Square;
  const kingTo = (side === "k" ? `g${backRank}` : `c${backRank}`) as Square;
  const rookTo = (side === "k" ? `f${backRank}` : `d${backRank}`) as Square;

  const king = g.get(kingFrom);
  const rook = g.get(rookFrom);
  if (!king || king.type !== "k" || king.color !== color) return null;
  if (!rook || rook.type !== "r" || rook.color !== color) return null;

  g.remove(kingFrom);
  g.remove(rookFrom);
  g.put({ type: "k", color }, kingTo);
  g.put({ type: "r", color }, rookTo);
  return stripCastlingRights(g.fen(), color);
}

export function clonePieceFen(fen: string, from: Square, to: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(from);
  if (!piece) return null;
  const ok = g.put({ type: piece.type, color: piece.color }, to);
  return ok ? g.fen() : null;
}

export function swapPiecesFen(fen: string, sq1: Square, sq2: Square): string {
  const g = new Chess(fen);
  const p1 = g.get(sq1);
  const p2 = g.get(sq2);
  g.remove(sq1);
  g.remove(sq2);
  if (p2) g.put({ type: p2.type, color: p2.color }, sq1);
  if (p1) g.put({ type: p1.type, color: p1.color }, sq2);
  return g.fen();
}

export function promoteAnyPawnFen(fen: string, square: Square, to: Exclude<PieceSymbol, "p" | "k">): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type !== "p") return null;
  g.remove(square);
  const ok = g.put({ type: to, color: piece.color }, square);
  return ok ? g.fen() : null;
}
