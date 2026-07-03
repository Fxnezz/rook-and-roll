"use client";

import type { Seat } from "@/lib/boardgames/protocol";

export interface TicTacToeState {
  board: (Seat | null)[];
  turn: Seat;
}

export function TicTacToeBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: TicTacToeState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (index: number) => void;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[420px] grid-cols-3 gap-2 rounded-2xl bg-[var(--bg-elev)] p-3">
      {state.board.map((cell, i) => (
        <button
          key={i}
          onClick={() => canPlay && cell === null && onMove(i)}
          disabled={!canPlay || cell !== null}
          className="flex items-center justify-center rounded-xl text-6xl font-black transition-colors"
          style={{
            background: "var(--bg-elev-2)",
            color: cell === "a" ? "var(--accent)" : "var(--info)",
            cursor: canPlay && cell === null ? "pointer" : "default",
          }}
        >
          {cell === "a" ? "✕" : cell === "b" ? "◯" : ""}
        </button>
      ))}
    </div>
  );
}
