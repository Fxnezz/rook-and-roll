"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export type Cell = Seat | null;

export interface Connect6State {
  board: Cell[][];
  turn: Seat;
  movesPlaced: number;
}

export interface Connect6Move {
  cells: { row: number; col: number }[];
}

const SIZE = 15;
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function findWinningLine(board: Cell[][]): { row: number; col: number }[] | null {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const line = [{ row, col }];
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === p) {
          line.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
        if (line.length >= 6) return line;
      }
    }
  }
  return null;
}

const STONE_GRADIENT: Record<Seat, string> = {
  a: "radial-gradient(circle at 32% 26%, #4a5461, #1c2027 78%)",
  b: "radial-gradient(circle at 32% 26%, #fdf8ec, #d8cdb2 78%)",
};
const STONE_BORDER: Record<Seat, string> = { a: "#0a0c10", b: "#b8ac8e" };

export function Connect6Board({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: Connect6State;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: Connect6Move) => void;
  lastMove?: { move: Connect6Move; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [pending, setPending] = useState<{ row: number; col: number } | null>(null);
  const needsTwo = state.movesPlaced > 0;

  const winLine = findWinningLine(state.board);
  const winSet = new Set(winLine?.map((s) => `${s.row}-${s.col}`) ?? []);

  const handleClick = (row: number, col: number) => {
    if (!canPlay || state.board[row][col] !== null) return;
    if (!needsTwo) {
      onMove({ cells: [{ row, col }] });
      return;
    }
    if (pending == null) {
      setPending({ row, col });
      playArcadeSound("place");
      return;
    }
    if (pending.row === row && pending.col === col) {
      setPending(null);
      return;
    }
    onMove({ cells: [pending, { row, col }] });
    setPending(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-2">
      <p className="text-center text-sm text-[var(--text-muted)]">
        {needsTwo ? (pending ? "Place your second stone." : "Place two stones this turn.") : "Place your opening stone."}
      </p>
      <div
        className="grid w-full aspect-square gap-[1px] overflow-hidden rounded-xl p-3 shadow-xl"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, background: "linear-gradient(160deg, #d9b872, #b8935a)" }}
      >
        {Array.from({ length: SIZE }).map((_, row) =>
          Array.from({ length: SIZE }).map((_, col) => {
            const cell = state.board[row][col];
            const key = `${row}-${col}`;
            const isPending = pending?.row === row && pending?.col === col;
            const isWin = winSet.has(key);
            return (
              <button
                key={key}
                onClick={() => handleClick(row, col)}
                disabled={!canPlay || cell !== null}
                className="relative flex items-center justify-center"
                style={{
                  background: "transparent",
                  borderTop: row === 0 ? "none" : "1px solid rgba(80,55,20,0.35)",
                  borderLeft: col === 0 ? "none" : "1px solid rgba(80,55,20,0.35)",
                }}
              >
                {isPending && <span className="absolute inset-[15%] rounded-full border-2 border-dashed" style={{ borderColor: "var(--accent)" }} />}
                {cell && (
                  <span
                    className="absolute inset-[10%] rounded-full border-2"
                    style={{
                      background: STONE_GRADIENT[cell],
                      borderColor: isWin ? "#e9c73f" : STONE_BORDER[cell],
                      boxShadow: isWin
                        ? "0 0 6px 2px rgba(233,199,63,0.8), inset 0 1px 2px rgba(255,255,255,0.25)"
                        : "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25)",
                    }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
