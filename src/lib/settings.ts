// Per-user settings stored in localStorage. Currently covers board theme and
// sound volume. Plain functions, no React; pages subscribe via small hooks.

export type BoardTheme =
  | "wood"
  | "green"
  | "blue"
  | "slate"
  | "brown"
  | "purple"
  | "ice"
  | "rose"
  | "walnut"
  | "tournament"
  | "forest"
  | "midnight";

export type PieceTheme =
  | "classic"
  | "ivory"
  | "steel"
  | "rosewood"
  | "forest"
  | "ocean"
  | "gold";

export interface Settings {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  volume: number; // 0..1
  moveRiskWarnings: boolean; // yellow/red move-dot warnings for self-loss / check
  autoQueen: boolean; // skip the promotion picker and always promote to queen
  // When on, the opponent's rule is never shown to you — not even after the
  // game ends, and mid-game reveal is disabled. Default off.
  hideOpponentReveal: boolean;
}

const STORAGE_KEY = "dc:settings-v1";
const DEFAULT: Settings = {
  boardTheme: "wood",
  pieceTheme: "classic",
  volume: 0.8,
  moveRiskWarnings: true,
  autoQueen: false,
  hideOpponentReveal: false,
};

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  wood:       { light: "#e8dcc0", dark: "#8d6e4b", label: "Wood" },
  brown:      { light: "#f0d9b5", dark: "#b58863", label: "Brown" },
  walnut:     { light: "#e0c39a", dark: "#7a5230", label: "Walnut" },
  green:      { light: "#eeeed2", dark: "#769656", label: "Green" },
  tournament: { light: "#dcdcd0", dark: "#6d8a5a", label: "Tournament" },
  forest:     { light: "#e9edd6", dark: "#4c6b3f", label: "Forest" },
  blue:       { light: "#dee3e6", dark: "#788a94", label: "Blue" },
  ice:        { light: "#e8f1f6", dark: "#7ba1c0", label: "Ice" },
  slate:      { light: "#cfd1d5", dark: "#52525b", label: "Slate" },
  midnight:   { light: "#9fa6b2", dark: "#3a3f4b", label: "Midnight" },
  purple:     { light: "#e6dcf0", dark: "#8877b3", label: "Purple" },
  rose:       { light: "#f5e2dd", dark: "#c27f77", label: "Rose" },
};

export const PIECE_THEMES: Record<
  PieceTheme,
  { label: string; wFill: string; wStroke: string; bFill: string; bStroke: string }
> = {
  classic:  { label: "Classic",  wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5" },
  ivory:    { label: "Ivory",    wFill: "#f0e8d5", wStroke: "#3a2f22", bFill: "#26201a", bStroke: "#f0e8d5" },
  steel:    { label: "Steel",    wFill: "#e8edf2", wStroke: "#2a3340", bFill: "#2b3440", bStroke: "#e8edf2" },
  rosewood: { label: "Rosewood", wFill: "#f3e6e4", wStroke: "#5a2b2b", bFill: "#4a2222", bStroke: "#f3e6e4" },
  forest:   { label: "Forest",   wFill: "#eef1e6", wStroke: "#24331f", bFill: "#22301c", bStroke: "#eef1e6" },
  ocean:    { label: "Ocean",    wFill: "#e6f1f5", wStroke: "#123243", bFill: "#123243", bStroke: "#e6f1f5" },
  gold:     { label: "Gold",     wFill: "#f4ead0", wStroke: "#6b4e15", bFill: "#3a2c0e", bStroke: "#e9c877" },
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      boardTheme:
        parsed.boardTheme && parsed.boardTheme in BOARD_THEMES
          ? (parsed.boardTheme as BoardTheme)
          : DEFAULT.boardTheme,
      pieceTheme:
        parsed.pieceTheme && parsed.pieceTheme in PIECE_THEMES
          ? (parsed.pieceTheme as PieceTheme)
          : DEFAULT.pieceTheme,
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT.volume,
      moveRiskWarnings:
        typeof parsed.moveRiskWarnings === "boolean" ? parsed.moveRiskWarnings : DEFAULT.moveRiskWarnings,
      autoQueen: typeof parsed.autoQueen === "boolean" ? parsed.autoQueen : DEFAULT.autoQueen,
      hideOpponentReveal:
        typeof parsed.hideOpponentReveal === "boolean"
          ? parsed.hideOpponentReveal
          : DEFAULT.hideOpponentReveal,
    };
  } catch {}
  return { ...DEFAULT };
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
  applyBoardTheme(s.boardTheme);
  applyPieceTheme(s.pieceTheme);
}

export function applyBoardTheme(theme: BoardTheme) {
  if (typeof document === "undefined") return;
  const t = BOARD_THEMES[theme] ?? BOARD_THEMES.wood;
  document.documentElement.style.setProperty("--sq-light", t.light);
  document.documentElement.style.setProperty("--sq-dark", t.dark);
}

export function applyPieceTheme(theme: PieceTheme) {
  if (typeof document === "undefined") return;
  const t = PIECE_THEMES[theme] ?? PIECE_THEMES.classic;
  const root = document.documentElement.style;
  root.setProperty("--piece-w-fill", t.wFill);
  root.setProperty("--piece-w-stroke", t.wStroke);
  root.setProperty("--piece-b-fill", t.bFill);
  root.setProperty("--piece-b-stroke", t.bStroke);
}
