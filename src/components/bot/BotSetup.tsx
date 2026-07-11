"use client";

import { useEffect, useState } from "react";
import type { Color } from "chess.js";
import { BOT_TIERS, type BotTierId } from "@/lib/engine/bots";
import {
  TIME_CONTROLS,
  type TimeControl,
  clampCustomMinutes,
  clampCustomIncrementSec,
  customTimeControlId,
  getTimeControl,
} from "@/lib/chess/useClock";
import { Piece } from "@/lib/pieces";
import { IconRobot } from "@/components/ui/icons";

const CUSTOM_TC_STORAGE_KEY = "rr.customTimeControl.v1";

export interface BotConfig {
  tierId: BotTierId;
  color: Color; // human's colour
  timeControlId: string;
  showEval: boolean;
}

export function BotSetup({ onStart }: { onStart: (cfg: BotConfig) => void }) {
  const [tierId, setTierId] = useState<BotTierId>("cass");
  const [colorChoice, setColorChoice] = useState<"w" | "b" | "random">("w");
  const [tcId, setTcId] = useState("untimed");
  const [showEval, setShowEval] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);

  // Remember the last-used custom time control across visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { minutes?: number; increment?: number };
        if (typeof parsed.minutes === "number") setCustomMinutes(clampCustomMinutes(parsed.minutes));
        if (typeof parsed.increment === "number") setCustomIncrement(clampCustomIncrementSec(parsed.increment));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const isCustom = tcId.startsWith("custom:");

  const applyCustom = (minutes: number, increment: number) => {
    const m = clampCustomMinutes(minutes);
    const i = clampCustomIncrementSec(increment);
    setCustomMinutes(m);
    setCustomIncrement(i);
    setTcId(customTimeControlId(m, i));
    try {
      localStorage.setItem(CUSTOM_TC_STORAGE_KEY, JSON.stringify({ minutes: m, increment: i }));
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    const color: Color = colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    onStart({ tierId, color, timeControlId: tcId, showEval });
  };

  const grouped: Record<string, TimeControl[]> = {};
  for (const tc of TIME_CONTROLS) (grouped[tc.category] ??= []).push(tc);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
          <IconRobot width={22} height={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight">Play a bot</h1>
          <p className="text-sm text-[var(--text-muted)]">Powered by Stockfish, tuned per level</p>
        </div>
      </div>

      <section className="panel p-4">
        <span className="label mb-3 block">Choose your opponent</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BOT_TIERS.map((t) => {
            const active = tierId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTierId(t.id)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--bg-elev-2)" : "transparent",
                }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black"
                  style={{ background: `${t.accent}22`, color: t.accent }}
                >
                  {t.name[0]}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">{t.name}</span>
                    <span className="chip !px-1.5 !py-0.5 text-[10px]">{t.elo}</span>
                  </span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">{t.blurb}</span>
                </span>
              </button>
            );
          })}
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
              Increment (sec)
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
            {isCustom && <span className="chip !px-2 !py-0.5 text-xs">{getTimeControl(tcId).name}</span>}
          </div>
        </div>
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
    </div>
  );
}
