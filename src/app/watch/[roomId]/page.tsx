"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { Clock } from "@/components/game/Clock";
import { ChatPanel } from "@/components/game/ChatPanel";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { ModPanel } from "@/components/moderation/ModPanel";
import { ModCheatGate } from "@/components/moderation/ModCheatGate";
import { ModCheatPanel } from "@/components/moderation/ModCheatPanel";
import { ModShieldMenu } from "@/components/moderation/ModShieldMenu";
import { OwnerCheatGate } from "@/components/moderation/OwnerCheatGate";
import { OwnerCheatPanel } from "@/components/moderation/OwnerCheatPanel";
import { useCheatAccess } from "@/lib/cheats/access";
import { useToasts } from "@/lib/hooks/useToasts";
import { ToastStack } from "@/components/ui/ToastStack";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { playSound } from "@/lib/chess/sound";
import { useModStats } from "@/lib/moderation/useModStats";
import { useTrollEffects } from "@/lib/moderation/useTrollEffects";
import { TrollEffectOverlay } from "@/components/moderation/TrollEffectOverlay";
import type { TrollEffectType } from "@/lib/online/protocol";

export default function WatchPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;
  const { toasts, push: pushToast } = useToasts();

  const isModerator = Boolean(session?.user?.isModerator);
  const showModUI = isModerator && !settings.modHideUI;
  const { isTargetAccount: isOwnerAccount } = useCheatAccess();
  const { increment: incrementModStat } = useModStats();
  const identity = useMemo(() => {
    if (session?.user) {
      return { userId: session.user.id, username: session.user.username ?? session.user.name ?? "Spectator", rating: 0, guest: false };
    }
    return { userId: "spectator:" + Math.random().toString(36).slice(2), username: "Spectator", rating: 0, guest: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);
  const online = useOnlineGame(identity);
  const { state } = online;
  const startedRef = useRef(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const { pieceSetOverride, overlayEffect, clockDigitsReversed, fakeChatMessages, watchedBanner, confettiTrigger } = useTrollEffects(
    state.trollEffect,
    boardContainerRef,
    pushToast,
  );

  const [tab, setTab] = useState<"moves" | "chat">("moves");
  const [modPanelOpen, setModPanelOpen] = useState(false);
  const [modCheatPanelOpen, setModCheatPanelOpen] = useState(false);
  const [ownerCheatPanelOpen, setOwnerCheatPanelOpen] = useState(false);
  const [targetColor, setTargetColor] = useState<Color>("w");
  const [warnCount, setWarnCount] = useState(0);
  const [modLog, setModLog] = useState<{ id: number; text: string; ts: number }[]>([]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    online.spectate(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useKeyboardShortcuts({
    onOpenModeration: () => {
      if (showModUI) setModPanelOpen((v) => !v);
    },
  });

  const prevFlaggedLenRef = useRef(0);
  useEffect(() => {
    const flaggedCount = state.chat.filter((m) => m.flagged).length;
    if (flaggedCount > prevFlaggedLenRef.current && showModUI && settings.modFlaggedSound) {
      playSound("flagged");
    }
    prevFlaggedLenRef.current = flaggedCount;
  }, [state.chat, showModUI, settings.modFlaggedSound]);

  useEffect(() => {
    if (!state.fullState) return;
    const fs = state.fullState;
    if (fs.moves.length === 0) {
      game.loadFen(fs.fen);
    } else {
      const ok = game.loadPgn(fs.pgn);
      if (!ok || game.getFen() !== fs.fen) game.loadFen(fs.fen);
    }
    game.goLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stateSeq]);

  useEffect(() => {
    const mv = state.lastServerMove;
    if (!mv) return;
    const last = snapshot.moves[snapshot.moves.length - 1];
    if (last && last.from === mv.from && last.to === mv.to) return;
    game.makeMove({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion as PieceSymbol | undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq]);

  const players = state.players;
  const targetUsername = (targetColor === "w" ? players?.white?.username : players?.black?.username) ?? "player";
  const targetMuted = Boolean(state.fullState?.roomMuted?.[targetColor]);
  const paused = Boolean(state.fullState?.paused);
  const reviewFlagged = Boolean(state.fullState?.reviewFlagged);
  const targetFrozen = Boolean(state.fullState?.frozen?.[targetColor]);
  const slowmodeMs = state.fullState?.trollSlowmode?.[targetColor] ?? 0;
  const suspicion = { mine: 0, opponent: state.fullState?.suspicion?.[targetColor] ?? 0 };
  const flaggedMessages = state.chat
    .filter((m) => m.flagged)
    .map((m) => ({ from: m.from, text: m.text, ts: m.ts, severity: m.flagSeverity, reasons: m.flagReasons }));

  const logMod = (text: string) => setModLog((l) => [...l, { id: l.length, text, ts: Date.now() }]);
  const toggleMute = (durationMs?: number) => {
    const next = !targetMuted;
    online.modMuteChat(next, targetColor, next ? durationMs : undefined);
    pushToast(next ? `Muted ${targetUsername}'s chat` : `Unmuted ${targetUsername}'s chat`);
    logMod(next ? `Muted ${targetUsername}` : `Unmuted ${targetUsername}`);
    if (next) incrementModStat("mutes");
  };
  const sendWarn = (text: string) => {
    if (!text.trim()) return;
    online.modWarn(text, targetColor);
    fetch("/api/mod/warn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername, reason: text }),
    }).catch(() => {});
    setWarnCount((n) => n + 1);
    pushToast(`Warned ${targetUsername}`);
    logMod(`Warned ${targetUsername}: "${text}"`);
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
    online.modTroll(type, { targetColor, ...opts });
    logMod(`Trolled ${targetUsername}: ${type}`);
  };
  const onTrollFreeze = (frozen: boolean, opts?: { durationMs?: number }) => {
    online.modTrollFreeze(frozen, { targetColor, ...opts });
    logMod(frozen ? `Froze ${targetUsername}` : `Unfroze ${targetUsername}`);
  };
  const onTrollSlowmode = (intervalMs: number) => {
    online.modTrollSlowmode(intervalMs, targetColor);
    logMod(intervalMs > 0 ? `Set ${targetUsername}'s chat slowmode to ${intervalMs / 1000}s` : `Disabled ${targetUsername}'s chat slowmode`);
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
    online.ownerTroll(type, { targetColor, ...opts });
    logMod(`Owner: trolled ${targetUsername}: ${type}`);
  };
  const onOwnerTrollSlowmode = (intervalMs: number) => {
    online.ownerTrollSlowmode(intervalMs, targetColor);
    logMod(intervalMs > 0 ? `Owner: set ${targetUsername}'s chat slowmode to ${intervalMs / 1000}s` : `Owner: disabled ${targetUsername}'s chat slowmode`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="chip">👁 Spectating</span>
        {state.status && <span className="chip">Game over · {state.status.reason}</span>}
        {(showModUI || isOwnerAccount) && (
          <ModShieldMenu
            canModerateCurrentGame={isModerator}
            onModerate={() => setModPanelOpen((v) => !v)}
            flaggedCount={flaggedMessages.length}
            isOwnerAccount={isOwnerAccount}
            onOpenOwnerCheats={() => setOwnerCheatPanelOpen(true)}
          />
        )}
      </div>
      {!players ? (
        <div className="panel p-12 text-center text-[var(--text-muted)]">
          {state.connected ? "Loading game…" : "Connecting…"}
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div ref={boardContainerRef} className="relative flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
            <TrollEffectOverlay
              effect={overlayEffect}
              watchedBanner={watchedBanner}
              confettiTrigger={confettiTrigger}
              reduceMotion={settings.reduceMotion}
            />
            <Bar
              name={players.black.username}
              userId={players.black.userId}
              rating={players.black.rating}
              ms={state.clock.blackMs}
              active={state.clock.activeColor === "b"}
              timed={state.timeControl?.initialMs != null}
              reversed={clockDigitsReversed && targetColor === "b"}
            />
            <Board
              snapshot={snapshot}
              orientation="w"
              theme={theme}
              pieceSet={pieceSetOverride ?? settings.pieceSet}
              legalMovesFrom={() => []}
              onMove={() => {}}
              interactive={false}
              showCoordinates={settings.showCoordinates}
              highlightLastMove
              animate={settings.animate}
              squareColorOverride={settings.squareColorOverride}
              colorblindMode={settings.colorblindMode}
              speechAnnounceMoves={settings.speechAnnounceMoves}
              pieceSizePercent={settings.pieceSize}
              animationSpeed={settings.animationSpeed}
              boardFrame={settings.boardFrame}
              zoomPercent={settings.boardZoom}
            />
            <Bar
              name={players.white.username}
              userId={players.white.userId}
              rating={players.white.rating}
              ms={state.clock.whiteMs}
              active={state.clock.activeColor === "w"}
              timed={state.timeControl?.initialMs != null}
              reversed={clockDigitsReversed && targetColor === "w"}
            />
          </div>
          <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 text-sm font-semibold">
              <span className="flex gap-3">
                <button className={tab === "moves" ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} onClick={() => setTab("moves")}>
                  Moves
                </button>
                <button className={tab === "chat" ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} onClick={() => setTab("chat")}>
                  Chat
                </button>
              </span>
              <span className="text-xs font-normal text-[var(--text-faint)]">{state.fullState?.spectators ?? 0} watching</span>
            </div>
            {showModUI && (
              <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5 text-xs">
                <span className="text-[var(--text-faint)]">Targeting:</span>
                <button
                  className="rounded px-1.5 py-0.5 font-semibold"
                  style={targetColor === "w" ? { background: "var(--accent)", color: "var(--accent-contrast)" } : undefined}
                  onClick={() => setTargetColor("w")}
                >
                  {players.white.username}
                </button>
                <button
                  className="rounded px-1.5 py-0.5 font-semibold"
                  style={targetColor === "b" ? { background: "var(--accent)", color: "var(--accent-contrast)" } : undefined}
                  onClick={() => setTargetColor("b")}
                >
                  {players.black.username}
                </button>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              {tab === "moves" ? (
                <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} compact={settings.compactMoveList} figurineNotation={settings.figurineNotation} commentsByPly={snapshot.commentsByPly} />
              ) : (
                <ChatPanel
                  messages={fakeChatMessages.length ? [...state.chat, ...fakeChatMessages].sort((a, b) => a.ts - b.ts) : state.chat}
                  onSend={online.sendChat}
                  myUsername={identity.username}
                  isModerator={showModUI}
                  onModMute={() => !targetMuted && toggleMute()}
                  onModWarn={() => sendWarn("Please follow the chat guidelines.")}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showModUI && modPanelOpen && (
        <ModPanel
          onClose={() => setModPanelOpen(false)}
          roomId={roomId}
          opponentUsername={targetUsername}
          flaggedMessages={flaggedMessages}
          opponentMuted={targetMuted}
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
          opponentFrozen={targetFrozen}
          onTrollFreeze={onTrollFreeze}
          slowmodeMs={slowmodeMs}
          onTrollSlowmode={onTrollSlowmode}
        />
      )}
      {showModUI && <ModCheatGate panelOpen={modCheatPanelOpen} onOpen={() => setModCheatPanelOpen(true)} />}
      {showModUI && modCheatPanelOpen && (
        <ModCheatPanel
          onClose={() => setModCheatPanelOpen(false)}
          roomId={roomId}
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
        />
      )}
      <OwnerCheatGate panelOpen={ownerCheatPanelOpen} onOpen={() => setOwnerCheatPanelOpen(true)} />
      {ownerCheatPanelOpen && (
        <OwnerCheatPanel
          onClose={() => setOwnerCheatPanelOpen(false)}
          roomId={roomId}
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
          targetUsername={targetUsername}
          onFireTrollEffect={onOwnerTroll}
          slowmodeMs={slowmodeMs}
          onTrollSlowmode={onOwnerTrollSlowmode}
        />
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}

function Bar({
  name,
  userId,
  rating,
  ms,
  active,
  timed,
  reversed,
}: {
  name: string;
  userId?: string;
  rating: number;
  ms: number;
  active: boolean;
  timed: boolean;
  reversed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">
        {userId && !userId.startsWith("guest:") ? (
          <Link href={`/u/${name}`} className="hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}{" "}
        <span className="text-xs text-[var(--text-faint)]">{rating}</span>
      </span>
      {timed && <Clock ms={ms} active={active} reversed={reversed} />}
    </div>
  );
}
