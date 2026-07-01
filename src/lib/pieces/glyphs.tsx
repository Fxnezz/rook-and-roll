/**
 * Original chess piece geometry — hand-authored SVG, viewBox 0 0 45 45.
 *
 * Every shape paints with CSS custom properties so a single geometry can be
 * re-skinned by different piece "sets":
 *   --pf  piece fill
 *   --ps  piece stroke (silhouette outline)
 *   --pw  stroke width
 *   --pd  detail colour (eyes, slits, highlights)
 *
 * These are deliberately NOT copies of any existing commercial piece set —
 * they are simple, rounded, geometric forms drawn from primitives.
 */
import type { PieceSymbol } from "chess.js";
import type { ReactElement } from "react";

const bodyProps = {
  fill: "var(--pf)",
  stroke: "var(--ps)",
  strokeWidth: "var(--pw)",
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

function Base() {
  // Shared pedestal used by every piece.
  return (
    <>
      <rect x="10.5" y="35" width="24" height="5.2" rx="2.4" {...bodyProps} />
      <path d="M13 35 L14.4 31 L30.6 31 L32 35 Z" {...bodyProps} />
    </>
  );
}

function Pawn() {
  return (
    <>
      <rect x="12.5" y="35" width="20" height="5" rx="2.4" {...bodyProps} />
      <path d="M15.5 35 L16.8 30.5 L28.2 30.5 L29.5 35 Z" {...bodyProps} />
      <path d="M17 30.5 Q15.8 22.5 22.5 21 Q29.2 22.5 28 30.5 Z" {...bodyProps} />
      <circle cx="22.5" cy="15.2" r="5.1" {...bodyProps} />
    </>
  );
}

function Rook() {
  return (
    <>
      <Base />
      <path d="M15.6 31 L16.6 19.5 L28.4 19.5 L29.4 31 Z" {...bodyProps} />
      <path
        d="M13 19.5 L13 12.8 L17.2 12.8 L17.2 15.6 L20.4 15.6 L20.4 12.8 L24.6 12.8 L24.6 15.6 L27.8 15.6 L27.8 12.8 L32 12.8 L32 19.5 Z"
        {...bodyProps}
      />
    </>
  );
}

function Bishop() {
  return (
    <>
      <Base />
      <path d="M15 31 Q14.5 25 18 22 Q15.5 26 22.5 21.5 Q29.5 26 27 22 Q30.5 25 30 31 Z" {...bodyProps} />
      <path d="M22.5 12.2 C28.4 16.5 29 24.5 25.5 30.5 L19.5 30.5 C16 24.5 16.6 16.5 22.5 12.2 Z" {...bodyProps} />
      <circle cx="22.5" cy="9.6" r="2.4" {...bodyProps} />
      <path d="M20 22 L25 17" fill="none" stroke="var(--pd)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Knight(): ReactElement {
  return (
    <>
      <Base />
      <path
        d="M27.5 31
           C29.5 24 29.4 18.5 25 14.6
           C24 11.5 25.4 9.6 26.6 8.2
           L23.4 6.4
           C19 8.4 14.6 11.6 12.8 17
           C12 19.6 13.6 20.4 14.8 20.2
           C15 22 12.2 23.6 12.4 26.8
           C12.5 28.6 13.8 29.9 15 31 Z"
        {...bodyProps}
      />
      {/* ear */}
      <path d="M26.6 8.2 L28.6 6.2 L27.4 9.4 Z" {...bodyProps} />
      {/* mane */}
      <path d="M25 14.6 C22 14 20 15.4 18.5 17.8" fill="none" stroke="var(--pd)" strokeWidth="1.3" strokeLinecap="round" />
      {/* eye */}
      <circle cx="18.4" cy="14.4" r="1.35" fill="var(--pd)" />
    </>
  );
}

function Queen() {
  return (
    <>
      <Base />
      <path d="M14 31 Q12.6 22.5 22.5 20 Q32.4 22.5 31 31 Z" {...bodyProps} />
      <rect x="13.5" y="17.5" width="18" height="3.4" rx="1.2" {...bodyProps} />
      <path d="M13.5 20.5 L11 9.8 L16.8 15 L22.5 8 L28.2 15 L34 9.8 L31.5 20.5 Z" {...bodyProps} />
      <circle cx="11" cy="9.8" r="2" {...bodyProps} />
      <circle cx="16.8" cy="14.4" r="1.9" {...bodyProps} />
      <circle cx="22.5" cy="7.6" r="2.1" {...bodyProps} />
      <circle cx="28.2" cy="14.4" r="1.9" {...bodyProps} />
      <circle cx="34" cy="9.8" r="2" {...bodyProps} />
    </>
  );
}

function King() {
  return (
    <>
      <Base />
      <path d="M14 31 Q12.8 22.5 22.5 20.2 Q32.2 22.5 31 31 Z" {...bodyProps} />
      <rect x="13.6" y="18.4" width="17.8" height="3.4" rx="1.2" {...bodyProps} />
      <path
        d="M14.4 18.6 C13 13.6 16 11 19 12.6 C20 9.2 25 9.2 26 12.6 C29 11 32 13.6 30.6 18.6 Z"
        {...bodyProps}
      />
      {/* cross */}
      <rect x="21.4" y="3.4" width="2.2" height="9.4" rx="0.8" {...bodyProps} />
      <rect x="18.4" y="6.4" width="8.2" height="2.2" rx="0.8" {...bodyProps} />
    </>
  );
}

const GLYPHS: Record<PieceSymbol, () => ReactElement> = {
  p: Pawn,
  r: Rook,
  b: Bishop,
  n: Knight,
  q: Queen,
  k: King,
};

export function PieceGlyph({ type }: { type: PieceSymbol }) {
  const G = GLYPHS[type];
  return <G />;
}
