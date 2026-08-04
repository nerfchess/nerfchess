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
  | "midnight"
  | "obsidianBasalt"
  | "porcelainGlaze"
  | "neonGrid"
  | "jadeLacquer"
  | "auroraIce";

/** What the SETTING stores, which is a superset of what a board can BE.
 *  "auto" and "custom" are deliberately not members of BoardTheme: keeping the
 *  types distinct is what makes the compiler point at every place that indexes
 *  BOARD_THEMES directly, instead of silently falling through to the ?? wood
 *  fallback and exporting a clip with the wrong board. "custom" draws the
 *  player's own two hexes (customBoardLight/customBoardDark). */
export type BoardThemePref = BoardTheme | "auto" | "custom";

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

/** As BoardThemePref, for the piece set: "custom" draws the inline pieces with
 *  the player's own four hexes (customPieceWFill and friends). */
export type PieceThemePref = PieceTheme | "auto" | "custom";

export type AccentColor = "auto" | "blue" | "green" | "amber" | "rose";
export type AnimationSpeed = "off" | "fast" | "normal";
export type SiteTheme =
  | "dark"
  | "light"
  | "system"
  | "midnight"
  | "void"
  | "abyss"
  | "ember"
  | "crimson"
  | "moss"
  | "nebula"
  | "sakura"
  | "honey"
  | "pine"
  | "wine"
  | "storm"
  // Light tints: paper palettes, same deal as the dark tints above.
  | "sepia"
  | "frost"
  // Flagships: full identities rather than tints (see FLAGSHIP_THEMES).
  | "obsidian"
  | "porcelain"
  | "neon"
  | "jade"
  | "aurora";
export type SoundTheme = "lichess" | "classic";

// How a piece travels between squares. The Board reads this straight off
// html.dataset.pieceMotion (absent = glide), so "glide" clears the attribute.
export type PieceMotion = "glide" | "hop" | "warp" | "stomp";

// Full site themes. "dark" and "light" are the two originals; the rest are
// dark variants expressed purely as CSS-variable override blocks in
// globals.css keyed on html[data-theme="<id>"] (they inherit every dark-theme
// style, so only the palette shifts — no per-component work). `swatch` feeds
// the settings picker preview; `scheme` is the value for CSS color-scheme.
// Each theme also names its own ACCENT (the color of primary buttons, links,
// and "act here" chrome). It applies while the accent setting sits on "auto",
// which is the default, so every theme shows its own accent out of the box;
// picking an explicit accent color overrides every theme.
export interface AccentDef {
  accent: string;
  accentHi: string;
  rgb: string;
  rgbHi: string;
  rgbDim: string;
}

// The one shared accent: gold. Every dark theme uses it (accents stay identical
// across themes so the game reads consistently); mirrors --accent-gold in
// globals.css. The Nerf-red / Buff-blue / positive-green accents are fixed in
// CSS and never vary by theme, so they need no entry here.
const GOLD_ACCENT: AccentDef = {
  accent: "#d4a017",
  accentHi: "#e6b52e",
  rgb: "212 160 23",
  rgbHi: "230 181 46",
  rgbDim: "168 126 18",
};

// Light theme needs a DARKER gold so gold text/links clear WCAG AA on the light
// background (the bright gold above is only ~1.9:1 there). Mirrors the light
// override block in globals.css; paired with --text-on-accent:#fff so gold
// button fills stay legible with white type.
const LIGHT_GOLD_ACCENT: AccentDef = {
  accent: "#806310",
  accentHi: "#96751a",
  rgb: "128 99 16",
  rgbHi: "150 117 26",
  rgbDim: "96 74 12",
};

// --- Flagship accents -------------------------------------------------------
// The tinted themes above all share gold, because a tint is only a background
// change and the game must read the same in all of them. A FLAGSHIP is the
// other kind of theme: it owns its own primary accent, its own material, and
// its own motion, so it reads as a different room rather than a filter.
//
// What a flagship must NOT touch: the three SEMANTIC accents. Nerf red, Buff
// blue and positive green carry meaning — mode identity, danger, a win — and a
// theme that recolours them would be lying about the game. So every flagship
// hue below is deliberately clear of that red/blue/green, and the board stays
// on whatever board theme the player picked.
const EMBER_ACCENT: AccentDef = {
  accent: "#ff7a2f",
  accentHi: "#ff9a5c",
  rgb: "255 122 47",
  rgbHi: "255 154 92",
  rgbDim: "200 90 28",
};
// Cobalt for the paper flagship. Both steps are dark enough to clear WCAG AA
// as text on porcelain (6.3:1 and 4.9:1), the way LIGHT_GOLD_ACCENT does.
const COBALT_ACCENT: AccentDef = {
  accent: "#2a55b8",
  accentHi: "#3466d6",
  rgb: "42 85 184",
  rgbHi: "52 102 214",
  rgbDim: "30 64 144",
};
const MAGENTA_ACCENT: AccentDef = {
  accent: "#ff45c8",
  accentHi: "#ff78d8",
  rgb: "255 69 200",
  rgbHi: "255 120 216",
  rgbDim: "216 30 163",
};
const JADE_ACCENT: AccentDef = {
  accent: "#2fbf9f",
  accentHi: "#5ad6bb",
  rgb: "47 191 159",
  rgbHi: "90 214 187",
  rgbDim: "34 150 124",
};
const AURORA_ACCENT: AccentDef = {
  accent: "#9d7bff",
  accentHi: "#b79dff",
  rgb: "157 123 255",
  rgbHi: "183 157 255",
  rgbDim: "122 90 224",
};

/** The five flagship ids, in picker order. Everything else in SITE_THEMES is a
 *  tint of the base palette. */
export const FLAGSHIP_THEMES: SiteTheme[] = [
  "obsidian",
  "porcelain",
  "neon",
  "jade",
  "aurora",
];

export function isFlagshipTheme(theme: SiteTheme): boolean {
  return FLAGSHIP_THEMES.includes(theme);
}

export const SITE_THEMES: Record<
  SiteTheme,
  {
    label: string;
    hint: string;
    scheme: "dark" | "light";
    swatch: { bg: string; panel: string; glow: string };
    accent: AccentDef;
    /** The board and piece set this theme wants when the player's own setting
     *  is on "auto". Only the flagships set these: a tint is a repaint and has
     *  no business touching the board. */
    board?: BoardTheme;
    piece?: PieceTheme;
  }
> = {
  dark:     { label: "Classic",  hint: "Warm charcoal, the base palette", scheme: "dark",  swatch: { bg: "#1a1512", panel: "#241d18", glow: "#d4a017" }, accent: GOLD_ACCENT },
  light:    { label: "Light",    hint: "Paper and ink",                   scheme: "light", swatch: { bg: "#e9e6de", panel: "#f4f1ea", glow: "#806310" }, accent: LIGHT_GOLD_ACCENT },
  system:   { label: "System",   hint: "Follow your device",              scheme: "dark",  swatch: { bg: "#1a1512", panel: "#e9e6de", glow: "#d4a017" }, accent: GOLD_ACCENT },
  midnight: { label: "Midnight", hint: "Blue-grey steel",                 scheme: "dark",  swatch: { bg: "#101318", panel: "#1a1f27", glow: "#d4a017" }, accent: GOLD_ACCENT },
  void:     { label: "Void",     hint: "Crushed near-black, OLED-friendly", scheme: "dark", swatch: { bg: "#0d0b0a", panel: "#141210", glow: "#d4a017" }, accent: GOLD_ACCENT },
  abyss:    { label: "Abyss",    hint: "Deep-sea teal",                   scheme: "dark",  swatch: { bg: "#0c1517", panel: "#152327", glow: "#d4a017" }, accent: GOLD_ACCENT },
  ember:    { label: "Ember",    hint: "Smoldering red-brown",            scheme: "dark",  swatch: { bg: "#170f0e", panel: "#261815", glow: "#d4a017" }, accent: GOLD_ACCENT },
  crimson:  { label: "Crimson",  hint: "Deep blood red",                  scheme: "dark",  swatch: { bg: "#150a0c", panel: "#291015", glow: "#d4a017" }, accent: GOLD_ACCENT },
  moss:     { label: "Moss",     hint: "Deep forest green",               scheme: "dark",  swatch: { bg: "#0f140e", panel: "#1a2318", glow: "#d4a017" }, accent: GOLD_ACCENT },
  nebula:   { label: "Nebula",   hint: "Violet dusk",                     scheme: "dark",  swatch: { bg: "#131019", panel: "#1f1929", glow: "#d4a017" }, accent: GOLD_ACCENT },
  sakura:   { label: "Sakura",   hint: "Dusk pink over dark wood",        scheme: "dark",  swatch: { bg: "#171013", panel: "#251821", glow: "#d4a017" }, accent: GOLD_ACCENT },
  honey:    { label: "Honey",    hint: "Warm amber-brown",                scheme: "dark",  swatch: { bg: "#171208", panel: "#262012", glow: "#d4a017" }, accent: GOLD_ACCENT },
  pine:     { label: "Pine",     hint: "Blue-green conifer dusk",         scheme: "dark",  swatch: { bg: "#0d1412", panel: "#16221e", glow: "#d4a017" }, accent: GOLD_ACCENT },
  wine:     { label: "Wine",     hint: "Deep plum cellar",                scheme: "dark",  swatch: { bg: "#140d14", panel: "#221626", glow: "#d4a017" }, accent: GOLD_ACCENT },
  storm:    { label: "Storm",    hint: "Cold slate grey",                 scheme: "dark",  swatch: { bg: "#101214", panel: "#1a1e22", glow: "#d4a017" }, accent: GOLD_ACCENT },
  sepia:    { label: "Sepia",    hint: "Aged paper, warm cream",          scheme: "light", swatch: { bg: "#ece4d2", panel: "#f6f0e2", glow: "#806310" }, accent: LIGHT_GOLD_ACCENT },
  frost:    { label: "Frost",    hint: "Cool paper, blue-white",          scheme: "light", swatch: { bg: "#e3e8ee", panel: "#f1f4f8", glow: "#806310" }, accent: LIGHT_GOLD_ACCENT },

  // --- Flagships: own accent, own material, own motion. ---
  obsidian:  { label: "Obsidian",  hint: "Volcanic glass, molten ember",   scheme: "dark",  swatch: { bg: "#0b0a0c", panel: "#16131a", glow: "#ff7a2f" }, accent: EMBER_ACCENT, board: "obsidianBasalt", piece: "steel" },
  porcelain: { label: "Porcelain", hint: "Glazed white, cobalt ink",       scheme: "light", swatch: { bg: "#eeeae2", panel: "#fbf9f5", glow: "#2a55b8" }, accent: COBALT_ACCENT, board: "porcelainGlaze", piece: "classic" },
  neon:      { label: "Neon",      hint: "Arcade indigo, hot magenta",     scheme: "dark",  swatch: { bg: "#0a0714", panel: "#150e28", glow: "#ff45c8" }, accent: MAGENTA_ACCENT, board: "neonGrid", piece: "steel" },
  jade:      { label: "Jade",      hint: "Lacquer green, jade inlay",      scheme: "dark",  swatch: { bg: "#08110f", panel: "#0f1f1a", glow: "#2fbf9f" }, accent: JADE_ACCENT, board: "jadeLacquer", piece: "forest" },
  aurora:    { label: "Aurora",    hint: "Polar night, violet light",      scheme: "dark",  swatch: { bg: "#070d18", panel: "#0e172a", glow: "#9d7bff" }, accent: AURORA_ACCENT, board: "auroraIce", piece: "ivory" },
};

export interface Settings {
  boardTheme: BoardThemePref;
  pieceTheme: PieceThemePref;
  // The two square hexes drawn when boardTheme is "custom". Kept even while a
  // named board is active so switching back to Custom restores the mix.
  customBoardLight: string;
  customBoardDark: string;
  // The four inline-piece hexes drawn when pieceTheme is "custom".
  customPieceWFill: string;
  customPieceWStroke: string;
  customPieceBFill: string;
  customPieceBStroke: string;
  pieceMotion: PieceMotion; // how pieces travel between squares
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
  soundTheme: SoundTheme; // lichess sample set, or the classic synth clicks
  siteTheme: SiteTheme; // dark, light, or follow the OS
  compactMode: boolean; // tighter interface density
  lowTimeWarning: boolean; // ticking alert when the clock runs low
  uiScale: number; // 0.85..1.15, multiplies the root font size
  accentColor: AccentColor;
  animationSpeed: AnimationSpeed;
  uiSounds: boolean; // interface blips (piece select), separate from game sounds
  highContrast: boolean;
  reducedMotion: boolean;
  // Honor the OS "prefers-reduced-motion" flag automatically (on by default):
  // when the system asks for calm, animations stand down exactly as if
  // reducedMotion were on. Turning this off restores the old app-authoritative
  // behavior for players who reduce motion system-wide but still want plays.
  followSystemMotion: boolean;
  fpsCounter: boolean;
  customBgUrl: string; // full-page background image URL; empty string = none
  customBgDim: number; // 0..0.6 dark overlay over the custom background
  // Uploaded full-page background as a data URL (device-local: stripped from
  // the server sync so the settings blob stays small). Wins over customBgUrl.
  customBgData: string;
  fxDuration: number; // 0.5..2, multiplies how long card/FX animations last
  // Performance mode: drops the most paint-costly decorative layers (backdrop
  // blurs, the full-screen paper-grain blend, fixed-attachment backgrounds)
  // for smooth play on low-end devices. Auto-enabled once on weak hardware,
  // then user-overridable. Functional visuals (board, pieces, effects) stay.
  perfMode: boolean;
}

export const SETTINGS_CHANGED_EVENT = "nerfchess:settings-changed";

const STORAGE_KEY = "dc:settings-v1";
export const DEFAULT_SETTINGS: Settings = {
  boardTheme: "auto",
  pieceTheme: "auto",
  customBoardLight: "#ecd9ae",
  customBoardDark: "#8a5a38",
  customPieceWFill: "#f2ead8",
  customPieceWStroke: "#3b332a",
  customPieceBFill: "#2b2b31",
  customPieceBStroke: "#d8c9a8",
  pieceMotion: "glide",
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
  soundTheme: "lichess",
  siteTheme: "dark",
  compactMode: false,
  uiScale: 1,
  accentColor: "auto",
  animationSpeed: "normal",
  uiSounds: true,
  highContrast: false,
  reducedMotion: false,
  followSystemMotion: true,
  fpsCounter: false,
  customBgUrl: "",
  customBgDim: 0.3,
  customBgData: "",
  fxDuration: 1,
  perfMode: false,
};
const DEFAULT = DEFAULT_SETTINGS;

export const ACCENT_THEMES: Record<
  Exclude<AccentColor, "auto">,
  { label: string; accent: string; accentHi: string; rgb: string; rgbHi: string; rgbDim: string }
> = {
  blue:  { label: "Blue",  accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231",  rgbHi: "74 159 238",  rgbDim: "42 111 176" },
  green: { label: "Green", accent: "#629924", accentHi: "#7bb52f", rgb: "98 153 36",   rgbHi: "123 181 47",  rgbDim: "74 116 27" },
  amber: { label: "Amber", accent: "#d8b56e", accentHi: "#e6bf6a", rgb: "216 181 110", rgbHi: "230 191 106", rgbDim: "168 138 79" },
  rose:  { label: "Rose",  accent: "#c66860", accentHi: "#dc7a72", rgb: "198 104 96",  rgbHi: "220 122 114", rgbDim: "150 76 70" },
};

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  // The default board: parchment light / walnut dark, matching --board-light /
  // --board-dark in globals.css so the board reads as part of the warm site
  // palette (never the old blue-grey squares).
  wood:       { light: "#ecd9ae", dark: "#8a5a38", label: "Wood" },
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
  // The four boards the flagship themes ask for on "auto". They are ordinary
  // entries, not a parallel system, so anyone can pick Obsidian's basalt board
  // without running the Obsidian theme. Each keeps a wide light/dark split so
  // the pieces stay readable on it — a themed board that swallowed a piece
  // would be a worse bug than a board that clashes.
  obsidianBasalt:  { light: "#c9bcae", dark: "#4a3f42", label: "Basalt" },
  porcelainGlaze:  { light: "#f7f5f0", dark: "#a8b0c4", label: "Glaze" },
  neonGrid:        { light: "#b9a6d8", dark: "#42256b", label: "Grid" },
  jadeLacquer:     { light: "#dfe4c8", dark: "#2f5f4c", label: "Lacquer" },
  auroraIce:       { light: "#dbe6f5", dark: "#495a80", label: "Polar" },
};

export const PIECE_THEMES: Record<
  PieceTheme,
  { label: string; wFill: string; wStroke: string; bFill: string; bStroke: string; assetSet?: string }
> = {
  // Classic ships warm ivory whites and charcoal blacks with a warm edge, so
  // the default set sits inside the dungeon palette instead of clinical
  // black-and-white (2026-07 piece pass).
  classic:           { label: "Classic",             wFill: "#f2ead8", wStroke: "#3b332a", bFill: "#2b2b31", bStroke: "#d8c9a8" },
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

/** Validate a user-supplied color for the custom board/piece fields: a plain
 *  six-digit hex (what <input type="color"> emits), nothing else, so the value
 *  can be dropped into an inline CSS custom property without escaping. */
export function sanitizeHexColor(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const hex = v.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback;
}

export const CUSTOM_BG_URL_MAX = 400;

/** Validate a user-supplied background image URL. Returns the cleaned URL, or
 *  "" when the value is missing, not http(s), too long, or contains characters
 *  that could break out of a CSS url() (quotes, backslashes, whitespace). */
export function sanitizeCustomBgUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const url = v.trim();
  if (!url || url.length > CUSTOM_BG_URL_MAX) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  if (/[\s"'\\<>()]/.test(url)) return "";
  return url;
}

function clampDim(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(0.6, v)) : fallback;
}

// Uploaded backgrounds live in localStorage only, so the cap can be generous:
// ~640KB of base64 is a ~480KB JPEG, plenty for a 1920px background.
export const CUSTOM_BG_DATA_MAX = 640_000;

/** Validate an uploaded background: a length-capped base64 image data URL
 *  (same shape isCustomAvatar accepts), nothing else. */
export function sanitizeCustomBgData(v: unknown): string {
  if (typeof v !== "string") return "";
  if (!v || v.length > CUSTOM_BG_DATA_MAX) return "";
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return "";
  return v;
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      boardTheme:
        // "auto" and "custom" have to pass this guard explicitly: they are
        // legal stored values but not keys of BOARD_THEMES, so without them
        // every such user would be reset to the default on the next settings
        // pull from the server.
        parsed.boardTheme === "auto" ||
        parsed.boardTheme === "custom" ||
        (parsed.boardTheme && parsed.boardTheme in BOARD_THEMES)
          ? (parsed.boardTheme as BoardThemePref)
          : DEFAULT.boardTheme,
      pieceTheme:
        parsed.pieceTheme === "auto" ||
        parsed.pieceTheme === "custom" ||
        (parsed.pieceTheme && parsed.pieceTheme in PIECE_THEMES)
          ? (parsed.pieceTheme as PieceThemePref)
          : DEFAULT.pieceTheme,
      customBoardLight: sanitizeHexColor(parsed.customBoardLight, DEFAULT.customBoardLight),
      customBoardDark: sanitizeHexColor(parsed.customBoardDark, DEFAULT.customBoardDark),
      customPieceWFill: sanitizeHexColor(parsed.customPieceWFill, DEFAULT.customPieceWFill),
      customPieceWStroke: sanitizeHexColor(parsed.customPieceWStroke, DEFAULT.customPieceWStroke),
      customPieceBFill: sanitizeHexColor(parsed.customPieceBFill, DEFAULT.customPieceBFill),
      customPieceBStroke: sanitizeHexColor(parsed.customPieceBStroke, DEFAULT.customPieceBStroke),
      pieceMotion:
        parsed.pieceMotion === "glide" ||
        parsed.pieceMotion === "hop" ||
        parsed.pieceMotion === "warp" ||
        parsed.pieceMotion === "stomp"
          ? parsed.pieceMotion
          : DEFAULT.pieceMotion,
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
      soundTheme:
        parsed.soundTheme === "lichess" || parsed.soundTheme === "classic"
          ? parsed.soundTheme
          : DEFAULT.soundTheme,
      siteTheme:
        parsed.siteTheme && parsed.siteTheme in SITE_THEMES
          ? (parsed.siteTheme as SiteTheme)
          : DEFAULT.siteTheme,
      compactMode: bool(parsed.compactMode, DEFAULT.compactMode),
      uiScale:
        typeof parsed.uiScale === "number"
          ? Math.max(0.85, Math.min(1.15, parsed.uiScale))
          : DEFAULT.uiScale,
      accentColor:
        parsed.accentColor === "auto" || (parsed.accentColor && parsed.accentColor in ACCENT_THEMES)
          ? (parsed.accentColor as AccentColor)
          : DEFAULT.accentColor,
      animationSpeed:
        parsed.animationSpeed === "off" || parsed.animationSpeed === "fast" || parsed.animationSpeed === "normal"
          ? parsed.animationSpeed
          : DEFAULT.animationSpeed,
      uiSounds: bool(parsed.uiSounds, DEFAULT.uiSounds),
      highContrast: bool(parsed.highContrast, DEFAULT.highContrast),
      reducedMotion: bool(parsed.reducedMotion, DEFAULT.reducedMotion),
      followSystemMotion: bool(parsed.followSystemMotion, DEFAULT.followSystemMotion),
      fpsCounter: bool(parsed.fpsCounter, DEFAULT.fpsCounter),
      customBgUrl: sanitizeCustomBgUrl(parsed.customBgUrl),
      customBgDim: clampDim(parsed.customBgDim, DEFAULT.customBgDim),
      customBgData: sanitizeCustomBgData(parsed.customBgData),
      fxDuration:
        typeof parsed.fxDuration === "number" && Number.isFinite(parsed.fxDuration)
          ? Math.max(0.5, Math.min(2, parsed.fxDuration))
          : DEFAULT.fxDuration,
      // No hardware sniff: animations and full visuals run everywhere by
      // default. When a device actually struggles, the runtime lag watcher
      // (LagWatch in SettingsBootstrap) offers performance mode instead of
      // silently degrading anything.
      perfMode: bool(parsed.perfMode, DEFAULT.perfMode),
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
  applyBoardColors(s);
  applyPieceColors(s);
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
    // The uploaded background stays device-local: as a data URL it would blow
    // the server's settings-blob size cap, so it is stripped from the push
    // (and re-injected locally when a newer server copy is adopted).
    const settings: Settings = { ...loadSettings(), customBgData: "" };
    void fetch("/api/users/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, updatedAt }),
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
    // The server copy never carries the device-local uploaded background
    // (stripped on push); keep this device's upload across the adoption.
    const localBg = loadSettings().customBgData;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
    } catch {}
    const merged = loadSettings(); // re-validate through the normal parser
    if (!merged.customBgData && localBg) merged.customBgData = localBg;
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
  // color-scheme only accepts light/dark; every named theme maps to one.
  const scheme = SITE_THEMES[html.dataset.theme as SiteTheme]?.scheme ?? "dark";
  html.style.colorScheme = scheme;
  // Paper-scheme treatments (plate fills, ink text ramps, border alphas) hang
  // off this flag rather than off one theme id, so every light theme gets them
  // and a new one costs no CSS.
  if (scheme === "light") html.dataset.light = "on";
  else delete html.dataset.light;
  const theme = SITE_THEMES[html.dataset.theme as SiteTheme] ?? SITE_THEMES.dark;
  const accent =
    s.accentColor === "auto"
      ? theme.accent
      : (ACCENT_THEMES[s.accentColor as Exclude<AccentColor, "auto">] ?? theme.accent);
  html.style.setProperty("--accent", accent.accent);
  html.style.setProperty("--accent-hi", accent.accentHi);
  html.style.setProperty("--gold", accent.accent);
  html.style.setProperty("--gold-leaf", accent.accentHi);
  html.style.setProperty("--accent-rgb", accent.rgb);
  html.style.setProperty("--accent-hi-rgb", accent.rgbHi);
  html.style.setProperty("--accent-dim-rgb", accent.rgbDim);
  // The OS prefers-reduced-motion flag is honored automatically (new default);
  // the in-app toggles still work, and followSystemMotion:false restores the
  // old app-authoritative behavior for users who want plays regardless.
  const osReducedMotion =
    s.followSystemMotion && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  html.dataset.anim = s.reducedMotion || osReducedMotion ? "off" : s.animationSpeed;
  html.dataset.contrast = s.highContrast ? "high" : "normal";
  // Piece travel style: the Board reads this attribute directly, and absent
  // means glide, so the default keeps the DOM quiet.
  if (s.pieceMotion !== "glide") html.dataset.pieceMotion = s.pieceMotion;
  else delete html.dataset.pieceMotion;
  // Performance mode: gates the heaviest decorative paint in globals.css.
  if (s.perfMode) html.dataset.perf = "low";
  else delete html.dataset.perf;
  // FX duration multiplier: CSS-driven card/board animations read this var
  // (calc(<base> * var(--fx-dur, 1))); the canvas VFX engine reads the same
  // setting through its play specs.
  html.style.setProperty("--fx-dur", String(s.fxDuration));
  // Custom background (lichess-style): the image lands on <body> through a CSS
  // variable; the appended globals.css block adds a dim overlay for legibility.
  // An uploaded image (validated data URL) wins over the URL field.
  const bgUrl = sanitizeCustomBgData(s.customBgData) || sanitizeCustomBgUrl(s.customBgUrl);
  if (bgUrl) {
    html.dataset.customBg = "on";
    html.style.setProperty("--custom-bg-url", `url("${bgUrl}")`);
    html.style.setProperty("--custom-bg-dim", String(clampDim(s.customBgDim, DEFAULT.customBgDim)));
  } else {
    delete html.dataset.customBg;
    html.style.removeProperty("--custom-bg-url");
    html.style.removeProperty("--custom-bg-dim");
  }
}

/** Current card-FX duration multiplier as applied to the document by
 *  applyUiPrefs (--fx-dur). Read at play time by the board's VFX dispatch so
 *  the canvas engine and the CSS animations stretch together. */
export function fxDurationScale(): number {
  if (typeof document === "undefined") return 1;
  const v = parseFloat(document.documentElement.style.getPropertyValue("--fx-dur"));
  return Number.isFinite(v) && v > 0 ? Math.max(0.5, Math.min(2, v)) : 1;
}

/** True when animations are off: the user turned them off in Settings
 *  (reduced motion or animation speed "off"), or the OS asked for reduced
 *  motion and "Follow system motion" (default on) is honoring it — applyUiPrefs
 *  folds both into data-anim, so this single read stays authoritative.
 *  SSR-safe (false). */
export function motionOff(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.dataset.anim === "off";
}

/** The site theme actually in force, with "system" already resolved. Both
 *  resolvers below need it, and applyUiPrefs computed it inline. */
export function effectiveSiteTheme(s: Settings): SiteTheme {
  if (s.siteTheme !== "system") return s.siteTheme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** The board to actually draw. On "auto" a flagship supplies its own; a tint
 *  supplies none and falls back to wood, which is what "auto" meant before any
 *  theme had an opinion. An explicit pick always wins: a player who chose
 *  Green gets Green in every theme. "custom" has no named board, so callers
 *  that need one (the clip exporter) get the wood fallback; the live board
 *  colors come from boardColors(), which honors the custom hexes. */
export function resolveBoardTheme(s: Settings): BoardTheme {
  if (s.boardTheme === "auto") return SITE_THEMES[effectiveSiteTheme(s)]?.board ?? "wood";
  if (s.boardTheme === "custom") return "wood";
  return s.boardTheme;
}

/** As resolveBoardTheme, for the piece set ("custom" falls back to classic
 *  for callers that need a named set; applyPieceColors honors the hexes). */
export function resolvePieceTheme(s: Settings): PieceTheme {
  if (s.pieceTheme === "auto") return SITE_THEMES[effectiveSiteTheme(s)]?.piece ?? "classic";
  if (s.pieceTheme === "custom") return "classic";
  return s.pieceTheme;
}

/** The two square colors the board should actually paint, with the "custom"
 *  pref resolved to the player's own hexes and everything else to its named
 *  BOARD_THEMES entry. */
export function boardColors(s: Settings): { light: string; dark: string } {
  if (s.boardTheme === "custom") {
    return {
      light: sanitizeHexColor(s.customBoardLight, DEFAULT.customBoardLight),
      dark: sanitizeHexColor(s.customBoardDark, DEFAULT.customBoardDark),
    };
  }
  const t = BOARD_THEMES[resolveBoardTheme(s)] ?? BOARD_THEMES.wood;
  return { light: t.light, dark: t.dark };
}

/** Push the board square colors for these settings into the document,
 *  honoring the "custom" pref. The settings-aware wrapper every caller should
 *  use; applyBoardTheme below stays for painting a specific named board. */
export function applyBoardColors(s: Settings) {
  if (typeof document === "undefined") return;
  const c = boardColors(s);
  const root = document.documentElement.style;
  root.setProperty("--sq-light", c.light);
  root.setProperty("--sq-dark", c.dark);
}

/** As applyBoardColors, for the piece set: "custom" means the inline-drawn
 *  pieces with the player's own four hexes; anything else defers to
 *  applyPieceTheme with the resolved named set. */
export function applyPieceColors(s: Settings) {
  if (typeof document === "undefined") return;
  if (s.pieceTheme !== "custom") {
    applyPieceTheme(resolvePieceTheme(s));
    return;
  }
  const html = document.documentElement;
  const root = html.style;
  root.setProperty("--piece-w-fill", sanitizeHexColor(s.customPieceWFill, DEFAULT.customPieceWFill));
  root.setProperty("--piece-w-stroke", sanitizeHexColor(s.customPieceWStroke, DEFAULT.customPieceWStroke));
  root.setProperty("--piece-b-fill", sanitizeHexColor(s.customPieceBFill, DEFAULT.customPieceBFill));
  root.setProperty("--piece-b-stroke", sanitizeHexColor(s.customPieceBStroke, DEFAULT.customPieceBStroke));
  html.dataset.pieceSource = "inline";
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
