"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import {
  deal,
  canPickUp,
  moveCards,
  dealStock,
  canDealStock,
  isWon,
  type SpiderState,
  type Card,
} from "@/lib/arcade/spider";

function CardView({ card }: { card: Card }) {
  return <PlayingCard rank={card.rank} suit={card.suit} faceDown={!card.faceUp} size="small" />;
}

export function SpiderSolitaireGame() {
  const { best, submit } = useHighScore("spidersolitaire", { higherIsBetter: false });
  const [state, setState] = useState<SpiderState | null>(null);
  const [selection, setSelection] = useState<{ col: number; index: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    setState(deal());
  }, []);

  if (!state) return null;

  const clickCard = (col: number, index: number) => {
    if (won) return;
    if (selection == null) {
      if (canPickUp(state.tableau[col], index)) setSelection({ col, index });
      return;
    }
    if (selection.col === col) {
      setSelection(null);
      return;
    }
    const next = moveCards(state, selection.col, selection.index, col);
    if (next) {
      setState(next);
      setSelection(null);
      setMoves((m) => m + 1);
      playArcadeSound(next.completed > state.completed ? "win" : "place");
      if (isWon(next)) {
        setWon(true);
        submit(moves + 1);
        playArcadeSound("win");
      }
    } else if (canPickUp(state.tableau[col], index)) {
      setSelection({ col, index });
    } else {
      setSelection(null);
    }
  };

  const clickColumnEmpty = (col: number) => {
    if (won || selection == null) return;
    const next = moveCards(state, selection.col, selection.index, col);
    if (next) {
      setState(next);
      setSelection(null);
      setMoves((m) => m + 1);
      playArcadeSound("place");
    }
  };

  const drawStock = () => {
    if (won || !canDealStock(state)) return;
    setState(dealStock(state));
    setMoves((m) => m + 1);
    playArcadeSound("flip");
  };

  const reset = () => {
    setState(deal());
    setSelection(null);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-3xl items-center justify-between text-sm">
        <span className="chip">Completed: {state.completed}/8</span>
        <span className="chip">Moves: {moves}</span>
        {best != null && <span className="chip">Fewest moves: {best}</span>}
        <button className="btn !py-1 text-xs" disabled={!canDealStock(state)} onClick={drawStock}>
          Deal ({Math.floor(state.stock.length / 10)})
        </button>
        <button className="btn !py-1 text-xs" onClick={reset}>
          New deal
        </button>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-10 gap-1">
        {state.tableau.map((col, ci) => (
          <div key={ci} className="flex flex-col items-center">
            {col.length === 0 ? (
              <button
                className="h-16 w-11 rounded-md border border-dashed"
                style={{ borderColor: "var(--border-strong)" }}
                onClick={() => clickColumnEmpty(ci)}
              />
            ) : (
              col.map((card, ri) => (
                <button
                  key={ri}
                  onClick={() => clickCard(ci, ri)}
                  style={{
                    marginTop: ri === 0 ? 0 : -48,
                    outline: selection?.col === ci && ri >= selection.index ? "2px solid var(--accent)" : "none",
                    zIndex: ri,
                    position: "relative",
                  }}
                >
                  <CardView card={card} />
                </button>
              ))
            )}
          </div>
        ))}
      </div>

      {won && <p className="text-lg font-bold">All 8 suits cleared!</p>}
    </div>
  );
}
