"use client";

import type { Color } from "chess.js";

/**
 * Vertical evaluation bar. `cp` and `mate` are from White's perspective.
 * White advantage grows the white portion from the bottom.
 */
export function EvalBar({
  cp,
  mate,
  orientation,
}: {
  cp: number | null;
  mate: number | null;
  orientation: Color;
}) {
  let whiteFraction = 0.5;
  let label = "0.0";
  if (mate != null) {
    whiteFraction = mate > 0 ? 1 : 0;
    label = `M${Math.abs(mate)}`;
  } else if (cp != null) {
    // squash centipawns into 0..1 with a smooth curve
    whiteFraction = 1 / (1 + Math.exp(-cp / 320));
    label = (Math.abs(cp) / 100).toFixed(1);
  }
  const whitePct = Math.round(whiteFraction * 100);
  // When board is flipped (black at bottom), invert the bar so it matches.
  const flip = orientation === "b";

  return (
    <div
      className="relative h-full w-3.5 shrink-0 overflow-hidden rounded-full bg-[#2b2f37]"
      title={mate != null ? `Mate in ${Math.abs(mate)}` : `Eval ${cp != null ? (cp / 100).toFixed(2) : "0"}`}
      style={{ transform: flip ? "rotate(180deg)" : undefined }}
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-[#f1ece0] transition-[height] duration-500 ease-out"
        style={{ height: `${whitePct}%` }}
      />
      <div
        className="absolute inset-x-0 flex justify-center text-[7px] font-bold tabular-nums"
        style={{
          [whiteFraction > 0.5 ? "bottom" : "top"]: "2px",
          color: whiteFraction > 0.5 ? "#2b2f37" : "#f1ece0",
          transform: flip ? "rotate(180deg)" : undefined,
        }}
      >
        {label}
      </div>
    </div>
  );
}
