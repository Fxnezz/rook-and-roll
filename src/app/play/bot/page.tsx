"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import type { Arrow } from "@/components/board/ArrowLayer";
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
import { IconFlag, IconPlus, IconSparkles } from "@/components/ui/icons";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { ShortcutsHelpModal } from "@/components/ui/ShortcutsHelpModal";
import { CheatGate } from "@/components/cheats/CheatGate";
import { CheatPanel, type CheatLogEntry } from "@/components/cheats/CheatPanel";
import { CheatEffects, VOICE_LINES } from "@/components/cheats/CheatEffects";
import { illegalCastleFen, clonePieceFen, swapPiecesFen, promoteAnyPawnFen } from "@/lib/cheats/moveManipulation";
import { DEFAULT_BOT_OVERRIDE, resolveOverriddenMove, type BotOverride } from "@/lib/cheats/botManipulation";

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
  const [manualFlip, setManualFlip] = useState(false);
  const orientation: Color = manualFlip ? botColor : humanColor;
  const [showShortcuts, setShowShortcuts] = useState(false);

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
  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // --- cheat panel state (bot games only — see CheatGate/CheatPanel) ---
  const [botOverride, setBotOverride] = useState<BotOverride>(DEFAULT_BOT_OVERRIDE);
  const [showPredictedMove, setShowPredictedMove] = useState(false);
  const [predictedArrow, setPredictedArrow] = useState<Arrow | null>(null);
  const [cheatEffects, setCheatEffects] = useState({
    explodeCaptures: false,
    confettiOnCheckmate: false,
    dramaticZoom: false,
    pieceVoiceLines: false,
  });
  const [captureSeq, setCaptureSeq] = useState(0);
  const [checkmateSeq, setCheckmateSeq] = useState(0);
  const [zoomSeq, setZoomSeq] = useState(0);
  const [voiceLine, setVoiceLine] = useState<{ text: string; seq: number } | null>(null);
  const voiceSeqRef = useRef(0);
  const [cheatLog, setCheatLog] = useState<CheatLogEntry[]>([]);
  const cheatLogSeq = useRef(0);
  const [assistRunning, setAssistRunning] = useState(false);

  const logCheat = useCallback((text: string) => {
    cheatLogSeq.current += 1;
    setCheatLog((log) => [...log.slice(-49), { id: cheatLogSeq.current, text, ts: Date.now() }]);
  }, []);

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

      const isCapture = move.flags.includes("e") || move.flags.includes("c");
      const isCheckmate = move.san.includes("#");
      if (isCapture) setCaptureSeq((s) => s + 1);
      if (isCheckmate) setCheckmateSeq((s) => s + 1);
      if (isCapture || isCheckmate || move.san.includes("+")) setZoomSeq((s) => s + 1);
      voiceSeqRef.current += 1;
      setVoiceLine({ text: VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)], seq: voiceSeqRef.current });

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

  // Fire a queued premove the instant it becomes the human's turn (i.e. right
  // after the bot's move lands), if it's still legal; otherwise drop it.
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null);
  useEffect(() => {
    if (!premove || status.over || snapshot.turn !== humanColor) return;
    const options = game.legalMovesFrom(premove.from).filter((mv) => mv.to === premove.to);
    setPremove(null);
    if (options.length === 0) return;
    onHumanMove(premove.from, premove.to, options.some((mv) => mv.promotion) ? "q" : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, status.over, humanColor]);

  // --- legit hints & threats (no cheat gate — available to everyone) ---
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [autoHint, setAutoHint] = useState(false);
  const [showThreats, setShowThreats] = useState(false);

  const requestHint = useCallback(async () => {
    if (status.over || snapshot.turn !== humanColor) return;
    setHintLoading(true);
    try {
      const res = await getEngine().go(snapshot.fen, { depth: 14 });
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
      }
    } finally {
      setHintLoading(false);
    }
  }, [status.over, snapshot.turn, humanColor, snapshot.fen]);

  // Auto-hint: recompute the suggested move whenever it becomes the human's
  // turn, instead of waiting for a manual click.
  useEffect(() => {
    setHintArrow(null);
    if (!autoHint || status.over || snapshot.turn !== humanColor) return;
    let cancelled = false;
    (async () => {
      const res = await getEngine().go(snapshot.fen, { depth: 14 });
      if (cancelled) return;
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, autoHint, status.over, humanColor]);

  // Threats: arrows from each of the opponent's attacking pieces to a human
  // piece they currently attack, for the "show threats" toggle.
  const threatArrows = useMemo<Arrow[]>(() => {
    if (!showThreats) return [];
    const probe = new Chess(snapshot.fen);
    const opponentColor: Color = humanColor === "w" ? "b" : "w";
    const arrows: Arrow[] = [];
    for (const row of snapshot.board) {
      for (const cell of row) {
        if (!cell || cell.color !== humanColor) continue;
        const attackers = probe.attackers(cell.square, opponentColor);
        for (const from of attackers) arrows.push({ from, to: cell.square, color: "#e5604d" });
      }
    }
    return arrows;
  }, [showThreats, snapshot.fen, snapshot.board, humanColor]);

  // Bot move loop. Respects the cheat panel's bot override (blunder mode /
  // personality / skill override) and, if the "predicted move" toggle is on,
  // briefly shows the chosen move as a ghost arrow before actually playing it
  // — reusing the exact same search result rather than a second engine call.
  useEffect(() => {
    if (status.over || !snapshot.isLive || snapshot.turn !== botColor) return;
    if (botFenRef.current === snapshot.fen) return;
    botFenRef.current = snapshot.fen;
    let cancelled = false;
    let done = false;
    (async () => {
      setThinking(true);
      const engine = getEngine();
      await engine.setSkillLevel(botOverride.skillOverride ?? tier.skill);
      const t0 = performance.now();
      try {
        const wantsWiderPool = botOverride.blunderMode || botOverride.personality !== "normal";
        const res = await engine.go(snapshot.fen, {
          depth: tier.depth,
          multipv: wantsWiderPool ? Math.max(tier.multipv, 4) : tier.multipv,
        });
        if (cancelled) return;
        // update eval bar from the bot's own search
        const l0 = res.lines[0];
        if (l0) {
          const sign = snapshot.turn === "w" ? 1 : -1;
          setEvalScore({ cp: l0.cp != null ? l0.cp * sign : null, mate: l0.mate != null ? l0.mate * sign : null });
        }
        const uci = resolveOverriddenMove(snapshot.fen, res.lines, botOverride, () => chooseMove(res.lines, tier));
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;

        if (showPredictedMove) {
          setPredictedArrow({ from, to, color: "#5aa8e0" });
          await sleep(650);
          if (cancelled) return;
        }
        const elapsed = performance.now() - t0;
        if (elapsed < 380) await sleep(380 - elapsed);
        if (cancelled) return;
        setPredictedArrow(null);
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
  }, [snapshot.fen, snapshot.turn, snapshot.isLive, status.over, botColor, botOverride, showPredictedMove]);

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

  const [confirmingResign, setConfirmingResign] = useState(false);
  const handleResignClick = () => {
    if (!confirmingResign) {
      setConfirmingResign(true);
      setTimeout(() => setConfirmingResign(false), 3000);
      return;
    }
    setConfirmingResign(false);
    resign();
  };

  /** Undo takes back a full round trip (bot's reply + our move) so it's our turn again. */
  const undoLastRound = useCallback(() => {
    if (status.over || snapshot.moves.length === 0) return;
    game.undo();
    if (snapshot.moves.length > 1) game.undo();
  }, [game, status.over, snapshot.moves.length]);

  // --- cheat panel action handlers (bot games only) ---
  const cheatIllegalCastle = useCallback(
    (side: "k" | "q") => {
      const fen = illegalCastleFen(game.getFen(), snapshot.turn, side);
      if (fen) {
        game.loadFen(fen);
        logCheat(`Illegal castle (${side === "k" ? "O-O" : "O-O-O"}) for ${snapshot.turn === "w" ? "White" : "Black"}`);
      } else {
        logCheat("Illegal castle failed — no king/rook on the expected squares");
      }
    },
    [game, snapshot.turn, logCheat],
  );

  const cheatClonePiece = useCallback(
    (from: Square, to: Square) => {
      const fen = clonePieceFen(game.getFen(), from, to);
      if (fen) {
        game.loadFen(fen);
        logCheat(`Cloned the piece on ${from} onto ${to}`);
      } else {
        logCheat(`Clone failed — no piece on ${from}`);
      }
    },
    [game, logCheat],
  );

  const cheatSwapPieces = useCallback(
    (sq1: Square, sq2: Square) => {
      const fen = swapPiecesFen(game.getFen(), sq1, sq2);
      game.loadFen(fen);
      logCheat(`Swapped ${sq1} ↔ ${sq2}`);
    },
    [game, logCheat],
  );

  const cheatReverseMoves = useCallback(
    (n: number) => {
      const targetPly = Math.max(0, snapshot.moves.length - n);
      game.goToPly(targetPly);
      logCheat(`Rewound ${n} half-move${n === 1 ? "" : "s"} (make a move to branch from here)`);
    },
    [game, snapshot.moves.length, logCheat],
  );

  const cheatPromotePawn = useCallback(
    (square: Square, piece: "q" | "r" | "b" | "n") => {
      const fen = promoteAnyPawnFen(game.getFen(), square, piece);
      if (fen) {
        game.loadFen(fen);
        logCheat(`Promoted the pawn on ${square} to ${piece.toUpperCase()}`);
      } else {
        logCheat(`Promote failed — no pawn on ${square}`);
      }
    },
    [game, logCheat],
  );

  const cheatBotOverrideChange = useCallback(
    (patch: Partial<BotOverride>) => {
      setBotOverride((o) => ({ ...o, ...patch }));
      const [key, value] = Object.entries(patch)[0] ?? [];
      logCheat(`Bot override: ${key} → ${JSON.stringify(value)}`);
    },
    [logCheat],
  );

  const cheatFreezeClock = useCallback(
    (side: "w" | "b", frozen: boolean) => {
      clock.setFrozen(side, frozen);
      logCheat(`${frozen ? "Froze" : "Unfroze"} ${side === "w" ? "White" : "Black"}'s clock`);
    },
    [clock, logCheat],
  );

  const cheatAddTime = useCallback(
    (side: "w" | "b", seconds: number) => {
      clock.addTime(side, seconds * 1000);
      logCheat(`${seconds >= 0 ? "+" : ""}${seconds}s to ${side === "w" ? "White" : "Black"}`);
    },
    [clock, logCheat],
  );

  const cheatInstantResult = useCallback(
    (result: "win" | "loss" | "draw") => {
      if (result === "win") {
        setOverride({ over: true, result: humanColor === "w" ? "1-0" : "0-1", winner: humanColor, reason: "Cheat: instant win" });
      } else if (result === "loss") {
        setOverride({ over: true, result: humanColor === "w" ? "0-1" : "1-0", winner: botColor, reason: "Cheat: instant loss" });
      } else {
        setOverride({ over: true, result: "1/2-1/2", reason: "Cheat: instant draw" });
      }
      logCheat(`Instant ${result}`);
    },
    [humanColor, botColor, logCheat],
  );

  const cheatStockfishAssist = useCallback(async () => {
    if (status.over || snapshot.turn !== humanColor) return;
    setAssistRunning(true);
    try {
      const res = await getEngine().go(snapshot.fen, { depth: 10 });
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
        applyMove(from, to, promotion);
        logCheat(`Stockfish assist (depth 10) played ${uci}`);
      }
    } finally {
      setAssistRunning(false);
    }
  }, [status.over, snapshot.turn, snapshot.fen, humanColor, applyMove, logCheat]);

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

  useKeyboardShortcuts({
    onFlip: () => setManualFlip((v) => !v),
    onStepBack: game.stepBack,
    onStepForward: game.stepForward,
    onGoStart: game.goStart,
    onGoLive: game.goLive,
    onToggleHelp: () => setShowShortcuts((v) => !v),
  });

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
          <Clock
            ms={isWhite ? clock.whiteMs : clock.blackMs}
            active={clock.active === side && !status.over}
            tickSound={side === humanColor}
          />
        )}
      </div>
    );
  };

  return (
    <CheatGate>
      {(cheatPanelOpen, setCheatPanelOpen) => (
        <div className="mx-auto max-w-6xl px-4 py-5">
      {cheatPanelOpen && (
        <CheatPanel
          onClose={() => setCheatPanelOpen(false)}
          log={cheatLog}
          onIllegalCastle={cheatIllegalCastle}
          onClonePiece={cheatClonePiece}
          onSwapPieces={cheatSwapPieces}
          onReverseMoves={cheatReverseMoves}
          onPromotePawn={cheatPromotePawn}
          botOverride={botOverride}
          onBotOverrideChange={cheatBotOverrideChange}
          showPredictedMove={showPredictedMove}
          onShowPredictedMoveChange={setShowPredictedMove}
          onFreezeClock={cheatFreezeClock}
          frozenSides={clock.frozen}
          onAddTime={cheatAddTime}
          onInstantResult={cheatInstantResult}
          effects={cheatEffects}
          onEffectsChange={(patch) => setCheatEffects((e) => ({ ...e, ...patch }))}
          onStockfishAssist={cheatStockfishAssist}
          assistRunning={assistRunning}
        />
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={onExit}>
          ← New opponent
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {!status.over && (
            <>
              <button
                className="btn"
                onClick={requestHint}
                disabled={hintLoading || snapshot.turn !== humanColor}
                title="Show the engine's suggested move as an arrow"
              >
                <IconSparkles width={16} height={16} /> {hintLoading ? "Thinking…" : "Hint"}
              </button>
              <button
                className={`btn ${autoHint ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
                onClick={() => setAutoHint((v) => !v)}
                title="Always show the suggested move on your turn"
              >
                Auto-hint
              </button>
              <button
                className={`btn ${showThreats ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
                onClick={() => setShowThreats((v) => !v)}
                title="Highlight your pieces currently under attack"
              >
                Threats
              </button>
            </>
          )}
          {!status.over && snapshot.moves.length > 0 && (
            <button className={`btn ${confirmingResign ? "btn-danger" : ""}`} onClick={handleResignClick}>
              <IconFlag width={16} height={16} /> {confirmingResign ? "Confirm resign?" : "Resign"}
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
            <div ref={boardWrapperRef} className="relative">
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
                extraArrows={[...(predictedArrow ? [predictedArrow] : []), ...(hintArrow ? [hintArrow] : []), ...threatArrows]}
                squareColorOverride={settings.squareColorOverride}
                colorblindMode={settings.colorblindMode}
                pieceSizePercent={settings.pieceSize}
                animationSpeed={settings.animationSpeed}
                arrowColor={settings.arrowColor}
                boardFrame={settings.boardFrame}
                zoomPercent={settings.boardZoom}
                confirmMove={settings.confirmMove}
                autoQueen={settings.autoQueen}
                moveInputMode={settings.moveInputMode}
                premovesEnabled={settings.premovesEnabled}
                premove={premove}
                onSetPremove={(from, to) => setPremove({ from, to })}
                onCancelPremove={() => setPremove(null)}
              />
              <CheatEffects
                captureSeq={captureSeq}
                checkmateSeq={checkmateSeq}
                zoomSeq={zoomSeq}
                voiceLine={voiceLine}
                toggles={cheatEffects}
                zoomTargetRef={boardWrapperRef}
              />
            </div>
            <PlayerBar side={humanColor} />
            <div className="panel mt-1 p-2">
              <GameControls
                onFirst={game.goStart}
                onPrev={game.stepBack}
                onNext={game.stepForward}
                onLast={game.goLive}
                onFlip={() => setManualFlip((v) => !v)}
                onUndo={undoLastRound}
                canBack={canBack}
                canForward={canForward}
                canUndo={!status.over && snapshot.moves.length > 0 && snapshot.turn === humanColor}
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

      {showShortcuts && <ShortcutsHelpModal onClose={() => setShowShortcuts(false)} />}
        </div>
      )}
    </CheatGate>
  );
}
