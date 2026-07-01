"use client";

import { use, useEffect, useRef } from "react";
import type { PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { Clock } from "@/components/game/Clock";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { useOnlineGame } from "@/lib/online/useOnlineGame";

export default function WatchPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;

  const identity = { userId: "spectator:" + Math.random().toString(36).slice(2), username: "Spectator", rating: 0, guest: true };
  const online = useOnlineGame(identity);
  const { state } = online;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    online.spectate(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!state.fullState) return;
    if (state.fullState.moves.length === 0) game.reset();
    else game.loadPgn(state.fullState.pgn);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="chip">👁 Spectating</span>
        {state.status && <span className="chip">Game over · {state.status.reason}</span>}
      </div>
      {!players ? (
        <div className="panel p-12 text-center text-[var(--text-muted)]">
          {state.connected ? "Loading game…" : "Connecting…"}
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
            <Bar name={players.black.username} rating={players.black.rating} ms={state.clock.blackMs} active={state.clock.activeColor === "b"} timed={state.timeControl?.initialMs != null} />
            <Board
              snapshot={snapshot}
              orientation="w"
              theme={theme}
              pieceSet={settings.pieceSet}
              legalMovesFrom={() => []}
              onMove={() => {}}
              interactive={false}
              showCoordinates={settings.showCoordinates}
              highlightLastMove
              animate={settings.animate}
            />
            <Bar name={players.white.username} rating={players.white.rating} ms={state.clock.whiteMs} active={state.clock.activeColor === "w"} timed={state.timeControl?.initialMs != null} />
          </div>
          <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
              Moves · {state.fullState?.spectators ?? 0} watching
            </div>
            <div className="flex-1 overflow-hidden">
              <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ name, rating, ms, active, timed }: { name: string; rating: number; ms: number; active: boolean; timed: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">
        {name} <span className="text-xs text-[var(--text-faint)]">{rating}</span>
      </span>
      {timed && <Clock ms={ms} active={active} />}
    </div>
  );
}
