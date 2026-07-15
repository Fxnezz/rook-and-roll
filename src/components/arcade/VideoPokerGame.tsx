"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import type { Card } from "@/lib/arcade/blackjack";
import { deal, draw, PAYTABLE, type VideoPokerRound } from "@/lib/arcade/videopoker";

const START_CREDITS = 100;
const BET = 5;

function CardView({ card, held }: { card: Card; held: boolean }) {
  return <PlayingCard rank={card.rank} suit={card.suit} held={held} />;
}

export function VideoPokerGame() {
  const { best, submit } = useHighScore("videopoker", { higherIsBetter: true });
  const [credits, setCredits] = useState(START_CREDITS);
  const [round, setRound] = useState<VideoPokerRound | null>(null);

  const startDeal = () => {
    setCredits((c) => c - BET);
    setRound(deal());
    playArcadeSound("place");
  };

  const toggleHold = (i: number) => {
    if (!round || round.stage !== "hold") return;
    setRound({ ...round, held: round.held.map((h, idx) => (idx === i ? !h : h)) });
  };

  const drawCards = () => {
    if (!round) return;
    const result = draw(round);
    setRound(result);
    const payout = PAYTABLE[result.result!] * BET;
    if (payout > 0) {
      setCredits((c) => {
        const next = c + payout;
        submit(next);
        return next;
      });
      playArcadeSound(result.result === "Nothing" ? "click" : "win");
    } else {
      playArcadeSound("lose");
    }
  };

  const resetBankroll = () => setCredits(START_CREDITS);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Credits: {credits}</span>
        <span className="chip">Bet: {BET}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      {round && (
        <div className="flex gap-2">
          {round.hand.map((card, i) => (
            <button key={i} onClick={() => toggleHold(i)} disabled={round.stage !== "hold"}>
              <CardView card={card} held={round.held[i]} />
              <p className="mt-1 text-center text-xs text-[var(--text-faint)]">{round.held[i] ? "Held" : ""}</p>
            </button>
          ))}
        </div>
      )}

      {round?.stage === "result" && <p className="text-lg font-bold">{round.result}</p>}

      <div className="flex flex-col items-center gap-2">
        {credits < BET && (!round || round.stage === "result") && (
          <div className="flex items-center gap-2 text-sm text-[var(--bad)]">
            <span>Out of credits.</span>
            <button className="btn !py-1 text-xs" onClick={resetBankroll}>
              Reset to {START_CREDITS}
            </button>
          </div>
        )}
        {!round || round.stage === "result" ? (
          <button className="btn btn-primary" disabled={credits < BET} onClick={startDeal}>
            Deal
          </button>
        ) : (
          <button className="btn btn-primary" onClick={drawCards}>
            Draw
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md bg-[var(--bg-elev)] p-3 text-xs text-[var(--text-muted)]">
        {(Object.keys(PAYTABLE) as (keyof typeof PAYTABLE)[]).map((name) => (
          <div key={name} className="flex justify-between gap-4">
            <span>{name}</span>
            <span>{PAYTABLE[name] * BET}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
