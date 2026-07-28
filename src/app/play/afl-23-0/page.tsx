import type { Metadata } from "next";
import { Afl23Game } from "@/components/afl/Afl23Game";

export const metadata: Metadata = {
  title: "AFL 23-0",
  description: "Draft an all-time Australian football side, chase a perfect 23-0 season, and survive the 2026 finals series.",
};

export default function AflTwentyThreeAndZeroPage() {
  return <Afl23Game />;
}
