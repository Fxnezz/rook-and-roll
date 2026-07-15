# Rook & Roll — AI Coder Handoff Document

> **Audience:** an AI coding assistant picking up this project with **workspace access only**.
> You do NOT have access to Vercel, Render, the Neon dashboard, GitHub settings, or any external
> service consoles. Everything you need is in this repo, the `.env` file, and the local dev server.
> **Last updated:** 2026-07-14, branch `phase-1-local-chess`.

---

## 1. What this project is

**Rook & Roll** is a full chess platform plus a ~70-game mini-games arcade, built from scratch.
Think "indie chess.com": online rated play with clocks and chat, Stockfish bot opponents,
puzzles, training tools, friends/challenges, achievements, moderation tooling, and a Games Hub
of board/arcade games (Othello, Quoridor, Solitaire, Tetris-likes, casino games, etc.) — all
under one account system and one dark amber-on-slate theme.

**Hard rule from the owner:** all art is original — no borrowed images, sprites, or fonts from
other chess sites. SVG drawn in-repo is the standard (see `src/lib/pieces`, `src/components/bot/BotAvatar.tsx`).

---

## 2. Stack & architecture

| Layer | Tech | Notes |
|---|---|---|
| Web app | Next.js **App Router** (`src/app/…`) | ⚠️ `AGENTS.md` warns this Next version has breaking changes vs. your training data. Read `node_modules/next/dist/docs/` before writing framework-level code. Params are `Promise` in route handlers/pages (`await params`). |
| Styling | Tailwind v4 + CSS variables | All colors are CSS custom properties in `src/app/globals.css` (`--bg`, `--accent: #e9a23b` amber, `--good`, `--bad`, etc.). Utility classes `.panel`, `.btn`, `.btn-primary`, `.btn-ghost`, `.chip`, `.input`, `.label` are defined there. **Never hardcode colors; use the variables.** |
| DB | Prisma + PostgreSQL (Neon, serverless) | `prisma/schema.prisma`. Connection string in `.env` (`DATABASE_URL`). Schema changes via `npx prisma db push` (no migration files), then `npx prisma generate`. |
| Auth | NextAuth (credentials provider) | `src/lib/auth/auth.ts`, bcrypt password hash, register at `POST /api/register`. |
| Realtime | Standalone Socket.IO server in `server/` | Separate TypeScript project (own `tsconfig`/`package.json`). Handles online matchmaking, game rooms, clocks, chat, presence, challenges, spectating, moderation commands. Deployed to Render (you can't touch that; just keep `cd server && npx tsc --noEmit` clean). |
| Engine | Stockfish WASM | `public/engine/stockfish-18-lite-single.js`, wrapped by `src/lib/engine/stockfish.ts` (`getEngine()`, `go()` with MultiPV, `evaluate()`, `setSkillLevel()`). Client-side only. |
| Chess logic | `chess.js` | Central client hook: `src/lib/chess/useChessGame.ts`. |

### Two-process protocol mirroring (critical convention)
The web client and the realtime server intentionally **duplicate** shared logic; both sides must
be edited together:
- `src/lib/online/protocol.ts` ↔ `server/src/protocol.ts` (socket message types)
- `src/lib/achievements/award.ts` ↔ `checkAndAwardAchievements` inside `server/src/persistence.ts`
  (achievement award logic + `RATING_MILESTONES`)
- Elo update logic exists in both `src/lib/ratings/elo.ts` usage (bot games, `src/app/api/games/route.ts`)
  and `server/src/persistence.ts` (online games).

If you touch one side, mirror the change on the other and typecheck both.

---

## 3. Environment & how to run

- **Node** is installed locally at `~/.local/node` and symlinked so spawned processes find it.
- **Dev server:** use the Claude preview tool with launch config name `dev` (defined in
  `.claude/launch.json`), which runs the Next dev server on port 3000. If you're a different
  harness: `npm run dev` from the repo root. The Socket.IO server is NOT needed for most work;
  online-play pages degrade gracefully without it.
- **Typecheck (the verification baseline for every change):**
  ```bash
  npx tsc --noEmit          # repo root
  cd server && npx tsc --noEmit
  ```
  There is no test suite; verification = typecheck + live browser spot-checks.
- **DB is the LIVE production Neon database** — the `.env` points at real data (real users:
  Sam, Sam_B, victim, Noah…). Be careful. Established safe pattern for testing flows that need
  an account: create a throwaway via `POST /api/register` in the browser, exercise the flow,
  then delete the user + their games with a one-off Prisma script (see §8 "scratch script pattern").
- **Prisma gotcha:** after `prisma db push` + `generate`, a long-running dev server still holds
  the OLD Prisma client in memory — fully restart the dev server or you'll get unknown-column
  errors.

---

## 4. Git state — READ THIS FIRST

- Branch: `phase-1-local-chess` (this is the working branch; `main` is behind).
- Last commit: `708d295` — "Add 60 quality-of-life features…" (pushed to origin).
- **Everything since is UNCOMMITTED working-tree changes**, comprising two rounds of work:
  1. ✅ **"50 advanced chess features" round — COMPLETE and verified** (details §6).
  2. 🔨 **"chess.com-style design overhaul" round — IN PROGRESS** (details §7). This is the
     active task.
- **Do NOT commit / push / deploy without the user's explicit go-ahead.** The owner ships each
  round as one combined commit after personally confirming. (Deploys are currently broken anyway
  — see §9.)

---

## 5. Codebase map (the parts you'll actually touch)

```
src/app/
  page.tsx                     Homepage (being redesigned — see §7)
  layout.tsx                   Root layout: Header + <main>, maintenance mode, broadcast banner
  globals.css                  ALL theme variables + shared component classes
  play/online/page.tsx         Online play (socket client, ~1200 lines)
  play/bot/page.tsx            Bot play (~1100 lines: hints, threats, eval bar, premoves, cheats panel)
  play/local/page.tsx          Pass & play (variants: three-check/KOTH/armageddon, time odds)
  play/page.tsx + play/…       Games Hub + ~70 mini-games
  analysis/page.tsx            Free analysis board (engine lines, FEN/PGN import, threat arrows)
  openings/page.tsx            Opening drill trainer (189-line book)
  training/…                   Hub + coordinates/checkmates/endgames/guess/editor/exhibition
  puzzles/page.tsx             Daily puzzle, rated puzzles, Puzzle Rush, streak calendar
  games/page.tsx               Game history (filters, favorites, PGN import, accuracy chips)
  games/[id]/page.tsx          Replay page → ReplayViewer
  u/[username]/page.tsx        Profile (ratings charts, breakdowns, records, heatmap)
  friends/page.tsx             Friends, challenges (custom FEN + startFen deep link)
  leaderboard/, watch/[roomId], mod/…, settings/account/
  api/…                        REST routes (games save/import/accuracy, me, friends, notifications, register, …)

src/components/
  board/Board.tsx              THE chess board (drag+click, premove ghost, arrows, a11y grid, hidePieces)
  game/                        MoveList, Clock, EvalBar, EngineLines, ReplayViewer, SharePanel (+share card),
                               OpeningTicker, MaterialTimeline, PieceActivityHeatmap, TimeUsageChart,
                               SanMoveInput, GameAccuracyBadge, AnalyzeAllButton, GameImportButton,
                               GameOverModal (rematch/series props), OpeningExplorer, ChatPanel
  bot/BotSetup.tsx             Bot game config screen (being redesigned — see §7)
  bot/BotAvatar.tsx            NEW: original SVG portraits for all 13 bots (see §7)
  bot/AnalysisPanel.tsx        Post-game engine review UI (accuracy, move-quality rows, retry links)
  ui/Header.tsx                Top nav (being converted to sidebar — see §7), SlideOver, icons.tsx
  profile/, settings/, mod/…

src/lib/
  engine/bots.ts               BOT_TIERS: 13 bots w/ id, name, fullName, flag, elo, blurb, skill/depth/
                               multipv/temperature, accent color, personality; chooseMove() softmax
  engine/stockfish.ts          Engine singleton wrapper
  engine/analysis.ts           analyzeGame(): per-move quality (brilliant…blunder), accuracy, keyMoments
  chess/useChessGame.ts        Core hook. snapshot.moves = verbose Move[]; makeMove/makeSanMove;
                               ⚠️ snapshot.status is viewPly-gated (only real when isLive) — for final
                               results use the DB `result` field, never snapshot.status in replays
  chess/useClock.ts            Clocks: Fischer increment, US delay, Bronstein (custom:${ms}:${ms}:${mode} ids)
  chess/useSettings.tsx        ~50 settings incl. analysisDepth 8|12|16, blindfoldBot, hintMode
  chess/variants.ts, odds.ts   Local variants + handicap-odds FEN generator
  openings/                    lines.json (189 ECO lines), index.ts (openingFor/bookDepth), heal.ts
                               (ensureOpenings() backfills missing opening/eco columns on read)
  ratings/elo.ts, performance.ts
  achievements/catalog.ts, award.ts
  db/profileStats.ts           computeProfileExtras(): color/category/termination splits, openings report,
                               personal records, best win/toughest loss, opponents table
  games/history.ts             fetchGameHistory() cursor pagination
  training/checkmates.ts, endgames.ts   (all positions machine-validated — keep it that way)

server/src/
  index.ts                     Socket handlers, matchmaking, challenges (startFen), rematch color-swap
  GameRoom.ts                  Authoritative game room (activeColor = chess.turn() — don't regress this)
  persistence.ts               DB writes, Elo, achievements mirror, presence lookups
  protocol.ts                  Mirror of client protocol
```

### Key Prisma models (see schema for full list)
`User` (ratings per category, puzzleRating, moderation fields, bio, pinned achievement),
`Game` (whiteId/blackId nullable, opponentType HUMAN|BOT, botTier, opening/eco, moveTimes Json,
accuracyW/accuracyB, imported flag, rating before/after per side, favorited), `Move`,
`RatingHistory`, `PuzzleAttempt`, `Friendship` (status incl. BLOCKED/DECLINED), `Notification`
(type+href), `Achievement`/`UserAchievement`, `Report`, moderation tables.

---

## 6. Recently completed (uncommitted): the 50 advanced chess features

All complete, typechecked, and live-verified. Batches (internal task ids #230–236):

- **A — Analysis board:** `/analysis` page, `EngineLines.tsx`, analysis-depth setting wired into
  every `analyzeGame` call, "brilliant" quality tier, key-moments list, threat button, nav link.
- **B — Openings:** 189-line ECO book (`lines.json` — machine-validated), `openingFor()`,
  `OpeningTicker` on all play pages, `opening`/`eco` Game columns + save-time detection +
  `heal.ts` read-time backfill, ECO chips, profile "most-played openings", `/openings` drill page.
- **C — Training:** `/training` hub, blindfold mode, `/training/coordinates`, `/training/checkmates`
  (11 validated mate-in-1 drills), `/training/endgames` (10 positions vs engine), `/training/guess`
  (quiz on your own games, `api/me/guess-the-move`), retry-your-mistakes links in AnalysisPanel,
  daily-puzzle streak calendar (localStorage `rr.puzzles.daily.v1`).
- **D — Variants & editor:** knight/rook/queen/queen+rook odds (`odds.ts` → BotSetup → startFen),
  local variants three-check / King of the Hill / Armageddon (`variants.ts`; armageddon docks
  Black 60s and remaps draws via `effectiveStatus`), board editor `/training/editor` (click +
  drag-drop palette, castling/EP controls, play-out links), `?fen=` deep links on local/friends pages.
- **E — Clocks & online depth:** `DelayMode` = increment | us | bronstein in `useClock.ts`
  (backward-compatible custom TC ids), delay-mode selects in BotSetup + local page, premove
  QUEUES (max 3, `premoveQueue` arrays in bot+online pages, "Premove ×N" chip), rematch series
  score (client-side, both modes) + bot rematch color swap, `GameOverModal` rematch/series props.
- **F — Insights:** est. performance rating (`ratings/performance.ts`, ±400 approximation) shown
  in bot/online/replay analysis tabs, `MaterialTimeline`, `PieceActivityHeatmap`, rating-milestone
  achievements (1200…2000, both award mirrors), profile personal records / best win / toughest
  loss / opponents table (`profileStats.ts` + `ProfileBreakdowns.tsx`), downloadable share-card
  PNG (`renderShareCard` in `SharePanel.tsx`, wired in replay/bot/online).
- **G — Power tools:** PGN paste-import (`api/games/import` — rejects illegal PGNs, detects
  opening, `imported` flag + chip), per-game + analyze-all accuracy persistence
  (`api/games/[id]/accuracy`, `GameAccuracyBadge`, `AnalyzeAllButton`), engine-vs-engine
  exhibition `/training/exhibition`, second-best "lighter nudge" hint mode (settings.hintMode),
  keyboard SAN entry (`makeSanMove` in useChessGame + `SanMoveInput` on bot/local), mid-game
  eval-bar toggle on bot page.

**Two React gotchas discovered this round (avoid regressions):**
1. Effects run in declaration order — an effect that must win over an earlier reset effect
   (e.g. armageddon clock docking after the TC-reset effect) must be declared AFTER it.
2. React 18 Strict Mode double-invokes setState updater functions in dev; `useClock.ts`'s
   `setActive(cur => { sideEffects; return cur })` pattern makes dev-mode clocks tick fast.
   Production is unaffected. Pre-existing; don't chase it as a bug.

---

## 7. ACTIVE WORK: chess.com-style design overhaul (tasks #237–242)

**User instruction (verbatim intent):** "make the design 10x better, basically copy chess.com,
keep the colours though, and give all the bots proper names and profile pictures."

Interpretation agreed: adopt chess.com's *layout language* (left sidebar nav, 3D raised buttons,
jumbo CTAs, bot-picker with avatar spotlight) while keeping this project's existing amber/dark
CSS-variable palette and 100% original SVG art.

### Task status
- **#237 Bot identities — ~90% done:**
  - ✅ `src/lib/engine/bots.ts`: every `BotTier` now has `fullName` + `flag`:
    Pip Ellison 🇬🇧 400, Milo Ferreira 🇧🇷 550, Nell Okafor 🇳🇬 700, Beau Lambert 🇫🇷 850,
    Cass Delgado 🇪🇸 1000, Rosa Marchetti 🇮🇹 1150, Wren Kobayashi 🇯🇵 1300, Dex Mercer 🇺🇸 1450,
    Ilsa Bergström 🇸🇪 1600, Vera Kowalska 🇵🇱 1750, Zephyr Cole 🇨🇦 1900, TITAN-7 🤖 2150,
    The Omen 🌑 2400.
  - ✅ `src/components/bot/BotAvatar.tsx` created: parametrized original SVG portraits —
    shared primitives (Backdrop gradient from tier accent, Shoulders, Head, Eyes, Smile,
    Glasses…) + a bespoke portrait function per bot (Pip: backwards cap + freckles; Milo: curly
    mop; Nell: afro puffs; Beau: plaster on cheek; Cass: stubble; Rosa: waves + hoops; Wren: bob
    + round glasses; Dex: flat-top + beard; Ilsa: ponytail; Vera: bun + rect glasses; Zephyr:
    silver spikes + scar; TITAN-7: robot visor; The Omen: hooded, glowing amber eyes).
    Exported API: `<BotAvatar tierId size rounded="lg"|"full" />`.
  - ⚠️ **NOT yet typechecked or rendered.** Known cleanup needed: in `Wren()` the palette
    literal `hair: "#191持1f"` contains a stray CJK character (it's a dead value — a local
    `hair` const overrides it — but fix it to `"#1b1b22"` and drop the `as string`). Run
    `npx tsc --noEmit` and eyeball every avatar in the browser before moving on.
- **#238 (pending) 3D buttons/panels:** in `globals.css`, give `.btn-primary` the chess.com
  raised-edge treatment (`box-shadow: 0 4px 0 var(--accent-dim)`, translate-down + shadow-collapse
  on `:active`) and add a `.btn-cta` jumbo variant (larger padding/font, same 3D edge, optionally
  a `--good`-green variant for "Play" using the EXISTING `--good` variable). Slightly larger
  panel radii. Do not introduce new colors.
- **#239 (pending) Left sidebar nav:** rework `src/components/ui/Header.tsx` into a fixed left
  sidebar on `md+` (logo top; big icon+label nav: Play Chess, Bots, Pass & Play, Games Hub,
  Puzzles, Training (add it — currently missing from NAV), Analysis, Leaderboard; bottom section:
  ActiveGameIndicator, NotificationBell, Settings, UserMenu, mod shield). Keep the existing
  mobile top bar + left SlideOver exactly as-is below `md`. Add the content offset in
  `src/app/layout.tsx` (e.g. wrap `<main>` in `md:pl-[220px]`). All pages use their own
  `mx-auto max-w-*` containers so they re-center automatically.
- **#240 (pending) Homepage hero:** rebuild `src/app/page.tsx` chess.com-style — full 8×8
  decorative board (use `Piece` from `src/lib/pieces`, e.g. an Italian Game position) on the
  left; right column: bold headline, two JUMBO stacked CTAs ("Play Online" primary, "Play Bots"
  showing a row of `BotAvatar`s), then compact link tiles (Puzzles / Analysis / Training /
  Games Hub). Keep the existing "More than chess" arcade section somewhere below.
- **#241 (pending) Bot picker + in-game avatars:** redesign `BotSetup.tsx` — top spotlight card
  of the selected bot (large `BotAvatar`, fullName, flag, elo, blurb, personality tag) and the
  13 bots as avatar TILES grouped under difficulty headers (Beginner 400–700, Intermediate
  850–1300, Advanced 1450–1900, Master 2150+), keeping ALL existing functionality: recommended
  badge (blitz-rating match), color choice, time controls + custom TC + delay mode, handicap
  odds, eval toggle, rules modal, `?fen=` deep-link support (check how the page reads it).
  Then replace the initial-letter circles with `BotAvatar` in `src/app/play/bot/page.tsx`
  (player row, ~line 764 area: `{isBot ? tier.name[0] : "You"[0]}`) and, where cheap, in
  `GameOverModal` and the bot-spectator/watch surfaces. Consider showing `tier.fullName` + flag
  in-game where `tier.name` appears (keep short name in tight chips).
- **#242 (pending) Verify:** `npx tsc --noEmit` (root; server untouched by this round),
  browser screenshots of homepage/sidebar/bot picker/in-game at desktop AND mobile
  (`preview` tools; resize or narrow viewport), check `/settings` SlideOver still opens from
  both bars, no console errors. **No commit/push/deploy** — user confirms first.

### Design-overhaul constraints
- **Keep the color system exactly as-is** (`--accent` amber etc.). chess.com's green is NOT
  wanted except via the existing `--good` variable if a green CTA is chosen.
- Original SVG art only.
- Don't break a11y work: skip-links, aria-grid board, focus traps, `reduceMotion` setting,
  `uiTextScale`, high-contrast mode — test the sidebar with keyboard nav.
- Many pages assume a top header height only on mobile after #239 — watch `sticky` elements
  (e.g. in-game side panels) for overlap with the new sidebar.

---

## 8. House conventions & workflows

1. **Batch → typecheck → live-verify → task-complete.** Work in labeled batches, run
   `npx tsc --noEmit` (and the server one when `server/` is touched) after each, spot-check the
   riskiest UI in the running dev server, then move on. Use the harness task list if available.
2. **Scratch-script validation pattern:** for anything chess-positional (FENs, opening lines,
   puzzle solutions, odds positions), write a throwaway `validate.mjs` at repo root using
   chess.js, run `node validate.mjs`, fix, re-run to 0 problems, then `rm -f` it. Same pattern
   for one-off DB backfills/cleanup (`new PrismaClient()` inline scripts).
3. **DB test-account etiquette:** register via the API, verify the flow, then delete the user
   AND their games via a scratch Prisma script. Never mutate the real users.
4. **`ensureOpenings()`** heals missing opening/eco columns on read — new Game-reading queries
   that want openings should pass rows through it rather than assuming the columns are set.
5. **Comments**: sparse, only for non-obvious constraints (see existing files for tone).
6. **Settings** live in `useSettings.tsx` (localStorage `rr.settings.v1`) + a control in
   `SettingsPanel.tsx`; follow the existing Toggle/Segmented/Slider components.
7. **Icons**: add to `src/components/ui/icons.tsx` following the existing `base(p)` pattern.

---

## 9. Known outstanding issues (do not "fix" without the user)

1. **Vercel auto-deploy is broken** — the GitHub→Vercel webhook stopped firing days ago; the
   last 3+ commits never deployed. Only the user can fix it (dashboard → Settings → Git or
   manual Redeploy). You cannot deploy; don't try to work around it by other means.
2. **Offensive username `IWillRapeSam` exists in the live DB.** Flagged to the user; they have
   not yet said whether to remove/rename it or handle it via their in-app mod panel. Await
   instruction; don't act unilaterally.
3. **Dev-only clock overcount** from Strict Mode double-invocation (see §6). Cosmetic in dev,
   absent in prod builds. Pre-existing.
4. The `phase-1-local-chess` branch has never been merged to `main`; that's a user decision.

---

## 10. Quick-start checklist for the incoming AI

```bash
cd "/Users/sam/Desktop/Claude code - chess"
git status                      # expect ~40 modified + ~25 new uncommitted files — that's correct
npx tsc --noEmit                # should pass EXCEPT possibly BotAvatar.tsx (new, unchecked)
cd server && npx tsc --noEmit   # should pass
# start dev server (launch.json name: "dev", port 3000) and browse:
#   /  /play/bot  /analysis  /training  /training/exhibition  /openings  /games  /u/Sam
```

Then resume at **§7, task #237**: typecheck + visually verify `BotAvatar.tsx` (fix the Wren
palette literal), and proceed through #238–242 in order. Ship nothing until the user says so.
