import { FloodItGame } from "@/components/arcade/FloodItGame";

export const metadata = { title: "Flood-It" };

export default function FloodItPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Flood-It</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Pick a color to flood outward from the top-left corner — fill the whole board within the move limit.
      </p>
      <FloodItGame />
    </div>
  );
}
