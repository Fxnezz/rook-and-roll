export interface QolStaticRoute {
  href: string;
  label: string;
  description: string;
  emoji: string;
  sidebar?: boolean;
  shortcut?: string;
}

export const QOL_STATIC_ROUTES: readonly QolStaticRoute[] = [
  { href: "/", label: "Home", description: "Sam's Arcade home", emoji: "⌂", shortcut: "Alt H" },
  { href: "/play/online", label: "Play Chess", description: "Live chess matchmaking", emoji: "♟", sidebar: true, shortcut: "Alt O" },
  { href: "/play/bot", label: "Chess Bots", description: "Personality-driven opponents", emoji: "🤖", sidebar: true, shortcut: "Alt B" },
  { href: "/play/local", label: "Pass & Play", description: "Two players on one screen", emoji: "♜", sidebar: true },
  { href: "/play", label: "Games Hub", description: "Browse the complete arcade", emoji: "▦", sidebar: true, shortcut: "Alt G" },
  { href: "/puzzles", label: "Puzzles", description: "Daily tactics and practice", emoji: "🧩", sidebar: true },
  { href: "/training", label: "Training", description: "Build practical chess skills", emoji: "◎", sidebar: true, shortcut: "Alt T" },
  { href: "/analysis", label: "Analysis", description: "Review a game or position", emoji: "✦", sidebar: true },
  { href: "/leaderboard", label: "Leaderboard", description: "Ratings and top players", emoji: "🏆", sidebar: true },
  { href: "/friends", label: "Friends", description: "Requests, presence and head-to-head", emoji: "♣" },
  { href: "/account", label: "Account", description: "Profile, privacy and preferences", emoji: "●" },
  { href: "/quality-of-life", label: "What's New", description: "All 200 QOL improvements", emoji: "200" },
] as const;
