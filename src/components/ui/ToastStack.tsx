"use client";

import type { Toast } from "@/lib/hooks/useToasts";
import { useSettings } from "@/lib/chess/useSettings";

const POSITION_CLASSES: Record<string, string> = {
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
  "top-right": "top-4 right-4",
};

export function ToastStack({ toasts, onClear }: { toasts: Toast[]; onClear?: () => void }) {
  const { settings } = useSettings();
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-[95] flex flex-col items-center gap-2 ${POSITION_CLASSES[settings.toastPosition]}`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-pop pointer-events-none rounded-full border border-[var(--border-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold shadow-lg"
        >
          {t.text}
        </div>
      ))}
      {onClear && toasts.length > 1 && (
        <button
          className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--text-muted)]"
          onClick={onClear}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
