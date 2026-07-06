"use client";

import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";
import { useEffect, useRef } from "react";

export interface UtttState {
  boards: (Seat | null)[][];
  boardWinners: (Seat | "draw" | null)[];
  activeBoard: number | null;
  turn: Seat;
}

export interface UtttMove {
  board: number;
  cell: number;
}

const MARK_COLOR: Record<Seat, string> = { a: "#5a7ae0", b: "#e07a5a" };

export function UtttBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: UtttState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: UtttMove) => void;
  lastMove?: { move: UtttMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoards = useRef(state.boards);

  useEffect(() => {
    const changed = state.boards.some((b, i) => b.some((c, j) => c !== prevBoards.current[i][j]));
    if (changed) playArcadeSound("place");
    prevBoards.current = state.boards;
  }, [state.boards]);

  const isLegalBoard = (board: number) => state.boardWinners[board] == null && (state.activeBoard == null || state.activeBoard === board);

  return (
    <div className="mx-auto grid w-full max-w-[420px] grid-cols-3 gap-2 rounded-2xl bg-[var(--bg-elev)] p-3">
      {Array.from({ length: 9 }).map((_, board) => {
        const winner = state.boardWinners[board];
        const legal = canPlay && isLegalBoard(board);
        return (
          <div
            key={board}
            className="relative grid grid-cols-3 gap-0.5 rounded-lg p-1"
            style={{
              background: legal ? "rgba(233,199,63,0.12)" : "var(--bg-elev-2)",
              boxShadow: legal ? "inset 0 0 0 2px var(--accent)" : undefined,
            }}
          >
            {winner && winner !== "draw" && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg text-4xl font-black"
                style={{ background: "rgba(20,22,28,0.85)", color: MARK_COLOR[winner] }}
              >
                {winner === "a" ? "X" : "O"}
              </div>
            )}
            {winner === "draw" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg text-xs text-[var(--text-faint)]" style={{ background: "rgba(20,22,28,0.85)" }}>
                draw
              </div>
            )}
            {state.boards[board].map((mark, cell) => (
              <button
                key={cell}
                disabled={!legal || mark != null}
                onClick={() => onMove({ board, cell })}
                className="flex aspect-square items-center justify-center rounded text-sm font-black"
                style={{ background: "var(--bg)", color: mark ? MARK_COLOR[mark] : "transparent" }}
              >
                {mark === "a" ? "X" : mark === "b" ? "O" : ""}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
