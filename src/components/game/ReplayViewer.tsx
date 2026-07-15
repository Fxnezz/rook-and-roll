"use client";

import { useCallback, useEffect, useState } from "react";
import type { Color } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { GameControls } from "@/components/game/GameControls";
import { SharePanel } from "@/components/game/SharePanel";
import { AnalysisPanel } from "@/components/bot/AnalysisPanel";
import { TimeUsageChart } from "@/components/game/TimeUsageChart";
import { MaterialTimeline } from "@/components/game/MaterialTimeline";
import { PieceActivityHeatmap } from "@/components/game/PieceActivityHeatmap";
import { analyzeGame, type GameAnalysis } from "@/lib/engine/analysis";
import { getEngine } from "@/lib/engine/stockfish";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { performanceRating } from "@/lib/ratings/performance";
import type { ShareCardMeta } from "@/components/game/SharePanel";

type Tab = "moves" | "analysis" | "share";

export function ReplayViewer({
  pgn,
  whiteName,
  blackName,
  moveTimes,
  yourColor,
  opponentRating,
  result,
  opening,
  eco,
}: {
  pgn: string;
  whiteName: string;
  blackName: string;
  /** Per-ply think time in ms, if this game was tracked (bot/local games only). */
  moveTimes?: number[];
  /** Which side you played, if known — enables the performance-rating readout. */
  yourColor?: Color;
  /** Your opponent's rating going into this game, if known. */
  opponentRating?: number;
  /** The game's actual final result (from the saved record) — independent of whichever ply is currently being viewed. */
  result?: "WHITE_WINS" | "BLACK_WINS" | "DRAW";
  /** Book opening name/ECO, if recorded for this game — shown on the downloadable share card. */
  opening?: string;
  eco?: string;
}) {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const [orientation, setOrientation] = useState<Color>("w");
  const [tab, setTab] = useState<Tab>("moves");
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    game.loadPgn(pgn);
    game.goStart();
    setAnalysis(null);
    setAnalysisProgress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgn]);

  const runAnalysis = useCallback(async () => {
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
  }, [snapshot.moves, settings.analysisDepth]);

  const canBack = snapshot.viewPly > 0;
  const canForward = snapshot.viewPly < snapshot.moves.length;

  const perfRating = (() => {
    if (yourColor == null || opponentRating == null || !result) return null;
    const outcome =
      result === "DRAW" ? "draw" : (result === "WHITE_WINS") === (yourColor === "w") ? "win" : "loss";
    return performanceRating(opponentRating, outcome);
  })();

  const shareCardMeta: ShareCardMeta | undefined = result
    ? {
        whiteName,
        blackName,
        result,
        opening,
        eco,
        accuracyW: analysis?.accuracy.w,
        accuracyB: analysis?.accuracy.b,
      }
    : undefined;

  const label = (name: string) => (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );

  return (
    <div className="print-area flex flex-col gap-5 lg:flex-row lg:items-start">
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
        <div className="panel mt-1 flex items-center gap-2 p-2">
          <GameControls
            onFirst={game.goStart}
            onPrev={game.stepBack}
            onNext={game.stepForward}
            onLast={game.goLive}
            onFlip={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
            canBack={canBack}
            canForward={canForward}
          />
          <button
            className="btn !ml-auto !text-xs"
            onClick={() => window.print()}
            title="Print the board and move list"
          >
            Print
          </button>
          <a
            className="btn !text-xs"
            href={`/play/bot?fen=${encodeURIComponent(snapshot.fen)}`}
            title="Open the position you're viewing as a bot game"
          >
            Practice from here
          </a>
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
            className={`px-4 py-3 ${tab === "analysis" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-faint)]"}`}
            onClick={() => setTab("analysis")}
          >
            Analysis
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
          ) : tab === "analysis" ? (
            <div className="flex h-full flex-col overflow-y-auto">
              {perfRating != null && (
                <div className="flex items-center justify-between px-3 pb-2 pt-3">
                  <span className="label">Performance rating (est.)</span>
                  <span className="font-mono text-sm font-bold text-[var(--accent)]">{perfRating}</span>
                </div>
              )}
              <MaterialTimeline moves={snapshot.moves} />
              <PieceActivityHeatmap moves={snapshot.moves} />
              {moveTimes && moveTimes.length > 0 && <TimeUsageChart moves={snapshot.moves} moveTimes={moveTimes} />}
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
          ) : (
            <div className="h-full overflow-y-auto">
              <SharePanel
                fen={snapshot.fen}
                pgn={pgn}
                theme={theme}
                orientation={orientation}
                showImport={false}
                shareCardMeta={shareCardMeta}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
