"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/chess/useSettings";
import { AdminGate } from "@/components/admin/AdminGate";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ImpersonationBanner />
        {children}
        <AdminGate />
      </SettingsProvider>
    </SessionProvider>
  );
}
