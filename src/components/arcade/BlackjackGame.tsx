"use client";

import { useCallback, useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import {
  freshShoe,
  handValue,
  isBlackjack,
  isBust,
  dealerShouldHit,
  type Card,
} from "@/lib/arcade/blackjack";

const START_CHIPS = 100;
const BET = 10;

type Phase = "betting" | "player" | "dealer" | "resolved";

function CardView({ card, hidden }: { card: Card; hidden?: boolean }) {
  return <PlayingCard rank={card.rank} suit={card.suit} faceDown={hidden} />;
}

export function BlackjackGame() {
  const { best, submit } = useHighScore("blackjack", { higherIsBetter: true });
  const [chips, setChips] = useState(START_CHIPS);
  const [shoe, setShoe] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [message, setMessage] = useState("");
  const [bet, setBet] = useState(BET);

  const deal = useCallback(() => {
    const s = freshShoe();
    const p = [s.pop()!, s.pop()!];
    const d = [s.pop()!, s.pop()!];
    setShoe(s);
    setPlayer(p);
    setDealer(d);
    setPhase("player");
    setMessage("");
    playArcadeSound("place");
    if (isBlackjack(p)) resolveRound(p, d, true, s, bet);
  }, [bet]);

  const resolveRound = (p: Card[], d: Card[], playerBlackjack: boolean, remainingShoe: Card[], wager: number) => {
    setPhase("resolved");
    const pVal = handValue(p).total;
    const dVal = handValue(d).total;
    let delta = 0;
    let msg = "";
    if (isBust(p)) {
      delta = -wager;
      msg = "Bust — you lose.";
      playArcadeSound("lose");
    } else if (playerBlackjack && !isBlackjack(d)) {
      delta = Math.floor(wager * 1.5);
      msg = "Blackjack! You win 3:2.";
      playArcadeSound("win");
    } else if (isBust(d)) {
      delta = wager;
      msg = "Dealer busts — you win!";
      playArcadeSound("win");
    } else if (pVal > dVal) {
      delta = wager;
      msg = "You win!";
      playArcadeSound("win");
    } else if (pVal < dVal) {
      delta = -wager;
      msg = "Dealer wins.";
      playArcadeSound("lose");
    } else {
      delta = 0;
      msg = "Push — bet returned.";
      playArcadeSound("draw");
    }
    setChips((c) => {
      const next = c + delta;
      submit(next);
      return next;
    });
    setMessage(msg);
    setShoe(remainingShoe);
  };

  const hit = () => {
    const s = [...shoe];
    const card = s.pop()!;
    const p = [...player, card];
    setPlayer(p);
    setShoe(s);
    playArcadeSound("place");
    if (isBust(p)) resolveRound(p, dealer, false, s, bet);
  };

  const stand = () => {
    setPhase("dealer");
    let d = [...dealer];
    let s = [...shoe];
    while (dealerShouldHit(d)) {
      d = [...d, s.pop()!];
    }
    setDealer(d);
    setShoe(s);
    resolveRound(player, d, false, s, bet);
  };

  const doubleDown = () => {
    const s = [...shoe];
    const card = s.pop()!;
    const p = [...player, card];
    setPlayer(p);
    setShoe(s);
    const doubledBet = bet * 2;
    if (isBust(p)) {
      resolveRound(p, dealer, false, s, doubledBet);
      return;
    }
    let d = [...dealer];
    let s2 = s;
    while (dealerShouldHit(d)) d = [...d, s2.pop()!];
    setDealer(d);
    setShoe(s2);
    resolveRound(p, d, false, s2, doubledBet);
  };

  useEffect(() => {
    setPhase("betting");
  }, []);

  const canDouble = phase === "player" && player.length === 2 && chips >= bet;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Chips: {chips}</span>
        <span className="chip">Bet: {bet}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="label">Dealer {phase !== "player" && phase !== "betting" ? `(${handValue(dealer).total})` : ""}</span>
        <div className="flex gap-2">
          {dealer.map((c, i) => (
            <CardView key={i} card={c} hidden={i === 1 && phase === "player"} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="label">You {player.length > 0 ? `(${handValue(player).total})` : ""}</span>
        <div className="flex gap-2">
          {player.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>
      </div>

      {message && <p className="text-lg font-bold">{message}</p>}

      {phase === "betting" || phase === "resolved" ? (
        <div className="flex flex-col items-center gap-2">
          {chips <= 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--bad)]">
              <span>Out of chips.</span>
              <button className="btn !py-1 text-xs" onClick={() => setChips(START_CHIPS)}>
                Reset to {START_CHIPS}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-faint)]">Bet:</span>
            {[10, 25, 50].map((b) => (
              <button
                key={b}
                onClick={() => setBet(b)}
                className="rounded border px-2 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--border-strong)", background: bet === b ? "var(--accent)" : "transparent", color: bet === b ? "var(--accent-contrast)" : "var(--text-muted)" }}
              >
                {b}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" disabled={chips < bet} onClick={() => deal()}>
            Deal
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn" onClick={hit}>
            Hit
          </button>
          <button className="btn" onClick={stand}>
            Stand
          </button>
          {canDouble && (
            <button className="btn" onClick={doubleDown}>
              Double
            </button>
          )}
        </div>
      )}
    </div>
  );
}
