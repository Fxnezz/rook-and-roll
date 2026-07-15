"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { BotAvatar } from "@/components/bot/BotAvatar";
import { useChessGame, START_FEN } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { BOT_TIERS, chooseMove, getTier, type BotTierId } from "@/lib/engine/bots";
import { getEngine } from "@/lib/engine/stockfish";
import { choosePersonalityMove, type BotPersonality } from "@/lib/cheats/botManipulation";

type ArenaConfig = {
  fen: string;
  samColor: Color;
  samDepth: number;
  samSkill: number;
  samMultipv: number;
  samStyle: Exclude<BotPersonality, "random">;
  opponentId: Exclude<BotTierId, "sam">;
  opponentDepth: number;
};

const OPPONENTS = BOT_TIERS.filter((tier) => tier.id !== "sam");

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function EngineArena() {
  const [config, setConfig] = useState<ArenaConfig | null>(null);
  const [samColor, setSamColor] = useState<Color>("w");
  const [samDepth, setSamDepth] = useState(22);
  const [samSkill, setSamSkill] = useState(20);
  const [samMultipv, setSamMultipv] = useState(1);
  const [samStyle, setSamStyle] = useState<ArenaConfig["samStyle"]>("normal");
  const [opponentId, setOpponentId] = useState<ArenaConfig["opponentId"]>("omen");
  const [opponentDepth, setOpponentDepth] = useState(20);
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
      if (Number.isFinite(depth)) setSamDepth(clamp(depth, 4, 30));
      if (Number.isFinite(skill)) setSamSkill(clamp(skill, 0, 20));
      if (style === "normal" || style === "aggressive" || style === "passive") setSamStyle(style);
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

  const opponent = getTier(opponentId);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <span className="chip !border-[#52d6c8]/35 !bg-[#52d6c8]/10 !text-[#52d6c8]">⚡ Engine Arena</span>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Sam Engine S1 vs the arcade</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">Run an automated bot-vs-bot match from the normal opening or any legal FEN. Tune both search depths, then watch every move live.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#52d6c8]/35 bg-[#52d6c8]/8 p-4">
              <div className="flex items-center gap-3"><BotAvatar tierId="sam" size={58} /><div><p className="font-black">Sam Engine S1</p><p className="text-xs text-[var(--text-faint)]">Custom arcade engine profile</p></div></div>
              <label className="mt-4 block"><span className="mb-1 flex justify-between text-xs font-bold"><span>Search depth</span><span className="text-[#52d6c8]">{samDepth}</span></span><input type="range" min={4} max={30} value={samDepth} onChange={(event) => setSamDepth(Number(event.target.value))} className="w-full accent-[#52d6c8]" /></label>
              <label className="mt-3 block"><span className="mb-1 flex justify-between text-xs font-bold"><span>Skill</span><span className="text-[#52d6c8]">{samSkill} / 20</span></span><input type="range" min={0} max={20} value={samSkill} onChange={(event) => setSamSkill(Number(event.target.value))} className="w-full accent-[#52d6c8]" /></label>
              <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="label mb-1 block">Style</span><select className="input w-full !py-2 text-xs" value={samStyle} onChange={(event) => setSamStyle(event.target.value as ArenaConfig["samStyle"])}><option value="normal">Precision</option><option value="aggressive">Aggressive</option><option value="passive">Positional</option></select></label><label><span className="label mb-1 block">Candidate lines</span><select className="input w-full !py-2 text-xs" value={samMultipv} onChange={(event) => setSamMultipv(Number(event.target.value))}><option value={1}>1 line</option><option value={2}>2 lines</option><option value={3}>3 lines</option><option value={5}>5 lines</option></select></label></div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center gap-3"><BotAvatar tierId={opponent.id} size={58} /><div><p className="font-black">{opponent.fullName}</p><p className="text-xs text-[var(--text-faint)]">{opponent.elo} profile · {opponent.personality}</p></div></div>
              <label className="mt-4 block"><span className="label mb-1 block">Opponent</span><select className="input w-full !py-2 text-sm" value={opponentId} onChange={(event) => { const id = event.target.value as ArenaConfig["opponentId"]; setOpponentId(id); setOpponentDepth(getTier(id).depth); }}>{OPPONENTS.map((tier) => <option key={tier.id} value={tier.id}>{tier.fullName} · {tier.elo}</option>)}</select></label>
              <label className="mt-4 block"><span className="mb-1 flex justify-between text-xs font-bold"><span>Opponent depth</span><span className="text-[var(--accent)]">{opponentDepth}</span></span><input type="range" min={3} max={24} value={opponentDepth} onChange={(event) => setOpponentDepth(Number(event.target.value))} className="w-full accent-[var(--accent)]" /></label>
              <div className="mt-4"><span className="label mb-2 block">Sam plays</span><div className="grid grid-cols-2 gap-2">{(["w", "b"] as Color[]).map((color) => <button key={color} type="button" className={`btn !py-2 text-xs ${samColor === color ? "btn-primary" : ""}`} onClick={() => setSamColor(color)}>{color === "w" ? "White" : "Black"}</button>)}</div></div>
            </div>
          </div>

          <label className="mt-5 block"><span className="label mb-1 block">Starting position (FEN)</span><textarea className="input min-h-24 w-full resize-y font-mono !text-xs" value={fen} onChange={(event) => setFen(event.target.value)} /></label>
          {!validation.ok && <p role="alert" className="mt-2 text-xs font-semibold text-[var(--bad)]">{validation.message}</p>}
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn text-xs" onClick={() => setFen(START_FEN)}>Standard position</button><a className="btn text-xs" href="/training/editor">Open visual editor</a></div>
        </section>

        <aside className="panel self-start p-5">
          <h2 className="text-lg font-black">Match contract</h2>
          <div className="mt-4 space-y-3 text-xs leading-5 text-[var(--text-muted)]"><p><strong className="text-[var(--text)]">Local and private.</strong> The match runs in a browser worker; the position is not uploaded.</p><p><strong className="text-[var(--text)]">Depth is exact.</strong> Each side searches to its chosen depth before moving.</p><p><strong className="text-[var(--text)]">No false benchmark claim.</strong> S1 uses a custom profile on the bundled Stockfish 18 core; strength depends on depth and device speed.</p></div>
          <button type="button" disabled={!validation.ok} className="btn btn-primary btn-cta mt-6 w-full" onClick={() => validation.ok && setConfig({ fen, samColor, samDepth, samSkill, samMultipv, samStyle, opponentId, opponentDepth })}>Start engine match</button>
        </aside>
      </div>
    </main>
  );
}

function ArenaMatch({ config, onExit }: { config: ArenaConfig; onExit: () => void }) {
  const game = useChessGame(config.fen);
  const { snapshot } = game;
  const makeMove = game.makeMove;
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const opponent = getTier(config.opponentId);
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState<Color | null>(null);
  const [evaluation, setEvaluation] = useState<{ cp: number | null; mate: number | null; depth: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchedFen = useRef<string | null>(null);

  useEffect(() => {
    if (paused || snapshot.status.over || !snapshot.isLive || searchedFen.current === snapshot.fen) return;
    searchedFen.current = snapshot.fen;
    let cancelled = false;
    const currentColor = snapshot.turn;
    const samTurn = currentColor === config.samColor;
    const depth = samTurn ? config.samDepth : config.opponentDepth;
    const skill = samTurn ? config.samSkill : opponent.skill;
    const multipv = samTurn ? Math.max(config.samMultipv, config.samStyle === "normal" ? 1 : 4) : opponent.multipv;
    setThinking(currentColor);
    setError(null);
    (async () => {
      try {
        const engine = getEngine();
        await engine.setSkillLevel(skill);
        const result = await engine.go(snapshot.fen, { depth, multipv });
        if (cancelled) return;
        const line = result.lines[0];
        if (line) {
          const sign = currentColor === "w" ? 1 : -1;
          setEvaluation({ cp: line.cp == null ? null : line.cp * sign, mate: line.mate == null ? null : line.mate * sign, depth: line.depth });
        }
        const uci = samTurn
          ? choosePersonalityMove(snapshot.fen, result.lines, config.samStyle)
          : chooseMove(result.lines, { ...opponent, depth: config.opponentDepth });
        const moved = makeMove({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] as PieceSymbol : undefined });
        if (!moved) throw new Error("Engine returned an illegal move.");
      } catch (reason) {
        if (!cancelled) {
          searchedFen.current = null;
          setError(reason instanceof Error ? reason.message : "Engine search failed.");
          setPaused(true);
        }
      } finally {
        if (!cancelled) setThinking(null);
      }
    })();
    return () => { cancelled = true; };
  }, [config, makeMove, opponent, paused, snapshot.fen, snapshot.isLive, snapshot.status.over, snapshot.turn]);

  const whiteId: BotTierId = config.samColor === "w" ? "sam" : config.opponentId;
  const blackId: BotTierId = config.samColor === "b" ? "sam" : config.opponentId;
  const statusText = snapshot.status.over
    ? `${snapshot.status.result ?? "Game over"} · ${snapshot.status.reason ?? "Finished"}`
    : paused ? "Match paused" : `${snapshot.turn === "w" ? "White" : "Black"} ${thinking ? "is searching" : "to move"}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-black uppercase tracking-[0.14em] text-[#52d6c8]">Live Engine Arena</span><h1 className="mt-1 text-2xl font-black">Sam Engine S1 vs {opponent.name}</h1><p className="mt-1 text-xs text-[var(--text-muted)]">{statusText}</p></div><div className="flex gap-2"><button className="btn text-xs" onClick={() => setPaused((value) => !value)} disabled={snapshot.status.over}>{paused ? "Resume" : "Pause"}</button><button className="btn text-xs" onClick={onExit}>New setup</button></div></header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,720px)_minmax(18rem,1fr)] lg:items-start">
        <section className="space-y-2">
          <EnginePlayer id={blackId} color="b" active={thinking === "b"} depth={blackId === "sam" ? config.samDepth : config.opponentDepth} />
          <Board snapshot={snapshot} orientation={config.samColor} theme={theme} pieceSet={settings.pieceSet} legalMovesFrom={game.legalMovesFrom} onMove={() => {}} interactive={false} showCoordinates={settings.showCoordinates} coordinateStyle={settings.coordinateStyle} highlightLastMove={settings.highlightLastMove} animate={settings.animate} animationSpeed={settings.animationSpeed} boardFrame={settings.boardFrame} pieceSizePercent={settings.pieceSize} squareColorOverride={settings.squareColorOverride} />
          <EnginePlayer id={whiteId} color="w" active={thinking === "w"} depth={whiteId === "sam" ? config.samDepth : config.opponentDepth} />
        </section>
        <aside className="panel overflow-hidden">
          <div className="border-b border-[var(--border)] p-4"><p className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">Current evaluation</p><p className="mt-1 text-2xl font-black text-[var(--accent)]">{evaluation?.mate != null ? `Mate ${evaluation.mate}` : evaluation?.cp != null ? `${evaluation.cp >= 0 ? "+" : ""}${(evaluation.cp / 100).toFixed(2)}` : "—"}</p><p className="text-xs text-[var(--text-faint)]">White perspective · reached depth {evaluation?.depth ?? 0}</p></div>
          {error && <p role="alert" className="m-4 rounded-xl border border-[var(--bad)]/30 bg-[var(--bad)]/10 p-3 text-xs font-semibold text-[var(--bad)]">{error}</p>}
          <div className="max-h-[32rem] overflow-y-auto p-4"><h2 className="font-extrabold">Move log</h2><div className="mt-3 grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-1 text-sm">{Array.from({ length: Math.ceil(snapshot.moves.length / 2) }, (_, index) => <div key={index} className="contents"><span className="text-[var(--text-faint)]">{index + 1}.</span><span className="font-semibold">{snapshot.moves[index * 2]?.san ?? ""}</span><span className="font-semibold">{snapshot.moves[index * 2 + 1]?.san ?? ""}</span></div>)}</div>{snapshot.moves.length === 0 && <p className="mt-3 text-sm text-[var(--text-faint)]">The first engine is preparing its search.</p>}</div>
        </aside>
      </div>
    </main>
  );
}

function EnginePlayer({ id, color, active, depth }: { id: BotTierId; color: Color; active: boolean; depth: number }) {
  const tier = getTier(id);
  return <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${active ? "border-[#52d6c8]/50 bg-[#52d6c8]/8" : "border-[var(--border)] bg-[var(--panel)]"}`}><BotAvatar tierId={id} size={38} rounded="full" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{tier.fullName}</p><p className="text-xs text-[var(--text-faint)]">{color === "w" ? "White" : "Black"} · depth {depth}</p></div>{active && <span className="chip !border-[#52d6c8]/30 !text-[#52d6c8]">Searching…</span>}</div>;
}
