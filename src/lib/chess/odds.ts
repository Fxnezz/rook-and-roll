import type { Color } from "chess.js";

export type OddsId = "none" | "knight" | "rook" | "queen" | "queenRook";

export const ODDS_OPTIONS: { id: OddsId; label: string }[] = [
  { id: "none", label: "No odds" },
  { id: "knight", label: "Knight odds" },
  { id: "rook", label: "Rook odds" },
  { id: "queen", label: "Queen odds" },
  { id: "queenRook", label: "Queen + rook odds" },
];

const STANDARD_START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Squares (in the standard start position) removed from the handicapped side for each odds level. */
const ODDS_SQUARES: Record<Exclude<OddsId, "none">, (color: Color) => string[]> = {
  knight: (c) => [c === "w" ? "b1" : "b8"],
  rook: (c) => [c === "w" ? "a1" : "a8"],
  queen: (c) => [c === "w" ? "d1" : "d8"],
  queenRook: (c) => [c === "w" ? "d1" : "d8", c === "w" ? "a1" : "a8"],
};

function removeSquares(placement: string, squares: Set<string>): string {
  const ranks = placement.split("/");
  const out: string[] = [];
  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    const rankNum = 8 - rankIdx;
    let file = 0;
    let empties = 0;
    let row = "";
    for (const ch of ranks[rankIdx]) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) {
          empties++;
          file++;
        }
        continue;
      }
      const square = "abcdefgh"[file] + String(rankNum);
      if (squares.has(square)) {
        empties++;
      } else {
        if (empties) {
          row += empties;
          empties = 0;
        }
        row += ch;
      }
      file++;
    }
    if (empties) row += empties;
    out.push(row);
  }
  return out.join("/");
}

/**
 * Starting FEN with the given odds handicap removed from `handicappedColor`'s
 * side. Returns null for "none" (caller should use the ordinary start
 * position). Removing the a-file rook also drops that side's queenside
 * castling right so the FEN stays internally consistent.
 */
export function oddsStartFen(handicappedColor: Color, odds: OddsId): string | null {
  if (odds === "none") return null;
  const squares = new Set(ODDS_SQUARES[odds](handicappedColor));
  const [placement, turn, castling, ep, half, full] = STANDARD_START.split(" ");
  const newPlacement = removeSquares(placement, squares);
  let newCastling = castling;
  if (odds === "rook" || odds === "queenRook") {
    newCastling = newCastling.replace(handicappedColor === "w" ? "Q" : "q", "");
  }
  if (newCastling === "") newCastling = "-";
  return [newPlacement, turn, newCastling, ep, half, full].join(" ");
}
