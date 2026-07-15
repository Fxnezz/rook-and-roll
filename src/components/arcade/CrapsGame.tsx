"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { Die } from "@/components/arcade/Die";
import { newGame, roll, type CrapsState } from "@/lib/arcade/craps";

const START_CHIPS = 100;

export function CrapsGame() {
  const { best, submit } = useHighScore("craps", { higherIsBetter: true });
  const [chips, setChips] = useState(START_CHIPS);
  const [bet, setBet] = useState(10);
  const [state, setState] = useState<CrapsState>(() => newGame());
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("Place your Pass Line bet and roll.");
  const [wagered, setWagered] = useState(false);

  const startBet = () => {
    if (chips < bet || wagered) return;
    setWagered(true);
    setMessage("Come-out roll — rolling for 7/11 (win) or 2/3/12 (lose).");
  };

  const doRoll = () => {
    if (!wagered) return;
    const res = roll(state);
    setDice(res.dice);
    setState(res.state);
    if (res.outcome === "win") {
      setChips((c) => {
        const next = c + bet;
        submit(next);
        return next;
      });
      setMessage(`Rolled ${res.dice[0]}+${res.dice[1]}=${res.dice[0] + res.dice[1]} — Pass Line wins!`);
      setWagered(false);
      playArcadeSound("win");
    } else if (res.outcome === "lose") {
      setChips((c) => {
        const next = c - bet;
        submit(next);
        return next;
      });
      setMessage(`Rolled ${res.dice[0]}+${res.dice[1]}=${res.dice[0] + res.dice[1]} — seven out, Pass Line loses.`);
      setWagered(false);
      playArcadeSound("lose");
    } else {
      setMessage(
        state.phase === "comeout"
          ? `Point is ${res.dice[0] + res.dice[1]}. Roll it again before a 7 to win.`
          : `Rolled ${res.dice[0]}+${res.dice[1]}=${res.dice[0] + res.dice[1]} — keep rolling for ${state.point} (avoid 7).`,
      );
      playArcadeSound("click");
    }
  };

  const resetBankroll = () => {
    setChips(START_CHIPS);
    setState(newGame());
    setDice(null);
    setWagered(false);
    setMessage("Place your Pass Line bet and roll.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Chips: {chips}</span>
        <span className="chip">Point: {state.point ?? "—"}</span>
        {best != null && <span className="chip">Best: {best}</span>}
      </div>

      {dice && (
        <div className="flex gap-3">
          <Die value={dice[0]} />
          <Die value={dice[1]} />
        </div>
      )}

      <p className="max-w-sm text-center text-sm text-[var(--text-muted)]">{message}</p>

      {!wagered ? (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-faint)]">Bet:</span>
            {[5, 10, 25, 50].map((amt) => (
              <button
                key={amt}
                onClick={() => setBet(amt)}
                className="rounded border px-2 py-1"
                style={{ borderColor: "var(--border-strong)", background: bet === amt ? "var(--accent)" : "transparent" }}
              >
                {amt}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" disabled={chips < bet} onClick={startBet}>
            Bet Pass Line ({bet})
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={doRoll}>
          Roll
        </button>
      )}

      {chips < bet && !wagered && (
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
