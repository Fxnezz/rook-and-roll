"use client";

import { useMemo } from "react";
import type { Move } from "chess.js";
import { openingFor, bookDepth } from "@/lib/openings";

/**
 * One-line live opening readout: ECO code + deepest matching book name, and —
 * once the game leaves known theory — which move left the book.
 */
export function OpeningTicker({ moves }: { moves: Move[] }) {
  const info = useMemo(() => {
    const history = moves.map((m) => m.san);
    if (history.length === 0) return null;
    const opening = openingFor(history);
    if (!opening) return null;
    const depth = bookDepth(history);
    const leftBook = depth < history.length;
    // ply -> move number of the first non-book move
    const leftAt = Math.ceil((depth + 1) / 2);
    return { ...opening, leftBook, leftAt };
  }, [moves]);

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5 text-xs">
      <span className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono font-bold text-[var(--text-muted)]">
        {info.eco}
      </span>
      <span className="min-w-0 truncate font-semibold">{info.name}</span>
      {info.leftBook && (
        <span className="ml-auto shrink-0 text-[var(--text-faint)]">left book at move {info.leftAt}</span>
      )}
    </div>
  );
}
