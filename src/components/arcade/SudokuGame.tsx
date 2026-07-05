"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { generatePuzzle, isComplete, findConflicts, SUDOKU_DIFFICULTIES, type SudokuGrid } from "@/lib/arcade/sudoku";

type Difficulty = keyof typeof SUDOKU_DIFFICULTIES;

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const { best, submit } = useHighScore("sudoku", { level: difficulty, higherIsBetter: false });
  const [puzzle, setPuzzle] = useState<SudokuGrid | null>(null);
  const [solution, setSolution] = useState<SudokuGrid | null>(null);
  const [grid, setGrid] = useState<SudokuGrid | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(true);
  const startRef = useRef<number | null>(null);

  const newGame = useCallback((d: Difficulty) => {
    setLoading(true);
    setWon(false);
    setSelected(null);
    setElapsed(0);
    startRef.current = null;
    setTimeout(() => {
      const { puzzle: p, solution: s } = generatePuzzle(SUDOKU_DIFFICULTIES[d]);
      setPuzzle(p);
      setSolution(s);
      setGrid(p.map((row) => [...row]));
      setLoading(false);
    }, 10);
  }, []);

  useEffect(() => newGame(difficulty), [difficulty, newGame]);

  useEffect(() => {
    if (won || !startRef.current) return;
    const t = window.setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [won]);

  const conflicts = grid ? findConflicts(grid) : new Set<string>();

  const setCell = (row: number, col: number, val: number) => {
    if (!grid || !puzzle || puzzle[row][col] !== 0 || won) return;
    if (startRef.current == null) startRef.current = Date.now();
    const next = grid.map((r) => [...r]);
    next[row][col] = val;
    setGrid(next);
    playArcadeSound("click");
    if (isComplete(next) && findConflicts(next).size === 0) {
      setWon(true);
      playArcadeSound("win");
      if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      const [row, col] = selected;
      if (e.key >= "1" && e.key <= "9") setCell(row, col, Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") setCell(row, col, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, grid]);

  if (loading || !grid || !puzzle) {
    return <p className="p-8 text-center text-sm text-[var(--text-faint)]">Generating puzzle…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {(Object.keys(SUDOKU_DIFFICULTIES) as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className="rounded border px-2 py-1 text-xs font-semibold capitalize"
            style={{
              borderColor: "var(--border-strong)",
              background: difficulty === d ? "var(--accent)" : "transparent",
              color: difficulty === d ? "var(--accent-contrast)" : "var(--text-muted)",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">⏱ {elapsed}s</span>
        <button className="btn !py-1 text-xs" onClick={() => newGame(difficulty)}>
          New puzzle
        </button>
        {best != null && <span className="chip">Best: {best}s</span>}
      </div>

      <div
        className="grid w-full max-w-sm grid-cols-9 overflow-hidden rounded-lg bg-[var(--border-strong)]"
        style={{ gap: 1 }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const given = puzzle[r][c] !== 0;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isConflict = conflicts.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => setSelected([r, c])}
                className="flex aspect-square items-center justify-center text-base font-bold"
                style={{
                  background: isSelected ? "var(--accent)" : given ? "var(--bg-elev-2)" : "var(--bg)",
                  color: isSelected ? "var(--accent-contrast)" : isConflict ? "var(--bad)" : given ? "var(--text)" : "var(--accent)",
                  borderRight: c % 3 === 2 && c !== 8 ? "2px solid var(--border-strong)" : undefined,
                  borderBottom: r % 3 === 2 && r !== 8 ? "2px solid var(--border-strong)" : undefined,
                }}
              >
                {val !== 0 ? val : ""}
              </button>
            );
          }),
        )}
      </div>

      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            className="btn !py-1.5 text-sm"
            disabled={!selected}
            onClick={() => selected && setCell(selected[0], selected[1], n)}
          >
            {n}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost !py-1 text-xs" disabled={!selected} onClick={() => selected && setCell(selected[0], selected[1], 0)}>
        Clear cell
      </button>

      {won && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">Solved!</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{elapsed}s</p>
            <button className="btn btn-primary mt-4" onClick={() => newGame(difficulty)}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
