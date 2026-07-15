export const SHIELD_CATEGORIES = [
  "Triage",
  "Players",
  "Enforcement",
  "Recovery",
  "Investigations",
  "Reports",
  "Live game",
  "Clock & result",
  "Live safety",
  "Platform",
] as const;

export type ShieldCategory = (typeof SHIELD_CATEGORIES)[number];

export interface ShieldFeature {
  id: number;
  title: string;
  description: string;
  category: ShieldCategory;
  href: string;
  keywords: string;
}

/**
 * The owner Shield Center's 50 real workflows. Each entry lands on an
 * implemented admin surface; this catalog is also the source of truth for
 * search, categories, favorites, recent tools, and the public count in UI.
 */
export const SHIELD_FEATURES: readonly ShieldFeature[] = [
  { id: 1, title: "Shield command center", description: "See active risks and recent owner actions in one place.", category: "Triage", href: "/admin", keywords: "dashboard overview status" },
  { id: 2, title: "Open report queue", description: "Jump directly into unresolved player reports.", category: "Triage", href: "/admin/reports", keywords: "inbox urgent unresolved" },
  { id: 3, title: "Live chess monitor", description: "Watch every active chess room and attach safely.", category: "Triage", href: "/admin/live", keywords: "games realtime spectate" },
  { id: 4, title: "Live arcade monitor", description: "Moderate active board-game rooms from one feed.", category: "Triage", href: "/admin/live-boardgames", keywords: "arcade board games realtime" },
  { id: 5, title: "Recent action feed", description: "Review the latest owner changes and interventions.", category: "Triage", href: "/admin/audit", keywords: "audit activity history" },

  { id: 6, title: "Player search", description: "Find accounts by username or email with fast filtering.", category: "Players", href: "/admin/users", keywords: "user account lookup" },
  { id: 7, title: "Player dossier", description: "Open ratings, status, reports, warnings, and account facts.", category: "Players", href: "/admin/users", keywords: "profile detail evidence" },
  { id: 8, title: "Login and device history", description: "Inspect recent timestamps, IPs, methods, and user agents.", category: "Players", href: "/admin/users", keywords: "security sessions browser ip" },
  { id: 9, title: "Linked sign-in review", description: "See connected OAuth providers and credential access.", category: "Players", href: "/admin/users", keywords: "google oauth provider authentication" },
  { id: 10, title: "Game and report history", description: "Review total games and every report received by a player.", category: "Players", href: "/admin/users", keywords: "matches complaints history" },

  { id: 11, title: "Private admin message", description: "Send a titled inbox message directly to one player.", category: "Enforcement", href: "/admin/users", keywords: "dm notification contact" },
  { id: 12, title: "Formal warning", description: "Record a durable warning and notify the player.", category: "Enforcement", href: "/admin/users", keywords: "discipline notice" },
  { id: 13, title: "Timed mute", description: "Disable chat for a chosen number of hours.", category: "Enforcement", href: "/admin/users", keywords: "silence chat duration" },
  { id: 14, title: "Unmute player", description: "Restore chat access immediately and record the action.", category: "Enforcement", href: "/admin/users", keywords: "restore chat appeal" },
  { id: 15, title: "Timed or permanent ban", description: "Suspend account access with a reason and optional expiry.", category: "Enforcement", href: "/admin/users", keywords: "suspend block duration permanent" },

  { id: 16, title: "Reinstate player", description: "Remove an account ban after review or appeal.", category: "Recovery", href: "/admin/users", keywords: "unban restore appeal" },
  { id: 17, title: "Rating correction", description: "Repair bullet, blitz, rapid, or classical ratings.", category: "Recovery", href: "/admin/users", keywords: "elo adjust fix" },
  { id: 18, title: "Owner impersonation", description: "Enter a player view with a persistent safety banner.", category: "Recovery", href: "/admin/users", keywords: "login as reproduce support" },
  { id: 19, title: "Block an IP address", description: "Stop credential sign-in and registration from an address.", category: "Recovery", href: "/admin/banned-ips", keywords: "network ban evasion" },
  { id: 20, title: "Unblock an IP address", description: "Remove a network block after verification.", category: "Recovery", href: "/admin/banned-ips", keywords: "network unban restore" },

  { id: 21, title: "Shared-IP comparison", description: "Compare two live players for recent network overlap.", category: "Investigations", href: "/admin/live", keywords: "alts same network compare" },
  { id: 22, title: "Recent IP review", description: "Trace an account's latest login addresses chronologically.", category: "Investigations", href: "/admin/users", keywords: "network login timeline" },
  { id: 23, title: "Alternate-account evidence", description: "Combine shared IP, account age, reports, and history.", category: "Investigations", href: "/admin/users", keywords: "alts ban evasion dossier" },
  { id: 24, title: "Blocked network registry", description: "Search and review every active IP block and reason.", category: "Investigations", href: "/admin/banned-ips", keywords: "banned ip list registry" },
  { id: 25, title: "Authentication method review", description: "Distinguish credentials, Google, and impersonated logins.", category: "Investigations", href: "/admin/users", keywords: "oauth security login method" },

  { id: 26, title: "Report status filters", description: "Switch between open, resolved, dismissed, and all cases.", category: "Reports", href: "/admin/reports", keywords: "queue filter cases" },
  { id: 27, title: "Full report archive", description: "Review past reports without losing resolved evidence.", category: "Reports", href: "/admin/reports", keywords: "history archive resolved" },
  { id: 28, title: "Report evidence detail", description: "Read reason, submitted detail, reporter, target, and time.", category: "Reports", href: "/admin/reports", keywords: "case evidence complaint" },
  { id: 29, title: "Resolve with notes", description: "Close a valid case with a durable resolution summary.", category: "Reports", href: "/admin/reports", keywords: "case close outcome" },
  { id: 30, title: "Dismiss false report", description: "Close invalid or duplicate cases without deleting history.", category: "Reports", href: "/admin/reports", keywords: "case reject duplicate" },

  { id: 31, title: "Attach and spectate", description: "Open any active room without taking a player seat.", category: "Live game", href: "/admin/live", keywords: "watch room observe" },
  { id: 32, title: "Force move", description: "Move a piece by coordinates when repairing a broken room.", category: "Live game", href: "/admin/live", keywords: "board repair move bypass" },
  { id: 33, title: "Load FEN position", description: "Replace the board with a precise chess position.", category: "Live game", href: "/admin/live", keywords: "board fen position repair" },
  { id: 34, title: "Undo latest move", description: "Roll back the most recent move in the attached room.", category: "Live game", href: "/admin/live", keywords: "rollback repair" },
  { id: 35, title: "Engine review", description: "Request hints, current evaluation, or a full-game analysis.", category: "Live game", href: "/admin/live", keywords: "stockfish analysis anti cheat" },

  { id: 36, title: "Adjust clocks", description: "Add time to one player or both during a disruption.", category: "Clock & result", href: "/admin/live", keywords: "time compensation" },
  { id: 37, title: "Freeze clocks", description: "Freeze either side or both while investigating.", category: "Clock & result", href: "/admin/live", keywords: "time stop hold" },
  { id: 38, title: "Pause or resume room", description: "Halt play safely and resume from the same state.", category: "Clock & result", href: "/admin/live", keywords: "game stop continue" },
  { id: 39, title: "Force result or void", description: "Award either side, declare a draw, or void the game.", category: "Clock & result", href: "/admin/live", keywords: "win loss draw cancel outcome" },
  { id: 40, title: "Swap player sides", description: "Correct reversed colors without recreating the room.", category: "Clock & result", href: "/admin/live", keywords: "white black color repair" },

  { id: 41, title: "Clear room chat", description: "Remove the visible conversation from a live room.", category: "Live safety", href: "/admin/live", keywords: "messages clean moderation" },
  { id: 42, title: "Mute room chat", description: "Silence either live player without ending their game.", category: "Live safety", href: "/admin/live", keywords: "messages silence player" },
  { id: 43, title: "System room message", description: "Post a visible moderator notice to both players.", category: "Live safety", href: "/admin/live", keywords: "broadcast notice warning" },
  { id: 44, title: "Private room whisper", description: "Send discreet guidance to either side.", category: "Live safety", href: "/admin/live", keywords: "private message player" },
  { id: 45, title: "Kick with cooldown", description: "Remove a disruptive player and delay re-entry.", category: "Live safety", href: "/admin/live", keywords: "eject remove cooldown" },

  { id: 46, title: "Maintenance mode", description: "Temporarily close the public site while owner access stays open.", category: "Platform", href: "/admin/platform", keywords: "site offline repair" },
  { id: 47, title: "Site-wide announcement", description: "Publish an info or warning banner with optional expiry.", category: "Platform", href: "/admin/platform", keywords: "broadcast banner notice" },
  { id: 48, title: "Live match access rules", description: "Control spectators, chat, guests, time controls, and matchmaking.", category: "Platform", href: "/admin/live", keywords: "config spectators guests matchmaking" },
  { id: 49, title: "Anti-cheat controls", description: "Tune detection, suspicion thresholds, and spectator delay.", category: "Platform", href: "/admin/live", keywords: "integrity detection threshold" },
  { id: 50, title: "Platform analytics", description: "Track users, activity, games, ratings, and time controls.", category: "Platform", href: "/admin/analytics", keywords: "metrics dau mau charts" },
] as const;

if (SHIELD_FEATURES.length !== 50) {
  throw new Error(`Shield Center must contain exactly 50 features; found ${SHIELD_FEATURES.length}.`);
}
