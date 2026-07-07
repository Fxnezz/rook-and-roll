"use client";

import type { Toast } from "@/lib/hooks/useToasts";

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[95] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-pop rounded-full border border-[var(--border-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold shadow-lg"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
