"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export type Cell = Seat | null;

export interface GomokuState {
  board: Cell[][];
  turn: Seat;
}

export interface Sq {
  row: number;
  col: number;
}

export interface GomokuMove {
  row: number;
  col: number;
}

const SIZE = 15;
const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

/** UI-only copy of the winning-line finder, kept out of the full engine/bot bundle. */
function findWinningLine(board: Cell[][]): Sq[] | null {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        const line: Sq[] = [{ row, col }];
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && board[r][c] === p) {
          line.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
        if (line.length >= 5) return line;
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

export function GomokuBoard({
  state,
  mySeat,
  interactive,
  onMove,
  lastMove,
}: {
  state: GomokuState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: GomokuMove) => void;
  lastMove?: { move: GomokuMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevBoard.current;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (prev[r][c] === null && state.board[r][c] !== null) {
          const key = `${r}-${c}`;
          setPlaced(key);
          playArcadeSound("place");
          const t = setTimeout(() => setPlaced(null), 220);
          prevBoard.current = state.board;
          return () => clearTimeout(t);
        }
      }
    }
    prevBoard.current = state.board;
  }, [state.board]);

  const winLine = findWinningLine(state.board);
  const winSet = new Set(winLine?.map((s) => `${s.row}-${s.col}`) ?? []);
  const isLastMove = (r: number, c: number) => lastMove != null && lastMove.move.row === r && lastMove.move.col === c;

  const handleClick = (row: number, col: number) => {
    if (!canPlay || state.board[row][col] !== null) return;
    onMove({ row, col });
  };

  return (
    <div
      className="mx-auto grid w-full max-w-[560px] aspect-square gap-[1px] overflow-hidden rounded-xl p-3 shadow-xl"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, background: "linear-gradient(160deg, #d9b872, #b8935a)" }}
    >
      {Array.from({ length: SIZE }).map((_, row) =>
        Array.from({ length: SIZE }).map((_, col) => {
          const cell = state.board[row][col];
          const key = `${row}-${col}`;
          const isPlacing = placed === key;
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
              {isLastMove(row, col) && !cell && (
                <span className="absolute inset-[30%] rounded-full" style={{ background: "rgba(80,160,255,0.35)" }} />
              )}
              {cell && (
                <span
                  className="absolute inset-[10%] rounded-full border-2"
                  style={{
                    background: STONE_GRADIENT[cell],
                    borderColor: isWin ? "#e9c73f" : STONE_BORDER[cell],
                    boxShadow: isWin
                      ? "0 0 6px 2px rgba(233,199,63,0.8), inset 0 1px 2px rgba(255,255,255,0.25)"
                      : "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25)",
                    animation: isPlacing ? "gk-place 0.2s ease-out" : undefined,
                  }}
                />
              )}
            </button>
          );
        }),
      )}
      <style>{`
        @keyframes gk-place {
          0% { transform: scale(0.3); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
