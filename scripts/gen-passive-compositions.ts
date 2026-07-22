/**
 * gen-passive-compositions.ts
 *
 * Deterministic generator for src/components/effects/passive/compositions.ts.
 *
 * It reads the live card libraries (ALL_NERFS implemented passives and every
 * kind:"passive" buff in BUFF_BY_ID) and maps each card's semantics to a
 * Passive Effect Language tuple (family, 1..3 primitives, target, palette role,
 * sigil) per docs/passive-effect-language.md. The 18 canonical compositions in
 * spec section 8 are hard-coded overrides. Every other tuple is derived from
 * keyword categories, buff fx motifs, piece scope, and description keywords,
 * with collisions disambiguated strictly inside the family's primitive
 * vocabulary so no two cards share the full sentence.
 *
 * Run: npx tsx scripts/gen-passive-compositions.ts
 * Output is fully deterministic (cards are processed in a fixed sorted order),
 * so re-running with an unchanged library produces a byte-identical file.
 */

import * as fs from "fs";
import * as path from "path";
import { ALL_NERFS } from "../src/engine/nerfs/library";
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import {
  FAMILY_VOCAB,
  PALETTE_HEX,
  primitiveCountForTier,
  SOUND_CUE_BY_FAMILY,
  type CardFamily,
  type PassiveComposition,
  type PassiveFamily,
  type PassivePaletteRole,
  type PassiveTargetType,
  type PrimitiveKey,
} from "../src/components/effects/passive/spec";

// Silence the unused import lint while keeping PALETTE_HEX referenced as a
// compile-time assertion that palette roles resolve to real hues.
void PALETTE_HEX;

// ---------------------------------------------------------------------------
// Source card shape (only the fields the mapping consumes).
// ---------------------------------------------------------------------------

interface SrcCard {
  cardFamily: CardFamily;
  id: string;
  name: string;
  desc: string;
  tier: number;
  icon: string | null;
  fxMotif: string | null;
  fxPieces: string | null; // "all" | comma piece list | null
  category: string | null; // buff category; null for nerfs
}

function collectCards(): SrcCard[] {
  const out: SrcCard[] = [];
  for (const n of ALL_NERFS) {
    if (!n.implemented) continue;
    out.push({
      cardFamily: "nerf",
      id: n.id,
      name: n.name,
      desc: n.description,
      tier: n.tier,
      icon: n.icon ?? null,
      fxMotif: null,
      fxPieces: null,
      category: null,
    });
  }
  for (const b of Object.values(BUFF_BY_ID)) {
    if (b.kind !== "passive") continue;
    out.push({
      cardFamily: "buff",
      id: b.id,
      name: b.name,
      desc: b.description,
      tier: b.tier,
      icon: b.icon ?? null,
      fxMotif: b.fx ? b.fx.motif : null,
      fxPieces: b.fx
        ? Array.isArray(b.fx.pieces)
          ? b.fx.pieces.join(",")
          : (b.fx.pieces ?? null)
        : null,
      category: b.category,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Canonical eighteen (spec section 8). Locked, never mutated by disambiguation.
// ---------------------------------------------------------------------------

type CanonTuple = {
  family: PassiveFamily;
  primitives: PrimitiveKey[];
  targetType: PassiveTargetType;
  paletteRole: PassivePaletteRole;
};

const CANONICAL: Record<string, CanonTuple> = {
  bottled_lightning: { family: "strike", primitives: ["bolt", "shockRing"], targetType: "piece", paletteRole: "lightning" },
  crippled_clergy: { family: "decree", primitives: ["sigilStamp", "crackLines"], targetType: "pieceClass", paletteRole: "nerf" },
  wn_glass_army: { family: "fracture", primitives: ["crystallize", "crackLines"], targetType: "pieceClass", paletteRole: "nerf" },
  glass_king: { family: "fracture", primitives: ["crystallize", "pulseRing"], targetType: "piece", paletteRole: "nerf" },
  hoarder: { family: "bind", primitives: ["chainLink"], targetType: "pieceClass", paletteRole: "gold" },
  hobbled_queen: { family: "bind", primitives: ["weightDrop"], targetType: "piece", paletteRole: "nerf" },
  hold_them_back: { family: "territory", primitives: ["edgeBurn"], targetType: "zone", paletteRole: "nerf" },
  wn_house_of_cards: { family: "fracture", primitives: ["cardLift"], targetType: "pieceClass", paletteRole: "nerf" },
  march_or_die: { family: "tempo", primitives: ["tickPips"], targetType: "pieceClass", paletteRole: "nerf" },
  wn_floor_is_lava: { family: "territory", primitives: ["zoneSweep"], targetType: "rank", paletteRole: "lava" },
  fog_of_war: { family: "veil", primitives: ["fogRoll"], targetType: "zone", paletteRole: "fog" },
  wn_kingpin: { family: "decree", primitives: ["drainFlow"], targetType: "piece", paletteRole: "nerf" },
  flat_footed: { family: "decree", primitives: ["crackLines"], targetType: "pieceClass", paletteRole: "nerf" },
  no_drawbridge: { family: "bind", primitives: ["gateSlam"], targetType: "pieceClass", paletteRole: "nerf" },
  untitled_duck: { family: "summon", primitives: ["dropImpact"], targetType: "square", paletteRole: "neutral" },
  sacred_file: { family: "territory", primitives: ["beamVertical"], targetType: "file", paletteRole: "neutral" },
  shadow_queen: { family: "veil", primitives: ["fogRoll"], targetType: "piece", paletteRole: "neutral" },
  wn_moonlit_king: { family: "blessing", primitives: ["moonCircle"], targetType: "piece", paletteRole: "moon" },
};

// ---------------------------------------------------------------------------
// Keyword helpers.
// ---------------------------------------------------------------------------

const has = (t: string, re: RegExp): boolean => re.test(t);

// Ordered semantic rules: the FIRST matching rule wins, so meaning drives the
// family (the verb), not the card's registry or a coarse default. Order is
// most-specific first: information effects, appearances, and destruction read
// unambiguously; aggressive capture semantics go to strike; capture DENIAL is a
// piece-class rule change (decree); counting/cadence is tempo; claimed regions
// are territory; movement restriction is bind; remaining rule rewrites are
// decree. Calibrated so no family holds more than 25% of entries.
const FAMILY_RULES: Array<[PassiveFamily, RegExp]> = [
  // Hidden information: fog, secrecy, vision, reveal denial.
  ["veil", /\bfog\b|\bmist\b|hidden|secret|invisible|conceal|blindfold|can'?t see|cannot see|\bvision\b|revealed?\b|\bshadow\b|obscur|\bdisguise|in the dark/],
  // Something appears: spawns, summons, returns, transformations.
  ["summon", /\bspawn|\bsummon|appears\b|place a |adds? a |a new (pawn|piece|knight|bishop|rook|queen)|returns? to the board|resurrect|revive|back to the board|\bpocket\b|\bduck\b|materiali|gain a (pawn|piece|knight|bishop|rook|queen)|becomes? a\b|turns into|transform/],
  // Fragility, degradation, forced loss of material.
  ["fracture", /\bglass\b|crack|shatter|fragile|brittle|crumbl|\bdecay|falls apart|\bbreaks?\b|disintegrat|is (destroyed|removed)|are (destroyed|removed)|you lose (a|that|the|one|your) (piece|pawn|knight|bishop|rook|queen)|sacrifice/],
  // Sudden harm and aggressive capture semantics (capture triggers, forced
  // captures, check-giving, explosions). Capture DENIAL falls through to the
  // later rules (a "knights can't capture" card is a decree, not a strike).
  ["strike", /explo|detonat|\bblast|lightning|thunder|\bstorm\b|\bbolt\b|\bstrike|smite|\bdestroy|when you captur|after (you|a|it) captur|each captur|every captur|must capture|if you can capture|you captured?\b|capturing|captures? (a|an|the|one)|\bthreat|\battack|giv(e|es|ing) check/],
  // Time and turn pressure: clocks, counters, cadence, deadlines.
  ["tempo", /\bclock\b|\btimer\b|countdown|by move \d|before move \d|after move \d|within \d+ (moves?|turns?)|every \d+|each turn|per turn|\bskip|\bdelay|\bslow|twice in a row|in a row|consecutive|last move|hourglass|\bhaste|extra (move|turn)|move (again|twice)/],
  // Squares, files, ranks, zones claimed or barred.
  ["territory", /\bfiles?\b|\branks?\b|\bzone|\bhalf\b|halves|\bregion\b|\blava\b|\bterritory|quadrant|\bcorner|board edge|\brim\b|\bdark squares?\b|\blight squares?\b|same square|adjacent squares?/],
  // Restriction of movement: locks, chains, range limits, forced moves.
  ["bind", /can'?t move|cannot move|can only move|may not move|no more than \d|at most \d|\block|\bchain|\bfrozen|\bfreeze|\bstuck\b|\banchor|\bleash|tether|weigh|shorten|farther than|must stay|can'?t leave|cannot leave|must move|may only move|have to move/],
  // Rule changes on a piece class: capture denial, promotion, castling, and
  // remaining can/must/may-not rewrites.
  ["decree", /captur|\bcheck\b|promot|castl|\bmust\b|can only|can'?t|cannot|may not|instead of|counts as|becomes? a|moves? (like|as)/],
];

// Fallback layer for cards no keyword rule matches: a buff's category or fx
// motif still names its mechanic; a nerf with no signal is a rule change.
const FX_MOTIF_FAMILY: Record<string, PassiveFamily> = {
  jail: "bind",
  anchor: "bind",
  muzzle: "decree",
  blindfold: "veil",
  slow: "tempo",
  empower: "blessing",
  ward: "blessing",
  rally: "blessing",
};

function detectFamily(card: SrcCard, t: string): PassiveFamily {
  for (const [family, re] of FAMILY_RULES) {
    if (has(t, re)) return family;
  }
  if (card.cardFamily === "buff") {
    if (card.category === "attack") return "strike";
    if (card.category === "tempo") return "tempo";
    if (card.fxMotif && FX_MOTIF_FAMILY[card.fxMotif]) return FX_MOTIF_FAMILY[card.fxMotif];
    return "blessing";
  }
  return "decree";
}

const PIECE_WORDS = ["king", "queen", "bishop", "knight", "rook", "pawn"] as const;

function detectPieceTarget(card: SrcCard, t: string): PassiveTargetType | null {
  // An explicit fx piece scope wins when present.
  if (card.fxPieces) {
    if (card.fxPieces === "all") return "pieceClass";
    return card.fxPieces.includes(",") ? "pieceClass" : "piece";
  }
  const present: string[] = [];
  let anyPlural = false;
  for (const w of PIECE_WORDS) {
    if (new RegExp(`\\b${w}s\\b`).test(t)) {
      present.push(w);
      anyPlural = true;
    } else if (new RegExp(`\\b${w}\\b`).test(t)) {
      present.push(w);
    }
  }
  if (present.length === 0) return null;
  if (anyPlural || present.length > 1) return "pieceClass";
  return "piece";
}

function detectRegionTarget(t: string): PassiveTargetType | null {
  if (has(t, /\bfiles?\b/)) return "file";
  if (has(t, /\branks?\b/)) return "rank";
  if (has(t, /\bzone\b|\bhalf\b|\bhalves\b|\bregion\b|\bquadrant\b|frontier/)) return "zone";
  if (has(t, /whole board|entire board|\bboard\b/)) return "board";
  if (has(t, /\bsquares?\b/)) return "square";
  return null;
}

function detectTarget(card: SrcCard, t: string, family: PassiveFamily): PassiveTargetType {
  if (has(t, /you lose|you win|loses? the game|wins? the game|checkmate|or you lose/)) return "winCondition";
  const piece = detectPieceTarget(card, t);
  const region = detectRegionTarget(t);
  switch (family) {
    case "territory":
      return region ?? "zone";
    case "veil":
      return region ?? piece ?? "zone";
    case "tempo":
      if (has(t, /\bclock\b|\btimer\b|on the clock/)) return "clock";
      return piece ?? "clock";
    case "summon":
      return region ?? "square";
    case "blessing":
      return piece ?? region ?? "piece";
    case "strike":
      return piece ?? region ?? "piece";
    case "bind":
    case "decree":
    case "fracture":
      return piece ?? region ?? "pieceClass";
  }
}

function detectPalette(card: SrcCard, t: string, family: PassiveFamily): PassivePaletteRole {
  if (has(t, /\blava\b|floor is lava|molten|volcano|magma/)) return "lava";
  if (has(t, /\bfog\b|\bmist\b|smog|\bsmoke\b/)) return "fog";
  if (has(t, /\bmoon\b|lunar|moonlit/)) return "moon";
  if (has(t, /lightning|\bbolt\b|thunder|electric|\bzap\b/)) return "lightning";
  if (family === "bind" && has(t, /gold|golden|treasure|hoard|coin|honey/)) return "gold";
  if (has(t, /\bduck\b/)) return "neutral";
  return card.cardFamily === "buff" ? "buff" : "nerf";
}

const FAMILY_DEFAULT_SIGIL: Record<PassiveFamily, string> = {
  strike: "zap",
  bind: "link",
  fracture: "shield-alert",
  territory: "map",
  veil: "cloud-fog",
  decree: "gavel",
  tempo: "timer",
  summon: "sparkles",
  blessing: "sun",
};

function detectSigil(card: SrcCard, family: PassiveFamily): string {
  return card.icon ?? FAMILY_DEFAULT_SIGIL[family];
}

// ---------------------------------------------------------------------------
// Composition builder.
// ---------------------------------------------------------------------------

function buildComposition(
  family: PassiveFamily,
  target: PassiveTargetType,
  tier: number,
): PrimitiveKey[] {
  const vocab = FAMILY_VOCAB[family];
  const comp: PrimitiveKey[] = [vocab[0]];
  const count = primitiveCountForTier(tier);

  // Target-driven accent for file/rank effects.
  const targetPrim: PrimitiveKey | null =
    target === "file" ? "beamVertical" : target === "rank" ? "beamHorizontal" : null;
  if (targetPrim && vocab.includes(targetPrim) && !comp.includes(targetPrim)) {
    comp.push(targetPrim);
  }

  // Tier 5-6 add a shockRing accent when the family carries one (section 6).
  if (tier >= 5 && tier <= 6 && vocab.includes("shockRing") && !comp.includes("shockRing") && comp.length < count) {
    comp.push("shockRing");
  }

  let vi = 1;
  while (comp.length < count && vi < vocab.length) {
    const p = vocab[vi++];
    if (!comp.includes(p)) comp.push(p);
  }
  return comp.slice(0, 3);
}

// Ordered selections (no repeats) of size 1..3 from a vocab, in a fixed order:
// shorter first, then lexicographic by vocab index. Used to enumerate unique
// alternatives during collision disambiguation, always inside the family.
function orderedSelections(vocab: PrimitiveKey[]): PrimitiveKey[][] {
  const out: PrimitiveKey[][] = [];
  const n = vocab.length;
  for (const a of range(n)) out.push([vocab[a]]);
  for (const a of range(n)) for (const b of range(n)) if (b !== a) out.push([vocab[a], vocab[b]]);
  for (const a of range(n)) for (const b of range(n)) for (const c of range(n)) {
    if (b !== a && c !== a && c !== b) out.push([vocab[a], vocab[b], vocab[c]]);
  }
  return out;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function sigOf(family: PassiveFamily, prims: PrimitiveKey[], target: PassiveTargetType, sigil: string): string {
  return `${family}|${prims.join(",")}|${target}|${sigil}`;
}

// Registry key: a handful of ids exist as BOTH an implemented nerf and a
// passive buff (heavy_boots, anchored_rooks, vertigo, king_of_the_hill), so the
// card family is part of the identity. Keeps every card addressable.
function keyOf(card: { cardFamily: CardFamily; id: string }): string {
  return `${card.cardFamily}:${card.id}`;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function main(): void {
  const cards = collectCards();
  // Deterministic order: nerfs before buffs, then by id. Canonical cards are
  // pinned first so their tuples are never displaced by a collision.
  cards.sort((a, b) => {
    if (a.cardFamily !== b.cardFamily) return a.cardFamily === "nerf" ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const used = new Set<string>();
  const results = new Map<string, PassiveComposition>();
  let collisionsResolved = 0;
  const familyCounts: Record<string, number> = { nerf: 0, buff: 0 };
  const perFamily: Record<string, number> = {};

  // Pass 1: lock canonical tuples.
  for (const card of cards) {
    const canon = CANONICAL[card.id];
    if (!canon) continue;
    const comp: PassiveComposition = {
      cardId: card.id,
      cardFamily: card.cardFamily,
      tier: card.tier,
      family: canon.family,
      primitives: canon.primitives,
      targetType: canon.targetType,
      paletteRole: canon.paletteRole,
      sigilIcon: detectSigil(card, canon.family),
      soundCue: SOUND_CUE_BY_FAMILY[canon.family],
    };
    const sig = sigOf(comp.family, comp.primitives, comp.targetType, comp.sigilIcon);
    if (used.has(sig)) {
      throw new Error(`Canonical tuple collision on ${card.id}: ${sig}`);
    }
    used.add(sig);
    results.set(keyOf(card), comp);
  }

  // Pass 2: derive and disambiguate the rest.
  for (const card of cards) {
    if (results.has(keyOf(card))) continue;
    const t = `${card.name} ${card.desc}`.toLowerCase();
    const family = detectFamily(card, t);
    const target = detectTarget(card, t, family);
    const palette = detectPalette(card, t, family);
    const sigil = detectSigil(card, family);
    const base = buildComposition(family, target, card.tier);

    // Candidate primitive arrays: base first, then every ordered selection from
    // the family vocab. First whose full sentence is unused wins.
    const candidates: PrimitiveKey[][] = [base, ...orderedSelections(FAMILY_VOCAB[family])];
    let chosen: PrimitiveKey[] | null = null;
    const seenCand = new Set<string>();
    for (const cand of candidates) {
      const key = cand.join(",");
      if (seenCand.has(key)) continue;
      seenCand.add(key);
      const sig = sigOf(family, cand, target, sigil);
      if (!used.has(sig)) {
        chosen = cand;
        break;
      }
    }
    if (!chosen) {
      throw new Error(
        `Unable to disambiguate ${card.id} within family '${family}' vocabulary (target ${target}, sigil ${sigil}).`,
      );
    }
    if (chosen !== base && chosen.join(",") !== base.join(",")) collisionsResolved++;

    const comp: PassiveComposition = {
      cardId: card.id,
      cardFamily: card.cardFamily,
      tier: card.tier,
      family,
      primitives: chosen,
      targetType: target,
      paletteRole: palette,
      sigilIcon: sigil,
      soundCue: SOUND_CUE_BY_FAMILY[family],
    };
    used.add(sigOf(family, chosen, target, sigil));
    results.set(keyOf(card), comp);
  }

  // Emit in the same deterministic order.
  const ordered = cards.map((c) => results.get(keyOf(c))!);
  for (const c of ordered) {
    familyCounts[c.cardFamily]++;
    perFamily[c.family] = (perFamily[c.family] ?? 0) + 1;
  }

  const outPath = path.join(__dirname, "..", "src", "components", "effects", "passive", "compositions.ts");
  fs.writeFileSync(outPath, emit(ordered), "utf8");

  // Report to stdout (not part of the artifact).
  console.log(`Wrote ${ordered.length} compositions to ${path.relative(path.join(__dirname, ".."), outPath)}`);
  console.log(`  nerfs: ${familyCounts.nerf}  buffs: ${familyCounts.buff}`);
  console.log(`  collisions disambiguated: ${collisionsResolved}`);
  console.log(`  per family: ${Object.entries(perFamily).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

function emit(rows: PassiveComposition[]): string {
  const lines: string[] = [];
  lines.push("// AUTO-GENERATED by scripts/gen-passive-compositions.ts. Do not edit by hand.");
  lines.push("//");
  lines.push("// One entry per implemented passive nerf and per kind:\"passive\" buff. The 18");
  lines.push("// canonical compositions (docs/passive-effect-language.md section 8) are locked");
  lines.push("// overrides; every other tuple is derived from card semantics with collisions");
  lines.push("// disambiguated inside the family vocabulary. Uniqueness is enforced by");
  lines.push("// scripts/test-passive-registry.ts. Regenerate with:");
  lines.push("//   npx tsx scripts/gen-passive-compositions.ts");
  lines.push("");
  lines.push('import type { PassiveComposition } from "./spec";');
  lines.push("");
  // Chunked sub-arrays: a single literal this large trips TypeScript's
  // "union type too complex" limit during contextual inference, so the table
  // is emitted in bounded slices and concatenated.
  const CHUNK = 400;
  const chunkNames: string[] = [];
  for (let start = 0; start < rows.length; start += CHUNK) {
    const name = `CHUNK_${chunkNames.length + 1}`;
    chunkNames.push(name);
    lines.push(`const ${name}: PassiveComposition[] = [`);
    for (const r of rows.slice(start, start + CHUNK)) {
      const prims = r.primitives.map((p) => `"${p}"`).join(", ");
      const sound = r.soundCue ? `, soundCue: ${JSON.stringify(r.soundCue)}` : "";
      lines.push(
        `  { cardId: ${JSON.stringify(r.cardId)}, cardFamily: ${JSON.stringify(r.cardFamily)}, tier: ${r.tier}, ` +
          `family: ${JSON.stringify(r.family)}, primitives: [${prims}], targetType: ${JSON.stringify(r.targetType)}, ` +
          `paletteRole: ${JSON.stringify(r.paletteRole)}, sigilIcon: ${JSON.stringify(r.sigilIcon)}${sound} },`,
      );
    }
    lines.push("];");
    lines.push("");
  }
  lines.push(
    `export const PASSIVE_COMPOSITIONS: PassiveComposition[] = [${chunkNames.map((n) => `...${n}`).join(", ")}];`,
  );
  lines.push("");
  return lines.join("\n");
}

main();
