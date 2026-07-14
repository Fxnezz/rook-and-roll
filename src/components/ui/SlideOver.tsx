"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

const subscribeToNothing = () => () => {};

export function SlideOver({
  open,
  onClose,
  title,
  children,
  side = "right",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  footer?: ReactNode;
}) {
  // Portal to <body>: the header uses backdrop-blur, and per spec any
  // ancestor with a backdrop-filter/filter/transform establishes a new
  // containing block for position:fixed descendants — without escaping via
  // a portal, this overlay collapses to the header's own height instead of
  // the viewport's.
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const asideRef = useFocusTrap<HTMLElement>(onClose, { open, lockBodyScroll: true });
  const titleId = useId();

  if (!mounted) return null;

  const closed = side === "left" ? "translateX(-100%)" : "translateX(100%)";
  const edge = side === "left" ? "left-0 border-r" : "right-0 border-l";

  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        className={`absolute top-0 flex h-full w-[min(88vw,23rem)] flex-col border-[var(--border)] bg-[var(--panel)] shadow-2xl transition-transform duration-300 ${edge}`}
        style={{ transform: open ? "translateX(0)" : closed, transitionTimingFunction: "var(--ease-smooth)" }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
          <h2 id={titleId} className="text-base font-bold tracking-tight">{title}</h2>
          <button
            className="group flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="inline-flex transition-transform duration-200 group-hover:rotate-90">
              <IconClose width={18} height={18} />
            </span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-[var(--border)]">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
