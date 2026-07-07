"use client";

import { useEffect, useState } from "react";
import type { Color } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { GameControls } from "@/components/game/GameControls";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";

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
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Moves</div>
        <div className="flex-1 overflow-hidden">
          <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} />
        </div>
      </div>
    </div>
  );
}
