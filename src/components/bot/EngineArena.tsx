"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { BotAvatar } from "@/components/bot/BotAvatar";
import { useChessGame, START_FEN } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { applyLevelPreset, BOT_TIERS, chooseMove, getTier, type BotLevelId, type BotTier, type BotTierId } from "@/lib/engine/bots";
import { getPlayingEngine, configurePlayingEngine } from "@/lib/engine/playingEngine";
import type { ChessEngine } from "@/lib/engine/stockfish";
import { choosePersonalityMove, type BotPersonality } from "@/lib/cheats/botManipulation";

type ArenaSideConfig = {
  id: BotTierId;
  depth: number;
  skill: number;
  multipv: number;
  style: BotPersonality;
  levelId?: BotLevelId;
};

type ArenaConfig = {
  fen: string;
  white: ArenaSideConfig;
  black: ArenaSideConfig;
};

const MAX_ENGINE_DEPTH = 40;

const PERSONALITY_LABELS: Record<BotPersonality, string> = {
  normal: "Precision",
  aggressive: "Aggressive",
  passive: "Positional",
  random: "Unpredictable",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sideFromTier(id: BotTierId, levelId: BotLevelId = "elite"): ArenaSideConfig {
  const base = getTier(id);
  const tier = applyLevelPreset(base, levelId);
  return {
    id: tier.id,
    depth: tier.depth,
    skill: tier.skill,
    multipv: tier.multipv,
    style: tier.personality,
    ...(base.levels?.length ? { levelId } : {}),
  };
}

function arenaTier(side: ArenaSideConfig): BotTier {
  return {
    ...applyLevelPreset(getTier(side.id), side.levelId),
    depth: side.depth,
    skill: side.skill,
    multipv: side.multipv,
    personality: side.style,
  };
}

export function EngineArena() {
  const [config, setConfig] = useState<ArenaConfig | null>(null);
  const [sides, setSides] = useState<Record<Color, ArenaSideConfig>>({
    w: sideFromTier("sam"),
    b: sideFromTier("omen"),
  });
  const [fen, setFen] = useState(START_FEN);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const queryFen = params.get("fen");
      const depthParam = params.get("depth");
      const skillParam = params.get("skill");
      const depth = depthParam == null ? Number.NaN : Number(depthParam);
      const skill = skillParam == null ? Number.NaN : Number(skillParam);
      const style = params.get("style");
      if (queryFen) setFen(queryFen);
      setSides((current) => ({
        ...current,
        w: {
          ...current.w,
          id: "sam",
          ...(Number.isFinite(depth) ? { depth: clamp(depth, 4, MAX_ENGINE_DEPTH) } : {}),
          ...(Number.isFinite(skill) ? { skill: clamp(skill, 0, 20) } : {}),
          ...(style === "normal" || style === "aggressive" || style === "passive" || style === "random" ? { style } : {}),
        },
      }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const validation = useMemo(() => {
    try {
      return { ok: Boolean(new Chess(fen)) } as const;
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Invalid FEN" };
    }
  }, [fen]);

  if (config) return <ArenaMatch config={config} onExit={() => setConfig(null)} />;

  const whiteTier = getTier(sides.w.id);
  const blackTier = getTier(sides.b.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <span className="chip !border-[#52d6c8]/35 !bg-[#52d6c8]/10 !text-[#52d6c8]">⚡ Engine Arena</span>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Any bot vs any bot</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Build the matchup you want—from Maia Academy vs Dragon Elite to Sam Core vs Sam Engine. Give each side its own family level, strength, search depth, style, and candidate breadth.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <ArenaSideCard color="w" side={sides.w} onChange={(side) => setSides((current) => ({ ...current, w: side }))} />
            <ArenaSideCard color="b" side={sides.b} onChange={(side) => setSides((current) => ({ ...current, b: side }))} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn text-xs"
              onClick={() => setSides((current) => ({ w: current.b, b: current.w }))}
            >
              ⇄ Swap colours
            </button>
            <button type="button" className="btn text-xs" onClick={() => setSides({ w: sideFromTier("sam"), b: sideFromTier("omen") })}>
              Restore featured match
            </button>
            <span className="text-xs font-semibold text-[var(--text-faint)]">{whiteTier.name} has White · {blackTier.name} has Black</span>
          </div>

          <label className="mt-5 block">
            <span className="label mb-1 block">Starting position (FEN)</span>
            <textarea className="input min-h-24 w-full resize-y font-mono !text-xs" value={fen} onChange={(event) => setFen(event.target.value)} />
          </label>
          {!validation.ok && <p role="alert" className="mt-2 text-xs font-semibold text-[var(--bad)]">{validation.message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn text-xs" onClick={() => setFen(START_FEN)}>Standard position</button>
            <a className="btn text-xs" href="/training/editor">Open visual editor</a>
          </div>
        </section>

        <aside className="panel self-start p-5">
          <h2 className="text-lg font-black">Match contract</h2>
          <div className="mt-4 space-y-3 text-xs leading-5 text-[var(--text-muted)]">
            <p><strong className="text-[var(--text)]">Every pairing works.</strong> Either colour can use any arcade bot, including the original Sam Core X1.</p>
            <p><strong className="text-[var(--text)]">Local and private.</strong> The match runs in a browser worker; the position is not uploaded.</p>
            <p><strong className="text-[var(--text)]">Independent controls.</strong> Each side uses its chosen depth target, skill and style before moving.</p>
            <p><strong className="text-[var(--text)]">Deep means slow.</strong> Depths above 30 can take a long time, especially on phones.</p>
            <p><strong className="text-[var(--text)]">Two real engine families.</strong> Sam Engine uses Stockfish 18; Sam Core is an original TypeScript engine with its own search and evaluation.</p>
          </div>
          <button
            type="button"
            disabled={!validation.ok}
            className="btn btn-primary btn-cta mt-6 w-full"
            onClick={() => validation.ok && setConfig({ fen, white: sides.w, black: sides.b })}
          >
            Start {whiteTier.name} vs {blackTier.name}
          </button>
        </aside>
      </div>
    </main>
  );
}

function ArenaSideCard({ color, side, onChange }: { color: Color; side: ArenaSideConfig; onChange: (side: ArenaSideConfig) => void }) {
  const baseTier = getTier(side.id);
  const tier = applyLevelPreset(baseTier, side.levelId);
  const isSam = side.id === "sam";
  const accent = isSam ? "#52d6c8" : tier.accent;
  const maxDepth = tier.maxDepth ?? MAX_ENGINE_DEPTH;

  return (
    <div className="rounded-2xl border bg-[var(--bg)] p-4" style={{ borderColor: `${accent}66` }}>
      <div className="flex items-center gap-3">
        <BotAvatar tierId={tier.id} size={58} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{tier.fullName}</p>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{color === "w" ? "White" : "Black"}</p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="label mb-1 block">Bot</span>
        <select className="input w-full !py-2 text-sm" value={side.id} onChange={(event) => onChange(sideFromTier(event.target.value as BotTierId))}>
          {BOT_TIERS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.fullName} · {candidate.ratingLabel ?? (candidate.id === "sam" ? "Max" : candidate.elo)}</option>)}
        </select>
      </label>

      {baseTier.levels?.length ? (
        <label className="mt-3 block">
          <span className="label mb-1 block">Sub-bot level</span>
          <select className="input w-full !py-2 text-sm" value={side.levelId ?? "elite"} onChange={(event) => onChange(sideFromTier(side.id, event.target.value as BotLevelId))}>
            {baseTier.levels.map((level) => <option key={level.id} value={level.id}>{level.label} · {level.elo} rating</option>)}
          </select>
        </label>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1 flex justify-between text-xs font-bold"><span>Search depth</span><span style={{ color: accent }}>{side.depth}</span></span>
        <input type="range" min={1} max={maxDepth} value={side.depth} onChange={(event) => onChange({ ...side, depth: Number(event.target.value) })} className="w-full" style={{ accentColor: accent }} />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 flex justify-between text-xs font-bold"><span>Skill</span><span style={{ color: accent }}>{side.skill} / 20</span></span>
        <input type="range" min={0} max={20} value={side.skill} onChange={(event) => onChange({ ...side, skill: Number(event.target.value) })} className="w-full" style={{ accentColor: accent }} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label>
          <span className="label mb-1 block">Style</span>
          <select className="input w-full !py-2 text-xs" value={side.style} onChange={(event) => onChange({ ...side, style: event.target.value as BotPersonality })}>
            {Object.entries(PERSONALITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="label mb-1 block">Candidate lines</span>
          <select className="input w-full !py-2 text-xs" value={side.multipv} onChange={(event) => onChange({ ...side, multipv: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} {count === 1 ? "line" : "lines"}</option>)}
          </select>
        </label>
      </div>
      <button type="button" className="mt-3 text-xs font-bold text-[var(--text-muted)] underline-offset-4 hover:underline" onClick={() => onChange(sideFromTier(side.id, side.levelId))}>
        Restore {tier.name} defaults
      </button>
      {tier.engine === "sam-core" && <p className="mt-2 text-[0.68rem] leading-5 text-[var(--text-faint)]">Original engine depth scale: 1–10. A safety clock may finish the last complete depth early.</p>}
    </div>
  );
}

function ArenaMatch({ config, onExit }: { config: ArenaConfig; onExit: () => void }) {
  const game = useChessGame(config.fen);
  const { snapshot } = game;
  const makeMove = game.makeMove;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const whiteTier = getTier(config.white.id);
  const blackTier = getTier(config.black.id);
  const [orientation, setOrientation] = useState<Color>("w");
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState<Color | null>(null);
  const [evaluation, setEvaluation] = useState<{ cp: number | null; mate: number | null; depth: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchedFen = useRef<string | null>(null);
  const activeEngine = useRef<ChessEngine | null>(null);

  useEffect(() => {
    if (paused || snapshot.status.over || !snapshot.isLive || searchedFen.current === snapshot.fen) return;
    searchedFen.current = snapshot.fen;
    let cancelled = false;
    const currentColor = snapshot.turn;
    const side = currentColor === "w" ? config.white : config.black;
    const tier = arenaTier(side);
    const multipv = Math.max(side.multipv, side.style === "normal" ? 1 : 4);
    const engine = getPlayingEngine(side.id);
    activeEngine.current = engine;
    setThinking(currentColor);
    setError(null);
    (async () => {
      try {
        await configurePlayingEngine(engine, side.id, side.skill);
        const result = await engine.go(snapshot.fen, { depth: side.depth, multipv });
        if (cancelled) return;
        const line = result.lines[0];
        if (line) {
          const sign = currentColor === "w" ? 1 : -1;
          setEvaluation({ cp: line.cp == null ? null : line.cp * sign, mate: line.mate == null ? null : line.mate * sign, depth: line.depth });
        }
        const uci = side.style === "normal"
          ? chooseMove(result.lines, tier)
          : choosePersonalityMove(snapshot.fen, result.lines, side.style);
        const moved = makeMove({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] as PieceSymbol : undefined });
        if (!moved) throw new Error("Engine returned an illegal move.");
      } catch (reason) {
        if (!cancelled) {
          searchedFen.current = null;
          setError(reason instanceof Error ? reason.message : "Engine search failed.");
          setPaused(true);
        }
      } finally {
        if (activeEngine.current === engine) activeEngine.current = null;
        if (!cancelled) setThinking(null);
      }
    })();
    return () => { cancelled = true; };
  }, [config, makeMove, paused, snapshot.fen, snapshot.isLive, snapshot.status.over, snapshot.turn]);

  const togglePause = () => {
    if (!paused) {
      activeEngine.current?.stop();
      activeEngine.current = null;
      searchedFen.current = null;
      setThinking(null);
    }
    setPaused((value) => !value);
  };

  const statusText = snapshot.status.over
    ? `${snapshot.status.result ?? "Game over"} · ${snapshot.status.reason ?? "Finished"}`
    : paused ? "Match paused" : `${snapshot.turn === "w" ? "White" : "Black"} ${thinking ? "is searching" : "to move"}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#52d6c8]">Live Engine Arena</span>
          <h1 className="mt-1 text-2xl font-black">{whiteTier.name} vs {blackTier.name}</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{statusText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn text-xs" onClick={() => setOrientation((value) => value === "w" ? "b" : "w")}>Flip board</button>
          <button className="btn text-xs" onClick={togglePause} disabled={snapshot.status.over}>{paused ? "Resume" : "Pause"}</button>
          <button className="btn text-xs" onClick={onExit}>New setup</button>
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,720px)_minmax(18rem,1fr)] lg:items-start">
        <section className="space-y-2">
          <EnginePlayer side={orientation === "w" ? config.black : config.white} color={orientation === "w" ? "b" : "w"} active={thinking === (orientation === "w" ? "b" : "w")} />
          <Board snapshot={snapshot} orientation={orientation} theme={theme} pieceSet={settings.pieceSet} legalMovesFrom={game.legalMovesFrom} onMove={() => {}} interactive={false} showCoordinates={settings.showCoordinates} coordinateStyle={settings.coordinateStyle} highlightLastMove={settings.highlightLastMove} animate={settings.animate} animationSpeed={settings.animationSpeed} boardFrame={settings.boardFrame} pieceSizePercent={settings.pieceSize} squareColorOverride={settings.squareColorOverride} />
          <EnginePlayer side={orientation === "w" ? config.white : config.black} color={orientation === "w" ? "w" : "b"} active={thinking === (orientation === "w" ? "w" : "b")} />
        </section>
        <aside className="panel overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">Current evaluation</p>
            <p className="mt-1 text-2xl font-black text-[var(--accent)]">{evaluation?.mate != null ? `Mate ${evaluation.mate}` : evaluation?.cp != null ? `${evaluation.cp >= 0 ? "+" : ""}${(evaluation.cp / 100).toFixed(2)}` : "—"}</p>
            <p className="text-xs text-[var(--text-faint)]">White perspective · reached depth {evaluation?.depth ?? 0}</p>
          </div>
          {error && <p role="alert" className="m-4 rounded-xl border border-[var(--bad)]/30 bg-[var(--bad)]/10 p-3 text-xs font-semibold text-[var(--bad)]">{error}</p>}
          <div className="max-h-[32rem] overflow-y-auto p-4">
            <h2 className="font-extrabold">Move log</h2>
            <div className="mt-3 grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-1 text-sm">
              {Array.from({ length: Math.ceil(snapshot.moves.length / 2) }, (_, index) => <div key={index} className="contents"><span className="text-[var(--text-faint)]">{index + 1}.</span><span className="font-semibold">{snapshot.moves[index * 2]?.san ?? ""}</span><span className="font-semibold">{snapshot.moves[index * 2 + 1]?.san ?? ""}</span></div>)}
            </div>
            {snapshot.moves.length === 0 && <p className="mt-3 text-sm text-[var(--text-faint)]">The first engine is preparing its search.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}

function EnginePlayer({ side, color, active }: { side: ArenaSideConfig; color: Color; active: boolean }) {
  const tier = applyLevelPreset(getTier(side.id), side.levelId);
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${active ? "border-[#52d6c8]/50 bg-[#52d6c8]/8" : "border-[var(--border)] bg-[var(--panel)]"}`}>
      <BotAvatar tierId={side.id} size={38} rounded="full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{tier.fullName}</p>
        <p className="text-xs text-[var(--text-faint)]">{color === "w" ? "White" : "Black"} · depth {side.depth} · skill {side.skill}</p>
      </div>
      {active && <span className="chip !border-[#52d6c8]/30 !text-[#52d6c8]">Searching…</span>}
    </div>
  );
}
