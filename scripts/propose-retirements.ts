// Propose (and with --write, record) the cards to retire from the draft pools.
//
// The library grew to ~2,450 cards, and the generated audit shows the cost:
// hundreds share a mechanical signature with another card, dozens are the
// strictly-dominated higher rung of a pair, and some categories hold over a
// hundred variations of one idea. This script turns that audit into a
// retirement list. Retired cards stay defined in code (old games still
// replay), they just leave every draft pool and hide from the codex by
// default (see src/engine/retired.ts).
//
// Rules, applied in order, from docs/card-audit.json + docs/card-registry.json:
//   1. Never retire: apex (tier 9-10), tutorial/guide cards, usage flagships,
//      cards another retirement merges into.
//   2. Duplicate signature groups: keep the lowest rung, and the highest rung
//      when the group spans three or more tiers (two real price points);
//      retire the rest with mergedInto = the kept rung nearest in tier.
//   3. Dominated candidates (audit flag): retire, mergedInto the partner.
//   4. Near-duplicate pairs (audit flag, similarity >= 0.78): retire the
//      higher tier of the pair, or the one without bespoke VFX on a tie.
//   5. Complexity: descriptions over 220 characters retire as too-complex.
//   6. Category caps: within each (family, effectCategory) keep at most 60
//      active, shedding the longest descriptions first, then the highest tiers.
//
// Run:  npx -y tsx scripts/propose-retirements.ts          (report)
//       npx -y tsx scripts/propose-retirements.ts --write  (write retired.ts + docs)

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const WRITE = process.argv.includes("--write");

type Reason = "hand" | "duplicate" | "dominated" | "near-duplicate" | "too-complex" | "category-cap";

interface AuditRow {
  id: string;
  name: string;
  kind: string;
  tier: number;
  effect: string;
  signature: string;
  flags: string[];
}
interface RegistryRow {
  id: string;
  kind: string;
  category: string;
  effectCategory: string;
  tier: number;
  implemented: boolean;
  descriptionLength: number;
}

const audit = (JSON.parse(readFileSync(join(ROOT, "docs/card-audit.json"), "utf8")) as { rows: AuditRow[] }).rows;
const registry = (JSON.parse(readFileSync(join(ROOT, "docs/card-registry.json"), "utf8")) as { cards: RegistryRow[] }).cards;
const reg = new Map(registry.map((c) => [c.id, c]));
const byId = new Map(audit.map((r) => [r.id, r]));

// Keys of the hand-tuned VFX maps and usage flagships, read from source text
// so this script never imports the engine.
function keysOf(file: string, marker: string): Set<string> {
  const src = readFileSync(join(ROOT, file), "utf8");
  const start = src.indexOf(marker);
  if (start < 0) return new Set();
  const body = src.slice(start);
  const out = new Set<string>();
  for (const m of body.matchAll(/^\s{2}([a-z0-9_]+):\s*\{/gm)) out.add(m[1]);
  return out;
}
const bespokeVfx = new Set([
  ...keysOf("src/components/effects/vfxSpecs.ts", "export const CARD_VFX"),
  ...keysOf("src/components/effects/vfxExtra.ts", "export const EXTRA_CARD_VFX"),
]);
const flagships = keysOf("src/components/effects/usageResolve.ts", "export const USAGE_FLAGSHIPS");
// Cards with a hand-built plug-in play (gambling, casino, god, funny...): the
// animation work is the reason they exist, so length and category caps skip
// them (a true duplicate still retires).
const pluginPlays = new Set(
  [...readFileSync(join(ROOT, "src/components/effects/sigPlugins.tsx"), "utf8").matchAll(/^\s{2}"([a-z0-9_]+)":\s*"[A-Za-z]+Plays"/gm)].map((m) => m[1]),
);

// Cards the tutorial and guides talk about by id.
const guideText = ["src/app/tutorial", "src/app/guide", "src/components/tutorial"]
  .map((d) => {
    try {
      return require("node:child_process").execSync(`grep -rhoE "[a-z0-9]+_[a-z0-9_]+" ${join(ROOT, d)}`, { encoding: "utf8" });
    } catch {
      return "";
    }
  })
  .join("\n");
const guideIds = new Set(guideText.split("\n").filter((w) => byId.has(w)));

// Cards the server names by id (the house bots' filler exclusion list).
const serverIds = new Set(
  [...readFileSync(join(ROOT, "src/lib/server/bots.ts"), "utf8").matchAll(/FILLER_EXCLUDED_CARD_IDS[^=]*=\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([a-z0-9_]+)"/g)].map((x) => x[1])),
);

const protectedIds = new Set<string>();
for (const r of audit) {
  if (r.tier >= 9) protectedIds.add(r.id);
  if (flagships.has(r.id)) protectedIds.add(r.id);
  if (serverIds.has(r.id)) protectedIds.add(r.id);
  if (guideIds.has(r.id)) protectedIds.add(r.id);
}

const retired = new Map<string, { reason: Reason; mergedInto?: string }>();
const retire = (id: string, reason: Reason, mergedInto?: string) => {
  if (protectedIds.has(id) || retired.has(id)) return;
  if (mergedInto && (retired.has(mergedInto) || mergedInto === id)) mergedInto = undefined;
  retired.set(id, { reason, mergedInto });
  if (mergedInto) protectedIds.add(mergedInto);
};

// 1b. Hand decisions (scripts/hand-audit.json): read through card by card;
// these win over every protection except a merge target's.
const hand = JSON.parse(readFileSync(join(ROOT, "scripts/hand-audit.json"), "utf8")) as {
  retire: Record<string, { why: string; mergedInto?: string }>;
  keep?: Record<string, string>;
};
// Hand-kept cards are protected AND stay out of the twin machinery below: a
// text-signature twin of a hand-designed card is a coincidence of wording, so
// it must neither retire the newcomer nor let the newcomer displace the twin.
const handKeep = new Set(Object.keys(hand.keep ?? {}));
for (const id of handKeep) protectedIds.add(id);
for (const [id, h] of Object.entries(hand.retire)) {
  if (!byId.has(id)) {
    console.error(`[propose-retirements] hand-audit id not in library: ${id}`);
    continue;
  }
  protectedIds.delete(id);
  retire(id, "hand", h.mergedInto);
}

// 2. Duplicate signatures.
const bySig = new Map<string, AuditRow[]>();
for (const r of audit) {
  if (!bySig.has(r.signature)) bySig.set(r.signature, []);
  bySig.get(r.signature)!.push(r);
}
for (const rawGroup of bySig.values()) {
  const group = rawGroup.filter((r) => !handKeep.has(r.id));
  if (group.length < 2) continue;
  const sorted = [...group].sort((a, b) => a.tier - b.tier || (bespokeVfx.has(b.id) ? 1 : 0) - (bespokeVfx.has(a.id) ? 1 : 0));
  const keep = new Set<string>([sorted[0].id]);
  const span = sorted[sorted.length - 1].tier - sorted[0].tier;
  if (span >= 2) keep.add(sorted[sorted.length - 1].id);
  for (const p of sorted) if (protectedIds.has(p.id)) keep.add(p.id);
  const kept = sorted.filter((p) => keep.has(p.id));
  for (const r of sorted) {
    if (keep.has(r.id)) continue;
    const nearest = kept.reduce((a, b) => (Math.abs(b.tier - r.tier) < Math.abs(a.tier - r.tier) ? b : a));
    retire(r.id, "duplicate", nearest.id);
  }
}

// 3. Dominated.
for (const r of audit) {
  if (r.flags.some((f) => f.startsWith("dominated")) && !handKeep.has(r.id)) {
    const twin = audit.find((x) => x.id !== r.id && x.signature === r.signature && !retired.has(x.id) && !handKeep.has(x.id));
    retire(r.id, "dominated", twin?.id);
  }
}

// 4. Near duplicates.
for (const r of audit) {
  for (const f of r.flags) {
    const m = /^near-duplicate\(([a-z0-9_]+):([0-9.]+)\)$/.exec(f);
    if (!m) continue;
    const other = byId.get(m[1]);
    if (!other || Number(m[2]) < 0.78) continue;
    if (handKeep.has(r.id) || handKeep.has(other.id)) continue;
    if (retired.has(r.id) || retired.has(other.id)) continue;
    // Retire the higher tier; on a tie, the one without bespoke VFX; then the
    // longer description.
    const pick = (a: AuditRow, b: AuditRow): AuditRow => {
      if (a.tier !== b.tier) return a.tier > b.tier ? a : b;
      const av = bespokeVfx.has(a.id), bv = bespokeVfx.has(b.id);
      if (av !== bv) return av ? b : a;
      return a.effect.length >= b.effect.length ? a : b;
    };
    const loser = pick(r, other);
    const winner = loser.id === r.id ? other : r;
    retire(loser.id, "near-duplicate", winner.id);
  }
}

// Merge targets must be live. A hand entry can name a target that a later
// rule (or a later hand entry) retires; drop the pointer rather than send the
// codex to a retired card.
for (const [, r] of retired) {
  if (r.mergedInto && retired.has(r.mergedInto)) r.mergedInto = undefined;
}

// 5. Complexity.
for (const r of audit) {
  if (r.effect.length > 220 && !pluginPlays.has(r.id)) retire(r.id, "too-complex");
}

// 6. Category caps.
const CAP = 60;
const buckets = new Map<string, RegistryRow[]>();
for (const c of registry) {
  if (!c.implemented || retired.has(c.id)) continue;
  const fam = byId.get(c.id)?.kind ?? c.kind;
  const key = `${fam}|${c.effectCategory}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key)!.push(c);
}
for (const rows of buckets.values()) {
  if (rows.length <= CAP) continue;
  const shed = [...rows]
    .filter((c) => !protectedIds.has(c.id) && !pluginPlays.has(c.id))
    .sort((a, b) => b.descriptionLength - a.descriptionLength || b.tier - a.tier);
  for (const c of shed.slice(0, rows.length - CAP)) retire(c.id, "category-cap");
}

// ---- report ---------------------------------------------------------------
const byKind = new Map<string, { total: number; retired: number }>();
for (const r of audit) {
  const k = byKind.get(r.kind) ?? { total: 0, retired: 0 };
  k.total += 1;
  if (retired.has(r.id)) k.retired += 1;
  byKind.set(r.kind, k);
}
const byReason = new Map<Reason, number>();
for (const v of retired.values()) byReason.set(v.reason, (byReason.get(v.reason) ?? 0) + 1);

console.log(`[propose-retirements] ${retired.size} of ${audit.length} cards retire (${audit.length - retired.size} stay active)`);
for (const [k, v] of byKind) console.log(`  ${k.padEnd(6)} ${String(v.total - v.retired).padStart(5)} active / ${v.total} (${v.retired} retired)`);
for (const [k, v] of byReason) console.log(`  reason ${k.padEnd(15)} ${v}`);

if (WRITE) {
  const ids = [...retired.keys()].sort();
  const lines = ids.map((id) => {
    const v = retired.get(id)!;
    const merged = v.mergedInto ? `, mergedInto: "${v.mergedInto}"` : "";
    return `  ${JSON.stringify(id)}: { reason: "${v.reason}"${merged} },`;
  });
  const ts = `// GENERATED by scripts/propose-retirements.ts --write. Edit the rules there,
// or delete a line here to bring a card back (the definition never left).
//
// A retired card keeps its definition in src/engine so archived games replay,
// but it leaves every draft pool (src/engine/draft.ts, nerfs/library.ts) and
// hides from the codex, the sitemap and the stats tables by default.

export type RetireReason = "hand" | "duplicate" | "dominated" | "near-duplicate" | "too-complex" | "category-cap";

export interface Retirement {
  reason: RetireReason;
  /** The active card that covers this one's ground, when there is one. */
  mergedInto?: string;
}

export const RETIRED: Record<string, Retirement> = {
${lines.join("\n")}
};

export const RETIRED_IDS: ReadonlySet<string> = new Set(Object.keys(RETIRED));

export function isRetired(id: string): boolean {
  return RETIRED_IDS.has(id);
}

export function retirementOf(id: string): Retirement | undefined {
  return RETIRED[id];
}
`;
  writeFileSync(join(ROOT, "src/engine/retired.ts"), ts);

  const md: string[] = [
    "# Card retirements",
    "",
    `Generated by \`scripts/propose-retirements.ts --write\`. ${retired.size} of ${audit.length} cards are retired: they stay defined so old games replay, but they leave the draft pools and hide from the codex by default.`,
    "",
    "| Card | Family | Tier | Reason | Covered by |",
    "|---|---|---|---|---|",
  ];
  for (const id of ids) {
    const v = retired.get(id)!;
    const r = byId.get(id)!;
    md.push(`| ${r.name} (\`${id}\`) | ${r.kind} | ${r.tier} | ${v.reason} | ${v.mergedInto ? `\`${v.mergedInto}\`` : ""} |`);
  }
  writeFileSync(join(ROOT, "docs/card-retirements.md"), md.join("\n") + "\n");
  console.log("[propose-retirements] wrote src/engine/retired.ts and docs/card-retirements.md");
}
