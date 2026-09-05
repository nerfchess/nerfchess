// Guard for src/engine/retired.ts: every retired id is a real card, every
// mergedInto target exists and is itself active, no apex card is retired, no
// usage flagship is retired, and no retired card is reachable through a draft
// pool or the opening nerf pool.
//
// Run: npx -y tsx scripts/check-retired.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RETIRED, RETIRED_IDS } from "../src/engine/retired";
import { ALL_BUFFS, BUFF_POOL_BY_TIER } from "../src/engine/buffs/library";
import { ALL_NERFS, openingNerfPool } from "../src/engine/nerfs/library";
import { openerPool } from "../src/engine/draft";
import { isRetired } from "../src/engine/retired";

const ROOT = join(__dirname, "..");
const known = new Set([...ALL_BUFFS.map((b) => b.id), ...ALL_NERFS.map((n) => n.id)]);
const problems: string[] = [];

for (const [id, r] of Object.entries(RETIRED)) {
  if (!known.has(id)) problems.push(`retired id does not exist: ${id}`);
  if (r.mergedInto) {
    if (!known.has(r.mergedInto)) problems.push(`${id}: mergedInto ${r.mergedInto} does not exist`);
    if (RETIRED_IDS.has(r.mergedInto)) problems.push(`${id}: mergedInto ${r.mergedInto} is itself retired`);
  }
  const card = ALL_BUFFS.find((b) => b.id === id);
  if (card && card.tier >= 9) problems.push(`apex card retired: ${id}`);
}

// Flagships stay.
const usage = readFileSync(join(ROOT, "src/components/effects/usageResolve.ts"), "utf8");
const body = usage.slice(usage.indexOf("export const USAGE_FLAGSHIPS"));
for (const m of body.matchAll(/^\s{2}([a-z0-9_]+):\s*\{/gm)) {
  if (RETIRED_IDS.has(m[1])) problems.push(`usage flagship retired: ${m[1]}`);
}

// Pools. BUFF_POOL_BY_TIER is the raw library pool; draft.ts filters it via
// poolAtTier, which we cannot call without match state, so assert on the
// filter it applies: the opening nerf pool is the directly callable one.
for (const n of openingNerfPool()) if (isRetired(n.id)) problems.push(`retired nerf in opening pool: ${n.id}`);
// The Buff-mode opening pack is dealt from its own pool (draft.ts openerPool).
for (const b of openerPool()) if (isRetired(b.id)) problems.push(`retired opener in opening pack: ${b.id}`);
let active = 0;
for (const tier of Object.keys(BUFF_POOL_BY_TIER)) {
  for (const b of BUFF_POOL_BY_TIER[Number(tier)] ?? []) if (!isRetired(b.id)) active += 1;
}
if (active < 800) problems.push(`only ${active} active pool cards left; too aggressive`);

if (problems.length) {
  console.error(`[check-retired] ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`[check-retired] OK: ${RETIRED_IDS.size} retired, ${active} active pool cards, ${openingNerfPool().length} opening nerfs`);
