import { SokobanGame } from "@/components/arcade/SokobanGame";

export const metadata = { title: "Sokoban" };

export default function SokobanPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Sokoban</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Push every box onto a target square — you can only push, never pull.
      </p>
      <SokobanGame />
    </div>
  );
}
