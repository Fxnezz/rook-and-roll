"use client";

import type { LetterState } from "@/lib/wordgame";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Enter", "z", "x", "c", "v", "b", "n", "m", "Backspace"],
];

const COLORS: Record<LetterState, string> = {
  correct: "var(--good)",
  present: "var(--warn)",
  absent: "var(--bg)",
};

export function WordKeyboard({
  state,
  onKey,
  onEnter,
  onBackspace,
}: {
  state: Record<string, LetterState>;
  onKey: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-1.5">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5">
          {row.map((key) => {
            const isSpecial = key === "Enter" || key === "Backspace";
            const st = state[key];
            return (
              <button
                key={key}
                onClick={() => (key === "Enter" ? onEnter() : key === "Backspace" ? onBackspace() : onKey(key))}
                className={`flex h-12 items-center justify-center rounded font-bold uppercase transition-colors ${
                  isSpecial ? "flex-[1.5] text-xs" : "flex-1 text-sm"
                }`}
                style={{
                  background: st ? COLORS[st] : "var(--bg-elev-2)",
                  color: st === "absent" ? "var(--text-faint)" : "var(--text)",
                }}
              >
                {key === "Backspace" ? "⌫" : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
