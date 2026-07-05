import { SimonGame } from "@/components/arcade/SimonGame";

export const metadata = { title: "Simon" };

export default function SimonPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Simon</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Repeat the growing sequence of colors and sounds.</p>
      <SimonGame />
    </div>
  );
}
