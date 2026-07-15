"use client";

import { useEffect, useMemo, useState } from "react";
import type { Color } from "chess.js";
import { applyLevelPreset, BOT_TIERS, type BotLevelId, type BotTierId } from "@/lib/engine/bots";
import {
  TIME_CONTROLS,
  type TimeControl,
  type DelayMode,
  clampCustomMinutes,
  clampCustomIncrementSec,
  customTimeControlId,
  getTimeControl,
} from "@/lib/chess/useClock";
import { Piece } from "@/lib/pieces";
import { IconRobot } from "@/components/ui/icons";
import { ChessRulesModal } from "@/components/ui/ChessRulesModal";
import { ODDS_OPTIONS, oddsStartFen, type OddsId } from "@/lib/chess/odds";
import { BotAvatar } from "@/components/bot/BotAvatar";
import type { BotPersonality } from "@/lib/cheats/botManipulation";

const CUSTOM_TC_STORAGE_KEY = "rr.customTimeControl.v1";

const BOT_GROUPS = [
  { title: "Beginner", detail: "400–700", ids: ["pip", "milo", "nell"] },
  { title: "Intermediate", detail: "850–1300", ids: ["beau", "cass", "rosa", "wren"] },
  { title: "Advanced", detail: "1450–1900", ids: ["dex", "ilsa", "vera", "zephyr"] },
  { title: "Master", detail: "2150+", ids: ["titan", "omen"] },
  { title: "Engine Families", detail: "10 profiles · 4 levels each", ids: ["maia3", "lc0", "lozza9", "komodo", "ethereal", "berserk", "seer", "velvet", "caissa", "dragon"] },
  { title: "Engine Lab", detail: "Original engine + maximum strength", ids: ["samcore", "sam"] },
] as const;

const PERSONALITY_LABEL = {
  normal: "Balanced",
  random: "Unpredictable",
  passive: "Positional",
  aggressive: "Aggressive",
} as const;

export interface BotConfig {
  tierId: BotTierId;
  color: Color; // human's colour
  timeControlId: string;
  showEval: boolean;
  /** Non-standard starting position — handicap odds (or a deep-linked custom FEN) apply this instead of the normal start. */
  startFen?: string;
  engineDepth?: number;
  engineSkill?: number;
  engineMultipv?: number;
  enginePersonality?: BotPersonality;
  botLevelId?: BotLevelId;
}

export function BotSetup({ onStart }: { onStart: (cfg: BotConfig) => void }) {
  const [tierId, setTierId] = useState<BotTierId>("cass");
  const [colorChoice, setColorChoice] = useState<"w" | "b" | "random">("w");
  const [tcId, setTcId] = useState("untimed");
  const [showEval, setShowEval] = useState(false);
  const [oddsId, setOddsId] = useState<OddsId>("none");
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [delayMode, setDelayMode] = useState<DelayMode>("increment");
  const [showRules, setShowRules] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [engineDepth, setEngineDepth] = useState(26);
  const [engineSkill, setEngineSkill] = useState(20);
  const [engineMultipv, setEngineMultipv] = useState(1);
  const [enginePersonality, setEnginePersonality] = useState<BotPersonality>("normal");
  const [botLevelId, setBotLevelId] = useState<BotLevelId>("elite");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedTier = params.get("tier");
      const requested = BOT_TIERS.find((tier) => tier.id === requestedTier);
      if (requested) {
        setTierId(requested.id);
        if (requested.levels?.length) setBotLevelId("elite");
        if (requested.id === "sam" || requested.id === "samcore") {
          setEngineDepth(requested.depth);
          setEngineSkill(requested.skill);
          setEngineMultipv(requested.multipv);
          setEnginePersonality(requested.personality);
        }
      }
      const depthParam = params.get("depth");
      const skillParam = params.get("skill");
      const multipvParam = params.get("multipv");
      const depth = depthParam == null ? Number.NaN : Number(depthParam);
      const skill = skillParam == null ? Number.NaN : Number(skillParam);
      const multipv = multipvParam == null ? Number.NaN : Number(multipvParam);
      const personality = params.get("style");
      if (Number.isFinite(depth) && depth >= (requested?.id === "samcore" ? 1 : 4)) setEngineDepth(Math.min(requested?.maxDepth ?? 40, Math.round(depth)));
      if (Number.isFinite(skill) && skill >= 0) setEngineSkill(Math.min(20, Math.round(skill)));
      if (Number.isFinite(multipv) && multipv >= 1) setEngineMultipv(Math.min(5, Math.round(multipv)));
      if (personality === "normal" || personality === "aggressive" || personality === "passive") setEnginePersonality(personality);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Recommended-bot guidance: fetch the signed-in player's blitz rating and
  // highlight the tier closest to it. Silently skipped when signed out.
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.user?.ratingBlitz === "number") setMyRating(d.user.ratingBlitz);
      })
      .catch(() => {
        /* ignore — no recommendation shown */
      });
  }, []);

  const recommendedTierId = useMemo(() => {
    if (myRating == null) return null;
    let closest: BotTierId = BOT_TIERS[0].id;
    let bestDiff = Infinity;
    for (const t of BOT_TIERS) {
      if (t.ratingLabel) continue;
      const diff = Math.abs(t.elo - myRating);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = t.id;
      }
    }
    return closest;
  }, [myRating]);

  // Remember the last-used custom time control across visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { minutes?: number; increment?: number; delayMode?: DelayMode };
        if (typeof parsed.minutes === "number") setCustomMinutes(clampCustomMinutes(parsed.minutes));
        if (typeof parsed.increment === "number") setCustomIncrement(clampCustomIncrementSec(parsed.increment));
        if (parsed.delayMode === "us" || parsed.delayMode === "bronstein") setDelayMode(parsed.delayMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const isCustom = tcId.startsWith("custom:");

  const applyCustom = (minutes: number, increment: number, mode: DelayMode = delayMode) => {
    const m = clampCustomMinutes(minutes);
    const i = clampCustomIncrementSec(increment);
    setCustomMinutes(m);
    setCustomIncrement(i);
    setDelayMode(mode);
    setTcId(customTimeControlId(m, i, mode));
    try {
      localStorage.setItem(CUSTOM_TC_STORAGE_KEY, JSON.stringify({ minutes: m, increment: i, delayMode: mode }));
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    const color: Color = colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    const botColor: Color = color === "w" ? "b" : "w";
    const deepLinkedFen = new URLSearchParams(window.location.search).get("fen") ?? undefined;
    const startFen = deepLinkedFen ?? oddsStartFen(botColor, oddsId) ?? undefined;
    const baseTier = BOT_TIERS.find((tier) => tier.id === tierId) ?? BOT_TIERS[4];
    const playingTier = applyLevelPreset(baseTier, botLevelId);
    onStart({
      tierId,
      color,
      timeControlId: tcId,
      showEval,
      startFen,
      ...(baseTier.levels?.length
        ? { botLevelId, engineDepth: playingTier.depth, engineSkill: playingTier.skill, engineMultipv: playingTier.multipv, enginePersonality: playingTier.personality }
        : tierId === "sam" || tierId === "samcore"
          ? { engineDepth, engineSkill, engineMultipv, enginePersonality }
          : {}),
    });
  };

  const selectTier = (id: BotTierId) => {
    setTierId(id);
    const tier = BOT_TIERS.find((candidate) => candidate.id === id)!;
    if (tier.levels?.length) setBotLevelId("elite");
    if (id === "sam" || id === "samcore") {
      setEngineDepth(tier.depth);
      setEngineSkill(tier.skill);
      setEngineMultipv(tier.multipv);
      setEnginePersonality(tier.personality);
    }
  };

  const grouped: Record<string, TimeControl[]> = {};
  for (const tc of TIME_CONTROLS) (grouped[tc.category] ??= []).push(tc);
  const selectedBaseTier = BOT_TIERS.find((tier) => tier.id === tierId) ?? BOT_TIERS[4];
  const selectedTier = applyLevelPreset(selectedBaseTier, botLevelId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
          <IconRobot width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black leading-tight tracking-tight">Choose your opponent</h1>
          <p className="text-sm text-[var(--text-muted)]">25 bot families · 40 new level branches · original Sam Core</p>
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="How to play chess"
          title="How to play chess"
        >
          ?
        </button>
      </div>

      <section className="panel overflow-hidden">
        <div className="grid gap-5 border-b border-[var(--border)] bg-[var(--bg-elev)]/45 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6" aria-live="polite">
          <BotAvatar tierId={selectedTier.id} size={112} rounded="lg" className="shadow-[var(--shadow)]" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{selectedTier.fullName}</h2>
              <span className="text-xl" aria-label={`Country flag ${selectedTier.flag}`}>{selectedTier.flag}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip !border-[var(--accent)]/30 !text-[var(--accent)]">{selectedTier.ratingLabel ?? (selectedTier.id === "sam" ? "Unrated maximum-strength profile" : `${selectedTier.elo} rating`)}</span>
              <span className="chip">{PERSONALITY_LABEL[selectedTier.personality]}</span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{selectedTier.blurb}</p>
          </div>
          <div className="hidden text-right sm:block">
            <IconRobot width={30} height={30} className="ml-auto text-[var(--accent)]" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">{selectedTier.lineage ?? (selectedTier.engine === "sam-core" ? "Original Sam Core" : selectedTier.id === "sam" ? "Sam Engine S1" : "Stockfish tuned")}</p>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          {BOT_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-muted)]">{group.title}</h3>
                <span className="text-xs font-semibold text-[var(--text-faint)]">{group.detail}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {group.ids.map((id) => {
                  const tier = BOT_TIERS.find((candidate) => candidate.id === id)!;
                  const active = tierId === tier.id;
                  const recommended = recommendedTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => selectTier(tier.id)}
                      aria-pressed={active}
                      className={`relative flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition sm:flex-col sm:p-3 sm:text-center ${
                        active
                          ? "border-[var(--accent)] bg-[var(--bg-elev-2)] shadow-[0_0_0_1px_var(--accent)]"
                          : recommended
                            ? "border-[var(--accent-dim)] bg-[var(--accent)]/5 hover:bg-[var(--bg-elev)]"
                            : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]"
                      }`}
                    >
                      {recommended && (
                        <span className="absolute -right-1.5 -top-2 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[var(--accent-contrast)]">
                          Best match
                        </span>
                      )}
                      <BotAvatar tierId={tier.id} size={58} rounded="lg" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">{tier.name} <span aria-hidden="true">{tier.flag}</span></span>
                        <span className="mt-0.5 block text-xs font-bold text-[var(--text-faint)]">{tier.ratingLabel ? "Unrated" : tier.elo}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedBaseTier.levels?.length ? (
            <section className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/8 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Sub-bot ladder</p>
                  <h3 className="mt-1 text-lg font-black">Choose the {selectedBaseTier.name} level</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">The personality stays the same while calculation, mistake rate, depth, and rating scale up.</p>
                </div>
                <span className="chip">Arcade profile · not an official engine build</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {selectedBaseTier.levels.map((level) => {
                  const active = botLevelId === level.id;
                  return (
                    <button key={level.id} type="button" onClick={() => setBotLevelId(level.id)} aria-pressed={active} className={`rounded-xl border p-3 text-left transition ${active ? "border-[var(--accent)] bg-[var(--bg-elev-2)] shadow-[0_0_0_1px_var(--accent)]" : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]"}`}>
                      <span className="block text-sm font-black">{level.label}</span>
                      <span className="mt-1 block text-xs font-bold text-[var(--accent)]">{level.elo} rating</span>
                      <span className="mt-1 block text-[0.68rem] text-[var(--text-faint)]">Depth {level.depth} · skill {level.skill}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {(tierId === "sam" || tierId === "samcore") && (
            <section className={`rounded-2xl border p-4 sm:p-5 ${tierId === "samcore" ? "border-[#9b7cff]/35 bg-[#9b7cff]/8" : "border-[#52d6c8]/35 bg-[#52d6c8]/8"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${tierId === "samcore" ? "text-[#bda8ff]" : "text-[#52d6c8]"}`}>{tierId === "samcore" ? "Built from the ground up" : "Engine controls"}</p>
                  <h3 className="mt-1 text-lg font-black">Tune {selectedTier.fullName}</h3>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">{tierId === "samcore" ? "No Stockfish move selection. X1 now runs principal-variation search, late-move reductions, check extensions, a wider opening book, deeper positional evaluation, and a 1–10 depth scale." : "Sam defaults to depth 26 and supports depth 40. Searches above 30 can take substantially longer, especially on phones."}</p>
                </div>
                <a href="/play/engine-lab" className="btn !py-2 text-xs">Open any-bot arena →</a>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1 flex items-center justify-between text-xs font-bold"><span>Search depth</span><span className={tierId === "samcore" ? "text-[#bda8ff]" : "text-[#52d6c8]"}>{engineDepth}</span></span><input type="range" min={tierId === "samcore" ? 1 : 4} max={selectedTier.maxDepth ?? 40} step={1} value={engineDepth} onChange={(event) => setEngineDepth(Number(event.target.value))} className={`w-full ${tierId === "samcore" ? "accent-[#9b7cff]" : "accent-[#52d6c8]"}`} /></label>
                <label className="block"><span className="mb-1 flex items-center justify-between text-xs font-bold"><span>Skill level</span><span className={tierId === "samcore" ? "text-[#bda8ff]" : "text-[#52d6c8]"}>{engineSkill} / 20</span></span><input type="range" min={0} max={20} step={1} value={engineSkill} onChange={(event) => setEngineSkill(Number(event.target.value))} className={`w-full ${tierId === "samcore" ? "accent-[#9b7cff]" : "accent-[#52d6c8]"}`} /></label>
                <label className="block"><span className="label mb-1 block">Playing style</span><select value={enginePersonality} onChange={(event) => setEnginePersonality(event.target.value as BotPersonality)} className="input w-full !py-2 text-sm"><option value="normal">Precision</option><option value="aggressive">Aggressive</option><option value="passive">Positional</option></select></label>
                <label className="block"><span className="label mb-1 block">Candidate lines</span><select value={engineMultipv} onChange={(event) => setEngineMultipv(Number(event.target.value))} className="input w-full !py-2 text-sm"><option value={1}>1 · strongest move only</option><option value={2}>2 · style choice</option><option value={3}>3 · wider choice</option><option value={5}>5 · experimental</option></select></label>
              </div>
            </section>
          )}
        </div>
      </section>

      <section className="panel mt-4 p-4">
        <span className="label mb-3 block">Play as</span>
        <div className="flex gap-2">
          {([
            { id: "w", label: "White" },
            { id: "random", label: "Random" },
            { id: "b", label: "Black" },
          ] as const).map((opt) => {
            const active = colorChoice === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setColorChoice(opt.id)}
                className="flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--bg-elev-2)" : "transparent",
                }}
              >
                <span style={{ width: 34, height: 34 }}>
                  {opt.id === "random" ? (
                    <span className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--text-muted)]">
                      ?
                    </span>
                  ) : (
                    <Piece type="k" color={opt.id} set="monarch" size={34} />
                  )}
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel mt-4 p-4">
        <span className="label mb-3 block">Time control</span>
        <div className="flex flex-col gap-3">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-xs capitalize text-[var(--text-faint)]">{cat}</span>
              {list.map((tc) => {
                const active = tcId === tc.id;
                return (
                  <button
                    key={tc.id}
                    onClick={() => setTcId(tc.id)}
                    className="rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active ? "var(--bg-elev-2)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {tc.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <button
            onClick={() => applyCustom(customMinutes, customIncrement)}
            className="mb-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: isCustom ? "var(--accent)" : "var(--border)",
              background: isCustom ? "var(--bg-elev-2)" : "transparent",
              color: isCustom ? "var(--text)" : "var(--text-muted)",
            }}
          >
            Custom
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              Minutes
              <input
                type="number"
                min={0.25}
                max={180}
                step={0.25}
                value={customMinutes}
                onChange={(e) => applyCustom(Number(e.target.value), customIncrement)}
                className="input !w-20 !py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              Increment/delay (sec)
              <input
                type="number"
                min={0}
                max={60}
                step={1}
                value={customIncrement}
                onChange={(e) => applyCustom(customMinutes, Number(e.target.value))}
                className="input !w-20 !py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              Mode
              <select
                className="input !w-auto !py-1 text-xs"
                value={delayMode}
                onChange={(e) => applyCustom(customMinutes, customIncrement, e.target.value as DelayMode)}
              >
                <option value="increment">Fischer increment</option>
                <option value="us">US delay</option>
                <option value="bronstein">Bronstein delay</option>
              </select>
            </label>
            {isCustom && <span className="chip !px-2 !py-0.5 text-xs">{getTimeControl(tcId).name}</span>}
          </div>
        </div>
      </section>

      <section className="panel mt-4 p-4">
        <span className="label mb-3 block">Handicap (odds)</span>
        <div className="flex flex-wrap gap-2">
          {ODDS_OPTIONS.map((o) => {
            const active = oddsId === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setOddsId(o.id)}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--bg-elev-2)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {oddsId !== "none" && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">The bot starts without its {ODDS_OPTIONS.find((o) => o.id === oddsId)?.label.toLowerCase()}.</p>
        )}
      </section>

      <label className="mt-4 flex cursor-pointer items-center justify-between px-1">
        <span className="text-sm">Show evaluation bar</span>
        <input
          type="checkbox"
          checked={showEval}
          onChange={(e) => setShowEval(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </label>

      <button className="btn btn-primary btn-cta mt-6 w-full" onClick={start}>
        Play {selectedTier.name}
      </button>

      <a href="/play/variants" className="btn mt-3 w-full">🐉 Open Chess960 &amp; Variant Workshop</a>

      {showRules && <ChessRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
