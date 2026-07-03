import type { GameEngine, GameResult, Player } from "./engine.js";

export interface BgIdentity {
  userId: string;
  username: string;
  rating: number;
  guest: boolean;
}

export interface BgPlayerInfo {
  userId: string;
  username: string;
  rating: number;
  seat: Player;
  connected: boolean;
}

export interface MoveRecord {
  notation: string;
  by: Player;
}

let counter = 0;
function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/**
 * Generic two-player room: matchmaking result, live state, resign/rematch/
 * spectate, all game-agnostic. The only game-specific piece is the `engine`
 * (rules for Tic-Tac-Toe / Connect Four / Checkers) passed in at construction.
 * This mirrors chess's GameRoom, generalized so it isn't rebuilt per game.
 */
export class MatchRoom<TMove, TState> {
  readonly id: string;
  readonly kind: string;
  readonly rated: boolean;
  readonly engine: GameEngine<TMove, TState>;

  state: TState;
  a: BgPlayerInfo;
  b: BgPlayerInfo;
  moves: MoveRecord[] = [];
  status: (GameResult & { adminResolved?: boolean }) | null = null;
  spectators = new Set<string>();
  drawOfferFrom: Player | null = null;
  rematchWanted = new Set<Player>();

  constructor(engine: GameEngine<TMove, TState>, x: BgIdentity, y: BgIdentity, rated: boolean) {
    this.id = newId("bg");
    this.kind = engine.kind;
    this.engine = engine;
    this.rated = rated;
    this.state = engine.initialState();
    const xFirst = Math.random() < 0.5;
    const first = xFirst ? x : y;
    const second = xFirst ? y : x;
    this.a = { userId: first.userId, username: first.username, rating: first.rating, seat: "a", connected: true };
    this.b = { userId: second.userId, username: second.username, rating: second.rating, seat: "b", connected: true };
  }

  playerSeat(userId: string): Player | null {
    if (this.a.userId === userId) return "a";
    if (this.b.userId === userId) return "b";
    return null;
  }

  playerInfo(seat: Player): BgPlayerInfo {
    return seat === "a" ? this.a : this.b;
  }

  setConnected(userId: string, connected: boolean) {
    if (this.a.userId === userId) this.a.connected = connected;
    if (this.b.userId === userId) this.b.connected = connected;
  }

  applyMove(seat: Player, move: TMove): { ok: true; notation: string } | { ok: false; error: string } {
    if (this.status) return { ok: false, error: "Game is over" };
    const res = this.engine.applyMove(this.state, seat, move);
    if (!res.ok || !res.state) return { ok: false, error: res.error ?? "Illegal move" };
    this.state = res.state;
    this.drawOfferFrom = null;
    const notation = res.notation ?? "";
    this.moves.push({ notation, by: seat });
    const result = this.engine.getResult(this.state);
    if (result) this.status = result;
    return { ok: true, notation };
  }

  resign(seat: Player) {
    if (this.status) return;
    const winner: Player = seat === "a" ? "b" : "a";
    this.status = { over: true, winner, reason: "Resignation" };
  }

  abandon(seat: Player) {
    if (this.status) return;
    const winner: Player = seat === "a" ? "b" : "a";
    this.status = { over: true, winner, reason: "Abandonment" };
  }

  agreeDraw() {
    if (this.status) return;
    this.status = { over: true, winner: null, reason: "Draw by agreement" };
  }

  toState() {
    return {
      roomId: this.id,
      kind: this.kind,
      state: this.engine.serialize(this.state),
      turn: this.engine.turnOf(this.state),
      players: { a: this.a, b: this.b },
      moves: this.moves,
      status: this.status,
      spectators: this.spectators.size,
      drawOfferFrom: this.drawOfferFrom,
      rated: this.rated,
    };
  }
}

export interface BgQueueEntry {
  identity: BgIdentity;
  socketId: string;
  rated: boolean;
  joinedAt: number;
}

function ratingBand(waitMs: number) {
  return Math.min(1000, 100 + Math.floor(waitMs / 5000) * 100);
}

/** Pairs up queued entries for one game `kind`, widening the rating band over time. */
export function tryMatchQueue(
  queue: BgQueueEntry[],
  onMatch: (a: BgQueueEntry, b: BgQueueEntry) => void,
) {
  const now = Date.now();
  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const x = queue[i];
      const y = queue[j];
      const diff = Math.abs(x.identity.rating - y.identity.rating);
      const band = Math.max(ratingBand(now - x.joinedAt), ratingBand(now - y.joinedAt));
      if (diff <= band) {
        queue.splice(j, 1);
        queue.splice(i, 1);
        onMatch(x, y);
        return tryMatchQueue(queue, onMatch);
      }
    }
  }
}
