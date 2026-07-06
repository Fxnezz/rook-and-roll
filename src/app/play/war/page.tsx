import { WarGame } from "@/components/arcade/WarGame";

export const metadata = { title: "War" };

export default function WarPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">War</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        No decisions, just nerve — flip your top card each round, higher card takes the pile. Ties mean war.
      </p>
      <WarGame />
    </div>
  );
}
