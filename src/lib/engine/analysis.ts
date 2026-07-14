import { Chess, type Color } from "chess.js";
import type { StockfishEngine } from "./stockfish";

export type MoveQuality = "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface AnalyzedMove {
  ply: number; // 1-based
  san: string;
  color: Color;
  uci: string;
  bestUci: string;
  /** position before the move was played — lets the UI offer "retry from here" */
  beforeFen: string;
  /** eval after the move, White's perspective, centipawns (mate mapped) */
  evalCp: number;
  /** centipawns lost vs. the engine's preferred continuation */
  cpLoss: number;
  quality: MoveQuality;
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  summary: Record<Color, Record<MoveQuality, number>>;
  accuracy: Record<Color, number>;
}

const MATE_CP = 10_000;

export function toCpWhite(cp: number | null, mate: number | null): number {
  if (mate != null) return mate > 0 ? MATE_CP - mate : -MATE_CP - mate;
  return cp ?? 0;
}

const PIECE_CP: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900 };

/** Material on the board in centipawns, per side, read straight off a FEN. */
export function materialFromFen(fen: string): Record<Color, number> {
  const placement = fen.split(" ")[0];
  const out: Record<Color, number> = { w: 0, b: 0 };
  for (const ch of placement) {
    const val = PIECE_CP[ch.toLowerCase()];
    if (!val) continue;
    out[ch === ch.toLowerCase() ? "b" : "w"] += val;
  }
  return out;
}

/**
 * FEN with the side to move flipped (en passant cleared, halfmove reset), used
 * to ask the engine "what is the opponent threatening if I pass?". Returns
 * null when the resulting position is illegal — i.e. the mover is currently in
 * check, where the concept of a quiet threat doesn't apply.
 */
export function threatFen(fen: string): string | null {
  const parts = fen.split(" ");
  if (parts.length < 4) return null;
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-"; // en passant is meaningless after a null move
  const flipped = parts.join(" ");
  // Illegal iff the side now NOT to move is in check — chess.js rejects that.
  try {
    new Chess(flipped);
    return flipped;
  } catch {
    return null;
  }
}

export function classify(cpLoss: number, isBest: boolean): MoveQuality {
  if (isBest || cpLoss < 20) return "best";
  if (cpLoss < 70) return "good";
  if (cpLoss < 150) return "inaccuracy";
  if (cpLoss < 300) return "mistake";
  return "blunder";
}

/** Convert per-move average centipawn loss into a 0–100 accuracy figure. */
function accuracyFromAcpl(acpl: number): number {
  // Lichess-style curve, lightly tuned.
  const acc = 103.1668 * Math.exp(-0.04354 * (acpl / 1)) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(acc)));
}

export interface AnalysisInput {
  /** FEN before each move; length = moves.length + 1 */
  positions: string[];
  moves: { san: string; uci: string; color: Color }[];
}

/**
 * Evaluate every position once and derive per-move quality from the delta
 * between the engine's best continuation and what was actually played.
 */
export async function analyzeGame(
  engine: StockfishEngine,
  input: AnalysisInput,
  opts: { depth?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<GameAnalysis> {
  const depth = opts.depth ?? 12;
  const evalsWhite: number[] = [];
  const bestUcis: string[] = [];

  for (let i = 0; i < input.positions.length; i++) {
    const res = await engine.go(input.positions[i], { depth, multipv: 1 });
    const line = res.lines[0];
    const whiteToMove = input.positions[i].split(" ")[1] === "w";
    const sign = whiteToMove ? 1 : -1;
    evalsWhite.push(toCpWhite(line?.cp ?? 0, line?.mate ?? null) * sign);
    bestUcis.push(res.bestmove);
    opts.onProgress?.(i + 1, input.positions.length);
  }

  const moves: AnalyzedMove[] = [];
  const summary: GameAnalysis["summary"] = {
    w: { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    b: { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  };
  const lossSum: Record<Color, number> = { w: 0, b: 0 };
  const lossCount: Record<Color, number> = { w: 0, b: 0 };

  for (let i = 0; i < input.moves.length; i++) {
    const mv = input.moves[i];
    const before = evalsWhite[i]; // white POV, best play, mover to move
    const after = evalsWhite[i + 1];
    const moverPovBefore = mv.color === "w" ? before : -before;
    const moverPovAfter = mv.color === "w" ? after : -after;
    const cpLoss = Math.max(0, Math.round(moverPovBefore - moverPovAfter));
    const isBest = mv.uci === bestUcis[i];
    let quality = classify(cpLoss, isBest);
    // Brilliant: the engine's own choice, still fine after the reply, and it
    // deliberately gives up at least a minor exchange (material two plies on
    // is down ≥2 pawns) from a position that wasn't already trivially won.
    if (quality === "best" && isBest && i + 2 < input.positions.length && moverPovBefore < 700 && moverPovAfter > -60) {
      const matBefore = materialFromFen(input.positions[i]);
      const matAfterReply = materialFromFen(input.positions[i + 2]);
      const opp: Color = mv.color === "w" ? "b" : "w";
      const relBefore = matBefore[mv.color] - matBefore[opp];
      const relAfterReply = matAfterReply[mv.color] - matAfterReply[opp];
      if (relBefore - relAfterReply >= 200) quality = "brilliant";
    }
    summary[mv.color][quality] += 1;
    lossSum[mv.color] += cpLoss;
    lossCount[mv.color] += 1;
    moves.push({
      ply: i + 1,
      san: mv.san,
      color: mv.color,
      uci: mv.uci,
      bestUci: bestUcis[i],
      beforeFen: input.positions[i],
      evalCp: after,
      cpLoss,
      quality,
    });
  }

  return {
    moves,
    summary,
    accuracy: {
      w: accuracyFromAcpl(lossCount.w ? lossSum.w / lossCount.w : 0),
      b: accuracyFromAcpl(lossCount.b ? lossSum.b / lossCount.b : 0),
    },
  };
}

export interface KeyMoment {
  ply: number;
  san: string;
  color: Color;
  /** signed eval change caused by this move, White's perspective, centipawns */
  swingCp: number;
  quality: MoveQuality;
}

/**
 * The handful of moves that most changed the game — the biggest evaluation
 * swings (min 1.5 pawns), returned in game order for a "key moments" list.
 */
export function keyMoments(analysis: GameAnalysis, max = 4): KeyMoment[] {
  const clamp = (v: number) => Math.max(-MATE_CP, Math.min(MATE_CP, v));
  const moments = analysis.moves.map((m, i) => {
    const prev = i === 0 ? 0 : analysis.moves[i - 1].evalCp;
    return { ply: m.ply, san: m.san, color: m.color, swingCp: clamp(m.evalCp) - clamp(prev), quality: m.quality };
  });
  return moments
    .filter((m) => Math.abs(m.swingCp) >= 150)
    .sort((a, b) => Math.abs(b.swingCp) - Math.abs(a.swingCp))
    .slice(0, max)
    .sort((a, b) => a.ply - b.ply);
}
