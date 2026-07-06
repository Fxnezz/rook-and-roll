"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface NimState {
  piles: number[];
  turn: Seat;
}

export interface NimMove {
  pile: number;
  count: number;
}

export function NimBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: NimState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: NimMove) => void;
  lastMove?: { move: NimMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [hover, setHover] = useState<{ pile: number; count: number } | null>(null);
  const prevPiles = useRef(state.piles);

  useEffect(() => {
    if (prevPiles.current.some((p, i) => p !== state.piles[i])) {
      playArcadeSound("place");
      prevPiles.current = state.piles;
    }
  }, [state.piles]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl bg-[var(--bg-elev)] p-5">
      <p className="text-center text-sm text-[var(--text-muted)]">
        Click a token to remove it and every token after it in that row. Take the last token to win.
      </p>
      {state.piles.map((size, pile) => (
        <div key={pile} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-[var(--text-faint)]">Pile {pile + 1}</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: size }).map((_, i) => {
              const willRemove = hover?.pile === pile && i >= size - hover.count;
              return (
                <button
                  key={i}
                  disabled={!canPlay}
                  onMouseEnter={() => setHover({ pile, count: size - i })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onMove({ pile, count: size - i })}
                  className="h-8 w-8 rounded-full border-2 transition-transform"
                  style={{
                    background: willRemove ? "var(--bad)" : "var(--accent)",
                    borderColor: willRemove ? "#8a2a20" : "var(--accent)",
                    transform: willRemove ? "scale(0.9)" : "scale(1)",
                    opacity: canPlay ? 1 : 0.6,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
