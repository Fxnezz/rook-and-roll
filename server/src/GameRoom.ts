import { Chess, type Square } from "chess.js";
import type {
  AdminPiece,
  ClockState,
  Color,
  GameOverMsg,
  GameStateMsg,
  Identity,
  PlayerInfo,
  TimeControlSpec,
} from "./protocol.js";

let counter = 0;
function newId() {
  counter += 1;
  return `g_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Whether chess.js can load this string as a starting position (used to validate a friend challenge's custom FEN before a room is created). */
export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export class GameRoom {
  readonly id = newId();
  readonly chess = new Chess();
  readonly timeControl: TimeControlSpec;
  readonly rated: boolean;

  white: PlayerInfo;
  black: PlayerInfo;

  private whiteMs: number;
  private blackMs: number;
  private activeColor: Color | null = null;
  private lastTickTs = 0;
  private running = false;
  private started = false;

  status: GameOverMsg | null = null;
  drawOfferFrom: Color | null = null;
  takebackOfferFrom: Color | null = null;
  /**
   * Server-authoritative takeback cap (#209) — 3 per side per game. A client
   * Settings toggle can't fairly enforce this against a real opponent, so
   * it's tracked here instead and checked before a new offer is allowed.
   */
  readonly takebackLimit = 3;
  takebacksUsed: { w: number; b: number } = { w: 0, b: 0 };
  spectators = new Set<string>();
  /** socketId -> identity, for admin visibility into who's watching */
  spectatorIdentities = new Map<string, { userId: string; username: string }>();
  /** admin sockets invisibly attached — get moves instantly, never delayed, never counted as spectators */
  adminObservers = new Set<string>();

  // Admin god-mode state
  frozen = { w: false, b: false };
  private clockDisabled = false;
  adminResolved = false;
  paused = false;
  roomMuted = { w: false, b: false };
  reviewFlagged = false;
  voided = false;
  /** Moderator "troll" slowmode — min ms between chat messages per side; 0 = disabled. */
  trollSlowmode = { w: 0, b: 0 };
  trollLastChatAt = { w: 0, b: 0 };
  /** ms spent on each ply, index-aligned with chess.history() */
  moveTimesMs: number[] = [];
  private lastMoveAt = 0;
  disconnectedSince: { w: number | null; b: number | null } = { w: null, b: null };

  constructor(
    a: Identity,
    b: Identity,
    tc: TimeControlSpec,
    rated: boolean,
    aIsModerator = false,
    bIsModerator = false,
    startFen?: string,
  ) {
    this.timeControl = tc;
    this.rated = rated;
    // randomize colors
    const aWhite = Math.random() < 0.5;
    const wId = aWhite ? a : b;
    const bId = aWhite ? b : a;
    const wIsModerator = aWhite ? aIsModerator : bIsModerator;
    const bIsMod = aWhite ? bIsModerator : aIsModerator;
    this.white = { userId: wId.userId, username: wId.username, rating: wId.rating, color: "w", connected: true, isModerator: wIsModerator };
    this.black = { userId: bId.userId, username: bId.username, rating: bId.rating, color: "b", connected: true, isModerator: bIsMod };
    this.whiteMs = tc.initialMs ?? 0;
    this.blackMs = tc.initialMs ?? 0;
    // Caller (createGame) is expected to have already validated this with
    // isValidFen before constructing the room; this try/catch is just a
    // defensive fallback to the standard start position.
    if (startFen) {
      try {
        this.chess.load(startFen);
      } catch {
        /* fall back to the default start position already loaded above */
      }
    }
  }

  get untimed() {
    return this.timeControl.initialMs == null;
  }

  playerColor(userId: string): Color | null {
    if (this.white.userId === userId) return "w";
    if (this.black.userId === userId) return "b";
    return null;
  }

  setConnected(userId: string, connected: boolean) {
    if (this.white.userId === userId) {
      this.white.connected = connected;
      this.disconnectedSince.w = connected ? null : Date.now();
    }
    if (this.black.userId === userId) {
      this.black.connected = connected;
      this.disconnectedSince.b = connected ? null : Date.now();
    }
  }

  /** Begin the game clock (call once both players are present). */
  start() {
    if (this.started) return;
    this.started = true;
    this.lastMoveAt = Date.now();
    if (!this.untimed) {
      // Normally "w" (a fresh board), but a custom starting FEN can begin
      // with black to move — read the real side-to-move so the clock ticks
      // for the right side instead of always assuming White starts.
      this.activeColor = this.chess.turn();
      this.lastTickTs = Date.now();
      this.running = true;
    }
  }

  private remaining(color: Color, now: number): number {
    if (this.untimed) return 0;
    const base = color === "w" ? this.whiteMs : this.blackMs;
    if (this.running && this.activeColor === color) return Math.max(0, base - (now - this.lastTickTs));
    return Math.max(0, base);
  }

  clockState(now = Date.now()): ClockState {
    return {
      whiteMs: this.remaining("w", now),
      blackMs: this.remaining("b", now),
      running: this.running,
      activeColor: this.activeColor,
      updatedAt: now,
    };
  }

  /** Returns the timed-out color if any side has flagged. */
  checkFlag(now = Date.now()): Color | null {
    if (this.clockDisabled) return null;
    if (this.untimed || !this.running || this.status || !this.activeColor) return null;
    if (this.remaining(this.activeColor, now) <= 0) return this.activeColor;
    return null;
  }

  applyMove(
    color: Color,
    from: string,
    to: string,
    promotion?: string,
  ): { ok: true; san: string } | { ok: false; error: string } {
    if (this.status) return { ok: false, error: "Game is over" };
    if (this.paused) return { ok: false, error: "Game is paused by a moderator" };
    if (this.frozen[color]) return { ok: false, error: "Your side is frozen" };
    if (this.chess.turn() !== color) return { ok: false, error: "Not your turn" };
    const now = Date.now();
    // flag check before accepting the move
    const flagged = this.checkFlag(now);
    if (flagged) {
      this.endByTimeout(flagged);
      return { ok: false, error: "Time out" };
    }
    let move;
    try {
      move = this.chess.move({ from, to, promotion });
    } catch {
      return { ok: false, error: "Illegal move" };
    }
    if (!move) return { ok: false, error: "Illegal move" };

    this.moveTimesMs.push(now - this.lastMoveAt);
    this.lastMoveAt = now;

    // clock: charge the mover, add increment, switch
    if (!this.untimed) {
      const elapsed = now - this.lastTickTs;
      if (color === "w") this.whiteMs = Math.max(0, this.whiteMs - elapsed) + this.timeControl.incrementMs;
      else this.blackMs = Math.max(0, this.blackMs - elapsed) + this.timeControl.incrementMs;
      this.activeColor = color === "w" ? "b" : "w";
      this.lastTickTs = now;
    }
    this.drawOfferFrom = null;
    this.takebackOfferFrom = null;

    this.detectGameEnd();
    return { ok: true, san: move.san };
  }

  private detectGameEnd() {
    const c = this.chess;
    if (c.isCheckmate()) {
      const winner: Color = c.turn() === "w" ? "b" : "w";
      this.finish(winner === "w" ? "1-0" : "0-1", winner, "Checkmate");
    } else if (c.isStalemate()) this.finish("1/2-1/2", null, "Stalemate");
    else if (c.isInsufficientMaterial()) this.finish("1/2-1/2", null, "Insufficient material");
    else if (c.isThreefoldRepetition()) this.finish("1/2-1/2", null, "Threefold repetition");
    else if (c.isDraw()) this.finish("1/2-1/2", null, "50-move rule");
  }

  endByTimeout(loser: Color) {
    // if the opponent has insufficient material to mate, it's a draw
    const winner: Color = loser === "w" ? "b" : "w";
    this.running = false;
    this.finish(winner === "w" ? "1-0" : "0-1", winner, "Timeout");
  }

  resign(color: Color) {
    if (this.status) return;
    const winner: Color = color === "w" ? "b" : "w";
    this.finish(winner === "w" ? "1-0" : "0-1", winner, "Resignation");
  }

  /** Either side may cancel a game with no rating/history impact before it's really underway. */
  abort(): boolean {
    if (this.status) return false;
    if (this.chess.history().length > 1) return false;
    this.finish("1/2-1/2", null, "Aborted", true);
    return true;
  }

  abandonment(loser: Color) {
    if (this.status) return;
    const winner: Color = loser === "w" ? "b" : "w";
    this.finish(winner === "w" ? "1-0" : "0-1", winner, "Abandonment");
  }

  agreeDraw() {
    if (this.status) return;
    this.finish("1/2-1/2", null, "Draw by agreement");
  }

  /** Whether `color` still has takebacks left to offer under the per-game cap. */
  takebacksRemaining(color: Color): number {
    return Math.max(0, this.takebackLimit - this.takebacksUsed[color]);
  }

  /**
   * Undo back to the requester's last decision point: if it's currently
   * their turn (the opponent just replied), pop both plies so they're back
   * to where they were before making that move; if it's the opponent's turn
   * (the requester just moved), pop just their own last move.
   */
  takeback(requester: Color): boolean {
    if (this.status) return false;
    if (this.takebacksRemaining(requester) <= 0) return false;
    const plies = this.chess.turn() === requester ? 2 : 1;
    if (this.chess.history().length < plies) return false;
    for (let i = 0; i < plies; i++) this.chess.undo();
    this.moveTimesMs.splice(-plies, plies);
    this.drawOfferFrom = null;
    this.takebackOfferFrom = null;
    this.takebacksUsed[requester] += 1;
    if (!this.untimed && this.started) {
      this.activeColor = this.chess.turn();
      this.lastTickTs = Date.now();
      this.running = true;
    }
    return true;
  }

  /**
   * Admin-only unilateral takeback — reverts exactly one ply, no
   * negotiation. Same mechanics as takeback() (chess.js .undo(), splice
   * moveTimesMs, clear draw/takeback offers, restore the active-clock
   * side), just without the requester/turn-parity logic since an admin
   * always undoes a single ply regardless of whose turn it is. Same
   * limitation as takeback(): doesn't refund clock time debited on the
   * undone move, and refuses on an already-finished game.
   */
  adminUndo(): boolean {
    if (this.status) return false;
    if (this.chess.history().length < 1) return false;
    this.chess.undo();
    this.moveTimesMs.splice(-1, 1);
    this.drawOfferFrom = null;
    this.takebackOfferFrom = null;
    if (!this.untimed && this.started) {
      this.activeColor = this.chess.turn();
      this.lastTickTs = Date.now();
      this.running = true;
    }
    return true;
  }

  private finish(result: GameOverMsg["result"], winner: Color | null, reason: string, voided = false) {
    this.running = false;
    this.activeColor = null;
    this.voided = voided;
    this.status = { result, winner, reason, voided: voided || undefined };
  }

  moves() {
    return this.chess.history({ verbose: true }).map((m) => ({
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    }));
  }

  // ---- admin god-mode (all callers are verified admins in index.ts) --------

  /**
   * God-mode edits (place/remove a piece, force a move) aren't legal chess
   * moves, so chess.js can't record them in its move history. Left alone,
   * that leaves fen()/pgn()/history() mutually inconsistent — which is what
   * caused player and spectator boards to snap back to the standard starting
   * position after an admin forced a move: their resync logic saw "0 moves"
   * and reset to a fresh game instead of the actual (edited) position.
   *
   * Treating every god-mode edit as a new starting point (identical to
   * importing a custom FEN) keeps fen/pgn/history mutually consistent, so
   * every client's resync lands on the right board.
   */
  private rebaseAsNewStart(fen?: string) {
    try {
      this.chess.load(fen ?? this.chess.fen());
    } catch {
      /* god-mode positions may be technically illegal; load() still accepts
         most malformed-but-parseable FENs */
    }
  }

  adminSetFen(fen: string): boolean {
    try {
      this.chess.load(fen);
      this.drawOfferFrom = null;
      return true;
    } catch {
      return false;
    }
  }

  adminPlace(square: string, piece: AdminPiece | null) {
    try {
      if (piece) this.chess.put({ type: piece.type, color: piece.color }, square as Square);
      else this.chess.remove(square as Square);
    } catch {
      return; // invalid placement (e.g. two kings) — ignore
    }
    this.rebaseAsNewStart();
  }

  /** Move a piece bypassing legality, then hand the turn to the other side. */
  adminForceMove(from: string, to: string, promotion?: string) {
    const p = this.chess.get(from as Square);
    if (!p) return;
    this.chess.remove(from as Square);
    this.chess.put({ type: (promotion as AdminPiece["type"]) ?? p.type, color: p.color }, to as Square);
    const parts = this.chess.fen().split(" ");
    parts[1] = parts[1] === "w" ? "b" : "w";
    this.rebaseAsNewStart(parts.join(" "));
  }

  adminForceResult(result: "1-0" | "0-1" | "1/2-1/2") {
    const winner: Color | null = result === "1-0" ? "w" : result === "0-1" ? "b" : null;
    this.adminResolved = true;
    this.finish(result, winner, "Admin-resolved");
  }

  /** Ends the game with no rating/history impact — for bugs or disputes, not a chosen winner. */
  adminVoid(reason?: string) {
    this.adminResolved = true;
    this.finish("1/2-1/2", null, reason?.trim() || "Voided by moderator", true);
  }

  adminPause(paused: boolean) {
    if (this.status) return;
    this.paused = paused;
    this.running = !paused;
    this.lastTickTs = Date.now();
  }

  adminMuteChat(color: Color, muted: boolean) {
    this.roomMuted[color] = muted;
  }

  adminExtendBoth(addSeconds: number) {
    this.whiteMs += addSeconds * 1000;
    this.blackMs += addSeconds * 1000;
  }

  adminResetClocks() {
    this.whiteMs = this.timeControl.initialMs ?? 0;
    this.blackMs = this.timeControl.initialMs ?? 0;
    this.lastTickTs = Date.now();
  }

  adminFlagReview(flagged: boolean) {
    this.reviewFlagged = flagged;
  }

  adminClock(color: Color, opts: { addSeconds?: number; pause?: boolean; disable?: boolean }) {
    if (opts.disable !== undefined) {
      this.clockDisabled = opts.disable;
      this.running = !opts.disable && !this.status;
      this.lastTickTs = Date.now();
    }
    if (opts.pause !== undefined) {
      this.running = !opts.pause && !this.status;
      this.lastTickTs = Date.now();
    }
    if (opts.addSeconds) {
      if (color === "w") this.whiteMs += opts.addSeconds * 1000;
      else this.blackMs += opts.addSeconds * 1000;
    }
  }

  adminFreeze(color: Color | "both", frozen: boolean) {
    if (color === "both") {
      this.frozen.w = frozen;
      this.frozen.b = frozen;
    } else {
      this.frozen[color] = frozen;
    }
  }

  setTrollSlowmode(color: Color, intervalMs: number) {
    this.trollSlowmode[color] = Math.max(0, intervalMs);
  }

  /** Swap which player controls white vs black; board, clocks, colors stay. */
  adminSwap() {
    const w = this.white;
    const b = this.black;
    this.white = { userId: b.userId, username: b.username, rating: b.rating, color: "w", connected: b.connected, isModerator: b.isModerator };
    this.black = { userId: w.userId, username: w.username, rating: w.rating, color: "b", connected: w.connected, isModerator: w.isModerator };
  }

  summary(suspicionOf: (userId: string) => number = () => 0) {
    return {
      roomId: this.id,
      white: this.white.username,
      black: this.black.username,
      whiteRating: this.white.rating,
      blackRating: this.black.rating,
      ply: this.chess.history().length,
      fen: this.chess.fen(),
      timeControl: this.timeControl.id,
      category: this.timeControl.category,
      rated: this.rated,
      over: Boolean(this.status),
      spectators: this.spectators.size,
      reviewFlagged: this.reviewFlagged,
      suspicion: { w: suspicionOf(this.white.userId), b: suspicionOf(this.black.userId) },
    };
  }

  toState(): GameStateMsg {
    return {
      roomId: this.id,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      moves: this.moves(),
      turn: this.chess.turn(),
      players: { white: this.white, black: this.black },
      clock: this.clockState(),
      timeControl: this.timeControl,
      status: this.status,
      spectators: this.spectators.size,
      drawOfferFrom: this.drawOfferFrom,
      takebackOfferFrom: this.takebackOfferFrom,
      takebackLimit: this.takebackLimit,
      takebacksUsed: { ...this.takebacksUsed },
      rated: this.rated,
      frozen: { ...this.frozen },
      paused: this.paused,
      roomMuted: { ...this.roomMuted },
      moveTimesMs: [...this.moveTimesMs],
      disconnectedSince: { ...this.disconnectedSince },
      spectatorList: [...this.spectatorIdentities.values()].map((s) => ({ username: s.username })),
      reviewFlagged: this.reviewFlagged,
      trollSlowmode: { ...this.trollSlowmode },
    };
  }
}
