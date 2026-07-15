import { EngineArena } from "@/components/bot/EngineArena";

export const metadata = {
  title: "Engine Arena",
  description: "Configure Sam Engine S1 and run local bot-vs-bot chess matches.",
};

export default function EngineLabPage() {
  return <EngineArena />;
}
