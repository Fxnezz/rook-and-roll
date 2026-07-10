"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { BotCapableEngine, GameResult, Player } from "@/lib/boardgames/engines/types";
import { useLocalMatch, type LocalMode } from "@/lib/boardgames/useLocalMatch";
import { playArcadeSound } from "@/lib/arcade/sound";
import { RulesModal } from "@/components/ui/RulesModal";
import { useToasts } from "@/lib/hooks/useToasts";
import { ToastStack } from "@/components/ui/ToastStack";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements/catalog";

export interface BotDifficulty {
  label: string;
  depth: number;
}

export interface LocalBoardGamePageProps<TMove, TState> {
  title: string;
  blurb: string;
  mode: LocalMode;
  engine: BotCapableEngine<TMove, TState>;
  botFn?: (state: TState, player: Player, depth?: number) => TMove | null;
  /** Optional Easy/Medium/Hard presets — when provided (bot mode only), shows a difficulty picker that maps to the bot's search depth. */
  difficulties?: BotDifficulty[];
  defaultDifficultyIndex?: number;
  /** Optional "How to play" bullet list — shows a "?" button in the header that opens a rules modal. */
  rules?: string[];
  /** Stable slug (e.g. "othello") — when set, a bot-mode win is reported to /api/minigames/win for achievement tracking. */
  gameKey?: string;
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
  difficulties,
  defaultDifficultyIndex = difficulties ? Math.floor(difficulties.length / 2) : 0,
  rules,
  gameKey,
  seatLabel = (s) => (s === "a" ? "Player 1" : "Player 2"),
  renderBoard,
}: LocalBoardGamePageProps<TMove, TState>) {
  const { data: session } = useSession();
  const { toasts, push: pushToast } = useToasts();
  const [humanSeat, setHumanSeat] = useState<Player>("a");
  const [difficultyIdx, setDifficultyIdx] = useState(defaultDifficultyIndex);
  const [showRules, setShowRules] = useState(false);
  const reportedWinRef = useRef(false);
  const effectiveBotFn = useMemo(() => {
    if (!botFn) return undefined;
    if (!difficulties) return botFn;
    const depth = difficulties[difficultyIdx]?.depth;
    return (state: TState, player: Player) => botFn(state, player, depth);
  }, [botFn, difficulties, difficultyIdx]);
  const match = useLocalMatch(engine, mode, effectiveBotFn ?? noBot, humanSeat);
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

  useEffect(() => {
    if (!gameKey || !session?.user || mode !== "bot" || reportedWinRef.current) return;
    if (!match.status || match.status.winner !== humanSeat) return;
    reportedWinRef.current = true;
    fetch("/api/minigames/win", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: gameKey }),
    })
      .then((r) => r.json())
      .then((d: { achievements?: string[] }) => {
        for (const id of d.achievements ?? []) {
          const a = ACHIEVEMENT_BY_ID[id];
          if (a) pushToast(`${a.icon} Achievement unlocked: ${a.name}`);
        }
      })
      .catch(() => {});
  }, [match.status, mode, humanSeat, gameKey, session, pushToast]);

  const newGame = () => {
    match.reset();
    setShowResult(false);
    reportedWinRef.current = false;
  };

  const swapAndNewGame = () => {
    setHumanSeat((s) => (s === "a" ? "b" : "a"));
    match.reset();
    setShowResult(false);
    reportedWinRef.current = false;
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            {rules && (
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                onClick={() => setShowRules(true)}
                aria-label="How to play"
                title="How to play"
              >
                ?
              </button>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {blurb} · {mode === "bot" ? "vs Bot" : "Pass & Play"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "bot" && difficulties && (
            <div className="flex gap-1" role="group" aria-label="Bot difficulty">
              {difficulties.map((d, i) => (
                <button
                  key={d.label}
                  className="rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: i === difficultyIdx ? "var(--accent)" : "var(--border)",
                    background: i === difficultyIdx ? "var(--bg-elev-2)" : "transparent",
                    color: i === difficultyIdx ? "var(--text)" : "var(--text-muted)",
                  }}
                  onClick={() => {
                    setDifficultyIdx(i);
                    newGame();
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
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

      {showRules && rules && <RulesModal title={title} rules={rules} onClose={() => setShowRules(false)} />}
      <ToastStack toasts={toasts} />
    </div>
  );
}
