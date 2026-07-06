import { PegSolitaireGame } from "@/components/arcade/PegSolitaireGame";

export const metadata = { title: "Peg Solitaire" };

export default function PegSolitairePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Peg Solitaire</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Jump pegs over each other to remove them — try to finish with just one peg left.
      </p>
      <PegSolitaireGame />
    </div>
  );
}
