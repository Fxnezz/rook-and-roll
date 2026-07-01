export type BoardThemeId = "forest" | "ocean" | "charcoal" | "rosewood";

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
];

export const DEFAULT_THEME: BoardThemeId = "forest";

export function getTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
