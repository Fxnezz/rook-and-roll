"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, randomTriple, canPlace, placePiece, isGameOver, type Shape } from "@/lib/arcade/blockpuzzle";

export function BlockPuzzleGame() {
  const { best, submit } = useHighScore("blockpuzzle", { higherIsBetter: true });
  const [board, setBoard] = useState<boolean[] | null>(null);
  const [pieces, setPieces] = useState<(Shape | null)[]>([null, null, null]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  useEffect(() => {
    setBoard(Array(SIZE * SIZE).fill(false));
    setPieces(randomTriple());
  }, []);

  if (!board) return null;

  const place = (row: number, col: number) => {
    if (over || selected == null) return;
    const shape = pieces[selected];
    if (!shape) return;
    const res = placePiece(board, shape, row, col);
    if (!res) return;
    const nextPieces = pieces.map((p, i) => (i === selected ? null : p));
    const refilled = nextPieces.every((p) => p == null) ? randomTriple() : nextPieces;
    setBoard(res.board);
    setPieces(refilled);
    setSelected(null);
    setScore((s) => {
      const next = s + res.scoreGained;
      submit(next);
      return next;
    });
    playArcadeSound(res.linesCleared > 0 ? "tetrisClear" : "place");
    if (isGameOver(res.board, refilled)) {
      setOver(true);
      playArcadeSound("gameOver");
    }
  };

  const reset = () => {
    setBoard(Array(SIZE * SIZE).fill(false));
    setPieces(randomTriple());
    setSelected(null);
    setScore(0);
    setOver(false);
  };

  const shapeCell = (shape: Shape, r: number, c: number) => shape.some(([dr, dc]) => dr === r && dc === c);
  const previewOk = (row: number, col: number) => selected != null && pieces[selected] != null && canPlace(board, pieces[selected]!, row, col);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Score: {score}</span>
        {best != null && <span className="chip">Best: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          New game
        </button>
      </div>

      <div className="grid gap-[2px] rounded-md p-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 28px)`, background: "var(--bg-elev)" }}>
        {board.map((filled, i) => {
          const row = Math.floor(i / SIZE);
          const col = i % SIZE;
          const boxShade = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;
          return (
            <button
              key={i}
              disabled={over}
              onClick={() => place(row, col)}
              style={{
                width: 28,
                height: 28,
                background: filled ? "var(--accent)" : previewOk(row, col) ? "rgba(120,200,140,0.35)" : boxShade ? "var(--bg)" : "var(--bg-elev)",
                border: "1px solid var(--border)",
              }}
            />
          );
        })}
      </div>

      <div className="flex gap-4">
        {pieces.map((shape, i) => {
          if (!shape) return <div key={i} className="h-16 w-16" />;
          const maxR = Math.max(...shape.map(([r]) => r)) + 1;
          const maxC = Math.max(...shape.map(([, c]) => c)) + 1;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="flex items-center justify-center rounded-md p-2"
              style={{ background: selected === i ? "rgba(120,200,140,0.3)" : "var(--bg-elev)", outline: selected === i ? "2px solid var(--good)" : "none" }}
            >
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${maxC}, 12px)`, gridTemplateRows: `repeat(${maxR}, 12px)` }}>
                {Array.from({ length: maxR * maxC }).map((_, idx2) => {
                  const r = Math.floor(idx2 / maxC);
                  const c = idx2 % maxC;
                  return <div key={idx2} style={{ width: 12, height: 12, background: shapeCell(shape, r, c) ? "var(--accent)" : "transparent" }} />;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {over && <p className="text-lg font-bold">No moves left — final score {score}</p>}
    </div>
  );
}
