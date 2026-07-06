"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { colorOf, spin, resolveBet, type Bet, type BetType } from "@/lib/arcade/roulette";

const START_CHIPS = 100;
const OUTSIDE_BETS: { type: BetType; label: string }[] = [
  { type: "red", label: "Red" },
  { type: "black", label: "Black" },
  { type: "odd", label: "Odd" },
  { type: "even", label: "Even" },
  { type: "low", label: "1-18" },
  { type: "high", label: "19-36" },
  { type: "dozen1", label: "1st 12" },
  { type: "dozen2", label: "2nd 12" },
  { type: "dozen3", label: "3rd 12" },
];

export function RouletteGame() {
  const { best, submit } = useHighScore("roulette", { higherIsBetter: true });
  const [chips, setChips] = useState(START_CHIPS);
  const [betAmount, setBetAmount] = useState(10);
  const [bets, setBets] = useState<Bet[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [numberInput, setNumberInput] = useState(0);

  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = (type: BetType, number?: number) => {
    if (chips - totalWagered < betAmount) return;
    setBets((b) => [...b, { type, number, amount: betAmount }]);
    playArcadeSound("click");
  };

  const clearBets = () => setBets([]);

  const doSpin = () => {
    if (bets.length === 0) return;
    const n = spin();
    setResult(n);
    let net = 0;
    for (const bet of bets) net += resolveBet(bet, n);
    setChips((c) => {
      const next = c + net;
      submit(next);
      return next;
    });
    setBets([]);
    setMessage(`Landed on ${n} (${colorOf(n)}) — ${net >= 0 ? `won ${net}` : `lost ${-net}`}`);
    playArcadeSound(net >= 0 ? "win" : "lose");
  };

  const resetBankroll = () => {
    setChips(START_CHIPS);
    setBets([]);
    setResult(null);
    setMessage("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-lg items-center justify-between text-sm">
        <span className="chip">Chips: {chips}</span>
        <span className="chip">Wagered: {totalWagered}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      {result != null && (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ background: colorOf(result) === "red" ? "#c0392b" : colorOf(result) === "black" ? "#222" : "#2a9d5f" }}
        >
          {result}
        </div>
      )}
      {message && <p className="text-sm text-[var(--text-muted)]">{message}</p>}

      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--text-faint)]">Bet amount:</span>
        {[5, 10, 25, 50].map((amt) => (
          <button
            key={amt}
            onClick={() => setBetAmount(amt)}
            className="rounded border px-2 py-1"
            style={{ borderColor: "var(--border-strong)", background: betAmount === amt ? "var(--accent)" : "transparent" }}
          >
            {amt}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {OUTSIDE_BETS.map((b) => (
          <button key={b.type} className="btn !py-1 text-xs" onClick={() => addBet(b.type)}>
            {b.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={36}
          value={numberInput}
          onChange={(e) => setNumberInput(Math.max(0, Math.min(36, Number(e.target.value))))}
          className="w-16 rounded border bg-transparent px-2 py-1 text-sm"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <button className="btn !py-1 text-xs" onClick={() => addBet("number", numberInput)}>
          Straight-up (35:1)
        </button>
      </div>

      {bets.length > 0 && (
        <p className="text-xs text-[var(--text-faint)]">
          {bets.map((b, i) => `${b.type}${b.number != null ? ` ${b.number}` : ""}:${b.amount}`).join(", ")}
        </p>
      )}

      <div className="flex gap-2">
        <button className="btn" onClick={clearBets} disabled={bets.length === 0}>
          Clear bets
        </button>
        <button className="btn btn-primary" onClick={doSpin} disabled={bets.length === 0}>
          Spin
        </button>
      </div>

      {chips < betAmount && (
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
