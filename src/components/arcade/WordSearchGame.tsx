"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, WORD_LIST, generatePuzzle, checkSelection, cellsForPlacement, type PlacedWord } from "@/lib/arcade/wordsearch";

export function WordSearchGame() {
  const { best, submit } = useHighScore("wordsearch", { higherIsBetter: false });
  const [puzzle, setPuzzle] = useState<{ grid: string[][]; placed: PlacedWord[] } | null>(null);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<[number, number] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setPuzzle(generatePuzzle());
  }, []);

  useEffect(() => {
    if (done || !puzzle) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [done, puzzle]);

  if (!puzzle) return null;

  const foundCells = new Set<string>();
  for (const p of puzzle.placed) {
    if (found.has(p.word)) for (const [r, c] of cellsForPlacement(p)) foundCells.add(`${r},${c}`);
  }

  const click = (r: number, c: number) => {
    if (done) return;
    if (start == null) {
      setStart([r, c]);
      return;
    }
    if (start[0] === r && start[1] === c) {
      setStart(null);
      return;
    }
    const match = checkSelection(puzzle.placed, start, [r, c]);
    setStart(null);
    if (match && !found.has(match.word)) {
      const next = new Set(found);
      next.add(match.word);
      setFound(next);
      playArcadeSound("correct");
      if (next.size === puzzle.placed.length) {
        setDone(true);
        submit(seconds);
        playArcadeSound("win");
      }
    } else {
      playArcadeSound("wrong");
    }
  };

  const reset = () => {
    setPuzzle(generatePuzzle());
    setFound(new Set());
    setStart(null);
    setSeconds(0);
    setDone(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Time: {seconds}s</span>
        <span className="chip">
          Found: {found.size}/{puzzle.placed.length}
        </span>
        {best != null && <span className="chip">Best: {best}s</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          New puzzle
        </button>
      </div>

      <div className="grid gap-0.5 rounded-md p-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 26px)`, background: "var(--bg-elev)" }}>
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`;
            const isFoundCell = foundCells.has(key);
            const isStart = start?.[0] === r && start?.[1] === c;
            return (
              <button
                key={key}
                onClick={() => click(r, c)}
                className="flex items-center justify-center text-xs font-bold"
                style={{
                  width: 26,
                  height: 26,
                  background: isFoundCell ? "var(--good)" : isStart ? "var(--accent)" : "var(--bg)",
                  color: isFoundCell ? "#0a0d12" : "var(--text)",
                }}
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {WORD_LIST.map((w) => (
          <span key={w} style={{ textDecoration: found.has(w) ? "line-through" : "none", opacity: found.has(w) ? 0.5 : 1 }}>
            {w}
          </span>
        ))}
      </div>

      {done && <p className="text-lg font-bold">Solved in {seconds}s!</p>}
    </div>
  );
}
