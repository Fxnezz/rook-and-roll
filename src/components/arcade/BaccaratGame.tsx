"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import type { Card } from "@/lib/arcade/blackjack";
import { playRound, resolveBaccaratBet, type BaccaratRound, type BaccaratBet } from "@/lib/arcade/baccarat";

const START_CHIPS = 100;

function MiniCard({ card }: { card: Card }) {
  return <PlayingCard rank={card.rank} suit={card.suit} size="compact" />;
}

export function BaccaratGame() {
  const { best, submit } = useHighScore("baccarat", { higherIsBetter: true });
  const [chips, setChips] = useState(START_CHIPS);
  const [bet, setBet] = useState<BaccaratBet>("player");
  const [amount, setAmount] = useState(10);
  const [round, setRound] = useState<BaccaratRound | null>(null);
  const [message, setMessage] = useState("");

  const deal = () => {
    if (chips < amount) return;
    const r = playRound();
    setRound(r);
    const net = resolveBaccaratBet(bet, amount, r);
    setChips((c) => {
      const next = c + net;
      submit(next);
      return next;
    });
    setMessage(
      `${r.winner === "tie" ? "Tie" : r.winner === "player" ? "Player wins" : "Banker wins"} (Player ${r.playerTotal} - Banker ${r.bankerTotal}) — ${net > 0 ? `won ${net}` : net < 0 ? `lost ${-net}` : "push"}`,
    );
    playArcadeSound(net > 0 ? "win" : net < 0 ? "lose" : "draw");
  };

  const resetBankroll = () => {
    setChips(START_CHIPS);
    setRound(null);
    setMessage("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Chips: {chips}</span>
        <span className="chip">Bet: {amount}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      {round && (
        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-2">
            <span className="label">Player ({round.playerTotal})</span>
            <div className="flex gap-1">
              {round.player.map((c, i) => (
                <MiniCard key={i} card={c} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="label">Banker ({round.bankerTotal})</span>
            <div className="flex gap-1">
              {round.banker.map((c, i) => (
                <MiniCard key={i} card={c} />
              ))}
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-sm font-semibold">{message}</p>}

      <div className="flex items-center gap-2 text-xs">
        {(["player", "banker", "tie"] as BaccaratBet[]).map((b) => (
          <button
            key={b}
            onClick={() => setBet(b)}
            className="rounded border px-3 py-1.5 capitalize"
            style={{ borderColor: "var(--border-strong)", background: bet === b ? "var(--accent)" : "transparent" }}
          >
            {b} {b === "banker" ? "(0.95:1)" : b === "tie" ? "(8:1)" : "(1:1)"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--text-faint)]">Amount:</span>
        {[5, 10, 25, 50].map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className="rounded border px-2 py-1"
            style={{ borderColor: "var(--border-strong)", background: amount === a ? "var(--accent)" : "transparent" }}
          >
            {a}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" disabled={chips < amount} onClick={deal}>
        Deal
      </button>

      {chips < amount && (
        <div className="flex items-center gap-2 text-sm text-[var(--bad)]">
          <span>Out of chips.</span>
          <button className="btn !py-1 text-xs" onClick={resetBankroll}>
            Reset to {START_CHIPS}
          </button>
        </div>
      )}
    </div>
  );
}
