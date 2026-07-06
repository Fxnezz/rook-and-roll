"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const MARBLE_COLOR: Record<Seat, string> = { a: "#5a7ae0", b: "#e07a5a" };

export interface PentagoState {
  board: (Seat | null)[][];
  turn: Seat;
}

export type Direction = "cw" | "ccw";

export interface PentagoMove {
  row: number;
  col: number;
  quadrant: 0 | 1 | 2 | 3;
  direction: Direction;
}

const QUADRANT_ORIGIN: [number, number][] = [
  [0, 0], [0, 3], [3, 0], [3, 3],
];

export function PentagoBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: PentagoState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: PentagoMove) => void;
  lastMove?: { move: PentagoMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [pending, setPending] = useState<{ row: number; col: number } | null>(null);
  const prevBoard = useRef(state.board);

  useEffect(() => {
    const changed = state.board.some((r, i) => r.some((c, j) => c !== prevBoard.current[i][j]));
    if (changed) {
      playArcadeSound("place");
      setPending(null);
    }
    prevBoard.current = state.board;
  }, [state.board]);

  const handleCellClick = (row: number, col: number) => {
    if (!canPlay || state.board[row][col] !== null) return;
    setPending((p) => (p && p.row === row && p.col === col ? null : { row, col }));
  };

  const rotate = (quadrant: 0 | 1 | 2 | 3, direction: Direction) => {
    if (!pending) return;
    onMove({ row: pending.row, col: pending.col, quadrant, direction });
  };

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-[var(--bg-elev)] p-4">
      {pending && <p className="mb-2 text-center text-sm font-semibold text-[var(--warn)]">Pick a quadrant to rotate.</p>}
      <div className="grid grid-cols-2 gap-2">
        {QUADRANT_ORIGIN.map(([or_, oc], qi) => (
          <div key={qi} className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--bg-elev-2)] p-1.5">
              {Array.from({ length: 3 }).map((_, i) =>
                Array.from({ length: 3 }).map((_, j) => {
                  const row = or_ + i;
                  const col = oc + j;
                  const cell = state.board[row][col];
                  const isPending = pending?.row === row && pending?.col === col;
                  return (
                    <button
                      key={`${row}-${col}`}
                      disabled={!canPlay || cell !== null || (pending != null && !isPending)}
                      onClick={() => handleCellClick(row, col)}
                      className="flex aspect-square h-9 w-9 items-center justify-center rounded-full border"
                      style={{
                        background: cell ? MARBLE_COLOR[cell] : isPending ? "rgba(233,199,63,0.4)" : "var(--bg)",
                        borderColor: "rgba(255,255,255,0.15)",
                      }}
                    />
                  );
                }),
              )}
            </div>
            {pending && (
              <div className="flex gap-1">
                <button className="rounded border px-2 py-0.5 text-xs" style={{ borderColor: "var(--border-strong)" }} onClick={() => rotate(qi as 0 | 1 | 2 | 3, "ccw")}>
                  ↺
                </button>
                <button className="rounded border px-2 py-0.5 text-xs" style={{ borderColor: "var(--border-strong)" }} onClick={() => rotate(qi as 0 | 1 | 2 | 3, "cw")}>
                  ↻
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
