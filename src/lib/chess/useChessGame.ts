"use client";

import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface GameStatus {
  over: boolean;
  result?: "1-0" | "0-1" | "1/2-1/2";
  reason?: string;
  winner?: Color;
}

export interface CapturedInfo {
  /** black pieces captured by White */
  byWhite: PieceSymbol[];
  /** white pieces captured by Black */
  byBlack: PieceSymbol[];
  /** positive => White is ahead by this many points */
  materialDiff: number;
}

export interface GameSnapshot {
  fen: string;
  board: ReturnType<Chess["board"]>;
  turn: Color;
  moves: Move[];
  viewPly: number;
  isLive: boolean;
  lastMove: { from: Square; to: Square } | null;
  check: boolean;
  checkedKingSquare: Square | null;
  status: GameStatus;
  captured: CapturedInfo;
}

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

function computeStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) {
    const loser = game.turn();
    return {
      over: true,
      result: loser === "w" ? "0-1" : "1-0",
      winner: loser === "w" ? "b" : "w",
      reason: "Checkmate",
    };
  }
  if (game.isStalemate()) return { over: true, result: "1/2-1/2", reason: "Stalemate" };
  if (game.isInsufficientMaterial())
    return { over: true, result: "1/2-1/2", reason: "Insufficient material" };
  if (game.isThreefoldRepetition())
    return { over: true, result: "1/2-1/2", reason: "Threefold repetition" };
  if (game.isDraw()) return { over: true, result: "1/2-1/2", reason: "50-move rule" };
  return { over: false };
}

function computeCaptured(game: Chess): CapturedInfo {
  const counts: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq) counts[sq.color][sq.type] += 1;
    }
  }
  const byWhite: PieceSymbol[] = []; // black pieces missing
  const byBlack: PieceSymbol[] = []; // white pieces missing
  let diff = 0;
  (Object.keys(START_COUNT) as PieceSymbol[]).forEach((t) => {
    const missingBlack = START_COUNT[t] - counts.b[t];
    const missingWhite = START_COUNT[t] - counts.w[t];
    for (let i = 0; i < missingBlack; i++) byWhite.push(t);
    for (let i = 0; i < missingWhite; i++) byBlack.push(t);
    diff += (counts.w[t] - counts.b[t]) * PIECE_VALUE[t];
  });
  const order: PieceSymbol[] = ["q", "r", "b", "n", "p"];
  const sort = (a: PieceSymbol, b: PieceSymbol) => order.indexOf(a) - order.indexOf(b);
  byWhite.sort(sort);
  byBlack.sort(sort);
  return { byWhite, byBlack, materialDiff: diff };
}

function findKing(game: Chess, color: Color): Square | null {
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type === "k" && sq.color === color) return sq.square;
    }
  }
  return null;
}

/** Build a Chess instance replaying `ply` moves from the mainline. */
function rebuildAt(startFen: string, moves: Move[], ply: number): Chess {
  const g = new Chess(startFen);
  // clamp: transient renders can briefly hold a viewPly from a previous game
  const n = Math.min(ply, moves.length);
  for (let i = 0; i < n; i++) {
    g.move({ from: moves[i].from, to: moves[i].to, promotion: moves[i].promotion });
  }
  return g;
}

export interface UseChessGame {
  snapshot: GameSnapshot;
  makeMove: (m: { from: Square; to: Square; promotion?: PieceSymbol }) => Move | null;
  legalMovesFrom: (sq: Square) => Move[];
  goToPly: (ply: number) => void;
  stepBack: () => void;
  stepForward: () => void;
  goStart: () => void;
  goLive: () => void;
  undo: () => void;
  reset: (fen?: string) => void;
  loadFen: (fen: string) => boolean;
  loadPgn: (pgn: string) => boolean;
  getPgn: () => string;
  getFen: () => string;
}

export function useChessGame(initialFen: string = START_FEN): UseChessGame {
  const gameRef = useRef<Chess>(new Chess(initialFen));
  const startFenRef = useRef<string>(initialFen);
  const [viewPly, setViewPly] = useState<number>(0);
  // Version counter: bumped whenever the underlying Chess instance mutates in
  // a way viewPly alone doesn't capture (loadFen/loadPgn/reset/undo).
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const snapshot = useMemo<GameSnapshot>(() => {
    const game = gameRef.current;
    const moves = game.history({ verbose: true }) as Move[];
    const ply = Math.min(viewPly, moves.length);
    const view = ply === moves.length ? game : rebuildAt(startFenRef.current, moves, ply);
    const isLive = ply === moves.length;
    const last = ply > 0 ? moves[ply - 1] : null;
    const check = view.isCheck();
    return {
      fen: view.fen(),
      board: view.board(),
      turn: view.turn(),
      moves,
      viewPly: ply,
      isLive,
      lastMove: last ? { from: last.from, to: last.to } : null,
      check,
      checkedKingSquare: check ? findKing(view, view.turn()) : null,
      status: isLive ? computeStatus(game) : { over: false },
      captured: computeCaptured(view),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPly, version]);

  const makeMove = useCallback<UseChessGame["makeMove"]>(
    ({ from, to, promotion }) => {
      const game = gameRef.current;
      const moves = game.history({ verbose: true }) as Move[];
      // If viewing history, truncate the mainline to the viewed ply (branch).
      if (viewPly < moves.length) {
        gameRef.current = rebuildAt(startFenRef.current, moves, viewPly);
      }
      try {
        const move = gameRef.current.move({ from, to, promotion });
        setViewPly(gameRef.current.history().length);
        bump();
        return move;
      } catch {
        return null;
      }
    },
    [viewPly, bump],
  );

  const legalMovesFrom = useCallback(
    (sq: Square): Move[] => {
      const game = gameRef.current;
      const moves = game.history({ verbose: true }) as Move[];
      const ply = Math.min(viewPly, moves.length);
      const src = ply === moves.length ? game : rebuildAt(startFenRef.current, moves, ply);
      try {
        return src.moves({ square: sq, verbose: true }) as Move[];
      } catch {
        return [];
      }
    },
    [viewPly],
  );

  const goToPly = useCallback((ply: number) => {
    const len = gameRef.current.history().length;
    setViewPly(Math.max(0, Math.min(ply, len)));
  }, []);
  const stepBack = useCallback(() => setViewPly((p) => Math.max(0, p - 1)), []);
  const stepForward = useCallback(
    () => setViewPly((p) => Math.min(gameRef.current.history().length, p + 1)),
    [],
  );
  const goStart = useCallback(() => setViewPly(0), []);
  const goLive = useCallback(() => setViewPly(gameRef.current.history().length), []);

  const undo = useCallback(() => {
    gameRef.current.undo();
    setViewPly(gameRef.current.history().length);
    bump();
  }, [bump]);

  const reset = useCallback(
    (fen: string = START_FEN) => {
      startFenRef.current = fen;
      gameRef.current = new Chess(fen);
      setViewPly(0);
      bump();
    },
    [bump],
  );

  const loadFen = useCallback(
    (fen: string): boolean => {
      try {
        const g = new Chess(fen);
        startFenRef.current = g.fen();
        gameRef.current = g;
        setViewPly(0);
        bump();
        return true;
      } catch {
        return false;
      }
    },
    [bump],
  );

  const loadPgn = useCallback(
    (pgn: string): boolean => {
      try {
        const g = new Chess();
        g.loadPgn(pgn);
        startFenRef.current = START_FEN;
        gameRef.current = g;
        setViewPly(g.history().length);
        bump();
        return true;
      } catch {
        return false;
      }
    },
    [bump],
  );

  const getPgn = useCallback(() => gameRef.current.pgn(), []);
  const getFen = useCallback(() => gameRef.current.fen(), []);

  return {
    snapshot,
    makeMove,
    legalMovesFrom,
    goToPly,
    stepBack,
    stepForward,
    goStart,
    goLive,
    undo,
    reset,
    loadFen,
    loadPgn,
    getPgn,
    getFen,
  };
}
