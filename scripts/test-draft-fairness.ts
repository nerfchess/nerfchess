// Draft-RNG fairness gate (overhaul, Core Requirement 6). Run with:
//
//   npx -y tsx scripts/test-draft-fairness.ts
//
// Proves, with seeded simulations large enough to detect meaningful bias:
// 1. UNIFORMITY: once a slot's tier is resolved, every eligible card in that
//    tier's pool is drawn equally often (chi-square over ~120k draws per
//    mode/tier), in buff mode and nerf mode, for both colors.
// 2. NO COLLECTION BIAS: Funny/Fantasy/PT-collection membership gives a card
//    no edge over its same-tier peers (grouped rate ratio ~1).
// 3. NO PER-CARD MULTIPLIER: chess_diff (formerly 2x) rolls at peer rate.
// 4. REROLLS are fair: the fresh cards drawn by rerollOffer are uniform over
//    the eligible pool minus the excluded on-table cards.
// 5. BANKED offers (+1 tier) are uniform inside the lifted tier's pool.
// 6. COLOR SYMMETRY: white and black tallies over the same seeds agree within
//    noise.
//
// The chi-square threshold uses a normal approximation of the chi-square
// distribution (Wilson-Hilferty) at p=0.001, so the gate fails loudly on real
// bias but never flakes on seeded noise (the seeds are fixed).

import { newBuffMatchState } from "../src/engine/buff";
import type { DraftMode } from "../src/engine/buff";
import { rollOffer, rerollOffer, COMBO_TAGS, NERF_REVEAL } from "../src/engine/draft";
import { ALL_BUFFS, BUFF_BY_ID } from "../src/engine/buffs/library";
import { FUNNY_CARDS } from "../src/engine/buffs/funny";
import { FANTASY_CARDS } from "../src/engine/buffs/fantasy";
import { PT_CARDS } from "../src/engine/buffs/pt";
import { isBoon } from "../src/engine/buff";
import type { Buff } from "../src/engine/buff";
import type { Tier } from "../src/engine/nerf";
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

// Mirror of draft.ts inMode eligibility for a fresh player (no held cards, no
// combo tags, nerf active, no board threaded so requires-guard is skipped).
function eligible(mode: DraftMode, b: Buff): boolean {
  if (b.special || b.tier === 9 || b.tier === 10) return false;
  if (!b.implemented) return false;
  if (mode === "buff") {
    return b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id);
  }
  return isBoon(b) || b.category === "hex" || b.category === "item";
}

/** Wilson-Hilferty chi-square upper tail bound at roughly p=0.001. */
function chiSquareLimit(df: number): number {
  const z = 3.09; // ~p=0.001 one-sided normal quantile
  const t = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
  return df * t * t * t;
}

function tierPool(mode: DraftMode, tier: Tier): Buff[] {
  return ALL_BUFFS.filter((b) => b.tier === tier && eligible(mode, b));
}

// --- 1 + 2 + 3. Uniformity per mode/tier, collection + per-card bias --------

const COLLECTION_IDS = new Set([...FUNNY_CARDS, ...PT_CARDS, ...FANTASY_CARDS].map((c) => c.id));

for (const mode of ["buff", "nerf"] as DraftMode[]) {
  for (const tier of [1, 3, 6] as Tier[]) {
    const pool = tierPool(mode, tier);
    if (pool.length < 4) continue; // nothing meaningful to test at this tier
    const tally = new Map<string, number>(pool.map((b) => [b.id, 0]));
    const colorTally: Record<Color, number> = { w: 0, b: 0 };
    let draws = 0;
    // Fixed-tier offers: force both slots to `tier` via forceTier so the tier
    // roll itself never blurs the pool under test. Fresh state per round so
    // held-card exclusion never accumulates.
    const target = Math.max(60 * pool.length, 20000);
    for (let seed = 1; draws < target; seed++) {
      const bs = newBuffMatchState(seed, 5, mode);
      for (const color of ["w", "b"] as Color[]) {
        bs.players[color].flags.forceTier = tier;
        const offer = rollOffer(bs, color, [tier, tier]);
        for (const c of offer?.cards ?? []) {
          if (!tally.has(c.id)) continue; // adjacent-tier fallback (dry pool)
          tally.set(c.id, (tally.get(c.id) ?? 0) + 1);
          colorTally[color]++;
          draws++;
        }
      }
    }
    // Cards under a combo tag or requires-guard can be suppressed in real
    // games; with a fresh player and no board neither applies, so every pool
    // card competes. Chi-square across the pool:
    const expected = draws / pool.length;
    let chi = 0;
    for (const [, n] of tally) chi += ((n - expected) * (n - expected)) / expected;
    const limit = chiSquareLimit(pool.length - 1);
    check(
      chi < limit,
      `${mode} T${tier}: uniform draw over ${pool.length} cards (chi2 ${chi.toFixed(1)} < ${limit.toFixed(1)}, ${draws} draws)`,
    );
    // Collection bias: boosted-collection members vs the rest.
    const inColl = pool.filter((b) => COLLECTION_IDS.has(b.id));
    const outColl = pool.filter((b) => !COLLECTION_IDS.has(b.id));
    if (inColl.length >= 3 && outColl.length >= 3) {
      const rate = (set: Buff[]) =>
        set.reduce((a, b) => a + (tally.get(b.id) ?? 0), 0) / set.length;
      const ratio = rate(inColl) / rate(outColl);
      check(
        ratio > 0.85 && ratio < 1.18,
        `${mode} T${tier}: no collection bias (funny/fantasy per-card rate ratio ${ratio.toFixed(3)})`,
      );
    }
    // chess_diff per-card fairness (tier 6 pools only).
    const diff = pool.find((b) => b.id === "chess_diff");
    if (diff) {
      const peerAvg = (draws - (tally.get("chess_diff") ?? 0)) / (pool.length - 1);
      const ratio = (tally.get("chess_diff") ?? 0) / peerAvg;
      check(
        ratio > 0.8 && ratio < 1.25,
        `${mode} T${tier}: chess_diff at peer rate (ratio ${ratio.toFixed(3)})`,
      );
    }
    // Color symmetry over the same seed set.
    const colorRatio = colorTally.w / Math.max(1, colorTally.b);
    check(
      colorRatio > 0.93 && colorRatio < 1.075,
      `${mode} T${tier}: color symmetry (w/b draw ratio ${colorRatio.toFixed(3)})`,
    );
  }
}

// --- 4. Reroll fairness ------------------------------------------------------

{
  const mode: DraftMode = "buff";
  const tier = 3 as Tier;
  const pool = tierPool(mode, tier);
  const tally = new Map<string, number>(pool.map((b) => [b.id, 0]));
  let draws = 0;
  const target = Math.max(40 * pool.length, 12000);
  for (let seed = 1; draws < target; seed++) {
    const bs = newBuffMatchState(seed, 5, mode);
    bs.players.w.flags.forceTier = tier;
    const offer = rollOffer(bs, "w", [tier, tier]);
    if (!offer) continue;
    const excluded = new Set(offer.cards.map((c) => c.id));
    if (!rerollOffer(bs, "w")) continue;
    for (const c of bs.players.w.offer?.cards ?? []) {
      if (excluded.has(c.id)) {
        check(false, `reroll re-dealt an on-table card (${c.id})`);
        break;
      }
      if (!tally.has(c.id)) continue;
      tally.set(c.id, (tally.get(c.id) ?? 0) + 1);
      draws++;
    }
  }
  // Each roll excludes 2 on-table cards, so per-card expectation is not
  // perfectly flat; with pool >> 2 the deviation is far below the chi-square
  // gate. Test uniformity across the pool:
  const expected = draws / pool.length;
  let chi = 0;
  for (const [, n] of tally) chi += ((n - expected) * (n - expected)) / expected;
  const limit = chiSquareLimit(pool.length - 1) * 1.15; // slack for exclusion effect
  check(chi < limit, `rerolls uniform (chi2 ${chi.toFixed(1)} < ${limit.toFixed(1)}, ${draws} draws)`);
}

// --- 5. Banked (+1 tier) offers are uniform in the lifted pool ----------------

{
  const mode: DraftMode = "buff";
  const base = 2 as Tier;
  const lifted = 3 as Tier;
  const pool = tierPool(mode, lifted);
  const tally = new Map<string, number>(pool.map((b) => [b.id, 0]));
  let draws = 0;
  const target = Math.max(40 * pool.length, 12000);
  for (let seed = 1; draws < target; seed++) {
    const bs = newBuffMatchState(seed, 5, mode);
    bs.players.w.flags.bankBonus = 1; // banked skip: +1 tier on this offer
    const offer = rollOffer(bs, "w", [base, base]);
    for (const c of offer?.cards ?? []) {
      if (!tally.has(c.id)) continue;
      tally.set(c.id, (tally.get(c.id) ?? 0) + 1);
      draws++;
    }
  }
  const expected = draws / pool.length;
  let chi = 0;
  for (const [, n] of tally) chi += ((n - expected) * (n - expected)) / expected;
  const limit = chiSquareLimit(pool.length - 1);
  check(chi < limit, `banked offers uniform at lifted tier (chi2 ${chi.toFixed(1)} < ${limit.toFixed(1)}, ${draws} draws)`);
}

// --- Legitimate eligibility rules still hold ----------------------------------

{
  // Combo-tag suppression is eligibility, not weighting: a held turn-theft
  // card removes other turn-theft cards from the pool entirely.
  const mode: DraftMode = "buff";
  const bs = newBuffMatchState(7, 5, mode);
  bs.players.w.buffs.push({ id: "time_skip", tier: 6 as Tier, state: {} });
  bs.players.w.flags.forceTier = 6 as Tier;
  let sawTagged = false;
  for (let i = 0; i < 200; i++) {
    bs.players.w.offer = null;
    const offer = rollOffer(bs, "w", [6 as Tier, 6 as Tier]);
    for (const c of offer?.cards ?? []) {
      if ((COMBO_TAGS[c.id] ?? []).includes("turn-theft")) sawTagged = true;
    }
  }
  check(!sawTagged, "combo-tag family never offered while one is held (eligibility rule intact)");
}

{
  // Buff mode never rolls hexes or nerf-relief; nerf mode rolls only its pool.
  for (const mode of ["buff", "nerf"] as DraftMode[]) {
    let bad = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const bs = newBuffMatchState(seed, 5, mode);
      for (const color of ["w", "b"] as Color[]) {
        const offer = rollOffer(bs, color, [4 as Tier, 4 as Tier]);
        for (const c of offer?.cards ?? []) {
          const b = BUFF_BY_ID[c.id];
          if (!b || !eligible(mode, b)) bad++;
        }
      }
    }
    check(bad === 0, `${mode} mode only ever offers its eligible pool (${bad} leaks)`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nall fairness checks passed");
process.exit(failures ? 1 : 0);
