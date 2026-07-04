"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult, Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface ConnectFourState {
  board: (Seat | null)[][]; // [row][col], row 0 = bottom
  turn: Seat;
}

export interface ConnectFourMove {
  col: number;
}

const COLS = 7;
const ROWS = 6;
const DISC_COLOR: Record<Seat, string> = { a: "#e0432b", b: "#f5c518" };
const DISC_COLOR_DARK: Record<Seat, string> = { a: "#a52c1a", b: "#c99a0c" };

function findWinningLine(board: (Seat | null)[][], winner: Seat | null): [number, number][] | null {
  if (!winner) return null;
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== winner) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === winner) {
          line.push([rr, cc]);
          rr += dr;
          cc += dc;
        }
        if (line.length >= 4) return line;
      }
    }
  }
  return null;
}

export function ConnectFourBoard({
  state,
  mySeat,
  interactive,
  onMove,
  status,
}: {
  state: ConnectFourState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: ConnectFourMove) => void;
  status?: (GameResult & { adminResolved?: boolean }) | null;
}) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);
  const [dropCell, setDropCell] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevBoard.current;
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.board[r][c] && !prev[r]?.[c]) {
          setDropCell(`${r}-${c}`);
          playArcadeSound("place");
          break outer;
        }
      }
    }
    prevBoard.current = state.board;
  }, [state.board]);

  const winLine = status?.over ? findWinningLine(state.board, status.winner) : null;
  const isWinCell = (r: number, c: number) => winLine?.some(([wr, wc]) => wr === r && wc === c) ?? false;

  const colFull = (col: number) => state.board[ROWS - 1][col] !== null;

  return (
    <div
      className="mx-auto w-full max-w-[520px] rounded-2xl p-3 shadow-xl"
      style={{ background: "linear-gradient(160deg, #2f5fd6, #1c3f9e)" }}
    >
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {Array.from({ length: ROWS }).map((_, rIdx) => {
          const displayRow = ROWS - 1 - rIdx; // render top-down, row ROWS-1 at top
          return Array.from({ length: COLS }).map((_, col) => {
            const cell = state.board[displayRow][col];
            const key = `${displayRow}-${col}`;
            const winning = isWinCell(displayRow, col);
            return (
              <button
                key={key}
                onMouseEnter={() => canPlay && !colFull(col) && setHoverCol(col)}
                onClick={() => canPlay && !colFull(col) && onMove({ col })}
                disabled={!canPlay || colFull(col)}
                className="relative flex aspect-square items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #17337a, #0e2158)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                  cursor: canPlay && !colFull(col) ? "pointer" : "default",
                }}
              >
                {cell && (
                  <span
                    className="absolute inset-[8%] rounded-full"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, ${DISC_COLOR[cell]}, ${DISC_COLOR_DARK[cell]} 75%)`,
                      boxShadow: winning
                        ? `0 0 0 3px #fff, 0 0 16px 4px ${DISC_COLOR[cell]}`
                        : "0 2px 3px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.35)",
                      animation: dropCell === key ? "c4-drop 0.35s cubic-bezier(0.5,0,0.9,0.4)" : winning ? "c4-pulse 1.1s ease-in-out infinite" : undefined,
                    }}
                  />
                )}
                {!cell && hoverCol === col && (
                  <span
                    className="absolute inset-[12%] rounded-full opacity-40"
                    style={{ background: mySeat ? DISC_COLOR[mySeat] : "#fff" }}
                  />
                )}
              </button>
            );
          });
        })}
      </div>
      <style>{`
        @keyframes c4-drop {
          0% { transform: translateY(-260%); }
          70% { transform: translateY(4%); }
          100% { transform: translateY(0); }
        }
        @keyframes c4-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.35); }
        }
      `}</style>
    </div>
  );
}
