"use client";

import { useEffect, useRef, useState } from "react";
import type { Move } from "chess.js";
import { parseAnnotation } from "@/lib/chess/nag";
import { IconCopy } from "@/components/ui/icons";

/** Plain-text move list, e.g. "1. e4 e5 2. Nf3 Nc6 ..." — used by the copy button and shareable elsewhere. */
export function movesToText(moves: Move[]): string {
  const parts: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const num = i / 2 + 1;
    const white = moves[i]?.san;
    const black = moves[i + 1]?.san;
    if (white) parts.push(`${num}. ${white}`);
    if (black) parts.push(black);
  }
  return parts.join(" ");
}

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
  commentsByPly,
}: {
  moves: Move[];
  viewPly: number;
  onGoToPly: (ply: number) => void;
  /** Tighter row height + smaller text for fitting more moves on screen. */
  compact?: boolean;
  /** Show piece-glyph (figurine) notation instead of letters. */
  figurineNotation?: boolean;
  /** Move comments (optionally NAG-prefixed) keyed by ply, for the annotation indicator. */
  commentsByPly?: Record<number, string>;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const jumpToMoveNumber = () => {
    const n = parseInt(jumpValue, 10);
    if (!Number.isFinite(n) || n < 1) return;
    onGoToPly(Math.min(n * 2 - 1, moves.length));
    setJumpValue("");
  };
  const copyMoves = async () => {
    try {
      await navigator.clipboard.writeText(movesToText(moves));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };
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
    const comment = commentsByPly?.[ply];
    const { nag, text } = parseAnnotation(comment);
    return (
      <button
        ref={active ? activeRef : undefined}
        onClick={() => onGoToPly(ply)}
        title={text || undefined}
        className={`relative rounded text-left font-mono transition-colors ${compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"} ${
          active
            ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold"
            : "text-[var(--text)] hover:bg-[var(--bg-elev-2)]"
        }`}
      >
        {figurineNotation ? toFigurineSan(move.san, move.color) : move.san}
        {nag && <span className="ml-0.5">{nag}</span>}
        {text && <span className="ml-0.5 align-super text-[0.55em] text-[var(--accent)]">●</span>}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-1">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && jumpToMoveNumber()}
            placeholder="#"
            aria-label="Jump to move number"
            className="input !w-12 !py-0.5 !px-1.5 text-xs"
          />
          <button
            className="hover-lift rounded-md px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            onClick={jumpToMoveNumber}
            disabled={!jumpValue}
            title="Jump to this move number"
          >
            Go
          </button>
        </div>
        <button
          className="hover-lift flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          onClick={copyMoves}
          title="Copy the move list as plain text"
        >
          <IconCopy width={12} height={12} /> {copied ? "Copied" : "Copy moves"}
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-1">
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
    </div>
  );
}
