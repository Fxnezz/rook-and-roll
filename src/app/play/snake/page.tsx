import { SnakeGame } from "@/components/arcade/SnakeGame";

export const metadata = { title: "Snake" };

export default function SnakePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Snake</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Classic grid snake. Eat, grow, don&apos;t hit yourself.</p>
      <SnakeGame />
    </div>
  );
}
