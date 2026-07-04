# ♜ Rook & Roll

A full-stack online chess platform: play a friend on one screen, battle Stockfish bots with
human-like difficulty tiers, or get matched against live opponents with clocks, chat, and
Elo ratings. Original branding, hand-drawn SVG piece sets, and a from-scratch board — no
third-party board skins.

**Live app:** https://rook-and-roll.vercel.app

## Features

- **Custom board** — drag-and-drop + click-to-move, legal-move hints, last-move/check
  highlights, right-click arrows & square annotations, promotion picker, captured-piece
  trays, 4 board themes × 2 original piece sets, synthesized Web Audio sounds (no assets)
- **Full rules** via [chess.js]: castling, en passant, promotion, checkmate/stalemate,
  threefold repetition, 50-move rule, insufficient material; PGN/FEN import & export
- **Stockfish bots** — Stockfish 18 WASM in a Web Worker (never blocks the UI), five tiers
  from *Pip (≈500)* to *Titan (≈2200)*: Skill Level + depth caps + top-N softmax move
  randomization so weak bots blunder like humans; optional eval bar; post-game analysis
  with blunder/mistake/inaccuracy classification and accuracy %
- **Accounts & ratings** — NextAuth (credentials + optional Google), per-time-control Elo
  (bullet/blitz/rapid/classical), rating history charts, game archive with replay viewer
- **Online multiplayer** — dedicated Socket.io server with server-side move validation,
  matchmaking with widening rating bands, clock sync, resign/draw/rematch, reconnect grace
  periods, spectator mode, filtered chat, move rate-limiting + engine-correlation flags
- **Puzzles** — 35 machine-verified tactics (mate-in-2/3s are *proven* by exhaustive
  search), puzzle rating + streaks, daily puzzle, hints
- **Opening explorer** — 57 curated named lines with click-to-play book continuations
- **Games Hub** (`/play`) — the platform beyond chess, same account/nav/theme throughout:
  - **Multiplayer board games** — Connect Four, Tic-Tac-Toe, Checkers, all server-authoritative
    on a second Socket.io namespace: matchmaking, rating-band widening, resign/draw/rematch,
    spectate, invite links, chat. Connect Four and Checkers get their own Elo (`GameRating`
    table); Tic-Tac-Toe is casual-only.
  - **Arcade** — Snake, Tetris (7-bag randomizer, hold, next preview), and 2048, each with a
    Prisma-backed high-score leaderboard (falls back to `localStorage` for guests).
  - **Word Game** — 5-letter/6-guess daily word (deterministic per UTC date) + unlimited
    practice mode, streaks, and a stats modal.
  - **Circuit Dash** — an original 3D arcade racer (Three.js / React Three Fiber): procedural
    closed-loop track, drift-y arcade physics, lap timing, best-lap leaderboard.
  - **Spark's Climb** — an original 2D platformer: run/double-jump, collectibles, hazards,
    multiple levels, per-level best-time leaderboard.
  - Unified profile page (`/u/[username]`) rolls up chess ratings alongside every other
    game's rating/high-score/streak. See [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)
    for sourcing decisions (all Phase 11–15 games were built from scratch; only two public,
    permissively-licensed English word lists are used as data for the word game).

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│   Next.js app    │ ◄────────────► │   Browser         │
│   (Vercel)       │                │   • board UI      │
│   • pages/API    │                │   • Stockfish     │
│   • NextAuth     │                │     Web Worker    │
│   • Prisma       │                └────────┬─────────┘
└────────┬────────┘                          │ WebSocket
         │                                   ▼
         │                          ┌──────────────────┐
┌────────▼────────┐                 │  Realtime server  │
│   Postgres       │ ◄────────────  │  (Railway/Render) │
│   (Neon/Supabase)│    Prisma      │  • Socket.io      │
└─────────────────┘   (optional)    │  • matchmaking    │
                                    │  • move validation│
                                    └──────────────────┘
```

**Why two deployments?** Vercel serverless functions cannot hold persistent WebSocket
connections — every invocation is short-lived. The realtime server (`server/`) is a plain
long-running Node process, so it deploys to an always-on host (Railway, Render, or Fly.io)
and the browser connects to it directly. The Next.js app never proxies game traffic.

Everything degrades gracefully: without `DATABASE_URL` the account/rating features show a
friendly notice (bots, pass-and-play, and puzzles still work); without the realtime server
only `/play/online` is unavailable.

## Local development

Requires **Node.js 20+**.

```bash
# 1. Web app
npm install                  # also copies the Stockfish WASM + generates Prisma client
cp .env.example .env         # then edit (see below); AUTH_SECRET is the only must-have
npm run dev                  # → http://localhost:3000

# 2. Realtime server (optional — needed only for /play/online)
cd server
npm install
npm run dev                  # → ws://localhost:4000

# 3. Database (optional — needed for accounts/ratings/history)
#    Create a free Postgres instance on https://neon.tech or https://supabase.com,
#    put its connection string in DATABASE_URL, then:
npm run db:push
```

### Environment variables

Copy [.env.example](.env.example) and fill in. Summary:

| Variable | Used by | Required | Notes |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Next.js | yes | `openssl rand -base64 32` |
| `AUTH_URL` | Next.js | prod | public URL of the app |
| `DATABASE_URL` | Next.js + realtime | optional | Postgres (Neon/Supabase); enables accounts |
| `GOOGLE_CLIENT_ID/SECRET` | Next.js | optional | enables Google sign-in |
| `NEXT_PUBLIC_SOCKET_URL` | browser | for online play | URL of the realtime server |
| `PORT` | realtime | default 4000 | |
| `CLIENT_ORIGIN` | realtime | yes | comma-separated allowed origins (CORS) |

## Deployment

### 1. Next.js app → Vercel

```bash
npx vercel deploy --prod
```

Set env vars in the Vercel project: `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`,
`NEXT_PUBLIC_SOCKET_URL` (the realtime server URL from step 2). `.vercelignore` keeps the
realtime server out of the upload; `prebuild` copies the Stockfish files and runs
`prisma generate` automatically.

### 2. Realtime server → Railway / Render / Fly.io

The `server/` directory is a self-contained Node package:

- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Env:** `PORT` (platform-provided usually), `CLIENT_ORIGIN=https://your-app.vercel.app`,
  and `DATABASE_URL` if you want finished rated games persisted (also run
  `npx prisma generate --schema ../prisma/schema.prisma` in that case, or vendor the
  schema alongside).

On Render: *New → Web Service → root directory `server`*. On Railway: point the service at
the `server/` subdirectory. Health check: `GET /` returns JSON.

### 3. CORS

The realtime server only accepts Socket.io connections from `CLIENT_ORIGIN` (supports a
comma-separated list, e.g. `https://rook-and-roll.vercel.app,http://localhost:3000`).
If the browser console shows CORS errors on `/socket.io/`, the origin list and
`NEXT_PUBLIC_SOCKET_URL` don't match your actual domains.

### 4. Database

Create a Postgres database (Neon or Supabase free tier is fine), set `DATABASE_URL`
in both deployments, then push the schema once:

```bash
npm run db:push
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js lifecycle (pre-hooks copy engine + prisma generate) |
| `npm run db:push` | push Prisma schema to the database |
| `npm run db:studio` | browse data in Prisma Studio |
| `node scripts/build-puzzles.mjs` | regenerate + re-verify the puzzle bank (seeded, deterministic) |
| `node scripts/copy-engine.mjs` | copy Stockfish WASM into `public/engine/` |
| `server: npm run dev` | realtime server with hot reload (tsx) |

## Admin panel (owner-only)

There is a hidden, owner-only admin console. It is **not** linked anywhere in
the UI, nav, sitemap, or robots.txt, and `/admin` returns a plain 404 to anyone
without a valid admin session.

- **How to open it:** type the key sequence anywhere on the site — the Konami
  code: **↑ ↑ ↓ ↓ ← → ← → b a** — to reveal a password prompt. The key
  sequence is a convenience only; it grants nothing on its own.
- **The real gate is server-side.** The password is checked against a bcrypt
  hash in `ADMIN_PASSWORD_HASH` (never in source or the client bundle). On
  success the server sets a short-lived (30 min), `httpOnly`, `secure` admin
  JWT cookie, entirely separate from normal user sessions. `src/middleware.ts`
  blocks every `/admin` and `/api/admin` route for non-admins before any
  handler runs, and each handler re-verifies independently.
- **Set / rotate the admin password:**
  ```bash
  node scripts/hash-admin-password.mjs 'your-strong-password'
  ```
  Put the printed hash in `ADMIN_PASSWORD_HASH` (escape `$`→`\$` in local
  `.env`; paste raw in Vercel), and set `ADMIN_JWT_SECRET` to a random string.
  Redeploy. If `ADMIN_PASSWORD_HASH` is unset, the admin login route 404s and
  the panel is fully disabled.
- **Rate limiting:** the login endpoint allows 5 failed attempts per IP per 15
  minutes, then returns 429.
- **Audit log:** every admin login (success / failed / blocked) and every admin
  action is appended to the `AdminAuditLog` table with actor, action, target,
  IP, timestamp, and a JSON detail payload. It is append-only (never deleted)
  and viewable/searchable in the admin console. Captured actions include:
  `admin_login_success|failed|blocked`, `impersonate_start|stop`,
  `user_ban|unban|mute|unmute|suspend`, `user_rating_edit`,
  `user_view_private`, `user_notify`, `maintenance_toggle`,
  `broadcast_set|clear`, and any client-logged moderation actions.

### What the console can do
- **Users** (`/admin/users`): search; ban / mute / suspend (temp or permanent,
  enforced at login *and* the realtime handshake); edit ratings (logged as an
  adjustment); view private data (email, IP/login history, OAuth) — access
  logged; impersonate ("login as") with a persistent banner; DM a user's inbox.
- **Live games** (`/admin/live`): connects to the realtime server with an admin
  token; list in-progress games; attach invisibly; set FEN, place pieces, force
  moves/results, add/pause/disable clocks, freeze a side, swap sides, kick a
  player, clear chat, and read a live engine eval.
- **Board games** (`/admin/live-boardgames`): light-touch moderation for the
  Connect Four / Tic-Tac-Toe / Checkers namespace — list live rooms, clear a
  room's chat, kick a player (same admin token + kick-cooldown as chess).
  No god-mode board editing here by design; bans/mutes still live in Users.
- **Platform** (`/admin/platform`): maintenance mode + site-wide broadcasts.
- **Analytics** (`/admin/analytics`) and **Audit log** (`/admin/audit`).

For god-mode to work in production, the realtime server must share
`ADMIN_JWT_SECRET` with the Next.js app (same value on Vercel and Render).

### Verifying access control
Every admin API route and socket event rejects non-admin callers. Quick manual
checks (no admin cookie):

```bash
# Pages + APIs 404 for non-admins (middleware blocks before any handler):
curl -s -o /dev/null -w "%{http_code}\n" https://<app>/admin           # 404
curl -s -o /dev/null -w "%{http_code}\n" https://<app>/api/admin/users  # 404
# Login route 404s entirely when ADMIN_PASSWORD_HASH is unset.
```
On the socket server, `admin:*` events do nothing unless a valid `admin:hello`
token was verified first (see `server/src/index.ts`; verified in the repo's
scripted tests — a forged/absent token is denied and cannot mutate a game).

## Security notes & known limitations

This is a hobby platform, and a couple of integrity shortcuts are worth knowing
before running it as anything more serious:

- **Socket identity is client-asserted.** The realtime server trusts the
  `userId`/`username` a client sends on `queue:join`. Move *legality* is always
  re-validated server-side, but a crafted client could impersonate another
  user's id and affect that user's rating. Before a real launch, pass the
  NextAuth session JWT from the browser and verify it on the server with
  `AUTH_SECRET` (e.g. via `jose`), then derive identity from the verified token.
- **Bot games are self-reported.** `/api/games` records a signed-in user's own
  vs-bot result from the client, so bot-rating gains are not tamper-proof.
  Human-vs-human ratings go through the authoritative realtime server and are
  not self-reported. Make bot games unrated, or move bot play server-side, if
  rating integrity matters.
- Passwords are hashed with bcrypt (cost 12); chat is length-capped, rate-
  limited, and profanity-filtered; move submission is rate-limited per socket.

## Licensing notes

- **Stockfish 18** (bundled WASM build) is **GPLv3** — the engine files are served
  unmodified from `public/engine/`; source: https://github.com/nmrugg/stockfish.js
- Piece sets, board art, logo, and sounds are original to this project.
- Do not use the chess.com name, logo, or artwork — this project is an original work and
  not affiliated with any chess platform or federation. Ratings here are for fun, not FIDE.

[chess.js]: https://github.com/jhlywa/chess.js
