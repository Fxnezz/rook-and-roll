"use client";

import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/chess/useSettings";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  "--particle-x": `${(index * 37 + 11) % 100}%`,
  "--particle-y": `${(index * 53 + 17) % 100}%`,
  "--particle-delay": `${(index % 9) * -1.4}s`,
  "--particle-duration": `${12 + (index % 7) * 2}s`,
  "--particle-size": `${2 + (index % 3)}px`,
} as CSSProperties));

function resetTilt(element: HTMLElement | null) {
  if (!element) return;
  element.removeAttribute("data-motion-tilt-active");
  element.style.removeProperty("--tilt-x");
  element.style.removeProperty("--tilt-y");
  element.style.removeProperty("--tilt-light-x");
  element.style.removeProperty("--tilt-light-y");
}

/** Player-controlled visual engine shared by every route. */
export function MotionExperienceLayer() {
  const pathname = usePathname();
  const { settings, ready } = useSettings();
  const isPerformanceIsolated = pathname === "/play/afl-23-0";

  useEffect(() => {
    if (isPerformanceIsolated || !ready || settings.reduceMotion || settings.minimalMode || (!settings.cursorGlow && !settings.cardTilt)) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    let frame = 0;
    let tiltTarget: HTMLElement | null = null;

    const updatePointer = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--motion-pointer-x", `${event.clientX}px`);
        root.style.setProperty("--motion-pointer-y", `${event.clientY}px`);

        if (!settings.cardTilt) return;
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>(".panel, .settings-surface, .motion-card")
          : null;
        if (target !== tiltTarget) {
          resetTilt(tiltTarget);
          tiltTarget = target;
        }
        if (!target) return;

        const bounds = target.getBoundingClientRect();
        if (bounds.width < 100 || bounds.height < 60) return;
        const localX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const localY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        target.dataset.motionTiltActive = "true";
        target.style.setProperty("--tilt-x", `${((0.5 - localY) * 3.5).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${((localX - 0.5) * 4.5).toFixed(2)}deg`);
        target.style.setProperty("--tilt-light-x", `${(localX * 100).toFixed(1)}%`);
        target.style.setProperty("--tilt-light-y", `${(localY * 100).toFixed(1)}%`);
      });
    };

    const clearPointer = () => {
      cancelAnimationFrame(frame);
      resetTilt(tiltTarget);
      tiltTarget = null;
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", clearPointer);
    return () => {
      window.removeEventListener("pointermove", updatePointer);
      document.documentElement.removeEventListener("pointerleave", clearPointer);
      clearPointer();
      root.style.removeProperty("--motion-pointer-x");
      root.style.removeProperty("--motion-pointer-y");
    };
  }, [isPerformanceIsolated, ready, settings.cardTilt, settings.cursorGlow, settings.minimalMode, settings.reduceMotion]);

  useEffect(() => {
    if (isPerformanceIsolated || !ready || settings.reduceMotion || settings.minimalMode || !settings.scrollReveal) return;

    let observer: IntersectionObserver | null = null;
    const frame = requestAnimationFrame(() => {
      const elements = document.querySelectorAll<HTMLElement>(
        "main .panel, main .settings-surface, main [data-motion-reveal]",
      );
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("motion-reveal-visible");
          observer?.unobserve(entry.target);
        }
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

      elements.forEach((element, index) => {
        element.classList.add("motion-reveal-ready");
        element.style.setProperty("--reveal-order", String(index % 6));
        observer?.observe(element);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [isPerformanceIsolated, pathname, ready, settings.minimalMode, settings.reduceMotion, settings.scrollReveal]);

  if (isPerformanceIsolated || !ready || settings.reduceMotion || settings.minimalMode) return null;

  return (
    <>
      {settings.ambientMotion && (
        <div className={`motion-ambient-layer motion-scene-${settings.ambientScene}`} aria-hidden="true">
          <span className="motion-ambient-orb motion-ambient-orb-one" />
          <span className="motion-ambient-orb motion-ambient-orb-two" />
          <span className="motion-ambient-orb motion-ambient-orb-three" />
          <span className="motion-ambient-beam motion-ambient-beam-one" />
          <span className="motion-ambient-beam motion-ambient-beam-two" />
          <span className="motion-ambient-texture" />
          <span className="motion-ambient-vignette" />
          <span className="motion-ambient-grain" />
          <span className="motion-particle-field">
            {PARTICLES.map((style, index) => <i key={index} style={style} />)}
          </span>
        </div>
      )}
      {settings.cursorGlow && <span className="motion-cursor-aura" aria-hidden="true" />}
      {settings.pageTransition !== "none" && (
        <div key={pathname} className={`motion-route-pulse motion-route-${settings.pageTransition}`} aria-hidden="true">
          <span className="motion-route-mark">♜</span>
          <span className="motion-route-line" />
        </div>
      )}
    </>
  );
}
