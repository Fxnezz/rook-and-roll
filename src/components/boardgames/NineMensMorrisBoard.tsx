"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export type Points = (Seat | null)[];

export interface NineMensMorrisState {
  points: Points;
  toPlace: { a: number; b: number };
  turn: Seat;
  movesSinceRemoval: number;
}

export type NineMensMorrisMove =
  | { type: "place"; point: number; remove?: number }
  | { type: "move"; from: number; to: number; remove?: number };

const MILLS: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];
const MILLS_BY_POINT = Array.from({ length: 24 }, (_, p) => MILLS.filter((m) => m.includes(p)));

function buildAdjacency(): number[][] {
  const adj: Set<number>[] = Array.from({ length: 24 }, () => new Set<number>());
  for (const mill of MILLS) {
    adj[mill[0]].add(mill[1]);
    adj[mill[1]].add(mill[0]);
    adj[mill[1]].add(mill[2]);
    adj[mill[2]].add(mill[1]);
  }
  return adj.map((s) => [...s]);
}
const ADJACENCY = buildAdjacency();

// (row, col) on a 0-6 grid, matching the classic 3-nested-squares layout.
const POINT_COORDS: [number, number][] = [
  [0, 0], [0, 3], [0, 6],
  [1, 1], [1, 3], [1, 5],
  [2, 2], [2, 3], [2, 4],
  [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6],
  [4, 2], [4, 3], [4, 4],
  [5, 1], [5, 3], [5, 5],
  [6, 0], [6, 3], [6, 6],
];

function formsMill(points: Points, player: Seat, point: number): boolean {
  return MILLS_BY_POINT[point].some((mill) => mill.every((p) => points[p] === player));
}
function allInMills(points: Points, player: Seat): boolean {
  const owned = points.map((p, i) => (p === player ? i : -1)).filter((i) => i >= 0);
  return owned.every((i) => MILLS_BY_POINT[i].some((mill) => mill.every((p) => points[p] === player)));
}
function canRemove(points: Points, opponent: Seat, target: number): boolean {
  if (points[target] !== opponent) return false;
  const inMill = MILLS_BY_POINT[target].some((mill) => mill.every((p) => points[p] === opponent));
  return !inMill || allInMills(points, opponent);
}
function otherSeat(p: Seat): Seat {
  return p === "a" ? "b" : "a";
}

const PIECE_COLOR: Record<Seat, string> = { a: "#5a7ae0", b: "#e07a5a" };
const CELL = 54;
const MARGIN = 20;

export function NineMensMorrisBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: NineMensMorrisState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: NineMensMorrisMove) => void;
  lastMove?: { move: NineMensMorrisMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const phase: "placing" | "moving" = state.toPlace.a > 0 || state.toPlace.b > 0 ? "placing" : "moving";
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<NineMensMorrisMove | null>(null);

  const submit = (move: NineMensMorrisMove) => {
    // Predict whether this move forms a mill; if so, require picking a removal target first.
    const trial = [...state.points];
    if (move.type === "place") trial[move.point] = mySeat!;
    else {
      trial[move.from] = null;
      trial[move.to] = mySeat!;
    }
    const landed = move.type === "place" ? move.point : move.to;
    if (formsMill(trial, mySeat!, landed)) {
      setPending(move);
      playArcadeSound("capture");
    } else {
      onMove(move);
      playArcadeSound("place");
    }
    setSelected(null);
  };

  const handlePointClick = (point: number) => {
    if (!canPlay || pending) return;
    if (phase === "placing") {
      if (state.points[point] !== null) return;
      submit({ type: "place", point });
      return;
    }
    // moving phase
    if (state.points[point] === mySeat) {
      setSelected(point);
      return;
    }
    if (selected != null && state.points[point] === null) {
      const flying = state.points.filter((p) => p === mySeat).length === 3;
      if (flying || ADJACENCY[selected].includes(point)) {
        submit({ type: "move", from: selected, to: point });
      }
    }
  };

  const finishRemoval = (target: number) => {
    if (!pending) return;
    onMove({ ...pending, remove: target } as NineMensMorrisMove);
    setPending(null);
  };

  const opponent = mySeat ? otherSeat(mySeat) : "b";
  const removableTargets = pending
    ? Array.from({ length: 24 }, (_, i) => i).filter((i) => canRemove(state.points, opponent, i))
    : [];

  const size = 6 * CELL + MARGIN * 2;

  const edgeSet = new Set<string>();
  const edgeLines: React.ReactNode[] = [];
  for (let p = 0; p < 24; p++) {
    for (const q of ADJACENCY[p]) {
      const key = p < q ? `${p}-${q}` : `${q}-${p}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      const [r1, c1] = POINT_COORDS[p];
      const [r2, c2] = POINT_COORDS[q];
      edgeLines.push(
        <line
          key={key}
          x1={MARGIN + c1 * CELL}
          y1={MARGIN + r1 * CELL}
          x2={MARGIN + c2 * CELL}
          y2={MARGIN + r2 * CELL}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={2}
        />,
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-[var(--bg-elev)] p-3">
      {pending && (
        <p className="mb-2 text-center text-sm font-semibold text-[var(--warn)]">Mill! Tap an opponent piece to remove it.</p>
      )}
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="auto">
        {edgeLines}
        {POINT_COORDS.map(([r, c], point) => {
          const owner = state.points[point];
          const isSelected = selected === point;
          const isRemovable = removableTargets.includes(point);
          const clickable = pending ? isRemovable : canPlay && (phase === "placing" ? owner === null : owner === mySeat || (selected != null && owner === null));
          return (
            <g key={point}>
              <circle
                cx={MARGIN + c * CELL}
                cy={MARGIN + r * CELL}
                r={CELL * 0.32}
                fill={owner ? PIECE_COLOR[owner] : "rgba(255,255,255,0.06)"}
                stroke={isSelected ? "var(--accent)" : isRemovable ? "var(--bad)" : "rgba(255,255,255,0.3)"}
                strokeWidth={isSelected || isRemovable ? 3 : 1.5}
                style={{ cursor: clickable ? "pointer" : "default" }}
                onClick={() => (pending ? isRemovable && finishRemoval(point) : handlePointClick(point))}
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-6 text-xs text-[var(--text-faint)]">
        <span>To place — A: {state.toPlace.a}</span>
        <span>To place — B: {state.toPlace.b}</span>
      </div>
    </div>
  );
}
