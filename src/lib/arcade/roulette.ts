/**
 * European roulette (single zero, 0-36). Implements the common "outside"
 * bets plus straight-up number bets; split/street/corner/six-line "inside"
 * bets are omitted to keep the board UI simple — those require clicking
 * specific cell boundaries rather than whole cells.
 */
export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Color = "red" | "black" | "green";
export function colorOf(n: number): Color {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export type BetType =
  | "number"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high"
  | "dozen1"
  | "dozen2"
  | "dozen3"
  | "col1"
  | "col2"
  | "col3";

export interface Bet {
  type: BetType;
  number?: number;
  amount: number;
}

export function spin(): number {
  return Math.floor(Math.random() * 37);
}

export function payoutMultiplier(type: BetType): number {
  if (type === "number") return 35;
  if (["red", "black", "odd", "even", "low", "high"].includes(type)) return 1;
  return 2; // dozens and columns
}

export function betWins(bet: Bet, result: number): boolean {
  if (result === 0) return bet.type === "number" && bet.number === 0;
  switch (bet.type) {
    case "number":
      return bet.number === result;
    case "red":
      return colorOf(result) === "red";
    case "black":
      return colorOf(result) === "black";
    case "odd":
      return result % 2 === 1;
    case "even":
      return result % 2 === 0;
    case "low":
      return result >= 1 && result <= 18;
    case "high":
      return result >= 19 && result <= 36;
    case "dozen1":
      return result >= 1 && result <= 12;
    case "dozen2":
      return result >= 13 && result <= 24;
    case "dozen3":
      return result >= 25 && result <= 36;
    case "col1":
      return result % 3 === 1;
    case "col2":
      return result % 3 === 2;
    case "col3":
      return result % 3 === 0;
  }
}

/** Net bankroll change: +profit if the bet wins, -amount if it loses. */
export function resolveBet(bet: Bet, result: number): number {
  return betWins(bet, result) ? bet.amount * payoutMultiplier(bet.type) : -bet.amount;
}
