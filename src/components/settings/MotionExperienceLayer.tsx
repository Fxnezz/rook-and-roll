"use client";

import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/chess/useSettings";

/**
 * Decorative, pointer-free motion shared by every route. The keyed route pulse
 * remounts after navigation, while preference data attributes style the effect.
 */
export function MotionExperienceLayer() {
  const pathname = usePathname();
  const { settings, ready } = useSettings();

  if (!ready || settings.reduceMotion) return null;

  return (
    <>
      {settings.ambientMotion && (
        <div className="motion-ambient-layer" aria-hidden="true">
          <span className="motion-ambient-orb motion-ambient-orb-one" />
          <span className="motion-ambient-orb motion-ambient-orb-two" />
          {settings.motionProfile === "arcade" && <span className="motion-ambient-grid" />}
        </div>
      )}
      {settings.pageTransition !== "none" && (
        <div
          key={pathname}
          className={`motion-route-pulse motion-route-${settings.pageTransition}`}
          aria-hidden="true"
        />
      )}
    </>
  );
}
