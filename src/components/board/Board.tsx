"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Piece, type PieceSetId } from "@/lib/pieces";
import type { BoardTheme } from "@/lib/chess/themes";
import type { GameSnapshot } from "@/lib/chess/useChessGame";
import type { CoordinateStyle } from "@/lib/chess/useSettings";
import {
  isLightSquare,
  pointToSquare,
  rowColToSquare,
  squareToPercent,
  squareToRowCol,
} from "@/lib/chess/squares";
import type { Move } from "chess.js";
import { PromotionPicker } from "./PromotionPicker";
import { ArrowLayer, type Arrow } from "./ArrowLayer";

export type AnimationSpeedName = "instant" | "fast" | "normal" | "slow";
export type BoardFrameName = "none" | "wood" | "minimal" | "shadow";

const ANIM_SCALE: Record<AnimationSpeedName, number> = { instant: 0, fast: 0.5, normal: 1, slow: 1.8 };

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
  /** Where file/rank labels render: inside the edge squares, or in a margin outside the 8x8 grid. */
  coordinateStyle?: CoordinateStyle;
  showLegalMoves?: boolean;
  highlightLastMove?: boolean;
  animate?: boolean;
  /** Programmatic arrows (e.g. a cheat-panel move prediction), merged with user-drawn ones. */
  extraArrows?: Arrow[];
  /** Overrides theme.light/dark when set. */
  squareColorOverride?: { light: string; dark: string } | null;
  /** Piece size as a percentage of the square, 70-100. */
  pieceSizePercent?: number;
  animationSpeed?: AnimationSpeedName;
  /** Default color for freshly drawn (no-modifier) arrow annotations. */
  arrowColor?: string;
  boardFrame?: BoardFrameName;
  /** Board render size as a percentage of its available width, 80-140. */
  zoomPercent?: number;
  /** Require a second click on the destination square to commit a (non-drag) move. */
  confirmMove?: boolean;
  /** Skip the promotion picker and always promote to queen. */
  autoQueen?: boolean;
  /** Which input gestures the board accepts for committing moves. */
  moveInputMode?: "drag" | "click" | "both";
  /** Allow selecting/queuing a move for the not-yet-active side; only meaningful when movableColor is a single color. */
  premovesEnabled?: boolean;
  /** Currently queued premove, rendered as a highlight + ghost piece. */
  premove?: { from: Square; to: Square } | null;
  onSetPremove?: (from: Square, to: Square) => void;
  /** Swap the check highlight from red to blue — red-green colorblindness can make it hard to spot against green-square themes. */
  colorblindMode?: boolean;
  onCancelPremove?: () => void;
  /** Swipe right on an empty/non-interactive part of the board — step to the previous move. */
  onSwipeBack?: () => void;
  /** Swipe left on an empty/non-interactive part of the board — step to the next move. */
  onSwipeForward?: () => void;
  /** Read each move aloud via the browser's speech synthesis, alongside the aria-live announcement. */
  speechAnnounceMoves?: boolean;
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

function annotationColor(
  e: { altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  defaultColor: string,
) {
  if (e.altKey) return ANNOTATION_COLORS.alt;
  if (e.shiftKey) return ANNOTATION_COLORS.shift;
  if (e.ctrlKey || e.metaKey) return ANNOTATION_COLORS.ctrl;
  return defaultColor;
}

// ---- Screen-reader support -----------------------------------------------

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const COLOR_NAMES: Record<Color, string> = { w: "White", b: "Black" };

function squareAriaLabel(square: Square, piece: { type: PieceSymbol; color: Color } | null, isCheck: boolean): string {
  if (!piece) return `${square}, empty`;
  const base = `${square}, ${COLOR_NAMES[piece.color]} ${PIECE_NAMES[piece.type]}`;
  return isCheck ? `${base}, in check` : base;
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
  coordinateStyle = "inside",
  showLegalMoves = true,
  highlightLastMove = true,
  animate = true,
  extraArrows = [],
  squareColorOverride = null,
  pieceSizePercent = 100,
  animationSpeed = "normal",
  arrowColor = ANNOTATION_COLORS.default,
  boardFrame = "none",
  zoomPercent = 100,
  confirmMove = false,
  autoQueen = false,
  moveInputMode = "both",
  premovesEnabled = false,
  premove = null,
  onSetPremove,
  colorblindMode = false,
  onCancelPremove,
  onSwipeBack,
  onSwipeForward,
  speechAnnounceMoves = false,
}: BoardProps) {
  const effTheme: BoardTheme = {
    ...theme,
    ...(squareColorOverride ? { light: squareColorOverride.light, dark: squareColorOverride.dark } : {}),
    ...(colorblindMode ? { check: "#4a7fd6" } : {}),
  };
  const animScale = ANIM_SCALE[animationSpeed];
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square; color: Color } | null>(null);
  // Set alongside `selected`/`drag` when the selection is a premove pick (not a live move).
  const [premoveDragFrom, setPremoveDragFrom] = useState<Square | null>(null);
  // Awaiting a second click on the same destination square (confirmMove setting).
  const [pendingConfirm, setPendingConfirm] = useState<{ from: Square; to: Square } | null>(null);

  // Annotations (right-click)
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [arrowDraft, setArrowDraft] = useState<Arrow | null>(null);
  const rightStart = useRef<{ square: Square; color: string } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

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
      snapshot.turn === color &&
      (movableColor === "both" || movableColor === color),
    [interactive, snapshot.isLive, snapshot.status.over, snapshot.turn, movableColor],
  );

  // A piece can be premove-picked when it belongs to the side we control but
  // it isn't currently that side's turn (premoves don't make sense in "both"
  // pass-and-play mode — there's no waiting on an opponent).
  const canPremove = useCallback(
    (color: Color) =>
      premovesEnabled &&
      interactive &&
      snapshot.isLive &&
      !snapshot.status.over &&
      movableColor !== "both" &&
      movableColor === color &&
      snapshot.turn !== color,
    [premovesEnabled, interactive, snapshot.isLive, snapshot.status.over, movableColor, snapshot.turn],
  );

  // Clear transient UI whenever the shown position changes.
  useEffect(() => {
    setSelected(null);
    setDrag(null);
    setPromo(null);
    setHighlights({});
    setArrows([]);
    setArrowDraft(null);
    setPremoveDragFrom(null);
    setPendingConfirm(null);
  }, [snapshot.fen]);

  // Trigger the slide animation for a freshly played live move.
  useEffect(() => {
    const count = snapshot.moves.length;
    if (animate && snapshot.isLive && count === prevCount.current + 1 && count > 0) {
      const mv = snapshot.moves[count - 1];
      setAnim({ from: mv.from, to: mv.to, type: mv.promotion ?? mv.piece, color: mv.color });
      const t = setTimeout(() => setAnim(null), Math.round(170 * animScale));
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [snapshot.moves, snapshot.isLive, animate, animScale]);

  // Screen-reader announcements: one polite region per move, one assertive
  // region for game-over/whose-turn so a screen-reader user gets the same
  // information a sighted player reads off the board.
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const prevAnnounceCount = useRef(snapshot.moves.length);
  useEffect(() => {
    const count = snapshot.moves.length;
    if (count === prevAnnounceCount.current + 1 && count > 0) {
      const mv = snapshot.moves[count - 1];
      const mover = COLOR_NAMES[mv.color];
      const pieceName = PIECE_NAMES[mv.promotion ?? mv.piece];
      const captureText = mv.captured ? `, capturing ${COLOR_NAMES[mv.color === "w" ? "b" : "w"]} ${PIECE_NAMES[mv.captured]}` : "";
      const checkText = mv.san.includes("#") ? ", checkmate" : mv.san.includes("+") ? ", check" : "";
      const text = `${mover} ${pieceName} to ${mv.to}${captureText}${checkText}`;
      setMoveAnnouncement(text);
      if (speechAnnounceMoves && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    }
    prevAnnounceCount.current = count;
  }, [snapshot.moves, speechAnnounceMoves]);

  useEffect(() => {
    if (snapshot.status.over) {
      const outcome = snapshot.status.winner ? `${COLOR_NAMES[snapshot.status.winner]} wins` : "Draw";
      setStatusAnnouncement(`Game over. ${outcome}${snapshot.status.reason ? ` by ${snapshot.status.reason}` : ""}.`);
    } else if (snapshot.isLive) {
      setStatusAnnouncement(`${COLOR_NAMES[snapshot.turn]} to move${snapshot.check ? ", check" : ""}.`);
    }
  }, [snapshot.status, snapshot.turn, snapshot.check, snapshot.isLive]);

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

  // ---- Keyboard navigation (arrow keys move a cursor, Enter/Space activates it) ----
  const [cursor, setCursor] = useState<Square>("e4");
  const [boardFocused, setBoardFocused] = useState(false);

  const attemptMove = useCallback(
    (from: Square, to: Square) => {
      const options = legalMovesFrom(from).filter((mv) => mv.to === to);
      if (options.length === 0) return false;
      if (options.some((mv) => mv.promotion)) {
        if (autoQueen) {
          onMove(from, to, "q");
          return true;
        }
        setPromo({ from, to, color: options[0].color });
        return true;
      }
      onMove(from, to);
      return true;
    },
    [legalMovesFrom, onMove, autoQueen],
  );

  const onBoardKeyDown = (e: React.KeyboardEvent) => {
    if (promo) return; // let the promotion picker handle its own keys
    // Belt-and-suspenders alongside onFocus: some focus paths (programmatic
    // .focus(), certain automation/CDP-driven input) don't reliably fire a
    // React focus event even though the element genuinely has DOM focus —
    // receiving a keydown here is itself proof the board is the keyboard target.
    setBoardFocused(true);
    const { row, col } = squareToRowCol(cursor, orientation);
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const nr = e.key === "ArrowUp" ? Math.max(0, row - 1) : e.key === "ArrowDown" ? Math.min(7, row + 1) : row;
      const nc = e.key === "ArrowLeft" ? Math.max(0, col - 1) : e.key === "ArrowRight" ? Math.min(7, col + 1) : col;
      setCursor(rowColToSquare(nr, nc, orientation));
      return;
    }
    if (e.key === "Escape") {
      setSelected(null);
      setPremoveDragFrom(null);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const sq = cursor;
    const piece = pieceAt(sq);

    if (!selected && premove && sq === premove.from) {
      onCancelPremove?.();
      return;
    }
    if (selected && legalTargets.has(sq)) {
      if (confirmMove) {
        setPendingConfirm({ from: selected, to: sq });
        setSelected(null);
        return;
      }
      attemptMove(selected, sq);
      setSelected(null);
      return;
    }
    if (selected && premoveDragFrom === selected && sq !== selected) {
      onSetPremove?.(selected, sq);
      setSelected(null);
      setPremoveDragFrom(null);
      return;
    }
    if (selected === sq) {
      setSelected(null);
      return;
    }
    if (piece && canMove(piece.color)) {
      setSelected(sq);
      setPremoveDragFrom(null);
    } else if (piece && canPremove(piece.color)) {
      setSelected(sq);
      setPremoveDragFrom(sq);
    } else {
      setSelected(null);
      setPremoveDragFrom(null);
    }
  };

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
      rightStart.current = { square: sq, color: annotationColor(e, arrowColor) };
      return;
    }
    if (e.button !== 0) return;

    // Left click clears annotations
    setHighlights({});
    setArrows([]);

    const piece = pieceAt(sq);

    // Clicking a queued premove's origin square cancels it.
    if (!selected && premove && sq === premove.from) {
      onCancelPremove?.();
      return;
    }

    // A second click on the pending-confirm destination commits the move;
    // any other click cancels the pending confirmation.
    if (pendingConfirm) {
      const wasPendingTarget = sq === pendingConfirm.to;
      setPendingConfirm(null);
      if (wasPendingTarget) {
        attemptMove(pendingConfirm.from, pendingConfirm.to);
        setSelected(null);
        return;
      }
    }

    if (selected && legalTargets.has(sq) && moveInputMode !== "drag") {
      if (confirmMove) {
        setPendingConfirm({ from: selected, to: sq });
        setSelected(null);
        return;
      }
      attemptMove(selected, sq);
      setSelected(null);
      return;
    }

    // Premove destination click: `selected` was picked for a premove-eligible piece.
    if (selected && premoveDragFrom === selected && sq !== selected) {
      onSetPremove?.(selected, sq);
      setSelected(null);
      setPremoveDragFrom(null);
      return;
    }

    if (piece && canMove(piece.color)) {
      setSelected(sq);
      setPremoveDragFrom(null);
      if (moveInputMode !== "click") {
        const rect = boardRef.current!.getBoundingClientRect();
        boardRef.current!.setPointerCapture(e.pointerId);
        setDrag({ from: sq, piece, x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else if (piece && canPremove(piece.color)) {
      setSelected(sq);
      setPremoveDragFrom(sq);
      if (moveInputMode !== "click") {
        const rect = boardRef.current!.getBoundingClientRect();
        boardRef.current!.setPointerCapture(e.pointerId);
        setDrag({ from: sq, piece, x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      setSelected(null);
      setPremoveDragFrom(null);
      // No piece picked up here — this pointerdown is eligible to become a swipe gesture.
      if (e.pointerType !== "mouse" && (onSwipeBack || onSwipeForward)) {
        swipeStart.current = { x: e.clientX, y: e.clientY };
      }
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

    if (swipeStart.current) {
      const start = swipeStart.current;
      swipeStart.current = null;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) onSwipeBack?.();
        else onSwipeForward?.();
        return;
      }
    }

    if (!drag) return;
    const sq = squareFromEvent(e);
    const from = drag.from;
    setDrag(null);
    if (sq && sq !== from && legalTargets.has(sq)) {
      attemptMove(from, sq);
      setSelected(null);
      return;
    }
    if (sq && sq !== from && premoveDragFrom === from) {
      onSetPremove?.(from, sq);
      setSelected(null);
      setPremoveDragFrom(null);
      return;
    }
    // dropped back on the origin square: treated as a click-select; keep selection
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

  // Grouped by rank for ARIA row semantics — display:contents keeps these
  // wrapper divs out of the CSS Grid box tree so grid-cols-8/grid-rows-8
  // layout is unaffected, while a screen reader still sees proper rows.
  const squareRows = useMemo(() => {
    const rows: (typeof squares)[] = [];
    for (let r = 0; r < 8; r++) rows.push(squares.filter((s) => s.row === r));
    return rows;
  }, [squares]);

  // Labels for the "outside" coordinate style, derived from the same
  // orientation-aware `squares` list used for the grid so ordering always
  // matches what's rendered inside the board.
  const outsideFileLabels = useMemo(
    () => squares.filter((s) => s.row === 7).sort((a, b) => a.col - b.col).map((s) => s.square[0]),
    [squares],
  );
  const outsideRankLabels = useMemo(
    () => squares.filter((s) => s.col === 0).sort((a, b) => a.row - b.row).map((s) => s.square[1]),
    [squares],
  );

  const lastMove = highlightLastMove ? snapshot.lastMove : null;
  const hiddenSquare = drag?.from ?? anim?.to ?? null;

  const frameStyle: CSSProperties =
    boardFrame === "wood"
      ? { padding: "3.5%", background: "linear-gradient(155deg, #8a5a34, #5c3a1f)", borderRadius: 14 }
      : boardFrame === "minimal"
        ? { padding: "2px", background: effTheme.dark, borderRadius: 12 }
        : boardFrame === "shadow"
          ? { filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.55))" }
          : {};

  const showOutsideCoords = showCoordinates && coordinateStyle === "outside";

  return (
    <div style={{ width: `${zoomPercent}%`, maxWidth: "100%", margin: "0 auto", ...frameStyle }}>
    <div className="flex items-stretch" style={{ gap: showOutsideCoords ? "1.5%" : 0 }}>
      {showOutsideCoords && (
        <div className="flex shrink-0 flex-col" style={{ width: "min(2.4vw, 0.85rem)" }}>
          {outsideRankLabels.map((r) => (
            <div
              key={r}
              className="flex flex-1 items-center justify-center text-[min(2.4vw,0.72rem)] font-bold leading-none"
              style={{ color: "var(--text-faint)" }}
            >
              {r}
            </div>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
    <div
      ref={boardRef}
      className="relative w-full select-none rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
      style={{ aspectRatio: "1 / 1", touchAction: "none", cursor: drag ? "grabbing" : "default", outline: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={onBoardKeyDown}
      onFocus={() => setBoardFocused(true)}
      onBlur={() => setBoardFocused(false)}
      aria-label="Chess board. Use arrow keys to move the cursor, Enter or Space to select a piece and move it."
    >
      {/* Square grid: colours, coordinates, highlights, hints */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8" role="grid" aria-label="Chess board" aria-rowcount={8} aria-colcount={8}>
        {squareRows.map((rowSquares, rIdx) => (
          <div key={rIdx} role="row" style={{ display: "contents" }}>
            {rowSquares.map(({ square, light, row, col }) => {
              const bg = light ? effTheme.light : effTheme.dark;
              const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
              const isSel = selected === square;
              const isCheck = snapshot.checkedKingSquare === square;
              const isPremoveSq = premove && (premove.from === square || premove.to === square);
              const isPendingConfirmTarget = pendingConfirm?.to === square;
              const isKeyboardCursor = boardFocused && cursor === square;
              const hl = highlights[square];
              const target = legalTargets.get(square);
              const showFile = showCoordinates && coordinateStyle === "inside" && row === 7;
              const showRank = showCoordinates && coordinateStyle === "inside" && col === 0;
              const labelColor = light ? effTheme.labelOnLight : effTheme.labelOnDark;
              return (
                <div
                  key={square}
                  className="relative"
                  style={{ background: bg }}
                  role="gridcell"
                  aria-label={squareAriaLabel(square, pieceAt(square), isCheck)}
                >
              {isLast && <div className="absolute inset-0" style={{ background: effTheme.lastMove }} />}
              {isSel && <div className="absolute inset-0" style={{ background: effTheme.selected }} />}
              {isPremoveSq && <div className="absolute inset-0" style={{ background: "rgba(90,140,220,0.4)" }} />}
              {isPendingConfirmTarget && (
                <div className="absolute inset-[8%] rounded-md" style={{ boxShadow: "inset 0 0 0 0.18rem var(--accent)" }} />
              )}
              {isKeyboardCursor && (
                <div className="absolute inset-[4%] rounded-md pointer-events-none" style={{ boxShadow: "inset 0 0 0 0.15rem var(--info)" }} />
              )}
              {isCheck && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${effTheme.check} 0%, rgba(229,75,60,0.35) 45%, transparent 72%)`,
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
                      style={{ boxShadow: `inset 0 0 0 0.35rem ${effTheme.hint}` }}
                    />
                  ) : (
                    <div className="rounded-full" style={{ width: "30%", height: "30%", background: effTheme.hint }} />
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
        ))}
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
              transform: pieceSizePercent !== 100 ? `scale(${pieceSizePercent / 100})` : undefined,
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
          durationMs={Math.round(150 * animScale)}
          pieceSizePercent={pieceSizePercent}
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
            transform: `translate(-50%, -50%) scale(${1.08 * (pieceSizePercent / 100)})`,
            zIndex: 30,
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))",
          }}
        >
          <Piece type={drag.piece.type} color={drag.piece.color} set={pieceSet} />
        </div>
      )}

      {/* Premove ghost piece preview at the queued destination */}
      {premove &&
        (() => {
          const p = pieceAt(premove.from);
          if (!p) return null;
          const { x, y } = squareToPercent(premove.to, orientation);
          return (
            <div
              className="absolute pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%`, width: "12.5%", height: "12.5%", opacity: 0.55, zIndex: 2 }}
            >
              <Piece type={p.type} color={p.color} set={pieceSet} />
            </div>
          );
        })()}

      {/* Arrows */}
      <ArrowLayer
        arrows={[
          ...extraArrows,
          ...(premove ? [{ from: premove.from, to: premove.to, color: "rgba(90,140,220,0.9)" }] : []),
          ...arrows,
          ...(arrowDraft ? [arrowDraft] : []),
        ]}
        orientation={orientation}
      />

      {/* Promotion picker */}
      {promo && (
        <PromotionPicker
          promo={promo}
          orientation={orientation}
          pieceSet={pieceSet}
          theme={effTheme}
          onSelect={(piece) => {
            const { from, to } = promo;
            setPromo(null);
            setSelected(null);
            onMove(from, to, piece);
          }}
          onCancel={() => setPromo(null)}
        />
      )}

      {/* Screen-reader-only announcements — visually hidden, read by assistive tech */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {moveAnnouncement}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {statusAnnouncement}
      </div>
    </div>
      {showOutsideCoords && (
        <div className="flex" style={{ marginTop: "2%" }}>
          {outsideFileLabels.map((f) => (
            <div
              key={f}
              className="flex-1 text-center text-[min(2.4vw,0.72rem)] font-bold leading-none"
              style={{ color: "var(--text-faint)" }}
            >
              {f}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
    </div>
  );
}

function SlidePiece({
  anim,
  orientation,
  pieceSet,
  durationMs,
  pieceSizePercent,
}: {
  anim: { from: Square; to: Square; type: PieceSymbol; color: Color };
  orientation: Color;
  pieceSet: PieceSetId;
  durationMs: number;
  pieceSizePercent: number;
}) {
  const to = squareToPercent(anim.to, orientation);
  const from = squareToPercent(anim.from, orientation);
  // delta expressed in units of the element's own size (1 square = 100%)
  const dx = ((from.x - to.x) / 12.5) * 100;
  const dy = ((from.y - to.y) / 12.5) * 100;
  const scale = pieceSizePercent !== 100 ? ` scale(${pieceSizePercent / 100})` : "";
  const [t, setT] = useState(`translate(${dx}%, ${dy}%)${scale}`);
  useEffect(() => {
    const id = requestAnimationFrame(() => setT(`translate(0%, 0%)${scale}`));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        transition: `transform ${durationMs}ms ease-out`,
        zIndex: 3,
      }}
    >
      <Piece type={anim.type} color={anim.color} set={pieceSet} />
    </div>
  );
}
