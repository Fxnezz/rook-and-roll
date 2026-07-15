import { searchSamCore } from "./samCoreSearch";
import type { GoResult } from "./stockfish";

type WorkerRequest =
  | { type: "search"; id: number; fen: string; depth: number; multipv: number; movetime?: number; skill: number }
  | { type: "new-game" };

type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; result: GoResult }
  | { type: "error"; id: number; message: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "new-game") return;
  try {
    const result = searchSamCore(request.fen, request);
    scope.postMessage({ type: "result", id: request.id, result });
  } catch (error) {
    scope.postMessage({ type: "error", id: request.id, message: error instanceof Error ? error.message : "Sam Core search failed" });
  }
};

scope.postMessage({ type: "ready" });
