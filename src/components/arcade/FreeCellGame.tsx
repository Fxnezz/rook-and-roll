"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import {
  deal,
  moveTableauToTableau,
  moveTableauToFreeCell,
  moveFreeCellToTableau,
  moveToFoundation,
  isWon,
  autoMoveOne,
  type FreeCellState,
  type FcCard,
} from "@/lib/arcade/freecell";
import { SUITS, isRed } from "@/lib/arcade/solitaire";

const SUIT_GLYPH: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

type Selection = { source: "cell"; index: number } | { source: "tableau"; col: number; cardIndex: number };

function CardFace({ card, selected }: { card: FcCard; selected?: boolean }) {
  return <PlayingCard rank={card.rank} suit={card.suit} selected={selected} size="fill" />;
}

export function FreeCellGame() {
  const { best, submit } = useHighScore("freecell", { higherIsBetter: false });
  const [state, setState] = useState<FreeCellState | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const startRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setState(deal());
    setSelection(null);
    setElapsed(0);
    setStarted(false);
    setWon(false);
    startRef.current = null;
  }, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (won || !started) return;
    const t = window.setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [won, started]);

  if (!state) return <p className="p-8 text-center text-sm text-[var(--text-faint)]">Dealing…</p>;

  const markStarted = () => {
    if (startRef.current == null) {
      startRef.current = Date.now();
      setStarted(true);
    }
  };

  const checkWin = (next: FreeCellState) => {
    if (isWon(next)) {
      setWon(true);
      playArcadeSound("win");
      if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
    }
  };

  const selectCell = (index: number) => {
    if (!state.freeCells[index]) return;
    setSelection((s) => (s?.source === "cell" && s.index === index ? null : { source: "cell", index }));
  };

  const selectTableau = (col: number, cardIndex: number) => {
    setSelection((s) => (s?.source === "tableau" && s.col === col && s.cardIndex === cardIndex ? null : { source: "tableau", col, cardIndex }));
  };

  const tryMoveToTableau = (toCol: number) => {
    if (!selection) return;
    markStarted();
    const next =
      selection.source === "cell"
        ? moveFreeCellToTableau(state, selection.index, toCol)
        : moveTableauToTableau(state, selection.col, selection.cardIndex, toCol);
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("place");
      checkWin(next);
    } else {
      playArcadeSound("wrong");
    }
  };

  const tryMoveToFreeCell = (cellIndex: number) => {
    if (!selection || selection.source !== "tableau" || state.tableau[selection.col].length - selection.cardIndex !== 1) return;
    markStarted();
    const next = moveTableauToFreeCell(state, selection.col, cellIndex);
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("place");
    } else {
      playArcadeSound("wrong");
    }
  };

  const tryMoveToFoundation = () => {
    if (!selection) return;
    markStarted();
    const next = selection.source === "cell" ? moveToFoundation(state, { cell: selection.index }) : moveToFoundation(state, { col: selection.col });
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("correct");
      checkWin(next);
    } else {
      playArcadeSound("wrong");
    }
  };

  const autoComplete = () => {
    let cur = state;
    const step = () => {
      const next = autoMoveOne(cur);
      if (!next) return;
      cur = next;
      setState(cur);
      playArcadeSound("correct");
      if (isWon(cur)) {
        checkWin(cur);
        return;
      }
      setTimeout(step, 100);
    };
    step();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-2xl items-center justify-between text-sm">
        <span className="chip">⏱ {elapsed}s</span>
        <div className="flex gap-2">
          <button className="btn btn-ghost !py-1 text-xs" onClick={autoComplete}>
            Auto-complete
          </button>
          <button className="btn !py-1 text-xs" onClick={reset}>
            New game
          </button>
        </div>
        {best != null && <span className="chip">Best: {best}s</span>}
      </div>

      <div className="flex w-full max-w-2xl items-start justify-between gap-4">
        <div className="flex gap-2">
          {state.freeCells.map((card, i) => (
            <button
              key={i}
              onClick={() => (selection ? tryMoveToFreeCell(i) : selectCell(i))}
              className="h-20 w-14 rounded-md border border-dashed border-[var(--border)]"
            >
              {card && <CardFace card={card} selected={selection?.source === "cell" && selection.index === i} />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SUITS.map((suit, i) => (
            <button
              key={suit}
              onClick={tryMoveToFoundation}
              className="flex h-20 w-14 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xl"
              style={{ color: isRed(suit) ? "#c0392b" : "var(--text-faint)" }}
            >
              {state.foundations[i].length > 0 ? <CardFace card={state.foundations[i][state.foundations[i].length - 1]} /> : SUIT_GLYPH[suit]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-8 gap-2">
        {state.tableau.map((col, ci) => (
          <div key={ci} className="relative" style={{ minHeight: 80 + Math.max(0, col.length - 1) * 20 }} onClick={() => col.length === 0 && tryMoveToTableau(ci)}>
            {col.length === 0 && <div className="h-20 w-full rounded-md border border-dashed border-[var(--border)]" />}
            {col.map((card, idx) => {
              const isSelected = selection?.source === "tableau" && selection.col === ci && idx >= selection.cardIndex;
              return (
                <div
                  key={idx}
                  className="absolute w-full"
                  style={{ top: idx * 20, zIndex: idx }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (idx === col.length - 1 && selection && !(selection.source === "tableau" && selection.col === ci)) {
                      tryMoveToTableau(ci);
                    } else {
                      selectTableau(ci, idx);
                    }
                  }}
                >
                  <div className="h-20 w-full">
                    <CardFace card={card} selected={isSelected} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {won && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">You won!</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{elapsed}s</p>
            <button className="btn btn-primary mt-4" onClick={reset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
