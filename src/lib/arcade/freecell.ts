import { SUITS, isRed, type Suit } from "./solitaire";

export interface FcCard {
  suit: Suit;
  rank: number; // 1 (Ace) .. 13 (King)
}

export interface FreeCellState {
  freeCells: (FcCard | null)[]; // length 4
  foundations: FcCard[][]; // 4, one per suit (SUITS order)
  tableau: FcCard[][]; // 8 columns
}

function freshDeck(): FcCard[] {
  const deck: FcCard[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deal(): FreeCellState {
  const deck = freshDeck();
  const tableau: FcCard[][] = Array.from({ length: 8 }, () => []);
  let col = 0;
  while (deck.length) {
    tableau[col % 8].push(deck.pop()!);
    col++;
  }
  return { freeCells: [null, null, null, null], foundations: [[], [], [], []], tableau };
}

function cloneState(state: FreeCellState): FreeCellState {
  return {
    freeCells: state.freeCells.map((c) => (c ? { ...c } : null)),
    foundations: state.foundations.map((f) => f.map((c) => ({ ...c }))),
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
  };
}

function isValidRun(cards: FcCard[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].rank !== cards[i + 1].rank + 1) return false;
    if (isRed(cards[i].suit) === isRed(cards[i + 1].suit)) return false;
  }
  return true;
}

function canPlaceOnTableau(moving: FcCard, destTop: FcCard | undefined): boolean {
  if (!destTop) return true; // empty column accepts anything in FreeCell
  return moving.rank === destTop.rank - 1 && isRed(moving.suit) !== isRed(destTop.suit);
}

function foundationIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}
function canPlaceOnFoundation(moving: FcCard, foundation: FcCard[]): boolean {
  if (foundation.length === 0) return moving.rank === 1;
  return moving.rank === foundation[foundation.length - 1].rank + 1;
}

/** Max cards a supermove can carry, per the standard (freeCells+1) * 2^emptyColumns formula. */
export function maxSupermove(state: FreeCellState, destCol: number): number {
  const freeCount = state.freeCells.filter((c) => c === null).length;
  const emptyColumns = state.tableau.filter((c, i) => c.length === 0 && i !== destCol).length;
  return (freeCount + 1) * Math.pow(2, emptyColumns);
}

export function moveTableauToTableau(state: FreeCellState, fromCol: number, cardIndex: number, toCol: number): FreeCellState | null {
  if (fromCol === toCol) return null;
  const run = state.tableau[fromCol].slice(cardIndex);
  if (run.length === 0 || !isValidRun(run)) return null;
  if (run.length > maxSupermove(state, toCol)) return null;
  const destTop = state.tableau[toCol][state.tableau[toCol].length - 1];
  if (!canPlaceOnTableau(run[0], destTop)) return null;

  const next = cloneState(state);
  next.tableau[fromCol] = next.tableau[fromCol].slice(0, cardIndex);
  next.tableau[toCol] = [...next.tableau[toCol], ...run.map((c) => ({ ...c }))];
  return next;
}

export function moveTableauToFreeCell(state: FreeCellState, col: number, cellIndex: number): FreeCellState | null {
  if (state.freeCells[cellIndex] !== null) return null;
  const card = state.tableau[col][state.tableau[col].length - 1];
  if (!card) return null;
  const next = cloneState(state);
  next.tableau[col] = next.tableau[col].slice(0, -1);
  next.freeCells[cellIndex] = { ...card };
  return next;
}

export function moveFreeCellToTableau(state: FreeCellState, cellIndex: number, toCol: number): FreeCellState | null {
  const card = state.freeCells[cellIndex];
  if (!card) return null;
  const destTop = state.tableau[toCol][state.tableau[toCol].length - 1];
  if (!canPlaceOnTableau(card, destTop)) return null;
  const next = cloneState(state);
  next.freeCells[cellIndex] = null;
  next.tableau[toCol] = [...next.tableau[toCol], { ...card }];
  return next;
}

export function moveToFoundation(state: FreeCellState, source: { col: number } | { cell: number }): FreeCellState | null {
  const card = "col" in source ? state.tableau[source.col][state.tableau[source.col].length - 1] : state.freeCells[source.cell];
  if (!card) return null;
  const fi = foundationIndex(card.suit);
  if (!canPlaceOnFoundation(card, state.foundations[fi])) return null;
  const next = cloneState(state);
  if ("col" in source) next.tableau[source.col] = next.tableau[source.col].slice(0, -1);
  else next.freeCells[source.cell] = null;
  next.foundations[fi] = [...next.foundations[fi], { ...card }];
  return next;
}

export function isWon(state: FreeCellState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

/** Auto-move any safe card (free cells + tableau tops) to a foundation. */
export function autoMoveOne(state: FreeCellState): FreeCellState | null {
  for (let i = 0; i < 4; i++) {
    const moved = moveToFoundation(state, { cell: i });
    if (moved) return moved;
  }
  for (let col = 0; col < 8; col++) {
    const moved = moveToFoundation(state, { col });
    if (moved) return moved;
  }
  return null;
}
