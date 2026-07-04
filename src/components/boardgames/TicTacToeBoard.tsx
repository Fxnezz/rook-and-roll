"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult, Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface TicTacToeState {
  board: (Seat | null)[];
  turn: Seat;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winningLine(board: (Seat | null)[], winner: Seat | null): number[] | null {
  if (!winner) return null;
  for (const line of LINES) {
    if (line.every((i) => board[i] === winner)) return line;
  }
  return null;
}

// Center coordinates (in a 0-3 grid unit) for each index, used to draw the
// strike-through line across the winning three cells.
const CENTER: [number, number][] = [
  [0.5, 0.5], [1.5, 0.5], [2.5, 0.5],
  [0.5, 1.5], [1.5, 1.5], [2.5, 1.5],
  [0.5, 2.5], [1.5, 2.5], [2.5, 2.5],
];

function Mark({ seat, animate }: { seat: Seat; animate: boolean }) {
  if (seat === "a") {
    return (
      <svg viewBox="0 0 100 100" className="h-[62%] w-[62%]">
        <line
          x1="18" y1="18" x2="82" y2="82"
          stroke="#e0432b" strokeWidth="14" strokeLinecap="round"
          style={animate ? { strokeDasharray: 100, strokeDashoffset: 100, animation: "ttt-draw 0.28s ease-out forwards" } : undefined}
        />
        <line
          x1="82" y1="18" x2="18" y2="82"
          stroke="#e0432b" strokeWidth="14" strokeLinecap="round"
          style={animate ? { strokeDasharray: 100, strokeDashoffset: 100, animation: "ttt-draw 0.28s 0.1s ease-out forwards" } : undefined}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="h-[62%] w-[62%]">
      <circle
        cx="50" cy="50" r="34"
        fill="none" stroke="#2f6fd6" strokeWidth="14"
        style={animate ? { strokeDasharray: 214, strokeDashoffset: 214, animation: "ttt-draw 0.34s ease-out forwards" } : undefined}
      />
    </svg>
  );
}

export function TicTacToeBoard({
  state,
  mySeat,
  interactive,
  onMove,
  status,
}: {
  state: TicTacToeState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: { index: number }) => void;
  status?: (GameResult & { adminResolved?: boolean }) | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);
  const [freshIdx, setFreshIdx] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevBoard.current;
    for (let i = 0; i < 9; i++) {
      if (state.board[i] && !prev[i]) {
        setFreshIdx(i);
        playArcadeSound("place");
        break;
      }
    }
    prevBoard.current = state.board;
  }, [state.board]);

  const line = status?.over ? winningLine(state.board, status.winner) : null;

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-[var(--bg-elev)] p-3">
      <div className="relative aspect-square w-full">
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-2">
          {state.board.map((cell, i) => (
            <button
              key={i}
              onClick={() => canPlay && cell === null && onMove({ index: i })}
              disabled={!canPlay || cell !== null}
              className="flex items-center justify-center rounded-xl transition-colors hover:brightness-110"
              style={{
                background: "var(--bg-elev-2)",
                cursor: canPlay && cell === null ? "pointer" : "default",
              }}
            >
              {cell && <Mark seat={cell} animate={freshIdx === i} />}
            </button>
          ))}
        </div>
        {line && (
          <svg viewBox="0 0 3 3" className="pointer-events-none absolute inset-0 h-full w-full">
            <line
              x1={CENTER[line[0]][0]}
              y1={CENTER[line[0]][1]}
              x2={CENTER[line[2]][0]}
              y2={CENTER[line[2]][1]}
              stroke="#f5c518"
              strokeWidth="0.08"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 4px rgba(245,197,24,0.8))" }}
            />
          </svg>
        )}
      </div>
      <style>{`
        @keyframes ttt-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
