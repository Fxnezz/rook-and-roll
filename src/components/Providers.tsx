"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/chess/useSettings";
import { AdminGate } from "@/components/admin/AdminGate";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        {children}
        <AdminGate />
      </SettingsProvider>
    </SessionProvider>
  );
}
