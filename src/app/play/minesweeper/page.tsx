import { MinesweeperGame } from "@/components/arcade/MinesweeperGame";

export const metadata = { title: "Minesweeper" };

export default function MinesweeperPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Minesweeper</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Clear the board without hitting a mine. First click is always safe.</p>
      <MinesweeperGame />
    </div>
  );
}
