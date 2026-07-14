"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeAndSaveAccuracy } from "@/components/game/GameAccuracyBadge";

/** Sequentially analyzes every not-yet-analyzed game on the current page and persists accuracy for each. */
export function AnalyzeAllButton({ games }: { games: { id: string; pgn: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (games.length === 0) return null;

  const run = async () => {
    setBusy(true);
    setProgress({ done: 0, total: games.length });
    for (let i = 0; i < games.length; i++) {
      await computeAndSaveAccuracy(games[i].id, games[i].pgn).catch(() => {});
      setProgress({ done: i + 1, total: games.length });
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <button className="btn hover-lift !py-1.5 text-xs" onClick={run} disabled={busy}>
      {busy && progress ? `Analyzing ${progress.done}/${progress.total}…` : `Analyze all (${games.length})`}
    </button>
  );
}
