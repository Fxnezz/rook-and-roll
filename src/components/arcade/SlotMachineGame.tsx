"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { spin, payout, PAYOUTS, type SlotSymbol } from "@/lib/arcade/slots";

const START_CHIPS = 100;
const BET = 5;

export function SlotMachineGame() {
  const { best, submit } = useHighScore("slots", { higherIsBetter: true });
  const [chips, setChips] = useState(START_CHIPS);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol]>(["🍒", "🍋", "🔔"]);
  const [message, setMessage] = useState("");
  const [spinning, setSpinning] = useState(false);

  const doSpin = () => {
    if (chips < BET || spinning) return;
    setSpinning(true);
    setMessage("");
    setChips((c) => c - BET);
    let ticks = 0;
    const interval = setInterval(() => {
      setReels(spin());
      ticks++;
      if (ticks >= 10) {
        clearInterval(interval);
        const result = spin();
        setReels(result);
        const win = payout(result, BET);
        setSpinning(false);
        if (win > 0) {
          setChips((c) => {
            const next = c + win;
            submit(next);
            return next;
          });
          setMessage(`Won ${win}!`);
          playArcadeSound("win");
        } else {
          setChips((c) => {
            submit(c);
            return c;
          });
          setMessage("No match.");
          playArcadeSound("lose");
        }
      }
    }, 80);
  };

  const resetBankroll = () => {
    setChips(START_CHIPS);
    setMessage("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">Chips: {chips}</span>
        <span className="chip">Bet: {BET}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      <div className="flex gap-3 rounded-xl bg-[var(--bg-elev)] p-6 text-5xl">
        {reels.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>

      {message && <p className="text-lg font-bold">{message}</p>}

      <button className="btn btn-primary" disabled={chips < BET || spinning} onClick={doSpin}>
        {spinning ? "Spinning…" : "Spin"}
      </button>

      {chips < BET && !spinning && (
        <div className="flex items-center gap-2 text-sm text-[var(--bad)]">
          <span>Out of chips.</span>
          <button className="btn !py-1 text-xs" onClick={resetBankroll}>
            Reset to {START_CHIPS}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md bg-[var(--bg-elev)] p-3 text-xs text-[var(--text-muted)]">
        {(Object.keys(PAYOUTS) as SlotSymbol[]).map((s) => (
          <div key={s} className="flex justify-between gap-4">
            <span>{s} {s} {s}</span>
            <span>{PAYOUTS[s] * BET}</span>
          </div>
        ))}
        <div className="col-span-2 flex justify-between gap-4">
          <span>🍒 🍒 (any)</span>
          <span>{BET}</span>
        </div>
      </div>
    </div>
  );
}
