import type { PieceSymbol, Color } from "chess.js";
import type { CSSProperties } from "react";
import { PieceGlyph } from "./glyphs";

export type PieceSetId = "monarch" | "flat" | "neon" | "wood" | "mono";

export interface PieceSetMeta {
  id: PieceSetId;
  name: string;
  description: string;
}

export const PIECE_SETS: PieceSetMeta[] = [
  { id: "monarch", name: "Monarch", description: "Bold, outlined, classic silhouettes" },
  { id: "flat", name: "Flat", description: "Minimal, flat, low-contrast lines" },
  { id: "neon", name: "Neon", description: "High-contrast glow on dark fills" },
  { id: "wood", name: "Classic Wood", description: "Warm, carved wooden pieces" },
  { id: "mono", name: "Minimal Line", description: "Single-color outline, no fill" },
];

interface Palette {
  pf: string; // fill
  ps: string; // stroke
  pw: number; // stroke width
  pd: string; // detail
}

const PALETTES: Record<PieceSetId, Record<Color, Palette>> = {
  monarch: {
    w: { pf: "#f3eee2", ps: "#2a2620", pw: 1.5, pd: "#2a2620" },
    b: { pf: "#31363f", ps: "#0a0c10", pw: 1.5, pd: "#c9ccce" },
  },
  flat: {
    w: { pf: "#f1ece0", ps: "#cbc3b1", pw: 0.9, pd: "#b7ad99" },
    b: { pf: "#2c313a", ps: "#1a1d24", pw: 0.9, pd: "#5a616d" },
  },
  neon: {
    w: { pf: "#7dfcff", ps: "#0d3b3d", pw: 2, pd: "#0d3b3d" },
    b: { pf: "#ff6ac1", ps: "#3d0d2e", pw: 2, pd: "#3d0d2e" },
  },
  wood: {
    w: { pf: "#e8c48a", ps: "#6b4423", pw: 1.5, pd: "#6b4423" },
    b: { pf: "#5a3620", ps: "#2a1810", pw: 1.5, pd: "#c9a876" },
  },
  mono: {
    w: { pf: "#f5f5f5", ps: "#d0d0d0", pw: 0.75, pd: "#d0d0d0" },
    b: { pf: "#2a2a2a", ps: "#454545", pw: 0.75, pd: "#454545" },
  },
};

export interface PieceProps {
  type: PieceSymbol;
  color: Color;
  set?: PieceSetId;
  /** pixel size; if omitted fills its container */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Piece({ type, color, set = "monarch", size, className, style }: PieceProps) {
  const p = PALETTES[set][color];
  const vars = {
    "--pf": p.pf,
    "--ps": p.ps,
    "--pw": p.pw,
    "--pd": p.pd,
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={className}
      style={{
        ...vars,
        display: "block",
        width: size ? undefined : "100%",
        height: size ? undefined : "100%",
        filter: "drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.35))",
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden
    >
      <PieceGlyph type={type} />
    </svg>
  );
}
