import type { HeatmapDay } from "@/lib/db/profileStats";

function levelColor(count: number): string {
  if (count <= 0) return "var(--bg-elev-2)";
  if (count === 1) return "color-mix(in srgb, var(--accent) 35%, var(--bg-elev-2))";
  if (count === 2) return "color-mix(in srgb, var(--accent) 60%, var(--bg-elev-2))";
  if (count <= 4) return "color-mix(in srgb, var(--accent) 85%, var(--bg-elev-2))";
  return "var(--accent)";
}

export function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) return null;

  const firstDate = new Date(days[0].date + "T00:00:00");
  const leadPad = firstDate.getDay(); // 0 = Sunday
  const cells: (HeatmapDay | null)[] = [...Array(leadPad).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalGames = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <section className="panel mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label block">Activity</span>
        <span className="text-xs text-[var(--text-faint)]">
          {totalGames} games · {activeDays} active days (last 90 days)
        </span>
      </div>
      <div
        className="grid w-fit gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gridAutoColumns: "10px" }}
      >
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={cell.date}
              className="rounded-[2px]"
              style={{ background: levelColor(cell.count) }}
              title={`${cell.date}: ${cell.count} game${cell.count === 1 ? "" : "s"}`}
            />
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
    </section>
  );
}
