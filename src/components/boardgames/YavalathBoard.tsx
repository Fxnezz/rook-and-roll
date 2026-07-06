"use client";

import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const RADIUS = 4;

const CELLS: [number, number][] = [];
for (let q = -RADIUS; q <= RADIUS; q++) {
  for (let r = -RADIUS; r <= RADIUS; r++) {
    if (Math.abs(q + r) <= RADIUS) CELLS.push([q, r]);
  }
}

export type Cell = Seat | null;

export interface YavalathState {
  board: Cell[];
  turn: Seat;
}

export interface YavalathMove {
  cell: number;
}

const HEX_SIZE = 22;
function hexToPixel(q: number, r: number): [number, number] {
  const x = HEX_SIZE * (1.5 * q);
  const y = HEX_SIZE * (Math.sqrt(3) * (r + q / 2));
  return [x, y];
}

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export function YavalathBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: YavalathState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: YavalathMove) => void;
  lastMove?: { move: YavalathMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;

  const positions = CELLS.map(([q, r]) => hexToPixel(q, r));
  const xs = positions.map((p) => p[0]);
  const ys = positions.map((p) => p[1]);
  const minX = Math.min(...xs) - HEX_SIZE;
  const maxX = Math.max(...xs) + HEX_SIZE;
  const minY = Math.min(...ys) - HEX_SIZE;
  const maxY = Math.max(...ys) + HEX_SIZE;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Four in a row wins. Three in a row loses — unless that same move also makes four.
      </p>
      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} width="100%" style={{ maxWidth: 480, aspectRatio: `${maxX - minX}/${maxY - minY}` }}>
        {CELLS.map(([q, r], i) => {
          const [cx, cy] = hexToPixel(q, r);
          const stone = state.board[i];
          return (
            <g
              key={i}
              onClick={() => {
                if (!canPlay || stone != null) return;
                playArcadeSound("place");
                onMove({ cell: i });
              }}
              style={{ cursor: canPlay && stone == null ? "pointer" : "default" }}
            >
              <polygon points={hexPoints(cx, cy, HEX_SIZE - 1)} fill="var(--bg)" stroke="var(--border-strong)" strokeWidth={1} />
              {stone && (
                <circle cx={cx} cy={cy} r={HEX_SIZE * 0.55} fill={stone === "a" ? "#e8e0c8" : "#2a2a2a"} stroke={stone === "a" ? "#c8bd9a" : "#111"} strokeWidth={1.5} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
