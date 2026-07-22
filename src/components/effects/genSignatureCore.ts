// genSignatureCore.ts — the PURE generated-signature grammar: types, family
// definitions, the deterministic per-card config derivation, and the dev
// uniqueness self-check. Split out of genSignature.tsx (which keeps the
// renderers and the CSS import) so BUILD-TIME tools (scripts/audit-animations)
// can import the config derivation under tsx, where a CSS import would fail.
// No React, no CSS, no side effects.

import type { PieceType } from "@/engine/types";
import { ALL_BUFFS, BUFF_BY_ID } from "@/engine/buffs/library";

// --- Public types -----------------------------------------------------------

/** Mirrors BoardEffects' SigOrdering (kept local to avoid the import cycle). */
export type GenOrdering = "file" | "sweep" | "octagon" | "line" | "radial";

/** Mirrors BoardEffects' SigSoundKey: every generated family maps onto one of
 * the ALREADY-SHIPPED signature voices, so no new audio is required. */
export type GenSoundKey =
  | "nova"
  | "cataclysm"
  | "extinction"
  | "lightning"
  | "atomic"
  | "rampage"
  | "siege"
  | "coronation"
  | "crownrain"
  | "colossus"
  | "snooze"
  | "clockcage"
  | "clockice"
  | "blitz"
  | "massfreeze"
  | "petrify"
  | "petrifiedforest"
  | "aegis"
  | "cathedral"
  | "shades"
  | "wall";

/** The 37 generated choreography families. */
export type GenFamily =
  | "frostbloom" // ice crystals grow out of the square's center
  | "emberfall" // embers cascade down while a flame licks up
  | "stonecarve" // a slab cracks and stone chips fly
  | "clockwork" // a gear ring ticks a hard quarter turn
  | "hourglass" // an hourglass drops in while its sand column drains
  | "arcaneRunes" // a dashed spell circle inscribes around a stamped rune
  | "hexSigil" // a jagged curse sigil slams down and drips
  | "pawnTide" // ranks of chevrons march up the square
  | "knightVault" // hoof prints arc across with a landing dust ring
  | "rookRampart" // a crenellated rampart builds up from the ground
  | "bishopCross" // two diagonal beams snap across each other
  | "queenRadiance" // a full 8-12 ray coronal flare
  | "kingsDecree" // a royal seal stamps, ribbons fall
  | "crownGleam" // a crown rises through popping gleams
  | "bannerRally" // a pole shoots up and its pennant snaps out
  | "drumShock" // heavy concentric shockwaves under a dropped drum
  | "shieldDome" // dome ribs assemble over the square
  | "thornRing" // a bramble ring stamps in, leaves flick up
  | "chainSnap" // a chain pulls taut across the square and snaps
  | "shadowVeil" // an ink wash sweeps over, wisps curl away
  | "lanternFloat" // a spirit lantern floats up trailing motes
  | "featherBurst" // feathers puff out and drift down
  | "tideSweep" // a wave crest washes across, droplets leap
  | "gustSpiral" // a wind spiral spins through streaking air lines
  | "sparkArc" // jagged arcs jump around a crackling bolt
  | "swapHelix" // two orbs helix around each other, trading places
  | "teleportRift" // a rift slit opens, sparkles, zips shut
  | "mirrorShatter" // a pane flickers then bursts into glass shards
  | "coinFlip" // a coin tumbles high and lands in a ring
  | "diceTumble" // dice bounce and settle
  | "scrollUnfurl" // a scroll rolls open over ghost script lines
  | "quillSign" // a quill slashes a signature, ink drips
  | "prismSplit" // a prism splits light into fanned rays
  | "potionFizz" // a flask drops in and bubbles fizz up
  | "starChart" // a constellation twinkles and connects
  | "gravityWell" // concentric frames collapse into the square
  | "bellToll"; // a bell swings, ripples toll outward

/** Emblem glyphs used by lead flourishes and family cores. */
export type GenGlyph =
  | "pawn"
  | "knight"
  | "rook"
  | "bishop"
  | "queen"
  | "crown"
  | "star"
  | "sun"
  | "snow"
  | "gear"
  | "shield"
  | "bolt"
  | "leaf"
  | "drop"
  | "flame"
  | "scroll"
  | "coin"
  | "die"
  | "bell"
  | "quill"
  | "hourglass"
  | "eye"
  | "link"
  | "feather"
  | "spiral"
  | "rune"
  | "prism"
  | "flask"
  | "banner"
  | "drum"
  | "moon"
  | "skull"
  | "shard"
  | "wave";

/** The generated per-square visual descriptor (the `gen` counterpart of
 * BoardEffects' SigVisual string). GenBurst is the only consumer. */
export interface GenVisual {
  /** Discriminant so the integrator can tell a gen visual from a SigVisual. */
  gen: true;
  family: GenFamily;
  /** Structural layout within the family (0..variants-1). */
  variant: number;
  /** Primary hue (category-keyed, hash-jittered). */
  hue: number;
  /** Accent hue (hash-spread from the primary). */
  hue2: number;
  /** Saturation / lightness, deepened by tier. */
  sat: number;
  light: number;
  /** Shard / mote / ray count where the family uses one. */
  particles: number;
  /** Overall square-local scale, 0.85-1.15. */
  scale: number;
  /** Spin / sweep direction. */
  dir: 1 | -1;
  /** Deterministic layout rotation / jitter seed, 0-359. */
  rot: number;
  /** Emblem used by the lead flourish (and some family cores). */
  glyph: GenGlyph;
  /** Ending flourish (overhaul): every generated play now closes with one of
   * eight hash-picked finishers, so no two cards end the same way either. */
  finisher: GenFinisher;
}

/** The eight generated ending flourishes (see GenFinisherLayer). */
export type GenFinisher =
  | "ringfade"
  | "shardring"
  | "risemotes"
  | "afterglow"
  | "sparkclose"
  | "echopulse"
  | "dustfall"
  | "sealstamp";

const FINISHERS: readonly GenFinisher[] = [
  "ringfade",
  "shardring",
  "risemotes",
  "afterglow",
  "sparkclose",
  "echopulse",
  "dustfall",
  "sealstamp",
];

/** Structurally mirrors BoardEffects' SignatureConfig, with GenVisual in the
 * `visual` slot. Everything except `visual` can be spread straight into the
 * bespoke pipeline (ordering/staggerMs/victims/hasLead/sound line up). */
export interface GenConfig {
  ordering: GenOrdering;
  staggerMs: number;
  victims: PieceType[] | "all";
  mover?: PieceType;
  visual: GenVisual;
  hasLead: boolean;
  sound: GenSoundKey;
}

// --- Deterministic hashing ---------------------------------------------------

/** FNV-1a, identical to src/lib/cardIcon.ts — only spread matters. */
function fnv(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Derive an independent sub-stream from the card hash for dimension `slot`
 * (murmur-style finalizer, so neighbouring slots decorrelate fully). */
function mix(h: number, slot: number): number {
  let x = (h ^ Math.imul(slot + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

const pick = (h: number, slot: number, mod: number): number =>
  mod <= 0 ? 0 : mix(h, slot) % mod;

export const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

// --- Palette ------------------------------------------------------------------

/** Category-keyed base hue; the card hash jitters +-22deg inside the band. */
const CATEGORY_HUE: Record<string, number> = {
  movement: 212, // blue: motion / travel
  pieces: 132, // green: growth / new life
  tempo: 46, // amber: clocks / urgency
  protection: 172, // teal: wards
  attack: 8, // red: violence
  info: 258, // violet: insight
  draft: 304, // magenta: card tricks
  nerf: 92, // lime: relief
  hex: 276, // purple: curses
  item: 30, // orange: consumables
};

export const hsl = (h: number, s: number, l: number): string =>
  `hsl(${(((h % 360) + 360) % 360).toFixed(0)} ${clamp(s, 0, 100).toFixed(0)}% ${clamp(l, 0, 100).toFixed(0)}%)`;

interface Palette {
  main: string; // primary body color
  deep: string; // dark outline / shadow of the primary
  glow: string; // bright core of the primary
  accent: string; // the hash-spread second hue
  pale: string; // washed-out primary for dust / mist
}

export function palette(v: GenVisual): Palette {
  return {
    main: hsl(v.hue, v.sat, v.light),
    deep: hsl(v.hue, v.sat, Math.max(16, v.light - 28)),
    glow: hsl(v.hue, Math.min(96, v.sat + 10), Math.min(88, v.light + 22)),
    accent: hsl(v.hue2, v.sat, clamp(v.light + 8, 34, 78)),
    pale: hsl(v.hue, Math.max(18, v.sat - 30), 86),
  };
}

// --- Family definitions --------------------------------------------------------

type GenLeadStyle = "bloom" | "band" | "rain" | "rise" | "orbit";

interface FamilyDef {
  /** Structural layouts (variant is hash-picked in 0..variants-1). */
  variants: number;
  sound: GenSoundKey;
  lead: GenLeadStyle;
  ordering: GenOrdering;
  /** Base per-square stagger; the hash jitters +-20ms. */
  stagger: number;
  /** Particle-count band. */
  minP: number;
  maxP: number;
  /** Lead-emblem options (hash-picked). */
  glyphs: readonly GenGlyph[];
}

export const FAMILY_DEFS: Record<GenFamily, FamilyDef> = {
  frostbloom: { variants: 4, sound: "massfreeze", lead: "bloom", ordering: "radial", stagger: 55, minP: 4, maxP: 8, glyphs: ["snow", "drop"] },
  emberfall: { variants: 4, sound: "atomic", lead: "rain", ordering: "radial", stagger: 70, minP: 5, maxP: 9, glyphs: ["flame", "sun"] },
  stonecarve: { variants: 4, sound: "petrify", lead: "bloom", ordering: "sweep", stagger: 65, minP: 5, maxP: 8, glyphs: ["rune", "shard"] },
  clockwork: { variants: 3, sound: "clockcage", lead: "orbit", ordering: "radial", stagger: 80, minP: 8, maxP: 12, glyphs: ["gear", "hourglass"] },
  hourglass: { variants: 3, sound: "snooze", lead: "rain", ordering: "radial", stagger: 90, minP: 4, maxP: 7, glyphs: ["hourglass", "moon"] },
  arcaneRunes: { variants: 4, sound: "clockice", lead: "orbit", ordering: "radial", stagger: 75, minP: 5, maxP: 9, glyphs: ["rune", "eye", "moon"] },
  hexSigil: { variants: 4, sound: "petrifiedforest", lead: "bloom", ordering: "sweep", stagger: 70, minP: 4, maxP: 7, glyphs: ["skull", "rune", "eye"] },
  pawnTide: { variants: 4, sound: "blitz", lead: "rise", ordering: "file", stagger: 60, minP: 3, maxP: 5, glyphs: ["pawn"] },
  knightVault: { variants: 3, sound: "rampage", lead: "band", ordering: "sweep", stagger: 85, minP: 3, maxP: 5, glyphs: ["knight"] },
  rookRampart: { variants: 4, sound: "wall", lead: "rise", ordering: "sweep", stagger: 75, minP: 3, maxP: 6, glyphs: ["rook"] },
  bishopCross: { variants: 3, sound: "lightning", lead: "band", ordering: "sweep", stagger: 80, minP: 3, maxP: 6, glyphs: ["bishop"] },
  queenRadiance: { variants: 3, sound: "nova", lead: "bloom", ordering: "radial", stagger: 60, minP: 8, maxP: 12, glyphs: ["queen", "sun"] },
  kingsDecree: { variants: 3, sound: "coronation", lead: "bloom", ordering: "radial", stagger: 70, minP: 3, maxP: 5, glyphs: ["crown"] },
  crownGleam: { variants: 4, sound: "coronation", lead: "rise", ordering: "radial", stagger: 65, minP: 3, maxP: 6, glyphs: ["crown", "star"] },
  bannerRally: { variants: 4, sound: "blitz", lead: "band", ordering: "file", stagger: 70, minP: 3, maxP: 5, glyphs: ["banner"] },
  drumShock: { variants: 3, sound: "colossus", lead: "bloom", ordering: "radial", stagger: 95, minP: 2, maxP: 4, glyphs: ["drum"] },
  shieldDome: { variants: 4, sound: "aegis", lead: "orbit", ordering: "radial", stagger: 55, minP: 3, maxP: 6, glyphs: ["shield"] },
  thornRing: { variants: 3, sound: "petrifiedforest", lead: "bloom", ordering: "sweep", stagger: 65, minP: 5, maxP: 9, glyphs: ["leaf"] },
  chainSnap: { variants: 3, sound: "siege", lead: "band", ordering: "line", stagger: 75, minP: 4, maxP: 6, glyphs: ["link"] },
  shadowVeil: { variants: 4, sound: "shades", lead: "band", ordering: "sweep", stagger: 70, minP: 3, maxP: 6, glyphs: ["moon", "skull", "eye"] },
  lanternFloat: { variants: 3, sound: "cathedral", lead: "rise", ordering: "radial", stagger: 85, minP: 3, maxP: 6, glyphs: ["flame", "star"] },
  featherBurst: { variants: 3, sound: "crownrain", lead: "rain", ordering: "radial", stagger: 60, minP: 5, maxP: 9, glyphs: ["feather"] },
  tideSweep: { variants: 3, sound: "cataclysm", lead: "band", ordering: "sweep", stagger: 60, minP: 4, maxP: 7, glyphs: ["wave", "drop"] },
  gustSpiral: { variants: 3, sound: "blitz", lead: "band", ordering: "sweep", stagger: 55, minP: 3, maxP: 5, glyphs: ["spiral", "feather"] },
  sparkArc: { variants: 4, sound: "lightning", lead: "bloom", ordering: "radial", stagger: 50, minP: 3, maxP: 6, glyphs: ["bolt"] },
  swapHelix: { variants: 3, sound: "clockice", lead: "orbit", ordering: "radial", stagger: 70, minP: 2, maxP: 4, glyphs: ["spiral", "link"] },
  teleportRift: { variants: 3, sound: "blitz", lead: "bloom", ordering: "radial", stagger: 65, minP: 3, maxP: 6, glyphs: ["star", "eye"] },
  mirrorShatter: { variants: 3, sound: "massfreeze", lead: "bloom", ordering: "radial", stagger: 70, minP: 5, maxP: 9, glyphs: ["shard", "prism"] },
  coinFlip: { variants: 3, sound: "crownrain", lead: "rain", ordering: "radial", stagger: 80, minP: 2, maxP: 4, glyphs: ["coin"] },
  diceTumble: { variants: 3, sound: "petrify", lead: "rain", ordering: "radial", stagger: 85, minP: 2, maxP: 4, glyphs: ["die"] },
  scrollUnfurl: { variants: 3, sound: "snooze", lead: "band", ordering: "sweep", stagger: 75, minP: 3, maxP: 5, glyphs: ["scroll", "quill"] },
  quillSign: { variants: 3, sound: "shades", lead: "band", ordering: "sweep", stagger: 70, minP: 2, maxP: 4, glyphs: ["quill", "scroll"] },
  prismSplit: { variants: 3, sound: "clockice", lead: "bloom", ordering: "radial", stagger: 60, minP: 3, maxP: 5, glyphs: ["prism", "eye"] },
  potionFizz: { variants: 3, sound: "crownrain", lead: "rise", ordering: "radial", stagger: 75, minP: 4, maxP: 8, glyphs: ["flask", "drop"] },
  starChart: { variants: 4, sound: "nova", lead: "orbit", ordering: "radial", stagger: 65, minP: 4, maxP: 6, glyphs: ["star", "moon"] },
  gravityWell: { variants: 3, sound: "colossus", lead: "bloom", ordering: "octagon", stagger: 70, minP: 2, maxP: 4, glyphs: ["moon", "sun"] },
  bellToll: { variants: 3, sound: "cathedral", lead: "orbit", ordering: "radial", stagger: 90, minP: 2, maxP: 4, glyphs: ["bell"] },
};

export const GEN_FAMILIES = Object.keys(FAMILY_DEFS) as readonly GenFamily[];

/** Family -> existing signature voice (SigSoundKey names). The integrator's
 * playSignature switch in Board.tsx already handles every one of these. */
export const GEN_SOUND: Record<GenFamily, GenSoundKey> = Object.fromEntries(
  GEN_FAMILIES.map((f) => [f, FAMILY_DEFS[f].sound]),
) as Record<GenFamily, GenSoundKey>;

// --- Family selection (keyword taxonomy) --------------------------------------

interface KeywordRule {
  re: RegExp;
  family: GenFamily;
  /** Match against the card NAME only (for words like "king" that saturate
   * descriptions and would otherwise swallow the whole library). */
  nameOnly?: boolean;
}

/** Tier-1 rules, first match wins. Effect words come before piece words so a
 * "Knight's Frost" reads as ice, not cavalry; piece words come before the
 * category fallback so sub-sections stay coherent. */
const KEYWORD_RULES: readonly KeywordRule[] = [
  // Elements & states
  { re: /freez|frozen|frost|\bice\b|\bicy\b|blizzard|glacier|chill|winter|snow/, family: "frostbloom" },
  { re: /\bfire\b|flame|burn|ember|scorch|lava|inferno|magma|ignit/, family: "emberfall" },
  { re: /petrif|walnut|\bstone\b|statue|boulder|\brock\b|marble|fossil/, family: "stonecarve" },
  { re: /lightning|electr|\bshock\b|thunder|\bbolt\b|storm/, family: "sparkArc" },
  { re: /\bwind\b|\bgust\b|gale|tornado|whirlwind|cyclone|breeze/, family: "gustSpiral" },
  { re: /\bwave\b|\btide\b|flood|ocean|\bsea\b|river|water|rain\b|monsoon/, family: "tideSweep" },
  { re: /shadow|\bdark\b|\bnight\b|\bvoid\b|eclipse|shade|smoke|\bink\b|steal|thief|snatch/, family: "shadowVeil" },
  { re: /\bstar\b|comet|meteor|cosmic|celestial|astral|constellation/, family: "starChart" },
  { re: /gravity|magnet|black hole|pull(s|ed)? (it|them|every)|drag(s|ged)? (it|them|every)|sink/, family: "gravityWell" },
  // Time & tempo
  { re: /hourglass|skip|stall|suspend|delay|snooze|sleep|slumber/, family: "hourglass" },
  { re: /clock|chrono|timer|seconds|overtime|tempo/, family: "clockwork" },
  // Space & trickery
  { re: /teleport|\bwarp\b|blink|portal|phase|\brift\b|anywhere|relocat/, family: "teleportRift" },
  { re: /swap|shuffle|switch|exchange|rotate|trade place|reposition/, family: "swapHelix" },
  { re: /mirror|copy|clone|reflect|mimic|duplicat|twin/, family: "mirrorShatter" },
  // Court & ceremony
  { re: /promot|coronat|ascend|amazon|royal|crown|throne|regal/, family: "crownGleam" },
  { re: /decree|edict|law\b|tax|tribute|mandate|command/, family: "kingsDecree" },
  // Life, death & summoning
  { re: /revive|resurrect|undead|grave|necro|\bsoul\b|spirit|ghost|phantom|haunt/, family: "lanternFloat" },
  { re: /summon|spawn|reinforc|recruit|muster|second army|conjure|\bhorn\b/, family: "bellToll" },
  // War drums & banners
  { re: /\bdrum\b|stomp|quake|tremor|slam|smash|earthshak/, family: "drumShock" },
  { re: /rally|banner|charge|morale|inspire|legion|\bwar\b|army|vanguard/, family: "bannerRally" },
  // Protection & terrain
  { re: /shield|protect|guard|\bward\b|immun|uncapturable|sanctuary|aegis|armor/, family: "shieldDome" },
  { re: /\bwall\b|fortress|castle|rampart|tower|bulwark|barricade|moat/, family: "rookRampart" },
  { re: /thorn|vine|bramble|forest|\broot\b|garden|grove|overgrow/, family: "thornRing" },
  { re: /chain|\bbind\b|\block\b|shackle|tether|anchor|trap\b/, family: "chainSnap" },
  // Curses & magic
  { re: /curse|\bhex\b|doom|plague|blight|jinx|wither/, family: "hexSigil" },
  { re: /rune|glyph|sigil|arcane|spell|wizard|\bmage\b|magic|enchant/, family: "arcaneRunes" },
  // Fortune & paperwork
  { re: /coin|gambl|\bbet\b|jackpot|casino|wager|\bluck\b|fortune/, family: "coinFlip" },
  { re: /dice|\broll\b|random|chance/, family: "diceTumble" },
  { re: /\bdeal\b|contract|pact|\bsign\b|mortgage|\brent\b|\bdebt\b|bargain/, family: "quillSign" },
  { re: /draft|redraw|\bcard\b|\bpick\b|scroll|patch note/, family: "scrollUnfurl" },
  { re: /reveal|peek|scry|scan|vision|glance|watch|inspect|foresee/, family: "prismSplit" },
  // Flight & flavor
  { re: /\bfly\b|\bwing\b|feather|\bbird\b|hawk|eagle|glide|griffon|\broc\b/, family: "featherBurst" },
  { re: /potion|apple|banana|\bfood\b|\beat\b|drink|snack|brew|elixir/, family: "potionFizz" },
  // Piece sub-sections (name first, then anywhere)
  { re: /pawn/, family: "pawnTide", nameOnly: true },
  { re: /knight|cavalry|horse|steed/, family: "knightVault", nameOnly: true },
  { re: /rook|siege/, family: "rookRampart", nameOnly: true },
  { re: /bishop/, family: "bishopCross", nameOnly: true },
  { re: /queen/, family: "queenRadiance", nameOnly: true },
  { re: /king/, family: "kingsDecree", nameOnly: true },
  { re: /pawn/, family: "pawnTide" },
  { re: /knight|cavalry/, family: "knightVault" },
  { re: /bishop/, family: "bishopCross" },
  { re: /rook/, family: "rookRampart" },
  { re: /queen/, family: "queenRadiance" },
];

/** Per-category default families (hash-picked) when no keyword lands. */
const CATEGORY_FAMILIES: Record<string, readonly GenFamily[]> = {
  movement: ["knightVault", "gustSpiral", "featherBurst", "swapHelix"],
  pieces: ["bellToll", "lanternFloat", "crownGleam", "bannerRally"],
  tempo: ["clockwork", "hourglass", "drumShock", "sparkArc"],
  protection: ["shieldDome", "thornRing", "rookRampart", "gravityWell"],
  attack: ["emberfall", "sparkArc", "drumShock", "mirrorShatter"],
  info: ["prismSplit", "scrollUnfurl", "starChart"],
  draft: ["scrollUnfurl", "diceTumble", "quillSign", "swapHelix"],
  nerf: ["quillSign", "scrollUnfurl", "chainSnap"],
  hex: ["hexSigil", "shadowVeil", "thornRing", "arcaneRunes"],
  item: ["potionFizz", "coinFlip", "featherBurst"],
};

const FALLBACK_FAMILIES: readonly GenFamily[] = ["arcaneRunes", "starChart", "prismSplit"];

function matchFamily(name: string, text: string, category: string, h: number): GenFamily {
  for (const rule of KEYWORD_RULES) {
    if (rule.re.test(rule.nameOnly ? name : text)) return rule.family;
  }
  const pool = CATEGORY_FAMILIES[category] ?? FALLBACK_FAMILIES;
  return pool[pick(h, 20, pool.length)];
}

/** Which piece types the card visibly touches (advisory, like the bespoke
 * table's victims field): named piece words -> those types, else "all". */
function sniffVictims(text: string): PieceType[] | "all" {
  const found: PieceType[] = [];
  const scan: Array<[RegExp, PieceType]> = [
    [/pawn/, "p"],
    [/knight/, "n"],
    [/bishop/, "b"],
    [/rook/, "r"],
    [/queen/, "q"],
  ];
  for (const [re, t] of scan) if (re.test(text)) found.push(t);
  return found.length >= 1 && found.length <= 3 ? found : "all";
}

// --- The generator -------------------------------------------------------------

const ALT_ORDERINGS: readonly GenOrdering[] = ["radial", "sweep", "file"];

/**
 * Deterministic play-signature config for any buff card. Pure function of
 * (id, category, tier) + the card's library text (looked up via BUFF_BY_ID;
 * unknown ids degrade gracefully to id-derived words + the category default).
 *
 * NOTE for the integrator: "line" ordering never comes out of here (it needs
 * a mover anchor the generator cannot guarantee); only radial/sweep/file/
 * octagon are produced, all of which Board orders without a mover.
 */
export function genSignatureConfig(id: string, category: string, tier: number): GenConfig {
  const card = BUFF_BY_ID[id];
  const name = (card?.name ?? id.replace(/_/g, " ")).toLowerCase();
  const text = `${name} || ${(card?.description ?? "").toLowerCase()}`;
  const h = fnv(id);

  const family = matchFamily(name, text, category, h);
  const def = FAMILY_DEFS[family];

  const baseHue = CATEGORY_HUE[category] ?? 210;
  const visual: GenVisual = {
    gen: true,
    family,
    variant: pick(h, 1, def.variants),
    hue: (baseHue + pick(h, 2, 45) - 22 + 360) % 360,
    hue2: (baseHue + pick(h, 2, 45) - 22 + 120 + pick(h, 3, 110) + 360) % 360,
    sat: clamp(46 + tier * 4 + pick(h, 4, 9), 42, 94),
    light: clamp(66 - tier * 2 - pick(h, 5, 7), 38, 70),
    particles: def.minP + pick(h, 6, def.maxP - def.minP + 1),
    scale: 0.85 + pick(h, 7, 31) / 100,
    dir: pick(h, 8, 2) === 0 ? 1 : -1,
    rot: pick(h, 9, 360),
    glyph: def.glyphs[pick(h, 10, def.glyphs.length)],
    finisher: FINISHERS[pick(h, 14, FINISHERS.length)],
  };

  const ordering: GenOrdering =
    def.ordering === "line"
      ? ALT_ORDERINGS[pick(h, 12, ALT_ORDERINGS.length)]
      : pick(h, 11, 10) < 7
        ? def.ordering
        : ALT_ORDERINGS[pick(h, 12, ALT_ORDERINGS.length)];

  return {
    ordering,
    staggerMs: Math.max(0, def.stagger + pick(h, 13, 41) - 20),
    victims: sniffVictims(text),
    visual,
    hasLead: tier >= 5,
    sound: def.sound,
  };
}


// --- Dev self-check --------------------------------------------------------------------

/**
 * Dev-only uniqueness audit: generate a config for every card in ALL_BUFFS
 * that lacks a bespoke SIGNATURES entry (pass those ids in) and warn if any
 * two collide across EVERY hash dimension (family+variant+hue+hue2+particles+
 * scale+dir+rot+glyph). With ~10 independent dimensions this should never
 * fire; if it does, the two named cards genuinely render identically and a
 * dimension needs widening. No-op in production builds.
 */
export function runGenSelfCheck(bespokeIds: ReadonlySet<string>): void {
  if (process.env.NODE_ENV === "production") return;
  const seen = new Map<string, string>();
  let generated = 0;
  for (const b of ALL_BUFFS) {
    if (bespokeIds.has(b.id)) continue;
    const cfg = genSignatureConfig(b.id, b.category, b.tier);
    generated++;
    const w = cfg.visual;
    const key = [w.family, w.variant, w.hue, w.hue2, w.particles, w.scale, w.dir, w.rot, w.glyph, w.finisher].join("|");
    const prev = seen.get(key);
    if (prev !== undefined) {
      console.warn(`[genSignature] full visual collision: "${prev}" and "${b.id}" share ${key}`);
    } else {
      seen.set(key, b.id);
    }
  }
  console.info(`[genSignature] self-check: ${generated} generated signatures across ${GEN_FAMILIES.length} families, ${seen.size} unique visuals.`);
}

