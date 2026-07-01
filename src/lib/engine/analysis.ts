import type { Color } from "chess.js";
import type { StockfishEngine } from "./stockfish";

export type MoveQuality = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface AnalyzedMove {
  ply: number; // 1-based
  san: string;
  color: Color;
  uci: string;
  bestUci: string;
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

function toCpWhite(cp: number | null, mate: number | null): number {
  if (mate != null) return mate > 0 ? MATE_CP - mate : -MATE_CP - mate;
  return cp ?? 0;
}

function classify(cpLoss: number, isBest: boolean): MoveQuality {
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
    w: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    b: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
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
    const quality = classify(cpLoss, isBest);
    summary[mv.color][quality] += 1;
    lossSum[mv.color] += cpLoss;
    lossCount[mv.color] += 1;
    moves.push({
      ply: i + 1,
      san: mv.san,
      color: mv.color,
      uci: mv.uci,
      bestUci: bestUcis[i],
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
