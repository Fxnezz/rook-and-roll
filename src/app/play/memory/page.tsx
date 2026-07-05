import { MemoryMatchGame } from "@/components/arcade/MemoryMatchGame";

export const metadata = { title: "Memory Match" };

export default function MemoryMatchPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Memory Match</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Flip two cards at a time — find every pair as fast as you can.</p>
      <MemoryMatchGame />
    </div>
  );
}
