import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { EngineLine } from "@/lib/engine/stockfish";

export type BotPersonality = "normal" | "aggressive" | "passive" | "random";

function lineScore(line: EngineLine): number {
  if (line.mate != null) return line.mate > 0 ? 100000 - line.mate : -100000 - line.mate;
  return line.cp ?? 0;
}

/** Picks the worst-evaluated candidate instead of the best — for blunder mode. */
export function chooseWorstMove(lines: EngineLine[]): string {
  if (lines.length === 0) throw new Error("no candidate moves");
  let worst = lines[0];
  let worstScore = lineScore(worst);
  for (const l of lines.slice(1)) {
    const s = lineScore(l);
    if (s < worstScore) {
      worst = l;
      worstScore = s;
    }
  }
  return worst.move;
}

function isTactical(fen: string, uci: string): boolean {
  try {
    const g = new Chess(fen);
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
    const isCapture = Boolean(g.get(to));
    const move = g.move({ from, to, promotion });
    return isCapture || move.san.includes("+");
  } catch {
    return false;
  }
}

/**
 * Personality-weighted pick among candidates that stay within ~0.5 pawn of
 * the engine's best line (so the bot still plays reasonably, just with a
 * stylistic bias rather than actively self-sabotaging).
 */
export function choosePersonalityMove(
  fen: string,
  lines: EngineLine[],
  personality: BotPersonality,
  rng: () => number = Math.random,
): string {
  if (lines.length === 0) throw new Error("no candidate moves");
  if (personality === "normal" || lines.length === 1) return lines[0].move;
  if (personality === "random") return lines[Math.floor(rng() * lines.length)].move;

  const best = lineScore(lines[0]);
  const close = lines.filter((l) => best - lineScore(l) <= 50);
  const pool = close.length > 0 ? close : lines;

  if (personality === "aggressive") {
    const tactical = pool.filter((l) => isTactical(fen, l.move));
    return (tactical[0] ?? pool[0]).move;
  }
  // passive: prefer the first quiet (non-tactical) candidate
  const quiet = pool.filter((l) => !isTactical(fen, l.move));
  return (quiet[0] ?? pool[0]).move;
}

export interface BotOverride {
  blunderMode: boolean;
  personality: BotPersonality;
  /** null = use the tier's own skill level */
  skillOverride: number | null;
}

export const DEFAULT_BOT_OVERRIDE: BotOverride = {
  blunderMode: false,
  personality: "normal",
  skillOverride: null,
};

/** Resolves the actual move to play given the current override state. */
export function resolveOverriddenMove(
  fen: string,
  lines: EngineLine[],
  override: BotOverride,
  normalChoose: () => string,
): string {
  if (override.blunderMode) return chooseWorstMove(lines);
  if (override.personality !== "normal") return choosePersonalityMove(fen, lines, override.personality);
  return normalChoose();
}
