"use client";

import { MAX_GUESSES, WORD_LENGTH, type LetterState } from "@/lib/wordgame";

const COLORS: Record<LetterState, { bg: string; border: string }> = {
  correct: { bg: "var(--good)", border: "var(--good)" },
  present: { bg: "var(--warn)", border: "var(--warn)" },
  absent: { bg: "var(--bg-elev-2)", border: "var(--border-strong)" },
};

export function WordBoard({
  rows,
  current,
  shake,
}: {
  rows: { word: string; states: LetterState[] }[];
  current: string;
  shake: boolean;
}) {
  const filledRows = [...rows];
  const emptyRowCount = MAX_GUESSES - rows.length;

  return (
    <div className="mx-auto flex flex-col gap-1.5">
      {filledRows.map((r, i) => (
        <div key={i} className="flex justify-center gap-1.5">
          {r.word.split("").map((letter, j) => {
            const c = COLORS[r.states[j]];
            return (
              <div
                key={j}
                className="flex h-14 w-14 items-center justify-center rounded text-2xl font-bold uppercase text-white sm:h-16 sm:w-16"
                style={{ background: c.bg, borderColor: c.border, borderWidth: 2 }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
      {emptyRowCount > 0 && (
        <div className={`flex justify-center gap-1.5 ${shake ? "animate-[shake_0.4s]" : ""}`}>
          {Array.from({ length: WORD_LENGTH }).map((_, j) => (
            <div
              key={j}
              className="flex h-14 w-14 items-center justify-center rounded border-2 text-2xl font-bold uppercase sm:h-16 sm:w-16"
              style={{ borderColor: current[j] ? "var(--text-faint)" : "var(--border)" }}
            >
              {current[j] ?? ""}
            </div>
          ))}
        </div>
      )}
      {Array.from({ length: Math.max(0, emptyRowCount - 1) }).map((_, i) => (
        <div key={`pad-${i}`} className="flex justify-center gap-1.5">
          {Array.from({ length: WORD_LENGTH }).map((_, j) => (
            <div key={j} className="h-14 w-14 rounded border-2 sm:h-16 sm:w-16" style={{ borderColor: "var(--border)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
