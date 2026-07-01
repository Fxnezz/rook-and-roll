// Basic anti-abuse: per-socket move rate limiting + a crude engine-correlation
// signal (share of near-instant moves in a game). Real detection would compare
// move choices against an engine; here we record signals for manual review.

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }

  clear(key: string) {
    this.hits.delete(key);
  }
}

export interface MoveTiming {
  moves: number;
  instant: number; // moves played in < 300ms
  totalMs: number;
  lastTs: number;
}

export class CorrelationTracker {
  private byUser = new Map<string, MoveTiming>();

  record(userId: string) {
    const now = Date.now();
    const t = this.byUser.get(userId) ?? { moves: 0, instant: 0, totalMs: 0, lastTs: now };
    const dt = now - t.lastTs;
    t.moves += 1;
    t.totalMs += dt;
    if (t.moves > 1 && dt < 300) t.instant += 1;
    t.lastTs = now;
    this.byUser.set(userId, t);
  }

  /** Returns a 0..1 suspicion score; >0.6 warrants review. */
  suspicion(userId: string): number {
    const t = this.byUser.get(userId);
    if (!t || t.moves < 10) return 0;
    const instantRate = t.instant / t.moves;
    return Math.min(1, instantRate * 1.5);
  }

  reset(userId: string) {
    this.byUser.delete(userId);
  }
}
