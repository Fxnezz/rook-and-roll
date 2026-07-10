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

/** Relocates a piece from `from` to `to`, bypassing legality/turn rules entirely — the same escape hatch as the cheats above. */
export function forceMoveFen(fen: string, from: Square, to: Square, promotion?: Exclude<PieceSymbol, "p" | "k">): string | null {
  const g = new Chess(fen);
  const piece = g.get(from);
  if (!piece) return null;
  g.remove(from);
  g.remove(to);
  const ok = g.put({ type: promotion ?? piece.type, color: piece.color }, to);
  return ok ? g.fen() : null;
}

// ---------------------------------------------------------------------------
// 40 more move-related trolls — real board mutations (not the cosmetic-only
// troll:effect catalog). Same rules as everything above: pure FEN in, FEN (or
// null) out, built entirely on chess.js's get/put/remove. The one universal
// safety rule — never remove or strand a king — is enforced individually in
// each function below; the two whole-board transforms (mirror, invert
// colors) move/recolor both kings symmetrically instead of excluding them,
// which keeps the "exactly one king per color" FEN invariant intact.
// ---------------------------------------------------------------------------

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function squaresInRank(rank: number): Square[] {
  return FILES.map((f) => `${f}${rank}` as Square);
}

function squaresInFile(file: string): Square[] {
  return Array.from({ length: 8 }, (_, i) => `${file}${i + 1}` as Square);
}

function emptySquares(g: Chess): Square[] {
  const out: Square[] = [];
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = `${file}${rank}` as Square;
      if (!g.get(sq)) out.push(sq);
    }
  }
  return out;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Removes the piece at `square` outright — the "steal a piece" cheat. Refuses on an empty square or a king. */
export function stealPieceFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type === "k") return null;
  g.remove(square);
  return g.fen();
}

/** Steals a random non-king piece from anywhere on the board. */
export function stealRandomPieceFen(fen: string): string | null {
  const g = new Chess(fen);
  const targets = g
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.type !== "k");
  if (targets.length === 0) return null;
  const target = targets[Math.floor(Math.random() * targets.length)];
  return stealPieceFen(fen, target.square as Square);
}

/**
 * Places an inert knight of `color` on `square` — the "block a square"
 * cheat. Knight, not pawn: chess.js's FEN validation forbids pawns on rank
 * 1/8, which would break barricading the back ranks. No new validation
 * layer needed beyond that: once placed, chess.js's own move generator
 * treats the square as occupied for every future legality check, naturally
 * blocking sliding pieces from landing on or passing through it.
 */
export function blockSquareFen(fen: string, square: Square, color: Color): string | null {
  const g = new Chess(fen);
  if (g.get(square)?.type === "k") return null;
  g.remove(square);
  const ok = g.put({ type: "n", color }, square);
  return ok ? g.fen() : null;
}

/** Barricades every non-king square of `rank` with an inert pawn of `color`. */
export function barricadeRankFen(fen: string, rank: number, color: Color): string {
  let cur = fen;
  for (const sq of squaresInRank(rank)) {
    cur = blockSquareFen(cur, sq, color) ?? cur;
  }
  return cur;
}

/** Barricades an arbitrary list of squares (used for "barricade the center", corner rings, etc). */
export function barricadeSquaresFen(fen: string, squares: Square[], color: Color): string {
  let cur = fen;
  for (const sq of squares) {
    cur = blockSquareFen(cur, sq, color) ?? cur;
  }
  return cur;
}

/** Clones the piece at `square` onto a random empty square — an auto-targeted variant of `clonePieceFen`. */
export function duplicateToRandomFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece) return null;
  const empties = emptySquares(g);
  if (empties.length === 0) return null;
  const to = empties[Math.floor(Math.random() * empties.length)];
  const ok = g.put({ type: piece.type, color: piece.color }, to);
  return ok ? g.fen() : null;
}

/** Relocates the piece at `square` to a random empty square — an auto-targeted variant of `forceMoveFen`. */
export function teleportToRandomFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece) return null;
  const empties = emptySquares(g);
  if (empties.length === 0) return null;
  const to = empties[Math.floor(Math.random() * empties.length)];
  g.remove(square);
  const ok = g.put({ type: piece.type, color: piece.color }, to);
  return ok ? g.fen() : null;
}

const TIER_DOWN: Record<Exclude<PieceSymbol, "p" | "k">, PieceSymbol> = { q: "r", r: "b", b: "n", n: "p" };
const TIER_UP: Record<Exclude<PieceSymbol, "q" | "k">, PieceSymbol> = { p: "n", n: "b", b: "r", r: "q" };

/** Downgrades a piece one tier: Q→R→B→N→P. Refuses on a pawn or king (already at/below the floor). */
export function demotePieceFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type === "k" || piece.type === "p") return null;
  g.remove(square);
  const ok = g.put({ type: TIER_DOWN[piece.type], color: piece.color }, square);
  return ok ? g.fen() : null;
}

/** Upgrades a piece one tier: P→N→B→R→Q. Refuses on a queen or king (already at/above the ceiling). */
export function upgradePieceFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type === "k" || piece.type === "q") return null;
  g.remove(square);
  const ok = g.put({ type: TIER_UP[piece.type], color: piece.color }, square);
  return ok ? g.fen() : null;
}

const NON_KING_TYPES: PieceSymbol[] = ["p", "n", "b", "r", "q"];

/** Replaces the piece at `square` with a random different type of the same color. Refuses on a king. */
export function mutatePieceFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type === "k") return null;
  const choices = NON_KING_TYPES.filter((t) => t !== piece.type);
  const next = choices[Math.floor(Math.random() * choices.length)];
  g.remove(square);
  const ok = g.put({ type: next, color: piece.color }, square);
  return ok ? g.fen() : null;
}

/** Flips one piece's color in place — "defection". Refuses on a king. */
export function defectPieceFen(fen: string, square: Square): string | null {
  const g = new Chess(fen);
  const piece = g.get(square);
  if (!piece || piece.type === "k") return null;
  const other: Color = piece.color === "w" ? "b" : "w";
  g.remove(square);
  const ok = g.put({ type: piece.type, color: other }, square);
  return ok ? g.fen() : null;
}

/** Randomly permutes `color`'s non-king back-rank pieces among their own current squares — the king never moves. */
export function shuffleBackRankFen(fen: string, color: Color): string {
  const g = new Chess(fen);
  const rank = color === "w" ? 1 : 8;
  const squares = squaresInRank(rank).filter((sq) => {
    const p = g.get(sq);
    return p && p.color === color && p.type !== "k";
  });
  if (squares.length < 2) return fen;
  const pieces = squares.map((sq) => g.get(sq)!);
  const mixed = shuffled(pieces);
  squares.forEach((sq) => g.remove(sq));
  squares.forEach((sq, i) => g.put({ type: mixed[i].type, color: mixed[i].color }, sq));
  return g.fen();
}

/** Randomly permutes `color`'s pawns among their own current squares. */
export function shufflePawnsFen(fen: string, color: Color): string {
  const g = new Chess(fen);
  const squares: Square[] = [];
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = `${file}${rank}` as Square;
      const p = g.get(sq);
      if (p && p.color === color && p.type === "p") squares.push(sq);
    }
  }
  if (squares.length < 2) return fen;
  const pieces = squares.map((sq) => g.get(sq)!);
  const mixed = shuffled(squares);
  squares.forEach((sq) => g.remove(sq));
  mixed.forEach((sq, i) => g.put({ type: pieces[i].type, color: pieces[i].color }, sq));
  return g.fen();
}

/**
 * Mirrors the real position left-right (every piece, kings included, moves
 * to its mirrored file) — distinct from the cosmetic `flipBoard` troll
 * effect, which only flips the client's view without touching game state.
 * Castling rights and the en passant square are cleared since they're no
 * longer meaningful after a mirror.
 */
export function mirrorPositionFen(fen: string): string {
  const g = new Chess(fen);
  const board = g.board();
  const mirrored = new Chess();
  mirrored.clear();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const sq = `${FILES[7 - f]}${8 - r}` as Square;
      mirrored.put({ type: piece.type, color: piece.color }, sq);
    }
  }
  const parts = fen.split(" ");
  const out = mirrored.fen().split(" ");
  out[1] = parts[1];
  out[2] = "-";
  out[3] = "-";
  out[4] = parts[4];
  out[5] = parts[5];
  return out.join(" ");
}

/**
 * Flips every piece's color, kings included — both kings swap color
 * together so "exactly one king per color" still holds. Whole-board
 * defection, distinct from the single-piece `defectPieceFen`.
 */
export function invertAllColorsFen(fen: string): string {
  const g = new Chess(fen);
  const board = g.board();
  const flipped = new Chess();
  flipped.clear();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const sq = `${FILES[f]}${8 - r}` as Square;
      const other: Color = piece.color === "w" ? "b" : "w";
      flipped.put({ type: piece.type, color: other }, sq);
    }
  }
  const parts = fen.split(" ");
  const out = flipped.fen().split(" ");
  out[1] = parts[1];
  out[2] = "-";
  out[3] = "-";
  out[4] = parts[4];
  out[5] = parts[5];
  return out.join(" ");
}

/** Swaps the entire contents of two ranks (safe even if a king sits on one — it's a full swap, not a removal). */
export function swapRanksFen(fen: string, rank1: number, rank2: number): string {
  const g = new Chess(fen);
  const sq1s = squaresInRank(rank1);
  const sq2s = squaresInRank(rank2);
  const p1 = sq1s.map((sq) => g.get(sq));
  const p2 = sq2s.map((sq) => g.get(sq));
  sq1s.forEach((sq) => g.remove(sq));
  sq2s.forEach((sq) => g.remove(sq));
  sq1s.forEach((sq, i) => {
    if (p2[i]) g.put({ type: p2[i]!.type, color: p2[i]!.color }, sq);
  });
  sq2s.forEach((sq, i) => {
    if (p1[i]) g.put({ type: p1[i]!.type, color: p1[i]!.color }, sq);
  });
  return g.fen();
}

/** Swaps the entire contents of two files. */
export function swapFilesFen(fen: string, file1: string, file2: string): string {
  const g = new Chess(fen);
  const sq1s = squaresInFile(file1);
  const sq2s = squaresInFile(file2);
  const p1 = sq1s.map((sq) => g.get(sq));
  const p2 = sq2s.map((sq) => g.get(sq));
  sq1s.forEach((sq) => g.remove(sq));
  sq2s.forEach((sq) => g.remove(sq));
  sq1s.forEach((sq, i) => {
    if (p2[i]) g.put({ type: p2[i]!.type, color: p2[i]!.color }, sq);
  });
  sq2s.forEach((sq, i) => {
    if (p1[i]) g.put({ type: p1[i]!.type, color: p1[i]!.color }, sq);
  });
  return g.fen();
}

/** Adds an extra piece of `color`/`type` on a random empty square — "bonus queen", "bonus rook", etc. */
export function addBonusPieceFen(fen: string, color: Color, type: Exclude<PieceSymbol, "k">): string | null {
  const g = new Chess(fen);
  const empties = emptySquares(g);
  if (empties.length === 0) return null;
  const sq = empties[Math.floor(Math.random() * empties.length)];
  const ok = g.put({ type, color }, sq);
  return ok ? g.fen() : null;
}

/** Removes every pawn belonging to `color`. */
export function stripPawnsFen(fen: string, color: Color): string {
  const g = new Chess(fen);
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = `${file}${rank}` as Square;
      const p = g.get(sq);
      if (p && p.color === color && p.type === "p") g.remove(sq);
    }
  }
  return g.fen();
}

/** Clears every non-king piece in the 2×2 block anchored at `square` (up and to the right, clipped at board edges). */
export function nukeAreaFen(fen: string, square: Square): string {
  const g = new Chess(fen);
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]);
  for (let df = 0; df <= 1; df++) {
    for (let dr = 0; dr <= 1; dr++) {
      const f = file + df;
      const r = rank + dr;
      if (f < 0 || f > 7 || r < 1 || r > 8) continue;
      const sq = `${FILES[f]}${r}` as Square;
      if (g.get(sq)?.type !== "k") g.remove(sq);
    }
  }
  return g.fen();
}

/** Clears the en passant target square — a subtle rules-only troll with no piece movement. */
export function scrambleEnPassantFen(fen: string): string {
  const parts = fen.split(" ");
  parts[3] = "-";
  return parts.join(" ");
}
