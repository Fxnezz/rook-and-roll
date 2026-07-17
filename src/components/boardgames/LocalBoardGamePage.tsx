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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionScore, setSessionScore] = useState({ a: 0, draws: 0, b: 0 });
  const reportedWinRef = useRef(false);
  const resultCountedRef = useRef(false);
  const effectiveBotFn = useMemo(() => {
    if (!botFn) return undefined;
    if (!difficulties) return botFn;
    const depth = difficulties[difficultyIdx]?.depth;
    return (state: TState, player: Player) => botFn(state, player, depth);
  }, [botFn, difficulties, difficultyIdx]);
  const match = useLocalMatch(engine, mode, effectiveBotFn ?? noBot, humanSeat);
  const gameOver = match.status !== null;
  const [showResult, setShowResult] = useState(false);
  const prevStatus = useRef<GameResult | null>(null);

  useEffect(() => {
    if (match.status && !prevStatus.current) {
      setShowResult(true);
      if (!resultCountedRef.current) {
        resultCountedRef.current = true;
        setSessionScore((score) => match.status?.winner === null
          ? { ...score, draws: score.draws + 1 }
          : match.status?.winner === "a"
            ? { ...score, a: score.a + 1 }
            : { ...score, b: score.b + 1 });
      }
      if (mode === "bot") {
        playArcadeSound(match.status.winner === null ? "draw" : match.status.winner === humanSeat ? "win" : "lose");
      } else {
        playArcadeSound(match.status.winner === null ? "draw" : "win");
      }
    }
    prevStatus.current = match.status;
  }, [match.status, mode, humanSeat]);

  useEffect(() => {
    if (gameOver) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameOver]);

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
    resultCountedRef.current = false;
    setElapsedSeconds(0);
  };

  const swapAndNewGame = () => {
    setHumanSeat((s) => (s === "a" ? "b" : "a"));
    match.reset();
    setShowResult(false);
    reportedWinRef.current = false;
    resultCountedRef.current = false;
    setElapsedSeconds(0);
  };

  const undoMove = () => {
    match.undo();
    setShowResult(false);
    reportedWinRef.current = false;
    playArcadeSound("click");
  };

  const redoMove = () => {
    match.redo();
    setShowResult(false);
    playArcadeSound("click");
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

  const resultIcon = match.status?.winner === null
    ? "◇"
    : mode === "bot" && match.status?.winner !== humanSeat
      ? "♟"
      : "🏆";

  return (
    <div data-game-session data-session-phase={mode} className="mx-auto max-w-4xl px-4 py-6">
      <div className="game-match-header mb-4 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            {rules && (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
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
                  aria-pressed={i === difficultyIdx}
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
          <button className="btn btn-ghost !py-1.5 text-sm" onClick={undoMove} disabled={!match.canUndo} title={mode === "bot" ? "Undo the latest round" : "Undo the latest move"}>
            <span aria-hidden="true">↶</span> Undo
          </button>
          <button className="btn btn-ghost !py-1.5 text-sm" onClick={redoMove} disabled={!match.canRedo} title={mode === "bot" ? "Restore the latest round" : "Restore the latest move"}>
            <span aria-hidden="true">↷</span> Redo
          </button>
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
        <div className="game-status-rail" aria-live="polite">
          <div className="chip game-status-main">
            {statusText}
            {match.thinking && (
              <span className="game-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            )}
          </div>
          <div className="chip" title="Moves played"><span aria-hidden="true">◆</span> {match.moveCount} {match.moveCount === 1 ? "move" : "moves"}</div>
          <div className="chip" title="Elapsed game time"><span aria-hidden="true">◷</span> {formatDuration(elapsedSeconds)}</div>
          {mode === "bot" && difficulties && <div className="chip"><span aria-hidden="true">◈</span> {difficulties[difficultyIdx]?.label}</div>}
          <div className="chip game-series-score" title="Session score">
            <span>{mode === "bot" ? "You" : seatLabel("a")} <b>{mode === "bot" && humanSeat === "b" ? sessionScore.b : sessionScore.a}</b></span>
            <i>·</i><span>Draw <b>{sessionScore.draws}</b></span><i>·</i>
            <span>{mode === "bot" ? "Bot" : seatLabel("b")} <b>{mode === "bot" && humanSeat === "b" ? sessionScore.a : sessionScore.b}</b></span>
          </div>
        </div>
        <div className="game-board-stage" data-game-board>
          {renderBoard({
            state: match.state,
            mySeat: mySeatForBoard,
            interactive: !match.status,
            onMove: match.sendMove,
            status: match.status,
            lastMove: match.lastMove,
          })}
        </div>
      </div>

      {showResult && match.status && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="presentation">
          <div className="panel game-result-card w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="match-result-title">
            <div className="game-result-icon" aria-hidden="true">{resultIcon}</div>
            <p className="text-xl font-bold">
              <span id="match-result-title">
              {match.status.winner === null
                ? "Draw"
                : mode === "bot"
                  ? match.status.winner === humanSeat
                    ? "You won!"
                    : "Bot won"
                  : `${seatLabel(match.status.winner)} wins!`}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{match.status.reason}</p>
            <p className="mt-3 font-mono text-xs text-[var(--text-faint)]">Completed in {match.moveCount} {match.moveCount === 1 ? "move" : "moves"}</p>
            <div className="game-result-series" aria-label="Session score">
              <span><strong>{mode === "bot" ? "You" : seatLabel("a")}</strong><b>{mode === "bot" && humanSeat === "b" ? sessionScore.b : sessionScore.a}</b></span>
              <span><strong>Draws</strong><b>{sessionScore.draws}</b></span>
              <span><strong>{mode === "bot" ? "Bot" : seatLabel("b")}</strong><b>{mode === "bot" && humanSeat === "b" ? sessionScore.a : sessionScore.b}</b></span>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn btn-ghost" onClick={() => setShowResult(false)}>
                View board
              </button>
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
