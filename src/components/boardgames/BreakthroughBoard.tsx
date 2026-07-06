"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const ROWS = 6;
const COLS = 6;

export type Cell = Seat | null;

export interface BreakthroughState {
  board: Cell[];
  turn: Seat;
}

export interface BreakthroughMove {
  from: number;
  to: number;
}

// UI-only copy of legal-move generation, purely to highlight destinations —
// the engine remains the source of truth and validates every move server-side.
function legalDestinations(board: Cell[], from: number, owner: Seat): number[] {
  const row = Math.floor(from / COLS);
  const col = from % COLS;
  const dr = owner === "a" ? 1 : -1;
  const targetRow = row + dr;
  if (targetRow < 0 || targetRow >= ROWS) return [];
  const other: Seat = owner === "a" ? "b" : "a";
  const moves: number[] = [];
  const straight = targetRow * COLS + col;
  if (board[straight] == null) moves.push(straight);
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (c < 0 || c >= COLS) continue;
    const t = targetRow * COLS + c;
    if (board[t] == null || board[t] === other) moves.push(t);
  }
  return moves;
}

export function BreakthroughBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: BreakthroughState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: BreakthroughMove) => void;
  lastMove?: { move: BreakthroughMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [selected, setSelected] = useState<number | null>(null);
  const dests = selected != null ? legalDestinations(state.board, selected, mySeat!) : [];

  const click = (i: number) => {
    if (!canPlay) return;
    if (selected == null) {
      if (state.board[i] === mySeat) setSelected(i);
      return;
    }
    if (i === selected) {
      setSelected(null);
      return;
    }
    if (dests.includes(i)) {
      playArcadeSound("place");
      onMove({ from: selected, to: i });
      setSelected(null);
    } else if (state.board[i] === mySeat) {
      setSelected(i);
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Move a pawn one step forward (straight onto an empty square, diagonally to move or capture). Reach the far
        row to win.
      </p>
      <div className="grid grid-cols-6 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
        {state.board.map((c, i) => {
          const row = Math.floor(i / COLS);
          const dark = (row + (i % COLS)) % 2 === 0;
          return (
            <button
              key={i}
              disabled={!canPlay}
              onClick={() => click(i)}
              className="flex aspect-square items-center justify-center rounded-sm"
              style={{
                background: selected === i ? "var(--accent)" : dark ? "var(--bg)" : "var(--bg-elev)",
                outline: dests.includes(i) ? "2px solid var(--good)" : "none",
                outlineOffset: -2,
              }}
            >
              {c != null && (
                <span
                  className="h-[70%] w-[70%] rounded-full border-2"
                  style={{
                    background: c === "a" ? "#e8e0c8" : "#2a2a2a",
                    borderColor: c === "a" ? "#c8bd9a" : "#111",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
