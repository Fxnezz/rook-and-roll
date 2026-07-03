"use client";

import { useEffect, useState } from "react";
import { WordBoard } from "@/components/wordgame/WordBoard";
import { WordKeyboard } from "@/components/wordgame/WordKeyboard";
import { StatsModal } from "@/components/wordgame/StatsModal";
import { useWordGame, type Mode } from "@/lib/wordgame/useWordGame";

export default function WordlePage() {
  const [mode, setMode] = useState<Mode>("daily");
  const game = useWordGame(mode);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    if (game.done) setStatsOpen(true);
  }, [game.done]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-6">
      <div className="mb-4 flex w-full items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Word Game</h1>
          <p className="text-sm text-[var(--text-muted)]">Five letters, six guesses.</p>
        </div>
        <button className="btn btn-ghost !p-2" onClick={() => setStatsOpen(true)} aria-label="Stats">
          📊
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["daily", "practice"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-md border px-3 py-1.5 text-sm font-semibold capitalize transition-colors"
            style={{
              borderColor: mode === m ? "var(--accent)" : "var(--border)",
              background: mode === m ? "var(--bg-elev-2)" : "transparent",
            }}
          >
            {m === "daily" ? "Daily" : "Practice"}
          </button>
        ))}
      </div>

      <div className="relative mb-6 min-h-[8px]">
        {game.toast && (
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded bg-[var(--text)] px-3 py-1.5 text-xs font-bold text-[var(--bg)]">
            {game.toast}
          </div>
        )}
      </div>

      <WordBoard rows={game.rows} current={game.current} shake={game.shake} />

      <div className="mt-6 w-full">
        <WordKeyboard state={game.keyboardState} onKey={game.typeLetter} onEnter={game.submitGuess} onBackspace={game.backspace} />
      </div>

      {game.done && (
        <button
          className="btn btn-primary mt-4"
          onClick={() => (mode === "daily" ? setMode("practice") : game.newPracticeWord())}
        >
          {mode === "daily" ? "Play practice round" : "New practice word"}
        </button>
      )}

      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} done={game.done} won={game.won} answer={game.answer} />
    </div>
  );
}
