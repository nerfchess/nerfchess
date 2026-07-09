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

// Small stable string hash (FNV-1a); only spread matters, not quality.
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The face icon for a card: its own `icon` when set, otherwise a distinct
 * glyph drawn deterministically from its category's ring. Falls back to the
 * ring's first entry only if a ring somehow resolves empty. */
export function cardFaceIcon(
  id: string,
  category: BuffCategory,
  icon?: string,
): LucideIcon | undefined {
  const own = resolveLucideIcon(icon);
  if (own) return own;
  const ring = RINGS[category];
  if (!ring || ring.length === 0) return undefined;
  return ring[hashId(id) % ring.length];
}
