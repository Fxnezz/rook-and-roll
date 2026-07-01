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

## Licensing notes

- **Stockfish 18** (bundled WASM build) is **GPLv3** — the engine files are served
  unmodified from `public/engine/`; source: https://github.com/nmrugg/stockfish.js
- Piece sets, board art, logo, and sounds are original to this project.
- Do not use the chess.com name, logo, or artwork — this project is an original work and
  not affiliated with any chess platform or federation. Ratings here are for fun, not FIDE.

[chess.js]: https://github.com/jhlywa/chess.js
