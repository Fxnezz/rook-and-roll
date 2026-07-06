"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 4;

export interface DotsBoxesState {
  horizontal: boolean[][];
  vertical: boolean[][];
  boxes: (Seat | null)[][];
  turn: Seat;
}

export interface DotsBoxesMove {
  type: "h" | "v";
  row: number;
  col: number;
}

const BOX_COLOR: Record<Seat, string> = { a: "rgba(90,120,220,0.35)", b: "rgba(220,120,90,0.35)" };

export function DotsBoxesBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: DotsBoxesState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: DotsBoxesMove) => void;
  lastMove?: { move: DotsBoxesMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoxes = useRef(state.boxes);
  const [flash, setFlash] = useState<string[]>([]);

  useEffect(() => {
    const prev = prevBoxes.current;
    const won: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!prev[r][c] && state.boxes[r][c]) won.push(`${r}-${c}`);
      }
    }
    if (won.length > 0) {
      setFlash(won);
      playArcadeSound("capture");
      const t = setTimeout(() => setFlash([]), 400);
      prevBoxes.current = state.boxes;
      return () => clearTimeout(t);
    } else if (won.length === 0 && prev !== state.boxes) {
      playArcadeSound("place");
    }
    prevBoxes.current = state.boxes;
  }, [state.boxes]);

  const cell = 56;
  const dotR = 5;
  const total = SIZE * cell + 20;

  const lines: React.ReactNode[] = [];
  for (let row = 0; row <= SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const drawn = state.horizontal[row][col];
      const x1 = 10 + col * cell;
      const x2 = 10 + (col + 1) * cell;
      const y = 10 + row * cell;
      lines.push(
        <line
          key={`h-${row}-${col}`}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          strokeWidth={5}
          strokeLinecap="round"
          style={{
            stroke: drawn ? "var(--accent)" : "rgba(255,255,255,0.08)",
            cursor: canPlay && !drawn ? "pointer" : "default",
          }}
          onClick={() => canPlay && !drawn && onMove({ type: "h", row, col })}
        />,
      );
    }
  }
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col <= SIZE; col++) {
      const drawn = state.vertical[row][col];
      const x = 10 + col * cell;
      const y1 = 10 + row * cell;
      const y2 = 10 + (row + 1) * cell;
      lines.push(
        <line
          key={`v-${row}-${col}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          strokeWidth={5}
          strokeLinecap="round"
          style={{
            stroke: drawn ? "var(--accent)" : "rgba(255,255,255,0.08)",
            cursor: canPlay && !drawn ? "pointer" : "default",
          }}
          onClick={() => canPlay && !drawn && onMove({ type: "v", row, col })}
        />,
      );
    }
  }

  const boxes: React.ReactNode[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const owner = state.boxes[row][col];
      const isFlashing = flash.includes(`${row}-${col}`);
      boxes.push(
        <rect
          key={`box-${row}-${col}`}
          x={10 + col * cell + 4}
          y={10 + row * cell + 4}
          width={cell - 8}
          height={cell - 8}
          rx={6}
          fill={owner ? BOX_COLOR[owner] : "transparent"}
          style={{ transition: "fill 0.2s", opacity: isFlashing ? 1 : owner ? 0.8 : 0 }}
        />,
      );
      if (owner) {
        boxes.push(
          <text
            key={`label-${row}-${col}`}
            x={10 + col * cell + cell / 2}
            y={10 + row * cell + cell / 2 + 5}
            textAnchor="middle"
            fontSize={14}
            fontWeight={900}
            fill={owner === "a" ? "#6a8ae0" : "#e08a6a"}
          >
            {owner === "a" ? "A" : "B"}
          </text>,
        );
      }
    }
  }

  const dots: React.ReactNode[] = [];
  for (let row = 0; row <= SIZE; row++) {
    for (let col = 0; col <= SIZE; col++) {
      dots.push(
        <circle key={`dot-${row}-${col}`} cx={10 + col * cell} cy={10 + row * cell} r={dotR} fill="var(--text-faint)" />,
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-2xl bg-[var(--bg-elev)] p-3">
      <svg viewBox={`0 0 ${total} ${total}`} width="100%" height="auto">
        {boxes}
        {lines}
        {dots}
      </svg>
    </div>
  );
}
