"use client";

import { useState } from "react";
import { RatingChart } from "@/components/charts/RatingChart";

type Cat = "bullet" | "blitz" | "rapid" | "classical" | "puzzle";

const CATS: { id: Cat; label: string }[] = [
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" },
  { id: "puzzle", label: "Puzzles" },
];

export function ProfileRatings({
  ratings,
  history,
}: {
  ratings: Record<Cat, number>;
  history: { category: string; rating: number }[];
}) {
  const [cat, setCat] = useState<Cat>("blitz");
  const series = history
    .filter((h) => h.category === cat)
    .map((h) => ({ rating: h.rating }));
  // seed the line with the default starting rating for context
  const seeded = series.length ? [{ rating: cat === "puzzle" ? 1000 : 1200 }, ...series] : series;

  return (
    <div className="panel mt-6 p-4">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CATS.map((c) => {
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="rounded-lg border p-2 text-center transition-colors"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--bg-elev-2)" : "transparent",
              }}
            >
              <div className="text-lg font-black">{ratings[c.id]}</div>
              <div className="label">{c.label}</div>
            </button>
          );
        })}
      </div>
      <RatingChart points={seeded} />
    </div>
  );
}
