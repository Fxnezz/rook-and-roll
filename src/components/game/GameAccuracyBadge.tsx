"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { analyzeGame } from "@/lib/engine/analysis";
import { getEngine } from "@/lib/engine/stockfish";

export async function computeAndSaveAccuracy(gameId: string, pgn: string): Promise<boolean> {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return false;
  }
  const moves = chess.history({ verbose: true });
  if (moves.length === 0) return false;
  const positions = moves.map((m) => m.before).concat(moves[moves.length - 1].after);
  const result = await analyzeGame(getEngine(), { positions, moves: moves.map((m) => ({ san: m.san, uci: m.from + m.to + (m.promotion ?? ""), color: m.color })) }, { depth: 10 });
  const res = await fetch(`/api/games/${gameId}/accuracy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accuracyW: result.accuracy.w, accuracyB: result.accuracy.b }),
  });
  return res.ok;
}

/** Shows accuracy chips once computed, or an "Analyze" button to compute + persist them. */
export function GameAccuracyBadge({ gameId, pgn, accuracyW, accuracyB }: { gameId: string; pgn: string; accuracyW: number | null; accuracyB: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (accuracyW != null && accuracyB != null) {
    return (
      <span className="chip !px-1.5 !py-0.5 text-[10px]" title="Engine-review accuracy, White / Black">
        {accuracyW}% / {accuracyB}%
      </span>
    );
  }

  return (
    <button
      className="chip !px-1.5 !py-0.5 text-[10px] hover:bg-[var(--bg-elev-2)]"
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        const ok = await computeAndSaveAccuracy(gameId, pgn);
        setBusy(false);
        if (ok) router.refresh();
      }}
    >
      {busy ? "Analyzing…" : "Analyze"}
    </button>
  );
}
