"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { CapturedTray } from "@/components/game/CapturedTray";
import { GameControls } from "@/components/game/GameControls";
import { SharePanel } from "@/components/game/SharePanel";
import { GameOverModal } from "@/components/game/GameOverModal";
import { OpeningExplorer } from "@/components/game/OpeningExplorer";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio } from "@/lib/chess/sound";
import { IconPlus, IconUsers } from "@/components/ui/icons";

type Tab = "moves" | "openings" | "share";

export default function LocalGamePage() {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [manualOrientation, setManualOrientation] = useState<Color>("w");
  const [tab, setTab] = useState<Tab>("moves");
  const [showResult, setShowResult] = useState(true);

  const orientation: Color =
    settings.autoFlip && snapshot.isLive ? snapshot.turn : manualOrientation;

  // Sounds tied to game state.
  useEffect(() => {
    if (snapshot.status.over) {
      setShowResult(true);
      playSound("gameEnd");
    }
  }, [snapshot.status.over]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      primeAudio();
      const move = game.makeMove({ from, to, promotion });
      if (!move) {
        playSound("illegal");
        return;
      }
      if (move.san.includes("#")) {
        // handled by the game-over effect
      } else if (move.san.includes("+")) {
        playSound("check");
      } else if (move.flags.includes("e") || move.flags.includes("c")) {
        playSound("capture");
      } else if (move.flags.includes("k") || move.flags.includes("q")) {
        playSound("castle");
      } else if (move.promotion) {
        playSound("promote");
      } else {
        playSound("move");
      }
    },
    [game],
  );

  const newGame = useCallback(() => {
    game.reset();
    setManualOrientation("w");
    setShowResult(true);
    primeAudio();
    playSound("gameStart");
  }, [game]);

  const flip = () => setManualOrientation((o) => (o === "w" ? "b" : "w"));

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

  const canBack = snapshot.viewPly > 0;
  const canForward = snapshot.viewPly < snapshot.moves.length;

  const statusText = useMemo(() => {
    if (snapshot.status.over) {
      const r =
        snapshot.status.result === "1/2-1/2"
          ? "Draw"
          : snapshot.status.winner === "w"
            ? "White wins"
            : "Black wins";
      return `${r} — ${snapshot.status.reason}`;
    }
    const side = snapshot.turn === "w" ? "White" : "Black";
    return snapshot.check ? `${side} to move · Check!` : `${side} to move`;
  }, [snapshot]);

  const Tray = ({ playerColor }: { playerColor: Color }) => {
    const isWhite = playerColor === "w";
    const captured = isWhite ? snapshot.captured.byWhite : snapshot.captured.byBlack;
    const displayColor: Color = isWhite ? "b" : "w";
    const adv = isWhite
      ? Math.max(0, snapshot.captured.materialDiff)
      : Math.max(0, -snapshot.captured.materialDiff);
    const toMove = snapshot.isLive && !snapshot.status.over && snapshot.turn === playerColor;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: toMove ? "var(--accent)" : "var(--border-strong)",
              boxShadow: toMove ? "0 0 8px var(--accent)" : "none",
            }}
          />
          <span className="text-sm font-semibold">{isWhite ? "White" : "Black"}</span>
        </div>
        <CapturedTray pieces={captured} color={displayColor} set={settings.pieceSet} advantage={adv} />
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elev-2)] text-[var(--accent)]">
            <IconUsers width={18} height={18} />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Pass &amp; Play</h1>
            <p className="text-xs text-[var(--text-muted)]">Two players, one board</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={newGame}>
          <IconPlus width={16} height={16} /> New game
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Board column */}
        <div className="flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
          <Tray playerColor={orientation === "w" ? "b" : "w"} />
          <Board
            snapshot={snapshot}
            orientation={orientation}
            theme={theme}
            pieceSet={settings.pieceSet}
            legalMovesFrom={game.legalMovesFrom}
            onMove={onMove}
            showCoordinates={settings.showCoordinates}
            showLegalMoves={settings.showLegalMoves}
            highlightLastMove={settings.highlightLastMove}
            animate={settings.animate}
          />
          <Tray playerColor={orientation} />
          <div className="panel mt-1 p-2">
            <GameControls
              onFirst={game.goStart}
              onPrev={game.stepBack}
              onNext={game.stepForward}
              onLast={game.goLive}
              onFlip={flip}
              onUndo={game.undo}
              canBack={canBack}
              canForward={canForward}
              canUndo={snapshot.moves.length > 0}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold">{statusText}</p>
          </div>
          <div className="flex border-b border-[var(--border)]">
            {(["moves", "openings", "share"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? "border-[var(--accent)] text-[var(--text)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t === "moves" ? "Moves" : t === "openings" ? "Openings" : "Share"}
              </button>
            ))}
          </div>
          <div className="min-h-[240px] flex-1 overflow-hidden lg:min-h-0">
            {tab === "moves" ? (
              <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} />
            ) : tab === "openings" ? (
              <OpeningExplorer moves={snapshot.moves} viewPly={snapshot.viewPly} onPlaySan={playSan} />
            ) : (
              <div className="h-full overflow-y-auto">
                <SharePanel
                  fen={snapshot.fen}
                  pgn={game.getPgn()}
                  onLoadFen={game.loadFen}
                  onLoadPgn={game.loadPgn}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showResult && (
        <GameOverModal
          status={snapshot.status}
          onNewGame={newGame}
          onReview={() => {
            setShowResult(false);
            game.goStart();
          }}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  );
}
