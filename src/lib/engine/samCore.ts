"use client";

import type { ChessEngine, GoOptions, GoResult } from "./stockfish";

type Pending = { resolve: (result: GoResult) => void; reject: (error: Error) => void };
type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; result: GoResult }
  | { type: "error"; id: number; message: string };

export class SamCoreEngine implements ChessEngine {
  private worker: Worker | null = null;
  private booted = false;
  private initPromise: Promise<void> | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private pending = new Map<number, Pending>();
  private requestId = 0;
  private skill = 20;
  private chain: Promise<unknown> = Promise.resolve();

  get isSupported() {
    return typeof window !== "undefined" && typeof Worker !== "undefined";
  }

  async init() {
    if (this.booted) return;
    if (this.initPromise) return this.initPromise;
    if (!this.isSupported) throw new Error("Web Workers not supported");
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initReject = reject;
      const worker = new Worker(new URL("./samCore.worker.ts", import.meta.url), { type: "module", name: "sam-core-x1" });
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.type === "ready") {
          this.booted = true;
          this.initReject = null;
          resolve();
          return;
        }
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.type === "result") pending.resolve(message.result);
        else pending.reject(new Error(message.message));
      };
      worker.onerror = (event) => {
        const error = new Error(event.message || "Sam Core worker failed");
        this.booted = false;
        this.worker = null;
        reject(error);
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
      };
    });
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
      this.initReject = null;
    }
  }

  async setSkillLevel(level: number) {
    this.skill = Math.max(0, Math.min(20, Math.round(level)));
  }

  async newGame() {
    await this.init();
    this.worker?.postMessage({ type: "new-game" });
  }

  async go(fen: string, options: GoOptions = {}) {
    const run = async () => {
      await this.init();
      const id = ++this.requestId;
      return new Promise<GoResult>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.worker?.postMessage({
          type: "search",
          id,
          fen,
          depth: Math.max(1, Math.min(8, options.depth ?? 5)),
          multipv: Math.max(1, Math.min(5, options.multipv ?? 1)),
          movetime: options.movetime,
          skill: this.skill,
        });
      });
    };
    const result = this.chain.then(run, run) as Promise<GoResult>;
    this.chain = result.catch(() => {});
    return result;
  }

  async evaluate(fen: string, options: GoOptions = {}) {
    const result = await this.go(fen, { ...options, multipv: 1 });
    const line = result.lines[0];
    const sign = fen.split(" ")[1] === "w" ? 1 : -1;
    return {
      cp: line?.cp == null ? null : line.cp * sign,
      mate: line?.mate == null ? null : line.mate * sign,
      bestmove: result.bestmove,
    };
  }

  stop() {
    const error = new Error("Sam Core search stopped");
    this.initReject?.(error);
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    this.booted = false;
    this.initPromise = null;
  }

  quit() {
    this.stop();
  }
}

let shared: SamCoreEngine | null = null;

export function getSamCoreEngine() {
  if (!shared) shared = new SamCoreEngine();
  return shared;
}
