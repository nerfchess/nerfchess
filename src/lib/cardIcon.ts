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
//   Pass 1 — cards with a curated CARD_ICON_OVERRIDES entry claim it first.
//            Overrides are the hand-picked, name-matched faces (owner
//            directive: every tier 7+ card wears an icon that MATCHES ITS
//            NAME), so they outrank a card's own `icon` field — living_god
//            must get its god face even though its def says "Sparkles".
//            The override table is kept collision-free, so every entry lands.
//   Pass 2 — cards still unassigned claim their explicit `icon` field
//            (first claimant in stable id order wins).
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

// Curated case-matched icons (owner directives: "icons should be more for
// each case" and "every card above 7 must be unique and distinct and actually
// MATCH THE CARD NAME"). These SEED PASS 1 of the unique assignment, so every
// entry here wins its icon outright — which is why the table itself must stay
// collision-free: NO icon name may appear twice below (the dev guard at the
// bottom of the file enforces it). The first block hand-picks a distinct,
// name-matched face for EVERY tier 7+ card in the shipped library; the second
// block keeps the older lower-tier flagship picks, de-duplicated against the
// tier 7+ set. Names are validated through the resolver, so a renamed lucide
// icon degrades gracefully (the card falls through to its own icon / probe).
const CARD_ICON_OVERRIDES: Record<string, string> = {
  // ---- Tier 10 — apex ----
  ascendancy: "Sunrise", // the whole host ascends
  grand_army: "UsersRound", // a whole fresh army answers
  oblivion: "Eclipse", // the enemy army's light snuffed out
  total_war: "Swords", // all-out war
  // ---- Tier 9 ----
  blackout: "PowerOff", // the lights go out
  culling: "Skull", // The Culling
  divine_right: "ScrollText", // the royal charter from on high
  grand_conjunction: "Orbit", // the planets align
  ice_age: "Snowflake", // the definitive freeze
  iron_legion: "Anvil", // iron-forged reinforcements
  living_god: "Sun", // the most god-like face there is
  mass_petrify: "Landmark", // a court of stone columns/statues
  regicide: "Axe", // the regicide's headsman axe
  resurrection: "Cross", // risen from the grave
  second_coming: "Rainbow", // the sign in the heavens
  // ---- Tier 8 ----
  abdication_edict: "Scroll", // the signed edict
  absolute_aegis: "Umbrella", // nothing gets through
  absolute_nullify: "CircleSlash", // cancelled, absolutely
  absolute_zero: "Thermometer", // the temperature card
  age_of_heroes: "Star", // heroes of legend
  amazon_army: "Award", // the whole army decorated
  ban_hammer: "Hammer", // THE hammer
  blighted_furrows: "Tractor", // ruined plough-lines
  blitzkrieg: "Zap", // lightning war
  bombardiro_croc: "Plane", // the crocodile bomber run
  cataclysmic_meteor: "Flame", // the burning sky-rock
  celestial_alignment: "MoonStar", // moon and stars in accord
  crown_and_castle: "Lock", // king and rook locked down
  divine_fortress: "Church", // the cathedral ward
  draft_supremacy: "Trophy", // you win the draft
  endless_night: "Moon", // night without dawn
  endless_turn: "Repeat2", // again and again
  eternal_freeze: "ThermometerSnowflake", // cold that never lifts
  everfrost_shard: "Diamond", // the frozen shard
  extinction: "Bone", // dinosaur-grade wipeout
  full_resurrection: "HeartPulse", // hearts beating again
  genesis: "Sprout", // life created anew
  grand_reset: "RefreshCcw", // back to full strength
  heavens_wrath: "CloudLightning", // bolts from the split sky
  immortal_king: "ShieldCheck", // the king, guaranteed
  leaden_limbs: "Weight", // limbs of lead
  mass_mind_control: "BrainCircuit", // every mind rewired
  medusa_stare: "Eye", // the petrifying gaze
  peace_of_the_grave: "Shovel", // six feet of quiet
  perfect_rewind: "RotateCcw", // wound back perfectly
  petrified_forest: "Trees", // a forest turned to stone
  phoenix_rebirth: "Bird", // the phoenix itself
  poisoned_counsel: "Wine", // the tainted goblet
  queen_storm: "CloudRainWind", // a storm of queens
  queens_apocalypse: "Siren", // the air-raid warning
  reality_warp: "Dna", // reality twisted strand by strand
  sacked_capital: "Building", // the capital, sacked
  scorched_earth: "FlameKindling", // ground burnt to kindling
  sealed_ramparts: "Fence", // ramparts barred shut
  sundering: "Scissors", // protections cut apart
  time_prison: "Hourglass", // caged in stopped sand
  titan_legion: "Pyramid", // colossal monuments on the march
  total_annihilation: "Crosshair", // three targets, zero survivors
  total_atomic: "Atom", // the full atomic option
  total_plunder: "Coins", // everything looted
  total_warp: "Move3d", // space folded wholesale
  transcendence: "ArrowBigUpDash", // rising beyond
  void_realm: "CircleDashed", // hungry outlines in the board
  we_stoneskin: "Shell", // skin hard as shell
  world_end: "Globe", // the world itself
  // ---- Tier 7 ----
  abyss: "ChevronsDown", // down and down forever
  aegis: "Shield", // the shield, plainly
  aegis_of_ages: "ShieldPlus", // the ancient ward, and then some
  amazon: "Crown", // the queen crowned an Amazon
  annihilation: "Target", // two marks, erased
  blood_pact: "Droplets", // signed in blood
  buff_plunder: "HandCoins", // their riches, your hand
  chain_atomic: "Radiation", // the chain reaction
  chaos_theory: "Tornado", // the board-sweeping twister
  checkmate_denial: "ShieldAlert", // mate, denied
  chisel_curse: "Pickaxe", // chipped away stroke by stroke
  cockatrice_gaze: "ScanEye", // the scanning stare
  contagion: "Biohazard", // catching cold, literally
  deep_freeze: "MountainSnow", // glacial depths
  divine_legion: "ShieldHalf", // soldiers under half-shields of light
  draft_tyranny: "Gavel", // the draft ruled by decree
  dragonslayer: "Worm", // the wyrm, slain
  eternal_reign: "Infinity", // a reign without end
  fortress_realm: "Castle", // the realm made a fortress
  frozen_solid: "IceCreamCone", // frozen solid, comically so
  full_pardon: "Handshake", // all is forgiven
  full_rewind: "SkipBack", // right back to the start
  glacial_tomb: "Refrigerator", // sealed in the cold box
  godslayer_knight: "Sword", // the god-killing blade
  grand_malediction: "Wand", // the curse pronounced
  grand_nullify: "Ban", // no. just no
  grand_resurrection: "HandHeart", // life handed back
  grand_retreat: "Undo2", // everyone falls back
  great_divide: "Columns2", // the board split in two
  hex_of_stone: "BrickWall", // flanks hardened to masonry
  jackpot: "Cherry", // the slot-machine cherries
  kings_legion: "Users", // the king's own warband
  lost_fortnight: "CalendarX", // two weeks, gone
  meteor: "Rocket", // the thing streaking down
  mind_empire: "Brain", // an empire of minds
  molten_heart: "HeartCrack", // the heart cracks and runs molten
  necromancer: "Ghost", // the raised spectre
  nerf_reversal: "RefreshCw", // the nerf, turned back on its sender
  noble_rout: "LogOut", // the nobles flee
  obsidian_bastions: "TowerControl", // black glass towers
  onslaught: "Flag", // the charge banner
  orb_of_dominion: "CircleDot", // the orb itself
  overclocked: "Gauge", // needle in the red
  philosophers_stone: "FlaskConical", // the alchemist's vessel
  phoenix_line: "Feather", // a line of phoenix feathers
  purge_realm: "Eraser", // half the board, erased
  queens_rampage: "Slice", // one clean sweep
  rift_storm: "Waypoints", // scattered through rifts
  ruin: "ArrowBigDown", // the ground gives way
  sabbatical: "TreePalm", // gone on holiday
  salted_earth: "WheatOff", // nothing grows here again
  sealed_archive: "Archive", // the archive, sealed
  soul_harvest: "Wheat", // the reaper's harvest
  sovereign_draft: "WalletCards", // the draft, commanded
  statue_garden: "Flower2", // a garden of stone
  summon_dragon: "Egg", // the hatchling follows her in
  summoning_circle: "Pentagon", // the chalked pentacle
  throne_and_silence: "Armchair", // the empty throne
  time_freeze: "TimerOff", // the clock stops dead
  titan: "Mountain", // one piece, mountain-sized
  triple_amazon: "Medal", // three coronations
  unshackled_wrath: "Unlink", // the chains come off
  wa_dominate_major: "Magnet", // pulled to your side
  walnut_court: "Nut", // the court, walnutted
  warp_cataclysm: "Shuffle", // everything everywhere shuffled
  warp_sovereign: "WandSparkles", // warp at a wand-wave
  wc_genie_wish: "Lamp", // the genie's lamp
  we_landslide: "ArrowBigDownDash", // the hillside comes down fast
  we_whiteout: "CloudSnow", // the blizzard
  withered_hands: "Hand", // the withered grip
  world_lock: "LockKeyhole", // the whole draft, keyholed
  ww_dug_in_defense: "HardHat", // heads down in the trench
  // ---- Lower-tier flagships (kept hand-picked, de-duplicated) ----
  // Attack
  nova: "Sparkles",
  cataclysm: "Split",
  detonate: "Bomb",
  shatter: "Gem",
  siege_rook: "Construction",
  void: "CircleOff",
  // Time & tempo
  time_skip: "FastForward",
  time_rewind: "History",
  rewind_one: "Undo",
  extra_move: "ChevronsRight",
  extra_move_repeat: "StepForward",
  // Summons & revives
  resurrect: "Heart",
  mass_resurrect: "HeartHandshake",
  summon_knight: "Plus",
  second_army: "UserPlus",
  // Movement grants
  royal_ascension: "ArrowBigUp",
  colossus: "PersonStanding",
  camel_knight: "Footprints",
  long_knight: "MoveDiagonal",
  teleport_knight: "Sparkle",
  kingslide: "ArrowRightToLine",
  // Protection
  sanctuary: "House",
  chain_mail: "Link",
  checkmate_immunity: "ShieldX",
  // Info / draft / misc
  peek: "Glasses",
  watchtower: "Binoculars",
  patch_notes: "FileText",
  nerf_breaker: "Link2Off",
  chess_diff: "GitBranch",
  mirror: "Copy",
  buff_thief: "Grab",
  trade_up: "TrendingUp",
  // Gambling wheels (owner add-on: the gambling cards are a matched set)
  wheel_of_fortune: "FerrisWheel",
  roulette: "Disc",
  gamble: "Dices",
  zodiac_wheel: "Telescope",
  wa_high_roll: "Dice5",
  wa_arcane_reroll: "Dice3",
  lucky: "Clover",
  gambler: "Spade",
  unlucky: "Dice1", // snake eyes
  // On-board placements (owner: traps should have a matching icon too)
  banana_peel: "Banana",
  whoopee_cushion: "Wind",
  minefield: "TriangleAlert",
  trapdoor: "DoorOpen",
  sinkhole: "LoaderPinwheel",
  bear_trap: "PawPrint",
  landlord: "BadgeDollarSign",
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

  // Pass 1: curated overrides claim first — the hand-picked, name-matched
  // faces (all tier 7+ cards among them) always win their icon. The table is
  // collision-free (dev guard below), so every entry lands.
  for (const c of cards) tryClaim(c.id, CARD_ICON_OVERRIDES[c.id]);

  // Pass 2: remaining cards claim their own `icon` field, if still free
  // (first claimant in stable id order wins).
  for (const c of cards) {
    if (!assigned.has(c.id)) tryClaim(c.id, c.icon);
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
    // The override table must stay collision-free (pass 1 assumes it) and
    // every name must resolve against the installed lucide catalog.
    const seen = new Map<string, string>();
    for (const [id, name] of Object.entries(CARD_ICON_OVERRIDES)) {
      const key = canonicalIconName(name);
      if (!key) {
        console.warn(`[cardIcon] override for "${id}" names unknown lucide icon "${name}".`);
        continue;
      }
      const prev = seen.get(key);
      if (prev) {
        console.warn(
          `[cardIcon] override collision: "${id}" and "${prev}" both want "${key}" — the first in id order wins, the other probes.`,
        );
      } else {
        seen.set(key, id);
      }
    }
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
