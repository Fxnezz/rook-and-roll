export type BoardThemeId =
  | "forest"
  | "ocean"
  | "charcoal"
  | "rosewood"
  | "walnut"
  | "marble"
  | "coral"
  | "midnight"
  | "sand"
  | "mint"
  | "deuteranopia"
  | "tritanopia";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  light: string;
  dark: string;
  /** label colour drawn on a light square (so it must contrast the light square) */
  labelOnLight: string;
  labelOnDark: string;
  /** translucent overlay for the last-move highlight */
  lastMove: string;
  /** translucent overlay for a selected square */
  selected: string;
  /** colour of legal-move dots / rings */
  hint: string;
  /** check highlight (radial) */
  check: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "forest",
    name: "Forest",
    light: "#ebecd0",
    dark: "#6f8f5a",
    labelOnLight: "#6f8f5a",
    labelOnDark: "#ebecd0",
    lastMove: "rgba(233, 199, 63, 0.45)",
    selected: "rgba(233, 199, 63, 0.55)",
    hint: "rgba(30, 40, 20, 0.32)",
    check: "rgba(229, 75, 60, 0.9)",
  },
  {
    id: "ocean",
    name: "Ocean",
    light: "#dbe7f1",
    dark: "#5a7fa6",
    labelOnLight: "#4c6d92",
    labelOnDark: "#dbe7f1",
    lastMove: "rgba(120, 200, 235, 0.5)",
    selected: "rgba(120, 200, 235, 0.6)",
    hint: "rgba(18, 40, 60, 0.3)",
    check: "rgba(229, 75, 60, 0.9)",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    light: "#b6bcc4",
    dark: "#54606e",
    labelOnLight: "#54606e",
    labelOnDark: "#cdd3da",
    lastMove: "rgba(233, 162, 59, 0.42)",
    selected: "rgba(233, 162, 59, 0.55)",
    hint: "rgba(15, 20, 28, 0.34)",
    check: "rgba(229, 75, 60, 0.92)",
  },
  {
    id: "rosewood",
    name: "Rosewood",
    light: "#efdcc0",
    dark: "#9c6b45",
    labelOnLight: "#9c6b45",
    labelOnDark: "#f2e2cb",
    lastMove: "rgba(233, 180, 63, 0.5)",
    selected: "rgba(233, 180, 63, 0.6)",
    hint: "rgba(60, 34, 15, 0.32)",
    check: "rgba(214, 60, 48, 0.92)",
  },
  {
    id: "walnut",
    name: "Walnut",
    light: "#d9c3a1",
    dark: "#6b4530",
    labelOnLight: "#6b4530",
    labelOnDark: "#e8d5b8",
    lastMove: "rgba(229, 160, 60, 0.48)",
    selected: "rgba(229, 160, 60, 0.6)",
    hint: "rgba(45, 26, 14, 0.34)",
    check: "rgba(214, 60, 48, 0.92)",
  },
  {
    id: "marble",
    name: "Marble",
    light: "#f4f2ee",
    dark: "#a8a29a",
    labelOnLight: "#8a8478",
    labelOnDark: "#f4f2ee",
    lastMove: "rgba(150, 190, 210, 0.5)",
    selected: "rgba(150, 190, 210, 0.62)",
    hint: "rgba(40, 38, 35, 0.28)",
    check: "rgba(206, 66, 56, 0.9)",
  },
  {
    id: "coral",
    name: "Coral",
    light: "#fde4d8",
    dark: "#e8836a",
    labelOnLight: "#c65f45",
    labelOnDark: "#fde4d8",
    lastMove: "rgba(80, 190, 180, 0.5)",
    selected: "rgba(80, 190, 180, 0.6)",
    hint: "rgba(70, 30, 20, 0.3)",
    check: "rgba(196, 45, 60, 0.9)",
  },
  {
    id: "midnight",
    name: "Midnight",
    light: "#3c435a",
    dark: "#181c2b",
    labelOnLight: "#181c2b",
    labelOnDark: "#8890ac",
    lastMove: "rgba(110, 140, 230, 0.5)",
    selected: "rgba(110, 140, 230, 0.62)",
    hint: "rgba(200, 210, 240, 0.28)",
    check: "rgba(232, 88, 76, 0.9)",
  },
  {
    id: "sand",
    name: "Sand",
    light: "#f2e2c4",
    dark: "#c9a877",
    labelOnLight: "#a3814f",
    labelOnDark: "#f7ecd7",
    lastMove: "rgba(120, 170, 140, 0.5)",
    selected: "rgba(120, 170, 140, 0.62)",
    hint: "rgba(60, 44, 20, 0.3)",
    check: "rgba(200, 60, 48, 0.9)",
  },
  {
    id: "mint",
    name: "Mint",
    light: "#e6f5ec",
    dark: "#68b090",
    labelOnLight: "#4a8a6d",
    labelOnDark: "#e6f5ec",
    lastMove: "rgba(240, 200, 90, 0.5)",
    selected: "rgba(240, 200, 90, 0.62)",
    hint: "rgba(20, 50, 38, 0.3)",
    check: "rgba(214, 60, 48, 0.9)",
  },
  {
    id: "deuteranopia",
    name: "Deuteranopia-safe",
    light: "#dbe9f5",
    dark: "#b56a1f",
    labelOnLight: "#8a5213",
    labelOnDark: "#f7e6d0",
    lastMove: "rgba(255, 214, 89, 0.5)",
    selected: "rgba(255, 214, 89, 0.62)",
    hint: "rgba(20, 40, 70, 0.34)",
    check: "rgba(37, 99, 235, 0.92)",
  },
  {
    id: "tritanopia",
    name: "Tritanopia-safe",
    light: "#eceff1",
    dark: "#7c5295",
    labelOnLight: "#5c3a75",
    labelOnDark: "#f0e6f5",
    lastMove: "rgba(216, 70, 120, 0.45)",
    selected: "rgba(216, 70, 120, 0.55)",
    hint: "rgba(40, 25, 50, 0.32)",
    check: "rgba(200, 40, 40, 0.9)",
  },
];

export const DEFAULT_THEME: BoardThemeId = "forest";

export function getTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
