import { EngineArena } from "@/components/bot/EngineArena";

export const metadata = {
  title: "Engine Arena",
  description: "Run any arcade bot against any other bot with independent search depth, skill, style, and position controls.",
};

export default function EngineLabPage() {
  return <EngineArena />;
}
