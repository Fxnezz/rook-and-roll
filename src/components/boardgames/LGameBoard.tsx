"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 4;

export interface LGameState {
  lCells: Record<Seat, number[]>;
  neutral: [number, number];
  turn: Seat;
}

export interface LGameMove {
  lCells: number[];
  neutralMove?: { which: 0 | 1; to: number };
}

const BASE_SHAPE: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
];
function rotate90(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [c, -r]);
}
function reflect(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [r, -c]);
}
function normalize(cells: [number, number][]): [number, number][] {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
function allShapes(): [number, number][][] {
  const seen = new Map<string, [number, number][]>();
  for (const base of [BASE_SHAPE, reflect(BASE_SHAPE)]) {
    let cur = base;
    for (let i = 0; i < 4; i++) {
      const norm = normalize(cur);
      seen.set(JSON.stringify(norm), norm);
      cur = rotate90(cur);
    }
  }
  return [...seen.values()];
}
const L_SHAPES = allShapes();

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function possiblePlacements(state: LGameState, player: Seat): number[][] {
  const opponent: Seat = player === "a" ? "b" : "a";
  const blocked = new Set([...state.lCells[opponent], ...state.neutral]);
  const currentKey = [...state.lCells[player]].sort((a, b) => a - b).join(",");
  const out: number[][] = [];
  const seen = new Set<string>();
  for (const shape of L_SHAPES) {
    for (let anchorR = 0; anchorR < SIZE; anchorR++) {
      for (let anchorC = 0; anchorC < SIZE; anchorC++) {
        const cells: number[] = [];
        let ok = true;
        for (const [dr, dc] of shape) {
          const r = anchorR + dr;
          const c = anchorC + dc;
          if (!inBounds(r, c)) {
            ok = false;
            break;
          }
          cells.push(r * SIZE + c);
        }
        if (!ok || cells.some((c) => blocked.has(c))) continue;
        const key = [...cells].sort((a, b) => a - b).join(",");
        if (key === currentKey || seen.has(key)) continue;
        seen.add(key);
        out.push(cells);
      }
    }
  }
  return out;
}

export function LGameBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: LGameState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: LGameMove) => void;
  lastMove?: { move: LGameMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [candidates, setCandidates] = useState<number[][] | null>(null);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [confirmedL, setConfirmedL] = useState<number[] | null>(null);
  const [neutralPick, setNeutralPick] = useState<0 | 1 | null>(null);

  const allPlacements = canPlay ? possiblePlacements(state, mySeat!) : [];

  const seedCell = (cell: number) => {
    if (!canPlay || confirmedL) return;
    const matches = allPlacements.filter((p) => p.includes(cell));
    if (matches.length === 0) return;
    setCandidates(matches);
    setCandidateIdx(0);
    playArcadeSound("click");
  };

  const cycle = () => {
    if (!candidates) return;
    setCandidateIdx((i) => (i + 1) % candidates.length);
  };

  const confirmL = () => {
    if (!candidates) return;
    playArcadeSound("place");
    setConfirmedL(candidates[candidateIdx]);
    setCandidates(null);
  };

  const finishTurn = (neutralMove?: { which: 0 | 1; to: number }) => {
    if (!confirmedL) return;
    onMove({ lCells: confirmedL, neutralMove });
    setConfirmedL(null);
    setNeutralPick(null);
  };

  const clickForNeutral = (cell: number) => {
    if (!confirmedL) return;
    if (neutralPick == null) {
      if (state.neutral[0] === cell) setNeutralPick(0);
      else if (state.neutral[1] === cell) setNeutralPick(1);
      return;
    }
    const occupied = new Set([...confirmedL, state.neutral[neutralPick === 0 ? 1 : 0]]);
    if (occupied.has(cell)) return;
    finishTurn({ which: neutralPick, to: cell });
  };

  const previewCells = new Set(candidates ? candidates[candidateIdx] : confirmedL ?? []);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        {confirmedL
          ? "Optionally move a neutral (gray) piece, or skip."
          : candidates
            ? "Cycle through placements touching that square, then confirm."
            : "Click a square your L-piece could reach."}
      </p>
      <div className="grid w-full max-w-xs grid-cols-4 gap-1 rounded-md p-1" style={{ background: "var(--border)" }}>
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const isA = state.lCells.a.includes(i);
          const isB = state.lCells.b.includes(i);
          const isNeutral = state.neutral.includes(i);
          const isPreview = previewCells.has(i);
          return (
            <button
              key={i}
              onClick={() => (confirmedL ? clickForNeutral(i) : seedCell(i))}
              disabled={!canPlay}
              className="flex aspect-square items-center justify-center rounded-sm"
              style={{
                background: isPreview ? "var(--accent)" : "var(--bg)",
                outline: neutralPick != null && state.neutral[neutralPick] === i ? "2px solid var(--good)" : "none",
              }}
            >
              {!isPreview && isA && <span className="h-[70%] w-[70%] rounded-sm" style={{ background: "#e8e0c8" }} />}
              {!isPreview && isB && <span className="h-[70%] w-[70%] rounded-sm" style={{ background: "#2a2a2a", border: "2px solid #555" }} />}
              {isNeutral && <span className="h-[45%] w-[45%] rounded-full" style={{ background: "#888" }} />}
            </button>
          );
        })}
      </div>
      {candidates && (
        <div className="flex gap-2">
          <button className="btn !py-1 text-xs" onClick={cycle}>
            Cycle ({candidateIdx + 1}/{candidates.length})
          </button>
          <button className="btn btn-primary !py-1 text-xs" onClick={confirmL}>
            Confirm
          </button>
        </div>
      )}
      {confirmedL && (
        <button className="btn !py-1 text-xs" onClick={() => finishTurn()}>
          Skip neutral move
        </button>
      )}
    </div>
  );
}
