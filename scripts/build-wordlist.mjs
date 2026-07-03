/**
 * Builds src/lib/wordgame/{answers,guesses}.json from two open word lists —
 * see THIRD_PARTY_LICENSES.md for sourcing/licensing.
 *
 *   node scripts/build-wordlist.mjs
 *
 * Requires /tmp/google10k_clean.txt and /tmp/dwyl_words.txt (fetched once via
 * curl from first20hours/google-10000-english and dwyl/english-words).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

function read5(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  const set = new Set();
  for (const raw of lines) {
    const w = raw.trim().toLowerCase();
    if (w.length === 5 && /^[a-z]+$/.test(w)) set.add(w);
  }
  return set;
}

// Explicit/adult terms that can slip through frequency corpora — excluded
// from both the answer pool AND the guess dictionary for a general audience.
const EXPLICIT = new Set([
  "boobs", "booty", "busty", "babes", "cocks", "dicks", "dildo", "horny",
  "penis", "porno", "pussy", "sluts", "whore", "bitch",
]);

// Common first names — fine as English *words* in some dictionaries, but a
// poor daily-puzzle ANSWER (no way to deduce a name from letter feedback).
const NAMES = new Set(`
aaron adams alice allan allen andrew annie barry betty blair blake brian
bruce bryan burke carey carlo carlos carol casey chris chuck cindy colin
craig danny david davis derek devon diana diane edgar eddie ellen elvis
emily evans floyd frank glenn harry hayes helen henry isaac jacob james
jamie janet jason jenny jerry jesse jimmy johns jones joyce julia julie
karen kathy katie keith kelly kenny kevin larry laura lewis linda lloyd
logan louis lucia marco maria marie mario moore moses nancy oscar perry
peter ralph randy ricky robin roger sally sarah scott simon singh steve
susan teddy terry tyler wayne wendy jesus
`.trim().split(/\s+/));

// Places, nationalities, religions, and brand names — real words, but odd
// answers for a puzzle (and "Islam"/"Allah" as a guessing-game answer is in
// poor taste regardless of word-list provenance).
const PLACES_BRANDS = new Set(`
allah egypt ghana haiti india iraqi irish islam italy japan kenya korea
malta miami milan nepal omaha papua paris qatar samoa saudi spain sudan
syria tampa texas tokyo tulsa vegas wales yemen yukon china cuba congo
leeds essex dover adobe cisco honda kodak mazda nikon xerox yahoo chevy
`.trim().split(/\s+/));

// Informal contractions / acronyms / keywords that leaked into the corpus —
// not real standalone dictionary words.
const NOT_WORDS = new Set(["gonna", "wanna", "thats", "whats", "ascii", "const"]);

const EXCLUDE_FROM_ANSWERS = new Set([...NAMES, ...PLACES_BRANDS, ...NOT_WORDS]);

const common = read5("/tmp/google10k_clean.txt");
const dict = read5("/tmp/dwyl_words.txt");

const answers = [...common]
  .filter((w) => dict.has(w) && !EXCLUDE_FROM_ANSWERS.has(w) && !EXPLICIT.has(w))
  .sort();

const guessSet = new Set([...dict, ...answers].filter((w) => !EXPLICIT.has(w)));
const guesses = [...guessSet].sort();

mkdirSync("src/lib/wordgame", { recursive: true });
writeFileSync("src/lib/wordgame/answers.json", JSON.stringify(answers));
writeFileSync("src/lib/wordgame/guesses.json", JSON.stringify(guesses));

console.log(`answers: ${answers.length}`);
console.log(`guesses: ${guesses.length}`);
