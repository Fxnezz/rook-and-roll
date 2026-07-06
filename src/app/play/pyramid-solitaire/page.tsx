import { PyramidSolitaireGame } from "@/components/arcade/PyramidSolitaireGame";

export const metadata = { title: "Pyramid Solitaire" };

export default function PyramidSolitairePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Pyramid Solitaire</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Pair up exposed cards that sum to 13 — Kings clear on their own — to empty the pyramid.
      </p>
      <PyramidSolitaireGame />
    </div>
  );
}
