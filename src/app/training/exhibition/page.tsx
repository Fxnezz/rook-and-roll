"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Color } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { EvalBar } from "@/components/game/EvalBar";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { getEngine } from "@/lib/engine/stockfish";
import { playSound } from "@/lib/chess/sound";

const SKILL_LEVELS = [
  { id: 3, label: "Beginner (~1100)" },
  { id: 8, label: "Club (~1500)" },
  { id: 14, label: "Strong (~1900)" },
  { id: 20, label: "Max (~2500+)" },
];

const SPEEDS = [
  { id: 2000, label: "Slow" },
  { id: 900, label: "Normal" },
  { id: 300, label: "Fast" },
];

export default function ExhibitionPage() {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const [orientation, setOrientation] = useState<Color>("w");
  const [skillW, setSkillW] = useState(8);
  const [skillB, setSkillB] = useState(8);
  const [speedMs, setSpeedMs] = useState(900);
  const [running, setRunning] = useState(false);
  const [evalScore, setEvalScore] = useState<{ cp: number | null; mate: number | null }>({ cp: 0, mate: null });
  const runningRef = useRef(false);
  runningRef.current = running;

  const noop = useCallback(() => {}, []);

  const step = useCallback(async () => {
    if (!runningRef.current || snapshot.status.over) {
      setRunning(false);
      return;
    }
    const engine = getEngine();
    const skill = snapshot.turn === "w" ? skillW : skillB;
    await engine.setSkillLevel(skill);
    const res = await engine.go(snapshot.fen, { depth: 12 });
    if (!runningRef.current) return;
    const uci = res.bestmove || res.lines[0]?.move;
    if (!uci) {
      setRunning(false);
      return;
    }
    const move = game.makeMove({
      from: uci.slice(0, 2) as import("chess.js").Square,
      to: uci.slice(2, 4) as import("chess.js").Square,
      promotion: uci.length > 4 ? (uci[4] as import("chess.js").PieceSymbol) : undefined,
    });
    if (move) {
      playSound(move.flags.includes("e") || move.flags.includes("c") ? "capture" : move.san.includes("+") ? "check" : "move");
      const cpEval = await engine.evaluate(move.after, { depth: 10 }).catch(() => null);
      if (cpEval && runningRef.current) setEvalScore({ cp: cpEval.cp, mate: cpEval.mate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, snapshot.turn, snapshot.status.over, skillW, skillB, game]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled && runningRef.current) {
        await step();
        if (cancelled || snapshot.status.over) break;
        await new Promise((r) => setTimeout(r, speedMs));
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = () => {
    setRunning(false);
    game.reset();
    setEvalScore({ cp: 0, mate: null });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Engine exhibition</h1>
        <Link href="/training" className="btn btn-ghost !text-xs">
          ← Training
        </Link>
      </div>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Two engines play each other automatically. Adjust each side&apos;s strength, watch the eval bar swing, and step
        through the moves.
      </p>

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
              onMove={noop}
              interactive={false}
              showCoordinates={settings.showCoordinates}
              coordinateStyle={settings.coordinateStyle}
              showLegalMoves={false}
              highlightLastMove={settings.highlightLastMove}
              animate={settings.animate}
              pieceSizePercent={settings.pieceSize}
              animationSpeed={settings.animationSpeed}
              boardFrame={settings.boardFrame}
              zoomPercent={settings.boardZoom}
            />
            <div className="panel flex flex-wrap items-center gap-2 p-2">
              <button className="btn btn-primary !text-xs" onClick={() => setRunning((r) => !r)} disabled={snapshot.status.over}>
                {running ? "Pause" : "Play"}
              </button>
              <button className="btn !text-xs" onClick={reset}>
                Reset
              </button>
              <button className="btn ml-auto !text-xs" onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
                Flip board
              </button>
            </div>
          </div>
        </div>

        <div className="panel flex w-full flex-col gap-4 p-4 lg:w-[360px]">
          <div>
            <span className="label mb-1 block">White strength</span>
            <select className="input" value={skillW} onChange={(e) => setSkillW(Number(e.target.value))}>
              {SKILL_LEVELS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label mb-1 block">Black strength</span>
            <select className="input" value={skillB} onChange={(e) => setSkillB(Number(e.target.value))}>
              {SKILL_LEVELS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label mb-1 block">Playback speed</span>
            <select className="input" value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {snapshot.status.over && (
            <p className="text-sm font-semibold text-[var(--accent)]">
              Game over — {snapshot.status.result === "1/2-1/2" ? "draw" : `${snapshot.status.winner === "w" ? "White" : "Black"} wins`}
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--border)] pt-2">
            <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} compact={settings.compactMoveList} />
          </div>
        </div>
      </div>
    </main>
  );
}
