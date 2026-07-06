import { SpaceInvadersGame } from "@/components/arcade/SpaceInvadersGame";

export const metadata = { title: "Space Invaders" };

export default function SpaceInvadersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Space Invaders</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Clear each descending wave of aliens before they reach you or shoot you down.
      </p>
      <SpaceInvadersGame />
    </div>
  );
}
