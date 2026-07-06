"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 7;

export interface QuoridorState {
  positions: Record<Seat, number>;
  wallsLeft: Record<Seat, number>;
  hWalls: string[];
  vWalls: string[];
  turn: Seat;
}

export type QuoridorMove = { type: "move"; to: number } | { type: "wall"; orientation: "h" | "v"; wr: number; wc: number };

function rc(cell: number): [number, number] {
  return [Math.floor(cell / SIZE), cell % SIZE];
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

// UI-only copy of edge-blocking + legal-move logic, purely for highlighting.
function edgeBlocked(hWalls: Set<string>, vWalls: Set<string>, r1: number, c1: number, r2: number, c2: number): boolean {
  if (r1 === r2) {
    const col = Math.min(c1, c2);
    return vWalls.has(`${r1 - 1},${col}`) || vWalls.has(`${r1},${col}`);
  }
  const row = Math.min(r1, r2);
  return hWalls.has(`${row},${c1 - 1}`) || hWalls.has(`${row},${c1}`);
}

const DIRS4: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function legalPawnMoves(state: QuoridorState, player: Seat): number[] {
  const hSet = new Set(state.hWalls);
  const vSet = new Set(state.vWalls);
  const opp = player === "a" ? "b" : "a";
  const [r, c] = rc(state.positions[player]);
  const moves: number[] = [];
  for (const [dr, dc] of DIRS4) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc) || edgeBlocked(hSet, vSet, r, c, nr, nc)) continue;
    const target = nr * SIZE + nc;
    if (target === state.positions[opp]) {
      const jr = nr + dr;
      const jc = nc + dc;
      if (inBounds(jr, jc) && !edgeBlocked(hSet, vSet, nr, nc, jr, jc)) {
        moves.push(jr * SIZE + jc);
      } else {
        const perp: [number, number][] = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
        for (const [ddr, ddc] of perp) {
          const sr = nr + ddr;
          const sc = nc + ddc;
          if (inBounds(sr, sc) && !edgeBlocked(hSet, vSet, nr, nc, sr, sc)) moves.push(sr * SIZE + sc);
        }
      }
      continue;
    }
    moves.push(target);
  }
  return moves;
}

export function QuoridorBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: QuoridorState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: QuoridorMove) => void;
  lastMove?: { move: QuoridorMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [mode, setMode] = useState<"move" | "h" | "v">("move");
  const dests = canPlay && mode === "move" ? legalPawnMoves(state, mySeat!) : [];
  const hSet = new Set(state.hWalls);
  const vSet = new Set(state.vWalls);

  const clickCell = (cell: number) => {
    if (!canPlay || mode !== "move" || !dests.includes(cell)) return;
    playArcadeSound("place");
    onMove({ type: "move", to: cell });
  };

  const clickIntersection = (wr: number, wc: number) => {
    if (!canPlay || mode === "move") return;
    playArcadeSound("place");
    onMove({ type: "wall", orientation: mode, wr, wc });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--text-muted)]">Walls left — you: {mySeat ? state.wallsLeft[mySeat] : 0}</span>
        <button className={`btn !py-1 text-xs ${mode === "move" ? "btn-primary" : ""}`} onClick={() => setMode("move")}>
          Move
        </button>
        <button className={`btn !py-1 text-xs ${mode === "h" ? "btn-primary" : ""}`} onClick={() => setMode("h")}>
          Wall ─
        </button>
        <button className={`btn !py-1 text-xs ${mode === "v" ? "btn-primary" : ""}`} onClick={() => setMode("v")}>
          Wall │
        </button>
      </div>

      <div
        className="grid gap-0"
        style={{ gridTemplateColumns: `repeat(${2 * SIZE - 1}, minmax(0,1fr))`, width: "min(100%, 480px)", aspectRatio: "1" }}
      >
        {Array.from({ length: 2 * SIZE - 1 }).map((_, gr) =>
          Array.from({ length: 2 * SIZE - 1 }).map((_, gc) => {
            const key = `${gr}-${gc}`;
            if (gr % 2 === 0 && gc % 2 === 0) {
              const cell = (gr / 2) * SIZE + gc / 2;
              const isA = state.positions.a === cell;
              const isB = state.positions.b === cell;
              const isDest = dests.includes(cell);
              return (
                <button
                  key={key}
                  disabled={!isDest}
                  onClick={() => clickCell(cell)}
                  className="relative flex items-center justify-center"
                  style={{ background: "var(--bg)", outline: isDest ? "2px solid var(--good)" : "1px solid var(--border)" }}
                >
                  {(isA || isB) && (
                    <span
                      className="h-[65%] w-[65%] rounded-full"
                      style={{ background: isA ? "#e8e0c8" : "#4a5461" }}
                    />
                  )}
                </button>
              );
            }
            if (gr % 2 === 1 && gc % 2 === 0) {
              const wr = (gr - 1) / 2;
              const c = gc / 2;
              const wc = c < SIZE - 1 ? c : c - 1;
              const filled = hSet.has(`${wr},${wc}`) || (wc > 0 && hSet.has(`${wr},${wc - 1}`));
              return (
                <button
                  key={key}
                  onClick={() => clickIntersection(wr, wc)}
                  className="h-full w-full"
                  style={{ background: filled ? "var(--accent)" : mode === "h" && canPlay ? "rgba(120,200,140,0.2)" : "transparent" }}
                />
              );
            }
            if (gr % 2 === 0 && gc % 2 === 1) {
              const r = gr / 2;
              const wc = (gc - 1) / 2;
              const wr = r < SIZE - 1 ? r : r - 1;
              const filled = vSet.has(`${wr},${wc}`) || (wr > 0 && vSet.has(`${wr - 1},${wc}`));
              return (
                <button
                  key={key}
                  onClick={() => clickIntersection(wr, wc)}
                  className="h-full w-full"
                  style={{ background: filled ? "var(--accent)" : mode === "v" && canPlay ? "rgba(120,200,140,0.2)" : "transparent" }}
                />
              );
            }
            const wr = (gr - 1) / 2;
            const wc = (gc - 1) / 2;
            const filled = hSet.has(`${wr},${wc}`) || vSet.has(`${wr},${wc}`);
            return <div key={key} style={{ background: filled ? "var(--accent)" : "transparent" }} />;
          }),
        )}
      </div>
      <p className="text-center text-xs text-[var(--text-faint)]">
        You (tan) reach the {mySeat === "b" ? "top" : "bottom"} row to win. Pick Move or a wall orientation, then click the board.
      </p>
    </div>
  );
}
