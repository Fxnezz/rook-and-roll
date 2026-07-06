"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 7;

export type Cell = Seat | null;

export interface HalmaState {
  board: Cell[];
  turn: Seat;
}

export interface HalmaMove {
  from: number;
  to: number;
}

const DIRS8: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function legalDestinations(board: Cell[], from: number): number[] {
  const row = Math.floor(from / SIZE);
  const col = from % SIZE;
  const dests: number[] = [];
  for (const [dr, dc] of DIRS8) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    const nIdx = nr * SIZE + nc;
    if (board[nIdx] == null) {
      dests.push(nIdx);
    } else {
      const jr = nr + dr;
      const jc = nc + dc;
      if (inBounds(jr, jc) && board[jr * SIZE + jc] == null) dests.push(jr * SIZE + jc);
    }
  }
  return dests;
}

export function HalmaBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: HalmaState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: HalmaMove) => void;
  lastMove?: { move: HalmaMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [selected, setSelected] = useState<number | null>(null);
  const dests = selected != null ? legalDestinations(state.board, selected) : [];

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
        Move or jump (own or opponent pieces) toward the opposite corner. Get all 6 pieces into the far camp to win.
      </p>
      <div className="grid grid-cols-7 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
        {state.board.map((cell, i) => (
          <button
            key={i}
            disabled={!canPlay}
            onClick={() => click(i)}
            className="flex aspect-square items-center justify-center rounded-sm"
            style={{
              background: selected === i ? "var(--accent)" : "var(--bg)",
              outline: dests.includes(i) ? "2px solid var(--good)" : "none",
              outlineOffset: -2,
            }}
          >
            {cell != null && (
              <span
                className="h-[70%] w-[70%] rounded-full border-2"
                style={{
                  background: cell === "a" ? "#e8e0c8" : "#2a2a2a",
                  borderColor: cell === "a" ? "#c8bd9a" : "#111",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
