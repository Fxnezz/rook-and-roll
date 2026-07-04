"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export type Cell = Seat | null;

export interface OthelloState {
  board: Cell[][];
  turn: Seat;
  lastPassBy: Seat | null;
}

export interface Sq {
  row: number;
  col: number;
}

export type OthelloMove = { row: number; col: number } | { pass: true };

const SIZE = 8;
const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function otherSeat(p: Seat): Seat {
  return p === "a" ? "b" : "a";
}

/** UI-only pure helpers, mirroring the engine's flip logic — Othello moves are
 * single clicks (no multi-step chain like checkers), so there's no need for a
 * separate ghost-board preview step here. */
function flipsForMove(board: Cell[][], player: Seat, row: number, col: number): Sq[] {
  if (board[row][col] !== null) return [];
  const opp = otherSeat(player);
  const flips: Sq[] = [];
  for (const [dr, dc] of DIRS) {
    const line: Sq[] = [];
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === opp) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    if (line.length > 0 && inBounds(r, c) && board[r][c] === player) flips.push(...line);
  }
  return flips;
}

function legalMoves(board: Cell[][], player: Seat): Sq[] {
  const out: Sq[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (flipsForMove(board, player, row, col).length > 0) out.push({ row, col });
    }
  }
  return out;
}

function countDiscs(board: Cell[][]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const row of board) for (const c of row) { if (c === "a") a++; else if (c === "b") b++; }
  return { a, b };
}

const DISC_GRADIENT: Record<Seat, string> = {
  a: "radial-gradient(circle at 32% 26%, #4a5461, #1c2027 78%)",
  b: "radial-gradient(circle at 32% 26%, #fdf8ec, #d8cdb2 78%)",
};
const DISC_BORDER: Record<Seat, string> = { a: "#0a0c10", b: "#b8ac8e" };

export function OthelloBoard({
  state,
  mySeat,
  interactive,
  onMove,
  lastMove,
}: {
  state: OthelloState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: OthelloMove) => void;
  lastMove?: { move: OthelloMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);
  const [flipping, setFlipping] = useState<Map<string, { from: Seat; to: Seat; delay: number }>>(new Map());
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevBoard.current;
    const next = state.board;
    let placedCell: Sq | null = null;
    const flipped: Sq[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (prev[r][c] === null && next[r][c] !== null) placedCell = { row: r, col: c };
        else if (prev[r][c] !== null && next[r][c] !== null && prev[r][c] !== next[r][c]) flipped.push({ row: r, col: c });
      }
    }

    if (placedCell) {
      const key = `${placedCell.row}-${placedCell.col}`;
      setPlaced(key);
      playArcadeSound("place");
      const t1 = setTimeout(() => setPlaced(null), 300);

      if (flipped.length > 0) {
        const origin = placedCell;
        const map = new Map<string, { from: Seat; to: Seat; delay: number }>();
        for (const f of flipped) {
          const dist = Math.max(Math.abs(f.row - origin.row), Math.abs(f.col - origin.col));
          map.set(`${f.row}-${f.col}`, { from: prev[f.row][f.col]!, to: next[f.row][f.col]!, delay: dist * 55 });
        }
        setFlipping(map);
        playArcadeSound("flip");
        const maxDelay = Math.max(...flipped.map((f) => Math.max(Math.abs(f.row - origin.row), Math.abs(f.col - origin.col)))) * 55;
        const t2 = setTimeout(() => setFlipping(new Map()), maxDelay + 500);
        prevBoard.current = next;
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      prevBoard.current = next;
      return () => clearTimeout(t1);
    }
    prevBoard.current = next;
  }, [state.board]);

  const myLegal = canPlay ? legalMoves(state.board, mySeat!) : [];
  const isLegal = (r: number, c: number) => myLegal.some((m) => m.row === r && m.col === c);
  const mustPass = canPlay && myLegal.length === 0;

  const lastSq = lastMove && "row" in lastMove.move ? lastMove.move : null;
  const isLastMove = (r: number, c: number) => lastSq != null && lastSq.row === r && lastSq.col === c;

  const counts = countDiscs(state.board);

  const handleClick = (row: number, col: number) => {
    if (!canPlay || mustPass) return;
    if (isLegal(row, col)) onMove({ row, col });
  };

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div className="mb-2 flex items-center justify-center gap-6 text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-full border" style={{ background: DISC_GRADIENT.a, borderColor: DISC_BORDER.a }} />
          {counts.a}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-full border" style={{ background: DISC_GRADIENT.b, borderColor: DISC_BORDER.b }} />
          {counts.b}
        </span>
      </div>

      {mustPass && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-3 py-2 text-sm">
          <span>No legal move — you must pass.</span>
          <button className="btn !py-1" onClick={() => onMove({ pass: true })}>
            Pass
          </button>
        </div>
      )}
      {state.lastPassBy != null && !mustPass && (
        <p className="mb-2 text-center text-xs text-[var(--text-faint)]">
          {state.lastPassBy === mySeat ? "You had" : "Opponent had"} no legal move and passed.
        </p>
      )}

      <div
        className="grid aspect-square w-full grid-cols-8 gap-[3px] overflow-hidden rounded-2xl p-2 shadow-xl"
        style={{ background: "linear-gradient(160deg, #1c6b3d, #0f4526)" }}
      >
        {Array.from({ length: SIZE }).map((_, row) =>
          Array.from({ length: SIZE }).map((_, col) => {
            const cell = state.board[row][col];
            const key = `${row}-${col}`;
            const flip = flipping.get(key);
            const isPlacing = placed === key;
            const legal = isLegal(row, col);
            return (
              <button
                key={key}
                onClick={() => handleClick(row, col)}
                disabled={!canPlay || mustPass}
                className="relative flex items-center justify-center rounded-sm"
                style={{ background: "linear-gradient(155deg, #237a46, #145030)" }}
              >
                {isLastMove(row, col) && <span className="absolute inset-0" style={{ background: "rgba(80,160,255,0.28)" }} />}
                {legal && (
                  <span
                    className="absolute rounded-full"
                    style={{ width: "24%", height: "24%", background: "rgba(255,255,255,0.35)" }}
                  />
                )}
                {flip ? (
                  <span
                    className="absolute inset-[9%]"
                    style={{ perspective: "200px" }}
                  >
                    <span
                      className="disc-flip-wrapper block h-full w-full"
                      style={{ animationDelay: `${flip.delay}ms` }}
                    >
                      <span className="disc-face" style={{ background: DISC_GRADIENT[flip.from], borderColor: DISC_BORDER[flip.from] }} />
                      <span className="disc-face disc-back" style={{ background: DISC_GRADIENT[flip.to], borderColor: DISC_BORDER[flip.to] }} />
                    </span>
                  </span>
                ) : (
                  cell && (
                    <span
                      className="absolute inset-[9%] rounded-full border-2"
                      style={{
                        background: DISC_GRADIENT[cell],
                        borderColor: DISC_BORDER[cell],
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25)",
                        animation: isPlacing ? "ob-place 0.22s ease-out" : undefined,
                      }}
                    />
                  )
                )}
              </button>
            );
          }),
        )}
      </div>
      <style>{`
        @keyframes ob-place {
          0% { transform: scale(0.3); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        .disc-flip-wrapper {
          position: relative;
          transform-style: preserve-3d;
          animation: ob-flip 0.5s ease forwards;
        }
        @keyframes ob-flip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        .disc-face {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid;
          backface-visibility: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25);
        }
        .disc-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
