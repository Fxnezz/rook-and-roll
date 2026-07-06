import { WordSearchGame } from "@/components/arcade/WordSearchGame";

export const metadata = { title: "Word Search" };

export default function WordSearchPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Word Search</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Click the first and last letter of a hidden word to find it — words can run in any of 8 directions.
      </p>
      <WordSearchGame />
    </div>
  );
}
