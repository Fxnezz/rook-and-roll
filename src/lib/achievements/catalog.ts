export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: "milestone" | "streak" | "special";
  icon: string;
}

/** Canonical achievement catalog. Mirrored into the add_achievements migration's INSERT statements. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_game", name: "First Steps", description: "Play your first game", category: "milestone", icon: "🎬" },
  { id: "first_win", name: "First Blood", description: "Win your first game", category: "milestone", icon: "🏆" },
  { id: "ten_games", name: "Regular", description: "Play 10 games", category: "milestone", icon: "📈" },
  { id: "fifty_games", name: "Veteran", description: "Play 50 games", category: "milestone", icon: "🎖️" },
  { id: "win_streak_3", name: "On a Roll", description: "Win 3 games in a row", category: "streak", icon: "🔥" },
  { id: "win_streak_5", name: "Unstoppable", description: "Win 5 games in a row", category: "streak", icon: "⚡" },
  { id: "checkmate_win", name: "Checkmate!", description: "Win a game by checkmate", category: "special", icon: "♚" },
  { id: "first_draw", name: "Stalemate Sage", description: "Draw a game", category: "special", icon: "🤝" },
  { id: "bullet_win", name: "Speed Demon", description: "Win a rated bullet game", category: "special", icon: "🚀" },
  { id: "blitz_win", name: "Blitz Master", description: "Win a rated blitz game", category: "special", icon: "💨" },
  { id: "rapid_win", name: "Rapid Fire", description: "Win a rated rapid game", category: "special", icon: "🎯" },
  { id: "classical_win", name: "Grandmaster's Patience", description: "Win a rated classical game", category: "special", icon: "🏛️" },
];

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
