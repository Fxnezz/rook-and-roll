"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PuzzlePlayer, type PuzzleOutcome } from "@/components/puzzles/PuzzlePlayer";
import { MATE_PATTERNS } from "@/lib/training/checkmates";
import type { PuzzleDef } from "@/lib/puzzles/types";

export default function CheckmatePatternsPage() {
  const [patternIdx, setPatternIdx] = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [justSolved, setJustSolved] = useState(false);

  const pattern = MATE_PATTERNS[patternIdx];
  const puzzle: PuzzleDef = pattern.puzzles[puzzleIdx];

  const pick = useCallback((pIdx: number, uIdx: number) => {
    setPatternIdx(pIdx);
    setPuzzleIdx(uIdx);
    setJustSolved(false);
  }, []);

  const onComplete = useCallback(
    (_outcome: PuzzleOutcome) => {
      setSolved((s) => new Set(s).add(puzzle.id));
      setJustSolved(true);
    },
    [puzzle.id],
  );

  const advance = useCallback(() => {
    if (puzzleIdx + 1 < pattern.puzzles.length) {
      pick(patternIdx, puzzleIdx + 1);
    } else if (patternIdx + 1 < MATE_PATTERNS.length) {
      pick(patternIdx + 1, 0);
    }
  }, [pattern, patternIdx, puzzleIdx, pick]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Checkmate patterns</h1>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-[min(70vh,600px)]">
          <PuzzlePlayer key={puzzle.id} puzzle={puzzle} onComplete={onComplete} onFirstMistake={() => {}} />
          <div className="panel mt-3 p-4">
            <h2 className="font-semibold">{pattern.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{pattern.description}</p>
            {justSolved && (
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary !text-xs" onClick={advance}>
                  Next →
                </button>
                <Link className="btn !text-xs" href={`/play/bot?fen=${encodeURIComponent(puzzle.fen)}`}>
                  Practice from here
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="panel w-full p-2 lg:w-[300px]">
          <span className="label mb-1 block px-2">Patterns</span>
          {MATE_PATTERNS.map((p, pIdx) => (
            <div key={p.id} className="mb-1">
              {p.puzzles.map((u, uIdx) => (
                <button
                  key={u.id}
                  onClick={() => pick(pIdx, uIdx)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    pIdx === patternIdx && uIdx === puzzleIdx ? "bg-[var(--bg-elev-2)]" : "hover:bg-[var(--bg-elev)]"
                  }`}
                >
                  <span className={solved.has(u.id) ? "text-[var(--good)]" : "text-[var(--text-faint)]"}>
                    {solved.has(u.id) ? "✓" : "○"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}
                    {p.puzzles.length > 1 ? ` #${uIdx + 1}` : ""}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
