"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import type { Arrow } from "@/components/board/ArrowLayer";
import { MoveList } from "@/components/game/MoveList";
import { OpeningTicker } from "@/components/game/OpeningTicker";
import { CapturedTray } from "@/components/game/CapturedTray";
import { GameControls } from "@/components/game/GameControls";
import { GameOverModal } from "@/components/game/GameOverModal";
import { SharePanel } from "@/components/game/SharePanel";
import { SanMoveInput } from "@/components/game/SanMoveInput";
import { EvalBar } from "@/components/game/EvalBar";
import { Clock } from "@/components/game/Clock";
import { BotSetup, type BotConfig } from "@/components/bot/BotSetup";
import { BotAvatar } from "@/components/bot/BotAvatar";
import { AnalysisPanel } from "@/components/bot/AnalysisPanel";
import { TimeUsageChart } from "@/components/game/TimeUsageChart";
import { MaterialTimeline } from "@/components/game/MaterialTimeline";
import { PieceActivityHeatmap } from "@/components/game/PieceActivityHeatmap";
import { performanceRating } from "@/lib/ratings/performance";
import { useChessGame, type GameStatus } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { useClock, getTimeControl } from "@/lib/chess/useClock";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio, vibrateForMove } from "@/lib/chess/sound";
import { announcePosition } from "@/lib/chess/announce";
import { getEngine } from "@/lib/engine/stockfish";
import { getTier, chooseMove } from "@/lib/engine/bots";
import { analyzeGame, type GameAnalysis } from "@/lib/engine/analysis";
import { NAG_SYMBOLS, parseAnnotation, formatAnnotation, type NagSymbol } from "@/lib/chess/nag";
import { IconFlag, IconPlus, IconSparkles } from "@/components/ui/icons";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { ShortcutsHelpModal } from "@/components/ui/ShortcutsHelpModal";
import { CheatGate } from "@/components/cheats/CheatGate";
import { CheatPanel, type CheatLogEntry } from "@/components/cheats/CheatPanel";
import { CheatEffects, VOICE_LINES } from "@/components/cheats/CheatEffects";
import { illegalCastleFen, clonePieceFen, swapPiecesFen, promoteAnyPawnFen, forceMoveFen } from "@/lib/cheats/moveManipulation";
import { DEFAULT_BOT_OVERRIDE, resolveOverriddenMove, type BotOverride } from "@/lib/cheats/botManipulation";
import { useToasts } from "@/lib/hooks/useToasts";
import { ToastStack } from "@/components/ui/ToastStack";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements/catalog";
import { useTrollEffects } from "@/lib/moderation/useTrollEffects";
import { TrollEffectOverlay } from "@/components/moderation/TrollEffectOverlay";
import type { SoundName } from "@/lib/chess/sound";
import type { TrollEffectMsg, TrollEffectType } from "@/lib/online/protocol";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function playMoveSound(san: string, flags: string, promotion?: string, over?: boolean, overrideSound?: SoundName | null, haptic?: boolean) {
  if (over) return; // gameEnd handled separately
  if (haptic) vibrateForMove(san);
  if (overrideSound) {
    playSound(overrideSound);
    return;
  }
  if (san.includes("+")) playSound("check");
  else if (flags.includes("e") || flags.includes("c")) playSound("capture");
  else if (flags.includes("k") || flags.includes("q")) playSound("castle");
  else if (promotion) playSound("promote");
  else playSound("move");
}

export default function BotGamePage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [rematchSeq, setRematchSeq] = useState(0);
  // Series score tracker (#35) — survives each rematch remount since it lives
  // one level up; always counted from the human's perspective regardless of
  // which color they're swapped to play next.
  const [series, setSeries] = useState({ wins: 0, losses: 0, draws: 0 });
  if (!config) return <BotSetup onStart={setConfig} />;
  return (
    <BotGame
      config={config}
      onExit={() => setConfig(null)}
      onRematch={() => {
        // Swap sides for the rematch, matching how online rematches swap colors.
        setConfig((c) => (c ? { ...c, color: c.color === "w" ? "b" : "w" } : c));
        setRematchSeq((n) => n + 1);
      }}
      series={series}
      onGameEnd={(outcome) =>
        setSeries((s) => ({
          wins: s.wins + (outcome === "win" ? 1 : 0),
          losses: s.losses + (outcome === "loss" ? 1 : 0),
          draws: s.draws + (outcome === "draw" ? 1 : 0),
        }))
      }
      key={`${JSON.stringify(config)}-${rematchSeq}`}
    />
  );
}

function BotGame({
  config,
  onExit,
  onRematch,
  series,
  onGameEnd,
}: {
  config: BotConfig;
  onExit: () => void;
  onRematch: () => void;
  series: { wins: number; losses: number; draws: number };
  onGameEnd: (outcome: "win" | "loss" | "draw") => void;
}) {
  const game = useChessGame(config.startFen);
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const tier = getTier(config.tierId);
  const tc = getTimeControl(config.timeControlId);

  // A plain useState (not derived from config) so the "swap sides" cheat can flip
  // it mid-game — every downstream expression below already reads humanColor
  // reactively (it's already in each effect/callback's own dependency array),
  // so lifting it here is the only change needed to cascade the swap correctly.
  const [humanColor, setHumanColor] = useState<Color>(config.color);
  const botColor: Color = humanColor === "w" ? "b" : "w";
  const [manualFlip, setManualFlip] = useState(false);
  const orientation: Color = manualFlip ? botColor : humanColor;
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [thinking, setThinking] = useState(false);
  const [evalScore, setEvalScore] = useState<{ cp: number | null; mate: number | null }>({ cp: 0, mate: null });
  const [evalVisible, setEvalVisible] = useState(config.showEval);
  const [override, setOverride] = useState<GameStatus | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [tab, setTab] = useState<"moves" | "analysis" | "share">(settings.defaultGameTab);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
  const autoAnalyzedRef = useRef(false);

  const { data: session } = useSession();
  const botFenRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  /** Per-ply think time in ms, index 0 = move 1 — recorded for the postgame time-usage graph. */
  const moveTimesRef = useRef<number[]>([]);
  const lastMoveAtRef = useRef(performance.now());

  // Deep link: /play/bot?fen=… starts from a custom position (the analysis
  // board's "Play out vs bot" and the replay viewer's practice button).
  useEffect(() => {
    const fen = new URLSearchParams(window.location.search).get("fen");
    if (fen) game.loadFen(fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- cheat panel state (bot games only — see CheatGate/CheatPanel) ---
  const [paused, setPaused] = useState(false);
  // Defaults to the chosen tier's own personality (Batch C) — a mod/cheat can
  // still override it from the cheat panel via setBotOverride below.
  const [botOverride, setBotOverride] = useState<BotOverride>(() => ({ ...DEFAULT_BOT_OVERRIDE, personality: tier.personality }));
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
  const { toasts, push: pushToast } = useToasts();

  // Locally-fired troll effects — reuses the exact same useTrollEffects/
  // TrollEffectOverlay infrastructure the online-game moderator's flagged-
  // game troll toolkit already built; it doesn't care whether the message
  // came from a socket or (as here) a plain local click, so it's fully
  // reusable as a self-inflicted bot-page cheat with zero changes to it.
  const [botTrollEffect, setBotTrollEffect] = useState<TrollEffectMsg | null>(null);
  const trollSeqRef = useRef(0);
  const { pieceSetOverride, overlayEffect, clockDigitsReversed, fakeChatMessages, moveSoundOverride, watchedBanner, confettiTrigger } =
    useTrollEffects(botTrollEffect, boardWrapperRef, pushToast);
  const fireTrollEffect = useCallback((type: TrollEffectType, opts?: { durationMs?: number; text?: string }) => {
    trollSeqRef.current += 1;
    setBotTrollEffect({ type, seq: trollSeqRef.current, ...opts });
  }, []);
  const prevFakeChatLenRef = useRef(0);
  useEffect(() => {
    if (fakeChatMessages.length > prevFakeChatLenRef.current) {
      pushToast(fakeChatMessages[fakeChatMessages.length - 1].text);
    }
    prevFakeChatLenRef.current = fakeChatMessages.length;
  }, [fakeChatMessages, pushToast]);

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
        moveTimes: moveTimesRef.current,
      };
      fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((r) => r.json())
        .then((d: { id?: string; achievements?: string[] }) => {
          if (d.id) setSavedGameId(d.id);
          for (const id of d.achievements ?? []) {
            const a = ACHIEVEMENT_BY_ID[id];
            if (a) pushToast(`${a.icon} Achievement unlocked: ${a.name}`);
          }
        })
        .catch(() => {});
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
    moveTimesRef.current = [];
    lastMoveAtRef.current = performance.now();
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
      onGameEnd(status.result === "1/2-1/2" ? "draw" : status.winner === humanColor ? "win" : "loss");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.over]);

  const afterMoveApplied = useCallback(
    (move: ReturnType<typeof game.makeMove>) => {
      if (!move) {
        playSound("illegal");
        return null;
      }
      playMoveSound(move.san, move.flags, move.promotion, false, moveSoundOverride, settings.hapticFeedback);
      clock.moved(move.color);
      const now = performance.now();
      moveTimesRef.current.push(Math.round(now - lastMoveAtRef.current));
      lastMoveAtRef.current = now;

      const isCapture = move.flags.includes("e") || move.flags.includes("c");
      const isCheckmate = move.san.includes("#");
      if (isCapture) setCaptureSeq((s) => s + 1);
      if (isCheckmate) setCheckmateSeq((s) => s + 1);
      if (isCapture || isCheckmate || move.san.includes("+")) setZoomSeq((s) => s + 1);
      voiceSeqRef.current += 1;
      setVoiceLine({ text: VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)], seq: voiceSeqRef.current });

      return move;
    },
    [clock, moveSoundOverride],
  );

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => afterMoveApplied(game.makeMove({ from, to, promotion })),
    [game, afterMoveApplied],
  );

  const applySanMove = useCallback(
    (san: string) => afterMoveApplied(game.makeSanMove(san)),
    [game, afterMoveApplied],
  );

  const onSanSubmit = useCallback(
    (san: string) => {
      if (status.over || paused || snapshot.turn !== humanColor) return false;
      primeAudio();
      return Boolean(applySanMove(san));
    },
    [applySanMove, status.over, paused, snapshot.turn, humanColor],
  );

  const onHumanMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (status.over || paused || snapshot.turn !== humanColor) return;
      primeAudio();
      applyMove(from, to, promotion);
    },
    [applyMove, status.over, paused, snapshot.turn, humanColor],
  );

  // Fire the front of a queued premove chain the instant it becomes the
  // human's turn (right after the bot's move lands), if it's still legal.
  // A premove that's no longer legal invalidates the rest of the chain too —
  // the position diverged from what the player anticipated.
  const MAX_PREMOVES = 3;
  const [premoveQueue, setPremoveQueue] = useState<{ from: Square; to: Square }[]>([]);
  const premove = premoveQueue[0] ?? null;
  useEffect(() => {
    if (!premove || status.over || paused || snapshot.turn !== humanColor) return;
    const options = game.legalMovesFrom(premove.from).filter((mv) => mv.to === premove.to);
    if (options.length === 0) {
      setPremoveQueue([]);
      return;
    }
    setPremoveQueue((q) => q.slice(1));
    onHumanMove(premove.from, premove.to, options.some((mv) => mv.promotion) ? "q" : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, status.over, paused, humanColor]);

  // --- legit hints & threats (no cheat gate — available to everyone) ---
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [autoHint, setAutoHint] = useState(false);
  const [showThreats, setShowThreats] = useState(false);

  const requestHint = useCallback(async () => {
    if (status.over || snapshot.turn !== humanColor) return;
    setHintLoading(true);
    try {
      const wantsSecondBest = settings.hintMode === "second-best";
      const res = await getEngine().go(snapshot.fen, { depth: 14, multipv: wantsSecondBest ? 2 : 1 });
      const uci = (wantsSecondBest && res.lines[1]?.move) || res.bestmove || res.lines[0]?.move;
      if (uci) {
        setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
      }
    } finally {
      setHintLoading(false);
    }
  }, [status.over, snapshot.turn, humanColor, snapshot.fen, settings.hintMode]);

  // Auto-hint: recompute the suggested move whenever it becomes the human's
  // turn, instead of waiting for a manual click.
  useEffect(() => {
    setHintArrow(null);
    if (!autoHint || status.over || snapshot.turn !== humanColor) return;
    let cancelled = false;
    const wantsSecondBest = settings.hintMode === "second-best";
    (async () => {
      const res = await getEngine().go(snapshot.fen, { depth: 14, multipv: wantsSecondBest ? 2 : 1 });
      if (cancelled) return;
      const uci = (wantsSecondBest && res.lines[1]?.move) || res.bestmove || res.lines[0]?.move;
      if (uci) setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, autoHint, status.over, humanColor, settings.hintMode]);

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
    if (status.over || paused || !snapshot.isLive || snapshot.turn !== botColor) return;
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
  }, [snapshot.fen, snapshot.turn, snapshot.isLive, status.over, paused, botColor, botOverride, showPredictedMove]);

  // Eval bar on the human's turn.
  useEffect(() => {
    if (!evalVisible || status.over || !snapshot.isLive || snapshot.turn !== humanColor) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getEngine().evaluate(snapshot.fen, { depth: settings.analysisDepth });
        if (!cancelled) setEvalScore({ cp: r.cp, mate: r.mate });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, snapshot.isLive, status.over, evalVisible, humanColor]);

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

  // Takeback cap for bot games (#209) — no real opponent to be unfair to, so
  // this is just a per-player Settings preference rather than something
  // server-enforced (contrast with the online game's room-level cap).
  const TAKEBACK_CAP = 3;
  const takebacksUsedRef = useRef(0);
  const takebacksRemaining = settings.unlimitedTakebacks ? Infinity : TAKEBACK_CAP - takebacksUsedRef.current;

  /** Undo takes back a full round trip (bot's reply + our move) so it's our turn again. */
  const undoLastRound = useCallback(() => {
    if (status.over || snapshot.moves.length === 0) return;
    if (!settings.unlimitedTakebacks && takebacksUsedRef.current >= TAKEBACK_CAP) return;
    takebacksUsedRef.current += 1;
    game.undo();
    if (snapshot.moves.length > 1) game.undo();
  }, [game, status.over, snapshot.moves.length, settings.unlimitedTakebacks]);

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

  const cheatTogglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      if (next) clock.stop();
      else clock.start(snapshot.turn);
      logCheat(next ? "Paused the game" : "Resumed the game");
      return next;
    });
  }, [clock, snapshot.turn, logCheat]);

  const cheatSwapSides = useCallback(() => {
    setHumanColor((c) => (c === "w" ? "b" : "w"));
    logCheat("Swapped sides");
  }, [logCheat]);

  const cheatLoadFen = useCallback(
    (fen: string) => {
      const ok = game.loadFen(fen.trim());
      logCheat(ok ? "Loaded custom FEN" : "Invalid FEN — nothing loaded");
    },
    [game, logCheat],
  );

  const cheatForceMove = useCallback(
    (from: Square, to: Square) => {
      const fen = forceMoveFen(game.getFen(), from, to);
      if (fen) {
        game.loadFen(fen);
        logCheat(`Forced ${from}→${to}, bypassing legality`);
      } else {
        logCheat(`Force move failed — no piece on ${from}`);
      }
    },
    [game, logCheat],
  );

  const cheatCancelGame = useCallback(() => {
    logCheat("Voided the game — no record saved");
    onExit();
  }, [onExit, logCheat]);

  const cheatExtendBothClocks = useCallback(() => {
    clock.addTime("w", 60_000);
    clock.addTime("b", 60_000);
    logCheat("Added 60s to both clocks");
  }, [clock, logCheat]);

  const cheatResetClocks = useCallback(() => {
    clock.reset();
    logCheat("Reset both clocks to the start");
  }, [clock, logCheat]);

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
      depth: settings.analysisDepth,
      onProgress: (done, total) => setAnalysisProgress({ done, total }),
    });
    setAnalysis(result);
    setAnalysisProgress(null);
  }, [snapshot.moves, settings.analysisDepth]);

  const canBack = snapshot.viewPly > 0;
  const canForward = snapshot.viewPly < snapshot.moves.length;

  // Player-authored move comments (own annotations, not PGN-imported ones) —
  // same NAG + free-text pattern as Pass & Play (src/app/play/local/page.tsx).
  const annotated = parseAnnotation(snapshot.commentsByPly[snapshot.viewPly]);
  const [annotationText, setAnnotationText] = useState(annotated.text);
  useEffect(() => {
    setAnnotationText(parseAnnotation(snapshot.commentsByPly[snapshot.viewPly]).text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.viewPly]);
  const setNag = (nag: NagSymbol | null) => {
    if (snapshot.viewPly <= 0) return;
    game.setCommentAtPly(snapshot.viewPly, formatAnnotation(nag, annotationText));
  };
  const commitAnnotationText = () => {
    if (snapshot.viewPly <= 0) return;
    game.setCommentAtPly(snapshot.viewPly, formatAnnotation(annotated.nag, annotationText));
  };

  // Auto-analyze on game end (Settings > Gameplay > "Request analysis").
  useEffect(() => {
    if (!status.over || !settings.autoAnalyze || autoAnalyzedRef.current) return;
    autoAnalyzedRef.current = true;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.over, settings.autoAnalyze]);

  useKeyboardShortcuts({
    onFlip: () => setManualFlip((v) => !v),
    onStepBack: game.stepBack,
    onStepForward: game.stepForward,
    onGoStart: game.goStart,
    onGoLive: game.goLive,
    onToggleHelp: () => setShowShortcuts((v) => !v),
    onAnnouncePosition: () => announcePosition(snapshot),
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
          {isBot ? (
            <BotAvatar tierId={tier.id} size={36} rounded="full" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-elev-2)] text-sm font-black text-[var(--text-muted)]">
              Y
            </span>
          )}
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              {isBot ? `${tier.fullName} ${tier.flag}` : "You"}
              {isBot && <span className="ml-1.5 text-xs font-normal text-[var(--text-faint)]">{tier.elo}</span>}
            </div>
            {settings.showCapturedTray && (
              <CapturedTray pieces={captured} color={isWhite ? "b" : "w"} set={settings.pieceSet} advantage={adv} />
            )}
          </div>
        </div>
        {!tc.category.includes("untimed") && !clock.untimed && (
          <Clock
            ms={isWhite ? clock.whiteMs : clock.blackMs}
            active={clock.active === side && !status.over}
            tickSound={side === humanColor}
            reversed={clockDigitsReversed && side === humanColor}
            lowTimeThresholdSec={settings.lowTimeThresholdSec}
          />
        )}
      </div>
    );
  };

  return (
    <CheatGate>
      {(cheatPanelOpen, setCheatPanelOpen) => (
        <div className="mx-auto max-w-6xl px-4 py-5">
      <a href="#board-anchor" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-contrast)]">
        Skip to board
      </a>
      <a href="#move-list-anchor" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-14 focus:z-[100] focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-contrast)]">
        Skip to move list
      </a>
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
          paused={paused}
          onTogglePause={cheatTogglePause}
          onSwapSides={cheatSwapSides}
          currentFen={game.getFen()}
          onLoadFen={cheatLoadFen}
          onForceMove={cheatForceMove}
          onCancelGame={cheatCancelGame}
          onRematch={onRematch}
          onExtendBothClocks={cheatExtendBothClocks}
          onResetClocks={cheatResetClocks}
          onFireTrollEffect={fireTrollEffect}
          onRequestHint={requestHint}
          hintLoading={hintLoading}
          autoHint={autoHint}
          onAutoHintChange={setAutoHint}
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
              <button
                className={`btn hidden sm:inline-flex ${evalVisible ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
                onClick={() => setEvalVisible((v) => !v)}
                title="Show/hide the live evaluation bar"
              >
                Eval bar
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
          {evalVisible && (
            <div className="hidden sm:block" style={{ width: 14 }}>
              <EvalBar cp={evalScore.cp} mate={evalScore.mate} orientation={orientation} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <PlayerBar side={botColor} />
            <div ref={boardWrapperRef} id="board-anchor" tabIndex={-1} className="relative outline-none">
              <Board
                snapshot={snapshot}
                orientation={orientation}
                theme={theme}
                pieceSet={pieceSetOverride ?? settings.pieceSet}
                legalMovesFrom={game.legalMovesFrom}
                onMove={onHumanMove}
                movableColor={humanColor}
                showCoordinates={settings.showCoordinates}
                coordinateStyle={settings.coordinateStyle}
                showLegalMoves={settings.showLegalMoves}
                highlightLastMove={settings.highlightLastMove}
                animate={settings.animate}
                extraArrows={[...(predictedArrow ? [predictedArrow] : []), ...(hintArrow ? [hintArrow] : []), ...threatArrows]}
                squareColorOverride={settings.squareColorOverride}
                colorblindMode={settings.colorblindMode}
                speechAnnounceMoves={settings.speechAnnounceMoves}
                pieceSizePercent={settings.pieceSize}
                animationSpeed={settings.animationSpeed}
                arrowColor={settings.arrowColor}
                boardFrame={settings.boardFrame}
                zoomPercent={settings.boardZoom}
                hidePieces={settings.blindfoldBot}
                confirmMove={settings.confirmMove}
                autoQueen={settings.autoQueen}
                moveInputMode={settings.moveInputMode}
                premovesEnabled={settings.premovesEnabled}
                premove={premove}
                onSetPremove={(from, to) =>
                  setPremoveQueue((q) => (q.length < MAX_PREMOVES ? [...q, { from, to }] : q))
                }
                onCancelPremove={() => setPremoveQueue([])}
                onSwipeBack={game.stepBack}
                onSwipeForward={game.stepForward}
              />
              <CheatEffects
                captureSeq={captureSeq}
                checkmateSeq={checkmateSeq}
                zoomSeq={zoomSeq}
                voiceLine={voiceLine}
                toggles={cheatEffects}
                zoomTargetRef={boardWrapperRef}
              />
              <TrollEffectOverlay
                effect={overlayEffect}
                watchedBanner={watchedBanner}
                confettiTrigger={confettiTrigger}
                reduceMotion={settings.reduceMotion}
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
                onAnnouncePosition={() => announcePosition(snapshot)}
                canBack={canBack}
                canForward={canForward}
                canUndo={!status.over && snapshot.moves.length > 0 && snapshot.turn === humanColor && takebacksRemaining > 0}
              />
              {premoveQueue.length > 0 && (
                <span className="chip ml-2 !bg-[var(--accent)] !text-[var(--accent-contrast)]">
                  Premove ×{premoveQueue.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <div id="move-list-anchor" tabIndex={-1} className="panel flex w-full flex-col outline-none lg:h-[min(72vh,640px)] lg:w-[340px]">
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
            {(["moves", "analysis", "share"] as const).map((t) => (
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
          <div className="min-h-[240px] flex-1 overflow-hidden lg:min-h-0 lg:flex lg:flex-col">
            {tab === "moves" ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <div className="flex h-full flex-col">
                    <OpeningTicker moves={snapshot.moves} />
                    <div className="min-h-0 flex-1">
                      <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} compact={settings.compactMoveList} figurineNotation={settings.figurineNotation} commentsByPly={snapshot.commentsByPly} />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t border-[var(--border)]">
                  <SanMoveInput onSubmit={onSanSubmit} disabled={status.over || paused || snapshot.turn !== humanColor} />
                </div>
                {snapshot.viewPly > 0 && (
                  <div className="shrink-0 border-t border-[var(--border)] p-2">
                    <span className="label mb-1.5 block">
                      Annotate {snapshot.moves[snapshot.viewPly - 1]?.san}
                    </span>
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {NAG_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          className="hover-lift rounded-md border px-2 py-0.5 font-mono text-xs transition-colors"
                          style={{
                            borderColor: annotated.nag === s ? "var(--accent)" : "var(--border)",
                            background: annotated.nag === s ? "var(--bg-elev-2)" : "transparent",
                            color: annotated.nag === s ? "var(--accent)" : "var(--text-muted)",
                          }}
                          onClick={() => setNag(annotated.nag === s ? null : s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input !py-1 text-xs"
                      placeholder="Add a note…"
                      value={annotationText}
                      onChange={(e) => setAnnotationText(e.target.value)}
                      onBlur={commitAnnotationText}
                      onKeyDown={(e) => e.key === "Enter" && commitAnnotationText()}
                    />
                  </div>
                )}
              </>
            ) : tab === "analysis" ? (
              <div className="flex h-full flex-col overflow-y-auto">
                {status.over && (
                  <div className="flex items-center justify-between px-3 pb-2 pt-3">
                    <span className="label">Performance rating (est.)</span>
                    <span className="font-mono text-sm font-bold text-[var(--accent)]">
                      {performanceRating(tier.elo, status.result === "1/2-1/2" ? "draw" : status.winner === humanColor ? "win" : "loss")}
                    </span>
                  </div>
                )}
                <MaterialTimeline moves={snapshot.moves} />
                <PieceActivityHeatmap moves={snapshot.moves} />
                {status.over && moveTimesRef.current.length > 0 && (
                  <TimeUsageChart moves={snapshot.moves} moveTimes={moveTimesRef.current} />
                )}
                <AnalysisPanel
                  analysis={analysis}
                  progress={analysisProgress}
                  onGoToPly={game.goToPly}
                  viewPly={snapshot.viewPly}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {status.over && savedGameId && (
                  <div className="border-b border-[var(--border)] p-3">
                    <button
                      className="btn w-full !text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/games/${savedGameId}`).catch(() => {});
                        pushToast("Spectator link copied");
                      }}
                    >
                      Copy spectator link
                    </button>
                  </div>
                )}
                <SharePanel
                  fen={snapshot.fen}
                  pgn={game.getPgn()}
                  onLoadFen={game.loadFen}
                  onLoadPgn={game.loadPgn}
                  theme={theme}
                  orientation={orientation}
                  shareCardMeta={
                    status.over
                      ? {
                          whiteName: humanColor === "w" ? "You" : tier.name,
                          blackName: humanColor === "b" ? "You" : tier.name,
                          result: status.result === "1/2-1/2" ? "DRAW" : status.result === "1-0" ? "WHITE_WINS" : "BLACK_WINS",
                          accuracyW: analysis?.accuracy.w,
                          accuracyB: analysis?.accuracy.b,
                        }
                      : undefined
                  }
                />
              </div>
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
          onRematch={onRematch}
          series={series}
        />
      )}

      {showShortcuts && <ShortcutsHelpModal onClose={() => setShowShortcuts(false)} />}
      <ToastStack toasts={toasts} />
        </div>
      )}
    </CheatGate>
  );
}
