"use client";

import { useMemo } from "react";
import type { Move } from "chess.js";
import { explore } from "@/lib/openings";

/**
 * Shows named book continuations from the current position (curated static
 * dataset, not a live database). Clicking a move plays it.
 */
export function OpeningExplorer({
  moves,
  viewPly,
  onPlaySan,
}: {
  moves: Move[];
  viewPly: number;
  onPlaySan: (san: string) => void;
}) {
  const history = useMemo(() => moves.slice(0, viewPly).map((m) => m.san), [moves, viewPly]);
  const result = useMemo(() => explore(history), [history]);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <span className="label">Opening</span>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
          {result.currentEco && (
            <span className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--text-muted)]">
              {result.currentEco}
            </span>
          )}
          {result.currentName ?? (history.length === 0 ? "Starting position" : "Out of book")}
        </p>
      </div>

      {result.continuations.length > 0 ? (
        <div className="flex flex-col gap-1 overflow-y-auto">
          <span className="label">Book continuations</span>
          {result.continuations.map((c) => (
            <button
              key={c.san}
              onClick={() => onPlaySan(c.san)}
              className="flex items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-elev-2)]"
            >
              <span className="font-mono text-sm font-bold text-[var(--accent)]">{c.san}</span>
              <span className="min-w-0 flex-1 truncate px-3 text-xs text-[var(--text-muted)]">
                {c.name ?? ""}
              </span>
              <span className="text-xs text-[var(--text-faint)]">
                {c.lines} line{c.lines === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-faint)]">
          {result.inBook
            ? "End of the book line — you're on your own from here."
            : "This position isn't in the opening book. Head back toward a main line to explore."}
        </p>
      )}
    </div>
  );
}
