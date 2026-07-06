"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { scoreDice, isFarkle, rollDice } from "@/lib/arcade/farkle";

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const WINNING_SCORE = 10000;

export function FarkleGame() {
  const { best, submit } = useHighScore("farkle", { higherIsBetter: true });
  const [banked, setBanked] = useState(0);
  const [turnScore, setTurnScore] = useState(0);
  const [dice, setDice] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState(6);
  const [message, setMessage] = useState("Roll to start your turn.");
  const [farkled, setFarkled] = useState(false);
  const [won, setWon] = useState(false);

  const doRoll = () => {
    if (won) return;
    const rolled = rollDice(remaining);
    setDice(rolled);
    setSelected(new Set());
    if (isFarkle(rolled)) {
      setFarkled(true);
      setMessage(`Farkle! Rolled ${rolled.join(", ")} — no scoring dice. Turn score lost.`);
      playArcadeSound("lose");
      setTimeout(() => {
        setTurnScore(0);
        setRemaining(6);
        setDice([]);
        setFarkled(false);
        setMessage("Roll to start your turn.");
      }, 1500);
    } else {
      setFarkled(false);
      setMessage(`Rolled ${rolled.join(", ")}. Select scoring dice, then bank or roll again.`);
      playArcadeSound("click");
    }
  };

  const toggleDie = (i: number) => {
    if (farkled || won) return;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectedDice = [...selected].map((i) => dice[i]);
  const selectedScore = scoreDice(selectedDice);

  const confirmSelection = () => {
    if (selectedScore === 0) return;
    const newTurnScore = turnScore + selectedScore;
    const usedCount = selected.size;
    let nextRemaining = remaining - usedCount;
    if (nextRemaining === 0) nextRemaining = 6; // hot dice
    setTurnScore(newTurnScore);
    setRemaining(nextRemaining);
    setDice([]);
    setSelected(new Set());
    setMessage(nextRemaining === 6 ? "Hot dice! All dice scored — roll all 6 again or bank." : `Banked ${selectedScore} this roll. Roll ${nextRemaining} dice or bank ${newTurnScore}.`);
    playArcadeSound("correct");
  };

  const bank = () => {
    const next = banked + turnScore;
    setBanked(next);
    setTurnScore(0);
    setRemaining(6);
    setDice([]);
    setSelected(new Set());
    setMessage("Banked! Roll to start your next turn.");
    playArcadeSound("win");
    if (next >= WINNING_SCORE) {
      setWon(true);
      submit(next);
      playArcadeSound("levelUp");
    }
  };

  const reset = () => {
    setBanked(0);
    setTurnScore(0);
    setDice([]);
    setSelected(new Set());
    setRemaining(6);
    setFarkled(false);
    setWon(false);
    setMessage("Roll to start your turn.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Banked: {banked}</span>
        <span className="chip">Turn: {turnScore}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <p className="max-w-sm text-center text-sm text-[var(--text-muted)]">{message}</p>

      {dice.length > 0 && (
        <div className="flex gap-2 text-4xl">
          {dice.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDie(i)}
              disabled={farkled}
              style={{ opacity: selected.has(i) ? 1 : 0.5, transform: selected.has(i) ? "translateY(-6px)" : "none" }}
            >
              {DICE_FACES[d]}
            </button>
          ))}
        </div>
      )}

      {selected.size > 0 && <p className="text-sm">Selected value: {selectedScore || "not scoring"}</p>}

      <div className="flex gap-2">
        {dice.length === 0 || farkled ? (
          <button className="btn btn-primary" disabled={won} onClick={doRoll}>
            Roll {remaining}
          </button>
        ) : (
          <>
            <button className="btn" disabled={selectedScore === 0} onClick={confirmSelection}>
              Confirm selection
            </button>
            <button className="btn btn-primary" disabled={turnScore === 0} onClick={bank}>
              Bank {turnScore}
            </button>
          </>
        )}
      </div>

      {won && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">You reached {WINNING_SCORE}! Final score: {banked}</p>
          <button className="btn btn-primary" onClick={reset}>
            Play again
          </button>
        </div>
      )}
      {!won && (
        <button className="btn !py-1 text-xs" onClick={reset}>
          Reset game
        </button>
      )}
    </div>
  );
}
