import { SudokuGame } from "@/components/arcade/SudokuGame";

export const metadata = { title: "Sudoku" };

export default function SudokuPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Sudoku</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Every puzzle is generated fresh with a guaranteed unique solution.</p>
      <SudokuGame />
    </div>
  );
}
