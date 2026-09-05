// Verifies the glossary's board-effect coverage promised in glossary.ts:
// every ActiveEffect kind, freeze skin, and cosmetic skin maps to a REAL
// glossary entry with a non-empty one-line definition. (Completeness of the
// maps themselves is enforced by the Record types at compile time; this
// script catches a mapped slug that points at nothing.)
//
//   npx tsx scripts/check-glossary-effects.ts

import {
  COSMETIC_SKIN_SLUG,
  EFFECT_KIND_SLUG,
  FREEZE_SKIN_SLUG,
  entryForSlug,
} from "../src/lib/glossary";

let failures = 0;
function checkMap(name: string, map: Record<string, string>) {
  const entries = Object.entries(map);
  if (!entries.length) {
    failures++;
    console.error(`  FAIL ${name} has no entries at all (glossary map/import broke)`);
    return;
  }
  for (const [key, slug] of entries) {
    const entry = entryForSlug(slug);
    if (!entry) {
      failures++;
      console.error(`  FAIL ${name}.${key} -> "${slug}" resolves to no glossary entry`);
    } else if (!entry.def || entry.def.trim().length < 10) {
      failures++;
      console.error(`  FAIL ${name}.${key} -> "${slug}" has no usable one-line definition`);
    }
  }
}

console.log("glossary effect coverage");
checkMap("EFFECT_KIND_SLUG", EFFECT_KIND_SLUG);
checkMap("FREEZE_SKIN_SLUG", FREEZE_SKIN_SLUG);
checkMap("COSMETIC_SKIN_SLUG", COSMETIC_SKIN_SLUG);

if (failures) {
  console.error(`\n${failures} glossary coverage failure(s)`);
  process.exit(1);
}
console.log("glossary effect coverage: OK");
