import { freshShoe, type Card } from "./blackjack";

/** Baccarat (Punto Banco). Card value: Ace=1, 2-9 face value, 10/J/Q/K=0; hand total is the sum mod 10. */
function cardValue(rank: number): number {
  return rank >= 10 ? 0 : rank;
}

export function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardValue(c.rank), 0) % 10;
}

export interface BaccaratRound {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: "player" | "banker" | "tie";
}

/** Standard drawing rules: naturals (8/9) stop immediately; otherwise player draws on 0-5,
 * then banker's draw depends on banker's total and the player's third card (if any). */
export function playRound(): BaccaratRound {
  const deck = freshShoe();
  const player = [deck.shift()!, deck.shift()!];
  const banker = [deck.shift()!, deck.shift()!];
  let pTotal = handTotal(player);
  let bTotal = handTotal(banker);

  if (pTotal < 8 && bTotal < 8) {
    let playerThird: Card | null = null;
    if (pTotal <= 5) {
      playerThird = deck.shift()!;
      player.push(playerThird);
      pTotal = handTotal(player);
    }

    let bankerDraws: boolean;
    if (playerThird == null) {
      bankerDraws = bTotal <= 5;
    } else {
      const p3 = cardValue(playerThird.rank);
      if (bTotal <= 2) bankerDraws = true;
      else if (bTotal === 3) bankerDraws = p3 !== 8;
      else if (bTotal === 4) bankerDraws = p3 >= 2 && p3 <= 7;
      else if (bTotal === 5) bankerDraws = p3 >= 4 && p3 <= 7;
      else if (bTotal === 6) bankerDraws = p3 === 6 || p3 === 7;
      else bankerDraws = false;
    }
    if (bankerDraws) {
      banker.push(deck.shift()!);
      bTotal = handTotal(banker);
    }
  }

  const winner = pTotal > bTotal ? "player" : bTotal > pTotal ? "banker" : "tie";
  return { player, banker, playerTotal: pTotal, bankerTotal: bTotal, winner };
}

export type BaccaratBet = "player" | "banker" | "tie";

/** Net bankroll change for a wager of `amount` on `bet`. Banker wins pay 0.95:1 (5% commission); tie pays 8:1. */
export function resolveBaccaratBet(bet: BaccaratBet, amount: number, round: BaccaratRound): number {
  if (round.winner === "tie") {
    if (bet === "tie") return amount * 8;
    return 0; // player/banker bets push on a tie
  }
  if (bet === "tie") return -amount;
  if (bet !== round.winner) return -amount;
  return bet === "banker" ? Math.floor(amount * 0.95) : amount;
}
