import { YahtzeeGame } from "@/components/arcade/YahtzeeGame";

export const metadata = { title: "Yahtzee" };

export default function YahtzeePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Yahtzee</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Roll five dice up to three times each round, then lock in a category.</p>
      <YahtzeeGame />
    </div>
  );
}
