"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { OpeningTicker } from "@/components/game/OpeningTicker";
import { LiveClock } from "@/components/game/Clock";
import { ChatPanel } from "@/components/game/ChatPanel";
import { CapturedTray } from "@/components/game/CapturedTray";
import { OpeningExplorer } from "@/components/game/OpeningExplorer";
import { SharePanel } from "@/components/game/SharePanel";
import { AnalysisPanel } from "@/components/bot/AnalysisPanel";
import { MaterialTimeline } from "@/components/game/MaterialTimeline";
import { PieceActivityHeatmap } from "@/components/game/PieceActivityHeatmap";
import { performanceRating } from "@/lib/ratings/performance";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { analyzeGame, type GameAnalysis } from "@/lib/engine/analysis";
import {
  TIME_CONTROLS,
  getTimeControl,
  clampCustomMinutes,
  clampCustomIncrementSec,
  customTimeControlId,
  type TimeControl,
} from "@/lib/chess/useClock";
import { playSound, primeAudio, vibrateForMove, type SoundName } from "@/lib/chess/sound";
import { announcePosition } from "@/lib/chess/announce";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import type { Identity } from "@/lib/online/protocol";
import { IconFlag, IconHandshake, IconUsers, IconUndo, IconShield, IconVolume } from "@/components/ui/icons";
import { ModPanel } from "@/components/moderation/ModPanel";
import { ModCheatGate } from "@/components/moderation/ModCheatGate";
import { ModCheatPanel } from "@/components/moderation/ModCheatPanel";
import { ModShieldMenu } from "@/components/moderation/ModShieldMenu";
import { OwnerCheatGate } from "@/components/moderation/OwnerCheatGate";
import { OwnerCheatPanel } from "@/components/moderation/OwnerCheatPanel";
import { useCheatAccess } from "@/lib/cheats/access";
import { getEngine } from "@/lib/engine/stockfish";
import type { Arrow } from "@/components/board/ArrowLayer";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { ShortcutsHelpModal } from "@/components/ui/ShortcutsHelpModal";
import { useToasts } from "@/lib/hooks/useToasts";
import { ToastStack } from "@/components/ui/ToastStack";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements/catalog";
import { useModStats } from "@/lib/moderation/useModStats";
import { useTrollEffects } from "@/lib/moderation/useTrollEffects";
import { TrollEffectOverlay } from "@/components/moderation/TrollEffectOverlay";
import type { TrollEffectType } from "@/lib/online/protocol";

function soundFor(san: string, overrideSound?: SoundName | null, haptic?: boolean) {
  if (haptic) vibrateForMove(san);
  if (san.includes("#")) return; // handled by game over
  if (overrideSound) {
    playSound(overrideSound);
    return;
  }
  if (san.includes("+")) playSound("check");
  else if (san.includes("x")) playSound("capture");
  else if (san.includes("O-O")) playSound("castle");
  else if (san.includes("=")) playSound("promote");
  else playSound("move");
}

/**
 * Stable guest identity. Resolved in an effect (not during render) so the
 * server- and client-rendered HTML match; until mounted we show a neutral
 * placeholder.
 */
function useGuestIdentity(): { userId: string; username: string } {
  const [guest, setGuest] = useState<{ userId: string; username: string }>({
    userId: "guest:pending",
    username: "Guest",
  });
  useEffect(() => {
    let id = localStorage.getItem("rr.guestId");
    if (!id) {
      id = "guest:" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("rr.guestId", id);
    }
    setGuest({ userId: id, username: `Guest-${id.slice(-4)}` });
  }, []);
  return guest;
}

export default function OnlinePage() {
  const { data: session } = useSession();
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;

  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[4]); // 3+2 default, overridden below by the last-used one if remembered
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [rated, setRated] = useState(false);
  const isCustomTc = tc.id.startsWith("custom:");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rr.customTimeControl.online.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { minutes?: number; increment?: number };
        if (typeof parsed.minutes === "number") setCustomMinutes(clampCustomMinutes(parsed.minutes));
        if (typeof parsed.increment === "number") setCustomIncrement(clampCustomIncrementSec(parsed.increment));
      }
      const lastTcId = localStorage.getItem("rr.lastTimeControl.online.v1");
      if (lastTcId) setTc(getTimeControl(lastTcId));
      const lastRated = localStorage.getItem("rr.lastRated.online.v1");
      if (lastRated != null) setRated(lastRated === "true");
    } catch {
      /* ignore */
    }
  }, []);
  // Remember the lobby's last choices so returning players don't have to reselect every time.
  useEffect(() => {
    try {
      localStorage.setItem("rr.lastTimeControl.online.v1", tc.id);
    } catch {
      /* ignore */
    }
  }, [tc.id]);
  useEffect(() => {
    try {
      localStorage.setItem("rr.lastRated.online.v1", String(rated));
    } catch {
      /* ignore */
    }
  }, [rated]);
  const applyCustom = (minutes: number, increment: number) => {
    const m = clampCustomMinutes(minutes);
    const i = clampCustomIncrementSec(increment);
    setCustomMinutes(m);
    setCustomIncrement(i);
    setTc(getTimeControl(customTimeControlId(m, i)));
    try {
      localStorage.setItem("rr.customTimeControl.online.v1", JSON.stringify({ minutes: m, increment: i }));
    } catch {
      /* ignore */
    }
  };
  const [ratings, setRatings] = useState<Record<string, number> | null>(null);
  // "analysis" only makes sense once a game has finished, so a saved
  // preference of "analysis" falls back to "moves" for the lobby/live game.
  const [tab, setTab] = useState<"moves" | "openings" | "chat" | "share" | "analysis">(
    settings.defaultGameTab === "analysis" ? "moves" : settings.defaultGameTab,
  );
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
  const autoAnalyzedRef = useRef(false);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [drawCoolingDown, setDrawCoolingDown] = useState(false);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const [chatFocusSignal, setChatFocusSignal] = useState(0);
  const [modPanelOpen, setModPanelOpen] = useState(false);
  const [modCheatPanelOpen, setModCheatPanelOpen] = useState(false);
  const [ownerCheatPanelOpen, setOwnerCheatPanelOpen] = useState(false);
  const [warnCount, setWarnCount] = useState(0);
  const [modLog, setModLog] = useState<{ id: number; text: string; ts: number }[]>([]);
  const [modHintArrow, setModHintArrow] = useState<Arrow | null>(null);
  const [modHintLoading, setModHintLoading] = useState(false);
  const [modAutoHint, setModAutoHint] = useState(false);
  const [modAutoMoveColor, setModAutoMoveColor] = useState<Color | null>(null);
  const [sendHintToOpponent, setSendHintToOpponent] = useState(false);

  const loggedIn = Boolean(session?.user);
  const ratedChoice = rated && loggedIn;
  const isModerator = Boolean(session?.user?.isModerator);
  const showModUI = isModerator && !settings.modHideUI;
  const { isTargetAccount: isOwnerAccount } = useCheatAccess();
  const { increment: incrementModStat } = useModStats();
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user)
          setRatings({
            bullet: d.user.ratingBullet,
            blitz: d.user.ratingBlitz,
            rapid: d.user.ratingRapid,
            classical: d.user.ratingClassical,
          });
      })
      .catch(() => {});
  }, [loggedIn]);

  const guest = useGuestIdentity();
  const identity: Identity = useMemo(() => {
    const ratingForCat = ratings?.[tc.category] ?? 1200;
    if (session?.user) {
      return {
        userId: session.user.id,
        username: session.user.username ?? session.user.name ?? "Player",
        rating: ratingForCat,
        guest: false,
      };
    }
    return { ...guest, rating: 1200, guest: true };
  }, [session, ratings, tc.category, guest]);

  const online = useOnlineGame(identity);
  const { state } = online;
  const { toasts, push: pushToast } = useToasts();
  const { pieceSetOverride, overlayEffect, clockDigitsReversed, fakeChatMessages, moveSoundOverride, watchedBanner, confettiTrigger } = useTrollEffects(
    state.trollEffect,
    boardContainerRef,
    pushToast,
  );

  const unreadChat = tab === "chat" ? 0 : Math.max(0, state.chat.length - lastSeenChatCount);
  useEffect(() => {
    if (tab === "chat") setLastSeenChatCount(state.chat.length);
  }, [tab, state.chat.length]);

  // Open the socket as soon as the lobby is visible so match-finding is instant.
  useEffect(() => {
    online.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arriving from an accepted friend challenge: join that room directly instead of the lobby.
  const searchParams = useSearchParams();
  const directRoom = searchParams.get("room");
  const joinedDirectRoom = useRef(false);
  useEffect(() => {
    if (directRoom && !joinedDirectRoom.current && identity.userId) {
      joinedDirectRoom.current = true;
      online.joinRoom(directRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directRoom, identity.userId]);

  const [manualFlip, setManualFlip] = useState(false);
  const baseOrientation: Color = state.myColor ?? "w";
  const orientation: Color = manualFlip ? (baseOrientation === "w" ? "b" : "w") : baseOrientation;
  const lastAppliedRef = useRef<string>("");
  const MAX_PREMOVES = 3;
  const [premoveQueue, setPremoveQueue] = useState<{ from: Square; to: Square }[]>([]);
  const premove = premoveQueue[0] ?? null;
  const setPremove = (p: { from: Square; to: Square } | null) => setPremoveQueue(p ? [p] : []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notifyDismissed, setNotifyDismissed] = useState(false);
  const prevOffersRef = useRef({ draw: state.drawOfferFrom, takeback: state.takebackOfferFrom, rematch: state.rematchOfferFrom });

  // Series score across rematches (#35) — this component persists across a
  // rematch (only state.roomId changes underneath it), so a plain state here
  // naturally survives the color swap the server already does on rematch.
  const [series, setSeries] = useState({ wins: 0, losses: 0, draws: 0 });
  const seriesCountedRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.status || !state.myColor || seriesCountedRoomRef.current === state.roomId) return;
    seriesCountedRoomRef.current = state.roomId;
    const outcome = state.status.result === "1/2-1/2" ? "draw" : state.status.winner === state.myColor ? "win" : "loss";
    setSeries((s) => ({
      wins: s.wins + (outcome === "win" ? 1 : 0),
      losses: s.losses + (outcome === "loss" ? 1 : 0),
      draws: s.draws + (outcome === "draw" ? 1 : 0),
    }));
  }, [state.status, state.myColor, state.roomId]);

  // Full resync from authoritative server state.
  useEffect(() => {
    if (!state.fullState) return;
    const fs = state.fullState;
    if (fs.moves.length === 0) {
      // Load the actual position, not the standard start — an admin may have
      // set a custom board with zero moves played since (see rebaseAsNewStart
      // in GameRoom.ts). game.reset() would always show the starting array.
      game.loadFen(fs.fen);
    } else {
      const ok = game.loadPgn(fs.pgn);
      // Safety net: god-mode edits aren't legal moves, so a PGN replay can in
      // principle end up out of sync with the server's authoritative FEN.
      // Fall back to the FEN directly so the board is never wrong.
      if (!ok || game.getFen() !== fs.fen) game.loadFen(fs.fen);
    }
    game.goLive();
    lastAppliedRef.current = fs.moves.length ? fs.moves[fs.moves.length - 1].from + fs.moves[fs.moves.length - 1].to : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stateSeq]);

  // Apply an incoming server move (skip if we already applied it optimistically).
  useEffect(() => {
    const mv = state.lastServerMove;
    if (!mv) return;
    const key = mv.from + mv.to + (mv.promotion ?? "");
    const moves = snapshot.moves;
    const last = moves[moves.length - 1];
    const alreadyApplied = last && last.from === mv.from && last.to === mv.to;
    if (alreadyApplied) {
      lastAppliedRef.current = key;
      return;
    }
    const applied = game.makeMove({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion as PieceSymbol | undefined });
    if (applied && settings.opponentMoveSound) soundFor(applied.san, moveSoundOverride);
    lastAppliedRef.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq]);

  // Game over sound
  useEffect(() => {
    if (state.status) playSound("gameEnd");
  }, [state.status]);

  // Toast any newly-earned achievements from this game.
  useEffect(() => {
    if (!state.status || !state.myColor) return;
    const mine = state.myColor === "w" ? state.status.achievements?.white : state.status.achievements?.black;
    for (const id of mine ?? []) {
      const a = ACHIEVEMENT_BY_ID[id];
      if (a) pushToast(`${a.icon} Achievement unlocked: ${a.name}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Opponent connect/disconnect sound (skip the initial mount).
  const prevOpponentConnectedRef = useRef(state.opponentConnected);
  useEffect(() => {
    if (prevOpponentConnectedRef.current !== state.opponentConnected) {
      playSound(state.opponentConnected ? "opponentConnected" : "opponentDisconnected");
      prevOpponentConnectedRef.current = state.opponentConnected;
    }
  }, [state.opponentConnected]);

  // Chat message sound (skip messages we sent ourselves).
  const prevChatLenRef = useRef(state.chat.length);
  useEffect(() => {
    const last = state.chat[state.chat.length - 1];
    if (state.chat.length > prevChatLenRef.current && last && !last.system && last.from !== identity.username && settings.chatSound) {
      playSound("chatMessage");
    }
    prevChatLenRef.current = state.chat.length;
  }, [state.chat, identity.username, settings.chatSound]);

  // Distinct alert sound for the moderator when a flagged message arrives.
  const prevFlaggedLenRef = useRef(0);
  useEffect(() => {
    const flaggedCount = state.chat.filter((m) => m.flagged).length;
    if (flaggedCount > prevFlaggedLenRef.current && showModUI && settings.modFlaggedSound) {
      playSound("flagged");
    }
    prevFlaggedLenRef.current = flaggedCount;
  }, [state.chat, showModUI, settings.modFlaggedSound]);

  // Toast whenever the opponent makes a draw/takeback/rematch offer.
  useEffect(() => {
    const prev = prevOffersRef.current;
    if (state.drawOfferFrom && state.drawOfferFrom !== state.myColor && state.drawOfferFrom !== prev.draw) {
      pushToast("Opponent offers a draw");
    }
    if (state.takebackOfferFrom && state.takebackOfferFrom !== state.myColor && state.takebackOfferFrom !== prev.takeback) {
      pushToast("Opponent requests a takeback");
    }
    if (state.rematchOfferFrom && state.rematchOfferFrom !== state.myColor && state.rematchOfferFrom !== prev.rematch) {
      pushToast("Opponent wants a rematch");
    }
    prevOffersRef.current = { draw: state.drawOfferFrom, takeback: state.takebackOfferFrom, rematch: state.rematchOfferFrom };
  }, [state.drawOfferFrom, state.takebackOfferFrom, state.rematchOfferFrom, state.myColor, pushToast]);

  // Flash the tab title + fire a background Notification when it becomes our
  // move while the tab is hidden/unfocused. Scoped to "tab open but not
  // visible" — no service worker, so no closed-tab push.
  const myTurn2 = state.myColor === snapshot.turn && !state.status && state.phase === "playing";
  useEffect(() => {
    if (!myTurn2) return;
    const original = document.title;
    let iv: ReturnType<typeof setInterval> | null = null;
    let flip = false;

    const notify = () => {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Your move", { body: "It's your turn in Sam's Arcade." });
      }
    };
    const start = () => {
      if (iv) return;
      notify();
      iv = setInterval(() => {
        document.title = flip ? original : "♟ Your move!";
        flip = !flip;
      }, 1000);
    };
    const stop = () => {
      if (iv) {
        clearInterval(iv);
        iv = null;
      }
      document.title = original;
    };

    if (document.hidden) start();
    const onVisibility = () => (document.hidden ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn2]);

  // Fire a queued premove the moment it becomes our turn, if it's still legal;
  // otherwise silently drop it. Also clear it whenever we leave/re-enter a game.
  useEffect(() => {
    setPremove(null);
    setManualFlip(false);
  }, [state.phase]);

  useEffect(() => {
    setWarnCount(0);
    setModLog([]);
  }, [state.roomId]);

  // Reset analysis (and the auto-analyze one-shot) for each fresh game —
  // this component persists across a rematch rather than remounting.
  useEffect(() => {
    autoAnalyzedRef.current = false;
    setAnalysis(null);
    setAnalysisProgress(null);
  }, [state.roomId]);

  useKeyboardShortcuts({
    onFlip: () => setManualFlip((v) => !v),
    onStepBack: game.stepBack,
    onStepForward: game.stepForward,
    onGoStart: game.goStart,
    onGoLive: game.goLive,
    onOfferDraw: () => {
      if (state.phase === "playing" && !state.status && state.drawOfferFrom !== state.myColor) online.offerDraw();
    },
    onAcceptDraw: () => {
      if (state.drawOfferFrom && state.drawOfferFrom !== state.myColor) online.acceptDraw();
    },
    onToggleHelp: () => setShowShortcuts((v) => !v),
    onFocusChat: () => {
      setTab("chat");
      setChatFocusSignal((n) => n + 1);
    },
    onOpenModeration: () => {
      if (showModUI && state.phase === "playing") setModPanelOpen((v) => !v);
    },
    onAnnouncePosition: () => announcePosition(snapshot),
  });

  useEffect(() => {
    if (!premove || state.myColor !== snapshot.turn || state.status) return;
    const options = game.legalMovesFrom(premove.from).filter((mv) => mv.to === premove.to);
    if (options.length === 0) {
      setPremoveQueue([]);
      return;
    }
    setPremoveQueue((q) => q.slice(1));
    onMove(premove.from, premove.to, options.some((mv) => mv.promotion) ? "q" : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, state.myColor, state.status]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (state.phase !== "playing" || state.myColor !== snapshot.turn || state.status) return;
      primeAudio();
      const applied = game.makeMove({ from, to, promotion });
      if (!applied) return;
      soundFor(applied.san, moveSoundOverride);
      online.sendMove(from, to, promotion);
    },
    [game, online, state.phase, state.myColor, state.status, snapshot.turn, moveSoundOverride],
  );

  /** Play a SAN move from the opening explorer at the current view position. */
  const playSan = useCallback(
    (san: string) => {
      try {
        const probe = new Chess(snapshot.fen);
        const mv = probe.move(san);
        if (mv) onMove(mv.from, mv.to, mv.promotion);
      } catch {
        /* not legal here */
      }
    },
    [snapshot.fen, onMove],
  );

  // Post-game analysis (Batch D #204) — only meaningful once the game is
  // over, same Stockfish analyzeGame flow the bot page uses.
  const runAnalysis = useCallback(async () => {
    if (!state.status) return;
    setTab("analysis");
    setAnalysis(null);
    const moves = snapshot.moves;
    if (moves.length === 0) return;
    const positions = moves.map((m) => m.before).concat(moves[moves.length - 1].after);
    const input = {
      positions,
      moves: moves.map((m) => ({ san: m.san, uci: m.from + m.to + (m.promotion ?? ""), color: m.color })),
    };
    setAnalysisProgress({ done: 0, total: positions.length });
    const result = await analyzeGame(getEngine(), input, {
      depth: settings.analysisDepth,
      onProgress: (done, total) => setAnalysisProgress({ done, total }),
    });
    setAnalysis(result);
    setAnalysisProgress(null);
  }, [state.status, snapshot.moves, settings.analysisDepth]);

  // Auto-analyze on game end (Settings > Gameplay > "Request analysis").
  useEffect(() => {
    if (!state.status || !settings.autoAnalyze || autoAnalyzedRef.current) return;
    autoAnalyzedRef.current = true;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, settings.autoAnalyze]);

  // Derived values and the hint/auto-move effects below must stay above the
  // idle/searching early returns — React requires the same hooks to run in
  // the same order on every render, and these were previously declared only
  // after those returns, crashing the component the instant phase flipped
  // from idle/searching to playing (a real Rules-of-Hooks violation).
  const players = state.players;
  const opponentColor: Color | null = state.myColor === "w" ? "b" : state.myColor === "b" ? "w" : null;
  const opponentUsername = (opponentColor === "w" ? players?.white?.username : players?.black?.username) ?? "Opponent";
  const paused = Boolean(state.fullState?.paused);
  const logMod = (text: string) => setModLog((l) => [...l, { id: l.length, text, ts: Date.now() }]);

  // Read-only analysis for the moderator/owner panels — draws a suggestion
  // arrow, never touches game state. Optionally also delivers the same move
  // to the opponent's own client as a real hint (Part 4).
  const requestModHint = async () => {
    if (state.status) return;
    setModHintLoading(true);
    try {
      const res = await getEngine().go(snapshot.fen, { depth: 14 });
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        setModHintArrow({ from, to, color: "#5bbf7a" });
        if (sendHintToOpponent) online.sendHint(from, to, opponentColor ?? undefined);
      }
    } finally {
      setModHintLoading(false);
    }
  };

  useEffect(() => {
    setModHintArrow(null);
    if (!modAutoHint || state.status) return;
    let cancelled = false;
    (async () => {
      const res = await getEngine().go(snapshot.fen, { depth: 14 });
      if (cancelled) return;
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        setModHintArrow({ from, to, color: "#5bbf7a" });
        if (sendHintToOpponent) online.sendHint(from, to, opponentColor ?? undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, modAutoHint, state.status, sendHintToOpponent]);

  // "Auto move" god-mode — force-plays the engine's move for the selected
  // side every time it becomes that side's turn, reusing the same
  // mod:cheat:forceMove path the manual "Force move" button already uses.
  useEffect(() => {
    if (!modAutoMoveColor || state.status || paused || snapshot.turn !== modAutoMoveColor) return;
    let cancelled = false;
    (async () => {
      const res = await getEngine().go(snapshot.fen, { depth: 12 });
      if (cancelled) return;
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? uci[4] : undefined;
        online.modCheatForceMove(from, to, promotion);
        logMod(`Auto-move: played ${uci} for ${modAutoMoveColor}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, modAutoMoveColor, state.status, paused]);

  // ---------- lobby ----------
  if (state.phase === "idle") {
    const grouped: Record<string, TimeControl[]> = {};
    for (const t of TIME_CONTROLS) if (t.category !== "untimed") (grouped[t.category] ??= []).push(t);
    const categoryHints: Record<string, string> = {
      bullet: "Fast instincts",
      blitz: "Quick & tactical",
      rapid: "Room to think",
      classical: "Deep calculation",
    };
    const selectionDetail = tc.incrementMs > 0
      ? `${Math.round((tc.initialMs ?? 0) / 60_000)} minutes plus ${tc.incrementMs / 1_000} seconds after each move`
      : `${Math.round(((tc.initialMs ?? 0) / 60_000) * 10) / 10} minutes per player`;
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-elev-2)] text-[var(--accent)] shadow-[var(--shadow-sm)]">
              <IconUsers width={24} height={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black leading-tight tracking-tight">Play online</h1>
              <p className="text-sm text-[var(--text-muted)]">Match with a live player at your pace.</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
              state.connected
                ? "border-[var(--good)]/35 bg-[var(--good)]/10 text-[var(--good)]"
                : "border-[var(--warn)]/35 bg-[var(--warn)]/10 text-[var(--warn)]"
            }`}
            role="status"
          >
            <span className={`h-2 w-2 rounded-full ${state.connected ? "bg-[var(--good)]" : "animate-pulse bg-[var(--warn)]"}`} />
            {state.connected ? "Ready to match" : "Connecting…"}
          </div>
        </div>

        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-elev)] px-5 py-4 sm:px-6">
            <div>
              <p className="label mb-1">Selected match</p>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-2xl font-black tracking-tight">{tc.name}</h2>
                <span className="chip capitalize">{tc.category}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{selectionDetail}</p>
            </div>
            <span className="text-right text-xs font-semibold text-[var(--text-faint)]">
              {categoryHints[tc.category] ?? "Your custom pace"}
            </span>
          </div>

          <fieldset className="p-5 sm:p-6">
            <legend className="label px-1">Choose your pace</legend>
            <div className="mt-1 grid gap-4 sm:grid-cols-2">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat} className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/35 p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
                    <span className="text-sm font-black capitalize">{cat}</span>
                    <span className="text-[11px] font-semibold text-[var(--text-faint)]">{categoryHints[cat]}</span>
                  </div>
                  <div className={`grid gap-2 ${list.length === 1 ? "grid-cols-1" : list.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {list.map((t) => {
                      const active = tc.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTc(t)}
                          aria-pressed={active}
                          className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-bold transition-all ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)]"
                              : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="px-1">
                  <p className="text-sm font-black">Custom clock</p>
                  <p className="text-[11px] font-semibold text-[var(--text-faint)]">Set your own base time and increment.</p>
                </div>
                <button
                  type="button"
                  onClick={() => applyCustom(customMinutes, customIncrement)}
                  aria-pressed={isCustomTc}
                  className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                    isCustomTc
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
                  }`}
                >
                  {isCustomTc ? tc.name : "Set custom…"}
                </button>
              </div>
              {isCustomTc && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
                  <label className="text-xs font-bold text-[var(--text-muted)]">
                    Minutes
                    <input
                      type="number"
                      min={0.25}
                      max={180}
                      step={0.25}
                      value={customMinutes}
                      onChange={(e) => applyCustom(Number(e.target.value), customIncrement)}
                      className="input mt-1.5 w-full"
                    />
                  </label>
                  <label className="text-xs font-bold text-[var(--text-muted)]">
                    Increment (seconds)
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={customIncrement}
                      onChange={(e) => applyCustom(customMinutes, Number(e.target.value))}
                      className="input mt-1.5 w-full"
                    />
                  </label>
                </div>
              )}
            </div>
          </fieldset>
        </section>

        <fieldset className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
          <legend className="sr-only">Game type</legend>
          <button
            type="button"
            onClick={() => setRated(false)}
            aria-pressed={!ratedChoice}
            className={`min-h-12 rounded-lg px-3 py-2 text-left transition-colors ${!ratedChoice ? "bg-[var(--bg-elev-2)] shadow-[var(--shadow-sm)]" : "hover:bg-[var(--bg-elev)]"}`}
          >
            <span className="block text-sm font-black">Casual</span>
            <span className="block text-[11px] text-[var(--text-faint)]">Relaxed, rating unchanged</span>
          </button>
          <button
            type="button"
            onClick={() => loggedIn && setRated(true)}
            aria-pressed={ratedChoice}
            disabled={!loggedIn}
            className={`min-h-12 rounded-lg px-3 py-2 text-left transition-colors ${ratedChoice ? "bg-[var(--bg-elev-2)] shadow-[var(--shadow-sm)]" : "hover:bg-[var(--bg-elev)]"} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <span className="block text-sm font-black">Rated</span>
            <span className="block text-[11px] text-[var(--text-faint)]">{loggedIn ? "Competitive, rating on the line" : "Sign in required"}</span>
          </button>
        </fieldset>

        {state.error && (
          <p className="mt-4 rounded-xl border border-[var(--bad)]/35 bg-[var(--bad)]/10 px-4 py-3 text-sm font-semibold text-[var(--bad)]" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="btn btn-primary btn-cta mt-5 w-full"
          disabled={!state.connected}
          onClick={() => {
            primeAudio();
            online.findGame(tc, ratedChoice);
          }}
        >
          {state.connected ? `Find a ${tc.name} game` : "Connecting to game server…"}
        </button>
        {loggedIn && (
          <Link href="/friends" className="mt-3 block text-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">
            Prefer to play someone you know? Challenge a friend →
          </Link>
        )}
        <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
          Playing as <span className="font-semibold">{identity.username}</span>
        </p>
      </div>
    );
  }

  // ---------- searching ----------
  if (state.phase === "searching") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <div className="panel w-full overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg-elev)] px-6 py-7">
            <div className="dot-blink mb-4 flex justify-center gap-1.5 text-3xl leading-none text-[var(--accent)]" aria-hidden="true">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Finding your opponent</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]" role="status" aria-live="polite">
              Searching for {state.searching.seconds}s · Rating range widens as you wait
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="mb-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 px-4 py-3 text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-faint)]">Match request</p>
                <p className="mt-0.5 text-lg font-black">{tc.name}</p>
              </div>
              <span className="chip capitalize">{ratedChoice ? "Rated" : "Casual"} · {tc.category}</span>
            </div>
            <button className="btn w-full !py-3" onClick={online.cancelSearch}>
              Cancel search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- game / spectate ----------
  // (players/opponentColor/opponentUsername/paused/logMod now declared above, before the early returns)
  const myTurn = state.myColor === snapshot.turn && !state.status;
  const topColor: Color = orientation === "w" ? "b" : "w";
  const bottomColor: Color = orientation;
  const myTakebacksRemaining = state.myColor
    ? Math.max(0, state.takebackLimit - state.takebacksUsed[state.myColor])
    : state.takebackLimit;

  const opponentMuted = Boolean(opponentColor && state.fullState?.roomMuted?.[opponentColor]);
  const flaggedMessages = state.chat
    .filter((m) => m.flagged)
    .map((m) => ({ from: m.from, text: m.text, ts: m.ts, severity: m.flagSeverity, reasons: m.flagReasons }));
  const reviewFlagged = Boolean(state.fullState?.reviewFlagged);
  const opponentFrozen = Boolean(opponentColor && state.fullState?.frozen?.[opponentColor]);
  const slowmodeMs = (opponentColor && state.fullState?.trollSlowmode?.[opponentColor]) ?? 0;
  const suspicion = {
    mine: (state.myColor === "w" ? state.fullState?.suspicion?.w : state.fullState?.suspicion?.b) ?? 0,
    opponent: (opponentColor === "w" ? state.fullState?.suspicion?.w : state.fullState?.suspicion?.b) ?? 0,
  };
  const toggleMute = (durationMs?: number) => {
    const next = !opponentMuted;
    online.modMuteChat(next, undefined, next ? durationMs : undefined);
    pushToast(next ? `Muted ${opponentUsername}'s chat` : `Unmuted ${opponentUsername}'s chat`);
    logMod(next ? `Muted ${opponentUsername}` : `Unmuted ${opponentUsername}`);
    if (next) incrementModStat("mutes");
  };
  const sendWarn = (text: string) => {
    if (!text.trim()) return;
    online.modWarn(text);
    fetch("/api/mod/warn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername: opponentUsername, reason: text }),
    }).catch(() => {});
    setWarnCount((n) => n + 1);
    pushToast(`Warned ${opponentUsername}`);
    logMod(`Warned ${opponentUsername}: "${text}"`);
    incrementModStat("warnings");
  };
  const togglePause = () => {
    const next = !paused;
    online.modPause(next);
    pushToast(next ? "Game paused" : "Game resumed");
    logMod(next ? "Paused the game" : "Resumed the game");
    if (next) incrementModStat("pauses");
  };
  const toggleFlagReview = () => {
    const next = !reviewFlagged;
    online.modFlagReview(next);
    pushToast(next ? "Flagged this game for admin review" : "Removed review flag");
    logMod(next ? "Flagged game for review" : "Removed review flag");
    if (next) incrementModStat("flagsForReview");
  };
  const onTroll = (type: TrollEffectType, opts?: { durationMs?: number; text?: string }) => {
    online.modTroll(type, { targetColor: opponentColor ?? undefined, ...opts });
    logMod(`Trolled ${opponentUsername}: ${type}`);
  };
  const onTrollFreeze = (frozen: boolean, opts?: { durationMs?: number }) => {
    online.modTrollFreeze(frozen, { targetColor: opponentColor ?? undefined, ...opts });
    logMod(frozen ? `Froze ${opponentUsername}` : `Unfroze ${opponentUsername}`);
  };
  const onTrollSlowmode = (intervalMs: number) => {
    online.modTrollSlowmode(intervalMs, opponentColor ?? undefined);
    logMod(intervalMs > 0 ? `Set ${opponentUsername}'s chat slowmode to ${intervalMs / 1000}s` : `Disabled ${opponentUsername}'s chat slowmode`);
  };
  const onModCheatLoadFen = (fen: string) => {
    online.modCheatSetFen(fen);
    logMod("God-mode: loaded custom FEN");
  };
  const onModCheatForceMove = (from: Square, to: Square, promotion?: string) => {
    online.modCheatForceMove(from, to, promotion);
    logMod(`God-mode: forced ${from}→${to}`);
  };
  const onModCheatForceResult = (result: "1-0" | "0-1" | "1/2-1/2") => {
    online.modCheatForceResult(result);
    logMod(`God-mode: forced result ${result}`);
  };
  const onModCheatFreeze = (color: Color | "both", frozen: boolean) => {
    online.modCheatFreeze(color, frozen);
    logMod(frozen ? `God-mode: froze ${color}` : `God-mode: unfroze ${color}`);
  };
  const onModCheatSwap = () => {
    online.modCheatSwap();
    logMod("God-mode: swapped sides");
  };
  const onModCheatTogglePause = () => {
    const next = !paused;
    online.modCheatPause(next);
    logMod(next ? "God-mode: paused the game" : "God-mode: resumed the game");
  };
  const onModCheatClock = (color: Color, opts: { addSeconds?: number; pause?: boolean; disable?: boolean }) => {
    online.modCheatClock(color, opts);
    logMod(`God-mode: adjusted ${color}'s clock`);
  };
  const onModCheatExtendBoth = () => {
    online.modCheatExtendBoth(60);
    logMod("God-mode: +60s to both clocks");
  };
  const onModCheatResetClocks = () => {
    online.modCheatResetClocks();
    logMod("God-mode: reset both clocks");
  };
  const onOwnerTroll = (type: TrollEffectType, opts?: { text?: string }) => {
    online.ownerTroll(type, { targetColor: opponentColor ?? undefined, ...opts });
    logMod(`Owner: trolled ${opponentUsername}: ${type}`);
  };
  const onOwnerTrollSlowmode = (intervalMs: number) => {
    online.ownerTrollSlowmode(intervalMs, opponentColor ?? undefined);
    logMod(intervalMs > 0 ? `Owner: set ${opponentUsername}'s chat slowmode to ${intervalMs / 1000}s` : `Owner: disabled ${opponentUsername}'s chat slowmode`);
  };

  const PlayerBar = ({ color }: { color: Color }) => {
    const p = color === "w" ? players?.white : players?.black;
    const isWhite = color === "w";
    const captured = isWhite ? snapshot.captured.byWhite : snapshot.captured.byBlack;
    const adv = isWhite
      ? Math.max(0, snapshot.captured.materialDiff)
      : Math.max(0, -snapshot.captured.materialDiff);
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: p?.connected ? "var(--good)" : "var(--bad)" }}
            title={p?.connected ? "Connected" : "Disconnected"}
          />
          {p && !p.userId.startsWith("guest:") ? (
            <Link href={`/u/${p.username}`} className="text-sm font-semibold hover:underline">
              {p.username}
            </Link>
          ) : (
            <span className="text-sm font-semibold">{p?.username ?? "—"}</span>
          )}
          {p?.isModerator && (p.userId !== session?.user?.id || showModUI) && (
            <IconShield width={12} height={12} className="text-[var(--accent)]" aria-label="In-game moderator" />
          )}
          {p && <span className="text-xs text-[var(--text-faint)]">{p.rating}</span>}
          {settings.showCapturedTray && (
            <CapturedTray pieces={captured} color={isWhite ? "b" : "w"} set={settings.pieceSet} advantage={adv} />
          )}
        </div>
        {state.timeControl?.initialMs != null && (
          <LiveClock
            clock={state.clock}
            color={color}
            gameOver={Boolean(state.status)}
            tickSound={color === state.myColor}
            reversed={clockDigitsReversed && color === state.myColor}
            lowTimeThresholdSec={settings.lowTimeThresholdSec}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <a href="#board-anchor" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-contrast)]">
        Skip to board
      </a>
      <a href="#move-list-anchor" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-14 focus:z-[100] focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-contrast)]">
        Skip to move list
      </a>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={online.leave}>
            ← Leave
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => announcePosition(snapshot)}
            title="Announce position (screen reader)"
            aria-label="Announce position"
          >
            <IconVolume width={16} height={16} />
          </button>
          {(showModUI || isOwnerAccount) && (
            <ModShieldMenu
              canModerateCurrentGame={isModerator && state.phase === "playing"}
              onModerate={() => setModPanelOpen((v) => !v)}
              flaggedCount={flaggedMessages.length}
              isOwnerAccount={isOwnerAccount}
              onOpenOwnerCheats={() => setOwnerCheatPanelOpen(true)}
              canUseOwnerCheats={state.phase === "playing"}
            />
          )}
          {state.roomId && (
            <button
              className="btn btn-ghost !py-1.5 text-sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/watch/${state.roomId}`)
                  .then(() => pushToast("Spectator link copied"))
                  .catch(() => {});
              }}
            >
              Copy spectator link
            </button>
          )}
        </div>
        {state.phase === "spectating" && <span className="chip">👁 Spectating</span>}
        {state.phase === "playing" && !state.status && (
          <div className="flex flex-wrap justify-end gap-2">
            {snapshot.moves.length > 0 && (
              <button
                className="btn"
                onClick={online.offerTakeback}
                disabled={state.takebackOfferFrom === state.myColor || myTakebacksRemaining <= 0}
                title={myTakebacksRemaining <= 0 ? "No takebacks remaining this game" : `${myTakebacksRemaining} takeback${myTakebacksRemaining === 1 ? "" : "s"} left`}
              >
                <IconUndo width={16} height={16} /> Takeback
                {myTakebacksRemaining < state.takebackLimit && (
                  <span className="text-xs opacity-70">({myTakebacksRemaining})</span>
                )}
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                online.offerDraw();
                setDrawCoolingDown(true);
                setTimeout(() => setDrawCoolingDown(false), 15000);
              }}
              disabled={state.drawOfferFrom === state.myColor || drawCoolingDown}
            >
              <IconHandshake width={16} height={16} /> Draw
            </button>
            <button
              className={`btn ${confirmingResign ? "btn-danger" : ""}`}
              onClick={() => {
                if (!confirmingResign) {
                  setConfirmingResign(true);
                  setTimeout(() => setConfirmingResign(false), 3000);
                  return;
                }
                setConfirmingResign(false);
                if (snapshot.moves.length <= 1) online.abort();
                else online.resign();
              }}
            >
              <IconFlag width={16} height={16} />{" "}
              {confirmingResign
                ? snapshot.moves.length <= 1
                  ? "Confirm abort?"
                  : "Confirm resign?"
                : snapshot.moves.length <= 1
                  ? "Abort"
                  : "Resign"}
            </button>
          </div>
        )}
      </div>

      {!state.connected && (
        <div className="mb-3 rounded-lg border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 text-sm text-[var(--bad)]">
          Reconnecting to the game server… your moves won&apos;t be sent until this comes back.
        </div>
      )}

      {!state.opponentConnected && !state.status && (
        <div className="mb-3 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-3 py-2 text-sm text-[var(--warn)]">
          Opponent disconnected — waiting for them to reconnect…
        </div>
      )}

      {state.phase === "playing" &&
        !notifyDismissed &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default" && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm">
            <span>Get notified when it&apos;s your move on another tab.</span>
            <span className="flex gap-2">
              <button className="btn !py-1" onClick={() => Notification.requestPermission().then(() => setNotifyDismissed(true))}>
                Enable
              </button>
              <button className="btn btn-ghost !py-1" onClick={() => setNotifyDismissed(true)}>
                Not now
              </button>
            </span>
          </div>
        )}

      {state.drawOfferFrom && state.drawOfferFrom !== state.myColor && !state.status && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm">
          <span>Your opponent offers a draw.</span>
          <span className="flex gap-2">
            <button className="btn !py-1" onClick={online.acceptDraw}>
              Accept
            </button>
            <button className="btn btn-ghost !py-1" onClick={online.declineDraw}>
              Decline
            </button>
          </span>
        </div>
      )}

      {state.takebackOfferFrom && state.takebackOfferFrom !== state.myColor && !state.status && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm">
          <span>Your opponent would like to take back a move.</span>
          <span className="flex gap-2">
            <button className="btn !py-1" onClick={online.acceptTakeback}>
              Accept
            </button>
            <button className="btn btn-ghost !py-1" onClick={online.declineTakeback}>
              Decline
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div ref={boardContainerRef} id="board-anchor" tabIndex={-1} className="relative flex w-full flex-col gap-2 outline-none lg:max-w-[min(72vh,640px)]">
          <TrollEffectOverlay
            effect={overlayEffect}
            watchedBanner={watchedBanner}
            confettiTrigger={confettiTrigger}
            reduceMotion={settings.reduceMotion}
          />
          <PlayerBar color={topColor} />
          <Board
            snapshot={snapshot}
            orientation={orientation}
            theme={theme}
            pieceSet={pieceSetOverride ?? settings.pieceSet}
            legalMovesFrom={game.legalMovesFrom}
            onMove={onMove}
            movableColor={state.myColor ?? "w"}
            interactive={state.phase === "playing" && !!state.myColor}
            showCoordinates={settings.showCoordinates}
            coordinateStyle={settings.coordinateStyle}
            showLegalMoves={settings.showLegalMoves}
            highlightLastMove={settings.highlightLastMove}
            animate={settings.animate}
            squareColorOverride={settings.squareColorOverride}
            colorblindMode={settings.colorblindMode}
            speechAnnounceMoves={settings.speechAnnounceMoves}
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
            onSetPremove={(from, to) =>
              setPremoveQueue((q) => (q.length < MAX_PREMOVES ? [...q, { from, to }] : q))
            }
            onCancelPremove={() => setPremoveQueue([])}
            onSwipeBack={game.stepBack}
            onSwipeForward={game.stepForward}
            extraArrows={[
              ...(snapshot.lastMove && settings.highlightLastMove
                ? [{ from: snapshot.lastMove.from, to: snapshot.lastMove.to, color: "rgba(255,255,255,0.4)" }]
                : []),
              ...(modHintArrow ? [modHintArrow] : []),
              ...(state.opponentHintArrow ? [state.opponentHintArrow] : []),
            ]}
          />
          <PlayerBar color={bottomColor} />
        </div>

        <div id="move-list-anchor" tabIndex={-1} className="panel flex w-full flex-col outline-none lg:h-[min(72vh,640px)] lg:w-[340px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
            <span>
              {state.status
                ? statusText(state)
                : myTurn
                  ? "Your move"
                  : state.phase === "spectating"
                    ? "Spectating"
                    : "Opponent to move"}
            </span>
            <span className="flex items-center gap-2">
              {premoveQueue.length > 0 && (
                <span className="chip !bg-[var(--accent)] !text-[var(--accent-contrast)]">
                  Premove ×{premoveQueue.length}
                </span>
              )}
              {snapshot.moves.length > 0 && (
                <span className="text-xs font-normal tabular-nums text-[var(--text-faint)]">
                  Move {Math.ceil(snapshot.moves.length / 2)}
                </span>
              )}
            </span>
          </div>
          <div className="flex border-b border-[var(--border)]">
            {(state.status ? (["moves", "openings", "analysis", "chat", "share"] as const) : (["moves", "openings", "chat", "share"] as const)).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t ? "border-[var(--accent)] text-[var(--text)]" : "border-transparent text-[var(--text-muted)]"
                }`}
              >
                {t}
                {t === "chat" && unreadChat > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.65rem] font-bold text-[var(--accent-contrast)]">
                    {unreadChat > 9 ? "9+" : unreadChat}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="min-h-[240px] flex-1 overflow-hidden lg:min-h-0">
            {tab === "moves" ? (
              <div className="flex h-full flex-col">
                <OpeningTicker moves={snapshot.moves} />
                <div className="min-h-0 flex-1">
                  <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} compact={settings.compactMoveList} figurineNotation={settings.figurineNotation} commentsByPly={snapshot.commentsByPly} />
                </div>
              </div>
            ) : tab === "openings" ? (
              <OpeningExplorer moves={snapshot.moves} viewPly={snapshot.viewPly} onPlaySan={playSan} />
            ) : tab === "analysis" && state.status ? (
              <div className="flex h-full flex-col overflow-y-auto">
                {state.myColor && state.players && (
                  <div className="flex items-center justify-between px-3 pb-2 pt-3">
                    <span className="label">Performance rating (est.)</span>
                    <span className="font-mono text-sm font-bold text-[var(--accent)]">
                      {performanceRating(
                        state.myColor === "w" ? state.players.black.rating : state.players.white.rating,
                        state.status.result === "1/2-1/2" ? "draw" : state.status.winner === state.myColor ? "win" : "loss",
                      )}
                    </span>
                  </div>
                )}
                <MaterialTimeline moves={snapshot.moves} />
                <PieceActivityHeatmap moves={snapshot.moves} />
                <div className="flex-1 overflow-hidden">
                  <AnalysisPanel analysis={analysis} progress={analysisProgress} onGoToPly={game.goToPly} viewPly={snapshot.viewPly} />
                </div>
                {!analysis && !analysisProgress && (
                  <div className="shrink-0 border-t border-[var(--border)] p-3">
                    <button className="btn w-full" onClick={runAnalysis} disabled={snapshot.moves.length === 0}>
                      Analyze game
                    </button>
                  </div>
                )}
              </div>
            ) : tab === "chat" ? (
              <ChatPanel
                messages={fakeChatMessages.length ? [...state.chat, ...fakeChatMessages].sort((a, b) => a.ts - b.ts) : state.chat}
                onSend={online.sendChat}
                disabled={state.phase === "spectating"}
                myUsername={identity.username}
                focusSignal={chatFocusSignal}
                isModerator={showModUI}
                onModMute={() => !opponentMuted && toggleMute()}
                onModWarn={() => sendWarn("Please follow the chat guidelines.")}
              />
            ) : (
              <div className="h-full overflow-y-auto">
                <SharePanel
                  fen={snapshot.fen}
                  pgn={game.getPgn()}
                  theme={theme}
                  orientation={orientation}
                  showImport={false}
                  shareCardMeta={
                    state.status && state.players
                      ? {
                          whiteName: state.players.white.username,
                          blackName: state.players.black.username,
                          result:
                            state.status.result === "1/2-1/2" ? "DRAW" : state.status.winner === "w" ? "WHITE_WINS" : "BLACK_WINS",
                          accuracyW: analysis?.accuracy.w,
                          accuracyB: analysis?.accuracy.b,
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {state.status && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade">
          <div className="panel w-full max-w-sm p-6 text-center animate-pop">
            <h2 className="text-2xl font-bold">{statusHeadline(state)}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {state.status.reason} · <span className="font-mono">{state.status.result}</span>
            </p>
            {state.status.ratingDelta && state.myColor && (
              <p className="mt-2 text-sm">
                Rating{" "}
                <span
                  className="font-bold"
                  style={{
                    color:
                      (state.myColor === "w" ? state.status.ratingDelta.white : state.status.ratingDelta.black) >= 0
                        ? "var(--good)"
                        : "var(--bad)",
                  }}
                >
                  {fmtDelta(state.myColor === "w" ? state.status.ratingDelta.white : state.status.ratingDelta.black)}
                </span>
              </p>
            )}
            {state.rated &&
              state.myColor &&
              state.players &&
              (() => {
                const myRating = state.myColor === "w" ? state.players.white.rating : state.players.black.rating;
                const oppRating = state.myColor === "w" ? state.players.black.rating : state.players.white.rating;
                const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
                const K = 32;
                const win = Math.round(K * (1 - expected));
                const draw = Math.round(K * (0.5 - expected));
                const loss = Math.round(K * (0 - expected));
                return (
                  <p className="mt-2 text-xs text-[var(--text-faint)]">
                    Next game — win {fmtDelta(win)} · draw {fmtDelta(draw)} · loss {fmtDelta(loss)}
                  </p>
                );
              })()}
            {series.wins + series.losses + series.draws > 1 && (
              <p className="mt-2 text-xs text-[var(--text-faint)]">
                Series: {series.wins}W {series.losses}L {series.draws}D
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn flex-1" onClick={online.leave}>
                Lobby
              </button>
              {state.phase === "playing" && (
                <button className="btn btn-primary flex-1" onClick={online.offerRematch}>
                  {state.rematchOfferFrom && state.rematchOfferFrom !== state.myColor ? "Accept rematch" : "Rematch"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showShortcuts && <ShortcutsHelpModal onClose={() => setShowShortcuts(false)} showDraw showChat />}
      {showModUI && modPanelOpen && state.phase === "playing" && (
        <ModPanel
          onClose={() => setModPanelOpen(false)}
          roomId={state.roomId ?? ""}
          opponentUsername={opponentUsername}
          flaggedMessages={flaggedMessages}
          opponentMuted={opponentMuted}
          onToggleMute={toggleMute}
          warnCount={warnCount}
          onWarn={sendWarn}
          paused={paused}
          onTogglePause={togglePause}
          reviewFlagged={reviewFlagged}
          onToggleFlagReview={toggleFlagReview}
          suspicion={suspicion}
          gameOver={Boolean(state.status)}
          actionLog={modLog}
          onTroll={onTroll}
          opponentFrozen={opponentFrozen}
          onTrollFreeze={onTrollFreeze}
          slowmodeMs={slowmodeMs}
          onTrollSlowmode={onTrollSlowmode}
        />
      )}
      {showModUI && state.phase === "playing" && (
        <ModCheatGate panelOpen={modCheatPanelOpen} onOpen={() => setModCheatPanelOpen(true)} />
      )}
      {showModUI && modCheatPanelOpen && state.phase === "playing" && (
        <ModCheatPanel
          onClose={() => setModCheatPanelOpen(false)}
          roomId={state.roomId ?? ""}
          currentFen={snapshot.fen}
          onLoadFen={onModCheatLoadFen}
          onForceMove={onModCheatForceMove}
          onForceResult={onModCheatForceResult}
          onFreeze={onModCheatFreeze}
          onSwapSides={onModCheatSwap}
          paused={paused}
          onTogglePause={onModCheatTogglePause}
          onClock={onModCheatClock}
          onExtendBoth={onModCheatExtendBoth}
          onResetClocks={onModCheatResetClocks}
          onRequestHint={requestModHint}
          hintLoading={modHintLoading}
          autoHint={modAutoHint}
          onAutoHintChange={setModAutoHint}
          autoMoveColor={modAutoMoveColor}
          onAutoMoveColorChange={setModAutoMoveColor}
          sendHintToOpponent={sendHintToOpponent}
          onSendHintToOpponentChange={setSendHintToOpponent}
        />
      )}
      {state.phase === "playing" && (
        <OwnerCheatGate panelOpen={ownerCheatPanelOpen} onOpen={() => setOwnerCheatPanelOpen(true)} />
      )}
      {ownerCheatPanelOpen && state.phase === "playing" && (
        <OwnerCheatPanel
          onClose={() => setOwnerCheatPanelOpen(false)}
          roomId={state.roomId ?? ""}
          currentFen={snapshot.fen}
          onLoadFen={onModCheatLoadFen}
          onForceMove={onModCheatForceMove}
          onForceResult={onModCheatForceResult}
          onFreeze={onModCheatFreeze}
          onSwapSides={onModCheatSwap}
          paused={paused}
          onTogglePause={onModCheatTogglePause}
          onClock={onModCheatClock}
          onExtendBoth={onModCheatExtendBoth}
          onResetClocks={onModCheatResetClocks}
          targetUsername={opponentUsername}
          onFireTrollEffect={onOwnerTroll}
          slowmodeMs={slowmodeMs}
          onTrollSlowmode={onOwnerTrollSlowmode}
          onRequestHint={requestModHint}
          hintLoading={modHintLoading}
          autoHint={modAutoHint}
          onAutoHintChange={setModAutoHint}
          autoMoveColor={modAutoMoveColor}
          onAutoMoveColorChange={setModAutoMoveColor}
          sendHintToOpponent={sendHintToOpponent}
          onSendHintToOpponentChange={setSendHintToOpponent}
        />
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}

function fmtDelta(d: number) {
  return d >= 0 ? `+${d}` : `${d}`;
}

function statusText(state: { status: { winner: Color | null } | null; myColor: Color | null }): string {
  if (!state.status) return "";
  if (state.status.winner === null) return "Draw";
  return state.status.winner === state.myColor ? "You won" : "You lost";
}

function statusHeadline(state: { status: { winner: Color | null; result: string } | null; myColor: Color | null }): string {
  if (!state.status) return "";
  if (state.status.winner === null) return "Draw";
  if (!state.myColor) return state.status.winner === "w" ? "White wins" : "Black wins";
  return state.status.winner === state.myColor ? "You won!" : "You lost";
}
