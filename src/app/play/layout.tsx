import type { ReactNode } from "react";
import { ArcadeExperience } from "@/components/arcade/ArcadeExperience";

export default function PlayLayout({ children }: { children: ReactNode }) {
  return <ArcadeExperience>{children}</ArcadeExperience>;
}
