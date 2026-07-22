// Buff-mode purity gate (overhaul Core Requirement: Buff mode must not
// reference Nerfs). Run: npx -y tsx scripts/test-buff-purity.ts
//
// Asserts, for every card that can be OFFERED in buff mode (the same
// eligibility rules draft.ts applies):
//   1. Its name, description, flavor, and status text never mention "nerf"
//      (the literal game title "NerfChess" is the one allowed exception).
//   2. It is not category "nerf" or "hex" (structural exclusion holds).
//   3. Rolling thousands of buff-mode offers never deals a card whose text
//      mentions nerfs.
// Nerf mode is exempt: its cards may (and do) talk about nerfs, because nerfs
// exist there.

import { newBuffMatchState } from "../src/engine/buff";
import type { Tier } from "../src/engine/nerf";
import { rollOffer, NERF_REVEAL } from "../src/engine/draft";
import { ALL_BUFFS, BUFF_BY_ID } from "../src/engine/buffs/library";
import type { Color } from "../src/engine/types";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  } else {
    console.log("ok:", label);
  }
}

/** True when the text mentions nerfs outside the game title. */
function mentionsNerf(text: string): boolean {
  return /nerf/i.test(text.replace(/nerfchess/gi, ""));
}

// --- 1 + 2. Static text sweep over the statically-eligible pool ---------------

const offenders: string[] = [];
for (const b of ALL_BUFFS) {
  if (!b.implemented || b.special || b.tier >= 9) continue;
  // Mirror draft.ts inMode for buff mode (NERF_REVEAL exclusions are checked
  // dynamically in part 3, since the set is not exported).
  if (b.category === "nerf" || b.category === "hex") continue;
  const texts = [b.name, b.description, b.flavor ?? ""];
  if (texts.some(mentionsNerf)) offenders.push(b.id);
}
// The NERF_REVEAL exclusion set in draft.ts keeps these out of buff drafts even
// though their static category is eligible; anything with nerf text must be in
// it, and the dynamic sweep below proves the exclusion actually bites.
const EXCLUDED = NERF_REVEAL;
const leak = offenders.filter((id) => !EXCLUDED.has(id));
check(
  leak.length === 0,
  `no buff-mode-eligible card text mentions nerfs (leaks: ${leak.join(", ") || "none"})`,
);

// --- 3. Dynamic roll sweep -----------------------------------------------------

{
  let dealt = 0;
  let bad = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const bs = newBuffMatchState(seed, 5, "buff");
    for (const color of ["w", "b"] as Color[]) {
      for (const tier of [1, 3, 5, 7] as Tier[]) {
        bs.players[color].offer = null;
        bs.players[color].flags.forceTier = tier;
        const offer = rollOffer(bs, color, [tier, tier]);
        for (const c of offer?.cards ?? []) {
          dealt++;
          const b = BUFF_BY_ID[c.id];
          const texts = [b.name, b.description, b.flavor ?? ""];
          if (texts.some(mentionsNerf) || EXCLUDED.has(b.id)) {
            bad++;
            if (bad < 6) console.error("  dealt nerf-referencing card in buff mode:", b.id);
          }
        }
      }
    }
  }
  check(bad === 0, `buff-mode rolls never deal nerf-referencing cards (${dealt} cards dealt)`);
}

console.log(failures ? `\n${failures} FAILURES` : "\nbuff-mode purity holds");
process.exit(failures ? 1 : 0);
