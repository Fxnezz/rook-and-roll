import { WhackAMoleGame } from "@/components/arcade/WhackAMoleGame";

export const metadata = { title: "Whack-a-Mole" };

export default function WhackAMolePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Whack-a-Mole</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">30 seconds on the clock — whack moles the instant they pop up.</p>
      <WhackAMoleGame />
    </div>
  );
}
