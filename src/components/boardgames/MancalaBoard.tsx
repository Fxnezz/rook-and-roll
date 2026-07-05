"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface MancalaState {
  board: number[]; // length 14
  turn: Seat;
}

export interface MancalaMove {
  pit: number;
}

const A_PITS = [0, 1, 2, 3, 4, 5];
const B_PITS = [7, 8, 9, 10, 11, 12];
const A_STORE = 6;
const B_STORE = 13;

function ownStore(p: Seat): number {
  return p === "a" ? A_STORE : B_STORE;
}
function oppStore(p: Seat): number {
  return p === "a" ? B_STORE : A_STORE;
}
function ownPits(p: Seat): number[] {
  return p === "a" ? A_PITS : B_PITS;
}

/** Replays the same sow logic (read-only) purely to animate the seed path in order. */
function computeSowPath(board: number[], player: Seat, pit: number): number[] {
  let seeds = board[pit];
  let idx = pit;
  const skip = oppStore(player);
  const path: number[] = [];
  while (seeds > 0) {
    idx = (idx + 1) % 14;
    if (idx === skip) continue;
    path.push(idx);
    seeds--;
  }
  return path;
}

export function MancalaBoard({
  state,
  mySeat,
  interactive,
  onMove,
  lastMove,
}: {
  state: MancalaState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: MancalaMove) => void;
  lastMove?: { move: MancalaMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);
  const [pulses, setPulses] = useState<Map<number, number>>(new Map());
  const [captureFlash, setCaptureFlash] = useState<number[]>([]);

  useEffect(() => {
    const prev = prevBoard.current;
    if (lastMove && lastMove.move.pit != null) {
      const path = computeSowPath(prev, lastMove.by, lastMove.move.pit);
      const map = new Map<number, number>();
      path.forEach((idx, i) => map.set(idx, i * 90));
      setPulses(map);
      playArcadeSound("place");

      // capture: a pit that had seeds before and is now 0, alongside the store jumping by more than the path's single seed
      const captured: number[] = [];
      for (let i = 0; i < 14; i++) {
        if (prev[i] > 0 && state.board[i] === 0 && i !== A_STORE && i !== B_STORE && !path.includes(i)) {
          captured.push(i);
        }
      }
      if (captured.length > 0) {
        setCaptureFlash(captured);
        playArcadeSound("capture");
        setTimeout(() => setCaptureFlash([]), 500);
      }
      const t = setTimeout(() => setPulses(new Map()), path.length * 90 + 300);
      prevBoard.current = state.board;
      return () => clearTimeout(t);
    }
    prevBoard.current = state.board;
  }, [state.board, lastMove]);

  const handleClick = (pit: number) => {
    if (!canPlay || !ownPits(mySeat!).includes(pit) || state.board[pit] === 0) return;
    onMove({ pit });
  };

  const Pit = ({ index }: { index: number }) => {
    const count = state.board[index];
    const isOwn = mySeat != null && ownPits(mySeat).includes(index) && canPlay && count > 0;
    const pulseDelay = pulses.get(index);
    const flashing = captureFlash.includes(index);
    return (
      <button
        onClick={() => handleClick(index)}
        disabled={!isOwn}
        className="relative flex aspect-square w-full items-center justify-center rounded-full text-lg font-black"
        style={{
          background: "radial-gradient(circle at 35% 30%, #7a5230, #4a3018 80%)",
          boxShadow: isOwn ? "0 0 0 2px var(--accent) inset" : "inset 0 2px 4px rgba(0,0,0,0.5)",
          color: "#f3e6cf",
        }}
      >
        {pulseDelay != null && (
          <span
            className="absolute inset-[15%] rounded-full"
            style={{ background: "rgba(255,255,255,0.4)", animation: `mb-pulse 0.3s ${pulseDelay}ms ease-out` }}
          />
        )}
        {flashing && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "rgba(224,67,43,0.5)", animation: "mb-capture 0.5s ease-out forwards" }}
          />
        )}
        {count}
      </button>
    );
  };

  const Store = ({ seat, col }: { seat: Seat; col: number }) => (
    <div
      className="flex items-center justify-center rounded-2xl text-2xl font-black"
      style={{
        background: "linear-gradient(160deg, #5a3a22, #3a2314)",
        color: "#f3e6cf",
        gridColumn: col,
        gridRow: "1 / 3",
      }}
    >
      {state.board[ownStore(seat)]}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <p className="mb-2 text-center text-sm text-[var(--text-muted)]">White (top) · Black (bottom)</p>
      <div
        className="grid gap-2 rounded-2xl p-3 shadow-xl"
        style={{
          gridTemplateColumns: "1fr repeat(6, 1.4fr) 1fr",
          gridTemplateRows: "1fr 1fr",
          aspectRatio: "3 / 1",
          background: "linear-gradient(160deg, #8a6a44, #6a4a28)",
        }}
      >
        <Store seat="b" col={1} />
        {[12, 11, 10, 9, 8, 7].map((i, col) => (
          <div key={i} style={{ gridColumn: col + 2, gridRow: 1 }}>
            <Pit index={i} />
          </div>
        ))}
        {[0, 1, 2, 3, 4, 5].map((i, col) => (
          <div key={i} style={{ gridColumn: col + 2, gridRow: 2 }}>
            <Pit index={i} />
          </div>
        ))}
        <Store seat="a" col={8} />
      </div>
      <style>{`
        @keyframes mb-pulse {
          0% { opacity: 1; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes mb-capture {
          0% { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
