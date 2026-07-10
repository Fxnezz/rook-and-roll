"use client";

import { useEffect, useState } from "react";
import type { Color } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { GameControls } from "@/components/game/GameControls";
import { SharePanel } from "@/components/game/SharePanel";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";

type Tab = "moves" | "share";

export function ReplayViewer({
  pgn,
  whiteName,
  blackName,
}: {
  pgn: string;
  whiteName: string;
  blackName: string;
}) {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const [orientation, setOrientation] = useState<Color>("w");
  const [tab, setTab] = useState<Tab>("moves");

  useEffect(() => {
    game.loadPgn(pgn);
    game.goStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgn]);

  const canBack = snapshot.viewPly > 0;
  const canForward = snapshot.viewPly < snapshot.moves.length;

  const label = (name: string) => (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
        {label(orientation === "w" ? blackName : whiteName)}
        <Board
          snapshot={snapshot}
          orientation={orientation}
          theme={theme}
          pieceSet={settings.pieceSet}
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
        {label(orientation === "w" ? whiteName : blackName)}
        <div className="panel mt-1 p-2">
          <GameControls
            onFirst={game.goStart}
            onPrev={game.stepBack}
            onNext={game.stepForward}
            onLast={game.goLive}
            onFlip={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
            canBack={canBack}
            canForward={canForward}
          />
        </div>
      </div>
      <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
        <div className="flex border-b border-[var(--border)] text-sm font-semibold">
          <button
            className={`px-4 py-3 ${tab === "moves" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-faint)]"}`}
            onClick={() => setTab("moves")}
          >
            Moves
          </button>
          <button
            className={`px-4 py-3 ${tab === "share" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-faint)]"}`}
            onClick={() => setTab("share")}
          >
            Share
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {tab === "moves" ? (
            <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} compact={settings.compactMoveList} figurineNotation={settings.figurineNotation} commentsByPly={snapshot.commentsByPly} />
          ) : (
            <div className="h-full overflow-y-auto">
              <SharePanel fen={snapshot.fen} pgn={pgn} theme={theme} orientation={orientation} showImport={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
