"use client";

import Link from "next/link";
import type { GameStatus } from "@/lib/chess/useChessGame";
import { IconRook } from "@/components/ui/icons";

export function GameOverModal({
  status,
  onNewGame,
  onReview,
  onClose,
  opponentUsername,
  onRematch,
  series,
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
}) {
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
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
          <IconRook width={26} height={26} />
        </div>
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
