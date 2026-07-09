// Per-card face icons with NO per-card data entry required — and, as of the
// uniqueness pass below, NO two cards sharing a face.
//
// History: 564 of the first 735 implemented cards carried no `icon`, so whole
// hands rendered the same category glyph. The first fix hashed each iconless
// card into a small per-category "ring" of ~14 thematic glyphs, which made
// hands readable but still produced huge collision groups once the libraries
// grew past 1000 cards (19 cards wearing Crown, 19 wearing Ghost, ...).
//
// Now every card in the shipped libraries gets a GLOBALLY UNIQUE lucide icon,
// assigned deterministically at module load from the full lucide catalog
// (~1500+ icons vs ~1100 cards, so a free slot always exists):
//
//   Pass 1 — cards with an explicit `icon` field claim that icon
//            (first claimant in stable id order wins).
//   Pass 2 — cards still unassigned that have a CARD_ICON_OVERRIDES entry
//            claim it if the icon is still free.
//   Pass 3 — every remaining card open-address-probes the sorted catalog:
//            start at FNV-1a(id) % catalog.length, walk forward to the first
//            unclaimed icon, claim it.
//
// Determinism: the card lists are sorted by id (nerfs first, then buffs), the
// catalog is sorted by icon name, and the hash is a pure function of the card
// id — no randomness, no insertion-order dependence — so every surface (draft
// offers, dock, codex, toasts) shows the same icon for the same card, on every
// client, across reloads. Uniqueness: each pass claims icons from one shared
// `claimed` set and pass 3 only ever stops on an unclaimed slot, so no icon
// name can be assigned twice as long as cards <= catalog size (guarded below).
//
// The old per-category rings are kept ONLY as a last-resort fallback for ids
// that are not in the shipped libraries (e.g. a stale id arriving over the
// wire from a newer server build); library cards never reach them.

import { icons as LucideIcons, type LucideIcon } from "lucide-react";
import type { BuffCategory } from "@/engine/buff";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";

/** Canonicalize a lucide icon name to its PascalCase export key. Accepts both
 * the export key ("Bomb") and lucide's kebab-case id ("shield-alert").
 * Unknown or misspelled names return undefined so a bad name never crashes. */
function canonicalIconName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (name in LucideIcons) return name;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m: string, _s: string, c: string) =>
    c.toUpperCase(),
  );
  return pascal in LucideIcons ? pascal : undefined;
}

/** Resolve a lucide icon NAME to its component. Accepts both the PascalCase
 * export key ("Bomb") and lucide's kebab-case id ("shield-alert"). Unknown or
 * misspelled names return undefined so a bad name can never crash a card. */
export function resolveLucideIcon(name: string | undefined): LucideIcon | undefined {
  const key = canonicalIconName(name);
  return key ? (LucideIcons[key as keyof typeof LucideIcons] as LucideIcon) : undefined;
}

// Thematic rings, one per category — LEGACY FALLBACK ONLY (see header). Kept
// so an id outside the shipped libraries still draws a plausible glyph for
// its category instead of nothing. Order matters (it is the hash space), so
// append new names rather than reordering.
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
// "icons should be more for each case"). These SEED PASS 2 of the unique
// assignment: a card whose override icon is still unclaimed keeps it, so the
// flagship faces stay hand-picked; when several cards share an override name
// (e.g. the five Crown variants) the first in id order keeps it and the rest
// get a unique probe-assigned face instead of colliding. Names are validated
// through the resolver, so a renamed lucide icon degrades gracefully.
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

// The full lucide catalog, sorted by export name for determinism. lucide's
// `icons` object maps PascalCase name -> component and contains only the
// canonical set (no deprecated aliases), ~1500+ entries.
const CATALOG: readonly string[] = Object.keys(LucideIcons).sort();

/** id -> globally unique face icon for every card in the shipped libraries.
 * Built once at module load by the three-pass claim algorithm described in
 * the file header. Pure function of the library contents + lucide catalog. */
const UNIQUE_FACE: ReadonlyMap<string, LucideIcon> = (() => {
  const byId = <T extends { id: string }>(a: T, b: T) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

  // Stable card order: all nerfs sorted by id, then all buffs sorted by id.
  // De-dupe defensively (a repeated id would just share one face, which is
  // the only sane outcome for a lookup keyed by id anyway).
  const cards: { id: string; icon?: string }[] = [];
  const seenIds = new Set<string>();
  for (const c of [...[...ALL_NERFS].sort(byId), ...[...ALL_BUFFS].sort(byId)]) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    cards.push({ id: c.id, icon: c.icon });
  }

  const claimed = new Set<string>(); // canonical icon names already taken
  const assigned = new Map<string, string>(); // card id -> canonical icon name

  const tryClaim = (id: string, name: string | undefined): boolean => {
    const key = canonicalIconName(name);
    if (!key || claimed.has(key)) return false;
    claimed.add(key);
    assigned.set(id, key);
    return true;
  };

  // Pass 1: a card's own `icon` field claims its icon (first claimant wins).
  for (const c of cards) tryClaim(c.id, c.icon);

  // Pass 2: curated overrides claim theirs, if still free.
  for (const c of cards) {
    if (!assigned.has(c.id)) tryClaim(c.id, CARD_ICON_OVERRIDES[c.id]);
  }

  // Pass 3: everyone else open-address-probes the catalog from hash(id).
  // Terminates because cards.length < CATALOG.length (guarded), and always
  // lands on a FREE slot — which is the uniqueness guarantee.
  const n = CATALOG.length;
  for (const c of cards) {
    if (assigned.has(c.id)) continue;
    if (claimed.size >= n) break; // catalog exhausted; card falls back to its ring
    let slot = hashId(c.id) % n;
    while (claimed.has(CATALOG[slot])) slot = (slot + 1) % n;
    claimed.add(CATALOG[slot]);
    assigned.set(c.id, CATALOG[slot]);
  }

  // Dev-only invariant guard: every card assigned, no icon assigned twice.
  if (process.env.NODE_ENV !== "production") {
    if (assigned.size !== cards.length) {
      console.warn(
        `[cardIcon] ${cards.length - assigned.size} of ${cards.length} cards have no ` +
          `unique face icon (lucide catalog: ${n}). They will fall back to category rings.`,
      );
    }
    if (new Set(assigned.values()).size !== assigned.size) {
      console.warn("[cardIcon] duplicate face icon assignment detected — algorithm bug.");
    }
  }

  return new Map(
    [...assigned].map(([id, name]) => [
      id,
      LucideIcons[name as keyof typeof LucideIcons] as LucideIcon,
    ]),
  );
})();

/** The face icon for a card. For every card in the shipped libraries this is
 * its globally unique assignment (no two cards share a face — see header).
 * Ids outside the libraries fall back to the old behavior: own `icon`, then
 * curated override, then a deterministic glyph from the category ring.
 * Returns undefined only if even the ring resolves empty (the caller falls
 * back to the plain category glyph). */
export function cardFaceIcon(
  id: string,
  category: BuffCategory,
  icon?: string,
): LucideIcon | undefined {
  const unique = UNIQUE_FACE.get(id);
  if (unique) return unique;
  const own = resolveLucideIcon(icon) ?? resolveLucideIcon(CARD_ICON_OVERRIDES[id]);
  if (own) return own;
  const ring = RINGS[category];
  if (!ring || ring.length === 0) return undefined;
  return ring[hashId(id) % ring.length];
}

/** Face icon for a nerf card: same globally unique map as buffs (nerfs are
 * sorted first, so they get first pick of their own icon names), falling back
 * through the "nerf" category ring for ids outside the shipped library. */
export function nerfFaceIcon(id: string, icon?: string): LucideIcon | undefined {
  return cardFaceIcon(id, "nerf", icon);
}
