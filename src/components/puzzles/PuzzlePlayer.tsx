"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio } from "@/lib/chess/sound";
import type { PuzzleDef } from "@/lib/puzzles/types";

export type PuzzleOutcome = "solved" | "solved-with-mistake";

type Phase = "solving" | "opponent" | "wrong" | "done";

export function PuzzlePlayer({
  puzzle,
  onComplete,
  onFirstMistake,
  onSkip,
}: {
  puzzle: PuzzleDef;
  onComplete: (outcome: PuzzleOutcome) => void;
  onFirstMistake: () => void;
  /** Advance to the next puzzle without solving/failing this one — not counted as an attempt. */
  onSkip?: () => void;
}) {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [phase, setPhase] = useState<Phase>("solving");
  const [idx, setIdx] = useState(0); // next index into puzzle.solution
  const [mistake, setMistake] = useState(false);
  const [hint, setHint] = useState(false);
  const solverColor: Color = (puzzle.fen.split(" ")[1] as Color) ?? "w";
  const doneRef = useRef(false);

  // (re)load on puzzle change
  useEffect(() => {
    game.loadFen(puzzle.fen);
    setPhase("solving");
    setIdx(0);
    setMistake(false);
    setHint(false);
    doneRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("done");
    playSound("gameEnd");
    onComplete(mistake ? "solved-with-mistake" : "solved");
  }, [mistake, onComplete]);

  const playOpponentReply = useCallback(
    (replyIdx: number) => {
      const uci = puzzle.solution[replyIdx];
      if (!uci) return;
      setPhase("opponent");
      setTimeout(() => {
        const mv = game.makeMove({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci[4] as PieceSymbol | undefined,
        });
        if (mv) playSound(mv.san.includes("x") ? "capture" : "move");
        setIdx(replyIdx + 1);
        setPhase("solving");
      }, 420);
    },
    [game, puzzle.solution],
  );

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (phase !== "solving" || doneRef.current) return;
      primeAudio();
      const attempted = from + to + (promotion ?? "");
      const expected = puzzle.solution[idx];
      const isLast = idx === puzzle.solution.length - 1;

      const mv = game.makeMove({ from, to, promotion });
      if (!mv) {
        playSound("illegal");
        return;
      }

      // The final move accepts ANY immediate checkmate (chess.js marks it "#");
      // earlier moves must follow the proven line exactly.
      const mated = mv.san.includes("#");
      const correct = attempted === expected || (isLast && mated);
      if (correct) {
        playSound(mv.san.includes("x") ? "capture" : mv.san.includes("+") || mated ? "check" : "move");
        if (isLast || mated) {
          finish();
        } else {
          setIdx(idx + 1);
          playOpponentReply(idx + 1);
        }
      } else {
        // wrong — flash, roll back, let them retry
        playSound("illegal");
        setPhase("wrong");
        if (!mistake) {
          setMistake(true);
          onFirstMistake();
        }
        setTimeout(() => {
          game.undo();
          setPhase("solving");
        }, 650);
      }
    },
    [phase, idx, puzzle.solution, game, mistake, onFirstMistake, finish, playOpponentReply],
  );

  const hintSquare = hint && phase === "solving" ? (puzzle.solution[idx]?.slice(0, 2) as Square) : null;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-[12px] transition-shadow"
        style={{
          boxShadow:
            phase === "wrong"
              ? "0 0 0 3px var(--bad)"
              : phase === "done"
                ? "0 0 0 3px var(--good)"
                : "none",
        }}
      >
        <Board
          snapshot={snapshot}
          orientation={solverColor}
          theme={theme}
          pieceSet={settings.pieceSet}
          legalMovesFrom={game.legalMovesFrom}
          onMove={onMove}
          movableColor={solverColor}
          interactive={phase === "solving" && !doneRef.current}
          showCoordinates={settings.showCoordinates}
          showLegalMoves={settings.showLegalMoves}
          highlightLastMove
          animate={settings.animate}
          squareColorOverride={settings.squareColorOverride}
          colorblindMode={settings.colorblindMode}
          speechAnnounceMoves={settings.speechAnnounceMoves}
          pieceSizePercent={settings.pieceSize}
          animationSpeed={settings.animationSpeed}
          arrowColor={settings.arrowColor}
          boardFrame={settings.boardFrame}
          zoomPercent={settings.boardZoom}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {phase === "done" ? (
            <span className="text-[var(--good)]">Solved!</span>
          ) : phase === "wrong" ? (
            <span className="text-[var(--bad)]">Not that — try again</span>
          ) : phase === "opponent" ? (
            <span className="text-[var(--text-muted)]">Opponent replies…</span>
          ) : (
            <>
              {solverColor === "w" ? "White" : "Black"} to move
              {snapshot.check && " · escape or press the attack"}
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {phase === "solving" && !hint && (
            <button className="btn btn-ghost !py-1 text-xs" onClick={() => setHint(true)}>
              Hint
            </button>
          )}
          {onSkip && phase !== "done" && (
            <button className="btn btn-ghost !py-1 text-xs" onClick={onSkip}>
              Skip
            </button>
          )}
        </div>
        {hintSquare && (
          <span className="text-xs text-[var(--accent)]">
            Look at <span className="font-mono font-bold">{hintSquare}</span>
          </span>
        )}
      </div>
    </div>
  );
}
