"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const ROWS = 6;
const COLS = 6;

export interface DomineeringState {
  board: boolean[];
  turn: Seat;
}

export interface DomineeringMove {
  cell: number;
}

function partnerCell(cell: number, owner: Seat): number | null {
  const row = Math.floor(cell / COLS);
  const col = cell % COLS;
  if (owner === "a") return row + 1 < ROWS ? cell + COLS : null;
  return col + 1 < COLS ? cell + 1 : null;
}

export function DomineeringBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: DomineeringState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: DomineeringMove) => void;
  lastMove?: { move: DomineeringMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [hover, setHover] = useState<number | null>(null);

  const isLegal = (cell: number): boolean => {
    if (mySeat == null) return false;
    const partner = partnerCell(cell, mySeat);
    return partner != null && !state.board[cell] && !state.board[partner];
  };

  const click = (cell: number) => {
    if (!canPlay || !isLegal(cell)) return;
    playArcadeSound("place");
    onMove({ cell });
  };

  const hoverPartner = hover != null && mySeat != null ? partnerCell(hover, mySeat) : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        {mySeat === "a"
          ? "You place vertical dominoes."
          : mySeat === "b"
            ? "You place horizontal dominoes."
            : "Vertical vs horizontal domino placement."}{" "}
        Whoever can't move loses.
      </p>
      <div className="grid grid-cols-6 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
        {state.board.map((occupied, i) => {
          const highlighted = canPlay && isLegal(i) && (hover === i || hoverPartner === i);
          return (
            <button
              key={i}
              disabled={!canPlay || occupied || !isLegal(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => click(i)}
              className="flex aspect-square items-center justify-center rounded-sm transition-colors"
              style={{
                background: occupied
                  ? "var(--text-faint)"
                  : highlighted
                    ? "var(--accent)"
                    : canPlay && isLegal(i)
                      ? "var(--bg)"
                      : "var(--bg-elev)",
                opacity: occupied ? 0.5 : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
