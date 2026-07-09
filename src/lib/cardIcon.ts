// Per-card face icons with NO per-card data entry required.
//
// Owner complaint: 564 of the 735 implemented cards carry no `icon`, so whole
// hands rendered the same category glyph and read as identical. Rather than
// hand-annotating hundreds of card defs (and every future card), each iconless
// card deterministically draws a distinct thematic glyph from its category's
// icon ring, keyed by a hash of its id. Pure function of the public card id,
// so every surface (draft offers, dock, codex, toasts) shows the same icon for
// the same card, forever, on every client.
//
// A card's own `icon` (when set) always wins, exactly as before. Ring names
// are validated against the installed lucide set at module init, so a renamed
// icon in a lucide upgrade silently drops out of the ring instead of breaking
// a card face (the ring just gets one entry shorter).

import { icons as LucideIcons, type LucideIcon } from "lucide-react";
import type { BuffCategory } from "@/engine/buff";

/** Resolve a lucide icon NAME to its component. Accepts both the PascalCase
 * export key ("Bomb") and lucide's kebab-case id ("shield-alert"). Unknown or
 * misspelled names return undefined so a bad name can never crash a card. */
export function resolveLucideIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  const direct = LucideIcons[name as keyof typeof LucideIcons];
  if (direct) return direct as LucideIcon;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m: string, _s: string, c: string) =>
    c.toUpperCase(),
  );
  return LucideIcons[pascal as keyof typeof LucideIcons] as LucideIcon | undefined;
}

// Thematic rings, one per category. Order matters (it is the hash space), so
// append new names rather than reordering, or existing cards change faces.
const RING_NAMES: Record<BuffCategory, string[]> = {
  movement: [
    "Wind", "Footprints", "Rocket", "Rabbit", "Feather", "Compass", "Route",
    "Zap", "Bird", "Milestone", "Gauge", "MoveDiagonal", "ArrowUpRight", "Waypoints",
  ],
  pieces: [
    "Castle", "Crown", "Users", "Ghost", "Egg", "Shapes", "PersonStanding",
    "Puzzle", "Boxes", "UserPlus", "Landmark", "Baby", "Squirrel", "Cat",
  ],
  tempo: [
    "Timer", "Clock", "Hourglass", "AlarmClock", "Watch", "History",
    "FastForward", "Rewind", "Snail", "Turtle", "CalendarClock", "TimerReset",
    "Infinity", "IterationCw",
  ],
  protection: [
    "Shield", "ShieldCheck", "ShieldPlus", "Umbrella", "Lock", "LifeBuoy",
    "HardHat", "Fence", "Anchor", "Heater", "Landmark", "CircleDot",
    "ShieldHalf", "Tent",
  ],
  attack: [
    "Swords", "Sword", "Bomb", "Flame", "Axe", "Hammer", "Crosshair",
    "Target", "CloudLightning", "Scissors", "Slice", "Tornado", "Skull",
    "Flashlight",
  ],
  info: [
    "Eye", "Search", "Telescope", "Binoculars", "Radar", "ScanEye",
    "Glasses", "Lightbulb", "MapPin", "Fingerprint", "BookOpen", "Newspaper",
    "SearchCheck", "Signal",
  ],
  draft: [
    "Layers", "Copy", "Shuffle", "Dices", "RefreshCw", "Repeat",
    "WalletCards", "Library", "FilePlus", "Gift", "Sparkles", "Layers3",
    "GalleryVerticalEnd", "ListPlus",
  ],
  nerf: [
    "Unlink", "LockKeyholeOpen", "KeyRound", "Scissors", "HeartHandshake", "Sun",
    "Feather", "Wrench", "Bandage", "ShieldOff", "LockOpen", "Link2Off",
    "Sunrise", "WandSparkles",
  ],
  hex: [
    "Skull", "Ghost", "Moon", "CloudFog", "Bug", "Rat", "FlaskConical",
    "Wand", "Tornado", "CloudRain", "Frown", "Worm", "CloudDrizzle",
    "MoonStar",
  ],
  item: [
    "Package", "Gift", "Apple", "Banana", "Cherry", "Citrus", "Candy",
    "Cookie", "Pizza", "IceCreamCone", "CupSoda", "Backpack", "Box",
    "ShoppingBag",
  ],
};

// Resolve each ring once, dropping any name the installed lucide set lacks.
const RINGS: Record<BuffCategory, LucideIcon[]> = Object.fromEntries(
  (Object.entries(RING_NAMES) as [BuffCategory, string[]][]).map(([cat, names]) => [
    cat,
    names.map((n) => resolveLucideIcon(n)).filter((i): i is LucideIcon => !!i),
  ]),
) as Record<BuffCategory, LucideIcon[]>;

// Curated case-matched icons for the most prominent cards (owner request:
// "icons should be more for each case"). Checked BEFORE the ring, after the
// card's own `icon` field, so a def-level icon still wins and everything not
// listed keeps its deterministic ring glyph. Names are validated through the
// same resolver, so a renamed lucide icon degrades to the ring, never crashes.
const CARD_ICON_OVERRIDES: Record<string, string> = {
  // Attack flagships
  nova: "Sparkles",
  meteor: "Flame",
  cataclysmic_meteor: "Flame",
  lightning_strike: "Zap",
  cataclysm: "Mountain",
  extinction: "Bone",
  chain_atomic: "Radiation",
  total_atomic: "Radiation",
  atomic_captures: "Radiation",
  annihilation: "Crosshair",
  total_annihilation: "Crosshair",
  detonate: "Bomb",
  shatter: "Gem",
  queens_rampage: "Crown",
  siege_rook: "Castle",
  void: "Orbit",
  abyss: "Orbit",
  void_realm: "Orbit",
  // Time & tempo
  time_skip: "FastForward",
  time_lock: "Lock",
  time_freeze: "Snowflake",
  time_prison: "Hourglass",
  time_rewind: "History",
  perfect_rewind: "RotateCcw",
  full_rewind: "RotateCcw",
  rewind_one: "Undo2",
  blitzkrieg: "Zap",
  world_end: "Globe",
  endless_turn: "Infinity",
  extra_move: "ChevronsRight",
  extra_move_repeat: "ChevronsRight",
  overwhelm: "Swords",
  onslaught: "Flag",
  // Freezes
  mass_freeze: "Snowflake",
  deep_freeze: "ThermometerSnowflake",
  eternal_freeze: "ThermometerSnowflake",
  total_freeze: "Snowflake",
  frost: "Snowflake",
  snap_freeze: "Snowflake",
  // Summons & revives
  phoenix_rebirth: "Bird",
  grand_reset: "RefreshCcw",
  resurrect: "HeartPulse",
  mass_resurrect: "HeartPulse",
  full_resurrection: "HeartPulse",
  grand_summon: "Sparkles",
  kings_legion: "Users",
  summon_knight: "Plus",
  second_army: "Users",
  vanguard: "Shield",
  phantom_rook: "Ghost",
  // Movement grants
  amazon: "Crown",
  amazon_knight: "Crown",
  god_knight: "Crown",
  double_amazon: "Crown",
  triple_amazon: "Crown",
  amazon_army: "Crown",
  royal_ascension: "Crown",
  colossus: "Mountain",
  titan: "Mountain",
  titan_legion: "Mountain",
  eternal_reign: "Crown",
  godslayer_knight: "Sword",
  camel_knight: "Footprints",
  long_knight: "MoveDiagonal",
  teleport_knight: "Sparkle",
  dragon_pawn: "Flame",
  kingslide: "ChevronsRight",
  overclock: "Gauge",
  overclock_major: "Gauge",
  // Protection
  aegis: "ShieldCheck",
  immortal_king: "ShieldCheck",
  divine_fortress: "Church",
  rampart: "Fence",
  sanctuary: "House",
  fortress: "Castle",
  chain_mail: "Link",
  bulwark: "BrickWall",
  iron_wall: "BrickWall",
  checkmate_immunity: "ShieldAlert",
  iron_reign: "ShieldCheck",
  // Info / draft / misc
  peek: "Eye",
  extra_glance: "Eye",
  watchtower: "Binoculars",
  patch_notes: "FileText",
  nerf_breaker: "Unlink",
  chess_diff: "GitBranch",
  mirror: "Copy",
  buff_thief: "Hand",
  buff_thief_minor: "Hand",
  trade_up: "TrendingUp",
};

// Small stable string hash (FNV-1a); only spread matters, not quality.
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The face icon for a card: its own `icon` when set, then a curated
 * case-matched override, otherwise a distinct glyph drawn deterministically
 * from its category's ring. Returns undefined only if a ring somehow resolves
 * empty (the caller falls back to the category glyph). */
export function cardFaceIcon(
  id: string,
  category: BuffCategory,
  icon?: string,
): LucideIcon | undefined {
  const own = resolveLucideIcon(icon) ?? resolveLucideIcon(CARD_ICON_OVERRIDES[id]);
  if (own) return own;
  const ring = RINGS[category];
  if (!ring || ring.length === 0) return undefined;
  return ring[hashId(id) % ring.length];
}
