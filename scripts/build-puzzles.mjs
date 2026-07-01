/**
 * Builds src/lib/puzzles/bank.json with machine-verified tactical puzzles.
 *
 * Two sources:
 *  1. Hand-authored mate-in-1 classics — each is verified with chess.js
 *     (move legal + position is checkmate afterwards). Any failure aborts.
 *  2. Generated mate-in-2 / mate-in-3 puzzles — positions are randomly
 *     composed from small material sets, then PROVEN by exhaustive search:
 *     the key move forces mate against every defence, no faster mate exists,
 *     and the key move is unique. The RNG is seeded, so output is stable.
 *
 * Run: node scripts/build-puzzles.mjs
 */
import { Chess } from "chess.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "puzzles", "bank.json");

// ---------------------------------------------------------------------------
// Part 1 — hand-authored mate-in-one classics (verified below)
// ---------------------------------------------------------------------------
const M1 = [
  // [fen, uci, themes, rating] — every entry is verified by chess.js below;
  // anything that isn't a legal move ending in checkmate is rejected loudly.
  ["6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", "e1e8", ["backRankMate"], 640],
  ["4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", "e8e1", ["backRankMate"], 640],
  ["r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", "f3f7", ["scholarsMate", "attackingF7"], 600],
  ["6rk/6pp/7N/8/8/8/8/K7 w - - 0 1", "h6f7", ["smotheredMate", "knightMate"], 900],
  ["k7/8/1QK5/8/8/8/8/8 w - - 0 1", "b6b7", ["queenMate", "endgame"], 520],
  ["7k/8/5N2/8/8/8/8/6RK w - - 0 1", "g1g8", ["arabianMate", "rookMate"], 880],
  ["8/4N1pk/8/8/8/8/8/1K2R3 w - - 0 1", "e1h1", ["anastasiaMate", "rookMate"], 980],
  ["3rkr2/8/8/8/8/7Q/8/4K3 w - - 0 1", "h3e6", ["epauletteMate", "queenMate"], 950],
  ["6k1/4Rppp/8/8/8/8/5PPP/6K1 w - - 0 1", "e7e8", ["backRankMate"], 700],
  ["2k5/1ppp4/8/8/8/8/5PPP/R5K1 w - - 0 1", "a1a8", ["backRankMate"], 660],
  ["8/8/8/8/8/5k2/8/4qK2 b - - 0 1", "e1f2", ["queenMate", "endgame"], 540],
  ["8/8/8/8/8/2k5/1q6/2K5 b - - 0 1", "b2c2", ["queenMate", "endgame"], 560],
  ["7k/7p/8/8/8/8/8/5QK1 w - - 0 1", "f1f8", ["queenMate", "backRankMate"], 600],
];

function verifyM1() {
  const good = [];
  const bad = [];
  for (const [fen, uci, themes, rating] of M1) {
    try {
      const g = new Chess(fen);
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (mv && g.isCheckmate()) good.push({ fen, solution: [uci], themes: [...themes, "mateIn1"], rating });
      else bad.push({ fen, uci, why: mv ? "not mate" : "illegal" });
    } catch (e) {
      bad.push({ fen, uci, why: "invalid: " + e.message });
    }
  }
  return { good, bad };
}

// ---------------------------------------------------------------------------
// Part 2 — generated, exhaustively proven mate-in-N puzzles
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260702);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const FILES = "abcdefgh";
const sqName = (f, r) => FILES[f] + (r + 1);

/** All mover moves that force mate within n mover-moves (exhaustive proof). */
function forcedMates(game, n) {
  const out = [];
  for (const m of game.moves({ verbose: true })) {
    game.move(m);
    if (game.isCheckmate()) {
      out.push(m);
      game.undo();
      continue;
    }
    if (n > 1 && !game.isGameOver()) {
      let allRepliesLose = true;
      for (const r of game.moves({ verbose: true })) {
        game.move(r);
        const wins = forcedMates(game, n - 1).length > 0;
        game.undo();
        if (!wins) {
          allRepliesLose = false;
          break;
        }
      }
      if (allRepliesLose) out.push(m);
    }
    game.undo();
  }
  return out;
}

const MATERIAL_SETS = [
  { white: ["q", "r"], black: [], themes: ["queenRookMate"] },
  { white: ["r", "r"], black: [], themes: ["ladderMate", "rookMate"] },
  { white: ["q", "b"], black: [], themes: ["queenMate"] },
  { white: ["q", "n"], black: [], themes: ["queenMate", "knightMate"] },
  { white: ["r", "n"], black: [], themes: ["rookMate", "knightMate"] },
  { white: ["q"], black: ["r"], themes: ["queenMate"] },
  { white: ["q", "r"], black: ["n"], themes: ["queenRookMate"] },
];

/** Compose a random sparse position: white K + pieces vs black K (+ piece). */
function composePosition(set) {
  const used = new Set();
  const place = () => {
    while (true) {
      const f = Math.floor(rng() * 8);
      const r = Math.floor(rng() * 8);
      const key = f * 8 + r;
      if (!used.has(key)) {
        used.add(key);
        return [f, r];
      }
    }
  };
  // black king biased toward edges (mates live there)
  let bk;
  while (true) {
    bk = place();
    if (bk[0] === 0 || bk[0] === 7 || bk[1] === 0 || bk[1] === 7) break;
    used.delete(bk[0] * 8 + bk[1]);
  }
  let wk;
  while (true) {
    wk = place();
    const d = Math.max(Math.abs(wk[0] - bk[0]), Math.abs(wk[1] - bk[1]));
    if (d > 1) break;
    used.delete(wk[0] * 8 + wk[1]);
  }
  const pieces = [
    { type: "k", color: "w", sq: wk },
    { type: "k", color: "b", sq: bk },
  ];
  for (const t of set.white) pieces.push({ type: t, color: "w", sq: place() });
  for (const t of set.black) pieces.push({ type: t, color: "b", sq: place() });

  // build FEN
  const boardArr = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const p of pieces) boardArr[p.sq[1]][p.sq[0]] = p.color === "w" ? p.type.toUpperCase() : p.type;
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const c = boardArr[r][f];
      if (!c) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += c;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join("/") + " w - - 0 1";
}

/** Back-rank flavoured setup: castled black king, white heavy pieces. */
function composeBackRank() {
  const pawnPatterns = [
    ["f7", "g7", "h7"],
    ["g7", "h7"],
    ["f7", "g6", "h7"],
  ];
  const kingSq = pick(["g8", "h8"]);
  const pawns = pick(pawnPatterns);
  const board = new Map();
  board.set(kingSq, "k");
  for (const p of pawns) board.set(p, "p");
  const heavies = pick([["Q"], ["R"], ["R", "R"], ["Q", "R"]]);
  const files = "abcde";
  for (const h of heavies) {
    while (true) {
      const sq = files[Math.floor(rng() * files.length)] + (1 + Math.floor(rng() * 4));
      if (!board.has(sq)) {
        board.set(sq, h);
        break;
      }
    }
  }
  // optional black defender rook somewhere on back ranks
  if (rng() < 0.5) {
    const sq = pick(["a8", "b8", "c8", "d8", "e8"]);
    if (!board.has(sq)) board.set(sq, "r");
  }
  board.set(pick(["g1", "h1"]), "K");
  for (const p of ["f2", "g2", "h2"]) if (rng() < 0.85) board.set(p, "P");

  const boardArr = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [sq, piece] of board) {
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]) - 1;
    boardArr[r][f] = piece;
  }
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const c = boardArr[r][f];
      if (!c) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += c;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join("/") + " w - - 0 1";
}

function tryMakePuzzle(fen, n, themes) {
  let g;
  try {
    g = new Chess(fen);
  } catch {
    return null;
  }
  if (g.isCheck() || g.isGameOver()) return null;

  // no faster mate, and a UNIQUE key move at depth n
  for (let k = 1; k < n; k++) if (forcedMates(g, k).length > 0) return null;
  const keys = forcedMates(g, n);
  if (keys.length !== 1) return null;
  const key = keys[0];

  // build the principal line, keeping solver moves unique along the way
  const line = [];
  g.move(key);
  line.push(key.from + key.to + (key.promotion ?? ""));
  let depth = n - 1;
  while (depth > 0) {
    // some defences get mated earlier than move n — the line simply ends
    if (g.isCheckmate()) break;
    if (g.isGameOver()) return null;
    // pick the defender's most "resistant" reply that keeps the next key unique
    const replies = g.moves({ verbose: true });
    let chosen = null;
    let chosenNext = null;
    for (const r of replies) {
      g.move(r);
      const next = forcedMates(g, depth);
      if (next.length === 1) {
        chosen = r;
        chosenNext = next[0];
        g.undo();
        break;
      }
      g.undo();
    }
    if (!chosen) {
      // fall back to any reply; final mating move may be non-unique (UI accepts any mate)
      chosen = replies[0];
      g.move(chosen);
      const next = forcedMates(g, depth);
      chosenNext = next[0];
      g.undo();
      if (depth > 1) return null; // only allow non-unique at the final move
    }
    g.move(chosen);
    line.push(chosen.from + chosen.to + (chosen.promotion ?? ""));
    g.move(chosenNext);
    line.push(chosenNext.from + chosenNext.to + (chosenNext.promotion ?? ""));
    depth -= 1;
  }
  if (!g.isCheckmate()) return null;

  const backRank = /[a-h][18]$/.test(line[0].slice(2)) && themes.includes("backRank");
  return {
    fen,
    solution: line,
    themes: [n === 2 ? "mateIn2" : "mateIn3", ...(backRank ? ["backRankMate"] : []), ...themes.filter((t) => t !== "backRank")],
    rating: n === 2 ? 1200 + Math.floor(rng() * 300) : 1700 + Math.floor(rng() * 300),
  };
}

function generate(count, n, composer, themes) {
  const out = [];
  const seen = new Set();
  let attempts = 0;
  while (out.length < count && attempts < 60000) {
    attempts++;
    const fen = composer();
    if (seen.has(fen)) continue;
    seen.add(fen);
    const p = tryMakePuzzle(fen, n, themes);
    if (p) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
console.log("Verifying hand-authored mate-in-1 puzzles…");
const { good: m1, bad } = verifyM1();
console.log(`  ✓ ${m1.length} verified, ✗ ${bad.length} rejected`);
for (const b of bad) console.log(`    rejected: ${b.fen} ${b.uci} (${b.why})`);
if (bad.length > 0) {
  console.error("Hand-authored puzzles failed verification — fix them before shipping.");
  process.exit(1);
}

console.log("Generating proven mate-in-2 (endgame)…");
const m2a = generate(10, 2, () => composePosition(pick(MATERIAL_SETS)), ["endgame"]);
console.log(`  ✓ ${m2a.length}`);
console.log("Generating proven mate-in-2 (back rank)…");
const m2b = generate(8, 2, composeBackRank, ["backRank"]);
console.log(`  ✓ ${m2b.length}`);
console.log("Generating proven mate-in-3…");
const m3 = generate(4, 3, () => composePosition(pick(MATERIAL_SETS)), ["endgame"]);
console.log(`  ✓ ${m3.length}`);

const all = [...m1, ...m2a, ...m2b, ...m3].map((p, i) => ({ id: `p${String(i + 1).padStart(3, "0")}`, ...p }));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(all, null, 2));
console.log(`\nWrote ${all.length} puzzles to ${OUT}`);

// Final re-verification pass of EVERYTHING that goes in the bank.
let ok = true;
for (const p of all) {
  const g = new Chess(p.fen);
  for (const uci of p.solution) {
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!mv) {
      console.error(`RE-VERIFY FAIL ${p.id}: illegal ${uci}`);
      ok = false;
      break;
    }
  }
  if (!g.isCheckmate()) {
    console.error(`RE-VERIFY FAIL ${p.id}: line does not end in mate`);
    ok = false;
  }
}
console.log(ok ? "Re-verification passed for every puzzle in the bank." : "RE-VERIFICATION FAILURES — do not ship.");
process.exit(ok ? 0 : 1);
