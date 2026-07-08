"use client";

import { useEffect, useRef } from "react";
import type { Move } from "chess.js";

const FIGURINE_GLYPHS: Record<string, { w: string; b: string }> = {
  N: { w: "♘", b: "♞" },
  B: { w: "♗", b: "♝" },
  R: { w: "♖", b: "♜" },
  Q: { w: "♕", b: "♛" },
  K: { w: "♔", b: "♚" },
};

/** Swaps the leading piece letter of a SAN string (N/B/R/Q/K) for its Unicode figurine glyph. */
function toFigurineSan(san: string, color: "w" | "b"): string {
  const letter = san[0];
  const glyph = FIGURINE_GLYPHS[letter];
  if (!glyph) return san;
  return glyph[color] + san.slice(1);
}

export function MoveList({
  moves,
  viewPly,
  onGoToPly,
  compact = false,
  figurineNotation = false,
}: {
  moves: Move[];
  viewPly: number;
  onGoToPly: (ply: number) => void;
  /** Tighter row height + smaller text for fitting more moves on screen. */
  compact?: boolean;
  /** Show piece-glyph (figurine) notation instead of letters. */
  figurineNotation?: boolean;
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
        className={`rounded text-left font-mono transition-colors ${compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"} ${
          active
            ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold"
            : "text-[var(--text)] hover:bg-[var(--bg-elev-2)]"
        }`}
      >
        {figurineNotation ? toFigurineSan(move.san, move.color) : move.san}
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
          <span className={`text-right text-[var(--text-faint)] tabular-nums ${compact ? "text-[0.65rem]" : "text-xs"}`}>{r.num}.</span>
          <Cell move={r.white} ply={r.whitePly} />
          <Cell move={r.black} ply={r.blackPly} />
        </div>
      ))}
    </div>
  );
}
