"use client";

import type { ReactNode } from "react";
import { SettingsProvider } from "@/lib/chess/useSettings";

export function Providers({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
