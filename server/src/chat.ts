// Minimal profanity filter. Not exhaustive — masks a small set of common
// slurs/insults and obvious leetspeak variants. Replace with a maintained
// list (e.g. `bad-words`) for production.

const BASE = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "cunt",
  "slut",
  "whore",
  "retard",
  "faggot",
  "nigger",
];

const LEET: Record<string, string> = { a: "[a@4]", e: "[e3]", i: "[i1!]", o: "[o0]", s: "[s5$]", t: "[t7]" };

function toPattern(word: string): RegExp {
  // Each letter may repeat (fuuck) and use leetspeak (sh1t, f@ck).
  const body = word
    .split("")
    .map((c) => `${LEET[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}+`)
    .join("");
  return new RegExp(body, "gi");
}

const PATTERNS = BASE.map(toPattern);

export function cleanChat(text: string): string {
  let out = text.slice(0, 300); // length cap
  for (const re of PATTERNS) {
    out = out.replace(re, (m) => "*".repeat(m.length));
  }
  return out.trim();
}

/** Same word list as cleanChat, but reports rather than masks — used to flag a message for moderator review. */
export function containsProfanity(text: string): boolean {
  return PATTERNS.some((re) => {
    re.lastIndex = 0; // these are "g"-flagged regexes; reset shared state before each stateless test
    return re.test(text);
  });
}
