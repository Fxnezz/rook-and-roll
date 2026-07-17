export type VariantColor = "w" | "b";
export type StandardKind = "p" | "n" | "b" | "r" | "q" | "k";
export type FantasyKind = "d" | "a" | "c" | "w";
export type VariantPieceKind = StandardKind | FantasyKind;
export type VariantId = "chess960" | "dragon" | "archon" | "knightmare" | "custom";

export type VariantPiece = { color: VariantColor; kind: VariantPieceKind };
export type VariantMove = { from: number; to: number; promotion?: VariantPieceKind; castle?: "king" | "queen"; enPassant?: boolean };
export type CastleSide = { kingStart: number; kingRook: number; queenRook: number; king: boolean; queen: boolean };
export type VariantState = {
  board: (VariantPiece | null)[];
  turn: VariantColor;
  variant: VariantId;
  crown: Record<VariantColor, VariantPieceKind>;
  castling: Record<VariantColor, CastleSide>;
  enPassant: number | null;
  lastMove: VariantMove | null;
  moves: string[];
  winner: VariantColor | "draw" | null;
};

export const VARIANT_PRESETS: { id: VariantId; name: string; icon: string; blurb: string; rules: string }[] = [
  { id: "chess960", name: "Chess960", icon: "⑨", blurb: "A fresh legal back rank every game.", rules: "Bishops start on opposite colours, the king begins between the rooks, and castling lands on the familiar c/d or g/f squares." },
  { id: "dragon", name: "Dragon Chess", icon: "🐉", blurb: "Queens become mighty Dragons.", rules: "The Dragon combines queen and knight movement. Normal check, checkmate, castling, and promotion rules still apply." },
  { id: "archon", name: "Archon Guard", icon: "⚜", blurb: "Compound pieces guard the royals.", rules: "Archbishops combine bishop and knight movement. Chancellors combine rook and knight movement." },
  { id: "knightmare", name: "Knightmare", icon: "✦", blurb: "Wizards bend the diagonals.", rules: "Wizards move like bishops and may also leap three squares by one, creating unusual forks and attacks." },
  { id: "custom", name: "Custom Forge", icon: "⚒", blurb: "Choose each army's crown piece.", rules: "Build asymmetric armies with a Queen, Dragon, Archbishop, Chancellor, or Wizard as each side's crown piece." },
];

export const FANTASY_PIECE_NAMES: Record<VariantPieceKind, string> = {
  p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King",
  d: "Dragon", a: "Archbishop", c: "Chancellor", w: "Wizard",
};

const VALUE: Record<VariantPieceKind, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20_000, a: 760, c: 820, w: 680, d: 1250 };
const FILES = "abcdefgh";

function row(index: number) { return Math.floor(index / 8); }
function col(index: number) { return index % 8; }
function at(r: number, c: number) { return r * 8 + c; }
function inside(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function other(color: VariantColor): VariantColor { return color === "w" ? "b" : "w"; }
export function variantSquare(index: number) { return `${FILES[col(index)]}${8 - row(index)}`; }

function shuffled<T>(items: T[], rng: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const pick = Math.floor(rng() * (index + 1));
    [result[index], result[pick]] = [result[pick], result[index]];
  }
  return result;
}

export function chess960BackRank(rng: () => number = Math.random): VariantPieceKind[] {
  const rank = Array<VariantPieceKind | null>(8).fill(null);
  const dark = [0, 2, 4, 6][Math.floor(rng() * 4)];
  const light = [1, 3, 5, 7][Math.floor(rng() * 4)];
  rank[dark] = "b";
  rank[light] = "b";
  const openAfterBishops = rank.map((piece, index) => piece ? -1 : index).filter((index) => index >= 0);
  rank[openAfterBishops[Math.floor(rng() * openAfterBishops.length)]] = "q";
  const openAfterQueen = rank.map((piece, index) => piece ? -1 : index).filter((index) => index >= 0);
  for (const knightFile of shuffled(openAfterQueen, rng).slice(0, 2)) rank[knightFile] = "n";
  const remaining = rank.map((piece, index) => piece ? -1 : index).filter((index) => index >= 0).sort((a, b) => a - b);
  rank[remaining[0]] = "r";
  rank[remaining[1]] = "k";
  rank[remaining[2]] = "r";
  return rank as VariantPieceKind[];
}

function presetBackRank(variant: VariantId, crown: VariantPieceKind, rng: () => number) {
  if (variant === "chess960") return chess960BackRank(rng);
  if (variant === "dragon") return ["r", "n", "b", "d", "k", "b", "n", "r"] as VariantPieceKind[];
  if (variant === "archon") return ["c", "n", "a", "q", "k", "a", "n", "c"] as VariantPieceKind[];
  if (variant === "knightmare") return ["r", "w", "n", "q", "k", "n", "w", "r"] as VariantPieceKind[];
  return ["r", "n", "b", crown, "k", "b", "n", "r"] as VariantPieceKind[];
}

function castleInfo(backRank: VariantPieceKind[], color: VariantColor): CastleSide {
  const base = color === "w" ? 56 : 0;
  const kingFile = backRank.indexOf("k");
  const rookFiles = backRank.map((piece, file) => piece === "r" ? file : -1).filter((file) => file >= 0);
  return {
    kingStart: base + kingFile,
    queenRook: base + (rookFiles.filter((file) => file < kingFile).at(-1) ?? 0),
    kingRook: base + (rookFiles.find((file) => file > kingFile) ?? 7),
    king: true,
    queen: true,
  };
}

export function createVariantState(
  variant: VariantId,
  crowns: Partial<Record<VariantColor, VariantPieceKind>> = {},
  rng: () => number = Math.random,
): VariantState {
  const standardCrown: VariantPieceKind = variant === "dragon" ? "d" : "q";
  const crown: Record<VariantColor, VariantPieceKind> = variant === "custom"
    ? { w: crowns.w ?? "q", b: crowns.b ?? "q" }
    : { w: standardCrown, b: standardCrown };
  const whiteRank = presetBackRank(variant, crown.w, rng);
  const blackRank = variant === "custom" ? presetBackRank(variant, crown.b, rng) : [...whiteRank];
  const board: (VariantPiece | null)[] = Array(64).fill(null);
  blackRank.forEach((kind, file) => { board[file] = { color: "b", kind }; });
  whiteRank.forEach((kind, file) => { board[56 + file] = { color: "w", kind }; });
  for (let file = 0; file < 8; file++) {
    board[8 + file] = { color: "b", kind: "p" };
    board[48 + file] = { color: "w", kind: "p" };
  }
  return {
    board, turn: "w", variant, crown,
    castling: { w: castleInfo(whiteRank, "w"), b: castleInfo(blackRank, "b") }, enPassant: null,
    lastMove: null, moves: [], winner: null,
  };
}

const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CAMEL_STEPS = [[-3, -1], [-3, 1], [-1, -3], [-1, 3], [1, -3], [1, 3], [3, -1], [3, 1]];

function pushStepMoves(state: VariantState, from: number, color: VariantColor, steps: number[][], output: VariantMove[]) {
  for (const [dr, dc] of steps) {
    const r = row(from) + dr;
    const c = col(from) + dc;
    if (!inside(r, c)) continue;
    const target = state.board[at(r, c)];
    if (!target || target.color !== color) output.push({ from, to: at(r, c) });
  }
}

function pushSlidingMoves(state: VariantState, from: number, color: VariantColor, dirs: number[][], output: VariantMove[]) {
  for (const [dr, dc] of dirs) {
    let r = row(from) + dr;
    let c = col(from) + dc;
    while (inside(r, c)) {
      const target = state.board[at(r, c)];
      if (!target) output.push({ from, to: at(r, c) });
      else {
        if (target.color !== color) output.push({ from, to: at(r, c) });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function pseudoMoves(state: VariantState, from: number, attacksOnly = false): VariantMove[] {
  const piece = state.board[from];
  if (!piece) return [];
  const output: VariantMove[] = [];
  if (piece.kind === "p") {
    const direction = piece.color === "w" ? -1 : 1;
    const startRow = piece.color === "w" ? 6 : 1;
    const promotionRow = piece.color === "w" ? 0 : 7;
    if (!attacksOnly) {
      const one = at(row(from) + direction, col(from));
      if (inside(row(from) + direction, col(from)) && !state.board[one]) {
        output.push({ from, to: one, ...(row(one) === promotionRow ? { promotion: state.crown[piece.color] } : {}) });
        const two = at(row(from) + direction * 2, col(from));
        if (row(from) === startRow && !state.board[two]) output.push({ from, to: two });
      }
    }
    for (const dc of [-1, 1]) {
      const r = row(from) + direction;
      const c = col(from) + dc;
      if (!inside(r, c)) continue;
      const targetSquare = at(r, c);
      const target = state.board[targetSquare];
      if (attacksOnly || (target && target.color !== piece.color) || (!target && state.enPassant === targetSquare)) {
        output.push({
          from,
          to: targetSquare,
          ...(!attacksOnly && !target && state.enPassant === targetSquare ? { enPassant: true } : {}),
          ...(r === promotionRow ? { promotion: state.crown[piece.color] } : {}),
        });
      }
    }
    return output;
  }
  if (piece.kind === "n") pushStepMoves(state, from, piece.color, KNIGHT_STEPS, output);
  if (piece.kind === "k") pushStepMoves(state, from, piece.color, KING_STEPS, output);
  if (piece.kind === "b") pushSlidingMoves(state, from, piece.color, BISHOP_DIRS, output);
  if (piece.kind === "r") pushSlidingMoves(state, from, piece.color, ROOK_DIRS, output);
  if (piece.kind === "q" || piece.kind === "d") pushSlidingMoves(state, from, piece.color, [...BISHOP_DIRS, ...ROOK_DIRS], output);
  if (piece.kind === "d") pushStepMoves(state, from, piece.color, KNIGHT_STEPS, output);
  if (piece.kind === "a") { pushSlidingMoves(state, from, piece.color, BISHOP_DIRS, output); pushStepMoves(state, from, piece.color, KNIGHT_STEPS, output); }
  if (piece.kind === "c") { pushSlidingMoves(state, from, piece.color, ROOK_DIRS, output); pushStepMoves(state, from, piece.color, KNIGHT_STEPS, output); }
  if (piece.kind === "w") { pushSlidingMoves(state, from, piece.color, BISHOP_DIRS, output); pushStepMoves(state, from, piece.color, CAMEL_STEPS, output); }
  return output;
}

function kingIndex(state: VariantState, color: VariantColor) { return state.board.findIndex((piece) => piece?.color === color && piece.kind === "k"); }

export function isVariantCheck(state: VariantState, color: VariantColor = state.turn) {
  const king = kingIndex(state, color);
  return king >= 0 && isVariantSquareAttacked(state, king, other(color));
}

export function isVariantSquareAttacked(state: VariantState, square: number, by: VariantColor) {
  for (let from = 0; from < 64; from++) {
    if (state.board[from]?.color !== by) continue;
    if (pseudoMoves(state, from, true).some((move) => move.to === square)) return true;
  }
  return false;
}

function castleMoves(state: VariantState, color: VariantColor): VariantMove[] {
  const info = state.castling[color];
  const rank = color === "w" ? 7 : 0;
  const king = state.board[info.kingStart];
  if (!king || king.kind !== "k" || king.color !== color || isVariantSquareAttacked(state, info.kingStart, other(color))) return [];
  const output: VariantMove[] = [];
  for (const side of ["queen", "king"] as const) {
    if (!info[side]) continue;
    const rookFrom = side === "king" ? info.kingRook : info.queenRook;
    const kingTo = at(rank, side === "king" ? 6 : 2);
    const rookTo = at(rank, side === "king" ? 5 : 3);
    const rook = state.board[rookFrom];
    if (!rook || rook.color !== color || rook.kind !== "r") continue;
    const occupiedPath = new Set<number>();
    for (let file = Math.min(col(info.kingStart), col(rookFrom)); file <= Math.max(col(info.kingStart), col(rookFrom)); file++) occupiedPath.add(at(rank, file));
    for (let file = Math.min(col(info.kingStart), col(kingTo)); file <= Math.max(col(info.kingStart), col(kingTo)); file++) occupiedPath.add(at(rank, file));
    for (let file = Math.min(col(rookFrom), col(rookTo)); file <= Math.max(col(rookFrom), col(rookTo)); file++) occupiedPath.add(at(rank, file));
    const clear = [...occupiedPath].every((square) => square === info.kingStart || square === rookFrom || !state.board[square]);
    if (!clear) continue;
    let safe = true;
    const direction = Math.sign(col(kingTo) - col(info.kingStart));
    const pathFiles = direction === 0
      ? [col(info.kingStart)]
      : Array.from({ length: Math.abs(col(kingTo) - col(info.kingStart)) + 1 }, (_, index) => col(info.kingStart) + index * direction);
    for (const file of pathFiles) {
      const square = at(rank, file);
      if (square === info.kingStart) continue;
      const safetyBoard = state.board.map((piece) => piece ? { ...piece } : null);
      safetyBoard[info.kingStart] = null;
      if (square === kingTo) {
        safetyBoard[rookFrom] = null;
        safetyBoard[kingTo] = king;
        safetyBoard[rookTo] = rook;
      } else {
        if (square === rookFrom) safetyBoard[rookFrom] = null;
        safetyBoard[square] = king;
      }
      if (isVariantSquareAttacked({ ...state, board: safetyBoard }, square, other(color))) safe = false;
    }
    if (direction === 0) {
      const finalBoard = state.board.map((piece) => piece ? { ...piece } : null);
      finalBoard[info.kingStart] = null;
      finalBoard[rookFrom] = null;
      finalBoard[kingTo] = king;
      finalBoard[rookTo] = rook;
      safe = !isVariantSquareAttacked({ ...state, board: finalBoard }, kingTo, other(color));
    }
    if (safe) output.push({ from: info.kingStart, to: kingTo, castle: side });
  }
  return output;
}

function applyUnchecked(state: VariantState, move: VariantMove): VariantState {
  const board = state.board.map((piece) => piece ? { ...piece } : null);
  const piece = board[move.from];
  if (!piece) return state;
  const castling = { w: { ...state.castling.w }, b: { ...state.castling.b } };
  const captureSquare = move.enPassant ? move.to + (piece.color === "w" ? 8 : -8) : move.to;
  const captured = board[captureSquare];
  if (move.castle) {
    const info = castling[piece.color];
    const rookFrom = move.castle === "king" ? info.kingRook : info.queenRook;
    const rookTo = at(piece.color === "w" ? 7 : 0, move.castle === "king" ? 5 : 3);
    const rook = state.board[rookFrom];
    board[move.from] = null;
    board[rookFrom] = null;
    board[move.to] = piece;
    board[rookTo] = rook;
  } else {
    board[move.from] = null;
    if (move.enPassant) board[captureSquare] = null;
    board[move.to] = { ...piece, ...(move.promotion ? { kind: move.promotion } : {}) };
  }
  if (piece.kind === "k") { castling[piece.color].king = false; castling[piece.color].queen = false; }
  if (move.from === castling[piece.color].kingRook) castling[piece.color].king = false;
  if (move.from === castling[piece.color].queenRook) castling[piece.color].queen = false;
  if (captured?.kind === "r") {
    if (move.to === castling[captured.color].kingRook) castling[captured.color].king = false;
    if (move.to === castling[captured.color].queenRook) castling[captured.color].queen = false;
  }
  const enPassant = piece.kind === "p" && Math.abs(move.to - move.from) === 16 ? (move.from + move.to) / 2 : null;
  return { ...state, board, castling, enPassant, turn: other(piece.color), lastMove: move };
}

export function legalVariantMoves(state: VariantState, from?: number): VariantMove[] {
  if (state.winner) return [];
  const sources = from == null ? Array.from({ length: 64 }, (_, index) => index) : [from];
  const output: VariantMove[] = [];
  for (const source of sources) {
    const piece = state.board[source];
    if (!piece || piece.color !== state.turn) continue;
    const candidates = [...pseudoMoves(state, source), ...(piece.kind === "k" ? castleMoves(state, piece.color) : [])];
    for (const move of candidates) {
      if (!move.castle && state.board[move.to]?.kind === "k") continue;
      const next = applyUnchecked(state, move);
      const king = kingIndex(next, piece.color);
      if (king >= 0 && !isVariantSquareAttacked(next, king, other(piece.color))) output.push(move);
    }
  }
  return output;
}

function moveNotation(state: VariantState, move: VariantMove) {
  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";
  const piece = state.board[move.from];
  const capture = Boolean(state.board[move.to]) || move.enPassant;
  const name = piece?.kind === "p" ? (capture ? FILES[col(move.from)] : "") : piece?.kind.toUpperCase();
  return `${name}${capture ? "x" : ""}${variantSquare(move.to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ""}`;
}

export function playVariantMove(state: VariantState, move: VariantMove): VariantState {
  const legal = legalVariantMoves(state, move.from).find((candidate) => candidate.to === move.to && candidate.castle === move.castle);
  if (!legal) return state;
  const notation = moveNotation(state, legal);
  let next = applyUnchecked(state, legal);
  const replies = legalVariantMoves(next);
  if (!replies.length) {
    const king = kingIndex(next, next.turn);
    next = { ...next, winner: king >= 0 && isVariantSquareAttacked(next, king, other(next.turn)) ? other(next.turn) : "draw" };
  }
  return { ...next, moves: [...state.moves, notation] };
}

function evaluate(state: VariantState, perspective: VariantColor) {
  let score = 0;
  for (let index = 0; index < 64; index++) {
    const piece = state.board[index];
    if (!piece) continue;
    const sign = piece.color === perspective ? 1 : -1;
    const center = 7 - (Math.abs(row(index) - 3.5) + Math.abs(col(index) - 3.5));
    score += sign * (VALUE[piece.kind] + (piece.kind === "n" || piece.kind === "b" || piece.kind === "a" || piece.kind === "w" ? center * 3 : 0));
  }
  return score;
}

function minimax(state: VariantState, depth: number, alpha: number, beta: number, perspective: VariantColor): number {
  if (state.winner === perspective) return 100_000 + depth;
  if (state.winner === other(perspective)) return -100_000 - depth;
  if (state.winner === "draw" || depth <= 0) return evaluate(state, perspective);
  const maximizing = state.turn === perspective;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of legalVariantMoves(state)) {
    const score = minimax(playVariantMove(state, move), depth - 1, alpha, beta, perspective);
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, score); }
    else { best = Math.min(best, score); beta = Math.min(beta, score); }
    if (beta <= alpha) break;
  }
  return best;
}

export function pickVariantBotMove(state: VariantState, difficulty: 1 | 2 | 3, rng: () => number = Math.random) {
  const moves = legalVariantMoves(state);
  if (!moves.length) return null;
  const depth = difficulty;
  const scored = moves.map((move) => ({ move, score: minimax(playVariantMove(state, move), depth - 1, -Infinity, Infinity, state.turn) }));
  scored.sort((a, b) => b.score - a.score);
  const breadth = difficulty === 1 ? Math.min(6, scored.length) : difficulty === 2 ? Math.min(3, scored.length) : 1;
  return scored[Math.floor(rng() * breadth)].move;
}
