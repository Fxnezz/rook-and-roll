import { Chess, type Color, type Move, type PieceSymbol } from "chess.js";
import type { EngineLine, GoResult } from "./stockfish";

const MATE = 100_000;
const INF = 1_000_000;
const PIECE_VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };

type SearchOptions = {
  depth: number;
  multipv: number;
  movetime?: number;
  skill: number;
};

type SearchContext = {
  startedAt: number;
  deadline: number;
  nodes: number;
  skill: number;
  stopped: boolean;
  table: Map<string, TableEntry>;
  killers: Map<number, [string?, string?]>;
  history: Map<string, number>;
};

type TableEntry = {
  depth: number;
  score: number;
  flag: "exact" | "lower" | "upper";
  bestMove?: string;
};

type RootLine = { move: string; score: number; pv: string[] };

class SearchTimeout extends Error {}

const START_KEY = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
function buildOpeningBook() {
  const book: Record<string, string[]> = { [START_KEY]: ["e2e4", "d2d4", "g1f3", "c2c4"] };
  const add = (moves: string[], replies: string[]) => {
    const game = new Chess();
    for (const move of moves) game.move({ from: move.slice(0, 2) as never, to: move.slice(2, 4) as never, promotion: move[4] as PieceSymbol | undefined });
    book[positionKey(game)] = replies;
  };
  add(["e2e4"], ["e7e5", "c7c5", "e7e6", "c7c6"]);
  add(["d2d4"], ["g8f6", "d7d5", "e7e6"]);
  add(["c2c4"], ["e7e5", "g8f6", "c7c5"]);
  add(["g1f3"], ["d7d5", "g8f6", "c7c5"]);
  add(["e2e4", "e7e5"], ["g1f3", "f1c4", "b1c3"]);
  add(["e2e4", "c7c5"], ["g1f3", "b1c3", "c2c3"]);
  add(["d2d4", "g8f6"], ["c2c4", "g1f3", "c1f4"]);
  add(["d2d4", "d7d5"], ["c2c4", "g1f3", "c1f4"]);
  add(["e2e4", "e7e5", "g1f3"], ["b8c6", "g8f6"]);
  add(["e2e4", "c7c5", "g1f3"], ["d7d6", "b8c6", "e7e6"]);
  add(["d2d4", "g8f6", "c2c4"], ["e7e6", "g7g6", "c7c5"]);
  return book;
}

const OPENING_BOOK = buildOpeningBook();

function uci(move: Move) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

function positionKey(game: Chess) {
  return game.fen().split(" ").slice(0, 4).join(" ");
}

function hashNoise(hash: string) {
  let value = 2166136261;
  for (let index = 0; index < hash.length; index++) {
    value ^= hash.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 2001) / 1000 - 1;
}

function pieceSquare(type: PieceSymbol, color: Color, row: number, file: number, endgame: boolean) {
  const rankFromHome = color === "w" ? 6 - row : row - 1;
  const centerDistance = Math.abs(file - 3.5) + Math.abs(row - 3.5);
  switch (type) {
    case "p":
      return rankFromHome * 9 + (file >= 2 && file <= 5 ? 8 : 0) - Math.abs(file - 3.5) * 2;
    case "n":
      return Math.round(34 - centerDistance * 10);
    case "b":
      return Math.round(24 - centerDistance * 5 + rankFromHome * 2);
    case "r":
      return rankFromHome === 5 ? 18 : rankFromHome * 2;
    case "q":
      return Math.round(10 - centerDistance * 2);
    case "k":
      return endgame ? Math.round(42 - centerDistance * 10) : (rankFromHome <= 1 ? 18 : -rankFromHome * 12);
  }
}

/** Original Sam Core evaluation, always returned from White's perspective. */
function evaluateWhite(game: Chess) {
  const board = game.board();
  const pawns: Record<Color, { row: number; file: number }[]> = { w: [], b: [] };
  const bishops: Record<Color, number> = { w: 0, b: 0 };
  const rooks: { color: Color; file: number }[] = [];
  const kings: Partial<Record<Color, { row: number; file: number }>> = {};
  const pieces: Record<Color, { type: PieceSymbol; row: number; file: number }[]> = { w: [], b: [] };
  let nonPawnMaterial = 0;

  for (let row = 0; row < 8; row++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[row][file];
      if (!piece) continue;
      if (piece.type !== "p" && piece.type !== "k") nonPawnMaterial += PIECE_VALUE[piece.type];
      if (piece.type === "p") pawns[piece.color].push({ row, file });
      if (piece.type === "b") bishops[piece.color] += 1;
      if (piece.type === "r") rooks.push({ color: piece.color, file });
      if (piece.type === "k") kings[piece.color] = { row, file };
      pieces[piece.color].push({ type: piece.type, row, file });
    }
  }

  const endgame = nonPawnMaterial <= 2600;
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[row][file];
      if (!piece) continue;
      const sign = piece.color === "w" ? 1 : -1;
      score += sign * (PIECE_VALUE[piece.type] + pieceSquare(piece.type, piece.color, row, file, endgame));
    }
  }

  for (const color of ["w", "b"] as Color[]) {
    const sign = color === "w" ? 1 : -1;
    const ownPawns = pawns[color];
    const enemyPawns = pawns[color === "w" ? "b" : "w"];
    const fileCounts = Array<number>(8).fill(0);
    for (const pawn of ownPawns) fileCounts[pawn.file] += 1;
    for (const count of fileCounts) if (count > 1) score -= sign * (count - 1) * 16;
    for (const pawn of ownPawns) {
      const isolated = [pawn.file - 1, pawn.file + 1].every((file) => file < 0 || file > 7 || fileCounts[file] === 0);
      if (isolated) score -= sign * 13;
      const passed = enemyPawns.every((enemy) => {
        if (Math.abs(enemy.file - pawn.file) > 1) return true;
        return color === "w" ? enemy.row >= pawn.row : enemy.row <= pawn.row;
      });
      if (passed) {
        const advance = color === "w" ? 6 - pawn.row : pawn.row - 1;
        score += sign * (18 + Math.max(0, advance) * 13);
      }
    }
    if (bishops[color] >= 2) score += sign * 28;

    // Connected pawns, space, development, and coordinated pieces make Sam
    // Core much less material-greedy than the first version.
    for (const pawn of ownPawns) {
      const connected = ownPawns.some((other) => Math.abs(other.file - pawn.file) === 1 && Math.abs(other.row - pawn.row) <= 1);
      if (connected) score += sign * 5;
      const advance = color === "w" ? 6 - pawn.row : pawn.row - 1;
      if (pawn.file >= 2 && pawn.file <= 5 && advance >= 2) score += sign * (4 + advance * 2);
    }
    const homeRow = color === "w" ? 7 : 0;
    const developedMinors = pieces[color].filter((piece) => (piece.type === "n" || piece.type === "b") && piece.row !== homeRow).length;
    score += sign * developedMinors * 9;
    const queen = pieces[color].find((piece) => piece.type === "q");
    if (queen && queen.row !== homeRow && developedMinors < 2 && !endgame) score -= sign * 16;

    const king = kings[color];
    if (king && !endgame) {
      const shieldRow = king.row + (color === "w" ? -1 : 1);
      let shield = 0;
      for (const file of [king.file - 1, king.file, king.file + 1]) {
        if (file >= 0 && file < 8 && shieldRow >= 0 && shieldRow < 8) {
          const piece = board[shieldRow][file];
          if (piece?.type === "p" && piece.color === color) shield += 1;
        }
      }
      score += sign * shield * 12;
      if (king.file === 2 || king.file === 6) score += sign * 18;
    }
  }

  for (const rook of rooks) {
    const sign = rook.color === "w" ? 1 : -1;
    const ownPawn = pawns[rook.color].some((pawn) => pawn.file === rook.file);
    const enemyPawn = pawns[rook.color === "w" ? "b" : "w"].some((pawn) => pawn.file === rook.file);
    if (!ownPawn) score += sign * (enemyPawn ? 12 : 24);
    const seventhRow = rook.color === "w" ? 1 : 6;
    if (pieces[rook.color].some((piece) => piece.type === "r" && piece.file === rook.file && piece.row === seventhRow)) score += sign * 18;
  }

  return score + (game.turn() === "w" ? 10 : -10);
}

function staticScore(game: Chess, skill: number) {
  let whiteScore = evaluateWhite(game);
  if (skill < 20) whiteScore += hashNoise(game.hash()) * (20 - skill) * 11;
  return (game.turn() === "w" ? 1 : -1) * whiteScore;
}

function checkTime(context: SearchContext) {
  context.nodes += 1;
  if ((context.nodes & 255) === 0 && (context.stopped || performance.now() >= context.deadline)) throw new SearchTimeout();
}

function terminalScore(game: Chess, ply: number) {
  if (game.isCheckmate()) return -MATE + ply;
  if (game.isDraw()) return 0;
  return null;
}

function moveOrderScore(move: Move, ttMove: string | undefined, ply: number, context: SearchContext) {
  const moveUci = uci(move);
  if (moveUci === ttMove) return 2_000_000;
  let score = 0;
  if (move.captured) score += 1_000_000 + PIECE_VALUE[move.captured] * 16 - PIECE_VALUE[move.piece];
  if (move.promotion) score += 800_000 + PIECE_VALUE[move.promotion];
  if (move.san.includes("+")) score += 60_000;
  if (move.isKingsideCastle() || move.isQueensideCastle()) score += 20_000;
  const killers = context.killers.get(ply);
  if (moveUci === killers?.[0]) score += 45_000;
  else if (moveUci === killers?.[1]) score += 35_000;
  score += context.history.get(moveUci) ?? 0;
  return score;
}

function orderedMoves(game: Chess, ttMove: string | undefined, ply: number, context: SearchContext, capturesOnly = false) {
  const moves = game.moves({ verbose: true }).filter((move) => !capturesOnly || move.isCapture() || move.isPromotion());
  return moves.sort((a, b) => moveOrderScore(b, ttMove, ply, context) - moveOrderScore(a, ttMove, ply, context));
}

function rememberQuietCutoff(move: Move, ply: number, depth: number, context: SearchContext) {
  if (move.isCapture() || move.isPromotion()) return;
  const moveUci = uci(move);
  const killers = context.killers.get(ply) ?? [];
  if (killers[0] !== moveUci) context.killers.set(ply, [moveUci, killers[0]]);
  context.history.set(moveUci, Math.min(200_000, (context.history.get(moveUci) ?? 0) + depth * depth * 16));
}

function quiescence(game: Chess, alpha: number, beta: number, ply: number, remaining: number, context: SearchContext): number {
  checkTime(context);
  const terminal = terminalScore(game, ply);
  if (terminal != null) return terminal;

  const inCheck = game.isCheck();
  const standPat = staticScore(game, context.skill);
  if (!inCheck) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  }
  if (remaining <= 0) return inCheck ? standPat - 35 : alpha;

  const moves = orderedMoves(game, undefined, ply, context, !inCheck);
  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
    const score = -quiescence(game, -beta, -alpha, ply + 1, remaining - 1, context);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number, ply: number, context: SearchContext): number {
  checkTime(context);
  const terminal = terminalScore(game, ply);
  if (terminal != null) return terminal;
  if (depth <= 0) return quiescence(game, alpha, beta, ply, 4, context);

  const key = game.hash();
  const cached = context.table.get(key);
  const originalAlpha = alpha;
  if (cached && cached.depth >= depth) {
    if (cached.flag === "exact") return cached.score;
    if (cached.flag === "lower") alpha = Math.max(alpha, cached.score);
    if (cached.flag === "upper") beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  let bestScore = -INF;
  let bestMove: string | undefined;
  const moves = orderedMoves(game, cached?.bestMove, ply, context);
  for (let index = 0; index < moves.length; index++) {
    const move = moves[index];
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
    const forcing = move.isCapture() || move.isPromotion() || game.isCheck();
    const extension = game.isCheck() && depth >= 2 && ply < 8 ? 1 : 0;
    const fullDepth = depth - 1 + extension;
    let score: number;
    if (index === 0) {
      score = -negamax(game, fullDepth, -beta, -alpha, ply + 1, context);
    } else {
      const reduction = !forcing && depth >= 4 && index >= 4 ? 1 : 0;
      score = -negamax(game, Math.max(0, fullDepth - reduction), -alpha - 1, -alpha, ply + 1, context);
      if (score > alpha && (reduction > 0 || score < beta)) {
        score = -negamax(game, fullDepth, -beta, -alpha, ply + 1, context);
      }
    }
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = uci(move);
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      rememberQuietCutoff(move, ply, depth, context);
      break;
    }
  }

  const flag: TableEntry["flag"] = bestScore <= originalAlpha ? "upper" : bestScore >= beta ? "lower" : "exact";
  if (context.table.size > 180_000) context.table.clear();
  context.table.set(key, { depth, score: bestScore, flag, bestMove });
  return bestScore;
}

function extractPv(fen: string, firstMove: string, depth: number, table: Map<string, TableEntry>) {
  const game = new Chess(fen);
  const pv = [firstMove];
  const play = (moveUci: string) => game.move({ from: moveUci.slice(0, 2) as never, to: moveUci.slice(2, 4) as never, promotion: moveUci[4] as PieceSymbol | undefined });
  try {
    play(firstMove);
    for (let ply = 1; ply < depth; ply++) {
      const next = table.get(game.hash())?.bestMove;
      if (!next) break;
      play(next);
      pv.push(next);
    }
  } catch {
    return [firstMove];
  }
  return pv;
}

function searchRoot(game: Chess, depth: number, context: SearchContext): RootLine[] {
  const moves = orderedMoves(game, undefined, 0, context);
  const lines: RootLine[] = [];
  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion });
    const score = -negamax(game, depth - 1, -INF, INF, 1, context);
    game.undo();
    const moveUci = uci(move);
    lines.push({ move: moveUci, score, pv: extractPv(game.fen(), moveUci, depth, context.table) });
  }
  return lines.sort((a, b) => b.score - a.score);
}

function mateDistance(score: number) {
  if (Math.abs(score) < MATE - 1000) return null;
  const plies = Math.max(1, MATE - Math.abs(score));
  return (score >= 0 ? 1 : -1) * Math.ceil(plies / 2);
}

function toEngineLine(line: RootLine, depth: number): EngineLine {
  const mate = mateDistance(line.score);
  return {
    move: line.move,
    cp: mate == null ? Math.round(line.score) : null,
    mate,
    pv: line.pv,
    depth,
  };
}

function bookResult(fen: string, multipv: number): GoResult | null {
  const moves = OPENING_BOOK[positionKey(new Chess(fen))];
  if (!moves) return null;
  const legal = new Set(new Chess(fen).moves({ verbose: true }).map(uci));
  const lines = moves.filter((move) => legal.has(move)).slice(0, multipv).map((move, index) => ({ move, cp: 24 - index * 7, mate: null, pv: [move], depth: 0 }));
  if (!lines.length) return null;
  return { bestmove: lines[0].move, lines };
}

export function searchSamCore(fen: string, options: SearchOptions): GoResult {
  const targetDepth = Math.max(1, Math.min(10, Math.round(options.depth)));
  const skill = Math.max(0, Math.min(20, Math.round(options.skill)));
  const effectiveDepth = Math.max(1, targetDepth - Math.floor((20 - skill) / 6));
  const multipv = Math.max(1, Math.min(5, Math.round(options.multipv)));
  const book = bookResult(fen, multipv);
  if (book) return book;

  const startedAt = performance.now();
  const budget = options.movetime ?? Math.min(8500, 300 + effectiveDepth * 650);
  const context: SearchContext = {
    startedAt,
    deadline: startedAt + Math.max(100, budget),
    nodes: 0,
    skill,
    stopped: false,
    table: new Map(),
    killers: new Map(),
    history: new Map(),
  };
  const game = new Chess(fen);
  let completed: RootLine[] = [];
  let reachedDepth = 0;

  for (let depth = 1; depth <= effectiveDepth; depth++) {
    try {
      const iteration = searchRoot(game, depth, context);
      if (iteration.length) {
        completed = iteration;
        reachedDepth = depth;
      }
    } catch (error) {
      if (error instanceof SearchTimeout) break;
      throw error;
    }
  }

  if (!completed.length) {
    const fallback = game.moves({ verbose: true })[0];
    if (!fallback) return { bestmove: "(none)", lines: [] };
    completed = [{ move: uci(fallback), score: staticScore(game, skill), pv: [uci(fallback)] }];
  }
  const lines = completed.slice(0, multipv).map((line) => toEngineLine(line, reachedDepth));
  return { bestmove: lines[0].move, lines };
}
