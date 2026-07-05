// Klondike solitaire, draw-1. Foundations are indexed by suit in a fixed
// order [S, H, D, C]; a foundation accepts Ace first, then ascending by suit.
export type Suit = "S" | "H" | "D" | "C";

export interface Card {
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
  faceUp: boolean;
}

export interface SolitaireState {
  tableau: Card[][]; // 7 columns
  foundations: Card[][]; // 4, one per suit (SUITS order)
  stock: Card[];
  waste: Card[];
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
const RED: Set<Suit> = new Set(["H", "D"]);

export function isRed(suit: Suit): boolean {
  return RED.has(suit);
}

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank, faceUp: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deal(): SolitaireState {
  const deck = freshDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[idx++];
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  return { tableau, foundations: [[], [], [], []], stock, waste: [] };
}

function cloneState(state: SolitaireState): SolitaireState {
  return {
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
    foundations: state.foundations.map((f) => f.map((c) => ({ ...c }))),
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
  };
}

export function drawFromStock(state: SolitaireState): SolitaireState {
  const next = cloneState(state);
  if (next.stock.length === 0) {
    // recycle waste back into stock, face down, preserving re-draw order
    next.stock = next.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    next.waste = [];
    return next;
  }
  const card = next.stock.pop()!;
  card.faceUp = true;
  next.waste.push(card);
  return next;
}

/** A valid movable run: consecutive descending rank with alternating color, all face up. */
function isValidRun(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i];
    const b = cards[i + 1];
    if (!a.faceUp || !b.faceUp) return false;
    if (a.rank !== b.rank + 1) return false;
    if (isRed(a.suit) === isRed(b.suit)) return false;
  }
  return cards.every((c) => c.faceUp);
}

function canPlaceOnTableau(moving: Card, destTop: Card | undefined): boolean {
  if (!destTop) return moving.rank === 13; // empty column only accepts a King
  return moving.rank === destTop.rank - 1 && isRed(moving.suit) !== isRed(destTop.suit);
}

function canPlaceOnFoundation(moving: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return moving.rank === 1;
  return moving.rank === foundation[foundation.length - 1].rank + 1;
}

function flipNewTop(col: Card[]): void {
  if (col.length > 0) col[col.length - 1].faceUp = true;
}

/** Moves the run starting at `cardIndex` (through the end) of tableau column `fromCol` onto `toCol`. */
export function moveTableauToTableau(state: SolitaireState, fromCol: number, cardIndex: number, toCol: number): SolitaireState | null {
  if (fromCol === toCol) return null;
  const run = state.tableau[fromCol].slice(cardIndex);
  if (run.length === 0 || !isValidRun(run)) return null;
  const destTop = state.tableau[toCol][state.tableau[toCol].length - 1];
  if (!canPlaceOnTableau(run[0], destTop)) return null;

  const next = cloneState(state);
  next.tableau[fromCol] = next.tableau[fromCol].slice(0, cardIndex);
  flipNewTop(next.tableau[fromCol]);
  next.tableau[toCol] = [...next.tableau[toCol], ...run.map((c) => ({ ...c }))];
  return next;
}

export function moveWasteToTableau(state: SolitaireState, toCol: number): SolitaireState | null {
  const card = state.waste[state.waste.length - 1];
  if (!card) return null;
  const destTop = state.tableau[toCol][state.tableau[toCol].length - 1];
  if (!canPlaceOnTableau(card, destTop)) return null;
  const next = cloneState(state);
  next.waste.pop();
  next.tableau[toCol] = [...next.tableau[toCol], { ...card }];
  return next;
}

function foundationIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

export function moveWasteToFoundation(state: SolitaireState): SolitaireState | null {
  const card = state.waste[state.waste.length - 1];
  if (!card) return null;
  const fi = foundationIndex(card.suit);
  if (!canPlaceOnFoundation(card, state.foundations[fi])) return null;
  const next = cloneState(state);
  next.waste.pop();
  next.foundations[fi] = [...next.foundations[fi], { ...card }];
  return next;
}

export function moveTableauToFoundation(state: SolitaireState, col: number): SolitaireState | null {
  const card = state.tableau[col][state.tableau[col].length - 1];
  if (!card || !card.faceUp) return null;
  const fi = foundationIndex(card.suit);
  if (!canPlaceOnFoundation(card, state.foundations[fi])) return null;
  const next = cloneState(state);
  next.tableau[col] = next.tableau[col].slice(0, -1);
  flipNewTop(next.tableau[col]);
  next.foundations[fi] = [...next.foundations[fi], { ...card }];
  return next;
}

export function isWon(state: SolitaireState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

/** Auto-move any safe card (from waste or tableau tops) to a foundation — used by the "auto-complete" button. */
export function autoMoveOne(state: SolitaireState): SolitaireState | null {
  const fromWaste = moveWasteToFoundation(state);
  if (fromWaste) return fromWaste;
  for (let col = 0; col < 7; col++) {
    const moved = moveTableauToFoundation(state, col);
    if (moved) return moved;
  }
  return null;
}
