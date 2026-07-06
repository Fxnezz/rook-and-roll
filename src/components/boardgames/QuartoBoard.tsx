"use client";

import { useState } from "react";
import type { Seat } from "@/lib/boardgames/protocol";

export interface QuartoState {
  board: (number | null)[];
  available: number[];
  pieceInHand: number | null;
  turn: Seat;
}

export interface QuartoMove {
  cell: number | null;
  give: number | null;
}

// UI-only copy of the win-check logic (kept separate from the engine per
// this project's convention) so the board can auto-submit a winning
// placement without waiting for an unnecessary "give a piece" click.
const LINES: number[][] = [];
for (let r = 0; r < 4; r++) LINES.push([0, 1, 2, 3].map((c) => r * 4 + c));
for (let c = 0; c < 4; c++) LINES.push([0, 1, 2, 3].map((r) => r * 4 + c));
LINES.push([0, 5, 10, 15]);
LINES.push([3, 6, 9, 12]);

function wouldWin(board: (number | null)[], cell: number, piece: number): boolean {
  const copy = [...board];
  copy[cell] = piece;
  return LINES.filter((l) => l.includes(cell)).some((line) => {
    const vals = line.map((i) => copy[i]);
    if (vals.some((v) => v == null)) return false;
    const [a, b, c, d] = vals as number[];
    return (a & b & c & d) !== 0 || (a | b | c | d) !== 15;
  });
}

function PieceIcon({ piece, size = 40 }: { piece: number; size?: number }) {
  const tall = (piece & 1) !== 0;
  const dark = (piece & 2) !== 0;
  const round = (piece & 4) !== 0;
  const hollow = (piece & 8) !== 0;
  const dim = tall ? size * 0.85 : size * 0.55;
  const color = dark ? "#2a2a2a" : "#e8e0c8";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {round ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={dim / 2}
          fill={hollow ? "none" : color}
          stroke={color}
          strokeWidth={hollow ? 4 : 1}
        />
      ) : (
        <rect
          x={(size - dim) / 2}
          y={(size - dim) / 2}
          width={dim}
          height={dim}
          fill={hollow ? "none" : color}
          stroke={color}
          strokeWidth={hollow ? 4 : 1}
        />
      )}
    </svg>
  );
}

export function QuartoBoard({
  state,
  mySeat,
  interactive,
  onMove,
}: {
  state: QuartoState;
  mySeat: Seat | null;
  interactive: boolean;
  onMove: (move: QuartoMove) => void;
  lastMove?: { move: QuartoMove; by: Seat; seq: number } | null;
}) {
  const canPlay = interactive && mySeat != null && state.turn === mySeat;
  const [pendingCell, setPendingCell] = useState<number | null>(null);

  const awaitingPlacement = state.pieceInHand != null && pendingCell == null;
  const awaitingGive = state.pieceInHand == null ? state.available.length > 0 : pendingCell != null;

  const placeAt = (cell: number) => {
    if (!canPlay || state.pieceInHand == null || state.board[cell] != null) return;
    if (wouldWin(state.board, cell, state.pieceInHand) || state.available.length === 0) {
      onMove({ cell, give: state.available[0] ?? null });
      return;
    }
    setPendingCell(cell);
  };

  const give = (piece: number) => {
    if (!canPlay) return;
    onMove({ cell: pendingCell, give: piece });
    setPendingCell(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl bg-[var(--bg-elev)] p-5">
      <div className="grid grid-cols-4 gap-1.5">
        {state.board.map((piece, i) => (
          <button
            key={i}
            disabled={!canPlay || !awaitingPlacement || piece != null}
            onClick={() => placeAt(i)}
            className="flex h-16 w-16 items-center justify-center rounded-md border-2 transition-colors"
            style={{
              borderColor: pendingCell === i ? "var(--accent)" : "var(--border-strong)",
              background: "var(--bg)",
              opacity: awaitingPlacement && piece == null && canPlay ? 1 : piece == null ? 0.6 : 1,
            }}
          >
            {piece != null && <PieceIcon piece={piece} />}
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-[var(--text-muted)]">
        {awaitingPlacement
          ? "Place the piece you were given on any empty square."
          : awaitingGive
            ? "Choose a piece to hand your opponent."
            : "Waiting…"}
      </p>

      {state.pieceInHand != null && pendingCell == null && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-[var(--text-faint)]">Piece to place</span>
          <div className="rounded-md border-2 p-1" style={{ borderColor: "var(--accent)" }}>
            <PieceIcon piece={state.pieceInHand} />
          </div>
        </div>
      )}

      {awaitingGive && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {state.available.map((piece) => (
            <button
              key={piece}
              disabled={!canPlay}
              onClick={() => give(piece)}
              className="flex h-11 w-11 items-center justify-center rounded-md border-2"
              style={{ borderColor: "var(--border-strong)", background: "var(--bg)", opacity: canPlay ? 1 : 0.6 }}
            >
              <PieceIcon piece={piece} size={32} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
