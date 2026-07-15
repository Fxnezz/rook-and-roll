"use client";

import { useState } from "react";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements/catalog";
import { IconDownload } from "@/components/ui/icons";

type Filter = "all" | "earned" | "locked" | AchievementDef["category"];

const CARD = 96;
const COLS = 6;
const PAD = 16;

/** Draws a shareable image-sheet of earned achievements — one emoji + name tile per row/col, chess.com-style. */
function renderAchievementsSheet(username: string, earned: AchievementDef[]): HTMLCanvasElement {
  const rows = Math.ceil(earned.length / COLS) || 1;
  const width = COLS * CARD + PAD * 2;
  const height = rows * CARD + PAD * 2 + 60;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1c2029";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f6f1e6";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${username}'s achievements (${earned.length}/${ACHIEVEMENTS.length})`, PAD, 32);

  earned.forEach((a, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * CARD;
    const y = 50 + row * CARD;
    ctx.fillStyle = "#2a2f3d";
    ctx.fillRect(x + 4, y + 4, CARD - 8, CARD - 8);
    ctx.font = "36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(a.icon, x + CARD / 2, y + 44);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#c7cfdd";
    ctx.fillText(a.name, x + CARD / 2, y + CARD - 12, CARD - 12);
  });

  ctx.textAlign = "left";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#5a6273";
  ctx.fillText("Rook & Roll", PAD, height - 12);
  return canvas;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "locked", label: "Locked" },
  { id: "milestone", label: "Milestone" },
  { id: "streak", label: "Streak" },
  { id: "special", label: "Special" },
];

export function AchievementsSection({
  earned,
  rarity,
  username,
}: {
  earned: { achievementId: string; earnedAt: Date }[];
  rarity: Map<string, number>;
  username: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const earnedMap = new Map(earned.map((e) => [e.achievementId, e.earnedAt]));
  const pct = ACHIEVEMENTS.length > 0 ? Math.round((earned.length / ACHIEVEMENTS.length) * 100) : 0;

  const downloadSheet = () => {
    const earnedDefs = ACHIEVEMENTS.filter((a) => earnedMap.has(a.id));
    const canvas = renderAchievementsSheet(username, earnedDefs);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-achievements.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const visible = ACHIEVEMENTS.filter((a) => {
    const isEarned = earnedMap.has(a.id);
    if (filter === "all") return true;
    if (filter === "earned") return isEarned;
    if (filter === "locked") return !isEarned;
    return a.category === filter;
  });

  return (
    <section className="mt-8">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="label">
          Achievements ({earned.length}/{ACHIEVEMENTS.length})
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">{pct}%</span>
          {earned.length > 0 && (
            <button
              onClick={downloadSheet}
              className="hover-lift flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-faint)] hover:text-[var(--text)]"
              title="Download an image of your earned achievements"
            >
              <IconDownload width={12} height={12} /> Export
            </button>
          )}
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip !px-2.5 !py-1 text-xs transition-colors ${filter === f.id ? "!bg-[var(--accent)] !text-[var(--accent-contrast)]" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-faint)]">No achievements match this filter.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((a) => {
            const earnedAt = earnedMap.get(a.id);
            const isEarned = Boolean(earnedAt);
            const r = rarity.get(a.id) ?? 0;
            return (
              <div
                key={a.id}
                className="panel flex flex-col items-center gap-1.5 p-3 text-center"
                style={{ opacity: isEarned ? 1 : 0.4 }}
                title={`${isEarned ? `Earned ${earnedAt!.toLocaleDateString()}` : "Not yet earned"} · ${r}% of players have this`}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-semibold">{a.name}</span>
                <span className="text-[0.65rem] text-[var(--text-faint)]">{a.description}</span>
                <span className="text-[0.6rem] font-semibold text-[var(--text-faint)]">{r}% of players</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
