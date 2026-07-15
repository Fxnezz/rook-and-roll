"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/chess/useSettings";
import { AdminGate } from "@/components/admin/AdminGate";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { SoundFlashOverlay } from "@/components/ui/SoundFlashOverlay";
import { HighScoreCelebration } from "@/components/ui/HighScoreCelebration";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { BackToTop } from "@/components/ui/BackToTop";
import { WhatsNewBanner } from "@/components/ui/WhatsNewBanner";
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
        <HighScoreCelebration />
        <CommandPalette />
        <BackToTop />
        <WhatsNewBanner />
        <WeeklyRecapTrigger />
      </SettingsProvider>
    </SessionProvider>
  );
}
