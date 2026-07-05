import { BreakoutGame } from "@/components/arcade/BreakoutGame";

export const metadata = { title: "Breakout" };

export default function BreakoutPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Breakout</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Clear every brick without letting the ball fall past your paddle.</p>
      <BreakoutGame />
    </div>
  );
}
