import { freshShoe, RANK_LABEL, SUIT_GLYPH, type Card } from "./blackjack";

/**
 * War: no decisions, pure chance. Deck split 26/26; each round both flip
 * their top card, higher card takes both (Ace is high here, unlike
 * blackjack's rank-1-as-low encoding). Ties trigger a "war": each side burns
 * up to 3 cards face down (fewer if they're low on cards) and flips again,
 * recursing until resolved; the winner takes the whole accumulated pile.
 */
export interface WarState {
  player: Card[]; // top of deck = index 0
  opponent: Card[];
  log: string;
  status: "playing" | "won" | "lost";
}

function warValue(rank: number): number {
  return rank === 1 ? 14 : rank;
}

export function cardLabel(card: Card): string {
  return `${RANK_LABEL[card.rank] ?? card.rank}${SUIT_GLYPH[card.suit]}`;
}

export function newGame(): WarState {
  const deck = freshShoe();
  return { player: deck.slice(0, 26), opponent: deck.slice(26), log: "Deal!", status: "playing" };
}

function checkEnd(player: Card[], opponent: Card[]): WarState["status"] {
  if (player.length === 0) return "lost";
  if (opponent.length === 0) return "won";
  return "playing";
}

function resolveRound(player: Card[], opponent: Card[], table: Card[], warCount: number): WarState {
  // A player who runs out mid-war has already lost regardless of the pile,
  // but award it to whoever still has cards so none silently vanish.
  if (player.length === 0) {
    return { player, opponent: [...opponent, ...table], log: "You ran out of cards during the war.", status: "lost" };
  }
  if (opponent.length === 0) {
    return { player: [...player, ...table], opponent, log: "Opponent ran out of cards during the war.", status: "won" };
  }

  const p = [...player];
  const o = [...opponent];
  const pCard = p.shift()!;
  const oCard = o.shift()!;
  const nextTable = [...table, pCard, oCard];
  const pv = warValue(pCard.rank);
  const ov = warValue(oCard.rank);
  const warPrefix = warCount > 0 ? `War (round ${warCount})! ` : "";

  if (pv > ov) {
    return {
      player: [...p, ...nextTable],
      opponent: o,
      log: `${warPrefix}${cardLabel(pCard)} beats ${cardLabel(oCard)} — you take ${nextTable.length} cards.`,
      status: checkEnd([...p, ...nextTable], o),
    };
  }
  if (ov > pv) {
    return {
      player: p,
      opponent: [...o, ...nextTable],
      log: `${warPrefix}${cardLabel(oCard)} beats ${cardLabel(pCard)} — opponent takes ${nextTable.length} cards.`,
      status: checkEnd(p, [...o, ...nextTable]),
    };
  }
  // Tie: burn up to 3 cards face down each, then flip again.
  const pBurn = p.splice(0, Math.min(3, p.length));
  const oBurn = o.splice(0, Math.min(3, o.length));
  return resolveRound(p, o, [...nextTable, ...pBurn, ...oBurn], warCount + 1);
}

export function playRound(state: WarState): WarState {
  if (state.status !== "playing") return state;
  return resolveRound(state.player, state.opponent, [], 0);
}
