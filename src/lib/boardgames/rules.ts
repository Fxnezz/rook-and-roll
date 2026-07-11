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

export const HALMA_RULES = [
  "Each side starts with a cluster of pieces in one corner of the board.",
  "A piece moves one step to an adjacent empty point, or jumps over an adjacent piece (yours or the opponent's) into the empty point beyond.",
  "Jumps can chain — one turn can hop over several pieces in a row as long as each landing point is empty.",
  "Nothing is ever captured — jumped-over pieces stay on the board.",
  "You win by being the first to move all of your pieces into the camp diagonally opposite your own.",
];

export const L_GAME_RULES = [
  "Each side has one L-shaped, 4-square piece. On your turn you must pick it up and put it down somewhere new — rotated or flipped is fine, but it can't land exactly where it started.",
  "After placing your L, you may optionally also move one of the two neutral single squares to any empty square (this part is optional).",
  "If you can't find any legal new spot for your L-piece on your turn, you lose immediately.",
];

export const DOMINEERING_RULES = [
  "Players place dominoes (two connected squares) on a shared grid, alternating turns.",
  "One player may only place their domino vertically; the other may only place horizontally.",
  "A domino can't overlap a square that's already covered.",
  "If you have no legal placement left on your turn, you lose.",
];

export const SIM_RULES = [
  "Six points are laid out on the board, fully connected by every possible line between them.",
  "On your turn, color in one not-yet-colored line between two points in your color.",
  "If completing your line finishes a triangle where all three sides are your color, you lose — this is a misère (avoid-the-goal) game.",
  "The last player to draw a line without completing their own triangle wins.",
];

export const YAVALATH_RULES = [
  "Place one stone per turn on the hex board — nothing is ever moved or captured.",
  "Get exactly 4 of your stones in an unbroken row to win instantly.",
  "Get exactly 3 in a row and you lose instantly instead — unless that very same stone also completes a 4-in-a-row, in which case the win overrides the loss.",
  "Because 3-in-a-row is dangerous, a lot of the game is forcing your opponent into a move that completes an unwanted three.",
];

export const CONNECT6_RULES = [
  "Six in a row (any direction) wins, on a much larger board than standard Connect Four.",
  "Every turn places two stones as a single move — except the very first move of the game, which places only one, to keep the opening fair.",
  "You can't split your two stones across two turns — both are placed before it becomes your opponent's turn.",
];

export const PENTAGO_RULES = [
  "The 6×6 board is split into four 3×3 quadrants that can each rotate independently.",
  "On your turn, place one stone on any empty square, then rotate one quadrant (any of the four, your choice) 90° clockwise or counterclockwise.",
  "Five in a row — checked both before and after your rotation — wins.",
  "The rotation is mandatory and can help either player, so a move that looks safe before rotating can open up a win or a loss once the quadrant turns.",
];
