// Triage the win-rate sweep into the three findings worth acting on.
//
//   npx -y tsx scripts/report-card-winrate.ts
//   npx -y tsx scripts/report-card-winrate.ts --category mass-freeze
//
// WHY THIS IS SEPARATE FROM THE SWEEP
//
// The sweep takes hours; reading it should take a second. Keeping the analysis
// in its own script means a question about the data does not cost another run,
// and it means the merge of the four shards happens in exactly one place.
//
// WHAT IT REPORTS, AND IN WHAT ORDER
//
// 1. NOT MEASURED. Cards the bot never fired. These come FIRST because they
//    are not a balance result at all - they are a bug report about the
//    activation policy or about trigger conditions that never come up. Reading
//    a delta for one of these would be reading the harness's own silence.
// 2. WRONG SIGN. A card that measurably HURTS its holder is broken or
//    backwards, and that is the highest-value finding here.
// 3. TIER DISAGREES. Power that contradicts the price on the tin, compared
//    WITHIN a mechanical category so a hex is judged against a buff doing the
//    same job rather than against the library average.
//
// Significance is per card, at twice its own empirical standard error. Cards
// inside that band are reported as a count, not as a list of zeroes: they are
// "not resolved at this sample size", which is a different claim from "this
// card does nothing".

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");

interface Row {
  id: string;
  name: string;
  tier: number;
  category: string;
  kind: string;
  delta: number;
  pairs: number;
  voided: number;
  firedPairs: number;
  stderr: number;
}

interface Shard {
  games: number;
  skill: number;
  plyCap: number;
  codeHash?: string;
  rows: Row[];
}

/**
 * Merge the shards, refusing to mix runs.
 *
 * Shards are separate processes and can easily be left over from an earlier
 * sweep. Blending a stale shard into a fresh one produces a table that looks
 * complete and is quietly half wrong, which has already happened once here, so
 * the merge fails loudly on a settings or code-hash mismatch instead of
 * concatenating whatever it finds.
 */
function load(): { rows: Row[]; meta: Shard } {
  const files = fs
    .readdirSync(DOCS)
    .filter((f) => /^card-winrate(\.shard\d+)?\.json$/.test(f))
    .map((f) => path.join(DOCS, f));
  if (!files.length) {
    console.error("No sweep output found. Run scripts/sim-card-winrate.ts --write first.");
    process.exit(1);
  }
  const shards = files.map((f) => JSON.parse(fs.readFileSync(f, "utf8")) as Shard);
  const first = shards[0];
  for (const s of shards.slice(1)) {
    if (s.games !== first.games || s.plyCap !== first.plyCap || s.codeHash !== first.codeHash) {
      console.error(
        "REFUSING to merge: shards disagree on settings or code hash. One is from an " +
          "older run; delete the stale files and re-run that shard.",
      );
      process.exit(1);
    }
  }
  const byId = new Map<string, Row>();
  for (const s of shards) for (const r of s.rows) byId.set(r.id, r);
  return { rows: [...byId.values()], meta: first };
}

const moved = (r: Row): boolean => Math.abs(r.delta) > 2 * r.stderr;
const fmt = (r: Row): string =>
  `${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}pt +-${r.stderr.toFixed(1)}  t${r.tier}  ` +
  `${r.id}  (${r.category}, ${r.kind}, ${r.pairs} pairs)`;

function main(): void {
  const { rows, meta } = load();
  const only = process.argv.find((a) => a.startsWith("--category="))?.slice(11);
  const pool = only ? rows.filter((r) => r.category === only) : rows;

  console.log(
    `[winrate] ${pool.length} cards at ${meta.games} paired games, skill ${meta.skill}, ` +
      `${meta.plyCap}-ply cap (code ${meta.codeHash ?? "unknown"})`,
  );

  // --- 1. Not measured ------------------------------------------------------
  const unused = pool.filter((r) => r.firedPairs === 0);
  const usable = pool.filter((r) => r.firedPairs > 0);
  console.log(`\n=== NOT MEASURED (${unused.length}) ===`);
  console.log("The bot never fired these, so their delta describes nothing. Fix the");
  console.log("policy or the trigger before reading a number for them.");
  const byCat = new Map<string, number>();
  for (const r of unused) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
  for (const [c, n] of [...byCat].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(4)}  ${c}`);
  }

  // --- 2. Wrong sign --------------------------------------------------------
  const negative = usable.filter((r) => moved(r) && r.delta < 0).sort((a, b) => a.delta - b.delta);
  console.log(`\n=== WRONG SIGN (${negative.length}) ===`);
  console.log("These measurably HURT their holder. Broken, backwards, or a drawback");
  console.log("that outweighs the benefit.");
  for (const r of negative.slice(0, 25)) console.log(`  ${fmt(r)}`);

  // --- 3. Tier disagrees ----------------------------------------------------
  console.log("\n=== TIER LADDER ===");
  console.log("Mean delta by tier over cards that actually fired. It should rise.");
  for (let t = 1; t <= 10; t++) {
    const at = usable.filter((r) => r.tier === t);
    if (!at.length) continue;
    const mean = at.reduce((s, r) => s + r.delta, 0) / at.length;
    const sig = at.filter(moved).length;
    console.log(
      `  t${String(t).padEnd(2)} ${mean >= 0 ? "+" : ""}${mean.toFixed(1)}pt  ` +
        `(${at.length} cards, ${sig} resolved)`,
    );
  }

  // Within-category outliers: a card far from its own bucket's mean is
  // mispriced relative to cards doing the same job, which is a sharper signal
  // than distance from the library average.
  console.log("\n=== MISPRICED WITHIN CATEGORY ===");
  const cats = new Map<string, Row[]>();
  for (const r of usable) {
    const g = cats.get(r.category);
    if (g) g.push(r);
    else cats.set(r.category, [r]);
  }
  const outliers: { r: Row; gap: number; mean: number }[] = [];
  for (const [, group] of cats) {
    if (group.length < 4) continue; // too few to have a meaningful bucket mean
    const mean = group.reduce((s, r) => s + r.delta, 0) / group.length;
    for (const r of group) {
      if (!moved(r)) continue;
      const gap = r.delta - mean;
      if (Math.abs(gap) > 2 * r.stderr) outliers.push({ r, gap, mean });
    }
  }
  outliers.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  for (const o of outliers.slice(0, 25)) {
    console.log(
      `  ${o.gap >= 0 ? "+" : ""}${o.gap.toFixed(1)} vs its category mean ` +
        `(${o.mean.toFixed(1)})  ${fmt(o.r)}`,
    );
  }

  const unresolved = usable.filter((r) => !moved(r)).length;
  console.log(
    `\n${unresolved} of ${usable.length} fired cards did not resolve at this sample size. ` +
      "That is 'not resolved', not 'does nothing'.",
  );
}

main();
