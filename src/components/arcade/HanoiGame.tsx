"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { DISK_COUNT, initialPegs, canMove, move, isSolved, minMoves, type Pegs } from "@/lib/arcade/hanoi";

const DISK_COLORS = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d", "#8338ec", "#ff006e"];

export function HanoiGame() {
  const { best, submit } = useHighScore("hanoi", { higherIsBetter: false });
  const [pegs, setPegs] = useState<Pegs>(() => initialPegs());
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const clickPeg = (peg: number) => {
    if (won) return;
    if (selected == null) {
      if (pegs[peg].length > 0) setSelected(peg);
      return;
    }
    if (selected === peg) {
      setSelected(null);
      return;
    }
    if (canMove(pegs, selected, peg)) {
      const next = move(pegs, selected, peg);
      setPegs(next);
      setMoves((m) => m + 1);
      setSelected(null);
      playArcadeSound("place");
      if (isSolved(next)) {
        setWon(true);
        submit(moves + 1);
        playArcadeSound("win");
      }
    } else {
      setSelected(pegs[peg].length > 0 ? peg : null);
    }
  };

  const reset = () => {
    setPegs(initialPegs());
    setSelected(null);
    setMoves(0);
    setWon(false);
  };

  const optimal = minMoves();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Moves: {moves}</span>
        <span className="chip">Optimal: {optimal}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="flex w-full max-w-md items-end justify-around rounded-2xl bg-[var(--bg-elev)] p-6" style={{ height: 220 }}>
        {pegs.map((stack, peg) => (
          <button
            key={peg}
            onClick={() => clickPeg(peg)}
            className="relative flex h-full w-24 flex-col-reverse items-center justify-start"
          >
            <span
              className="absolute bottom-0 h-2 w-full rounded"
              style={{ background: selected === peg ? "var(--accent)" : "var(--border-strong)" }}
            />
            <span
              className="absolute bottom-1 w-1.5 rounded-t"
              style={{ height: 150, background: "var(--text-faint)" }}
            />
            <div className="relative z-10 flex flex-col-reverse items-center gap-0.5 pb-2">
              {stack.map((disk, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 24 + disk * 12,
                    height: 14,
                    background: DISK_COLORS[(disk - 1) % DISK_COLORS.length],
                  }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      <button className="btn" onClick={reset}>
        Reset
      </button>

      {won && (
        <p className="text-lg font-bold">
          Solved in {moves} moves! {moves === optimal ? "Optimal!" : `(optimal is ${optimal})`}
        </p>
      )}
    </div>
  );
}
