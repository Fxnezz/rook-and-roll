import { HanoiGame } from "@/components/arcade/HanoiGame";

export const metadata = { title: "Tower of Hanoi" };

export default function HanoiPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Tower of Hanoi</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Move the whole stack to the last peg — never place a bigger disk on a smaller one.
      </p>
      <HanoiGame />
    </div>
  );
}
