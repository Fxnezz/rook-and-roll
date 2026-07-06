import { FroggerGame } from "@/components/arcade/FroggerGame";

export const metadata = { title: "Frogger" };

export default function FroggerPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Frogger</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Cross the road, then ride logs across the river — fill all 5 homes to advance.
      </p>
      <FroggerGame />
    </div>
  );
}
