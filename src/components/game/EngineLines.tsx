"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { getEngine, type EngineLine } from "@/lib/engine/stockfish";
import { useSettings } from "@/lib/chess/useSettings";

interface DisplayLine {
  evalLabel: string;
  /** true when the eval favors White — drives the chip's light/dark styling */
  whiteBetter: boolean;
  sans: string[];
  firstUci: string;
}

/** Convert a UCI pv from `fen` into SAN, stopping at the first illegal move. */
function pvToSan(fen: string, pv: string[], maxMoves: number): string[] {
  const out: string[] = [];
  try {
    const g = new Chess(fen);
    for (const uci of pv.slice(0, maxMoves)) {
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      out.push(mv.san);
    }
  } catch {
    /* truncated pv is fine */
  }
  return out;
}

function toDisplay(fen: string, line: EngineLine): DisplayLine {
  const whiteToMove = fen.split(" ")[1] === "w";
  const sign = whiteToMove ? 1 : -1;
  let evalLabel: string;
  let whiteCp: number;
  if (line.mate != null) {
    const m = line.mate * sign;
    whiteCp = m > 0 ? 9999 : -9999;
    evalLabel = `${m > 0 ? "+" : "−"}M${Math.abs(m)}`;
  } else {
    whiteCp = (line.cp ?? 0) * sign;
    evalLabel = `${whiteCp >= 0 ? "+" : ""}${(whiteCp / 100).toFixed(1)}`;
  }
  return { evalLabel, whiteBetter: whiteCp >= 0, sans: pvToSan(fen, line.pv, 6), firstUci: line.pv[0] };
}

/**
 * Live top-3 engine lines for a position (Multi-PV). Debounces position
 * changes so stepping through moves doesn't queue a search per ply.
 */
export function EngineLines({
  fen,
  enabled = true,
  onPlayUci,
  onEval,
}: {
  fen: string;
  enabled?: boolean;
  onPlayUci?: (uci: string) => void;
  /** Reports the top line's score (White's perspective) so a host page can drive an EvalBar off the same search. */
  onEval?: (score: { cp: number | null; mate: number | null }) => void;
}) {
  const { settings } = useSettings();
  const [lines, setLines] = useState<DisplayLine[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const latestFen = useRef(fen);
  latestFen.current = fen;

  useEffect(() => {
    if (!enabled) return;
    // Nothing to search in a finished position.
    try {
      if (new Chess(fen).isGameOver()) {
        setLines([]);
        return;
      }
    } catch {
      return;
    }
    let cancelled = false;
    setThinking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getEngine().go(fen, { depth: settings.analysisDepth, multipv: 3 });
        // A newer position may have superseded this search while it ran.
        if (cancelled || latestFen.current !== fen) return;
        setLines(res.lines.map((l) => toDisplay(fen, l)));
        const top = res.lines[0];
        if (top && onEval) {
          const sign = fen.split(" ")[1] === "w" ? 1 : -1;
          onEval({ cp: top.cp != null ? top.cp * sign : null, mate: top.mate != null ? top.mate * sign : null });
        }
      } catch {
        if (!cancelled) setLines(null);
      } finally {
        if (!cancelled) setThinking(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fen, enabled, settings.analysisDepth]);

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="label">Engine lines</span>
        {thinking && <span className="text-xs text-[var(--text-faint)]">thinking…</span>}
      </div>
      {lines === null ? (
        <p className="text-xs text-[var(--text-faint)]">Waiting for engine…</p>
      ) : lines.length === 0 ? (
        <p className="text-xs text-[var(--text-faint)]">Game over — nothing to search.</p>
      ) : (
        lines.map((l, i) => (
          <button
            key={i}
            className="flex items-start gap-2 rounded-md bg-[var(--bg-elev)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-elev-2)] disabled:cursor-default"
            onClick={() => onPlayUci?.(l.firstUci)}
            disabled={!onPlayUci}
            title={onPlayUci ? "Play this line's first move" : undefined}
          >
            <span
              className="shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
              style={
                l.whiteBetter
                  ? { background: "#f1ece0", color: "#1a1d23" }
                  : { background: "#1a1d23", color: "#f1ece0", border: "1px solid var(--border)" }
              }
            >
              {l.evalLabel}
            </span>
            <span className="min-w-0 truncate font-mono text-xs leading-5 text-[var(--text-muted)]">
              {l.sans.join(" ")}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
