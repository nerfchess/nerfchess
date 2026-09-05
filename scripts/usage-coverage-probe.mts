// Helper for scripts/check-usage-coverage.cjs: runs the REAL usage resolver
// (src/components/effects/usageResolve.ts) over every implemented instant /
// activated buff and prints one JSON line. Same honesty argument as the vfx
// probe: importing the resolver is what keeps the gate meaningful — a parsed
// copy of the tables would be its own drift point.

import { resolveUsage, USAGE_FAMILIES, USAGE_FLAGSHIPS } from "../src/components/effects/usageResolve";
import { ALL_BUFFS } from "../src/engine/buffs/library";

const usable: Record<string, { family: string; crown: boolean; tier: number; tuple: string }> = {};
for (const def of ALL_BUFFS) {
  if (!def.implemented || def.kind === "passive") continue;
  const r = resolveUsage(def);
  const v = r.variant;
  usable[def.id] = {
    family: r.family,
    crown: r.crown,
    tier: def.tier,
    tuple: `${v.rot}|${v.scale.toFixed(2)}|${v.mirror ? 1 : 0}|${v.hueNudge}|${v.delayJitter}|${((v.seed >>> 21) % 7) - 3}`,
  };
}

process.stdout.write(
  JSON.stringify({
    usable,
    families: USAGE_FAMILIES,
    flagships: Object.keys(USAGE_FLAGSHIPS),
  }) + "\n",
);
