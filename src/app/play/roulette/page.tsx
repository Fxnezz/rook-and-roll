import { RouletteGame } from "@/components/arcade/RouletteGame";

export const metadata = { title: "Roulette" };

export default function RoulettePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Roulette</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        European single-zero wheel — place your bets, then spin.
      </p>
      <RouletteGame />
    </div>
  );
}
