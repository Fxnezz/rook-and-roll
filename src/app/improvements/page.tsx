import type { Metadata } from "next";
import { QolLedger } from "@/components/qol/QolLedger";

export const metadata: Metadata = {
  title: "300 Improvements",
  description: "Explore every shipped Sam's Arcade quality-of-life system and supporting refinement.",
};

export default function ImprovementsPage() {
  return <QolLedger />;
}
