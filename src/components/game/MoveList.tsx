"use client";

import { useEffect, useRef } from "react";
import type { Move } from "chess.js";

export function MoveList({
  moves,
  viewPly,
  onGoToPly,
}: {
  moves: Move[];
  viewPly: number;
  onGoToPly: (ply: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = activeRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    // Scroll ONLY the move-list container into view — never the page. Using
    // element.scrollIntoView() here would bubble up and scroll the whole
    // window, which on mobile jumps the viewport down off the board.
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    if (elRect.top < cRect.top || elRect.bottom > cRect.bottom) {
      container.scrollTop += elRect.top - cRect.top - (cRect.height - elRect.height) / 2;
    }
  }, [viewPly]);

  const rows: { num: number; white?: Move; black?: Move; whitePly: number; blackPly: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
      whitePly: i + 1,
      blackPly: i + 2,
    });
  }

  if (moves.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--text-faint)]">
        Moves will appear here as you play.
      </div>
    );
  }

  const Cell = ({ move, ply }: { move?: Move; ply: number }) => {
    if (!move) return <span className="px-2" />;
    const active = ply === viewPly;
    return (
      <button
        ref={active ? activeRef : undefined}
        onClick={() => onGoToPly(ply)}
        className={`rounded px-2 py-1 text-left font-mono text-sm transition-colors ${
          active
            ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold"
            : "text-[var(--text)] hover:bg-[var(--bg-elev-2)]"
        }`}
      >
        {move.san}
      </button>
    );
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto py-1">
      {rows.map((r) => (
        <div
          key={r.num}
          className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-1 px-2 odd:bg-[var(--bg-elev)]/40"
        >
          <span className="text-right text-xs text-[var(--text-faint)] tabular-nums">{r.num}.</span>
          <Cell move={r.white} ply={r.whitePly} />
          <Cell move={r.black} ply={r.blackPly} />
        </div>
      ))}
    </div>
  );
}
