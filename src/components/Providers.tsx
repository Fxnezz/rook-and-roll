"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/chess/useSettings";
import { AdminGate } from "@/components/admin/AdminGate";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { SoundFlashOverlay } from "@/components/ui/SoundFlashOverlay";
import { useWeeklyRecap } from "@/lib/hooks/useWeeklyRecap";

function WeeklyRecapTrigger() {
  useWeeklyRecap();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ImpersonationBanner />
        {children}
        <AdminGate />
        <InstallPrompt />
        <SoundFlashOverlay />
        <WeeklyRecapTrigger />
      </SettingsProvider>
    </SessionProvider>
  );
}
