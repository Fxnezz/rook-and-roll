import { LightsOutGame } from "@/components/arcade/LightsOutGame";

export const metadata = { title: "Lights Out" };

export default function LightsOutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Lights Out</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Pressing a light toggles it and its neighbors — turn every light off to win.
      </p>
      <LightsOutGame />
    </div>
  );
}
