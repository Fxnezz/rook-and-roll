"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const ROWS = 5;
const COLS = 9;

export type Cell = Seat | null;

export interface FanoronaState {
  board: Cell[];
  turn: Seat;
}

export interface FanoronaMove {
  from: number;
  to: number;
  captureDir?: "approach" | "withdrawal";
}

function rc(i: number): [number, number] {
  return [Math.floor(i / COLS), i % COLS];
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}
function validDirection(r: number, c: number, dr: number, dc: number): boolean {
  if (dr === 0 || dc === 0) return true;
  return (r + c) % 2 === 0;
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

function runCaptures(board: Cell[], r: number, c: number, dr: number, dc: number, enemy: Seat): number[] {
  const captured: number[] = [];
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc) && board[nr * COLS + nc] === enemy) {
    captured.push(nr * COLS + nc);
    nr += dr;
    nc += dc;
  }
  return captured;
}

interface Candidate {
  move: FanoronaMove;
  captured: number[];
}

function allCandidates(state: FanoronaState, player: Seat): Candidate[] {
  const opponent: Seat = player === "a" ? "b" : "a";
  const out: Candidate[] = [];
  for (let cell = 0; cell < state.board.length; cell++) {
    if (state.board[cell] !== player) continue;
    const [r, c] = rc(cell);
    for (const [dr, dc] of DIRS8) {
      if (!validDirection(r, c, dr, dc)) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || state.board[nr * COLS + nc] != null) continue;
      const to = nr * COLS + nc;
      const approach = runCaptures(state.board, nr, nc, dr, dc, opponent);
      const withdrawal = runCaptures(state.board, r, c, -dr, -dc, opponent);
      if (approach.length > 0) out.push({ move: { from: cell, to, captureDir: "approach" }, captured: approach });
      if (withdrawal.length > 0) out.push({ move: { from: cell, to, captureDir: "withdrawal" }, captured: withdrawal });
      if (approach.length === 0 && withdrawal.length === 0) out.push({ move: { from: cell, to }, captured: [] });
    }
  }
  const hasCapture = out.some((c) => c.captured.length > 0);
  return hasCapture ? out.filter((c) => c.captured.length > 0) : out;
}

export function FanoronaBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: FanoronaState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: FanoronaMove) => void;
  lastMove?: { move: FanoronaMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingChoices, setPendingChoices] = useState<Candidate[] | null>(null);

  const candidates = canPlay ? allCandidates(state, mySeat!) : [];
  const fromSelected = selected != null ? candidates.filter((c) => c.move.from === selected) : [];
  const destSet = new Set(fromSelected.map((c) => c.move.to));

  const click = (cell: number) => {
    if (!canPlay) return;
    if (pendingChoices) return;
    if (selected == null) {
      if (state.board[cell] === mySeat && candidates.some((c) => c.move.from === cell)) setSelected(cell);
      return;
    }
    if (cell === selected) {
      setSelected(null);
      return;
    }
    const options = fromSelected.filter((c) => c.move.to === cell);
    if (options.length === 0) {
      if (state.board[cell] === mySeat && candidates.some((c) => c.move.from === cell)) setSelected(cell);
      else setSelected(null);
      return;
    }
    if (options.length === 1) {
      playArcadeSound("capture");
      onMove(options[0].move);
      setSelected(null);
    } else {
      setPendingChoices(options);
    }
  };

  const pick = (choice: Candidate) => {
    playArcadeSound("capture");
    onMove(choice.move);
    setPendingChoices(null);
    setSelected(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Move into an empty point to capture a line of enemy pieces ahead of you (approach) or behind your start
        (withdrawal). Capturing is mandatory when available.
      </p>
      <div className="grid w-full gap-1 rounded-md p-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, background: "var(--border)" }}>
        {state.board.map((cell, i) => (
          <button
            key={i}
            disabled={!canPlay}
            onClick={() => click(i)}
            className="flex aspect-square items-center justify-center rounded-full"
            style={{
              background: selected === i ? "var(--accent)" : "var(--bg)",
              outline: destSet.has(i) ? "2px solid var(--good)" : "none",
              outlineOffset: -2,
            }}
          >
            {cell != null && (
              <span
                className="h-[65%] w-[65%] rounded-full border-2"
                style={{ background: cell === "a" ? "#e8e0c8" : "#2a2a2a", borderColor: cell === "a" ? "#c8bd9a" : "#111" }}
              />
            )}
          </button>
        ))}
      </div>
      {pendingChoices && (
        <div className="flex gap-2">
          {pendingChoices.map((choice, i) => (
            <button key={i} className="btn btn-primary !py-1 text-xs" onClick={() => pick(choice)}>
              {choice.move.captureDir === "approach" ? "Capture ahead" : "Capture behind"} ({choice.captured.length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
