// Propose (and optionally apply) tier changes from the win-rate sweep.
//
//   npx -y tsx scripts/propose-retiers.ts           # the proposal
//   npx -y tsx scripts/propose-retiers.ts --write   # apply it to the card defs
//
// HOW A PROPOSAL IS EARNED
//
// A card has to clear four bars before this will touch it, because a tier
// change alters what appears in drafts and the cost of being wrong is real:
//
// 1. It FIRED. A card the bot never used has a delta that describes nothing.
// 2. It RESOLVED: |delta| > 2x its own empirical standard error. Anything
//    inside that band is "not resolved at this sample size", not "measured".
// 3. Its category is MEASURABLE here. info and draft cards are 100% and 95%
//    inert because the bot never reads information and one game has no future
//    draft; nerf-relief resolves for only 9 of 130 and with no consistent
//    sign. Those are facts about the harness, and retiering on them would be
//    acting on the instrument's blind spot.
// 4. It disagrees with its OWN CATEGORY, not with the library. Comparing
//    across categories is confounded: attack means +14.6 and draft means -0.8
//    largely because a single game shows removal and hides card economy. Peers
//    inside a category share that confound, so the comparison is fair.
//
// A card is then compared with the cards SHARING ITS TIER in its own category
// -- the cards the game claims are worth the same price for the same kind of
// effect -- and specifically against their top and bottom deciles rather than
// their mean. Most cards at any tier are inert, so a mean sits near zero and
// every mover clears it; beating the top decile of the cards charged the same
// price is a real claim about mispricing, and clearing a mean is not.
//
// CONFIDENCE
//
// Passives are marked high confidence: they have no activation policy, so a
// passive outlier is about the card. Activated cards are marked lower, because
// twice in this project a card that looked broken turned out to be the BOT
// playing it badly (Firm Footing, Detonate) -- both were fixed in the engine
// and both then measured positive.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const ENGINE = path.join(ROOT, "src", "engine", "buffs");
const WRITE = process.argv.includes("--write");

/** Categories the harness cannot measure, evidenced rather than assumed. */
const BLIND = new Set(["info", "draft", "nerf"]);

interface Row {
  id: string;
  name: string;
  tier: number;
  category: string;
  kind: string;
  delta: number;
  pairs: number;
  firedPairs: number;
  stderr: number;
}

function loadRows(): Row[] {
  const byId = new Map<string, Row>();
  for (const f of fs.readdirSync(DOCS).filter((x) => /^card-winrate\.shard\d+\.json$/.test(x))) {
    const s = JSON.parse(fs.readFileSync(path.join(DOCS, f), "utf8")) as { rows: Row[] };
    for (const r of s.rows) byId.set(r.id, r);
  }
  return [...byId.values()];
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

interface Proposal {
  row: Row;
  to: number;
  peers: number;
  confidence: "high" | "lower";
}

function main(): void {
  const rows = loadRows();
  const usable = rows.filter(
    (r) => r.firedPairs > 0 && !BLIND.has(r.category) && Math.abs(r.delta) > 2 * r.stderr,
  );

  const byCat = new Map<string, Row[]>();
  for (const r of rows.filter((x) => x.firedPairs > 0 && !BLIND.has(x.category))) {
    const g = byCat.get(r.category);
    if (g) g.push(r);
    else byCat.set(r.category, [r]);
  }

  // A card is compared with the cards that SHARE ITS TIER inside its own
  // category: those are the cards the game claims are worth the same price for
  // the same kind of effect. Measuring far above them means the price is wrong.
  //
  // An earlier version matched each card to "the median tier of peers with
  // similar power", which regressed everything toward whichever tier was most
  // populous and produced obvious nonsense -- demoting Oblivion from t10 to t7
  // while it measured +52.5, the strongest card in the sweep. Power and price
  // have to move in the SAME direction or the proposal is not a balance change,
  // it is noise with a tier attached.
  const proposals: Proposal[] = [];
  for (const r of usable) {
    const tierPeers = (byCat.get(r.category) ?? []).filter(
      (p) => p.id !== r.id && p.tier === r.tier,
    );
    if (tierPeers.length < 3) continue;
    // The 90th percentile of its tier-peers, not their mean. Most cards at any
    // tier are inert, so a mean sits near zero and ANY mover clears it -- which
    // is why an earlier cut proposed 82 promotions against 8 demotions. That
    // ratio was a selection effect (only movers are eligible), not a library
    // that is uniformly under-priced. Beating the top decile of the cards
    // charged the same price is a real claim about mispricing.
    const sorted = [...tierPeers.map((p) => p.delta)].sort((a, b) => a - b);
    const hi = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    const lo = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const gap = r.delta > hi ? r.delta - hi : r.delta < lo ? r.delta - lo : 0;
    // The gap has to clear this card's own error bar as well as a flat margin,
    // so a noisy measurement cannot buy a tier on its own.
    if (Math.abs(gap) < Math.max(15, 2 * r.stderr)) continue;
    const steps = Math.min(2, Math.max(1, Math.floor(Math.abs(gap) / 20)));
    // Hexes are capped at tier 8 unless flagged `special` (tier 9 is the apex
    // pool, which is not in the normal draft). test:rules enforces this, and
    // the first pass pushed Death Knell to t9 and turned that suite red -- the
    // tool has to know a category's legal band before it prices anything into
    // one.
    const ceiling = r.category === "hex" ? 8 : 10;
    const to = Math.max(1, Math.min(ceiling, r.tier + (gap > 0 ? steps : -steps)));
    if (to === r.tier) continue;
    proposals.push({
      row: r,
      to,
      peers: tierPeers.length,
      confidence: r.kind === "passive" ? "high" : "lower",
    });
  }

  proposals.sort((a, b) => Math.abs(b.to - b.row.tier) - Math.abs(a.to - a.row.tier));
  const up = proposals.filter((p) => p.to > p.row.tier);
  const down = proposals.filter((p) => p.to < p.row.tier);
  console.log(
    `[retier] ${rows.length} measured, ${usable.length} resolved and measurable, ` +
      `${proposals.length} proposals (${up.length} up, ${down.length} down)`,
  );

  for (const label of ["high", "lower"] as const) {
    const g = proposals.filter((p) => p.confidence === label);
    if (!g.length) continue;
    console.log(
      `\n=== ${label.toUpperCase()} CONFIDENCE (${g.length}) ` +
        `${label === "high" ? "- passive, no activation policy involved" : "- activated; a bad number can still be the bot"}`,
    );
    for (const p of g) {
      console.log(
        `  t${p.row.tier} -> t${p.to}  ${p.row.delta >= 0 ? "+" : ""}${p.row.delta.toFixed(1)}pt ` +
          `+-${p.row.stderr.toFixed(1)}  ${p.row.id}  (${p.row.category}, ${p.peers} peers agree)`,
      );
    }
  }

  if (!WRITE) {
    console.log("\n(dry run: pass --write to apply)");
    return;
  }

  // Apply by rewriting `tier: N` inside each card's own definition object.
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".ts")) files.push(full);
    }
  };
  walk(ENGINE);

  let applied = 0;
  for (const f of files) {
    let src = fs.readFileSync(f, "utf8");
    let touched = false;
    for (const p of proposals) {
      // Anchored on the id so only this card's tier moves.
      const re = new RegExp(`(id:\\s*"${p.row.id}"[^}]*?\\btier:\\s*)(\\d+)`, "s");
      if (re.test(src)) {
        src = src.replace(re, `$1${p.to}`);
        touched = true;
        applied++;
        continue;
      }
      // The hex families carry their tier in a WRAPPER rather than a field:
      // `H4({ id: "hw3_time_bomb", ... })` is a tier-4 hex. Six cards were
      // silently skipped by the field pattern alone, including the largest
      // mispricing in the sweep, so the wrapper form is handled explicitly
      // rather than left to look like "no change needed".
      const wrap = new RegExp(`\\b([A-Z])(\\d)\\(\\s*\\{[^{}]*?id:\\s*"${p.row.id}"`, "s");
      const m = wrap.exec(src);
      if (m) {
        src = `${src.slice(0, m.index)}${m[1]}${p.to}${src.slice(m.index + m[1].length + m[2].length)}`;
        touched = true;
        applied++;
      }
    }
    if (touched) fs.writeFileSync(f, src);
  }
  console.log(`\n[retier] applied ${applied} of ${proposals.length} tier changes`);
  if (applied < proposals.length) {
    console.log("  (unapplied cards declare their tier somewhere this pattern cannot reach)");
  }
}

main();
