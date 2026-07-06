"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, COLOR_COUNT, MAX_MOVES, randomBoard, floodFill, isSolved } from "@/lib/arcade/floodit";

const PALETTE = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d", "#8338ec"];

export function FloodItGame() {
  const { best, submit } = useHighScore("floodit", { higherIsBetter: false });
  const [board, setBoard] = useState<number[] | null>(null);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  useEffect(() => {
    setBoard(randomBoard());
  }, []);

  const pick = (color: number) => {
    if (!board || status !== "playing" || color === board[0]) return;
    const next = floodFill(board, color);
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    if (isSolved(next)) {
      setStatus("won");
      submit(nextMoves);
      playArcadeSound("win");
    } else if (nextMoves >= MAX_MOVES) {
      setStatus("lost");
      playArcadeSound("lose");
    } else {
      playArcadeSound("click");
    }
  };

  const reset = () => {
    setBoard(randomBoard());
    setMoves(0);
    setStatus("playing");
  };

  if (!board) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Moves: {moves}/{MAX_MOVES}</span>
        {best != null && <span className="chip">Best: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          New board
        </button>
      </div>

      <div className="grid gap-0 overflow-hidden rounded-md" style={{ gridTemplateColumns: `repeat(${SIZE}, 20px)` }}>
        {board.map((color, i) => (
          <div key={i} style={{ width: 20, height: 20, background: PALETTE[color] }} />
        ))}
      </div>

      <div className="flex gap-2">
        {Array.from({ length: COLOR_COUNT }).map((_, color) => (
          <button
            key={color}
            disabled={status !== "playing"}
            onClick={() => pick(color)}
            className="h-10 w-10 rounded-full border-2"
            style={{ background: PALETTE[color], borderColor: board[0] === color ? "var(--text)" : "transparent" }}
          />
        ))}
      </div>

      {status !== "playing" && (
        <p className="text-lg font-bold">{status === "won" ? `Flooded in ${moves} moves!` : "Out of moves!"}</p>
      )}
    </div>
  );
}
