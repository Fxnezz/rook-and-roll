import { FifteenPuzzleGame } from "@/components/arcade/FifteenPuzzleGame";

export const metadata = { title: "15 Puzzle" };

export default function FifteenPuzzlePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">15 Puzzle</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Slide tiles into the blank space to put them back in order.</p>
      <FifteenPuzzleGame />
    </div>
  );
}
