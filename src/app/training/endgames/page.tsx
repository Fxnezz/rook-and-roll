"use client";

import { useCallback, useEffect, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { GameControls } from "@/components/game/GameControls";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio } from "@/lib/chess/sound";
import { getEngine } from "@/lib/engine/stockfish";
import { ENDGAME_DRILLS, type EndgameDrill } from "@/lib/training/endgames";

export default function EndgameTrainerPage() {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [drillIdx, setDrillIdx] = useState(0);
  const [thinking, setThinking] = useState(false);
  const drill: EndgameDrill = ENDGAME_DRILLS[drillIdx];
  const traineeColor: Color = (drill.fen.split(" ")[1] as Color) ?? "w";
  const orientation = traineeColor;

  const load = useCallback(
    (idx: number) => {
      setDrillIdx(idx);
      game.reset(ENDGAME_DRILLS[idx].fen);
    },
    [game],
  );

  useEffect(() => {
    game.loadFen(drill.fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The engine plays the defending side.
  useEffect(() => {
    if (snapshot.status.over || !snapshot.isLive || snapshot.turn === traineeColor) return;
    let cancelled = false;
    setThinking(true);
    (async () => {
      try {
        const res = await getEngine().go(snapshot.fen, { depth: settings.analysisDepth });
        if (cancelled) return;
        const uci = res.bestmove || res.lines[0]?.move;
        if (uci && uci.length >= 4) {
          const mv = game.makeMove({
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
            promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
          });
          if (mv) playSound(mv.san.includes("x") ? "capture" : mv.san.includes("+") ? "check" : "move");
        }
      } finally {
        if (!cancelled) setThinking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot.fen, snapshot.turn, snapshot.status.over, snapshot.isLive, traineeColor, settings.analysisDepth, game]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (snapshot.turn !== traineeColor || thinking) return;
      primeAudio();
      const mv = game.makeMove({ from, to, promotion });
      if (!mv) {
        playSound("illegal");
        return;
      }
      playSound(mv.san.includes("x") ? "capture" : mv.san.includes("+") ? "check" : "move");
    },
    [game, snapshot.turn, traineeColor, thinking],
  );

  const outcome = snapshot.status.over
    ? snapshot.status.winner === traineeColor
      ? "You won the endgame!"
      : snapshot.status.winner
        ? "The defender held — try again."
        : `Drawn (${snapshot.status.reason}).`
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Endgame trainer</h1>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-2 lg:max-w-[min(70vh,600px)]">
          <Board
            snapshot={snapshot}
            orientation={orientation}
            theme={theme}
            pieceSet={settings.pieceSet}
            legalMovesFrom={game.legalMovesFrom}
            onMove={onMove}
            movableColor={traineeColor}
            interactive={!snapshot.status.over && !thinking}
            showCoordinates={settings.showCoordinates}
            coordinateStyle={settings.coordinateStyle}
            showLegalMoves={settings.showLegalMoves}
            highlightLastMove
            animate={settings.animate}
            squareColorOverride={settings.squareColorOverride}
            colorblindMode={settings.colorblindMode}
            pieceSizePercent={settings.pieceSize}
            animationSpeed={settings.animationSpeed}
            boardFrame={settings.boardFrame}
            zoomPercent={settings.boardZoom}
          />
          <div className="panel flex items-center gap-2 p-2">
            <GameControls
              onFirst={game.goStart}
              onPrev={game.stepBack}
              onNext={game.stepForward}
              onLast={game.goLive}
              onFlip={() => {}}
              canBack={snapshot.viewPly > 0}
              canForward={snapshot.viewPly < snapshot.moves.length}
            />
            <button className="btn ml-auto !text-xs" onClick={() => load(drillIdx)}>
              Reset position
            </button>
          </div>
          {outcome && (
            <div className="panel p-4 text-center">
              <p className="font-semibold">{outcome}</p>
            </div>
          )}
        </div>

        <div className="panel w-full p-2 lg:w-[320px]">
          <span className="label mb-1 block px-2">Positions</span>
          {ENDGAME_DRILLS.map((d, i) => (
            <button
              key={d.id}
              onClick={() => load(i)}
              className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                i === drillIdx ? "bg-[var(--bg-elev-2)]" : "hover:bg-[var(--bg-elev)]"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                {d.name}
                <span className="chip !px-1.5 !py-0.5 text-[10px] capitalize">{d.goal}</span>
              </span>
              <span className="text-xs text-[var(--text-faint)]">{d.description}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
