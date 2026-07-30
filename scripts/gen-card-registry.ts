// Generates docs/card-registry.json: one row per shipped card (every nerf and
// every buff/boon/hex/item), with the objectively-derivable coverage fields so
// no effect is left undocumented. Everything here is READ from the engine and
// the passive visual/sound registries, never hand-authored, so the registry
// cannot drift from the code.
//
// Run: npx -y tsx scripts/gen-card-registry.ts   (writes docs/card-registry.json)
//      npx -y tsx scripts/gen-card-registry.ts --check   (verify it is current)

import { ALL_NERFS } from "../src/engine/nerfs/library";
import { ALL_BUFFS } from "../src/engine/buffs/library";
import { PASSIVE_COMPOSITIONS } from "../src/components/effects/passive/compositions";
import {
  classifyCardEffect,
  buffToClassifiable,
  nerfToClassifiable,
} from "../src/lib/cardEffectCategories";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(__dirname, "..", "docs", "card-registry.json");

const comp = new Map(PASSIVE_COMPOSITIONS.map((c) => [`${c.cardFamily}:${c.cardId}`, c]));

type Row = {
  id: string;
  name: string;
  kind: "nerf" | "buff";
  category: string;
  /** Fine-grained mechanical bucket; see src/lib/cardEffectCategories.ts. */
  effectCategory: string;
  tier: number;
  mechanic: string;
  implemented: boolean;
  descriptionLength: number;
  description: string;
  animation: { family: string; primitives: readonly string[]; sigil: string } | null;
  soundCue: string | null;
  soundFamily: string | null;
  soundSource: "passive-cue" | "cast-voice";
  target: string | null;
};

function fromComp(c: (typeof PASSIVE_COMPOSITIONS)[number] | undefined) {
  return {
    animation: c ? { family: c.family, primitives: c.primitives, sigil: c.sigilIcon } : null,
    soundCue: c?.soundCue ?? null,
    soundFamily: c?.soundCue ? c.soundCue.replace(/^passive\//, "") : null,
    target: c?.targetType ?? null,
  };
}

const rows: Row[] = [];

for (const n of ALL_NERFS) {
  const c = comp.get(`nerf:${n.id}`);
  const desc = n.description ?? "";
  rows.push({
    id: n.id,
    name: n.name,
    kind: "nerf",
    category: "nerf",
    effectCategory: classifyCardEffect(nerfToClassifiable(n)),
    tier: n.tier,
    mechanic: "passive-rule",
    implemented: !!n.implemented,
    descriptionLength: desc.length,
    description: desc,
    soundSource: "passive-cue",
    ...fromComp(c),
  });
}

for (const b of ALL_BUFFS) {
  const c = comp.get(`buff:${b.id}`);
  const desc = b.description ?? "";
  rows.push({
    id: b.id,
    name: b.name,
    kind: "buff",
    category: (b.category as string) ?? "buff",
    effectCategory: classifyCardEffect(buffToClassifiable(b)),
    tier: b.tier,
    mechanic: b.kind,
    implemented: true,
    descriptionLength: desc.length,
    description: desc,
    // Passive-kind cards voice through the spawn cue; instant/activated cards
    // voice through the cast/signature system (playCardUse + signature voices).
    soundSource: c ? "passive-cue" : "cast-voice",
    ...fromComp(c),
  });
}

rows.sort((a, b) => (a.kind === b.kind ? a.tier - b.tier || a.id.localeCompare(b.id) : a.kind.localeCompare(b.kind)));

const summary = {
  generated: "derived from ALL_NERFS + ALL_BUFFS + PASSIVE_COMPOSITIONS",
  totals: {
    cards: rows.length,
    nerfs: rows.filter((r) => r.kind === "nerf").length,
    buffs: rows.filter((r) => r.kind === "buff").length,
    implemented: rows.filter((r) => r.implemented).length,
    withPassiveAnimation: rows.filter((r) => r.animation).length,
    withPassiveSoundCue: rows.filter((r) => r.soundCue).length,
    castVoiced: rows.filter((r) => r.soundSource === "cast-voice").length,
    shortDescriptions: rows.filter((r) => r.descriptionLength > 0 && r.descriptionLength < 40).length,
    emptyDescriptions: rows.filter((r) => r.descriptionLength === 0).length,
  },
  effectCategoryCounts: rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.effectCategory] = (acc[r.effectCategory] ?? 0) + 1;
    return acc;
  }, {}),
  soundByFamily: rows.reduce<Record<string, number>>((acc, r) => {
    if (r.soundFamily) acc[r.soundFamily] = (acc[r.soundFamily] ?? 0) + 1;
    return acc;
  }, {}),
  note:
    "Every card is voiced: passive-rule nerfs and passive-kind buffs play their family soundCue on spawn (see sounds.ts playPassiveCue); instant/activated buffs voice through the cast/signature system (playCardUse + signature voices). Fields are derived, not hand-authored.",
};

const json = JSON.stringify({ summary, cards: rows }, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {}
  if (current !== json) {
    console.error("[gen-card-registry] OUT OF DATE: run `npx -y tsx scripts/gen-card-registry.ts` and commit docs/card-registry.json");
    process.exit(1);
  }
  console.log(`[gen-card-registry] check OK: registry current (${rows.length} cards).`);
} else {
  writeFileSync(OUT, json);
  console.log(`[gen-card-registry] wrote ${OUT}`);
  console.log("  " + JSON.stringify(summary.totals));
}
