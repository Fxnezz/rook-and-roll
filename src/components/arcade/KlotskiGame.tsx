"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { initialState, canMove, moveBlock, isSolved, BOARD_W, BOARD_H, KING_ID, type KlotskiState } from "@/lib/arcade/klotski";

const CELL = 64;
const GAP = 4;

const BLOCK_COLOR = (id: number, w: number, h: number) => {
  if (id === KING_ID) return "#e9c73f";
  if (w === 1 && h === 1) return "#5bbf7a";
  if (w === 2 && h === 1) return "#5aa8e0";
  return "#e0836a";
};

export function KlotskiGame() {
  const { best, submit } = useHighScore("klotski", { higherIsBetter: false });
  const [state, setState] = useState<KlotskiState>(() => initialState());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const reset = useCallback(() => {
    setState(initialState());
    setMoves(0);
    setWon(false);
    setSelected(null);
  }, []);

  const slide = (dr: number, dc: number) => {
    if (selected == null || won) return;
    if (!canMove(state, selected, dr, dc)) return;
    const next = moveBlock(state, selected, dr, dc)!;
    setState(next);
    setMoves((m) => m + 1);
    playArcadeSound("place");
    if (isSolved(next)) {
      setWon(true);
      playArcadeSound("win");
      submit(moves + 1);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        slide(dir[0], dir[1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, state, won, moves]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Moves: {moves}</span>
        <button className="btn !py-1 text-xs" onClick={reset}>
          Restart
        </button>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div
        className="relative rounded-xl bg-[var(--bg-elev)] p-2"
        style={{ width: BOARD_W * CELL + GAP * (BOARD_W + 1), height: BOARD_H * CELL + GAP * (BOARD_H + 1) }}
      >
        {/* exit marker */}
        <div
          className="absolute rounded-b-lg"
          style={{
            left: GAP + 1 * (CELL + GAP),
            top: GAP + BOARD_H * (CELL + GAP) - GAP,
            width: 2 * CELL + GAP,
            height: 6,
            background: "var(--good)",
          }}
        />
        {state.blocks.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected((s) => (s === b.id ? null : b.id))}
            className="absolute flex items-center justify-center rounded-lg text-xs font-black text-white transition-all duration-150"
            style={{
              left: GAP + b.col * (CELL + GAP),
              top: GAP + b.row * (CELL + GAP),
              width: b.w * CELL + GAP * (b.w - 1),
              height: b.h * CELL + GAP * (b.h - 1),
              background: BLOCK_COLOR(b.id, b.w, b.h),
              boxShadow: selected === b.id ? "0 0 0 3px var(--accent)" : "inset 0 -3px 0 rgba(0,0,0,0.2)",
            }}
          >
            {b.id === KING_ID ? "★" : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1" style={{ width: 140 }}>
        <div />
        <button className="btn !py-1" onClick={() => slide(-1, 0)}>
          ↑
        </button>
        <div />
        <button className="btn !py-1" onClick={() => slide(0, -1)}>
          ←
        </button>
        <button className="btn !py-1" onClick={() => slide(1, 0)}>
          ↓
        </button>
        <button className="btn !py-1" onClick={() => slide(0, 1)}>
          →
        </button>
      </div>
      <p className="text-xs text-[var(--text-faint)]">Tap a block, then slide it — or use the arrow keys / arrow buttons.</p>

      {won && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">Solved in {moves} moves!</p>
            <button className="btn btn-primary mt-4" onClick={reset}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
