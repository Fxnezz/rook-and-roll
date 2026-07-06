import { FarkleGame } from "@/components/arcade/FarkleGame";

export const metadata = { title: "Farkle" };

export default function FarklePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Farkle</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Roll six dice, bank scoring combos, and push your luck — first to 10,000 wins.
      </p>
      <FarkleGame />
    </div>
  );
}
