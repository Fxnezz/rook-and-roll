"use client";

import type { Color, PieceSymbol } from "chess.js";
import { Piece, type PieceSetId } from "@/lib/pieces";

/**
 * Shows the pieces a given side has captured, plus a running material score.
 * `pieces` are the captured piece TYPES; `color` is the colour of those pieces
 * (i.e. the colour being displayed in the tray).
 */
export function CapturedTray({
  pieces,
  color,
  set,
  advantage,
}: {
  pieces: PieceSymbol[];
  color: Color;
  set: PieceSetId;
  advantage: number;
}) {
  return (
    <div className="flex min-h-[1.5rem] items-center gap-2">
      <div className="flex items-center">
        {pieces.map((t, i) => (
          <span
            key={i}
            style={{ width: 20, height: 20, marginLeft: i === 0 ? 0 : -7 }}
            className="inline-block opacity-90"
          >
            <Piece type={t} color={color} set={set} size={20} />
          </span>
        ))}
      </div>
      {advantage > 0 && (
        <span className="text-xs font-semibold text-[var(--text-muted)]">+{advantage}</span>
      )}
    </div>
  );
}
