"use client";

import { useEffect, useRef, useState } from "react";
import type { BotCapableEngine, GameResult, Player } from "@/lib/boardgames/engines/types";
import { useLocalMatch, type LocalMode } from "@/lib/boardgames/useLocalMatch";
import { playArcadeSound } from "@/lib/arcade/sound";

export interface LocalBoardGamePageProps<TMove, TState> {
  title: string;
  blurb: string;
  mode: LocalMode;
  engine: BotCapableEngine<TMove, TState>;
  botFn?: (state: TState, player: Player) => TMove | null;
  seatLabel?: (seat: Player) => string;
  renderBoard: (opts: {
    state: TState;
    mySeat: Player | null;
    interactive: boolean;
    onMove: (move: TMove) => void;
    status: GameResult | null;
    lastMove: { move: TMove; by: Player; seq: number } | null;
  }) => React.ReactNode;
}

const noBot = () => null;

export function LocalBoardGamePage<TMove, TState>({
  title,
  blurb,
  mode,
  engine,
  botFn,
  seatLabel = (s) => (s === "a" ? "Player 1" : "Player 2"),
  renderBoard,
}: LocalBoardGamePageProps<TMove, TState>) {
  const [humanSeat, setHumanSeat] = useState<Player>("a");
  const match = useLocalMatch(engine, mode, botFn ?? noBot, humanSeat);
  const [showResult, setShowResult] = useState(false);
  const prevStatus = useRef<GameResult | null>(null);

  useEffect(() => {
    if (match.status && !prevStatus.current) {
      setShowResult(true);
      if (mode === "bot") {
        playArcadeSound(match.status.winner === null ? "draw" : match.status.winner === humanSeat ? "win" : "lose");
      } else {
        playArcadeSound(match.status.winner === null ? "draw" : "win");
      }
    }
    prevStatus.current = match.status;
  }, [match.status, mode, humanSeat]);

  const newGame = () => {
    match.reset();
    setShowResult(false);
  };

  const swapAndNewGame = () => {
    setHumanSeat((s) => (s === "a" ? "b" : "a"));
    match.reset();
    setShowResult(false);
  };

  const mySeatForBoard = mode === "passplay" ? match.turn : humanSeat;

  const statusText = match.status
    ? match.status.winner === null
      ? "Draw — " + match.status.reason
      : mode === "bot"
        ? match.status.winner === humanSeat
          ? "You won!"
          : "Bot won"
        : `${seatLabel(match.status.winner)} wins`
    : mode === "bot"
      ? match.turn === humanSeat
        ? "Your move"
        : match.thinking
          ? "Bot is thinking…"
          : "Bot's move"
      : `${seatLabel(match.turn)} to move`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {blurb} · {mode === "bot" ? "vs Bot" : "Pass & Play"}
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "bot" && (
            <button className="btn btn-ghost !py-1.5 text-sm" onClick={swapAndNewGame}>
              Swap sides
            </button>
          )}
          <button className="btn !py-1.5 text-sm" onClick={newGame}>
            New game
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="chip">{statusText}</div>
        {renderBoard({
          state: match.state,
          mySeat: mySeatForBoard,
          interactive: !match.status,
          onMove: match.sendMove,
          status: match.status,
          lastMove: match.lastMove,
        })}
      </div>

      {showResult && match.status && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel w-full max-w-sm p-6 text-center">
            <p className="text-xl font-bold">
              {match.status.winner === null
                ? "Draw"
                : mode === "bot"
                  ? match.status.winner === humanSeat
                    ? "You won!"
                    : "Bot won"
                  : `${seatLabel(match.status.winner)} wins!`}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{match.status.reason}</p>
            <div className="mt-4 flex justify-center gap-2">
              {mode === "bot" && (
                <button className="btn" onClick={swapAndNewGame}>
                  Swap sides
                </button>
              )}
              <button className="btn btn-primary" onClick={newGame}>
                Play again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
