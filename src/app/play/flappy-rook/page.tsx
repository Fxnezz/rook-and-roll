import { FlappyRookGame } from "@/components/arcade/FlappyRookGame";

export const metadata = { title: "Flappy Rook" };

export default function FlappyRookPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Flappy Rook</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Flap through the gaps without hitting a pillar, the floor, or the ceiling.</p>
      <FlappyRookGame />
    </div>
  );
}
