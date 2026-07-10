/** "How to play" bullet lists for the RulesModal, shared between a game's bot and pass-and-play pages. */
export const FANORONA_RULES = [
  "Slide a piece one step along a board line (orthogonal or diagonal, where drawn) into an empty adjacent point.",
  "Capture by approach: slide toward a line of enemy pieces and they're all removed.",
  "Capture by withdrawal: slide away from a line of enemy pieces and they're all removed instead.",
  "After capturing, the same piece may keep capturing in a new direction (not back along the same line) — chaining is optional.",
  "If any capturing move is available, you must play a capture instead of a passive slide.",
  "You win by capturing all of the opponent's pieces (or if they have no legal move left).",
];

export const NINE_MENS_MORRIS_RULES = [
  "Phase 1: take turns placing your 9 pieces on empty points of the board.",
  "Phase 2 (after all pieces are placed): slide a piece along a line to an adjacent empty point.",
  "Line up 3 of your pieces along a marked line (a \"mill\") to remove one enemy piece.",
  "You can't remove a piece from an opponent's mill unless that's their only piece left.",
  "Once you're down to 3 pieces, you may \"fly\" — move to any empty point instead of just an adjacent one.",
  "You lose when reduced to 2 pieces, or when you have no legal move on your turn.",
];

export const QUORIDOR_RULES = [
  "Race your pawn to the opposite edge of the 7×7 board — first to arrive wins.",
  "Each turn, either move your pawn one square, or place a wall on the grid between squares.",
  "You can jump over your opponent's pawn if it's directly adjacent to you.",
  "Each player has 5 walls total — once they're placed, you can only move.",
  "A wall can never be placed if it would seal off either player's last path to their goal.",
];

export const AMAZONS_RULES = [
  "Each side has amazons that move like a chess queen — any distance, straight or diagonal — but they never capture.",
  "After moving, that same amazon shoots an arrow, also queen-style, landing on a square that becomes permanently blocked.",
  "The playable board shrinks every turn as blocked squares pile up.",
  "You lose when none of your amazons has a legal move on your turn.",
];

export const LINES_OF_ACTION_RULES = [
  "Pieces start along two opposite edges of the 8×8 board.",
  "A piece moves in a straight line (any of 8 directions) exactly as many squares as the total pieces — both colors — sitting on that line.",
  "You can jump over your own pieces along the way, but not the opponent's.",
  "Landing on a single opposing piece captures it.",
  "You win by gathering all of your own pieces into one connected group (adjacent orthogonally or diagonally).",
];
