// Helper for scripts/check-treatment-coverage.cjs: runs the REAL per-piece
// treatment resolver (src/components/effects/pieceTreatment.ts) over every
// implemented fx card and prints one JSON line. Importing the resolver keeps
// the gate honest — a parsed copy of the family tables would drift.

import {
  CONSTRAINT_FAMILY_NAMES,
  EMPOWER_FAMILY_NAMES,
  resolvePieceTreatment,
} from "../src/components/effects/pieceTreatment";
import { ALL_BUFFS } from "../src/engine/buffs/library";

const cards: Record<string, { family: string; filter: string; motif: string }> = {};
for (const def of ALL_BUFFS) {
  if (!def.implemented || !def.fx?.pieces) continue;
  const r = resolvePieceTreatment({ id: def.id, motif: def.fx.motif, tier: def.tier });
  cards[def.id] = { family: r.family, filter: r.filter, motif: def.fx.motif };
}

process.stdout.write(
  JSON.stringify({
    cards,
    constraintFamilies: CONSTRAINT_FAMILY_NAMES,
    empowerFamilies: EMPOWER_FAMILY_NAMES,
  }) + "\n",
);
