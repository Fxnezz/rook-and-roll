import type { Metadata } from "next";
import { Football38Game } from "@/components/football/Football38Game";

export const metadata: Metadata = {
  title: "Football 38-0",
  description: "Draft an all-time football XI, simulate all 38 league matches and chase a perfect season plus the knockout cup.",
};

export default function FootballThirtyEightAndZeroPage() {
  return <Football38Game />;
}
