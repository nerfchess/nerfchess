// Generates docs/card-categories.md: every shipped card sorted into exactly one
// fine-grained MECHANICAL bucket, so a balance pass can read a whole family at
// once ("show me everything that instantly deletes a piece") instead of grepping
// 2,448 descriptions. The taxonomy and the classifier live in
// src/lib/cardEffectCategories.ts; this script only reads the engine and renders.
//
// Nothing here is hand-authored, same contract as scripts/gen-card-registry.ts
// and scripts/audit-cards.ts, so the doc cannot drift from the code.
//
// Run: npx -y tsx scripts/gen-card-categories.ts          (writes the doc)
//      npx -y tsx scripts/gen-card-categories.ts --check  (verify it is current)
//
// --check additionally fails on four things the taxonomy must never do:
//   1. leave a card unclassified (fix a pattern, or add an override);
//   2. keep a category with no cards in it (a dead bucket);
//   3. carry an override for a card id that does not exist;
//   4. classify a card in one of draft.ts's exclusive COMBO_TAGS families as an
//      incidental rider (clock, reroll, marking). Those cards are, by the
//      engine's own account, oppressive primary effects; if one lands in a rider
//      bucket the ladder has mis-read it.

import { ALL_NERFS } from "../src/engine/nerfs/library";
import { ALL_BUFFS } from "../src/engine/buffs/library";
import { COMBO_TAGS } from "../src/engine/draft";
import { isBoon } from "../src/engine/buff";
import type { Buff } from "../src/engine/buff";
import {
  EFFECT_CATEGORY_DEFS,
  EFFECT_CATEGORY_OVERRIDES,
  UNCLASSIFIED,
  classifyCardEffect,
  buffToClassifiable,
  nerfToClassifiable,
} from "../src/lib/cardEffectCategories";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(__dirname, "..", "docs", "card-categories.md");

// Rider buckets: real effects, but ones that ride along on a bigger card. No
// member of an exclusive COMBO_TAGS family may end up in one (check #4).
const RIDER_CATEGORIES = new Set([
  "no-op-cosmetic",
  "clock-gain-self",
  "clock-drain-enemy",
  "card-tutor-gain",
  "draft-advantage",
  "target-marking",
  "randomness-gamble",
  "delayed-contract",
]);

type Family = "buff" | "hex" | "boon" | "item" | "apex" | "nerf";

// Same split scripts/audit-cards.ts reports, so the two docs agree on families.
function family(b: Buff): Family {
  if (b.tier >= 9 || b.special) return "apex";
  if (b.category === "hex") return "hex";
  if (b.category === "item") return "item";
  if (isBoon(b)) return "boon";
  return "buff";
}

type Row = {
  key: string;
  id: string;
  name: string;
  family: Family;
  tier: number;
  mechanic: string;
  description: string;
  effectCategory: string;
};

const rows: Row[] = [];

for (const b of ALL_BUFFS) {
  rows.push({
    key: `buff:${b.id}`,
    id: b.id,
    name: b.name,
    family: family(b),
    tier: b.tier,
    mechanic: b.kind,
    description: b.description ?? "",
    effectCategory: classifyCardEffect(buffToClassifiable(b)),
  });
}
for (const n of ALL_NERFS) {
  rows.push({
    key: `nerf:${n.id}`,
    id: n.id,
    name: n.name,
    family: "nerf",
    tier: n.tier,
    mechanic: "passive-rule",
    description: n.description ?? "",
    effectCategory: classifyCardEffect(nerfToClassifiable(n)),
  });
}

const FAMILIES: Family[] = ["buff", "hex", "boon", "item", "apex", "nerf"];

const byCategory = new Map<string, Row[]>();
for (const r of rows) {
  const arr = byCategory.get(r.effectCategory) ?? [];
  arr.push(r);
  byCategory.set(r.effectCategory, arr);
}
for (const arr of byCategory.values()) {
  arr.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
}

// --- Consistency checks -----------------------------------------------------

const problems: string[] = [];

const unclassified = byCategory.get(UNCLASSIFIED) ?? [];
if (unclassified.length) {
  problems.push(
    `${unclassified.length} card(s) unclassified. Add a pattern to ` +
      `EFFECT_CATEGORY_DEFS or an entry to EFFECT_CATEGORY_OVERRIDES:\n` +
      unclassified.map((r) => `    ${r.key}  ${JSON.stringify(r.description)}`).join("\n"),
  );
}

const dead = EFFECT_CATEGORY_DEFS.filter((d) => !(byCategory.get(d.id)?.length ?? 0));
if (dead.length) {
  problems.push(
    `${dead.length} dead categor(ies) with no cards: ${dead.map((d) => d.id).join(", ")}. ` +
      `Merge them into a neighbour or widen their patterns.`,
  );
}

const knownKeys = new Set(rows.map((r) => r.key));
const staleOverrides = Object.keys(EFFECT_CATEGORY_OVERRIDES).filter((k) => !knownKeys.has(k));
if (staleOverrides.length) {
  problems.push(`Override key(s) match no card: ${staleOverrides.join(", ")}.`);
}
const knownCategories = new Set(EFFECT_CATEGORY_DEFS.map((d) => d.id));
const badOverrideTargets = Object.entries(EFFECT_CATEGORY_OVERRIDES)
  .filter(([, v]) => !knownCategories.has(v))
  .map(([k, v]) => `${k} -> ${v}`);
if (badOverrideTargets.length) {
  problems.push(`Override(s) point at no such category: ${badOverrideTargets.join(", ")}.`);
}

const categoryOf = new Map(rows.map((r) => [r.key, r.effectCategory]));
const riderComboCards: string[] = [];
for (const id of Object.keys(COMBO_TAGS)) {
  // A COMBO_TAGS id may name a buff, a nerf, or (for the nine reused ids) both.
  for (const key of [`buff:${id}`, `nerf:${id}`]) {
    const cat = categoryOf.get(key);
    if (cat && RIDER_CATEGORIES.has(cat)) riderComboCards.push(`${key} -> ${cat}`);
  }
}
if (riderComboCards.length) {
  problems.push(
    `Exclusive COMBO_TAGS card(s) classified as an incidental rider: ` +
      `${riderComboCards.join(", ")}. The ladder has mis-read the headline effect.`,
  );
}

// --- Render -----------------------------------------------------------------

const esc = (s: string) => s.replace(/\|/g, "/").replace(/\r?\n+/g, " ").trim();

const ordered = EFFECT_CATEGORY_DEFS.map((d) => ({ def: d, cards: byCategory.get(d.id) ?? [] })).sort(
  (a, b) => b.cards.length - a.cards.length || a.def.id.localeCompare(b.def.id),
);

const out: string[] = [];
out.push("# Card categories (generated by scripts/gen-card-categories.ts; do not edit)");
out.push("");
out.push(
  `Every one of the ${rows.length} shipped cards sorted into exactly one of ` +
    `${EFFECT_CATEGORY_DEFS.length} mechanical buckets, so a balance pass can read a ` +
    `whole family at once. The bucket is derived from the card's own rules text plus ` +
    `its engine hooks (see \`src/lib/cardEffectCategories.ts\`), never hand-tagged.`,
);
out.push("");
out.push(
  "Cards do several things at once, so the ladder is priority-ordered and " +
    "first-match-wins: a card that freezes a queen and grants 5 seconds is filed " +
    "under the freeze, not the clock. The bucket answers \"what is this card FOR\", " +
    "and the rider effects are still in the description column.",
);
out.push("");
out.push("## Summary");
out.push("");
out.push(`| category | what it covers | total | ${FAMILIES.join(" | ")} |`);
out.push(`|---|---|---|${FAMILIES.map(() => "---").join("|")}|`);
for (const { def, cards } of ordered) {
  const counts = FAMILIES.map((f) => {
    const n = cards.filter((c) => c.family === f).length;
    return n ? String(n) : "-";
  });
  out.push(
    `| [${def.id}](#${def.id}) | ${esc(def.label)} | ${cards.length} | ${counts.join(" | ")} |`,
  );
}
out.push("");

for (const { def, cards } of ordered) {
  out.push(`## ${def.id}`);
  out.push("");
  out.push(`**${esc(def.label)}** - ${esc(def.blurb)}`);
  out.push("");
  out.push(`${cards.length} cards.`);
  out.push("");
  out.push("| id | name | family | tier | trigger | rule |");
  out.push("|---|---|---|---|---|---|");
  for (const c of cards) {
    out.push(
      `| ${c.id} | ${esc(c.name)} | ${c.family} | ${c.tier} | ${c.mechanic} | ${esc(c.description)} |`,
    );
  }
  out.push("");
}

const doc = out.join("\n");

// --- Write or check ---------------------------------------------------------

if (process.argv.includes("--check")) {
  if (problems.length) {
    for (const p of problems) console.error(`[gen-card-categories] ${p}`);
    process.exit(1);
  }
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {}
  if (current !== doc) {
    console.error(
      "[gen-card-categories] OUT OF DATE: run `npx -y tsx scripts/gen-card-categories.ts` and commit docs/card-categories.md",
    );
    process.exit(1);
  }
  console.log(
    `[gen-card-categories] check OK: ${rows.length} cards across ${EFFECT_CATEGORY_DEFS.length} categories, 0 unclassified.`,
  );
} else {
  writeFileSync(OUT, doc);
  console.log(`[gen-card-categories] wrote ${OUT}`);
  console.log(
    `  ${rows.length} cards, ${EFFECT_CATEGORY_DEFS.length} categories, ` +
      `largest ${ordered[0].def.id} (${ordered[0].cards.length}), ` +
      `smallest ${ordered[ordered.length - 1].def.id} (${ordered[ordered.length - 1].cards.length})`,
  );
  for (const p of problems) console.error(`[gen-card-categories] WARNING: ${p}`);
  if (problems.length) process.exitCode = 1;
}
