"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, randomBoard, areAdjacent, trySwap, resolveCascade } from "@/lib/arcade/match3";

const GEM_COLORS = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d", "#8338ec"];
const MOVE_LIMIT = 30;

export function Match3Game() {
  const { best, submit } = useHighScore("match3", { higherIsBetter: true });
  const [board, setBoard] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState(false);

  useEffect(() => {
    setBoard(randomBoard());
  }, []);

  if (!board) return null;

  const click = (i: number) => {
    if (over) return;
    if (selected == null) {
      setSelected(i);
      return;
    }
    if (i === selected) {
      setSelected(null);
      return;
    }
    if (!areAdjacent(selected, i)) {
      setSelected(i);
      return;
    }
    const swapped = trySwap(board, selected, i);
    setSelected(null);
    if (!swapped) {
      playArcadeSound("wrong");
      return;
    }
    const result = resolveCascade(swapped);
    setBoard(result.board);
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setScore((s) => {
      const next = s + result.scoreGained;
      if (nextMoves >= MOVE_LIMIT) submit(next);
      return next;
    });
    playArcadeSound(result.cascades > 1 ? "tetrisClear" : "merge");
    if (nextMoves >= MOVE_LIMIT) {
      setOver(true);
      playArcadeSound("gameOver");
    }
  };

  const reset = () => {
    setBoard(randomBoard());
    setSelected(null);
    setScore(0);
    setMoves(0);
    setOver(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        <span className="chip">Moves: {moves}/{MOVE_LIMIT}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="grid gap-1 rounded-md p-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 36px)`, background: "var(--bg-elev)" }}>
        {board.map((color, i) => (
          <button
            key={i}
            disabled={over}
            onClick={() => click(i)}
            className="rounded-md"
            style={{
              width: 36,
              height: 36,
              background: GEM_COLORS[color],
              outline: selected === i ? "3px solid white" : "none",
              transform: selected === i ? "scale(0.9)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {over ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">Out of moves — final score {score}</p>
          <button className="btn btn-primary" onClick={reset}>
            Play again
          </button>
        </div>
      ) : (
        <button className="btn !py-1 text-xs" onClick={reset}>
          New board
        </button>
      )}
    </div>
  );
}
