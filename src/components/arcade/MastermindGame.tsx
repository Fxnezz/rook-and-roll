"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { CODE_LENGTH, COLOR_COUNT, MAX_GUESSES, randomCode, score, isWin, type Feedback } from "@/lib/arcade/mastermind";

const COLORS = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d", "#8338ec"];

export function MastermindGame() {
  const { best, submit } = useHighScore("mastermind", { higherIsBetter: false });
  const [secret, setSecret] = useState<number[] | null>(null);
  const [current, setCurrent] = useState<number[]>(Array(CODE_LENGTH).fill(0));
  const [history, setHistory] = useState<{ guess: number[]; fb: Feedback }[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  useEffect(() => {
    setSecret(randomCode());
  }, []);

  const setPeg = (i: number, color: number) => {
    if (status !== "playing") return;
    setCurrent((c) => c.map((v, idx) => (idx === i ? color : v)));
  };

  const submitGuess = () => {
    if (!secret || status !== "playing") return;
    const fb = score(secret, current);
    const next = [...history, { guess: current, fb }];
    setHistory(next);
    setCurrent(Array(CODE_LENGTH).fill(0));
    if (isWin(fb)) {
      setStatus("won");
      submit(next.length);
      playArcadeSound("win");
    } else if (next.length >= MAX_GUESSES) {
      setStatus("lost");
      playArcadeSound("lose");
    } else {
      playArcadeSound("click");
    }
  };

  const reset = () => {
    setSecret(randomCode());
    setCurrent(Array(CODE_LENGTH).fill(0));
    setHistory([]);
    setStatus("playing");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">
          Guess {history.length + (status === "playing" ? 1 : 0)} / {MAX_GUESSES}
        </span>
        {best != null && <span className="chip">Best: {best} guesses</span>}
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {history.map((h, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md bg-[var(--bg-elev)] p-2">
            <span className="w-5 text-xs text-[var(--text-faint)]">{i + 1}</span>
            <div className="flex gap-1.5">
              {h.guess.map((c, j) => (
                <span key={j} className="h-7 w-7 rounded-full" style={{ background: COLORS[c] }} />
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              <span className="text-xs">⚫{h.fb.black}</span>
              <span className="text-xs">⚪{h.fb.white}</span>
            </div>
          </div>
        ))}
      </div>

      {status === "playing" && (
        <>
          <div className="flex gap-2">
            {current.map((c, i) => (
              <span key={i} className="h-9 w-9 rounded-full border-2" style={{ background: COLORS[c], borderColor: "var(--border-strong)" }} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {current.map((_, i) => (
              <div key={i} className="flex gap-1.5">
                {Array.from({ length: COLOR_COUNT }).map((_, colorIdx) => (
                  <button
                    key={colorIdx}
                    onClick={() => setPeg(i, colorIdx)}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      background: COLORS[colorIdx],
                      borderColor: current[i] === colorIdx ? "var(--text)" : "transparent",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={submitGuess}>
            Submit guess
          </button>
        </>
      )}

      {status !== "playing" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">
            {status === "won" ? `Cracked it in ${history.length} guesses!` : "Out of guesses!"}
          </p>
          {status === "lost" && secret && (
            <div className="flex gap-1.5">
              {secret.map((c, i) => (
                <span key={i} className="h-7 w-7 rounded-full" style={{ background: COLORS[c] }} />
              ))}
            </div>
          )}
          <button className="btn" onClick={reset}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
