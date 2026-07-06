"use client";

import { useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SIZE, newGame, fireAt, allSunk, pickBotShot, type BattleshipState } from "@/lib/arcade/battleship";

function Board({
  board,
  showShips,
  interactive,
  onFire,
}: {
  board: BattleshipState["player"];
  showShips: boolean;
  interactive: boolean;
  onFire?: (cell: number) => void;
}) {
  const shipCells = new Set(board.ships.flatMap((s) => s.cells));
  return (
    <div className="grid gap-[2px] rounded-md bg-[var(--bg-elev)] p-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 28px)` }}>
      {board.shots.map((shot, i) => {
        const hasShip = shipCells.has(i);
        return (
          <button
            key={i}
            disabled={!interactive || shot != null}
            onClick={() => onFire?.(i)}
            className="flex items-center justify-center rounded-sm text-xs"
            style={{
              width: 28,
              height: 28,
              background: shot === true ? "var(--bad)" : shot === false ? "var(--border)" : showShips && hasShip ? "var(--text-faint)" : "var(--bg)",
              cursor: interactive && shot == null ? "pointer" : "default",
            }}
          >
            {shot === true ? "✹" : shot === false ? "•" : ""}
          </button>
        );
      })}
    </div>
  );
}

export function BattleshipGame() {
  const { best, submit } = useHighScore("battleship", { higherIsBetter: false });
  const [state, setState] = useState<BattleshipState | null>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState(newGame());
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!state || state.turn !== "bot" || state.status !== "playing") return;
    botTimer.current = setTimeout(() => {
      setState((s) => {
        if (!s) return s;
        const cell = pickBotShot(s.player);
        const res = fireAt(s.player, cell);
        playArcadeSound(res.hit ? "capture" : "click");
        const player = res.board;
        if (allSunk(player)) {
          playArcadeSound("lose");
          return { ...s, player, status: "lost" };
        }
        return { ...s, player, turn: "player" };
      });
    }, 500);
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [state?.turn, state?.status, state]);

  if (!state) return null;

  const fire = (cell: number) => {
    if (state.turn !== "player" || state.status !== "playing") return;
    const res = fireAt(state.bot, cell);
    playArcadeSound(res.hit ? "capture" : "click");
    const bot = res.board;
    if (allSunk(bot)) {
      // Hits alone are always constant at a win (every hit is on a ship cell,
      // by definition of "sunk"); total shots (hits + misses) is what varies
      // and reflects how efficiently the fleet was found.
      const totalShots = bot.shots.filter((s) => s !== null).length;
      submit(totalShots);
      playArcadeSound("win");
      setState({ ...state, bot, status: "won" });
      return;
    }
    setState({ ...state, bot, turn: "bot" });
  };

  const reset = () => setState(newGame());

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-2xl items-center justify-between text-sm">
        <span className="chip">
          {state.status === "playing" ? (state.turn === "player" ? "Your shot" : "Bot is aiming…") : state.status === "won" ? "You won!" : "You lost"}
        </span>
        {best != null && <span className="chip">Fewest shots to win: {best}</span>}
        <button className="btn !py-1 text-xs" onClick={reset}>
          New game
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="label">Enemy waters — fire here</span>
          <Board board={state.bot} showShips={state.status !== "playing"} interactive={state.status === "playing" && state.turn === "player"} onFire={fire} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="label">Your fleet</span>
          <Board board={state.player} showShips interactive={false} />
        </div>
      </div>
    </div>
  );
}
