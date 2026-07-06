import { AsteroidsGame } from "@/components/arcade/AsteroidsGame";

export const metadata = { title: "Asteroids" };

export default function AsteroidsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Asteroids</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Rotate, thrust, and shoot — smaller asteroids are worth more but harder to hit.
      </p>
      <AsteroidsGame />
    </div>
  );
}
