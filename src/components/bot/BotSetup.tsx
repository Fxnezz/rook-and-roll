"use client";

import { useEffect, useMemo, useState } from "react";
import type { Color } from "chess.js";
import { BOT_TIERS, type BotTierId } from "@/lib/engine/bots";
import { BotAvatar } from "@/components/bot/BotAvatar";
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

const CUSTOM_TC_STORAGE_KEY = "rr.customTimeControl.v1";

export interface BotConfig {
  tierId: BotTierId;
  color: Color; // human's colour
  timeControlId: string;
  showEval: boolean;
  /** Non-standard starting position — handicap odds (or a deep-linked custom FEN) apply this instead of the normal start. */
  startFen?: string;
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
    const startFen = oddsStartFen(botColor, oddsId) ?? undefined;
    onStart({ tierId, color, timeControlId: tcId, showEval, startFen });
  };

  const grouped: Record<string, TimeControl[]> = {};
  for (const tc of TIME_CONTROLS) (grouped[tc.category] ??= []).push(tc);

  const selectedTier = BOT_TIERS.find((t) => t.id === tierId) ?? BOT_TIERS[4];

  const DIFFICULTY_GROUPS: { label: string; ids: BotTierId[] }[] = [
    { label: "Beginner", ids: ["pip", "milo", "nell"] },
    { label: "Intermediate", ids: ["beau", "cass", "rosa", "wren"] },
    { label: "Advanced", ids: ["dex", "ilsa", "vera", "zephyr"] },
    { label: "Master", ids: ["titan", "omen"] },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
          <IconRobot width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">Play a bot</h1>
          <p className="text-sm text-[var(--text-muted)]">Powered by Stockfish, tuned per level</p>
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

      <section className="panel p-4">
        <span className="label mb-3 block">Choose your opponent</span>

        {/* Spotlight card — the currently selected bot, chess.com-style. */}
        <div
          className="mb-4 flex items-center gap-4 rounded-xl p-4"
          style={{ background: "var(--bg-elev)", border: `1px solid ${selectedTier.accent}44` }}
        >
          <BotAvatar tierId={selectedTier.id} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black">
                {selectedTier.flag} {selectedTier.fullName}
              </span>
              <span className="chip !px-1.5 !py-0.5 text-[10px]">{selectedTier.elo}</span>
              <span className="chip !px-1.5 !py-0.5 text-[10px] capitalize">{selectedTier.personality}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedTier.blurb}</p>
          </div>
        </div>

        {DIFFICULTY_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
              {group.label}
            </span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {group.ids.map((id) => {
                const t = BOT_TIERS.find((bt) => bt.id === id);
                if (!t) return null;
                const active = tierId === t.id;
                const recommended = recommendedTierId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTierId(t.id)}
                    className="relative flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors"
                    style={{
                      borderColor: active ? "var(--accent)" : recommended ? "var(--accent)" : "var(--border)",
                      background: active ? "var(--bg-elev-2)" : "transparent",
                      boxShadow: recommended && !active ? "0 0 0 1px var(--accent)" : undefined,
                    }}
                    title={t.blurb}
                  >
                    {recommended && (
                      <span
                        className="absolute -top-2 right-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                      >
                        Rec.
                      </span>
                    )}
                    <BotAvatar tierId={t.id} size={44} />
                    <span className="truncate text-xs font-bold leading-tight">{t.name}</span>
                    <span className="text-[10px] text-[var(--text-faint)]">{t.elo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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

      <button className="btn btn-primary mt-5 w-full !py-3 text-base" onClick={start}>
        Start game
      </button>

      {showRules && <ChessRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
