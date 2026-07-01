"use client";

import type { GameStatus } from "@/lib/chess/useChessGame";
import { IconRook } from "@/components/ui/icons";

export function GameOverModal({
  status,
  onNewGame,
  onReview,
  onClose,
}: {
  status: GameStatus;
  onNewGame: () => void;
  onReview: () => void;
  onClose: () => void;
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
        <div className="mt-5 flex gap-2">
          <button className="btn flex-1" onClick={onReview}>
            Review game
          </button>
          <button className="btn btn-primary flex-1" onClick={onNewGame}>
            New game
          </button>
        </div>
      </div>
    </div>
  );
}
