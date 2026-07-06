"use client";

import { useCallback, useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { newGame, guessLetter, wrongGuesses, isWon, isLost, displayWord, MAX_WRONG, type HangmanState } from "@/lib/arcade/hangman";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Figure({ wrong }: { wrong: number }) {
  return (
    <svg viewBox="0 0 120 140" width="140" height="160">
      <line x1="10" y1="130" x2="90" y2="130" stroke="var(--text-faint)" strokeWidth="3" />
      <line x1="30" y1="130" x2="30" y2="10" stroke="var(--text-faint)" strokeWidth="3" />
      <line x1="30" y1="10" x2="80" y2="10" stroke="var(--text-faint)" strokeWidth="3" />
      <line x1="80" y1="10" x2="80" y2="25" stroke="var(--text-faint)" strokeWidth="3" />
      {wrong > 0 && <circle cx="80" cy="38" r="13" stroke="var(--bad)" strokeWidth="3" fill="none" />}
      {wrong > 1 && <line x1="80" y1="51" x2="80" y2="85" stroke="var(--bad)" strokeWidth="3" />}
      {wrong > 2 && <line x1="80" y1="60" x2="65" y2="75" stroke="var(--bad)" strokeWidth="3" />}
      {wrong > 3 && <line x1="80" y1="60" x2="95" y2="75" stroke="var(--bad)" strokeWidth="3" />}
      {wrong > 4 && <line x1="80" y1="85" x2="65" y2="105" stroke="var(--bad)" strokeWidth="3" />}
      {wrong > 5 && <line x1="80" y1="85" x2="95" y2="105" stroke="var(--bad)" strokeWidth="3" />}
    </svg>
  );
}

export function HangmanGame() {
  const { best, submit } = useHighScore("hangman", { higherIsBetter: true });
  const [state, setState] = useState<HangmanState | null>(null);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState<"won" | "lost" | null>(null);

  const reset = useCallback(() => {
    setState(newGame());
    setOver(null);
  }, []);

  useEffect(() => reset(), [reset]);

  const guess = (letter: string) => {
    if (!state || over) return;
    const next = guessLetter(state, letter);
    setState(next);
    if (state.word.includes(letter)) playArcadeSound("correct");
    else playArcadeSound("wrong");

    if (isWon(next)) {
      setOver("won");
      playArcadeSound("win");
      const newStreak = streak + 1;
      setStreak(newStreak);
      submit(newStreak);
    } else if (isLost(next)) {
      setOver("lost");
      playArcadeSound("gameOver");
      setStreak(0);
    }
  };

  if (!state) return <p className="p-8 text-center text-sm text-[var(--text-faint)]">Loading…</p>;

  const wrong = wrongGuesses(state);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Streak: {streak}</span>
        <span className="chip">
          Misses: {wrong}/{MAX_WRONG}
        </span>
        {best != null && <span className="chip">Best streak: {best}</span>}
      </div>

      <Figure wrong={wrong} />

      <p className="text-3xl font-black tracking-widest">{over === "lost" ? state.word.split("").join(" ") : displayWord(state)}</p>

      <div className="grid grid-cols-9 gap-1.5">
        {ALPHABET.map((letter) => {
          const guessed = state.guessed.has(letter);
          const correct = guessed && state.word.includes(letter);
          return (
            <button
              key={letter}
              disabled={guessed || Boolean(over)}
              onClick={() => guess(letter)}
              className="flex h-9 w-9 items-center justify-center rounded text-sm font-bold"
              style={{
                background: guessed ? (correct ? "var(--good)" : "var(--bad)") : "var(--bg-elev-2)",
                color: guessed ? "#fff" : "var(--text)",
                opacity: guessed ? 0.7 : 1,
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {over && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">{over === "won" ? "You got it!" : "Out of guesses"}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">The word was {state.word}</p>
            <button className="btn btn-primary mt-4" onClick={reset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
