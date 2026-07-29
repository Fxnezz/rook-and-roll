import type { Metadata } from "next";
import { WorldCup7Game } from "@/components/world-cup/WorldCup7Game";

export const metadata: Metadata = {
  title: "World Cup 7-0",
  description: "Draft an all-time international XI and play a complete 32-nation World Cup from the group stage through the final.",
};

export default function WorldCupSevenAndZeroPage() {
  return <WorldCup7Game />;
}
