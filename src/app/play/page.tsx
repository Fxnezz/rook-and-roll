import { GamesHub, type GameCard, type GameSection } from "@/components/games/GamesHub";

export const metadata = { title: "Games Hub" };

const CHESS_GAMES: GameCard[] = [
  {
    title: "Chess",
    blurb: "Play online with live matchmaking, ratings, chat, and spectating.",
    emoji: "♟️",
    links: [
      { href: "/play/online", label: "Play Online" },
      { href: "/play/bot", label: "vs Bot" },
      { href: "/play/engine-lab", label: "Engine Arena" },
      { href: "/play/variants", label: "Variant Workshop" },
    ],
  },
  {
    title: "Variant Workshop",
    blurb: "Chess960 plus original fantasy chess with Dragons, Wizards, custom armies, and a local variant bot.",
    emoji: "🐉",
    links: [{ href: "/play/variants", label: "Forge a Game" }],
  },
  {
    title: "Pass & Play",
    blurb: "Two players, one screen — no account needed.",
    emoji: "🪑",
    links: [{ href: "/play/local", label: "Play" }],
  },
  {
    title: "Puzzles",
    blurb: "Daily tactics puzzle plus unlimited practice, with streaks.",
    emoji: "🧩",
    links: [{ href: "/puzzles", label: "Solve" }],
  },
];

const MULTIPLAYER_GAMES: GameCard[] = [
  {
    title: "Connect Four",
    blurb: "Four in a row, any direction. Rated matchmaking, vs bot, or pass & play.",
    emoji: "🔴",
    links: [
      { href: "/play/connect-four", label: "Play Online" },
      { href: "/play/connect-four/bot", label: "vs Bot" },
      { href: "/play/connect-four/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Tic-Tac-Toe",
    blurb: "Quick and casual — matchmaking, an unbeatable bot, or pass & play.",
    emoji: "✕⭕",
    links: [
      { href: "/play/tic-tac-toe", label: "Play Online" },
      { href: "/play/tic-tac-toe/bot", label: "vs Bot" },
      { href: "/play/tic-tac-toe/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Checkers",
    blurb: "Standard rules — forced capture, kings, multi-jumps. Rated, vs bot, or pass & play.",
    emoji: "⚫",
    links: [
      { href: "/play/checkers", label: "Play Online" },
      { href: "/play/checkers/bot", label: "vs Bot" },
      { href: "/play/checkers/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Othello",
    blurb: "Flank a line of discs to flip them — most discs when the board settles wins. Rated, vs bot, or pass & play.",
    emoji: "🟢",
    links: [
      { href: "/play/othello", label: "Play Online" },
      { href: "/play/othello/bot", label: "vs Bot" },
      { href: "/play/othello/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Gomoku",
    blurb: "Five in a row, any direction, on a 15x15 board. Rated, vs bot, or pass & play.",
    emoji: "⚪",
    links: [
      { href: "/play/gomoku", label: "Play Online" },
      { href: "/play/gomoku/bot", label: "vs Bot" },
      { href: "/play/gomoku/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Mancala",
    blurb: "Standard Kalah rules — sow seeds, chain extra turns, capture across the board.",
    emoji: "🟤",
    links: [
      { href: "/play/mancala", label: "Play Online" },
      { href: "/play/mancala/bot", label: "vs Bot" },
      { href: "/play/mancala/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Nim",
    blurb: "Take turns removing tokens from a pile — whoever takes the last token wins.",
    emoji: "🪙",
    links: [
      { href: "/play/nim", label: "Play Online" },
      { href: "/play/nim/bot", label: "vs Bot" },
      { href: "/play/nim/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Dots and Boxes",
    blurb: "Draw a line, complete a box to claim it and go again — most boxes wins.",
    emoji: "🔲",
    links: [
      { href: "/play/dots-and-boxes", label: "Play Online" },
      { href: "/play/dots-and-boxes/bot", label: "vs Bot" },
      { href: "/play/dots-and-boxes/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Nine Men's Morris",
    blurb: "Place, then move your pieces to form a mill and remove an opponent piece.",
    emoji: "⭕",
    links: [
      { href: "/play/nine-mens-morris", label: "Play Online" },
      { href: "/play/nine-mens-morris/bot", label: "vs Bot" },
      { href: "/play/nine-mens-morris/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Ultimate Tic-Tac-Toe",
    blurb: "A 3x3 grid of tic-tac-toe boards — your move sends your opponent to the matching sub-board.",
    emoji: "🔳",
    links: [
      { href: "/play/ultimate-tic-tac-toe", label: "Play Online" },
      { href: "/play/ultimate-tic-tac-toe/bot", label: "vs Bot" },
      { href: "/play/ultimate-tic-tac-toe/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Hex",
    blurb: "Connect your two sides of the board with an unbroken chain — no draws are possible.",
    emoji: "⬡",
    links: [
      { href: "/play/hex", label: "Play Online" },
      { href: "/play/hex/bot", label: "vs Bot" },
      { href: "/play/hex/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Pentago",
    blurb: "Place a marble, then rotate a quadrant — five in a row after the rotation wins.",
    emoji: "🌀",
    links: [
      { href: "/play/pentago", label: "Play Online" },
      { href: "/play/pentago/bot", label: "vs Bot" },
      { href: "/play/pentago/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Quarto",
    blurb: "Your opponent picks the piece you must place — four in a line sharing an attribute wins.",
    emoji: "🔷",
    links: [
      { href: "/play/quarto", label: "Play Online" },
      { href: "/play/quarto/bot", label: "vs Bot" },
      { href: "/play/quarto/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Breakthrough",
    blurb: "Race your pawns to the far row — capture diagonally, advance straight.",
    emoji: "⚔️",
    links: [
      { href: "/play/breakthrough", label: "Play Online" },
      { href: "/play/breakthrough/bot", label: "vs Bot" },
      { href: "/play/breakthrough/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Domineering",
    blurb: "Vertical vs horizontal domino placement on a shared grid — whoever can't move loses.",
    emoji: "🟦",
    links: [
      { href: "/play/domineering", label: "Play Online" },
      { href: "/play/domineering/bot", label: "vs Bot" },
      { href: "/play/domineering/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Sim",
    blurb: "Color the lines between 6 points — complete a triangle in your color and you lose.",
    emoji: "🔺",
    links: [
      { href: "/play/sim", label: "Play Online" },
      { href: "/play/sim/bot", label: "vs Bot" },
      { href: "/play/sim/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Connect6",
    blurb: "Place two stones a turn (one on the opening move) — six in a row wins.",
    emoji: "⚫",
    links: [
      { href: "/play/connect6", label: "Play Online" },
      { href: "/play/connect6/bot", label: "vs Bot" },
      { href: "/play/connect6/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Quoridor",
    blurb: "Race to the far row, or place walls to slow your opponent — never seal off either path.",
    emoji: "🧱",
    links: [
      { href: "/play/quoridor", label: "Play Online" },
      { href: "/play/quoridor/bot", label: "vs Bot" },
      { href: "/play/quoridor/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Halma",
    blurb: "Hop your pieces across the board into the opposite corner — first to fill the far camp wins.",
    emoji: "🐇",
    links: [
      { href: "/play/halma", label: "Play Online" },
      { href: "/play/halma/bot", label: "vs Bot" },
      { href: "/play/halma/local", label: "Pass & Play" },
    ],
  },
  {
    title: "L-Game",
    blurb: "Reposition your L-piece and optionally nudge a neutral piece — trap your opponent's L.",
    emoji: "🔤",
    links: [
      { href: "/play/l-game", label: "Play Online" },
      { href: "/play/l-game/bot", label: "vs Bot" },
      { href: "/play/l-game/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Yavalath",
    blurb: "Four in a row wins. Three in a row loses — unless that same move also makes four.",
    emoji: "⬡",
    links: [
      { href: "/play/yavalath", label: "Play Online" },
      { href: "/play/yavalath/bot", label: "vs Bot" },
      { href: "/play/yavalath/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Fanorona",
    blurb: "Madagascar's classic capture game — slide into a gap to capture a line of enemy pieces.",
    emoji: "⚪",
    links: [
      { href: "/play/fanorona", label: "Play Online" },
      { href: "/play/fanorona/bot", label: "vs Bot" },
      { href: "/play/fanorona/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Lines of Action",
    blurb: "Move as far as the pieces on your line let you — connect your whole army to win.",
    emoji: "🔵",
    links: [
      { href: "/play/lines-of-action", label: "Play Online" },
      { href: "/play/lines-of-action/bot", label: "vs Bot" },
      { href: "/play/lines-of-action/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Y",
    blurb: "Connect all three sides of a triangle with one unbroken group of stones — no draws possible.",
    emoji: "🔻",
    links: [
      { href: "/play/y-game", label: "Play Online" },
      { href: "/play/y-game/bot", label: "vs Bot" },
      { href: "/play/y-game/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Amazons",
    blurb: "Move a queen-like amazon, then shoot an arrow to block a square forever.",
    emoji: "🏹",
    links: [
      { href: "/play/amazons", label: "Play Online" },
      { href: "/play/amazons/bot", label: "vs Bot" },
      { href: "/play/amazons/local", label: "Pass & Play" },
    ],
  },
];

const ARCADE_GAMES: GameCard[] = [
  {
    title: "Snake",
    blurb: "Classic grid snake with a rising speed curve.",
    emoji: "🐍",
    links: [{ href: "/play/snake", label: "Play" }],
  },
  {
    title: "Tetris",
    blurb: "7-bag randomizer, hold, next preview, level curve.",
    emoji: "🧱",
    links: [{ href: "/play/tetris", label: "Play" }],
  },
  {
    title: "2048",
    blurb: "Merge tiles to 2048 — and keep going if you want more.",
    emoji: "🔢",
    links: [{ href: "/play/2048", label: "Play" }],
  },
  {
    title: "Word Game",
    blurb: "Five letters, six guesses. One daily word for everyone.",
    emoji: "🔤",
    links: [{ href: "/play/wordle", label: "Play" }],
  },
  {
    title: "Minesweeper",
    blurb: "Clear the board without hitting a mine. First click is always safe.",
    emoji: "💣",
    links: [{ href: "/play/minesweeper", label: "Play" }],
  },
  {
    title: "Memory Match",
    blurb: "Flip two cards at a time — find every pair as fast as you can.",
    emoji: "🃏",
    links: [{ href: "/play/memory", label: "Play" }],
  },
  {
    title: "15 Puzzle",
    blurb: "Slide tiles into the blank space to put them back in order.",
    emoji: "🔲",
    links: [{ href: "/play/15puzzle", label: "Play" }],
  },
  {
    title: "Simon",
    blurb: "Repeat the growing sequence of colors and sounds.",
    emoji: "🔴",
    links: [{ href: "/play/simon", label: "Play" }],
  },
  {
    title: "Sudoku",
    blurb: "Every puzzle is generated fresh with a guaranteed unique solution.",
    emoji: "9️⃣",
    links: [{ href: "/play/sudoku", label: "Play" }],
  },
  {
    title: "Solitaire",
    blurb: "Classic Klondike, draw-1, with an auto-complete button.",
    emoji: "♠️",
    links: [{ href: "/play/solitaire", label: "Play" }],
  },
  {
    title: "Breakout",
    blurb: "Clear every brick without letting the ball fall past your paddle.",
    emoji: "🧱",
    links: [{ href: "/play/breakout", label: "Play" }],
  },
  {
    title: "Whack-a-Mole",
    blurb: "30 seconds on the clock — whack moles the instant they pop up.",
    emoji: "🔨",
    links: [{ href: "/play/whackamole", label: "Play" }],
  },
  {
    title: "Hangman",
    blurb: "Guess the word one letter at a time before you run out of tries.",
    emoji: "🙈",
    links: [{ href: "/play/hangman", label: "Play" }],
  },
  {
    title: "Blackjack",
    blurb: "Get closer to 21 than the dealer without going over. Blackjack pays 3:2.",
    emoji: "🂡",
    links: [{ href: "/play/blackjack", label: "Play" }],
  },
  {
    title: "Yahtzee",
    blurb: "Roll five dice up to three times each round, then lock in a category.",
    emoji: "🎲",
    links: [{ href: "/play/yahtzee", label: "Play" }],
  },
  {
    title: "FreeCell",
    blurb: "All 52 cards dealt face-up — almost every deal is solvable.",
    emoji: "♠️",
    links: [{ href: "/play/freecell", label: "Play" }],
  },
  {
    title: "Klotski",
    blurb: "The classic sliding-block puzzle — free the big block to the exit.",
    emoji: "🧱",
    links: [{ href: "/play/klotski", label: "Play" }],
  },
  {
    title: "Flappy Rook",
    blurb: "Flap through the gaps without hitting a pillar, the floor, or the ceiling.",
    emoji: "🐦",
    links: [{ href: "/play/flappy-rook", label: "Play" }],
  },
  {
    title: "Peg Solitaire",
    blurb: "Jump pegs over each other to remove them — finish with just one left.",
    emoji: "🔴",
    links: [{ href: "/play/peg-solitaire", label: "Play" }],
  },
  {
    title: "Lights Out",
    blurb: "Pressing a light toggles it and its neighbors — turn every light off.",
    emoji: "💡",
    links: [{ href: "/play/lights-out", label: "Play" }],
  },
  {
    title: "Tower of Hanoi",
    blurb: "Move the whole stack to the last peg — never place a bigger disk on a smaller one.",
    emoji: "🗼",
    links: [{ href: "/play/hanoi", label: "Play" }],
  },
  {
    title: "Mastermind",
    blurb: "Crack the 4-color secret code using black/white peg feedback.",
    emoji: "🎯",
    links: [{ href: "/play/mastermind", label: "Play" }],
  },
  {
    title: "Battleship",
    blurb: "Take turns firing at each other's fleet — sink every ship to win.",
    emoji: "🚢",
    links: [{ href: "/play/battleship", label: "Play" }],
  },
  {
    title: "Video Poker",
    blurb: "Jacks or Better — hold the cards you want, draw the rest, chase a paying hand.",
    emoji: "🂡",
    links: [{ href: "/play/video-poker", label: "Play" }],
  },
  {
    title: "War",
    blurb: "No decisions, just nerve — flip your top card, higher card takes the pile.",
    emoji: "🃏",
    links: [{ href: "/play/war", label: "Play" }],
  },
  {
    title: "Pyramid Solitaire",
    blurb: "Pair up exposed cards that sum to 13 to empty the pyramid.",
    emoji: "🔺",
    links: [{ href: "/play/pyramid-solitaire", label: "Play" }],
  },
  {
    title: "Pong",
    blurb: "The original arcade classic — first to 7 points wins.",
    emoji: "🏓",
    links: [{ href: "/play/pong", label: "Play" }],
  },
  {
    title: "Space Invaders",
    blurb: "Clear each descending wave of aliens before they reach you.",
    emoji: "👾",
    links: [{ href: "/play/space-invaders", label: "Play" }],
  },
  {
    title: "Sokoban",
    blurb: "Push every box onto a target square — you can only push, never pull.",
    emoji: "📦",
    links: [{ href: "/play/sokoban", label: "Play" }],
  },
  {
    title: "Flood-It",
    blurb: "Flood the board with one color from the top-left corner within the move limit.",
    emoji: "🌊",
    links: [{ href: "/play/flood-it", label: "Play" }],
  },
  {
    title: "Spider Solitaire",
    blurb: "Two-suit Spider — build same-suit descending runs and clear all 8 King-to-Ace sequences.",
    emoji: "🕷️",
    links: [{ href: "/play/spider-solitaire", label: "Play" }],
  },
  {
    title: "Block Puzzle",
    blurb: "Place three pieces anywhere they fit — clear full rows, columns, or 3x3 boxes.",
    emoji: "🧩",
    links: [{ href: "/play/block-puzzle", label: "Play" }],
  },
  {
    title: "Match-3",
    blurb: "Swap adjacent gems to line up 3 or more — chain cascades for bonus points.",
    emoji: "💎",
    links: [{ href: "/play/match3", label: "Play" }],
  },
  {
    title: "Asteroids",
    blurb: "Rotate, thrust, and shoot — smaller asteroids are worth more but harder to hit.",
    emoji: "☄️",
    links: [{ href: "/play/asteroids", label: "Play" }],
  },
  {
    title: "Frogger",
    blurb: "Cross the road, then ride logs across the river — fill all 5 homes to advance.",
    emoji: "🐸",
    links: [{ href: "/play/frogger", label: "Play" }],
  },
  {
    title: "Roulette",
    blurb: "European single-zero wheel — place your bets, then spin.",
    emoji: "🎡",
    links: [{ href: "/play/roulette", label: "Play" }],
  },
  {
    title: "Baccarat",
    blurb: "Punto Banco rules — bet on Player, Banker, or Tie, closest to 9 wins.",
    emoji: "🎴",
    links: [{ href: "/play/baccarat", label: "Play" }],
  },
  {
    title: "Craps",
    blurb: "Pass Line bet — 7 or 11 wins on the come-out, 2/3/12 lose, anything else sets the point.",
    emoji: "🎲",
    links: [{ href: "/play/craps", label: "Play" }],
  },
  {
    title: "Slot Machine",
    blurb: "3 reels, one lever — line up three matching symbols for the big payout.",
    emoji: "🎰",
    links: [{ href: "/play/slot-machine", label: "Play" }],
  },
  {
    title: "Rock Paper Scissors",
    blurb: "The bot studies your patterns — stay unpredictable to keep winning.",
    emoji: "✂️",
    links: [{ href: "/play/rock-paper-scissors", label: "Play" }],
  },
  {
    title: "Farkle",
    blurb: "Roll six dice, bank scoring combos, and push your luck — first to 10,000 wins.",
    emoji: "🎯",
    links: [{ href: "/play/farkle", label: "Play" }],
  },
  {
    title: "Word Search",
    blurb: "Click the first and last letter of a hidden word to find it, in any of 8 directions.",
    emoji: "🔎",
    links: [{ href: "/play/word-search", label: "Play" }],
  },
];

const ORIGINAL_GAMES: GameCard[] = [
  {
    title: "NBA 82-0",
    blurb: "Draft an all-time starting five, chase a perfect 82-game season, then survive the Play-In and best-of-seven playoffs.",
    emoji: "🏀",
    links: [{ href: "/play/nba-82-0", label: "Draft & Simulate" }],
  },
  {
    title: "AFL 23-0",
    blurb: "Draft an all-time Australian football core, chase a perfect 23-game season, then survive the 2026 finals.",
    emoji: "🏉",
    links: [{ href: "/play/afl-23-0", label: "Draft & Simulate" }],
  },
  {
    title: "Circuit Dash",
    blurb: "An original 3D arcade racer — pick a track, drift for the best lap.",
    emoji: "🏎️",
    links: [{ href: "/play/racing", label: "Race" }],
  },
  {
    title: "Spark's Climb",
    blurb: "An original platformer — run, double-jump, grab gems, reach the flag.",
    emoji: "✨",
    links: [{ href: "/play/platformer", label: "Play" }],
  },
];

const SECTIONS: GameSection[] = [
  {
    id: "chess",
    title: "Chess",
    description: "Live games, Stockfish opponents, shared boards, and daily tactics.",
    games: CHESS_GAMES,
  },
  {
    id: "board",
    title: "Multiplayer board games",
    description: "Modern strategy and timeless table games, online or on one screen.",
    games: MULTIPLAYER_GAMES,
  },
  {
    id: "arcade",
    title: "Arcade",
    description: "Quick rounds, card tables, word games, puzzles, and high-score chases.",
    games: ARCADE_GAMES,
  },
  {
    id: "original",
    title: "Original games",
    description: "Games designed and built especially for Sam's Arcade.",
    games: ORIGINAL_GAMES,
  },
];

export default function GamesHubPage() {
  return <GamesHub sections={SECTIONS} />;
}
