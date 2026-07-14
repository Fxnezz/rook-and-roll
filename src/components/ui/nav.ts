import { IconChess, IconRobot, IconUsers, IconGrid, IconPuzzle, IconTrophy, IconSparkles, IconTarget } from "./icons";

export const NAV = [
  { href: "/play/online", label: "Play Chess", icon: IconChess },
  { href: "/play/bot", label: "Bots", icon: IconRobot },
  { href: "/play/local", label: "Pass & Play", icon: IconUsers },
  { href: "/play", label: "Games Hub", icon: IconGrid },
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle },
  { href: "/training", label: "Training", icon: IconTarget },
  { href: "/analysis", label: "Analysis", icon: IconSparkles },
  { href: "/leaderboard", label: "Leaderboard", icon: IconTrophy },
];

// The bare hub link ("/play") needs an exact match so it doesn't also light
// up on every /play/* sub-route (online, bot, local, etc.).
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/play" ? pathname === "/play" : pathname.startsWith(href);
}
