"use client";

import { useEffect, useRef } from "react";

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog a11y in one place: Escape closes, Tab is trapped inside the panel,
 * focus moves into the panel on open and returns to whatever triggered it on
 * close. Attach the returned ref to the panel element (give it `tabIndex={-1}`
 * as a fallback focus target if it might have no focusable children).
 *
 * `open` defaults to true for panels that are only ever mounted while shown
 * (e.g. conditionally-rendered modals) — pass it explicitly for components
 * like SlideOver that stay mounted and toggle visibility instead.
 *
 * `trapTab` defaults to true. Set it false for non-blocking floating panels
 * (no backdrop, rest of the page stays interactive behind them) — Tab should
 * still be able to leave a panel like that; only true modals should trap it.
 */
export function useFocusTrap<T extends HTMLElement>(
  onClose: () => void,
  opts?: { open?: boolean; lockBodyScroll?: boolean; trapTab?: boolean },
) {
  const open = opts?.open ?? true;
  const lockBodyScroll = opts?.lockBodyScroll ?? false;
  const trapTab = opts?.trapTab ?? true;
  const panelRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (!trapTab || e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    if (lockBodyScroll) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (lockBodyScroll) document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, lockBodyScroll, trapTab]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable ?? panel)?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return panelRef;
}
