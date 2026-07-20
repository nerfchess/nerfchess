// Per-card face icons with NO per-card data entry required — and NO two cards
// sharing a face — resolved from a BUILD-TIME generated map.
//
// History: 564 of the first 735 implemented cards carried no `icon`, so whole
// hands rendered the same category glyph. The first fix hashed each iconless
// card into a small per-category "ring" of ~14 thematic glyphs; the second
// gave every card a GLOBALLY UNIQUE lucide icon via a three-pass claim
// algorithm (curated overrides -> card's own `icon` field -> open-address
// probe over the full sorted catalog keyed by FNV-1a(id)) that ran in the
// browser at module load. That version had to `import { icons }` — the ENTIRE
// ~1500-component lucide catalog — which defeated tree-shaking and shipped
// every icon to every client, plus it re-sorted two 1000+-card libraries on
// every page load.
//
// NOW the exact same algorithm runs once at BUILD TIME:
//
//   scripts/gen-card-icons.mjs  ->  src/lib/cardIconMap.gen.ts
//
// The generated file holds the id -> icon-name map (CARD_ICON_NAMES) plus a
// name -> component registry (GEN_ICON_COMPONENTS) built from per-icon named
// imports, which Next's default optimizePackageImports for lucide-react
// rewrites into per-icon deep imports — only icons actually assigned to a
// card ship. Determinism and uniqueness guarantees are unchanged (same
// algorithm, same inputs, verified at generation time), and the assignment is
// bit-identical to what the runtime version produced, so every shipped card
// keeps the face players know.
//
// WHEN TO REGENERATE — after adding/removing/renaming cards in the libraries,
// moving a card between nerfs and buffs, changing a card's `icon` field, or
// editing the curated CARD_ICON_OVERRIDES table (which now lives in
// scripts/gen-card-icons.mjs, since it is generation input):
//
//   npm run gen:icons
//
// Forgetting is loud but not fatal: `npm run test:rules` runs the generator
// in --check mode and fails CI if the map is stale, and in dev this module
// warns at load for any library card missing from the map (the card falls
// back to its own `icon` field, then to its category ring, until you
// regenerate).
//
// The per-category rings below are kept ONLY as a last-resort fallback for
// ids that are not in the generated map (e.g. a stale id arriving over the
// wire from a newer server build); library cards never reach them.

import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  Anchor,
  Apple,
  ArrowUpRight,
  Axe,
  Baby,
  Backpack,
  Banana,
  Bandage,
  Binoculars,
  Bird,
  Bomb,
  BookOpen,
  Box,
  Boxes,
  Bug,
  CalendarClock,
  Candy,
  Castle,
  Cat,
  Cherry,
  CircleDot,
  Citrus,
  Clock,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Compass,
  Cookie,
  Copy,
  Crosshair,
  Crown,
  CupSoda,
  Dices,
  Egg,
  Eye,
  FastForward,
  Feather,
  Fence,
  FilePlus,
  Fingerprint,
  Flame,
  Flashlight,
  FlaskConical,
  Footprints,
  Frown,
  GalleryVerticalEnd,
  Gauge,
  Ghost,
  Gift,
  Glasses,
  Hammer,
  HardHat,
  HeartHandshake,
  Heater,
  History,
  Hourglass,
  IceCreamCone,
  Infinity as InfinityIcon,
  IterationCw,
  KeyRound,
  Landmark,
  Layers,
  Layers3,
  Library,
  LifeBuoy,
  Lightbulb,
  Link2Off,
  ListPlus,
  Lock,
  LockKeyholeOpen,
  LockOpen,
  MapPin,
  Milestone,
  Moon,
  MoonStar,
  MoveDiagonal,
  Newspaper,
  Package,
  PersonStanding,
  Pizza,
  Puzzle,
  Rabbit,
  Radar,
  Rat,
  RefreshCw,
  Repeat,
  Rewind,
  Rocket,
  Route,
  ScanEye,
  Scissors,
  Search,
  SearchCheck,
  Shapes,
  Shield,
  ShieldCheck,
  ShieldHalf,
  ShieldOff,
  ShieldPlus,
  ShoppingBag,
  Shuffle,
  Signal,
  Skull,
  Slice,
  Snail,
  Sparkles,
  Squirrel,
  Sun,
  Sunrise,
  Sword,
  Swords,
  Target,
  Telescope,
  Tent,
  Timer,
  TimerReset,
  Tornado,
  Turtle,
  Umbrella,
  Unlink,
  UserPlus,
  Users,
  WalletCards,
  Wand,
  WandSparkles,
  Watch,
  Waypoints,
  Wind,
  Worm,
  Wrench,
  Zap,
} from "lucide-react";
import type { BuffCategory } from "@/engine/buff";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { CARD_ICON_NAMES, GEN_ICON_COMPONENTS } from "./cardIconMap.gen";

/** Canonicalize an icon name to its PascalCase key in the shipped registry.
 * Accepts both the export key ("Bomb") and lucide's kebab-case id
 * ("shield-alert"). Unknown, misspelled, or NOT-SHIPPED names return
 * undefined so a bad name never crashes (the caller falls back). */
function canonicalIconName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  // Object.hasOwn (not `in`): the registry is a plain object literal, and ids
  // arrive off the wire — "constructor" must not resolve via the prototype.
  if (Object.hasOwn(GEN_ICON_COMPONENTS, name)) return name;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m: string, _s: string, c: string) =>
    c.toUpperCase(),
  );
  return Object.hasOwn(GEN_ICON_COMPONENTS, pascal) ? pascal : undefined;
}

/** Resolve a lucide icon NAME to its component. Accepts both the PascalCase
 * export key ("Bomb") and lucide's kebab-case id ("shield-alert"). Resolves
 * against the generated registry — every icon any shipped card references —
 * NOT the full lucide catalog (that is the whole point: the catalog no longer
 * ships). A name outside the registry returns undefined, same as a typo. */
export function resolveLucideIcon(name: string | undefined): LucideIcon | undefined {
  const key = canonicalIconName(name);
  return key ? GEN_ICON_COMPONENTS[key] : undefined;
}

// Thematic rings, one per category — LEGACY FALLBACK ONLY (see header). Kept
// so an id outside the generated map still draws a plausible glyph for its
// category instead of nothing. Order matters (it is the hash space), so
// append new components rather than reordering. These are direct component
// references (not names) so the fallback works even for icons no card
// currently claims, and a renamed lucide export fails the build loudly
// instead of silently dropping out of the ring.
const RINGS: Record<BuffCategory, LucideIcon[]> = {
  movement: [
    Wind, Footprints, Rocket, Rabbit, Feather, Compass, Route,
    Zap, Bird, Milestone, Gauge, MoveDiagonal, ArrowUpRight, Waypoints,
  ],
  pieces: [
    Castle, Crown, Users, Ghost, Egg, Shapes, PersonStanding,
    Puzzle, Boxes, UserPlus, Landmark, Baby, Squirrel, Cat,
  ],
  tempo: [
    Timer, Clock, Hourglass, AlarmClock, Watch, History,
    FastForward, Rewind, Snail, Turtle, CalendarClock, TimerReset,
    InfinityIcon, IterationCw,
  ],
  protection: [
    Shield, ShieldCheck, ShieldPlus, Umbrella, Lock, LifeBuoy,
    HardHat, Fence, Anchor, Heater, Landmark, CircleDot,
    ShieldHalf, Tent,
  ],
  attack: [
    Swords, Sword, Bomb, Flame, Axe, Hammer, Crosshair,
    Target, CloudLightning, Scissors, Slice, Tornado, Skull,
    Flashlight,
  ],
  info: [
    Eye, Search, Telescope, Binoculars, Radar, ScanEye,
    Glasses, Lightbulb, MapPin, Fingerprint, BookOpen, Newspaper,
    SearchCheck, Signal,
  ],
  draft: [
    Layers, Copy, Shuffle, Dices, RefreshCw, Repeat,
    WalletCards, Library, FilePlus, Gift, Sparkles, Layers3,
    GalleryVerticalEnd, ListPlus,
  ],
  nerf: [
    Unlink, LockKeyholeOpen, KeyRound, Scissors, HeartHandshake, Sun,
    Feather, Wrench, Bandage, ShieldOff, LockOpen, Link2Off,
    Sunrise, WandSparkles,
  ],
  hex: [
    Skull, Ghost, Moon, CloudFog, Bug, Rat, FlaskConical,
    Wand, Tornado, CloudRain, Frown, Worm, CloudDrizzle,
    MoonStar,
  ],
  item: [
    Package, Gift, Apple, Banana, Cherry, Citrus, Candy,
    Cookie, Pizza, IceCreamCone, CupSoda, Backpack, Box,
    ShoppingBag,
  ],
};

// Small stable string hash (FNV-1a); only spread matters, not quality. Must
// stay identical to scripts/gen-card-icons.mjs (it is the probe hash there;
// here it only picks ring slots for out-of-map ids).
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Dev-only invariant: the generated map must cover every card in the shipped
// libraries. A miss means someone changed the libraries without regenerating
// (see header) — warn loudly; the affected cards fall back below. The library
// id set also lets cardFaceIcon distinguish "stale generated map" (loud)
// from "unknown id off the wire" (quiet ring fallback, as always).
const DEV_LIBRARY_IDS: Set<string> | null =
  process.env.NODE_ENV !== "production"
    ? new Set([...ALL_NERFS, ...ALL_BUFFS].map((c) => c.id))
    : null;
if (DEV_LIBRARY_IDS) {
  const missing = [...DEV_LIBRARY_IDS].filter((id) => !Object.hasOwn(CARD_ICON_NAMES, id));
  if (missing.length > 0) {
    console.warn(
      `[cardIcon] generated icon map is STALE: ${missing.length} library card(s) missing ` +
        `(${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", ..." : ""}). ` +
        "They fall back to their own `icon`/category ring until you run: npm run gen:icons",
    );
  }
}

/** The face icon for a card. For every card in the shipped libraries this is
 * its globally unique build-time assignment (no two cards share a face — see
 * header). Ids outside the generated map fall back to the old behavior: own
 * `icon` field (resolved against the shipped registry), then a deterministic
 * glyph from the category ring. Returns undefined only if even the ring
 * resolves empty (the caller falls back to the plain category glyph). */
export function cardFaceIcon(
  id: string,
  category: BuffCategory,
  icon?: string,
): LucideIcon | undefined {
  const name = Object.hasOwn(CARD_ICON_NAMES, id) ? CARD_ICON_NAMES[id] : undefined;
  if (name && Object.hasOwn(GEN_ICON_COMPONENTS, name)) {
    return GEN_ICON_COMPONENTS[name];
  }
  if (DEV_LIBRARY_IDS?.has(id)) {
    console.error(
      `[cardIcon] library card "${id}" has no generated face icon. Run: npm run gen:icons`,
    );
  }
  const own = resolveLucideIcon(icon);
  if (own) return own;
  const ring = RINGS[category];
  if (!ring || ring.length === 0) return undefined;
  return ring[hashId(id) % ring.length];
}

/** Face icon for a nerf card: same globally unique map as buffs (nerfs are
 * sorted first at generation time, so they get first pick of their own icon
 * names), falling back through the "nerf" category ring for ids outside the
 * generated map. */
export function nerfFaceIcon(id: string, icon?: string): LucideIcon | undefined {
  return cardFaceIcon(id, "nerf", icon);
}
