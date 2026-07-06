import { FreeCellGame } from "@/components/arcade/FreeCellGame";

export const metadata = { title: "FreeCell" };

export default function FreeCellPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">FreeCell</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        All 52 cards dealt face-up. Use the 4 free cells as scratch space — almost every deal is solvable.
      </p>
      <FreeCellGame />
    </div>
  );
}
