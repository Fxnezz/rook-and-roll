"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 8;

export type Cell = Seat | null;

export interface LoaState {
  board: Cell[];
  turn: Seat;
}

export interface LoaMove {
  from: number;
  to: number;
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

function countLine(board: Cell[], r: number, c: number, dr: number, dc: number): number {
  let count = 1;
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc)) {
    if (board[nr * SIZE + nc] != null) count++;
    nr += dr;
    nc += dc;
  }
  nr = r - dr;
  nc = c - dc;
  while (inBounds(nr, nc)) {
    if (board[nr * SIZE + nc] != null) count++;
    nr -= dr;
    nc -= dc;
  }
  return count;
}

function legalMovesForPiece(board: Cell[], from: number, player: Seat): number[] {
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS8) {
    const distance = countLine(board, r, c, dr, dc);
    const tr = r + dr * distance;
    const tc = c + dc * distance;
    if (!inBounds(tr, tc)) continue;
    let blocked = false;
    for (let step = 1; step < distance; step++) {
      const v = board[(r + dr * step) * SIZE + (c + dc * step)];
      if (v != null && v !== player) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    if (board[tr * SIZE + tc] === player) continue;
    out.push(tr * SIZE + tc);
  }
  return out;
}

export function LoaBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: LoaState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: LoaMove) => void;
  lastMove?: { move: LoaMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [selected, setSelected] = useState<number | null>(null);
  const dests = selected != null ? legalMovesForPiece(state.board, selected, mySeat!) : [];

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
      playArcadeSound(state.board[i] != null ? "capture" : "place");
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
        Move exactly as far as the total pieces on that line — jump your own, capture enemies at the landing square.
        Connect all your pieces into one group to win.
      </p>
      <div className="grid grid-cols-8 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
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
                style={{ background: cell === "a" ? "#e8e0c8" : "#2a2a2a", borderColor: cell === "a" ? "#c8bd9a" : "#111" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
