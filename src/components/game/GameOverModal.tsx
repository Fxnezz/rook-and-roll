"use client";

import Link from "next/link";
import type { GameStatus } from "@/lib/chess/useChessGame";
import { IconRook } from "@/components/ui/icons";
import { BotAvatar } from "@/components/bot/BotAvatar";
import type { BotTierId } from "@/lib/engine/bots";
import type { GameAnalysis } from "@/lib/engine/analysis";
import type { Color } from "chess.js";

/** Picks the player's single costliest mistake/blunder from an already-computed
 * analysis (never triggers a fresh engine run — only shown when analysis already
 * ran, e.g. via the "auto-analyze on game end" setting). */
function pickTip(analysis: GameAnalysis | null | undefined, yourColor: Color | undefined): string | null {
  if (!analysis || !yourColor) return null;
  const yours = analysis.moves.filter((m) => m.color === yourColor && (m.quality === "blunder" || m.quality === "mistake"));
  if (yours.length === 0) return null;
  const worst = yours.reduce((a, b) => (b.cpLoss > a.cpLoss ? b : a));
  const moveNum = Math.ceil(worst.ply / 2);
  return `Your costliest slip was ${worst.san} on move ${moveNum} (${worst.quality}) — worth a look in the review.`;
}

export function GameOverModal({
  status,
  onNewGame,
  onReview,
  onClose,
  opponentUsername,
  onRematch,
  series,
  botTierId,
  analysis,
  yourColor,
}: {
  status: GameStatus;
  onNewGame: () => void;
  onReview: () => void;
  onClose: () => void;
  /** Only set for online (real-opponent) games — omitted for bot/local games. Shows a link to the opponent's profile so reporting/friending is reachable right after the game ends. */
  opponentUsername?: string;
  /** When set, shows a "Rematch" button alongside review/new-game (bot games — same opponent, sides swapped). */
  onRematch?: () => void;
  /** Running score across this rematch chain, from the player's perspective. */
  series?: { wins: number; losses: number; draws: number };
  /** Bot games only — swaps the generic rook icon for the opponent's own portrait. */
  botTierId?: BotTierId;
  /** Already-computed analysis (e.g. from auto-analyze), used to surface a one-line coaching tip. Never triggers analysis itself. */
  analysis?: GameAnalysis | null;
  /** Which side you played — needed to pick a tip from your own moves. */
  yourColor?: Color;
}) {
  const tip = pickTip(analysis, yourColor);
  if (!status.over) return null;
  const headline =
    status.result === "1/2-1/2"
      ? "Draw"
      : status.winner === "w"
        ? "White wins"
        : "Black wins";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-sm p-6 text-center animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {botTierId ? (
          <div className="mx-auto mb-3">
            <BotAvatar tierId={botTierId} size={48} />
          </div>
        ) : (
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
            <IconRook width={26} height={26} />
          </div>
        )}
        <h2 className="text-2xl font-bold">{headline}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {status.reason} · <span className="font-mono">{status.result}</span>
        </p>
        {opponentUsername && (
          <Link href={`/u/${opponentUsername}`} className="mt-2 inline-block text-xs text-[var(--text-faint)] hover:underline">
            View {opponentUsername}&apos;s profile
          </Link>
        )}
        {series && (series.wins + series.losses + series.draws > 0) && (
          <p className="mt-2 text-xs text-[var(--text-faint)]">
            Series: {series.wins}W {series.losses}L {series.draws}D
          </p>
        )}
        {tip && (
          <p className="mt-3 rounded-md bg-[var(--bg-elev)] p-2 text-left text-xs text-[var(--text-muted)]">💡 {tip}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn flex-1" onClick={onReview}>
            Review game
          </button>
          {onRematch ? (
            <button className="btn btn-primary flex-1" onClick={onRematch}>
              Rematch
            </button>
          ) : (
            <button className="btn btn-primary flex-1" onClick={onNewGame}>
              New game
            </button>
          )}
        </div>
        {onRematch && (
          <button className="btn btn-ghost mt-2 w-full !text-xs" onClick={onNewGame}>
            Choose a different opponent
          </button>
        )}
      </div>
    </div>
  );
}
