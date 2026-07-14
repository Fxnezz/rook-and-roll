export interface QolFeatureGroup {
  id: string;
  title: string;
  summary: string;
  category: "Navigate" | "Discover" | "Organize" | "Focus" | "Access" | "Reliability";
  enhancements: readonly [string, string, string];
}

/**
 * The user's requested accounting model: one substantial system plus three
 * supporting refinements. 25 groups × 4 shipped improvements = 100.
 */
export const QOL_FEATURES: readonly QolFeatureGroup[] = [
  {
    id: "command-palette",
    title: "Global command palette",
    summary: "Jump to games, routes and player tools from anywhere without digging through menus.",
    category: "Navigate",
    enhancements: ["Cmd/Ctrl + K launcher", "Keyboard result navigation", "Fuzzy title, description and mode search"],
  },
  {
    id: "navigation-history",
    title: "Navigation history",
    summary: "A private, local timeline makes frequently revisited areas one click away.",
    category: "Navigate",
    enhancements: ["Human-readable route labels", "Visit timestamps", "One-click history clearing"],
  },
  {
    id: "pinned-navigation",
    title: "Pinned navigation",
    summary: "Build a personal shortcut shelf that follows you across the arcade.",
    category: "Organize",
    enhancements: ["Pin any current route", "Persistent sidebar shortcuts", "Instant unpin controls"],
  },
  {
    id: "continue-playing",
    title: "Continue playing",
    summary: "Resume the most recent game or activity from the exact route you left.",
    category: "Navigate",
    enhancements: ["Last-played memory", "Elapsed-time context", "Home and command-center resume actions"],
  },
  {
    id: "game-favorites",
    title: "Game favorites",
    summary: "Save a personal shelf of go-to games across every category and mode.",
    category: "Organize",
    enhancements: ["Favorite controls on every card", "Favorites-only filter", "Persistent favorite metadata"],
  },
  {
    id: "custom-collections",
    title: "Custom game collections",
    summary: "Group games into named lists such as Party Night, Brain Training or Quick Breaks.",
    category: "Organize",
    enhancements: ["Create named collections", "Add or remove games in quick view", "Delete collections safely"],
  },
  {
    id: "smart-recommendations",
    title: "Smart recommendations",
    summary: "Suggestions adapt to favorites, play counts, categories and recent activity.",
    category: "Discover",
    enhancements: ["Personal relevance scoring", "Recommendation explanations", "Refreshable suggestion shelf"],
  },
  {
    id: "surprise-me",
    title: "Surprise Me launcher",
    summary: "Start a fitting random game when choosing is harder than playing.",
    category: "Discover",
    enhancements: ["Uses active filters", "Avoids immediate repeats", "Preview-before-launch option"],
  },
  {
    id: "advanced-filters",
    title: "Advanced game filters",
    summary: "Narrow the full library by category, mode, pace and saved status.",
    category: "Discover",
    enhancements: ["Online, bot, local and solo modes", "Quick, medium and deep pace bands", "Clear-all filter action"],
  },
  {
    id: "smart-sorting",
    title: "Smart game sorting",
    summary: "Order results around the current intent instead of accepting one static catalog order.",
    category: "Discover",
    enhancements: ["Recommended ordering", "Most-played and recent ordering", "Alphabetical and favorites-first ordering"],
  },
  {
    id: "game-quick-view",
    title: "Game quick view",
    summary: "Inspect modes, pace and description without losing search and filter context.",
    category: "Discover",
    enhancements: ["Accessible detail dialog", "Direct mode launch buttons", "Copyable deep link"],
  },
  {
    id: "comparison-tray",
    title: "Game comparison tray",
    summary: "Compare up to three candidates side by side before choosing the next game.",
    category: "Discover",
    enhancements: ["Three-game limit guard", "Mode and pace comparison", "Individual remove and clear-all actions"],
  },
  {
    id: "search-memory",
    title: "Search memory",
    summary: "Recent searches return as reusable chips, making repeated discovery faster.",
    category: "Discover",
    enhancements: ["Enter-to-save queries", "De-duplicated recent searches", "Private history clearing"],
  },
  {
    id: "activity-timeline",
    title: "Player activity timeline",
    summary: "Review recent routes and games in one compact, private dashboard.",
    category: "Organize",
    enhancements: ["Play and navigation event types", "Relative timestamps", "Timeline reset control"],
  },
  {
    id: "daily-goals",
    title: "Daily play goals",
    summary: "Choose a realistic session target and watch progress build automatically.",
    category: "Focus",
    enhancements: ["Adjustable 1, 3 or 5 play targets", "Automatic daily rollover", "Local completion streak"],
  },
  {
    id: "focus-sessions",
    title: "Focus sessions",
    summary: "Run intentional play or training blocks with a visible timer and calmer interface.",
    category: "Focus",
    enhancements: ["15, 25 and 45 minute presets", "Pause and resume", "Optional interface focus mode"],
  },
  {
    id: "accessibility-presets",
    title: "Accessibility presets",
    summary: "Apply coordinated visual, motion and sound choices instead of adjusting settings one by one.",
    category: "Access",
    enhancements: ["Comfort preset", "Low-sensory preset", "High-visibility preset"],
  },
  {
    id: "interface-density",
    title: "Interface density controls",
    summary: "Choose compact, comfortable or spacious layouts across shared QOL surfaces.",
    category: "Access",
    enhancements: ["Three density levels", "Instant live application", "Persistent device preference"],
  },
  {
    id: "sidebar-customization",
    title: "Sidebar customization",
    summary: "Hide navigation destinations that are not part of the player's routine.",
    category: "Organize",
    enhancements: ["Per-item visibility toggles", "Protected home access", "Restore-all action"],
  },
  {
    id: "shortcut-manager",
    title: "Keyboard shortcut manager",
    summary: "Navigate major areas and open tools without taking hands off the keyboard.",
    category: "Navigate",
    enhancements: ["Alt-based route shortcuts", "Question-mark help shortcut", "Global shortcut enable switch"],
  },
  {
    id: "context-actions",
    title: "Context-aware page actions",
    summary: "The command center adapts useful actions to the route currently being viewed.",
    category: "Navigate",
    enhancements: ["Copy current link", "Pin current page", "Favorite current registered game"],
  },
  {
    id: "connection-awareness",
    title: "Connection awareness",
    summary: "Know when the browser is offline and recover cleanly instead of wondering why actions stall.",
    category: "Reliability",
    enhancements: ["Live online/offline badge", "Persistent offline banner", "Retry and refresh action"],
  },
  {
    id: "onboarding-checklist",
    title: "Resumable onboarding checklist",
    summary: "A lightweight checklist introduces powerful tools without blocking play.",
    category: "Access",
    enhancements: ["Automatic milestone completion", "Dismiss and restore", "Progress percentage"],
  },
  {
    id: "data-portability",
    title: "QOL data portability",
    summary: "Own local preferences with export, validated import and a deliberate reset flow.",
    category: "Reliability",
    enhancements: ["Human-readable JSON export", "Validated state import", "Two-step destructive reset"],
  },
  {
    id: "feature-ledger",
    title: "100-feature What's New ledger",
    summary: "See exactly what shipped, why it matters and how the 100-improvement count is composed.",
    category: "Reliability",
    enhancements: ["Searchable feature list", "Category filters", "25-system and 100-improvement totals"],
  },
] as const;

export const QOL_SYSTEM_COUNT = QOL_FEATURES.length;
export const QOL_IMPROVEMENT_COUNT = QOL_FEATURES.reduce(
  (total, feature) => total + 1 + feature.enhancements.length,
  0,
);
