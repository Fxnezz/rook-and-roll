"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, emptyGrid, toggleAt, randomPuzzle, isSolved } from "@/lib/arcade/lightsout";

export function LightsOutGame() {
  const { best, submit } = useHighScore("lightsout", { higherIsBetter: false });
  const [grid, setGrid] = useState<boolean[]>(emptyGrid);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGrid(randomPuzzle(15));
    setReady(true);
  }, []);

  const press = (cell: number) => {
    if (won || !ready) return;
    const next = toggleAt(grid, cell);
    setGrid(next);
    setMoves((m) => m + 1);
    playArcadeSound("click");
    if (isSolved(next)) {
      setWon(true);
      submit(moves + 1);
      playArcadeSound("win");
    }
  };

  const newPuzzle = () => {
    setGrid(randomPuzzle(15));
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Moves: {moves}</span>
        {best != null && <span className="chip">Best: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={newPuzzle}>
          New puzzle
        </button>
      </div>

      <div
        className="grid gap-1.5 rounded-xl p-3"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, background: "var(--bg-elev)" }}
      >
        {grid.map((lit, i) => (
          <button
            key={i}
            disabled={won || !ready}
            onClick={() => press(i)}
            className="h-12 w-12 rounded-md border-2 transition-colors"
            style={{
              background: lit ? "#f4d35e" : "var(--bg)",
              borderColor: lit ? "#c9a227" : "var(--border-strong)",
              boxShadow: lit ? "0 0 12px 2px rgba(244,211,94,0.6)" : "none",
            }}
          />
        ))}
      </div>

      {won && <p className="text-lg font-bold">Solved in {moves} moves!</p>}
    </div>
  );
}
