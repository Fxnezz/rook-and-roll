# Third-party content & code

Sam's Arcade's own game logic, board/UI components, and server code are original
to this project. This file documents every piece of external content actually
vendored into the repo, per the project's sourcing policy (search first,
verify the license, adapt to the codebase, document it here — never GPL, never
unofficial clones of trademarked commercial games).

## Sourcing decision: games hub (Phases 11–15)

Before building each new game (Connect Four, Tic-Tac-Toe, Checkers, Snake,
Tetris, 2048, the word game), a GitHub search was performed for a
well-maintained, permissively-licensed reference implementation. Results for
every game were small, self-contained tutorial/personal projects (different
build tooling — CRA/Vite/RxJS/Redux/Phaser/NestJS —, no server-authoritative
multiplayer, no fit with this project's Next.js App Router + Socket.io +
Prisma + design-system patterns). Adapting any of them faithfully would cost
more engineering time than writing fresh, idiomatic code directly against this
codebase's existing patterns (the same `GameRoom`/matchmaking/rating
architecture already built for chess), and avoids any license-compliance
ambiguity in the process. **All game logic and UI in Phases 11–15 is therefore
original, written from scratch** — no code was copied from any external
repository. Repos found during the search (for reference, not used):
tbassetto/connect-four-react-typescript, jeffmur/Checkers-Multiplayer,
keyurparalkar/snake-game, Prior99/tetris, jinhucheung/2048-react,
pip8786/wordle, among others — all MIT or similar, none integrated.

The 3D racing game (Phase 14) and platformer (Phase 15) are original concepts
with original theming, per this project's explicit non-goal of never cloning
existing commercial/trademarked games.

## Word lists (Phase 13 — word game)

Word lists are data, not creative works, so — per the sourcing policy — these
are used directly rather than reimplemented:

- **[google-10000-english](https://github.com/first20hours/google-10000-english)**
  by Josh Kaufman / Peter Norvig — MIT license (Norvig's contribution) over a
  frequency list derived from Google's Trillion Word Corpus (LDC license
  permits personal/research use; US fair use doctrine also applies to the
  underlying n-gram data). Used as the **daily-answer pool**: filtered to
  common 5-letter words so daily puzzles are recognizable words, not obscure
  ones.
- **[english-words](https://github.com/dwyl/english-words)** by dwyl —
  **Unlicense** (public domain). Used as the **valid-guess dictionary**:
  filtered to all 5-letter entries so any real word is accepted as a guess,
  independent of how common it is.

Deliberately **not** used: word lists extracted directly from the NYT
Wordle's own source code (e.g. tabatkins/wordle-list, cfreshman's gists) or
from the Scrabble dictionary — both are tied to a specific commercial game's
curated word selection, which this project avoids for the same reason it
avoids chess.com's branding: original assets/content only, not lifted from a
named commercial product.

## Chess engine

- **Stockfish 18** (`stockfish` npm package, bundled WASM build) — **GPLv3**.
  Served unmodified from `public/engine/`, invoked as a separate WASM process
  via a Web Worker (not statically linked into the app's own code), consistent
  with how Stockfish is used by virtually every chess site that offers engine
  play. Source: https://github.com/nmrugg/stockfish.js
- **chess.js** — MIT license. Move generation/validation/PGN/FEN handling.
  Source: https://github.com/jhlywa/chess.js

## Fonts, icons, sounds, piece art, board themes

All original to this project (hand-authored SVG piece sets, synthesized Web
Audio sound effects, CSS-driven board themes) — see the main README for
details. Geist font via `next/font/google` (SIL Open Font License, bundled by
Next.js itself).
