"use client";

import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const N = 8;

const CELLS: [number, number][] = [];
for (let row = 0; row < N; row++) {
  for (let col = 0; col <= row; col++) CELLS.push([row, col]);
}

export type Cell = Seat | null;

export interface YGameState {
  board: Cell[];
  turn: Seat;
}

export interface YGameMove {
  cell: number;
}

const CELL_SIZE = 34;

function centerOf(row: number, col: number): [number, number] {
  const y = row * CELL_SIZE * 0.87;
  const x = (col - row / 2) * CELL_SIZE;
  return [x, y];
}

export function YGameBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: YGameState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: YGameMove) => void;
  lastMove?: { move: YGameMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const positions = CELLS.map(([r, c]) => centerOf(r, c));
  const xs = positions.map((p) => p[0]);
  const ys = positions.map((p) => p[1]);
  const minX = Math.min(...xs) - CELL_SIZE;
  const maxX = Math.max(...xs) + CELL_SIZE;
  const minY = Math.min(...ys) - CELL_SIZE;
  const maxY = Math.max(...ys) + CELL_SIZE;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Connect all three sides of the triangle with one unbroken group of your stones.
      </p>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        width="100%"
        style={{ maxWidth: 460, aspectRatio: `${maxX - minX}/${maxY - minY}` }}
      >
        {CELLS.map(([r, c], i) => {
          const [cx, cy] = centerOf(r, c);
          const stone = state.board[i];
          return (
            <g
              key={i}
              onClick={() => {
                if (!canPlay || stone != null) return;
                playArcadeSound("place");
                onMove({ cell: i });
              }}
              style={{ cursor: canPlay && stone == null ? "pointer" : "default" }}
            >
              <circle cx={cx} cy={cy} r={CELL_SIZE * 0.42} fill="var(--bg)" stroke="var(--border-strong)" strokeWidth={1} />
              {stone && (
                <circle cx={cx} cy={cy} r={CELL_SIZE * 0.33} fill={stone === "a" ? "#e8e0c8" : "#2a2a2a"} stroke={stone === "a" ? "#c8bd9a" : "#111"} strokeWidth={1.5} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
