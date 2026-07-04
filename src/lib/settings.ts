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
  | "gold"
  | "lichessCburnett"
  | "lichessMerida"
  | "lichessAlpha"
  | "lichessCalifornia"
  | "lichessCardinal"
  | "lichessChess7"
  | "lichessKosal"
  | "lichessMaestro"
  | "lichessPirouetti"
  | "lichessStaunty";

export type AccentColor = "blue" | "green" | "amber" | "rose";
export type AnimationSpeed = "off" | "fast" | "normal";
export type SiteTheme = "dark" | "light" | "system";

export interface Settings {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  volume: number; // 0..1
  moveRiskWarnings: boolean; // yellow/red move-dot warnings for self-loss / check
  autoQueen: boolean; // skip the promotion picker and always promote to queen
  // When on, the opponent's rule is never shown to you — not even after the
  // game ends, and mid-game reveal is disabled. Default off.
  hideOpponentReveal: boolean;
  muteChat: boolean; // hide in-game chat messages and input
  confirmResign: boolean; // ask before resigning
  showCoordinates: boolean; // file/rank labels on the board edge
  highlightLastMove: boolean; // tint the from/to squares of the last move
  showLegalMoves: boolean; // dots on the squares a selected piece can move to
  premovesEnabled: boolean; // allow queuing moves during the opponent's turn
  confirmMove: boolean; // require a confirm tap before a move is sent (slow games)
  confirmDrawOffer: boolean; // ask before sending a draw offer
  flipBoard: boolean; // view the board from the opponent's side
  checkHighlight: boolean; // tint the checked king's square
  boardSize: number; // board width multiplier, 0.8..1.1
  largerPieces: boolean; // draw pieces bigger inside their squares
  moveSound: boolean; // click on a quiet move
  captureSound: boolean; // thud on a capture
  checkSound: boolean; // ping when a king is in check
  gameEndSound: boolean; // chime when the game ends
  soundEnabled: boolean; // master switch for all game audio
  siteTheme: SiteTheme; // dark, light, or follow the OS
  compactMode: boolean; // tighter interface density
  lowTimeWarning: boolean; // ticking alert when the clock runs low
  uiScale: number; // 0.85..1.15, multiplies the root font size
  accentColor: AccentColor;
  animationSpeed: AnimationSpeed;
  uiSounds: boolean; // interface blips (piece select), separate from game sounds
  highContrast: boolean;
  reducedMotion: boolean;
  fpsCounter: boolean;
}

export const SETTINGS_CHANGED_EVENT = "nerfchess:settings-changed";

const STORAGE_KEY = "dc:settings-v1";
export const DEFAULT_SETTINGS: Settings = {
  boardTheme: "wood",
  pieceTheme: "classic",
  volume: 0.8,
  moveRiskWarnings: true,
  autoQueen: false,
  hideOpponentReveal: false,
  muteChat: false,
  confirmResign: true,
  showCoordinates: true,
  highlightLastMove: true,
  showLegalMoves: true,
  premovesEnabled: true,
  lowTimeWarning: true,
  confirmMove: false,
  confirmDrawOffer: false,
  flipBoard: false,
  checkHighlight: true,
  boardSize: 1,
  largerPieces: false,
  moveSound: true,
  captureSound: true,
  checkSound: true,
  gameEndSound: true,
  soundEnabled: true,
  siteTheme: "dark",
  compactMode: false,
  uiScale: 1,
  accentColor: "blue",
  animationSpeed: "normal",
  uiSounds: true,
  highContrast: false,
  reducedMotion: false,
  fpsCounter: false,
};
const DEFAULT = DEFAULT_SETTINGS;

export const ACCENT_THEMES: Record<
  AccentColor,
  { label: string; accent: string; accentHi: string; rgb: string; rgbHi: string; rgbDim: string }
> = {
  blue:  { label: "Blue",  accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231",  rgbHi: "74 159 238",  rgbDim: "42 111 176" },
  green: { label: "Green", accent: "#629924", accentHi: "#7bb52f", rgb: "98 153 36",   rgbHi: "123 181 47",  rgbDim: "74 116 27" },
  amber: { label: "Amber", accent: "#d8b56e", accentHi: "#e6bf6a", rgb: "216 181 110", rgbHi: "230 191 106", rgbDim: "168 138 79" },
  rose:  { label: "Rose",  accent: "#c66860", accentHi: "#dc7a72", rgb: "198 104 96",  rgbHi: "220 122 114", rgbDim: "150 76 70" },
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
  { label: string; wFill: string; wStroke: string; bFill: string; bStroke: string; assetSet?: string }
> = {
  classic:           { label: "Classic",             wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5" },
  ivory:             { label: "Ivory",               wFill: "#f0e8d5", wStroke: "#3a2f22", bFill: "#26201a", bStroke: "#f0e8d5" },
  steel:             { label: "Steel",               wFill: "#e8edf2", wStroke: "#2a3340", bFill: "#2b3440", bStroke: "#e8edf2" },
  rosewood:          { label: "Rosewood",            wFill: "#f3e6e4", wStroke: "#5a2b2b", bFill: "#4a2222", bStroke: "#f3e6e4" },
  forest:            { label: "Forest",              wFill: "#eef1e6", wStroke: "#24331f", bFill: "#22301c", bStroke: "#eef1e6" },
  ocean:             { label: "Ocean",               wFill: "#e6f1f5", wStroke: "#123243", bFill: "#123243", bStroke: "#e6f1f5" },
  gold:              { label: "Gold",                wFill: "#f4ead0", wStroke: "#6b4e15", bFill: "#3a2c0e", bStroke: "#e9c877" },
  lichessCburnett:   { label: "Lichess Cburnett",    wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "cburnett" },
  lichessMerida:     { label: "Lichess Merida",      wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "merida" },
  lichessAlpha:      { label: "Lichess Alpha",       wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "alpha" },
  lichessCalifornia: { label: "Lichess California",  wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "california" },
  lichessCardinal:   { label: "Lichess Cardinal",    wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "cardinal" },
  lichessChess7:     { label: "Lichess Chess7",      wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "chess7" },
  lichessKosal:      { label: "Lichess Kosal",       wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "kosal" },
  lichessMaestro:    { label: "Lichess Maestro",     wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "maestro" },
  lichessPirouetti:  { label: "Lichess Pirouetti",   wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "pirouetti" },
  lichessStaunty:    { label: "Lichess Staunty",     wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "staunty" },
};

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

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
      moveRiskWarnings: bool(parsed.moveRiskWarnings, DEFAULT.moveRiskWarnings),
      autoQueen: bool(parsed.autoQueen, DEFAULT.autoQueen),
      hideOpponentReveal: bool(parsed.hideOpponentReveal, DEFAULT.hideOpponentReveal),
      muteChat: bool(parsed.muteChat, DEFAULT.muteChat),
      confirmResign: bool(parsed.confirmResign, DEFAULT.confirmResign),
      showCoordinates: bool(parsed.showCoordinates, DEFAULT.showCoordinates),
      highlightLastMove: bool(parsed.highlightLastMove, DEFAULT.highlightLastMove),
      showLegalMoves: bool(parsed.showLegalMoves, DEFAULT.showLegalMoves),
      premovesEnabled: bool(parsed.premovesEnabled, DEFAULT.premovesEnabled),
      lowTimeWarning: bool(parsed.lowTimeWarning, DEFAULT.lowTimeWarning),
      confirmMove: bool(parsed.confirmMove, DEFAULT.confirmMove),
      confirmDrawOffer: bool(parsed.confirmDrawOffer, DEFAULT.confirmDrawOffer),
      flipBoard: bool(parsed.flipBoard, DEFAULT.flipBoard),
      checkHighlight: bool(parsed.checkHighlight, DEFAULT.checkHighlight),
      boardSize:
        typeof parsed.boardSize === "number"
          ? Math.max(0.8, Math.min(1.1, parsed.boardSize))
          : DEFAULT.boardSize,
      largerPieces: bool(parsed.largerPieces, DEFAULT.largerPieces),
      moveSound: bool(parsed.moveSound, DEFAULT.moveSound),
      captureSound: bool(parsed.captureSound, DEFAULT.captureSound),
      checkSound: bool(parsed.checkSound, DEFAULT.checkSound),
      gameEndSound: bool(parsed.gameEndSound, DEFAULT.gameEndSound),
      soundEnabled: bool(parsed.soundEnabled, DEFAULT.soundEnabled),
      siteTheme:
        parsed.siteTheme === "dark" || parsed.siteTheme === "light" || parsed.siteTheme === "system"
          ? parsed.siteTheme
          : DEFAULT.siteTheme,
      compactMode: bool(parsed.compactMode, DEFAULT.compactMode),
      uiScale:
        typeof parsed.uiScale === "number"
          ? Math.max(0.85, Math.min(1.15, parsed.uiScale))
          : DEFAULT.uiScale,
      accentColor:
        parsed.accentColor && parsed.accentColor in ACCENT_THEMES
          ? (parsed.accentColor as AccentColor)
          : DEFAULT.accentColor,
      animationSpeed:
        parsed.animationSpeed === "off" || parsed.animationSpeed === "fast" || parsed.animationSpeed === "normal"
          ? parsed.animationSpeed
          : DEFAULT.animationSpeed,
      uiSounds: bool(parsed.uiSounds, DEFAULT.uiSounds),
      highContrast: bool(parsed.highContrast, DEFAULT.highContrast),
      reducedMotion: bool(parsed.reducedMotion, DEFAULT.reducedMotion),
      fpsCounter: bool(parsed.fpsCounter, DEFAULT.fpsCounter),
    };
  } catch {}
  return { ...DEFAULT };
}

const UPDATED_AT_KEY = "dc:settings-updated-at";

function writeLocalSettings(s: Settings, updatedAt: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.localStorage.setItem(UPDATED_AT_KEY, String(updatedAt));
  } catch {}
  applyBoardTheme(s.boardTheme);
  applyPieceTheme(s.pieceTheme);
  applyUiPrefs(s);
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  writeLocalSettings(s, Date.now());
  schedulePushToServer();
}

// ---- Per-account settings sync ----
// Settings are saved locally first (they must work signed out), then pushed
// to the account so they follow the user across devices. On page load,
// pullSettingsFromServer adopts the server copy when it is newer.

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function localUpdatedAt(): number {
  try {
    return parseInt(window.localStorage.getItem(UPDATED_AT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function schedulePushToServer() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const updatedAt = localUpdatedAt();
    void fetch("/api/users/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: loadSettings(), updatedAt }),
    }).catch(() => {
      // Signed out or offline: local settings still apply.
    });
  }, 800);
}

/** Adopt the account's stored settings when they are newer than this
 *  device's. Returns true when the server copy was applied. */
export async function pullSettingsFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/users/settings");
    if (!res.ok) return false;
    const data = (await res.json()) as { settings: Partial<Settings> | null; updatedAt: number | null };
    if (!data.settings || !data.updatedAt) return false;
    if (data.updatedAt <= localUpdatedAt()) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
    } catch {}
    const merged = loadSettings(); // re-validate through the normal parser
    writeLocalSettings(merged, data.updatedAt);
    return true;
  } catch {
    return false;
  }
}

/** Push the interface-wide preferences (scale, accent, motion, contrast) into
 *  the document so every page picks them up. */
export function applyUiPrefs(s: Settings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  // Compact mode tightens the whole interface by shrinking the rem base a
  // notch; it stacks with the UI scale preference.
  const scale = s.uiScale * (s.compactMode ? 0.92 : 1);
  html.style.fontSize = scale === 1 ? "" : `${16 * scale}px`;
  html.style.setProperty("--board-cap", `${Math.round(720 * s.boardSize)}px`);
  html.style.setProperty("--piece-fit", s.largerPieces ? "97%" : "88%");
  html.dataset.theme =
    s.siteTheme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : s.siteTheme;
  html.style.colorScheme = html.dataset.theme;
  const accent = ACCENT_THEMES[s.accentColor] ?? ACCENT_THEMES.blue;
  html.style.setProperty("--accent", accent.accent);
  html.style.setProperty("--accent-hi", accent.accentHi);
  html.style.setProperty("--gold", accent.accent);
  html.style.setProperty("--gold-leaf", accent.accentHi);
  html.style.setProperty("--accent-rgb", accent.rgb);
  html.style.setProperty("--accent-hi-rgb", accent.rgbHi);
  html.style.setProperty("--accent-dim-rgb", accent.rgbDim);
  html.dataset.anim = s.reducedMotion ? "off" : s.animationSpeed;
  html.dataset.contrast = s.highContrast ? "high" : "normal";
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
  const html = document.documentElement;
  const root = document.documentElement.style;
  root.setProperty("--piece-w-fill", t.wFill);
  root.setProperty("--piece-w-stroke", t.wStroke);
  root.setProperty("--piece-b-fill", t.bFill);
  root.setProperty("--piece-b-stroke", t.bStroke);
  if (t.assetSet) {
    html.dataset.pieceSource = "lichess";
    for (const color of ["w", "b"] as const) {
      for (const type of ["k", "q", "r", "b", "n", "p"] as const) {
        root.setProperty(
          `--piece-${color}${type}-image`,
          `url("/piece/lichess/${t.assetSet}/${color}${type.toUpperCase()}.svg")`,
        );
      }
    }
  } else {
    html.dataset.pieceSource = "inline";
  }
}
