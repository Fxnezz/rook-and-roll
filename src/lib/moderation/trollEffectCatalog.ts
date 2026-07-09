import type { TrollEffectType } from "@/lib/online/protocol";

/**
 * Shared catalog of every troll/cosmetic effect, used by both the in-game
 * moderator's ModPanel (flagged online games) and the bot page's CheatPanel
 * (self-inflicted, no gating beyond the existing cheat account). Extended
 * one entry at a time as new effects are added.
 */
export const TROLL_EFFECTS: { type: TrollEffectType; label: string }[] = [
  { type: "wobbleBoard", label: "Wobble board" },
  { type: "rainbowSquares", label: "Rainbow squares" },
  { type: "invertColors", label: "Invert colors" },
  { type: "flipBoard", label: "Flip board" },
  { type: "reskinPieces", label: "Reskin pieces" },
  { type: "tinyBoard", label: "Tiny board" },
  { type: "giantBoard", label: "Giant board" },
  { type: "blackoutBoard", label: "Blackout" },
  { type: "fakeInCheck", label: "Fake check!" },
  { type: "fakeArrow", label: "Bogus arrow" },
  { type: "fakeLowTime", label: "Fake low time" },
  { type: "fakeLag", label: "Fake lag" },
  { type: "clockJitter", label: "Clock jitter" },
  { type: "reverseClockDigits", label: "Reverse clock" },
  { type: "systemAutoReply", label: "Fake system msg" },
  { type: "emojiBurst", label: "Emoji burst" },
  { type: "moveSoundOverride", label: "Buzzer moves" },
  { type: "screenFlash", label: "Screen flash" },
  { type: "screenShake", label: "Screen shake" },
  { type: "confetti", label: "Confetti" },
  { type: "tabTitleFlash", label: "Flash tab title" },
  { type: "watchedBanner", label: "Watched banner" },
  { type: "voiceLinePopup", label: "Voice line" },
];
