"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { newDeck, MEMORY_SIZES, type MemoryCard } from "@/lib/arcade/memoryMatch";

type Size = keyof typeof MEMORY_SIZES;

export function MemoryMatchGame() {
  const [size, setSize] = useState<Size>("small");
  const { best, submit } = useHighScore("memorymatch", { level: size, higherIsBetter: false });
  // Empty until the mount effect below deals a shuffled deck: newDeck() uses
  // Math.random(), so computing it in this initializer would run during SSR
  // too and mismatch against the client's own reshuffle at hydration time.
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback((s: Size) => {
    setCards(newDeck(MEMORY_SIZES[s].pairs));
    setOpen([]);
    setMoves(0);
    setElapsed(0);
    setWon(false);
    setLocked(false);
    setStarted(false);
    startRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => reset(size), [size, reset]);

  useEffect(() => {
    if (won || !started) return;
    timerRef.current = window.setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [won, started]);

  const flip = (idx: number) => {
    if (locked || won) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    if (startRef.current == null) {
      startRef.current = Date.now();
      setStarted(true);
    }

    const nextOpen = [...open, idx];
    const nextCards = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(nextCards);
    playArcadeSound("place");

    if (nextOpen.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (nextCards[a].symbol === nextCards[b].symbol) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          playArcadeSound("correct");
          setOpen([]);
          setLocked(false);
        }, 350);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          playArcadeSound("wrong");
          setOpen([]);
          setLocked(false);
        }, 700);
      }
    } else {
      setOpen(nextOpen);
    }
  };

  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched) && !won) {
      setWon(true);
      playArcadeSound("win");
      if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
    }
  }, [cards, won, submit]);

  const { cols } = MEMORY_SIZES[size];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {(Object.keys(MEMORY_SIZES) as Size[]).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className="rounded border px-2 py-1 text-xs font-semibold capitalize"
            style={{
              borderColor: "var(--border-strong)",
              background: size === s ? "var(--accent)" : "transparent",
              color: size === s ? "var(--accent-contrast)" : "var(--text-muted)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Moves: {moves}</span>
        <span className="chip">⏱ {elapsed}s</span>
        <button className="btn !py-1 text-xs" onClick={() => reset(size)}>
          New game
        </button>
        {best != null && <span className="chip">Best: {best}s</span>}
      </div>

      <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: "100%", maxWidth: 420 }}>
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => flip(idx)}
            className="relative flex aspect-square items-center justify-center rounded-lg text-2xl"
            style={{ perspective: "400px" }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center rounded-lg transition-transform duration-300"
              style={{
                background: "var(--bg-elev-2)",
                backfaceVisibility: "hidden",
                transform: card.flipped || card.matched ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              ?
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center rounded-lg transition-transform duration-300"
              style={{
                background: card.matched ? "var(--good)" : "var(--accent)",
                opacity: card.matched ? 0.35 : 1,
                backfaceVisibility: "hidden",
                transform: card.flipped || card.matched ? "rotateY(0deg)" : "rotateY(-180deg)",
              }}
            >
              {card.symbol}
            </span>
          </button>
        ))}
      </div>

      {won && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">Solved!</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {moves} moves · {elapsed}s
            </p>
            <button className="btn btn-primary mt-4" onClick={() => reset(size)}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
