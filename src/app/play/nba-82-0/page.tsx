import type { Metadata } from "next";
import { Nba82Game } from "@/components/nba/Nba82Game";

export const metadata: Metadata = {
  title: "NBA 82-0",
  description: "Draft an all-time basketball starting five, simulate an 82-game season, and chase a championship through the Play-In and playoffs.",
};

export default function NbaEightyTwoAndZeroPage() {
  return <Nba82Game />;
}
