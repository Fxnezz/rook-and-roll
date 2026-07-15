export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

// Newest first. Bump `version` and prepend an entry whenever a release is worth surfacing to returning users.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026.07",
    date: "2026-07-15",
    items: [
      "Resume card on the homepage for in-progress online games",
      "Puzzle Rush now shows a full run review, not just a final count",
      "Cross-game arcade summary on profiles — total plays and most-played game",
    ],
  },
  {
    version: "2026.06",
    date: "2026-06-01",
    items: [
      "Private room invite codes for playing a friend without matchmaking",
      "Custom starting positions for friend challenges",
      "Bigger bot roster with distinct playing personalities",
    ],
  },
];

export const LATEST_CHANGELOG_VERSION = CHANGELOG[0].version;
