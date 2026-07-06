import { Match3Game } from "@/components/arcade/Match3Game";

export const metadata = { title: "Match-3" };

export default function Match3Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Match-3</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Swap adjacent gems to line up 3 or more — chain cascades for bonus points, 30 moves per game.
      </p>
      <Match3Game />
    </div>
  );
}
