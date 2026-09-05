// Per-piece treatment coverage gate.
//
// The treatment layer (pieceTreatment.ts + the .piece-treat wrapper class) is
// the card-keyed look an affected piece wears while a card's fx runs on it.
// Like every other animation type here, it ships with its gate:
//
//   node scripts/check-treatment-coverage.cjs      (npm run test:treatments)
//
//   1. TOTALITY — every implemented card declaring fx.pieces must resolve to
//      a family and a non-empty static filter.
//   2. POLARITY — constraint motifs (jail/muzzle/anchor/blindfold/slow) must
//      draw from the diminished families and empowerment motifs
//      (empower/ward/rally) from the enriched ones: a hex may never make a
//      piece look blessed.
//   3. DISTINCTNESS — within one family, no two cards may compose the exact
//      same filter string (they would wear identical looks). Ratcheted by
//      scripts/treatment-variant-baseline.json: the count only shrinks.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const EMPOWER_MOTIFS = new Set(["empower", "ward", "rally"]);

function probe() {
  const out = execFileSync("npx", ["-y", "tsx", path.join(__dirname, "treatment-coverage-probe.mts")], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const line = out.split("\n").find((l) => l.startsWith("{"));
  if (!line) throw new Error(`treatment-coverage-probe produced no JSON:\n${out}`);
  return JSON.parse(line);
}

function main() {
  const { cards, constraintFamilies, empowerFamilies } = probe();
  const errors = [];
  const entries = Object.entries(cards);
  if (!entries.length) {
    errors.push("treatment probe returned no fx cards at all (probe/library import broke)");
  }

  // 1. Totality.
  const unresolved = entries.filter(([, c]) => !c.family || !c.filter);
  if (unresolved.length) {
    errors.push(
      `${unresolved.length} fx card(s) resolve to no treatment:\n    - ` +
        unresolved.slice(0, 20).map(([id]) => id).join("\n    - "),
    );
  }

  // 2. Polarity.
  const cons = new Set(constraintFamilies);
  const emp = new Set(empowerFamilies);
  const misfiled = entries.filter(([, c]) =>
    EMPOWER_MOTIFS.has(c.motif) ? !emp.has(c.family) : !cons.has(c.family),
  );
  if (misfiled.length) {
    errors.push(
      `${misfiled.length} card(s) wear the wrong polarity's family:\n    - ` +
        misfiled.slice(0, 20).map(([id, c]) => `${id} (${c.motif} -> ${c.family})`).join("\n    - "),
    );
  }

  // 3. Distinctness ratchet.
  const baselinePath = path.join(__dirname, "treatment-variant-baseline.json");
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const seen = new Map();
  for (const [id, c] of entries) {
    const k = `${c.family}|${c.filter}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(id);
  }
  let collisions = 0;
  const collided = [];
  for (const [k, ids] of seen) {
    if (ids.length > 1) {
      collisions += ids.length - 1;
      collided.push(`${k.split("|")[0]}: ${ids.join(", ")}`);
    }
  }
  if (collisions > baseline.filterCollisions) {
    errors.push(
      `treatment filter collisions grew: ${collisions} > baseline ${baseline.filterCollisions}.` +
        ` Cards in one family composing the same filter wear identical looks:\n    - ` +
        collided.slice(0, 20).join("\n    - ") +
        `\n    Widen the knob space in pieceTreatment.ts; never raise the baseline.`,
    );
  }

  if (errors.length) {
    console.error("treatment-coverage check FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  const fams = new Set(entries.map(([, c]) => c.family)).size;
  console.log(
    `treatment-coverage: ${entries.length} fx cards all wear a treatment ` +
      `(${fams} families in use); ${collisions} same-family filter collision(s) ` +
      `(baseline ${baseline.filterCollisions})`,
  );
}

main();
