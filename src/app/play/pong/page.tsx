import { PongGame } from "@/components/arcade/PongGame";

export const metadata = { title: "Pong" };

export default function PongPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Pong</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">The original arcade classic — first to 7 points wins.</p>
      <PongGame />
    </div>
  );
}
