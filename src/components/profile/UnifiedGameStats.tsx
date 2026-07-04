interface GameRatingRow {
  game: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}
interface HighScoreBest {
  game: string;
  level: string | null;
  score: number;
}
interface WordStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
}

const GAME_LABELS: Record<string, string> = {
  connect4: "Connect Four",
  checkers: "Checkers",
  snake: "Snake",
  tetris: "Tetris",
  "2048": "2048",
  racing: "Circuit Dash",
  platformer: "Spark's Climb",
};

function fmtScore(game: string, score: number): string {
  if (game === "racing" || game === "platformer") return `${(score / 1000).toFixed(2)}s`;
  return String(score);
}

export function UnifiedGameStats({
  gameRatings,
  highScores,
  wordStats,
}: {
  gameRatings: GameRatingRow[];
  highScores: HighScoreBest[];
  wordStats: WordStats | null;
}) {
  const hasAnything = gameRatings.length > 0 || highScores.length > 0 || (wordStats && wordStats.played > 0);
  if (!hasAnything) return null;

  return (
    <section className="panel mt-4 p-4">
      <span className="label mb-3 block">Other games</span>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gameRatings.map((r) => (
          <div key={r.game} className="rounded-lg bg-[var(--bg-elev)] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{GAME_LABELS[r.game] ?? r.game}</span>
              <span className="font-mono text-lg font-black text-[var(--accent)]">{r.rating}</span>
            </div>
            <span className="text-xs text-[var(--text-faint)]">
              {r.wins}W {r.losses}L {r.draws}D
            </span>
          </div>
        ))}
        {highScores.map((h) => (
          <div key={`${h.game}-${h.level ?? ""}`} className="rounded-lg bg-[var(--bg-elev)] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">
                {GAME_LABELS[h.game] ?? h.game}
                {h.level ? ` · L${h.level}` : ""}
              </span>
              <span className="font-mono text-lg font-black text-[var(--accent)]">{fmtScore(h.game, h.score)}</span>
            </div>
            <span className="text-xs text-[var(--text-faint)]">
              {h.game === "racing" ? "best lap" : h.game === "platformer" ? "best time" : "high score"}
            </span>
          </div>
        ))}
        {wordStats && wordStats.played > 0 && (
          <div className="rounded-lg bg-[var(--bg-elev)] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Word Game</span>
              <span className="font-mono text-lg font-black text-[var(--accent)]">🔥{wordStats.currentStreak}</span>
            </div>
            <span className="text-xs text-[var(--text-faint)]">
              {wordStats.played} played · {Math.round((wordStats.wins / wordStats.played) * 100)}% win · best streak {wordStats.maxStreak}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
