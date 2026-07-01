"use client";

import type { Color, PieceSymbol, Square } from "chess.js";
import { Piece, type PieceSetId } from "@/lib/pieces";
import type { BoardTheme } from "@/lib/chess/themes";
import { squareToRowCol } from "@/lib/chess/squares";

const OPTIONS: PieceSymbol[] = ["q", "r", "b", "n"];

export function PromotionPicker({
  promo,
  orientation,
  pieceSet,
  theme,
  onSelect,
  onCancel,
}: {
  promo: { from: Square; to: Square; color: Color };
  orientation: Color;
  pieceSet: PieceSetId;
  theme: BoardTheme;
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}) {
  const { row, col } = squareToRowCol(promo.to, orientation);
  const dir = row < 4 ? 1 : -1;
  const x = col * 12.5;

  return (
    <div
      className="absolute inset-0 z-40 animate-fade"
      style={{ background: "rgba(6, 8, 12, 0.55)" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      {OPTIONS.map((type, i) => {
        const y = (row + dir * i) * 12.5;
        return (
          <button
            key={type}
            className="absolute flex items-center justify-center rounded-md transition-transform hover:scale-105"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "12.5%",
              height: "12.5%",
              background: theme.light,
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
              border: `2px solid ${theme.dark}`,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(type);
            }}
          >
            <Piece type={type} color={promo.color} set={pieceSet} />
          </button>
        );
      })}
    </div>
  );
}
