import { TetrisGame } from "@/components/arcade/TetrisGame";

export const metadata = { title: "Tetris" };

export default function TetrisPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Tetris</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">7-bag randomizer, hold, next preview, and a rising level curve.</p>
      <TetrisGame />
    </div>
  );
}
