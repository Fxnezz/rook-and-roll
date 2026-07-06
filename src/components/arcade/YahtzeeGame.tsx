"use client";

import { useCallback, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  rollDice,
  scoreFor,
  upperTotal,
  upperBonus,
  grandTotal,
  isComplete,
  type Category,
  type Scorecard,
} from "@/lib/arcade/yahtzee";

const DIE_FACE: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
const MAX_ROLLS = 3;

export function YahtzeeGame() {
  const { best, submit } = useHighScore("yahtzee", { higherIsBetter: true });
  const [dice, setDice] = useState<number[]>(() => rollDice(5));
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(MAX_ROLLS);
  const [card, setCard] = useState<Scorecard>({});
  const [round, setRound] = useState(1);

  const roll = () => {
    if (rollsLeft <= 0) return;
    setDice((prev) => prev.map((d, i) => (held[i] ? d : 1 + Math.floor(Math.random() * 6))));
    setRollsLeft((r) => r - 1);
    playArcadeSound("click");
  };

  const toggleHold = (i: number) => {
    if (rollsLeft === MAX_ROLLS) return; // can't hold before the first roll
    setHeld((h) => h.map((v, idx) => (idx === i ? !v : v)));
  };

  const chooseCategory = (cat: Category) => {
    if (card[cat] !== undefined || rollsLeft === MAX_ROLLS) return;
    const points = scoreFor(cat, dice);
    const next = { ...card, [cat]: points };
    setCard(next);
    playArcadeSound(points > 0 ? "correct" : "wrong");

    if (isComplete(next)) {
      const total = grandTotal(next);
      submit(total);
      playArcadeSound("win");
    } else {
      setRound((r) => r + 1);
      setHeld([false, false, false, false, false]);
      setRollsLeft(MAX_ROLLS);
      setDice(rollDice(5));
    }
  };

  const newGame = useCallback(() => {
    setDice(rollDice(5));
    setHeld([false, false, false, false, false]);
    setRollsLeft(MAX_ROLLS);
    setCard({});
    setRound(1);
  }, []);

  const done = isComplete(card);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Round {Math.min(round, 13)}/13</span>
        <span className="chip">Rolls left: {rollsLeft}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="flex gap-3">
        {dice.map((d, i) => (
          <button
            key={i}
            onClick={() => toggleHold(i)}
            disabled={rollsLeft === MAX_ROLLS || done}
            className="flex h-16 w-16 items-center justify-center rounded-xl text-4xl"
            style={{
              background: held[i] ? "var(--accent)" : "var(--bg-elev-2)",
              boxShadow: held[i] ? "0 0 0 2px var(--accent)" : undefined,
            }}
          >
            {DIE_FACE[d]}
          </button>
        ))}
      </div>

      {!done && (
        <button className="btn btn-primary" disabled={rollsLeft <= 0} onClick={roll}>
          Roll ({rollsLeft} left)
        </button>
      )}

      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)]">
        {CATEGORIES.map((cat) => {
          const scored = card[cat];
          const preview = rollsLeft < MAX_ROLLS && scored === undefined ? scoreFor(cat, dice) : null;
          return (
            <button
              key={cat}
              disabled={scored !== undefined || rollsLeft === MAX_ROLLS || done}
              onClick={() => chooseCategory(cat)}
              className="flex w-full items-center justify-between border-b border-[var(--border)] px-3 py-2 text-sm last:border-0"
              style={{ opacity: scored !== undefined ? 0.6 : 1 }}
            >
              <span>{CATEGORY_LABEL[cat]}</span>
              <span className="font-mono font-bold">{scored !== undefined ? scored : preview != null ? preview : "—"}</span>
            </button>
          );
        })}
        <div className="flex items-center justify-between bg-[var(--bg-elev)] px-3 py-2 text-sm font-bold">
          <span>Upper bonus (63+)</span>
          <span>{upperBonus(card)} / 35</span>
        </div>
        <div className="flex items-center justify-between bg-[var(--bg-elev-2)] px-3 py-2 text-sm font-black">
          <span>Total</span>
          <span>{grandTotal(card)}</span>
        </div>
      </div>

      {done && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">Final score: {grandTotal(card)}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Upper total {upperTotal(card)} (bonus {upperBonus(card)})</p>
            <button className="btn btn-primary mt-4" onClick={newGame}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
