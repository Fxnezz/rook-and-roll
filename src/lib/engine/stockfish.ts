"use client";

/**
 * Thin UCI wrapper around the Stockfish WASM build running in a Web Worker.
 * The worker keeps all engine computation off the main thread.
 *
 * Engine file is served from /public/engine (copied from node_modules by
 * scripts/copy-engine.mjs). We use the single-threaded lite build so no
 * SharedArrayBuffer / cross-origin-isolation headers are required.
 */

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";

export interface EngineLine {
  /** move in UCI form, e.g. "e2e4" */
  move: string;
  /** centipawns from the side-to-move's perspective (null if mate) */
  cp: number | null;
  /** mate-in-N from side-to-move perspective (null if not mate) */
  mate: number | null;
  pv: string[];
  depth: number;
}

export interface GoOptions {
  depth?: number;
  movetime?: number;
  multipv?: number;
}

export interface GoResult {
  bestmove: string;
  ponder?: string;
  lines: EngineLine[];
}

export interface ChessEngine {
  readonly isSupported: boolean;
  init(): Promise<void>;
  setSkillLevel(level: number): Promise<void>;
  configureMaximumStrength?(skill?: number): Promise<void>;
  newGame(): Promise<void>;
  go(fen: string, opts?: GoOptions): Promise<GoResult>;
  evaluate(fen: string, opts?: GoOptions): Promise<{ cp: number | null; mate: number | null; bestmove: string }>;
  stop(): void;
  quit(): void;
}

type Pending = {
  resolve: (r: GoResult) => void;
  lines: Map<number, EngineLine>;
};

export class StockfishEngine implements ChessEngine {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private booted = false;
  private initPromise: Promise<void> | null = null;

  get isSupported() {
    return typeof window !== "undefined" && typeof Worker !== "undefined";
  }

  /** Idempotent under concurrency: simultaneous callers share one boot. */
  async init(): Promise<void> {
    if (this.booted) return;
    if (this.initPromise) return this.initPromise;
    if (!this.isSupported) throw new Error("Web Workers not supported");
    this.initPromise = (async () => {
      this.worker = new Worker(ENGINE_URL);
      this.worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        const line = typeof data === "string" ? data : data?.data ?? String(data);
        if (typeof line === "string") this.onLine(line);
      };
      this.send("uci");
      await this.waitFor("uciok");
      this.send("isready");
      await this.waitFor("readyok");
      this.booted = true;
    })();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitForToken: { token: string; resolve: () => void } | null = null;
  private waitFor(token: string): Promise<void> {
    return new Promise((resolve) => {
      this.waitForToken = { token, resolve };
    });
  }

  private onLine(line: string) {
    if (this.waitForToken && line.startsWith(this.waitForToken.token)) {
      const r = this.waitForToken.resolve;
      this.waitForToken = null;
      r();
    }

    if (!this.pending) return;

    if (line.startsWith("info") && line.includes(" pv ")) {
      const parsed = parseInfo(line);
      if (parsed) this.pending.lines.set(parsed.multipv, parsed.line);
      return;
    }

    if (line.startsWith("bestmove")) {
      const parts = line.split(/\s+/);
      const bestmove = parts[1];
      const ponderIdx = parts.indexOf("ponder");
      const ponder = ponderIdx >= 0 ? parts[ponderIdx + 1] : undefined;
      const lines = [...this.pending.lines.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, l]) => l);
      const p = this.pending;
      this.pending = null;
      p.resolve({ bestmove, ponder, lines });
    }
  }

  async setOption(name: string, value: string | number) {
    if (!this.booted) await this.init();
    this.send(`setoption name ${name} value ${value}`);
  }

  async setSkillLevel(level: number) {
    await this.setOption("Skill Level", Math.max(0, Math.min(20, Math.round(level))));
  }

  /** Configure the bundled core for Sam Engine's strongest browser profile. */
  async configureMaximumStrength(skill = 20) {
    await this.setOption("UCI_LimitStrength", "false");
    await this.setOption("Skill Level", Math.max(0, Math.min(20, Math.round(skill))));
    await this.setOption("Hash", 128);
  }

  async newGame() {
    if (!this.booted) await this.init();
    this.send("ucinewgame");
    this.send("isready");
    await this.waitFor("readyok");
  }

  private chain: Promise<unknown> = Promise.resolve();

  /**
   * Run a search on the given FEN and resolve with the best move + candidate
   * lines. Searches are serialized: the single worker can only run one at a
   * time, so overlapping callers (eval bar + bot move) queue behind each other.
   */
  async go(fen: string, opts: GoOptions = {}): Promise<GoResult> {
    const run = async (): Promise<GoResult> => {
      if (!this.booted) await this.init();
      const multipv = Math.max(1, opts.multipv ?? 1);
      await this.setOption("MultiPV", multipv);
      return new Promise<GoResult>((resolve) => {
        this.pending = { resolve, lines: new Map() };
        this.send(`position fen ${fen}`);
        if (opts.movetime) this.send(`go movetime ${opts.movetime}`);
        else this.send(`go depth ${opts.depth ?? 12}`);
      });
    };
    const p = this.chain.then(run, run) as Promise<GoResult>;
    this.chain = p.catch(() => {});
    return p;
  }

  /** Evaluate a position; returns score from White's perspective. */
  async evaluate(
    fen: string,
    opts: GoOptions = {},
  ): Promise<{ cp: number | null; mate: number | null; bestmove: string }> {
    const res = await this.go(fen, { depth: opts.depth ?? 12, ...opts, multipv: 1 });
    const line = res.lines[0];
    const whiteToMove = fen.split(" ")[1] === "w";
    const sign = whiteToMove ? 1 : -1;
    return {
      cp: line?.cp != null ? line.cp * sign : null,
      mate: line?.mate != null ? line.mate * sign : null,
      bestmove: res.bestmove,
    };
  }

  stop() {
    this.send("stop");
  }

  quit() {
    try {
      this.send("quit");
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.booted = false;
    this.pending = null;
  }
}

function parseInfo(line: string): { multipv: number; line: EngineLine } | null {
  const tokens = line.split(/\s+/);
  let multipv = 1;
  let cp: number | null = null;
  let mate: number | null = null;
  let depth = 0;
  let pv: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "multipv") multipv = parseInt(tokens[i + 1], 10);
    else if (t === "depth") depth = parseInt(tokens[i + 1], 10);
    else if (t === "score") {
      const kind = tokens[i + 1];
      const val = parseInt(tokens[i + 2], 10);
      if (kind === "cp") cp = val;
      else if (kind === "mate") mate = val;
    } else if (t === "pv") {
      pv = tokens.slice(i + 1);
      break;
    }
  }
  if (pv.length === 0) return null;
  return { multipv, line: { move: pv[0], cp, mate, pv, depth } };
}

let shared: StockfishEngine | null = null;
/** A lazily-created shared engine instance for the current tab. */
export function getEngine(): StockfishEngine {
  if (!shared) shared = new StockfishEngine();
  return shared;
}
