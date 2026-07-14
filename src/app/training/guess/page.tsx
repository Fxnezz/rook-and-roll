"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Chess, type Color, type Move } from "chess.js";
import { Board } from "@/components/board/Board";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound } from "@/lib/chess/sound";

interface GuessGame {
  id: string;
  yourColor: Color;
  whiteName: string;
  blackName: string;
  pgn: string;
  opening: string | null;
  createdAt: string;
}

type Status = "loading" | "ready" | "empty" | "error";

/** How many of your own moves to quiz per game — keeps a round short. */
const QUIZ_LENGTH = 8;

export default function GuessTheMovePage() {
  const { status: authStatus } = useSession();
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [status, setStatus] = useState<Status>("loading");
  const [ownMoves, setOwnMoves] = useState<Move[]>([]);
  const [yourColor, setYourColor] = useState<Color>("w");
  const [meta, setMeta] = useState<{ opponent: string; opening: string | null } | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState<Move | null>(null);
  const [done, setDone] = useState(false);

  const loadGame = useCallback(async () => {
    setStatus("loading");
    setDone(false);
    setRevealed(null);
    setCorrect(0);
    setQuizIdx(0);
    try {
      const res = await fetch("/api/me/guess-the-move");
      const data = (await res.json()) as { game: GuessGame | null };
      if (!data.game) {
        setStatus("empty");
        return;
      }
      const chess = new Chess();
      chess.loadPgn(data.game.pgn);
      const all = chess.history({ verbose: true }) as Move[];
      const mine = all.filter((m) => m.color === data.game!.yourColor);
      if (mine.length < 3) {
        setStatus("empty");
        return;
      }
      // Sample up to QUIZ_LENGTH of your moves, spread across the game.
      const step = Math.max(1, Math.floor(mine.length / QUIZ_LENGTH));
      const sample = mine.filter((_, i) => i % step === 0).slice(0, QUIZ_LENGTH);
      setOwnMoves(sample);
      setYourColor(data.game.yourColor);
      setMeta({
        opponent: data.game.yourColor === "w" ? data.game.blackName : data.game.whiteName,
        opening: data.game.opening,
      });
      game.loadFen(sample[0].before);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") loadGame();
    else if (authStatus === "unauthenticated") setStatus("error");
  }, [authStatus, loadGame]);

  const current = ownMoves[quizIdx];

  const onGuess = useCallback(
    (san: string) => {
      if (!current || revealed) return;
      const ok = san === current.san;
      if (ok) setCorrect((c) => c + 1);
      playSound(ok ? "capture" : "illegal");
      setRevealed(current);
    },
    [current, revealed],
  );

  const next = useCallback(() => {
    if (quizIdx + 1 >= ownMoves.length) {
      setDone(true);
      return;
    }
    const nextIdx = quizIdx + 1;
    setQuizIdx(nextIdx);
    setRevealed(null);
    game.loadFen(ownMoves[nextIdx].before);
  }, [quizIdx, ownMoves, game]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Guess the move</h1>
        <p className="text-sm text-[var(--text-muted)]">Loading one of your games…</p>
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Guess the move</h1>
        <p className="text-sm text-[var(--text-muted)]">Sign in to quiz yourself on your own past games.</p>
      </main>
    );
  }
  if (status === "empty") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Guess the move</h1>
        <p className="text-sm text-[var(--text-muted)]">
          You don&apos;t have any finished games long enough to quiz yet — play a few games first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Guess the move</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {meta && `vs ${meta.opponent}${meta.opening ? ` · ${meta.opening}` : ""} — `}
        What did you actually play here?
      </p>

      {done ? (
        <div className="panel flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-xl font-bold">
            {correct}/{ownMoves.length} correct
          </p>
          <button className="btn btn-primary" onClick={loadGame}>
            Try another game
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Board
            snapshot={snapshot}
            orientation={yourColor}
            theme={theme}
            pieceSet={settings.pieceSet}
            legalMovesFrom={() => []}
            onMove={() => {}}
            interactive={false}
            showCoordinates={settings.showCoordinates}
            animate={settings.animate}
            squareColorOverride={settings.squareColorOverride}
            colorblindMode={settings.colorblindMode}
            pieceSizePercent={settings.pieceSize}
            boardFrame={settings.boardFrame}
            zoomPercent={settings.boardZoom}
          />
          <div className="panel p-4">
            <p className="text-sm font-semibold">
              Move {quizIdx + 1} of {ownMoves.length} · {correct} correct so far
            </p>
            {!revealed ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {shuffledOptions(current).map((opt) => (
                  <button key={opt} className="btn !text-sm" onClick={() => onGuess(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3">
                <p className={revealed.san === current.san ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                  You played <span className="font-mono font-bold">{current.san}</span>
                </p>
                <button className="btn btn-primary mt-3 w-full" onClick={next}>
                  {quizIdx + 1 >= ownMoves.length ? "Finish" : "Next →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/** The real move plus 3 plausible-looking distractors from the same position's legal moves. */
function shuffledOptions(move: Move): string[] {
  const chess = new Chess(move.before);
  const legal = chess.moves();
  const distractors = legal.filter((s) => s !== move.san);
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const options = [move.san, ...distractors.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
