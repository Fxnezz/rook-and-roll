"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "rr.pwa.installDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bottom-of-screen "Add to home screen" banner. Only Chrome/Edge/Android
 * fire `beforeinstallprompt` — Safari/iOS has no equivalent event, so the
 * banner simply never appears there, which is expected.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => {
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!deferred || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Install Sam's Arcade"
      className="fixed inset-x-0 bottom-0 z-[80] flex items-center justify-center gap-3 border-t border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm shadow-[0_-8px_24px_rgba(0,0,0,0.35)] sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-fit sm:-translate-x-1/2 sm:rounded-xl sm:border"
    >
      <span className="text-[var(--text-muted)]">Install Sam&apos;s Arcade for faster, full-screen access.</span>
      <span className="flex shrink-0 items-center gap-2">
        <button className="btn btn-primary !py-1.5" onClick={install}>
          Install
        </button>
        <button className="btn btn-ghost !py-1.5" onClick={dismiss} aria-label="Dismiss install prompt">
          Not now
        </button>
      </span>
    </div>
  );
}
