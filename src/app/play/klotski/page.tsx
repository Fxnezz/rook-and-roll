import { KlotskiGame } from "@/components/arcade/KlotskiGame";

export const metadata = { title: "Klotski" };

export default function KlotskiPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Klotski</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        The classic sliding-block puzzle — free the big gold block to the exit at the bottom.
      </p>
      <KlotskiGame />
    </div>
  );
}
