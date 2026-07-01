import { Chess } from "chess.js";
import type {
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
  spectators = new Set<string>();

  constructor(a: Identity, b: Identity, tc: TimeControlSpec, rated: boolean) {
    this.timeControl = tc;
    this.rated = rated;
    // randomize colors
    const aWhite = Math.random() < 0.5;
    const wId = aWhite ? a : b;
    const bId = aWhite ? b : a;
    this.white = { userId: wId.userId, username: wId.username, rating: wId.rating, color: "w", connected: true };
    this.black = { userId: bId.userId, username: bId.username, rating: bId.rating, color: "b", connected: true };
    this.whiteMs = tc.initialMs ?? 0;
    this.blackMs = tc.initialMs ?? 0;
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
    if (this.white.userId === userId) this.white.connected = connected;
    if (this.black.userId === userId) this.black.connected = connected;
  }

  /** Begin the game clock (call once both players are present). */
  start() {
    if (this.started) return;
    this.started = true;
    if (!this.untimed) {
      this.activeColor = "w";
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

    // clock: charge the mover, add increment, switch
    if (!this.untimed) {
      const elapsed = now - this.lastTickTs;
      if (color === "w") this.whiteMs = Math.max(0, this.whiteMs - elapsed) + this.timeControl.incrementMs;
      else this.blackMs = Math.max(0, this.blackMs - elapsed) + this.timeControl.incrementMs;
      this.activeColor = color === "w" ? "b" : "w";
      this.lastTickTs = now;
    }
    this.drawOfferFrom = null;

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

  abandonment(loser: Color) {
    if (this.status) return;
    const winner: Color = loser === "w" ? "b" : "w";
    this.finish(winner === "w" ? "1-0" : "0-1", winner, "Abandonment");
  }

  agreeDraw() {
    if (this.status) return;
    this.finish("1/2-1/2", null, "Draw by agreement");
  }

  private finish(result: GameOverMsg["result"], winner: Color | null, reason: string) {
    this.running = false;
    this.activeColor = null;
    this.status = { result, winner, reason };
  }

  moves() {
    return this.chess.history({ verbose: true }).map((m) => ({
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    }));
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
      rated: this.rated,
    };
  }
}
