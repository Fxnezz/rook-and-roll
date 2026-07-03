"use client";

import { useEffect, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { legalDestinations, applyHop, justKinged, jumpsFrom, type Board, type Sq } from "@/lib/boardgames/checkersHints";

export interface CheckersState {
  board: Board;
  turn: Seat;
}

export interface CheckersMove {
  path: Sq[];
}

export function CheckersBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: CheckersState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: CheckersMove) => void;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [path, setPath] = useState<Sq[]>([]);
  const [ghostBoard, setGhostBoard] = useState<Board>(state.board);

  useEffect(() => {
    setPath([]);
    setGhostBoard(state.board);
  }, [state.board]);

  const selected = path[0] ?? null;
  const cur = path.length ? path[path.length - 1] : null;

  // Mid-chain (already made one jump): must continue jumping from `cur` on
  // the ghost board. Fresh selection (path.length === 1): normal legal
  // destinations, which already account for forced capture board-wide.
  const destinations: Sq[] = !cur
    ? []
    : path.length > 1
      ? jumpsFrom(ghostBoard, cur.row, cur.col)
      : legalDestinations(state.board, cur.row, cur.col, mySeat!);

  const isDest = (r: number, c: number) => destinations.some((d) => d.row === r && d.col === c);

  const handleClick = (row: number, col: number) => {
    if (!canPlay) return;
    const piece = ghostBoard[row][col];

    // Starting a fresh selection.
    if (!cur) {
      if (piece && piece.player === mySeat) {
        const dests = legalDestinations(state.board, row, col, mySeat!);
        if (dests.length > 0) setPath([{ row, col }]);
      }
      return;
    }

    // Clicking a highlighted destination extends the path.
    if (isDest(row, col)) {
      const nb = applyHop(ghostBoard, cur, { row, col });
      const newPath = [...path, { row, col }];
      const kinged = justKinged(nb, { row, col });
      const further = kinged ? [] : jumpsFrom(nb, row, col);
      const wasJump = Math.abs(row - cur.row) === 2;
      if (wasJump && further.length > 0) {
        setGhostBoard(nb);
        setPath(newPath);
      } else {
        onMove({ path: newPath });
        setPath([]);
        setGhostBoard(state.board);
      }
      return;
    }

    // Clicking a different own piece restarts selection (only before any jump committed).
    if (piece && piece.player === mySeat && path.length <= 1) {
      const dests = legalDestinations(state.board, row, col, mySeat!);
      if (dests.length > 0) setPath([{ row, col }]);
      else setPath([]);
    }
  };

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[480px] grid-cols-8 overflow-hidden rounded-2xl shadow-lg">
      {Array.from({ length: 8 }).map((_, displayRow) =>
        Array.from({ length: 8 }).map((_, col) => {
          const row = 7 - displayRow; // render row 7 (b's back rank) at top
          const dark = (row + col) % 2 === 1;
          const piece = ghostBoard[row][col];
          const isSelected = selected && selected.row === row && selected.col === col;
          const highlighted = isDest(row, col);
          return (
            <button
              key={`${row}-${col}`}
              onClick={() => handleClick(row, col)}
              disabled={!canPlay}
              className="relative flex items-center justify-center"
              style={{ background: dark ? "#6f8f5a" : "#ebecd0" }}
            >
              {isSelected && <span className="absolute inset-0" style={{ background: "rgba(233,199,63,0.5)" }} />}
              {highlighted && (
                <span
                  className="absolute rounded-full"
                  style={{ width: "28%", height: "28%", background: "rgba(30,40,20,0.4)" }}
                />
              )}
              {piece && (
                <span
                  className="absolute inset-[10%] rounded-full border-2 shadow-md"
                  style={{
                    background: piece.player === "a" ? "#2c313a" : "#f1ece0",
                    borderColor: piece.player === "a" ? "#0a0c10" : "#cbc3b1",
                  }}
                >
                  {piece.king && (
                    <span
                      className="flex h-full items-center justify-center text-lg font-black"
                      style={{ color: piece.player === "a" ? "#e9a23b" : "#c07d1f" }}
                    >
                      ♚
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
