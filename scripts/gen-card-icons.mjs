// Build-time generator for src/lib/cardIconMap.gen.ts — the card-id -> lucide
// icon assignment that used to be computed in the browser at module load.
//
//   npm run gen:icons          # regenerate src/lib/cardIconMap.gen.ts
//   node scripts/gen-card-icons.mjs --check   # CI: fail if the file is stale
//
// Requires `npm run server:build` first (it loads the card libraries from
// dist-server, same pattern as scripts/test-*.cjs). `npm run gen:icons` runs
// the server build for you; `--check` is folded into `npm run test:rules`,
// which also builds first.
//
// WHY: src/lib/cardIcon.ts used to `import { icons } from "lucide-react"` and
// run a three-pass assignment over the FULL ~1500-icon catalog on every
// client. That import defeats tree-shaking (every icon ships) and the
// algorithm (two 1000+-card sorts plus open-address probing) ran at module
// load. This script runs the EXACT same algorithm once, at build time, and
// emits a static map plus per-icon named imports that Next's
// optimizePackageImports can tree-shake.
//
// THE ALGORITHM (kept bit-identical to the original cardIcon.ts so every
// already-shipped card keeps the face players know):
//   Pass 1 — cards with a curated CARD_ICON_OVERRIDES entry claim it first.
//   Pass 2 — cards still unassigned claim their own `icon` field
//            (first claimant in stable id order wins).
//   Pass 3 — every remaining card open-address-probes the sorted catalog:
//            start at FNV-1a(id) % catalog.length, walk forward to the first
//            unclaimed icon, claim it.
// Card order: all nerfs sorted by id, then all buffs sorted by id, de-duped.
// Catalog: Object.keys(lucide.icons) sorted — canonical PascalCase names only
// (no deprecated aliases). Pure function of libraries + catalog: no
// randomness, so regenerating without changing cards is a no-op diff.
//
// CURATION LIVES HERE: CARD_ICON_OVERRIDES below is the hand-picked,
// name-matched face table (owner directive: every tier 7+ card wears an icon
// that MATCHES ITS NAME). It moved here from cardIcon.ts because it is input
// to generation, not runtime data. Edit it here, then `npm run gen:icons`.
// Keep it collision-free: no icon name twice (the script warns if violated;
// first claimant in id order wins, the other probes).

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src", "lib", "cardIconMap.gen.ts");
const CHECK = process.argv.includes("--check");

// ---------------------------------------------------------------------------
// Curated case-matched icons (owner directives: "icons should be more for
// each case" and "every card above 7 must be unique and distinct and actually
// MATCH THE CARD NAME"). These SEED PASS 1, so every entry here wins its icon
// outright — which is why the table must stay collision-free: NO icon name
// may appear twice (guarded below). The first block hand-picks a distinct,
// name-matched face for EVERY tier 7+ card; the second keeps the older
// lower-tier flagship picks, de-duplicated against the tier 7+ set. Names are
// validated against the catalog, so a renamed lucide icon degrades gracefully
// (the card falls through to its own icon / probe) with a warning here.
// ---------------------------------------------------------------------------
const CARD_ICON_OVERRIDES = {
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

// ---------------------------------------------------------------------------
// Inputs: lucide catalog + card libraries (compiled engine from dist-server,
// same loading pattern as scripts/test-apex.cjs).
// ---------------------------------------------------------------------------
const { icons } = require(path.join(
  ROOT,
  "node_modules",
  "lucide-react",
  "dist",
  "cjs",
  "lucide-react.js",
));
const CATALOG = Object.keys(icons).sort();
const CATALOG_SET = new Set(CATALOG);

function loadEngine(mod) {
  const p = path.join(ROOT, "dist-server", "src", "engine", mod);
  if (!fs.existsSync(p)) {
    console.error(
      `[gen-card-icons] missing ${p} — run \`npm run server:build\` first ` +
        "(or use `npm run gen:icons`, which builds for you).",
    );
    process.exit(1);
  }
  return require(p);
}
const { ALL_NERFS } = loadEngine(path.join("nerfs", "library.js"));
const { ALL_BUFFS } = loadEngine(path.join("buffs", "library.js"));

// ---------------------------------------------------------------------------
// The exact algorithm from the original src/lib/cardIcon.ts.
// ---------------------------------------------------------------------------

/** Canonicalize a lucide icon name to its PascalCase export key. Accepts both
 * the export key ("Bomb") and lucide's kebab-case id ("shield-alert"). */
function canonicalIconName(name) {
  if (!name) return undefined;
  if (CATALOG_SET.has(name)) return name;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m, _s, c) => c.toUpperCase());
  return CATALOG_SET.has(pascal) ? pascal : undefined;
}

/** Small stable string hash (FNV-1a); only spread matters, not quality. */
function hashId(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

let warnings = 0;
function warn(msg) {
  warnings++;
  console.warn(`[gen-card-icons] ${msg}`);
}

// Override table hygiene: every name resolves, no icon claimed twice.
{
  const seen = new Map();
  for (const [id, name] of Object.entries(CARD_ICON_OVERRIDES)) {
    const key = canonicalIconName(name);
    if (!key) {
      warn(`override for "${id}" names unknown lucide icon "${name}".`);
      continue;
    }
    const prev = seen.get(key);
    if (prev) {
      warn(
        `override collision: "${id}" and "${prev}" both want "${key}" — the first in id order wins, the other probes.`,
      );
    } else {
      seen.set(key, id);
    }
  }
}

// Stable card order: all nerfs sorted by id, then all buffs sorted by id,
// de-duped (a repeated id shares one face — only sane outcome for an id key).
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const cards = [];
const seenIds = new Set();
for (const c of [...[...ALL_NERFS].sort(byId), ...[...ALL_BUFFS].sort(byId)]) {
  if (seenIds.has(c.id)) continue;
  seenIds.add(c.id);
  cards.push({ id: c.id, icon: c.icon });
}

const claimed = new Set(); // canonical icon names already taken
const assigned = new Map(); // card id -> canonical icon name

const tryClaim = (id, name) => {
  const key = canonicalIconName(name);
  if (!key || claimed.has(key)) return false;
  claimed.add(key);
  assigned.set(id, key);
  return true;
};

// Pass 1: curated overrides claim first.
for (const c of cards) tryClaim(c.id, CARD_ICON_OVERRIDES[c.id]);

// Pass 2: remaining cards claim their own `icon` field, if still free.
for (const c of cards) {
  if (!assigned.has(c.id)) tryClaim(c.id, c.icon);
}

// Pass 3: everyone else open-address-probes the catalog from hash(id).
// OVERHAUL: the library outgrew the catalog (2000+ cards vs ~1500 icons), so
// uniqueness is now on the (icon, variant) PAIR: once every plain icon is
// claimed, probing continues over "Name#1", then "Name#2"... The client
// (cardIcon.ts) resolves the base component and exposes the variant, which
// the card face renders as a deterministic tint/mirror treatment, so two
// cards sharing a glyph still never share a FACE.
const n = CATALOG.length;
const MAX_VARIANTS = 8; // 8 * ~1500 = capacity for ~12000 cards
for (const c of cards) {
  if (assigned.has(c.id)) continue;
  if (claimed.size >= n * MAX_VARIANTS) break; // truly exhausted (guarded below)
  let probe = hashId(c.id) % n;
  let variant = 0;
  let key = CATALOG[probe];
  while (claimed.has(key)) {
    probe = (probe + 1) % n;
    if (probe === hashId(c.id) % n) variant++; // full lap: next variant band
    key = variant === 0 ? CATALOG[probe] : `${CATALOG[probe]}#${variant}`;
    if (variant >= MAX_VARIANTS) break;
  }
  if (claimed.has(key)) continue;
  claimed.add(key);
  assigned.set(c.id, key);
}

// Hard invariants — a violation here is an algorithm bug or a capacity
// overflow (raise MAX_VARIANTS), so fail the build rather than emit a bad map.
if (assigned.size !== cards.length) {
  console.error(
    `[gen-card-icons] FATAL: ${cards.length - assigned.size} of ${cards.length} ` +
      `cards have no unique face (lucide catalog: ${n} x ${MAX_VARIANTS} variants).`,
  );
  process.exit(1);
}
if (new Set(assigned.values()).size !== assigned.size) {
  console.error("[gen-card-icons] FATAL: duplicate face assignment — algorithm bug.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Emit. The registry additionally carries every card's own valid `icon` name
// so resolveLucideIcon() can still resolve a wire-received def whose id is
// not (yet) in the map but whose icon string names a known face.
// ---------------------------------------------------------------------------
const registry = new Set([...assigned.values()].map((v) => v.split("#")[0]));
for (const c of cards) {
  const own = canonicalIconName(c.icon);
  if (own) registry.add(own);
}
const registryNames = [...registry].sort();
const mapIds = [...assigned.keys()].sort();

const lines = [];
lines.push("// AUTO-GENERATED by scripts/gen-card-icons.mjs — DO NOT EDIT BY HAND.");
lines.push("//");
lines.push("// Regenerate after adding/removing/renaming cards or editing the curated");
lines.push("// override table in scripts/gen-card-icons.mjs:");
lines.push("//");
lines.push("//   npm run gen:icons");
lines.push("//");
lines.push("// `npm run test:rules` verifies this file is in sync (gen-card-icons.mjs");
lines.push("// --check), and src/lib/cardIcon.ts warns at module load in dev if any");
lines.push("// shipped card id is missing from the map.");
lines.push("//");
lines.push(`// Inputs: ${cards.length} cards (${ALL_NERFS.length} nerfs + ${ALL_BUFFS.length} buffs, de-duped), lucide catalog ${n}.`);
lines.push("// Every icon below is a per-icon named import so Next's optimizePackageImports");
lines.push("// tree-shakes lucide-react down to exactly the icons on this page.");
lines.push("import {");
lines.push("  type LucideIcon,");
for (const name of registryNames) lines.push(`  ${name},`);
lines.push('} from "lucide-react";');
lines.push("");
lines.push("/** Card id -> its globally unique PascalCase lucide face-icon name, for");
lines.push(" * every card in the shipped libraries. Sorted by id. */");
lines.push("export const CARD_ICON_NAMES: Record<string, string> = {");
for (const id of mapIds) lines.push(`  ${id}: ${JSON.stringify(assigned.get(id))},`);
lines.push("};");
lines.push("");
lines.push("/** PascalCase name -> component, for every icon the map (or any card's own");
lines.push(" * `icon` field) references. This is the full set of lucide icons the card");
lines.push(" * UI can render, plus the small category rings in cardIcon.ts. */");
lines.push("export const GEN_ICON_COMPONENTS: Record<string, LucideIcon> = {");
for (const name of registryNames) lines.push(`  ${name},`);
lines.push("};");
lines.push("");
const output = lines.join("\n");

if (CHECK) {
  const existing = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";
  if (existing !== output) {
    console.error(
      "[gen-card-icons] src/lib/cardIconMap.gen.ts is STALE — the card libraries " +
        "(or the override table) changed without regenerating. Run: npm run gen:icons",
    );
    process.exit(1);
  }
  console.log(
    `[gen-card-icons] check OK: map covers all ${cards.length} cards, ` +
      `${registryNames.length} icons in registry${warnings ? `, ${warnings} warning(s)` : ""}.`,
  );
} else {
  fs.writeFileSync(OUT_FILE, output);
  console.log(
    `[gen-card-icons] wrote ${path.relative(ROOT, OUT_FILE)}: ${assigned.size} cards, ` +
      `${registryNames.length} icons in registry${warnings ? `, ${warnings} warning(s)` : ""}.`,
  );
}
