"use client";

import { useCallback, useMemo, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import {
  ROWS,
  COLS,
  isValidCell,
  initialBoard,
  legalMoves,
  applyMove,
  pegCount,
  isSolved,
  type PegMove,
} from "@/lib/arcade/pegsolitaire";

export function PegSolitaireGame() {
  const { best, submit } = useHighScore("pegsolitaire", { higherIsBetter: false });
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  const moves = useMemo(() => legalMoves(board), [board]);
  const destsFrom = useCallback(
    (from: number) => moves.filter((m) => m.from === from).map((m) => m.to),
    [moves],
  );

  const finish = useCallback(
    (b: boolean[]) => {
      if (legalMoves(b).length === 0) {
        setOver(true);
        submit(pegCount(b));
        playArcadeSound(isSolved(b) ? "win" : "gameOver");
      }
    },
    [submit],
  );

  const click = (cell: number) => {
    if (over) return;
    const row = Math.floor(cell / COLS);
    const col = cell % COLS;
    if (!isValidCell(row, col)) return;

    if (selected == null) {
      if (board[cell]) setSelected(cell);
      return;
    }
    if (cell === selected) {
      setSelected(null);
      return;
    }
    const move = moves.find((m) => m.from === selected && m.to === cell);
    if (move) {
      const next = applyMove(board, move);
      setBoard(next);
      setSelected(null);
      playArcadeSound("capture");
      finish(next);
    } else if (board[cell]) {
      setSelected(cell);
    } else {
      setSelected(null);
    }
  };

  const reset = () => {
    setBoard(initialBoard());
    setSelected(null);
    setOver(false);
  };

  const dests = selected != null ? destsFrom(selected) : [];
  const pegs = pegCount(board);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Pegs left: {pegs}</span>
        {best != null && <span className="chip">Best: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          Reset
        </button>
      </div>

      <div
        className="grid gap-1 rounded-xl p-3"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, background: "var(--bg-elev)" }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          if (!isValidCell(row, col)) return <div key={i} className="h-10 w-10" />;
          const hasPeg = board[i];
          const isSel = selected === i;
          const isDest = dests.includes(i);
          return (
            <button
              key={i}
              onClick={() => click(i)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform"
              style={{
                background: "var(--bg)",
                borderColor: isSel ? "var(--accent)" : isDest ? "var(--good)" : "var(--border-strong)",
              }}
            >
              {hasPeg && (
                <span
                  className="h-7 w-7 rounded-full"
                  style={{ background: "var(--accent)", transform: isSel ? "scale(1.1)" : "scale(1)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {over && (
        <p className="text-lg font-bold">
          {isSolved(board) ? "Solved! Just one peg left." : `No more moves — ${pegs} pegs left.`}
        </p>
      )}
    </div>
  );
}
