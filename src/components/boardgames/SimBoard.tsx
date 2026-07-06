"use client";

import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const VERTEX_COUNT = 6;
const EDGES: [number, number][] = [];
for (let i = 0; i < VERTEX_COUNT; i++) for (let j = i + 1; j < VERTEX_COUNT; j++) EDGES.push([i, j]);

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 115;
const POINTS = Array.from({ length: VERTEX_COUNT }, (_, i) => {
  const angle = (Math.PI * 2 * i) / VERTEX_COUNT - Math.PI / 2;
  return [CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle)] as const;
});

export interface SimState {
  edges: (Seat | null)[];
  turn: Seat;
}

export interface SimMove {
  edge: number;
}

export function SimBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: SimState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: SimMove) => void;
  lastMove?: { move: SimMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Click a line to color it. Complete a triangle in your own color and you lose.
      </p>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={280} height={280}>
        {EDGES.map(([i, j], edgeIdx) => {
          const color = state.edges[edgeIdx];
          const [x1, y1] = POINTS[i];
          const [x2, y2] = POINTS[j];
          return (
            <line
              key={edgeIdx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color === "a" ? "var(--accent)" : color === "b" ? "var(--bad)" : "var(--border-strong)"}
              strokeWidth={color ? 4 : 2}
              strokeLinecap="round"
              style={{ cursor: canPlay && !color ? "pointer" : "default", opacity: color ? 1 : 0.5 }}
              onClick={() => {
                if (!canPlay || color) return;
                playArcadeSound("place");
                onMove({ edge: edgeIdx });
              }}
            />
          );
        })}
        {POINTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={7} fill="var(--text)" />
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-[var(--text-faint)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-4 rounded" style={{ background: "var(--accent)" }} /> Player 1
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-4 rounded" style={{ background: "var(--bad)" }} /> Player 2
        </span>
      </div>
    </div>
  );
}
