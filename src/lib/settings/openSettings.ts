export type SettingsTab = "motion" | "qol" | "board" | "sound" | "gameplay" | "accessibility" | "moderation" | "data";

export const OPEN_SETTINGS_EVENT = "sams-arcade:open-settings";

export function openSettingsPanel(tab: SettingsTab = "motion") {
  window.dispatchEvent(new CustomEvent<SettingsTab>(OPEN_SETTINGS_EVENT, { detail: tab }));
}
