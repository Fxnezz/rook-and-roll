"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import type { Arrow } from "@/components/board/ArrowLayer";
import { MoveList } from "@/components/game/MoveList";
import { GameControls } from "@/components/game/GameControls";
import { EvalBar } from "@/components/game/EvalBar";
import { EngineLines } from "@/components/game/EngineLines";
import { OpeningExplorer } from "@/components/game/OpeningExplorer";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { threatFen } from "@/lib/engine/analysis";
import { getEngine } from "@/lib/engine/stockfish";
import { playSound, primeAudio } from "@/lib/chess/sound";

type Tab = "moves" | "engine" | "openings";

function AnalysisBoard() {
  const params = useSearchParams();
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const [orientation, setOrientation] = useState<Color>("w");
  const [tab, setTab] = useState<Tab>("engine");
  const [evalScore, setEvalScore] = useState<{ cp: number | null; mate: number | null }>({ cp: null, mate: null });
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [threatArrow, setThreatArrow] = useState<Arrow | null>(null);
  const [threatBusy, setThreatBusy] = useState(false);

  // Deep-link support: /analysis?fen=... preloads a position.
  useEffect(() => {
    const fen = params.get("fen");
    if (fen) game.loadFen(fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any position change invalidates a previously shown threat.
  useEffect(() => setThreatArrow(null), [snapshot.fen]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      primeAudio();
      const move = game.makeMove({ from, to, promotion });
      if (!move) {
        playSound("illegal");
        return;
      }
      playSound(move.san.includes("x") ? "capture" : "move");
    },
    [game],
  );

  const playUci = useCallback(
    (uci: string) => {
      onMove(uci.slice(0, 2) as Square, uci.slice(2, 4) as Square, uci.length > 4 ? (uci[4] as PieceSymbol) : undefined);
    },
    [onMove],
  );

  const runImport = useCallback(() => {
    const text = importText.trim();
    if (!text) return;
    // A FEN is a single line with 6 space-separated fields; anything else is treated as PGN.
    const looksLikeFen = !text.includes("\n") && text.split(/\s+/).length >= 4 && text.includes("/");
    const ok = looksLikeFen ? game.loadFen(text) : game.loadPgn(text);
    if (ok) {
      setImportText("");
      setImportError(null);
    } else {
      setImportError(looksLikeFen ? "That FEN isn't a valid position." : "Couldn't parse that PGN.");
    }
  }, [importText, game]);

  const showThreat = useCallback(async () => {
    const flipped = threatFen(snapshot.fen);
    if (!flipped) return;
    setThreatBusy(true);
    try {
      const res = await getEngine().go(flipped, { depth: settings.analysisDepth });
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci && uci.length >= 4) {
        setThreatArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#e5604d" });
      }
    } catch {
      /* engine unavailable — nothing to show */
    } finally {
      setThreatBusy(false);
    }
  }, [snapshot.fen, settings.analysisDepth]);

  const threatUnavailable = threatFen(snapshot.fen) === null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analysis board</h1>
        <Link
          href={`/play/bot?fen=${encodeURIComponent(snapshot.fen)}`}
          className="btn !text-xs"
          title="Open this position as a bot game"
        >
          Play out vs bot
        </Link>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full gap-2 lg:max-w-[min(72vh,640px)]">
          <div className="hidden sm:block" style={{ width: 14 }}>
            <EvalBar cp={evalScore.cp} mate={evalScore.mate} orientation={orientation} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Board
              snapshot={snapshot}
              orientation={orientation}
              theme={theme}
              pieceSet={settings.pieceSet}
              legalMovesFrom={game.legalMovesFrom}
              onMove={onMove}
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
              extraArrows={threatArrow ? [threatArrow] : []}
              onSwipeBack={game.stepBack}
              onSwipeForward={game.stepForward}
            />
            <div className="panel flex items-center gap-2 p-2">
              <GameControls
                onFirst={game.goStart}
                onPrev={game.stepBack}
                onNext={game.stepForward}
                onLast={game.goLive}
                onFlip={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
                canBack={snapshot.viewPly > 0}
                canForward={snapshot.viewPly < snapshot.moves.length}
              />
              <button
                className="btn ml-auto !text-xs"
                onClick={showThreat}
                disabled={threatBusy || threatUnavailable}
                title={
                  threatUnavailable
                    ? "Not available while in check"
                    : "Highlight what the opponent is threatening if you pass"
                }
              >
                {threatBusy ? "…" : "Show threat"}
              </button>
              <button className="btn !text-xs" onClick={() => game.reset()}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[360px]">
          <div className="flex border-b border-[var(--border)] text-sm font-semibold">
            {(
              [
                ["engine", "Engine"],
                ["moves", "Moves"],
                ["openings", "Openings"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={`px-4 py-3 ${tab === id ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-faint)]"}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === "engine" ? (
              <div className="flex flex-col gap-4 p-4">
                <EngineLines fen={snapshot.fen} onPlayUci={playUci} onEval={setEvalScore} />
                <div>
                  <span className="label mb-1 block">Import FEN or PGN</span>
                  <textarea
                    className="input h-24 w-full resize-none font-mono !text-xs"
                    placeholder={'Paste a FEN ("rnbq… w KQkq - 0 1") or a full PGN'}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  {importError && <p className="mt-1 text-xs text-[var(--bad)]">{importError}</p>}
                  <button className="btn mt-2 w-full !text-xs" onClick={runImport} disabled={!importText.trim()}>
                    Load position / game
                  </button>
                </div>
              </div>
            ) : tab === "moves" ? (
              <MoveList
                moves={snapshot.moves}
                viewPly={snapshot.viewPly}
                onGoToPly={game.goToPly}
                compact={settings.compactMoveList}
                figurineNotation={settings.figurineNotation}
                commentsByPly={snapshot.commentsByPly}
              />
            ) : (
              <div className="flex h-full flex-col">
                <div className="border-b border-[var(--border)] p-2">
                  <Link href="/openings" className="btn w-full !text-xs">
                    Drill an opening line
                  </Link>
                </div>
                <OpeningExplorer
                  moves={snapshot.moves}
                  viewPly={snapshot.viewPly}
                  onPlaySan={(san) => {
                    for (const row of snapshot.board) {
                      for (const sq of row) {
                        if (!sq || sq.color !== snapshot.turn) continue;
                        const mv = game.legalMovesFrom(sq.square).find((m) => m.san === san);
                        if (mv) {
                          onMove(mv.from, mv.to, mv.promotion);
                          return;
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <AnalysisBoard />
    </Suspense>
  );
}
