"use client";

import { useEffect, useRef } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { playArcadeSound } from "@/lib/arcade/sound";

const SIZE = 7;
const CELL_COLOR: Record<Seat, string> = { a: "#5a7ae0", b: "#e07a5a" };

export interface HexState {
  board: (Seat | null)[][];
  turn: Seat;
}

export interface HexMove {
  row: number;
  col: number;
}

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

export function HexBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: HexState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: HexMove) => void;
  lastMove?: { move: HexMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const prevBoard = useRef(state.board);

  useEffect(() => {
    const changed = state.board.some((r, i) => r.some((c, j) => c !== prevBoard.current[i][j]));
    if (changed) playArcadeSound("place");
    prevBoard.current = state.board;
  }, [state.board]);

  const cellSize = 40;

  return (
    <div className="mx-auto w-full max-w-[520px] overflow-x-auto rounded-2xl p-4" style={{ background: "linear-gradient(160deg, #2a3040, #1a1f2a)" }}>
      <div className="mb-1 flex justify-center gap-1 text-xs font-semibold" style={{ color: CELL_COLOR.a }}>
        A connects top ↕ bottom
      </div>
      {state.board.map((row, r) => (
        <div key={r} className="flex" style={{ marginLeft: r * (cellSize * 0.5), marginTop: r === 0 ? 0 : -cellSize * 0.28 }}>
          {r === 0 && (
            <span className="mr-1 flex items-center text-xs font-semibold" style={{ color: CELL_COLOR.b, width: 20 }}>
              B
            </span>
          )}
          {row.map((cell, c) => {
            const clickable = canPlay && cell === null;
            return (
              <button
                key={c}
                disabled={!clickable}
                onClick={() => onMove({ row: r, col: c })}
                style={{
                  width: cellSize,
                  height: cellSize * 0.92,
                  clipPath: HEX_CLIP,
                  background: cell ? CELL_COLOR[cell] : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  margin: "0 1px",
                  cursor: clickable ? "pointer" : "default",
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
