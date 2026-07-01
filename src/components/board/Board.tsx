"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Piece, type PieceSetId } from "@/lib/pieces";
import type { BoardTheme } from "@/lib/chess/themes";
import type { GameSnapshot } from "@/lib/chess/useChessGame";
import {
  isLightSquare,
  pointToSquare,
  rowColToSquare,
  squareToPercent,
} from "@/lib/chess/squares";
import type { Move } from "chess.js";
import { PromotionPicker } from "./PromotionPicker";
import { ArrowLayer, type Arrow } from "./ArrowLayer";

export interface BoardProps {
  snapshot: GameSnapshot;
  orientation: Color;
  theme: BoardTheme;
  pieceSet: PieceSetId;
  legalMovesFrom: (sq: Square) => Move[];
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  /** which colours the human may move; "both" for pass-and-play */
  movableColor?: Color | "both";
  interactive?: boolean;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  highlightLastMove?: boolean;
  animate?: boolean;
}

interface DragState {
  from: Square;
  piece: { type: PieceSymbol; color: Color };
  x: number; // pointer position relative to board (px)
  y: number;
}

const ANNOTATION_COLORS: Record<string, string> = {
  default: "#e9a23b",
  alt: "#e5604d",
  shift: "#5aa8e0",
  ctrl: "#5bbf7a",
};

function annotationColor(e: { altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
  if (e.altKey) return ANNOTATION_COLORS.alt;
  if (e.shiftKey) return ANNOTATION_COLORS.shift;
  if (e.ctrlKey || e.metaKey) return ANNOTATION_COLORS.ctrl;
  return ANNOTATION_COLORS.default;
}

export function Board({
  snapshot,
  orientation,
  theme,
  pieceSet,
  legalMovesFrom,
  onMove,
  movableColor = "both",
  interactive = true,
  showCoordinates = true,
  showLegalMoves = true,
  highlightLastMove = true,
  animate = true,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square; color: Color } | null>(null);

  // Annotations (right-click)
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [arrowDraft, setArrowDraft] = useState<Arrow | null>(null);
  const rightStart = useRef<{ square: Square; color: string } | null>(null);

  // Animation of the most recent move.
  const [anim, setAnim] = useState<{ from: Square; to: Square; type: PieceSymbol; color: Color } | null>(null);
  const prevCount = useRef(snapshot.moves.length);

  const flat = useMemo(() => {
    const list: { square: Square; type: PieceSymbol; color: Color }[] = [];
    for (const row of snapshot.board) for (const cell of row) if (cell) list.push(cell);
    return list;
  }, [snapshot.board]);

  const canMove = useCallback(
    (color: Color) =>
      interactive &&
      snapshot.isLive &&
      !snapshot.status.over &&
      (movableColor === "both" || movableColor === color),
    [interactive, snapshot.isLive, snapshot.status.over, movableColor],
  );

  // Clear transient UI whenever the shown position changes.
  useEffect(() => {
    setSelected(null);
    setDrag(null);
    setPromo(null);
    setHighlights({});
    setArrows([]);
    setArrowDraft(null);
  }, [snapshot.fen]);

  // Trigger the slide animation for a freshly played live move.
  useEffect(() => {
    const count = snapshot.moves.length;
    if (animate && snapshot.isLive && count === prevCount.current + 1 && count > 0) {
      const mv = snapshot.moves[count - 1];
      setAnim({ from: mv.from, to: mv.to, type: mv.promotion ?? mv.piece, color: mv.color });
      const t = setTimeout(() => setAnim(null), 170);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [snapshot.moves, snapshot.isLive, animate]);

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<Square, Move>();
    const m = new Map<Square, Move>();
    for (const mv of legalMovesFrom(selected)) m.set(mv.to, mv);
    return m;
  }, [selected, legalMovesFrom]);

  const pieceAt = useCallback(
    (sq: Square) => flat.find((p) => p.square === sq) ?? null,
    [flat],
  );

  const boardSize = () => boardRef.current?.getBoundingClientRect().width ?? 0;

  const attemptMove = useCallback(
    (from: Square, to: Square) => {
      const options = legalMovesFrom(from).filter((mv) => mv.to === to);
      if (options.length === 0) return false;
      if (options.some((mv) => mv.promotion)) {
        setPromo({ from, to, color: options[0].color });
        return true;
      }
      onMove(from, to);
      return true;
    },
    [legalMovesFrom, onMove],
  );

  // ---- Pointer handling ------------------------------------------------

  const squareFromEvent = (e: React.PointerEvent): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return pointToSquare(e.clientX - rect.left, e.clientY - rect.top, rect.width, orientation);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (promo) return;
    const sq = squareFromEvent(e);
    if (!sq) return;

    // Right button → annotations
    if (e.button === 2) {
      rightStart.current = { square: sq, color: annotationColor(e) };
      return;
    }
    if (e.button !== 0) return;

    // Left click clears annotations
    setHighlights({});
    setArrows([]);

    const piece = pieceAt(sq);

    if (selected && legalTargets.has(sq)) {
      attemptMove(selected, sq);
      setSelected(null);
      return;
    }

    if (piece && canMove(piece.color)) {
      setSelected(sq);
      const rect = boardRef.current!.getBoundingClientRect();
      boardRef.current!.setPointerCapture(e.pointerId);
      setDrag({ from: sq, piece, x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setSelected(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) {
      const rect = boardRef.current!.getBoundingClientRect();
      setDrag({ ...drag, x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (rightStart.current) {
      const sq = squareFromEvent(e);
      if (sq && sq !== rightStart.current.square) {
        setArrowDraft({ from: rightStart.current.square, to: sq, color: rightStart.current.color });
      } else {
        setArrowDraft(null);
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // Right button up → commit annotation
    if (e.button === 2 && rightStart.current) {
      const start = rightStart.current;
      const sq = squareFromEvent(e);
      rightStart.current = null;
      setArrowDraft(null);
      if (!sq || sq === start.square) {
        // toggle square highlight
        setHighlights((h) => {
          const next = { ...h };
          if (next[start.square]) delete next[start.square];
          else next[start.square] = start.color;
          return next;
        });
      } else {
        setArrows((prev) => {
          const exists = prev.find((a) => a.from === start.square && a.to === sq);
          if (exists) return prev.filter((a) => a !== exists);
          return [...prev, { from: start.square, to: sq, color: start.color }];
        });
      }
      return;
    }

    if (!drag) return;
    const sq = squareFromEvent(e);
    const from = drag.from;
    setDrag(null);
    if (sq && sq !== from && legalTargets.has(sq)) {
      attemptMove(from, sq);
      setSelected(null);
    } else if (sq === from) {
      // treated as a click-select; keep selection
    }
  };

  // ---- Rendering -------------------------------------------------------

  const squares = useMemo(() => {
    const cells: { square: Square; light: boolean; row: number; col: number }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = rowColToSquare(row, col, orientation);
        cells.push({ square, light: isLightSquare(square), row, col });
      }
    }
    return cells;
  }, [orientation]);

  const lastMove = highlightLastMove ? snapshot.lastMove : null;
  const hiddenSquare = drag?.from ?? anim?.to ?? null;

  return (
    <div
      ref={boardRef}
      className="relative w-full select-none rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
      style={{ aspectRatio: "1 / 1", touchAction: "none", cursor: drag ? "grabbing" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Square grid: colours, coordinates, highlights, hints */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {squares.map(({ square, light, row, col }) => {
          const bg = light ? theme.light : theme.dark;
          const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
          const isSel = selected === square;
          const isCheck = snapshot.checkedKingSquare === square;
          const hl = highlights[square];
          const target = legalTargets.get(square);
          const showFile = showCoordinates && row === 7;
          const showRank = showCoordinates && col === 0;
          const labelColor = light ? theme.labelOnLight : theme.labelOnDark;
          return (
            <div key={square} className="relative" style={{ background: bg }}>
              {isLast && <div className="absolute inset-0" style={{ background: theme.lastMove }} />}
              {isSel && <div className="absolute inset-0" style={{ background: theme.selected }} />}
              {isCheck && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${theme.check} 0%, rgba(229,75,60,0.35) 45%, transparent 72%)`,
                  }}
                />
              )}
              {hl && (
                <div
                  className="absolute inset-0"
                  style={{ background: hl, opacity: 0.5, mixBlendMode: "normal" }}
                />
              )}
              {showLegalMoves && target && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {pieceAt(square) ? (
                    <div
                      className="absolute inset-[6%] rounded-full"
                      style={{ boxShadow: `inset 0 0 0 0.35rem ${theme.hint}` }}
                    />
                  ) : (
                    <div className="rounded-full" style={{ width: "30%", height: "30%", background: theme.hint }} />
                  )}
                </div>
              )}
              {showRank && (
                <span
                  className="absolute top-[3%] left-[5%] text-[min(2.4vw,0.72rem)] font-bold leading-none pointer-events-none"
                  style={{ color: labelColor }}
                >
                  {square[1]}
                </span>
              )}
              {showFile && (
                <span
                  className="absolute bottom-[3%] right-[5%] text-[min(2.4vw,0.72rem)] font-bold leading-none pointer-events-none"
                  style={{ color: labelColor }}
                >
                  {square[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pieces */}
      {flat.map((p) => {
        const { x, y } = squareToPercent(p.square, orientation);
        const hidden = p.square === hiddenSquare;
        return (
          <div
            key={p.square}
            className="absolute pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "12.5%",
              height: "12.5%",
              opacity: hidden ? 0 : 1,
              zIndex: 2,
            }}
          >
            <Piece type={p.type} color={p.color} set={pieceSet} />
          </div>
        );
      })}

      {/* Sliding animation piece */}
      {anim && (
        <SlidePiece
          anim={anim}
          orientation={orientation}
          pieceSet={pieceSet}
        />
      )}

      {/* Dragged piece follows the pointer */}
      {drag && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: drag.x,
            top: drag.y,
            width: "12.5%",
            height: "12.5%",
            transform: "translate(-50%, -50%) scale(1.08)",
            zIndex: 30,
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))",
          }}
        >
          <Piece type={drag.piece.type} color={drag.piece.color} set={pieceSet} />
        </div>
      )}

      {/* Arrows */}
      <ArrowLayer arrows={arrowDraft ? [...arrows, arrowDraft] : arrows} orientation={orientation} />

      {/* Promotion picker */}
      {promo && (
        <PromotionPicker
          promo={promo}
          orientation={orientation}
          pieceSet={pieceSet}
          theme={theme}
          onSelect={(piece) => {
            const { from, to } = promo;
            setPromo(null);
            setSelected(null);
            onMove(from, to, piece);
          }}
          onCancel={() => setPromo(null)}
        />
      )}
    </div>
  );
}

function SlidePiece({
  anim,
  orientation,
  pieceSet,
}: {
  anim: { from: Square; to: Square; type: PieceSymbol; color: Color };
  orientation: Color;
  pieceSet: PieceSetId;
}) {
  const to = squareToPercent(anim.to, orientation);
  const from = squareToPercent(anim.from, orientation);
  // delta expressed in units of the element's own size (1 square = 100%)
  const dx = ((from.x - to.x) / 12.5) * 100;
  const dy = ((from.y - to.y) / 12.5) * 100;
  const [t, setT] = useState(`translate(${dx}%, ${dy}%)`);
  useEffect(() => {
    const id = requestAnimationFrame(() => setT("translate(0%, 0%)"));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${to.x}%`,
        top: `${to.y}%`,
        width: "12.5%",
        height: "12.5%",
        transform: t,
        transition: "transform 150ms ease-out",
        zIndex: 3,
      }}
    >
      <Piece type={anim.type} color={anim.color} set={pieceSet} />
    </div>
  );
}
