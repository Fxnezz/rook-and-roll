"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { LEVELS, loadLevel, move, isSolved, type SokobanState } from "@/lib/arcade/sokoban";

export function SokobanGame() {
  const [levelIdx, setLevelIdx] = useState(0);
  const { best, submit } = useHighScore("sokoban", { higherIsBetter: false, level: String(levelIdx) });
  const [state, setState] = useState<SokobanState>(() => loadLevel(0));
  const [won, setWon] = useState(false);

  const applyMove = (dir: "up" | "down" | "left" | "right") => {
    if (won) return;
    setState((s) => {
      const next = move(s, dir);
      if (next === s) return s;
      playArcadeSound("place");
      if (isSolved(next)) {
        setWon(true);
        submit(next.moves);
        playArcadeSound("win");
      }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") applyMove("up");
      else if (e.key === "ArrowDown" || e.key === "s") applyMove("down");
      else if (e.key === "ArrowLeft" || e.key === "a") applyMove("left");
      else if (e.key === "ArrowRight" || e.key === "d") applyMove("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const loadLevelAt = (i: number) => {
    setLevelIdx(i);
    setState(loadLevel(i));
    setWon(false);
  };

  const restart = () => loadLevelAt(levelIdx);
  const nextLevel = () => loadLevelAt((levelIdx + 1) % LEVELS.length);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Level {levelIdx + 1}/{LEVELS.length}</span>
        <span className="chip">Moves: {state.moves}</span>
        {best != null && <span className="chip">Best this level: {best}</span>}
      </div>

      <div className="inline-grid gap-0 rounded-md bg-[var(--bg-elev)] p-2" style={{ gridTemplateColumns: `repeat(${state.grid[0]?.length ?? 0}, 28px)` }}>
        {state.grid.map((row, r) =>
          row.map((cell, c) => {
            const k = `${r},${c}`;
            const isPlayer = state.player[0] === r && state.player[1] === c;
            const hasBox = state.boxes.has(k);
            const isTarget = state.targets.has(k);
            return (
              <div
                key={k}
                className="flex h-7 w-7 items-center justify-center text-lg"
                style={{ background: cell === "#" ? "var(--border-strong)" : isTarget ? "rgba(120,200,140,0.25)" : "transparent" }}
              >
                {isPlayer ? "🧑" : hasBox ? (isTarget ? "📦" : "🟫") : isTarget ? "•" : ""}
              </div>
            );
          }),
        )}
      </div>

      <div className="grid grid-cols-3 gap-1">
        <span />
        <button className="btn !py-2" onClick={() => applyMove("up")}>↑</button>
        <span />
        <button className="btn !py-2" onClick={() => applyMove("left")}>←</button>
        <button className="btn !py-2" onClick={() => applyMove("down")}>↓</button>
        <button className="btn !py-2" onClick={() => applyMove("right")}>→</button>
      </div>

      <div className="flex gap-2">
        <button className="btn" onClick={restart}>Restart</button>
        {won && (
          <button className="btn btn-primary" onClick={nextLevel}>
            Next level
          </button>
        )}
      </div>

      {won && <p className="text-lg font-bold">Solved in {state.moves} moves!</p>}
    </div>
  );
}
