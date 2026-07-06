"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { RANK_LABEL, SUIT_GLYPH, isRedSuit, type Card } from "@/lib/arcade/blackjack";
import {
  ROWS,
  deal,
  isExposed,
  cellIndex,
  rowColOf,
  canRemoveSingle,
  canRemovePair,
  removeFromPyramid,
  removeWasteTop,
  drawStock,
  isWon,
  type PyramidState,
} from "@/lib/arcade/pyramid";

type Selection = { kind: "pyramid"; index: number } | { kind: "waste" };

function MiniCard({ card, dim }: { card: Card; dim?: boolean }) {
  const red = isRedSuit(card.suit);
  return (
    <div
      className="flex h-16 w-11 flex-col justify-between rounded-md p-1 text-xs font-bold"
      style={{ background: "#f3ecd8", color: red ? "#c0392b" : "#1c1c1c", opacity: dim ? 0.45 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
    >
      <span>{RANK_LABEL[card.rank] ?? card.rank}</span>
      <span className="self-center text-base leading-none">{SUIT_GLYPH[card.suit]}</span>
    </div>
  );
}

export function PyramidSolitaireGame() {
  const { best, submit } = useHighScore("pyramidsolitaire", { higherIsBetter: false });
  const [state, setState] = useState<PyramidState | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [won, setWon] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);
  const [actions, setActions] = useState(0);

  useEffect(() => {
    setState(deal());
  }, []);

  if (!state) return null;

  const cardAt = (sel: Selection): Card | null => {
    if (sel.kind === "waste") return state.waste[state.waste.length - 1] ?? null;
    return state.pyramid[sel.index];
  };

  const isSelectable = (sel: Selection): boolean => {
    if (sel.kind === "waste") return state.waste.length > 0;
    const { row, col } = rowColOf(sel.index);
    return isExposed(state.pyramid, row, col);
  };

  const clearSelectedRemoved = (indices: number[], wasteUsed: boolean) => {
    let next = removeFromPyramid(state, indices);
    if (wasteUsed) next = removeWasteTop(next);
    setState(next);
    setSelected(null);
    setRemovedCount((c) => c + indices.length + (wasteUsed ? 1 : 0));
    const nextActions = actions + 1;
    setActions(nextActions);
    playArcadeSound("capture");
    if (isWon(next)) {
      setWon(true);
      submit(nextActions);
      playArcadeSound("win");
    }
  };

  const pick = (sel: Selection) => {
    if (won || !isSelectable(sel)) return;
    const card = cardAt(sel);
    if (!card) return;

    if (selected == null) {
      if (canRemoveSingle(card)) {
        clearSelectedRemoved(sel.kind === "pyramid" ? [sel.index] : [], sel.kind === "waste");
        return;
      }
      setSelected(sel);
      return;
    }

    const same = selected.kind === sel.kind && (selected.kind !== "pyramid" || selected.index === (sel as { index: number }).index);
    if (same) {
      setSelected(null);
      return;
    }

    const firstCard = cardAt(selected)!;
    if (canRemovePair(firstCard, card)) {
      const indices = [selected, sel].filter((s) => s.kind === "pyramid").map((s) => (s as { index: number }).index);
      const wasteUsed = selected.kind === "waste" || sel.kind === "waste";
      clearSelectedRemoved(indices, wasteUsed);
    } else if (canRemoveSingle(card)) {
      // Clicking a King always removes it on its own, abandoning the prior selection.
      clearSelectedRemoved(sel.kind === "pyramid" ? [sel.index] : [], sel.kind === "waste");
    } else {
      setSelected(sel);
    }
  };

  const draw = () => {
    if (won) return;
    setState(drawStock(state));
    setActions((a) => a + 1);
    playArcadeSound("flip");
  };

  const reset = () => {
    setState(deal());
    setSelected(null);
    setWon(false);
    setRemovedCount(0);
    setActions(0);
  };

  const wasteTop = state.waste[state.waste.length - 1];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Removed: {removedCount}/28</span>
        {best != null && <span className="chip">Fewest actions to clear: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          New deal
        </button>
      </div>

      <div className="flex flex-col items-center gap-1">
        {Array.from({ length: ROWS }).map((_, row) => (
          <div key={row} className="flex gap-1">
            {Array.from({ length: row + 1 }).map((_, col) => {
              const i = cellIndex(row, col);
              const card = state.pyramid[i];
              if (!card) return <div key={col} className="h-16 w-11" />;
              const exposed = isExposed(state.pyramid, row, col);
              const sel = selected?.kind === "pyramid" && selected.index === i;
              return (
                <button
                  key={col}
                  disabled={!exposed || won}
                  onClick={() => pick({ kind: "pyramid", index: i })}
                  style={{ outline: sel ? "2px solid var(--accent)" : "none" }}
                >
                  <MiniCard card={card} dim={!exposed} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <button className="btn" onClick={draw}>
          Draw ({state.stock.length})
        </button>
        <button
          disabled={!wasteTop || won}
          onClick={() => pick({ kind: "waste" })}
          style={{ outline: selected?.kind === "waste" ? "2px solid var(--accent)" : "none" }}
        >
          {wasteTop ? <MiniCard card={wasteTop} /> : <div className="h-16 w-11 rounded-md" style={{ background: "var(--bg-elev)" }} />}
        </button>
      </div>

      {won && <p className="text-lg font-bold">Pyramid cleared!</p>}
    </div>
  );
}
