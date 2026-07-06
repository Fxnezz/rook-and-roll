/**
 * Spider Solitaire, 2-suit variant: a 104-card deck built from 4 copies each
 * of Spades and Hearts (13 ranks x 8 copies = 104), dealt across 10 tableau
 * columns (4 columns of 6, 6 columns of 5, last card face up), remaining 50
 * cards held as stock dealt out 10-at-a-time (one per column). Any card can
 * be dropped onto a tableau card one rank higher regardless of suit, but
 * only a same-suit consecutive descending run can be moved as a group.
 * Completing a full King-to-Ace same-suit run removes it; win when all 8
 * are cleared.
 */
export type Suit = "S" | "H";

export interface Card {
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
  faceUp: boolean;
}

export interface SpiderState {
  tableau: Card[][];
  stock: Card[];
  completed: number;
}

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (let copy = 0; copy < 4; copy++) {
    for (const suit of ["S", "H"] as Suit[]) {
      for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank, faceUp: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deal(): SpiderState {
  const deck = freshDeck();
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  let i = 0;
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    for (let row = 0; row < count; row++) {
      const card = { ...deck[i++] };
      card.faceUp = row === count - 1;
      tableau[col].push(card);
    }
  }
  return { tableau, stock: deck.slice(i), completed: 0 };
}

function isDescendingSameSuitRun(cards: Card[]): boolean {
  if (!cards.every((c) => c.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].suit !== cards[i + 1].suit || cards[i].rank !== cards[i + 1].rank + 1) return false;
  }
  return true;
}

export function canPickUp(column: Card[], cardIndex: number): boolean {
  return isDescendingSameSuitRun(column.slice(cardIndex));
}

export function canDrop(destColumn: Card[], movingCards: Card[]): boolean {
  if (destColumn.length === 0) return true;
  return destColumn[destColumn.length - 1].rank === movingCards[0].rank + 1;
}

function stripCompletedRun(column: Card[]): { column: Card[]; completedOne: boolean } {
  if (column.length < 13) return { column, completedOne: false };
  const last13 = column.slice(-13);
  const isRun = last13.every((c, i) => c.rank === 13 - i && (i === 0 || c.suit === last13[0].suit));
  if (!isRun || !last13.every((c) => c.faceUp)) return { column, completedOne: false };
  const rest = column.slice(0, -13);
  if (rest.length > 0) rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true };
  return { column: rest, completedOne: true };
}

export function moveCards(state: SpiderState, fromCol: number, cardIndex: number, toCol: number): SpiderState | null {
  if (fromCol === toCol) return null;
  const source = state.tableau[fromCol];
  if (!canPickUp(source, cardIndex)) return null;
  const moving = source.slice(cardIndex);
  const dest = state.tableau[toCol];
  if (!canDrop(dest, moving)) return null;

  const tableau = state.tableau.map((c) => [...c]);
  tableau[fromCol] = source.slice(0, cardIndex);
  if (tableau[fromCol].length > 0) {
    const top = tableau[fromCol][tableau[fromCol].length - 1];
    if (!top.faceUp) tableau[fromCol][tableau[fromCol].length - 1] = { ...top, faceUp: true };
  }
  tableau[toCol] = [...dest, ...moving];

  const { column, completedOne } = stripCompletedRun(tableau[toCol]);
  tableau[toCol] = column;

  return { tableau, stock: state.stock, completed: state.completed + (completedOne ? 1 : 0) };
}

export function canDealStock(state: SpiderState): boolean {
  return state.stock.length >= 10 && state.tableau.every((c) => c.length > 0);
}

export function dealStock(state: SpiderState): SpiderState {
  if (!canDealStock(state)) return state;
  const tableau = state.tableau.map((c) => [...c]);
  const stock = [...state.stock];
  for (let col = 0; col < 10; col++) {
    const card = { ...stock.pop()!, faceUp: true };
    tableau[col].push(card);
  }
  return { tableau, stock, completed: state.completed };
}

export function isWon(state: SpiderState): boolean {
  return state.completed === 8;
}
