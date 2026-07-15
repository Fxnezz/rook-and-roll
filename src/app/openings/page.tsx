"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { playSound, primeAudio } from "@/lib/chess/sound";
import { OPENING_LINES, type OpeningLine } from "@/lib/openings";

type DrillState = "picking" | "running" | "done";

const BOT_REPLY_MS = 450;

export default function OpeningsDrillPage() {
  const game = useChessGame();
  const { snapshot } = game;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [query, setQuery] = useState("");
  const [line, setLine] = useState<OpeningLine | null>(null);
  const [userColor, setUserColor] = useState<Color>("w");
  const [state, setState] = useState<DrillState>("picking");
  const [mistakes, setMistakes] = useState(0);
  const [correction, setCorrection] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = OPENING_LINES.filter((l) => l.moves.length >= 4);
    if (!q) return pool;
    return pool.filter((l) => l.name.toLowerCase().includes(q) || l.eco.toLowerCase() === q);
  }, [query]);

  const start = useCallback(
    (l: OpeningLine, color: Color) => {
      primeAudio();
      game.reset();
      setLine(l);
      setUserColor(color);
      setMistakes(0);
      setCorrection(null);
      setState("running");
    },
    [game],
  );

  const ply = snapshot.moves.length;
  const done = line !== null && ply >= line.moves.length;

  // Book side replies automatically while the drill runs.
  useEffect(() => {
    if (state !== "running" || !line || done) return;
    if (snapshot.turn === userColor) return;
    const expected = line.moves[ply];
    const timer = setTimeout(() => {
      // Resolve the SAN through legal moves so we get from/to for makeMove.
      for (const row of snapshot.board) {
        for (const sq of row) {
          if (!sq || sq.color !== snapshot.turn) continue;
          const mv = game.legalMovesFrom(sq.square).find((m) => m.san === expected);
          if (mv) {
            game.makeMove({ from: mv.from, to: mv.to, promotion: mv.promotion });
            playSound(mv.san.includes("x") ? "capture" : "move");
            return;
          }
        }
      }
    }, BOT_REPLY_MS);
    return () => clearTimeout(timer);
  }, [state, line, done, ply, snapshot.turn, snapshot.board, userColor, game]);

  useEffect(() => {
    if (state === "running" && done) setState("done");
  }, [state, done]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (state !== "running" || !line || done || snapshot.turn !== userColor) return;
      const expected = line.moves[ply];
      const move = game.makeMove({ from, to, promotion });
      if (!move) {
        playSound("illegal");
        return;
      }
      if (move.san === expected) {
        setCorrection(null);
        playSound(move.san.includes("x") ? "capture" : "move");
      } else {
        // Off-book: roll it back and show what theory plays here.
        game.undo();
        setMistakes((n) => n + 1);
        setCorrection(expected);
        playSound("illegal");
      }
    },
    [state, line, done, snapshot.turn, userColor, ply, game],
  );

  const orientation = userColor;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Opening drills</h1>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
          <Board
            snapshot={snapshot}
            orientation={orientation}
            theme={theme}
            pieceSet={settings.pieceSet}
            legalMovesFrom={game.legalMovesFrom}
            onMove={onMove}
            interactive={state === "running" && !done}
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
          {state === "running" && line && (
            <div className="panel flex items-center gap-3 p-3 text-sm">
              <span className="rounded bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--text-muted)]">
                {line.eco}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{line.name}</span>
              <span className="shrink-0 text-xs text-[var(--text-faint)]">
                {ply}/{line.moves.length} moves · {mistakes} mistake{mistakes === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {correction && (
            <div className="panel border-[var(--warn)] p-3 text-sm">
              Not the book move — theory plays <span className="font-mono font-bold">{correction}</span> here. Try
              again.
            </div>
          )}
          {state === "done" && line && (
            <div className="panel p-4">
              <p className="font-semibold">
                Line complete{mistakes === 0 ? " — perfect!" : ` with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn !text-xs" onClick={() => start(line, userColor)}>
                  Repeat line
                </button>
                <button className="btn !text-xs" onClick={() => setState("picking")}>
                  Pick another
                </button>
                <Link className="btn !text-xs" href={`/play/bot?fen=${encodeURIComponent(snapshot.fen)}`}>
                  Play on vs bot
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[360px]">
          <div className="border-b border-[var(--border)] p-3">
            <span className="label mb-1 block">Choose a line to drill</span>
            <div className="flex gap-1.5">
              <input
                className="input w-full !text-sm"
                placeholder="Search openings (name or ECO)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="btn btn-ghost shrink-0 !px-2.5 !text-sm"
                onClick={() => filtered.length > 0 && start(filtered[Math.floor(Math.random() * filtered.length)], userColor)}
                disabled={filtered.length === 0}
                title="Pick a random line from the current search"
              >
                🎲
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-[var(--text-faint)]">Play as</span>
              {(["w", "b"] as Color[]).map((c) => (
                <button
                  key={c}
                  className="rounded-md border px-2 py-1 font-semibold transition-colors"
                  style={{
                    borderColor: userColor === c ? "var(--accent)" : "var(--border)",
                    color: userColor === c ? "var(--accent)" : "var(--text-muted)",
                  }}
                  onClick={() => setUserColor(c)}
                >
                  {c === "w" ? "White" : "Black"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.map((l) => (
              <button
                key={l.name}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-elev)]"
                onClick={() => start(l, userColor)}
              >
                <span className="w-10 shrink-0 rounded bg-[var(--bg-elev-2)] px-1 py-0.5 text-center font-mono text-[10px] font-bold text-[var(--text-muted)]">
                  {l.eco}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{Math.ceil(l.moves.length / 2)} moves</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-[var(--text-faint)]">No openings match that search.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
