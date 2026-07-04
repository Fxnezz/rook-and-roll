"use client";

import { useState } from "react";
import { LEVELS } from "@/lib/platformer/levels";
import { generateLevel, randomSeed, type GeneratedLevel } from "@/lib/platformer/generate";
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

function RandomLevelCard({ onPlay }: { onPlay: () => void }) {
  const { best } = useHighScore("platformer", { level: "random", higherIsBetter: false });
  return (
    <button onClick={onPlay} className="panel flex flex-col items-start gap-1 border border-dashed border-[var(--border-strong)] p-4 text-left transition-colors hover:bg-[var(--bg-elev)]">
      <span className="font-bold">🎲 Random Run</span>
      <span className="text-xs text-[var(--text-muted)]">A freshly generated layout every time.</span>
      <span className="text-xs text-[var(--text-faint)]">{best != null ? `Best: ${(best / 1000).toFixed(2)}s` : "Not completed yet"}</span>
    </button>
  );
}

export default function PlatformerPage() {
  const [levelId, setLevelId] = useState<string | null>(null);
  const [randomLevel, setRandomLevel] = useState<GeneratedLevel | null>(null);

  const playRandom = () => setRandomLevel(generateLevel(randomSeed()));

  if (randomLevel) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PlatformerGame
          level={randomLevel}
          scoreKey="random"
          onExit={() => setRandomLevel(null)}
        />
        <div className="mt-3 text-center">
          <button className="btn btn-ghost !py-1 text-xs" onClick={playRandom}>
            🎲 New random layout
          </button>
        </div>
      </div>
    );
  }

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
        <RandomLevelCard onPlay={playRandom} />
      </div>
    </div>
  );
}
