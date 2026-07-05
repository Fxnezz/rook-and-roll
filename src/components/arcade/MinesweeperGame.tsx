"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import {
  createBoard,
  reveal,
  toggleFlag,
  revealAllMines,
  checkWin,
  countFlags,
  MS_DIFFICULTIES,
  type MsBoard,
} from "@/lib/arcade/minesweeper";

const NUM_COLOR: Record<number, string> = {
  1: "#5aa8e0",
  2: "#5bbf7a",
  3: "#e5604d",
  4: "#b06fe0",
  5: "#e0c34a",
  6: "#4ad0c9",
  7: "#e8ecf3",
  8: "#9aa3b2",
};

type Difficulty = keyof typeof MS_DIFFICULTIES;

export function MinesweeperGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const { best, submit } = useHighScore("minesweeper", { level: difficulty, higherIsBetter: false });
  const diff = MS_DIFFICULTIES[difficulty];
  const [board, setBoard] = useState<MsBoard | null>(null);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState<"won" | "lost" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setBoard(null);
    setStarted(false);
    setOver(null);
    setElapsed(0);
    startRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => reset(), [difficulty, reset]);

  useEffect(() => {
    if (!started || over) return;
    timerRef.current = window.setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, over]);

  const handleReveal = (row: number, col: number) => {
    if (over) return;
    if (!board) {
      const fresh = createBoard(diff, row, col);
      const { board: revealedBoard, hitMine } = reveal(fresh, row, col);
      setBoard(revealedBoard);
      setStarted(true);
      startRef.current = Date.now();
      playArcadeSound("place");
      if (hitMine) finishLoss(revealedBoard);
      return;
    }
    if (board[row][col].flagged || board[row][col].revealed) return;
    const { board: next, hitMine } = reveal(board, row, col);
    setBoard(next);
    if (hitMine) {
      finishLoss(next);
      return;
    }
    playArcadeSound("place");
    if (checkWin(next)) finishWin();
  };

  const finishLoss = (b: MsBoard) => {
    setBoard(revealAllMines(b));
    setOver("lost");
    playArcadeSound("gameOver");
  };

  const finishWin = () => {
    setOver("won");
    playArcadeSound("win");
    if (startRef.current != null) submit(Math.floor((Date.now() - startRef.current) / 1000));
  };

  const handleFlag = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (over || !board || board[row][col].revealed) return;
    setBoard(toggleFlag(board, row, col));
  };

  const flagsUsed = board ? countFlags(board) : 0;
  const cellPx = diff.cols > 20 ? 22 : diff.cols > 10 ? 28 : 34;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {(Object.keys(MS_DIFFICULTIES) as Difficulty[]).map((d) => (
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

      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">💣 {diff.mines - flagsUsed}</span>
        <span className="chip">⏱ {elapsed}s</span>
        <button className="btn !py-1 text-xs" onClick={reset}>
          {over === "won" ? "😎" : over === "lost" ? "😵" : "🙂"} Reset
        </button>
        {best != null && <span className="chip">Best: {best}s</span>}
      </div>

      <div
        className="grid gap-[2px] rounded-xl bg-[var(--bg-elev)] p-2"
        style={{ gridTemplateColumns: `repeat(${diff.cols}, ${cellPx}px)` }}
      >
        {Array.from({ length: diff.rows }).map((_, row) =>
          Array.from({ length: diff.cols }).map((_, col) => {
            const cell = board?.[row]?.[col];
            const revealed = cell?.revealed;
            return (
              <button
                key={`${row}-${col}`}
                onClick={() => handleReveal(row, col)}
                onContextMenu={(e) => handleFlag(e, row, col)}
                className="flex items-center justify-center rounded-sm text-sm font-black"
                style={{
                  width: cellPx,
                  height: cellPx,
                  background: revealed ? (cell?.mine ? "#c0392b" : "var(--bg-elev-2)") : "var(--bg-elev-2)",
                  boxShadow: revealed ? "inset 0 0 0 1px rgba(0,0,0,0.2)" : "inset 0 -2px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.08)",
                  color: cell?.adjacent ? NUM_COLOR[cell.adjacent] : undefined,
                }}
              >
                {revealed ? (cell?.mine ? "💣" : cell?.adjacent || "") : cell?.flagged ? "🚩" : ""}
              </button>
            );
          }),
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">Left click to reveal, right click (or long-press) to flag.</p>
    </div>
  );
}
