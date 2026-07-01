"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Logo size={44} />
      <h1 className="mt-5 text-2xl font-extrabold">Something broke</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        An unexpected error interrupted the game. Your settings and puzzle progress are safe.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">ref: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-2">
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <a href="/" className="btn">
          Home
        </a>
      </div>
    </div>
  );
}
