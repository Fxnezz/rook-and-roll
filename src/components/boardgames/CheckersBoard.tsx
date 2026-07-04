"use client";

import { useEffect, useRef, useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";
import { legalDestinations, applyHop, justKinged, jumpsFrom, type Board, type Sq } from "@/lib/boardgames/checkersHints";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface CheckersState {
  board: Board;
  turn: Seat;
}

export interface CheckersMove {
  path: Sq[];
}

const PIECE_GRADIENT: Record<Seat, string> = {
  a: "radial-gradient(circle at 32% 26%, #4a5461, #1c2027 78%)",
  b: "radial-gradient(circle at 32% 26%, #fdf8ec, #d8cdb2 78%)",
};
const PIECE_BORDER: Record<Seat, string> = { a: "#0a0c10", b: "#b8ac8e" };
const CROWN_COLOR: Record<Seat, string> = { a: "#e9a23b", b: "#a8681a" };

export function CheckersBoard({
  state,
  mySeat,
  interactive,
  onMove,
  lastMove,
}: {
  state: CheckersState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: CheckersMove) => void;
  lastMove?: { move: CheckersMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [path, setPath] = useState<Sq[]>([]);
  const [ghostBoard, setGhostBoard] = useState<Board>(state.board);
  const prevBoard = useRef(state.board);
  const [captureFlash, setCaptureFlash] = useState<string[]>([]);

  useEffect(() => {
    setPath([]);
    setGhostBoard(state.board);

    const prev = prevBoard.current;
    const removed: string[] = [];
    let added = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (prev[r][c] && !state.board[r][c]) removed.push(`${r}-${c}`);
        if (!prev[r][c] && state.board[r][c]) added = true;
      }
    }
    if (removed.length) {
      setCaptureFlash(removed);
      playArcadeSound("capture");
      const t = setTimeout(() => setCaptureFlash([]), 400);
      prevBoard.current = state.board;
      return () => clearTimeout(t);
    }
    if (added) playArcadeSound("place");
    prevBoard.current = state.board;
  }, [state.board]);

  const selected = path[0] ?? null;
  const cur = path.length ? path[path.length - 1] : null;

  const destinations: Sq[] = !cur
    ? []
    : path.length > 1
      ? jumpsFrom(ghostBoard, cur.row, cur.col)
      : legalDestinations(state.board, cur.row, cur.col, mySeat!);

  const isDest = (r: number, c: number) => destinations.some((d) => d.row === r && d.col === c);
  const lastFrom = lastMove?.move.path[0];
  const lastTo = lastMove?.move.path[lastMove.move.path.length - 1];
  const isLastMove = (r: number, c: number) =>
    (lastFrom?.row === r && lastFrom?.col === c) || (lastTo?.row === r && lastTo?.col === c);

  const handleClick = (row: number, col: number) => {
    if (!canPlay) return;
    const piece = ghostBoard[row][col];

    if (!cur) {
      if (piece && piece.player === mySeat) {
        const dests = legalDestinations(state.board, row, col, mySeat!);
        if (dests.length > 0) setPath([{ row, col }]);
      }
      return;
    }

    if (isDest(row, col)) {
      const nb = applyHop(ghostBoard, cur, { row, col });
      const newPath = [...path, { row, col }];
      const kinged = justKinged(nb, { row, col });
      const further = kinged ? [] : jumpsFrom(nb, row, col);
      const wasJump = Math.abs(row - cur.row) === 2;
      if (wasJump && further.length > 0) {
        setGhostBoard(nb);
        setPath(newPath);
      } else {
        onMove({ path: newPath });
        setPath([]);
        setGhostBoard(state.board);
      }
      return;
    }

    if (piece && piece.player === mySeat && path.length <= 1) {
      const dests = legalDestinations(state.board, row, col, mySeat!);
      if (dests.length > 0) setPath([{ row, col }]);
      else setPath([]);
    }
  };

  return (
    <div
      className="mx-auto grid aspect-square w-full max-w-[480px] grid-cols-8 overflow-hidden rounded-2xl p-2 shadow-xl"
      style={{ background: "linear-gradient(160deg, #5a3a22, #3a2314)" }}
    >
      {Array.from({ length: 8 }).map((_, displayRow) =>
        Array.from({ length: 8 }).map((_, col) => {
          const row = 7 - displayRow;
          const dark = (row + col) % 2 === 1;
          const piece = ghostBoard[row][col];
          const isSelected = selected && selected.row === row && selected.col === col;
          const highlighted = isDest(row, col);
          const key = `${row}-${col}`;
          const flashing = captureFlash.includes(key);
          return (
            <button
              key={key}
              onClick={() => handleClick(row, col)}
              disabled={!canPlay}
              className="relative flex items-center justify-center"
              style={{
                background: dark
                  ? "linear-gradient(155deg, #7a9a63, #5c7a49)"
                  : "linear-gradient(155deg, #f3f0da, #e6e2c3)",
              }}
            >
              {isLastMove(row, col) && <span className="absolute inset-0" style={{ background: "rgba(80,160,255,0.28)" }} />}
              {isSelected && <span className="absolute inset-0" style={{ background: "rgba(233,199,63,0.5)" }} />}
              {highlighted && (
                <span
                  className="absolute rounded-full"
                  style={{ width: "28%", height: "28%", background: "rgba(30,40,20,0.4)" }}
                />
              )}
              {flashing && (
                <span
                  className="absolute inset-[10%] rounded-full"
                  style={{ background: "rgba(224,67,43,0.7)", animation: "cb-capture 0.4s ease-out forwards" }}
                />
              )}
              {piece && (
                <span
                  className="absolute inset-[9%] rounded-full border-2"
                  style={{
                    background: PIECE_GRADIENT[piece.player],
                    borderColor: PIECE_BORDER[piece.player],
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25)",
                  }}
                >
                  <span className="absolute inset-[16%] rounded-full" style={{ border: `1px solid ${piece.player === "a" ? "#3a4048" : "#c9bd9c"}`, opacity: 0.6 }} />
                  {piece.king && (
                    <span
                      className="flex h-full items-center justify-center text-lg font-black"
                      style={{ color: CROWN_COLOR[piece.player], textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      ♚
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        }),
      )}
      <style>{`
        @keyframes cb-capture {
          0% { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
