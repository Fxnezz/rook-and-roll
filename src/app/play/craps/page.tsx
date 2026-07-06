import { CrapsGame } from "@/components/arcade/CrapsGame";

export const metadata = { title: "Craps" };

export default function CrapsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Craps</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Pass Line bet — 7 or 11 wins on the come-out, 2/3/12 lose, anything else sets the point.
      </p>
      <CrapsGame />
    </div>
  );
}
