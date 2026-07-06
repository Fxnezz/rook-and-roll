"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 6;

export type Cell = Seat | "burned" | null;

export interface AmazonsState {
  board: Cell[];
  turn: Seat;
}

export interface AmazonsMove {
  from: number;
  to: number;
  shoot: number;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
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

function queenDestinations(board: Cell[], from: number): number[] {
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS8) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr * SIZE + nc] == null) {
      out.push(nr * SIZE + nc);
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

export function AmazonsBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: AmazonsState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: AmazonsMove) => void;
  lastMove?: { move: AmazonsMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: number; to: number } | null>(null);

  const moveDests = selected != null && !pendingMove ? queenDestinations(state.board, selected) : [];
  const shootDests = pendingMove
    ? (() => {
        const after = [...state.board];
        after[pendingMove.to] = mySeat;
        after[pendingMove.from] = null;
        return queenDestinations(after, pendingMove.to);
      })()
    : [];

  const click = (i: number) => {
    if (!canPlay) return;
    if (pendingMove) {
      if (!shootDests.includes(i)) return;
      playArcadeSound("capture");
      onMove({ from: pendingMove.from, to: pendingMove.to, shoot: i });
      setPendingMove(null);
      setSelected(null);
      return;
    }
    if (selected == null) {
      if (state.board[i] === mySeat) setSelected(i);
      return;
    }
    if (i === selected) {
      setSelected(null);
      return;
    }
    if (moveDests.includes(i)) {
      playArcadeSound("place");
      setPendingMove({ from: selected, to: i });
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
        {pendingMove ? "Shoot an arrow from the new spot to block a square." : "Move an amazon like a chess queen."}
      </p>
      <div className="grid grid-cols-6 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
        {state.board.map((cell, i) => {
          const isMoveDest = moveDests.includes(i);
          const isShootDest = shootDests.includes(i);
          const isPendingTo = pendingMove?.to === i;
          return (
            <button
              key={i}
              disabled={!canPlay}
              onClick={() => click(i)}
              className="flex aspect-square items-center justify-center rounded-sm"
              style={{
                background: cell === "burned" ? "#3a2020" : selected === i ? "var(--accent)" : "var(--bg)",
                outline: isMoveDest || isShootDest ? "2px solid var(--good)" : "none",
                outlineOffset: -2,
              }}
            >
              {cell === "burned" && <span className="text-lg">🔥</span>}
              {(cell === "a" || cell === "b") && !isPendingTo && (
                <span
                  className="h-[70%] w-[70%] rounded-full border-2"
                  style={{ background: cell === "a" ? "#e8e0c8" : "#2a2a2a", borderColor: cell === "a" ? "#c8bd9a" : "#111" }}
                />
              )}
              {isPendingTo && (
                <span
                  className="h-[70%] w-[70%] rounded-full border-2"
                  style={{ background: mySeat === "a" ? "#e8e0c8" : "#2a2a2a", borderColor: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
