import { BlockPuzzleGame } from "@/components/arcade/BlockPuzzleGame";

export const metadata = { title: "Block Puzzle" };

export default function BlockPuzzlePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Block Puzzle</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Place all three pieces anywhere they fit — clear full rows, columns, or 3x3 boxes to keep going.
      </p>
      <BlockPuzzleGame />
    </div>
  );
}
