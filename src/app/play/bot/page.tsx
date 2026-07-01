"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { CapturedTray } from "@/components/game/CapturedTray";
import { GameControls } from "@/components/game/GameControls";
import { GameOverModal } from "@/components/game/GameOverModal";
import { EvalBar } from "@/components/game/EvalBar";
import { Clock } from "@/components/game/Clock";
import { BotSetup, type BotConfig } from "@/components/bot/BotSetup";
import { AnalysisPanel } from "@/components/bot/AnalysisPanel";
import { useChessGame, type GameStatus } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { useClock, getTimeControl } from "@/lib/chess/useClock";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio } from "@/lib/chess/sound";
import { getEngine } from "@/lib/engine/stockfish";
import { getTier, chooseMove } from "@/lib/engine/bots";
import { analyzeGame, type GameAnalysis } from "@/lib/engine/analysis";
import { IconFlag, IconPlus } from "@/components/ui/icons";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function playMoveSound(san: string, flags: string, promotion?: string, over?: boolean) {
  if (over) return; // gameEnd handled separately
  if (san.includes("+")) playSound("check");
  else if (flags.includes("e") || flags.includes("c")) playSound("capture");
  else if (flags.includes("k") || flags.includes("q")) playSound("castle");
  else if (promotion) playSound("promote");
  else playSound("move");
}

export default function BotGamePage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  if (!config) return <BotSetup onStart={setConfig} />;
  return <BotGame config={config} onExit={() => setConfig(null)} key={JSON.stringify(config)} />;
}

function BotGame({ config, onExit }: { config: BotConfig; onExit: () => void }) {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const tier = getTier(config.tierId);
  const tc = getTimeControl(config.timeControlId);

  const humanColor = config.color;
  const botColor: Color = humanColor === "w" ? "b" : "w";
  const orientation = humanColor;

  const [thinking, setThinking] = useState(false);
  const [evalScore, setEvalScore] = useState<{ cp: number | null; mate: number | null }>({ cp: 0, mate: null });
  const [override, setOverride] = useState<GameStatus | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [tab, setTab] = useState<"moves" | "analysis">("moves");
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: session } = useSession();
  const botFenRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const savedRef = useRef(false);

  const saveGame = useCallback(
    (finalStatus: GameStatus) => {
      if (savedRef.current || !session?.user || !finalStatus.result || finalStatus.result === undefined) return;
      if (snapshot.moves.length === 0) return;
      savedRef.current = true;
      const resultMap = { "1-0": "WHITE_WINS", "0-1": "BLACK_WINS", "1/2-1/2": "DRAW" } as const;
      const body = {
        pgn: game.getPgn(),
        finalFen: game.getFen(),
        result: resultMap[finalStatus.result],
        termination: finalStatus.reason ?? "Game over",
        category: tc.category,
        timeControl: tc.id,
        opponentType: "BOT" as const,
        botTier: tier.id,
        botElo: tier.elo,
        color: humanColor,
        opponentName: tier.name,
        rated: tc.category !== "untimed",
        moves: snapshot.moves.map((m, i) => ({
          ply: i + 1,
          san: m.san,
          uci: m.from + m.to + (m.promotion ?? ""),
          fen: m.after,
        })),
      };
      fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, snapshot.moves, tc, tier, humanColor, game],
  );

  const clock = useClock(tc, (loser) => {
    setOverride({
      over: true,
      result: loser === "w" ? "0-1" : "1-0",
      winner: loser === "w" ? "b" : "w",
      reason: "Timeout",
    });
  });

  const status: GameStatus = override ?? snapshot.status;

  // Boot engine + start clock once.
  useEffect(() => {
    const engine = getEngine();
    primeAudio();
    playSound("gameStart");
    (async () => {
      await engine.init();
      await engine.newGame();
      await engine.setSkillLevel(tier.skill);
    })();
    clock.reset();
    clock.start("w");
    startedRef.current = true;
    return () => {
      // keep the shared engine alive for the next game; just stop searching
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop clock + end sound when the game is over.
  useEffect(() => {
    if (status.over) {
      clock.stop();
      setShowResult(true);
      playSound("gameEnd");
      saveGame(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.over]);

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const move = game.makeMove({ from, to, promotion });
      if (!move) {
        playSound("illegal");
        return null;
      }
      playMoveSound(move.san, move.flags, move.promotion, false);
      clock.moved(move.color);
      return move;
    },
    [game, clock],
  );

  const onHumanMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (status.over || snapshot.turn !== humanColor) return;
      primeAudio();
      applyMove(from, to, promotion);
    },
    [applyMove, status.over, snapshot.turn, humanColor],
  );

  // Bot move loop.
  useEffect(() => {
    if (status.over || !snapshot.isLive || snapshot.turn !== botColor) return;
    if (botFenRef.current === snapshot.fen) return;
    botFenRef.current = snapshot.fen;
    let cancelled = false;
    let done = false;
    (async () => {
      setThinking(true);
      const engine = getEngine();
      const t0 = performance.now();
      try {
        const res = await engine.go(snapshot.fen, { depth: tier.depth, multipv: tier.multipv });
        if (cancelled) return;
        // update eval bar from the bot's own search
        const l0 = res.lines[0];
        if (l0) {
          const sign = snapshot.turn === "w" ? 1 : -1;
          setEvalScore({ cp: l0.cp != null ? l0.cp * sign : null, mate: l0.mate != null ? l0.mate * sign : null });
        }
        const uci = chooseMove(res.lines, tier);
        const elapsed = performance.now() - t0;
        if (elapsed < 380) await sleep(380 - elapsed);
        if (cancelled) return;
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
        applyMove(from, to, promotion);
        done = true;
      } finally {
        if (!cancelled) setThinking(false);
      }
    })();
    return () => {
      cancelled = true;
      if (!done) botFenRef.current = null; // allow re-run (dev StrictMode / interruptions)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, snapshot.isLive, status.over, botColor]);

  // Eval bar on the human's turn.
  useEffect(() => {
    if (!config.showEval || status.over || !snapshot.isLive || snapshot.turn !== humanColor) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getEngine().evaluate(snapshot.fen, { depth: 12 });
        if (!cancelled) setEvalScore({ cp: r.cp, mate: r.mate });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, snapshot.isLive, status.over, config.showEval, humanColor]);

  const resign = () => {
    setOverride({
      over: true,
      result: humanColor === "w" ? "0-1" : "1-0",
      winner: botColor,
      reason: "Resignation",
    });
  };

  const runAnalysis = useCallback(async () => {
    setTab("analysis");
    setShowResult(false);
    setAnalysis(null);
    const moves = snapshot.moves;
    if (moves.length === 0) return;
    const positions = moves.map((m) => m.before).concat(moves[moves.length - 1].after);
    const input = {
      positions,
      moves: moves.map((m) => ({
        san: m.san,
        uci: m.from + m.to + (m.promotion ?? ""),
        color: m.color,
      })),
    };
    setAnalysisProgress({ done: 0, total: positions.length });
    const result = await analyzeGame(getEngine(), input, {
      depth: 12,
      onProgress: (done, total) => setAnalysisProgress({ done, total }),
    });
    setAnalysis(result);
    setAnalysisProgress(null);
  }, [snapshot.moves]);

  const canBack = snapshot.viewPly > 0;
  const canForward = snapshot.viewPly < snapshot.moves.length;

  const statusText = useMemo(() => {
    if (status.over) {
      const r = status.result === "1/2-1/2" ? "Draw" : status.winner === humanColor ? "You win" : `${tier.name} wins`;
      return `${r} — ${status.reason}`;
    }
    if (thinking) return `${tier.name} is thinking…`;
    return snapshot.turn === humanColor ? "Your move" : `${tier.name} to move`;
  }, [status, thinking, snapshot.turn, humanColor, tier.name]);

  const PlayerBar = ({ side }: { side: Color }) => {
    const isBot = side === botColor;
    const isWhite = side === "w";
    const captured = isWhite ? snapshot.captured.byWhite : snapshot.captured.byBlack;
    const adv = isWhite
      ? Math.max(0, snapshot.captured.materialDiff)
      : Math.max(0, -snapshot.captured.materialDiff);
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black"
            style={{
              background: isBot ? `${tier.accent}22` : "var(--bg-elev-2)",
              color: isBot ? tier.accent : "var(--text-muted)",
            }}
          >
            {isBot ? tier.name[0] : "You"[0]}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              {isBot ? tier.name : "You"}
              {isBot && <span className="ml-1.5 text-xs font-normal text-[var(--text-faint)]">{tier.elo}</span>}
            </div>
            <CapturedTray pieces={captured} color={isWhite ? "b" : "w"} set={settings.pieceSet} advantage={adv} />
          </div>
        </div>
        {!tc.category.includes("untimed") && !clock.untimed && (
          <Clock ms={isWhite ? clock.whiteMs : clock.blackMs} active={clock.active === side && !status.over} />
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={onExit}>
          ← New opponent
        </button>
        <div className="flex gap-2">
          {!status.over && snapshot.moves.length > 0 && (
            <button className="btn btn-danger" onClick={resign}>
              <IconFlag width={16} height={16} /> Resign
            </button>
          )}
          {status.over && (
            <button className="btn btn-primary" onClick={onExit}>
              <IconPlus width={16} height={16} /> New game
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full gap-2 lg:max-w-[min(72vh,640px)]">
          {config.showEval && (
            <div className="hidden sm:block" style={{ width: 14 }}>
              <EvalBar cp={evalScore.cp} mate={evalScore.mate} orientation={orientation} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <PlayerBar side={botColor} />
            <Board
              snapshot={snapshot}
              orientation={orientation}
              theme={theme}
              pieceSet={settings.pieceSet}
              legalMovesFrom={game.legalMovesFrom}
              onMove={onHumanMove}
              movableColor={humanColor}
              showCoordinates={settings.showCoordinates}
              showLegalMoves={settings.showLegalMoves}
              highlightLastMove={settings.highlightLastMove}
              animate={settings.animate}
            />
            <PlayerBar side={humanColor} />
            <div className="panel mt-1 p-2">
              <GameControls
                onFirst={game.goStart}
                onPrev={game.stepBack}
                onNext={game.stepForward}
                onLast={game.goLive}
                onFlip={() => {}}
                canBack={canBack}
                canForward={canForward}
              />
            </div>
          </div>
        </div>

        <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold">{statusText}</p>
            {thinking && (
              <span className="dot-blink flex gap-0.5 text-[var(--accent)]">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </span>
            )}
          </div>
          <div className="flex border-b border-[var(--border)]">
            {(["moves", "analysis"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? "border-[var(--accent)] text-[var(--text)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-[240px] flex-1 overflow-hidden lg:min-h-0">
            {tab === "moves" ? (
              <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} />
            ) : (
              <AnalysisPanel
                analysis={analysis}
                progress={analysisProgress}
                onGoToPly={game.goToPly}
                viewPly={snapshot.viewPly}
              />
            )}
          </div>
          {tab === "analysis" && !analysis && !analysisProgress && (
            <div className="border-t border-[var(--border)] p-3">
              <button
                className="btn w-full"
                onClick={runAnalysis}
                disabled={snapshot.moves.length === 0}
              >
                Analyze game
              </button>
            </div>
          )}
        </div>
      </div>

      {showResult && status.over && (
        <GameOverModal
          status={status}
          onNewGame={onExit}
          onReview={() => {
            setShowResult(false);
            runAnalysis();
          }}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  );
}
