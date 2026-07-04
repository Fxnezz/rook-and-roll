"use client";

import { useState } from "react";
import { LEVELS } from "@/lib/platformer/levels";
import { PlatformerGame } from "@/components/platformer/PlatformerGame";
import { useHighScore } from "@/lib/arcade/useHighScore";

function LevelCard({ id, name, onPlay }: { id: string; name: string; onPlay: () => void }) {
  const { best } = useHighScore("platformer", { level: id, higherIsBetter: false });
  return (
    <button onClick={onPlay} className="panel flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-[var(--bg-elev)]">
      <span className="font-bold">{name}</span>
      <span className="text-xs text-[var(--text-faint)]">{best != null ? `Best: ${(best / 1000).toFixed(2)}s` : "Not completed yet"}</span>
    </button>
  );
}

export default function PlatformerPage() {
  const [levelId, setLevelId] = useState<string | null>(null);

  if (levelId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PlatformerGame levelId={levelId} onExit={() => setLevelId(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Spark&apos;s Climb</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        An original platformer — run, double-jump, grab gems, reach the flag.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {LEVELS.map((l) => (
          <LevelCard key={l.id} id={l.id} name={l.name} onPlay={() => setLevelId(l.id)} />
        ))}
      </div>
    </div>
  );
}
