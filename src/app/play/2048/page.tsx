import { Game2048 } from "@/components/arcade/Game2048";

export const metadata = { title: "2048" };

export default function Game2048Page() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">2048</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Merge tiles to reach 2048 — and keep going if you want more.</p>
      <Game2048 />
    </div>
  );
}
