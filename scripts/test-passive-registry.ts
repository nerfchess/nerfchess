/**
 * test-passive-registry.ts
 *
 * Coverage and integrity gate for the passive visual registry. Run via tsx:
 *   npm run test:passive-registry
 *
 * Fails the build on any of:
 *   - a passive (implemented nerf or kind:"passive" buff) with no registry entry
 *   - a duplicate sentence (family, primitives, target, sigil) across cards
 *   - a composition of more than 3 primitives
 *   - a spawn duration over the card's tier budget
 *   - a missing reduced-motion fallback
 *   - an unknown primitive, aura, or pulse key
 *
 * This is the enforcement the spec promises (docs/passive-effect-language.md:3):
 * "A passive without an entry here fails the build."
 */

import { ALL_NERFS } from "../src/engine/nerfs/library";
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import { PASSIVE_REGISTRY, PASSIVE_VISUALS, passiveKey, type PassiveVisual } from "../src/components/effects/passive/registry";
import {
  AURA_KEYS,
  PRIMITIVE_KEYS,
  PRIMITIVE_MANIFEST,
  PULSE_KEYS,
  spawnDurationForTier,
} from "../src/components/effects/passive/spec";

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const primitiveSet = new Set<string>(PRIMITIVE_KEYS);
const auraSet = new Set<string>(AURA_KEYS);
const pulseSet = new Set<string>(PULSE_KEYS);

// ---------------------------------------------------------------------------
// 1. Coverage: every live passive has an entry.
// ---------------------------------------------------------------------------

let nerfCount = 0;
for (const n of ALL_NERFS) {
  if (!n.implemented) continue;
  nerfCount++;
  if (!PASSIVE_REGISTRY.has(passiveKey("nerf", n.id))) {
    fail(`Missing registry entry for passive nerf '${n.id}' (${n.name}).`);
  }
}

let buffCount = 0;
for (const b of Object.values(BUFF_BY_ID)) {
  if (b.kind !== "passive") continue;
  buffCount++;
  if (!PASSIVE_REGISTRY.has(passiveKey("buff", b.id))) {
    fail(`Missing registry entry for passive buff '${b.id}' (${b.name}).`);
  }
}

// ---------------------------------------------------------------------------
// 2. Per-entry integrity.
// ---------------------------------------------------------------------------

function sentence(v: PassiveVisual): string {
  return `${v.family}|${v.composition.join(",")}|${v.targetType}|${v.sigilIcon}`;
}

const seenSentence = new Map<string, string>();

for (const v of PASSIVE_VISUALS) {
  const id = passiveKey(v.cardFamily, v.cardId);

  // Composition size.
  if (v.composition.length < 1 || v.composition.length > 3) {
    fail(`${id}: composition must be 1..3 primitives, got ${v.composition.length} [${v.composition.join(",")}].`);
  }

  // Unknown primitive keys.
  for (const p of v.composition) {
    if (!primitiveSet.has(p)) fail(`${id}: unknown primitive '${p}'.`);
    if (!PRIMITIVE_MANIFEST[p]) fail(`${id}: primitive '${p}' missing from PRIMITIVE_MANIFEST.`);
  }

  // Unknown aura / pulse keys.
  if (!auraSet.has(v.auraKey)) fail(`${id}: unknown aura key '${v.auraKey}'.`);
  if (!pulseSet.has(v.pulseKey)) fail(`${id}: unknown pulse key '${v.pulseKey}'.`);

  // Duration within tier budget.
  const budget = spawnDurationForTier(v.tier);
  if (v.spawnDurationMs > budget) {
    fail(`${id}: spawn duration ${v.spawnDurationMs}ms over tier-${v.tier} budget ${budget}ms.`);
  }
  if (v.spawnDurationMs > 1400) {
    fail(`${id}: spawn duration ${v.spawnDurationMs}ms exceeds the hard 1400ms cap.`);
  }

  // Reduced-motion fallback present.
  if (!v.reducedMotion || !v.reducedMotion.staticSigil || typeof v.reducedMotion.fadeMs !== "number") {
    fail(`${id}: missing reduced-motion fallback.`);
  }

  // Sentence uniqueness.
  const s = sentence(v);
  const prior = seenSentence.get(s);
  if (prior) {
    fail(`Duplicate sentence between '${prior}' and '${id}': ${s}`);
  } else {
    seenSentence.set(s, id);
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`FAIL: passive registry has ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more.`);
  process.exit(1);
}

console.log(
  `PASS: passive registry OK. ${PASSIVE_VISUALS.length} entries ` +
    `(${nerfCount} nerfs, ${buffCount} buffs), all sentences unique, all budgets and keys valid.`,
);
