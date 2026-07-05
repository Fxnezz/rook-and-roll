"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import {
  deal,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveWasteToFoundation,
  moveTableauToFoundation,
  isWon,
  autoMoveOne,
  isRed,
  SUITS,
  type SolitaireState,
  type Card,
} from "@/lib/arcade/solitaire";

const SUIT_GLYPH: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK_LABEL: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };

type Selection = { source: "waste" } | { source: "tableau"; col: number; cardIndex: number };

function CardFace({ card, selected }: { card: Card; selected?: boolean }) {
  if (!card.faceUp) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-md"
        style={{ background: "linear-gradient(160deg, #2a5a8a, #163a5a)", border: "1px solid rgba(255,255,255,0.15)" }}
      />
    );
  }
  const red = isRed(card.suit);
  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-md p-1 text-xs font-bold"
      style={{
        background: "#f3ecd8",
        color: red ? "#c0392b" : "#1c1c1c",
        boxShadow: selected ? "0 0 0 2px var(--accent)" : "0 1px 3px rgba(0,0,0,0.4)",
      }}
    >
      <span>{RANK_LABEL[card.rank] ?? card.rank}</span>
      <span className="self-center text-lg leading-none">{SUIT_GLYPH[card.suit]}</span>
    </div>
  );
}

export function SolitaireGame() {
  const { best, submit } = useHighScore("solitaire", { higherIsBetter: false });
  // Dealt client-side only (useEffect, not useState's initializer): deal()
  // shuffles with Math.random(), and computing that during SSR would give
  // the server and client different decks, causing a hydration mismatch.
  const [state, setState] = useState<SolitaireState | null>(null);
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

  const checkWin = (next: SolitaireState) => {
    if (isWon(next)) {
      setWon(true);
      playArcadeSound("win");
      if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
    }
  };

  const draw = () => {
    markStarted();
    setState(drawFromStock(state));
    playArcadeSound("click");
  };

  const selectWaste = () => {
    if (state.waste.length === 0) return;
    setSelection((s) => (s?.source === "waste" ? null : { source: "waste" }));
  };

  const selectTableau = (col: number, cardIndex: number) => {
    const card = state.tableau[col][cardIndex];
    if (!card.faceUp) return;
    setSelection((s) => (s?.source === "tableau" && s.col === col && s.cardIndex === cardIndex ? null : { source: "tableau", col, cardIndex }));
  };

  const tryMoveToTableau = (toCol: number) => {
    if (!selection) return;
    markStarted();
    let next: SolitaireState | null = null;
    if (selection.source === "waste") next = moveWasteToTableau(state, toCol);
    else next = moveTableauToTableau(state, selection.col, selection.cardIndex, toCol);
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("place");
      checkWin(next);
    } else {
      playArcadeSound("wrong");
    }
  };

  const tryMoveToFoundation = () => {
    if (!selection) return;
    markStarted();
    const next = selection.source === "waste" ? moveWasteToFoundation(state) : moveTableauToFoundation(state, selection.col);
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("correct");
      checkWin(next);
    } else {
      playArcadeSound("wrong");
    }
  };

  const doubleClickAutoFoundation = (source: Selection) => {
    markStarted();
    const next = source.source === "waste" ? moveWasteToFoundation(state) : moveTableauToFoundation(state, source.col);
    if (next) {
      setState(next);
      setSelection(null);
      playArcadeSound("correct");
      checkWin(next);
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
      setTimeout(step, 120);
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

      <div className="flex w-full max-w-2xl items-start justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={draw} className="h-20 w-14 rounded-md" style={{ background: state.stock.length ? undefined : "rgba(255,255,255,0.06)" }}>
            {state.stock.length > 0 ? <CardFace card={{ suit: "S", rank: 1, faceUp: false }} /> : <div className="flex h-full items-center justify-center text-xs text-[var(--text-faint)]">↺</div>}
          </button>
          <button onClick={selectWaste} className="h-20 w-14 rounded-md">
            {state.waste.length > 0 ? (
              <CardFace card={state.waste[state.waste.length - 1]} selected={selection?.source === "waste"} />
            ) : (
              <div className="h-full w-full rounded-md border border-dashed border-[var(--border)]" />
            )}
          </button>
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

      <div className="grid w-full max-w-2xl grid-cols-7 gap-2">
        {state.tableau.map((col, ci) => (
          <div key={ci} className="relative" style={{ minHeight: 80 + Math.max(0, col.length - 1) * 22 }} onClick={() => col.length === 0 && tryMoveToTableau(ci)}>
            {col.length === 0 && <div className="h-20 w-full rounded-md border border-dashed border-[var(--border)]" />}
            {col.map((card, idx) => {
              const isSelected =
                selection?.source === "tableau" && selection.col === ci && idx >= selection.cardIndex;
              return (
                <div
                  key={idx}
                  className="absolute w-full"
                  style={{ top: idx * 22, zIndex: idx }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (idx === col.length - 1 && selection && !(selection.source === "tableau" && selection.col === ci)) {
                      tryMoveToTableau(ci);
                    } else {
                      selectTableau(ci, idx);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (idx === col.length - 1) doubleClickAutoFoundation({ source: "tableau", col: ci, cardIndex: idx });
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
