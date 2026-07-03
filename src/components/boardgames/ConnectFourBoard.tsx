"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";

export interface ConnectFourState {
  board: (Seat | null)[][]; // [row][col], row 0 = bottom
  turn: Seat;
}

const COLS = 7;
const ROWS = 6;

export function ConnectFourBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: ConnectFourState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (col: number) => void;
}) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const canPlay = interactive && mySeat != null && state.turn === mySeat;

  const colFull = (col: number) => state.board[ROWS - 1][col] !== null;

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-2xl bg-[var(--bg-elev)] p-3">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {Array.from({ length: ROWS }).map((_, rIdx) => {
          const displayRow = ROWS - 1 - rIdx; // render top-down, row ROWS-1 at top
          return Array.from({ length: COLS }).map((_, col) => {
            const cell = state.board[displayRow][col];
            return (
              <button
                key={`${displayRow}-${col}`}
                onMouseEnter={() => canPlay && !colFull(col) && setHoverCol(col)}
                onClick={() => canPlay && !colFull(col) && onMove(col)}
                disabled={!canPlay || colFull(col)}
                className="relative flex aspect-square items-center justify-center rounded-full transition-colors"
                style={{ background: "var(--bg-elev-2)", cursor: canPlay && !colFull(col) ? "pointer" : "default" }}
              >
                {cell && (
                  <span
                    className="absolute inset-[8%] rounded-full shadow-inner"
                    style={{ background: cell === "a" ? "var(--accent)" : "var(--info)" }}
                  />
                )}
                {!cell && hoverCol === col && (
                  <span className="absolute inset-[16%] rounded-full opacity-30" style={{ background: "var(--text-faint)" }} />
                )}
              </button>
            );
          });
        })}
      </div>
    </div>
  );
}
