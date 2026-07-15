"use client";

import { useEffect, useState } from "react";

/** Purely cosmetic "3, 2, 1, Go!" flourish shown once over the board right as
 * a game begins — the clock and engine are already running underneath it,
 * so it never delays or gates any actual game logic. */
export function GameStartCountdown() {
  const [step, setStep] = useState(0); // 0=3 1=2 2=1 3=Go 4=done
  useEffect(() => {
    if (step >= 4) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 3 ? 400 : 500);
    return () => clearTimeout(t);
  }, [step]);

  if (step >= 4) return null;
  const label = ["3", "2", "1", "Go!"][step];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-hidden="true">
      <span key={step} className="animate-pop text-6xl font-black text-white drop-shadow-lg">
        {label}
      </span>
    </div>
  );
}
