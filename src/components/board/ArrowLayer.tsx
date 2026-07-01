"use client";

import type { Color, Square } from "chess.js";
import { squareToPercent } from "@/lib/chess/squares";

export interface Arrow {
  from: Square;
  to: Square;
  color: string;
}

function center(square: Square, orientation: Color) {
  const { x, y } = squareToPercent(square, orientation);
  return { x: x + 6.25, y: y + 6.25 };
}

export function ArrowLayer({ arrows, orientation }: { arrows: Arrow[]; orientation: Color }) {
  if (arrows.length === 0) return null;
  return (
    <svg
      className="absolute inset-0 z-20 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {arrows.map((a, i) => {
        const p1 = center(a.from, orientation);
        const p2 = center(a.to, orientation);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const head = 4.4;
        const width = 2.1;
        // start a little away from the origin square centre; stop short for the head
        const sx = p1.x + ux * 3.2;
        const sy = p1.y + uy * 3.2;
        const ex = p2.x - ux * head;
        const ey = p2.y - uy * head;
        // arrow head triangle
        const nx = -uy;
        const ny = ux;
        const tip = `${p2.x - ux * 1.2},${p2.y - uy * 1.2}`;
        const b1 = `${ex + nx * head * 0.62},${ey + ny * head * 0.62}`;
        const b2 = `${ex - nx * head * 0.62},${ey - ny * head * 0.62}`;
        return (
          <g key={i} style={{ opacity: 0.85 }}>
            <line
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={a.color}
              strokeWidth={width}
              strokeLinecap="round"
            />
            <polygon points={`${tip} ${b1} ${b2}`} fill={a.color} />
          </g>
        );
      })}
    </svg>
  );
}
