// Usage-beat coverage gate.
//
// The usage layer (UseSpectacle + usageResolve) is the consumption beat every
// instant/activated card performs the moment it is used. Like every other
// animation type in this codebase, it gets a coverage gate the day it ships:
//
//   node scripts/check-usage-coverage.cjs        (npm run test:usage)
//
//   1. TOTALITY — every implemented instant/activated buff must resolve to a
//      usage family. The probe runs the REAL resolver over the library.
//   2. FLAGSHIPS — every implemented tier >= 9 instant/activated card must
//      carry a hand-authored USAGE_FLAGSHIPS entry (these performances are
//      picked, not rolled), and every flagship key must name a real usable
//      card (stale ids are how hand tables rot).
//   3. ART BACKING — every family named in USAGE_FAMILIES must have a
//      .us-f-<family> choreography block in useSpectacle.css; a family
//      without art would render three invisible spans.
//   4. DISTINCTNESS — within one family, no two cards may land on the same
//      variant tuple (they would perform identically). Ratcheted by
//      scripts/usage-variant-baseline.json: the collision count only shrinks.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CSS = path.join(ROOT, "src", "components", "effects", "useSpectacle.css");

function probe() {
  const out = execFileSync("npx", ["-y", "tsx", path.join(__dirname, "usage-coverage-probe.mts")], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const line = out.split("\n").find((l) => l.startsWith("{"));
  if (!line) throw new Error(`usage-coverage-probe produced no JSON:\n${out}`);
  return JSON.parse(line);
}

function main() {
  const { usable, families, flagships } = probe();
  const errors = [];
  const entries = Object.entries(usable);
  if (!entries.length) {
    errors.push("usage probe returned no usable cards at all (probe/library import broke)");
  }

  // 1. Totality.
  const familySet = new Set(families);
  const unresolved = entries.filter(([, u]) => !u.family || !familySet.has(u.family));
  if (unresolved.length) {
    errors.push(
      `${unresolved.length} usable card(s) resolve to no known usage family:\n    - ` +
        unresolved.slice(0, 20).map(([id, u]) => `${id} -> ${JSON.stringify(u.family)}`).join("\n    - "),
    );
  }

  // 2. Flagships, both directions.
  const flagshipSet = new Set(flagships);
  const missingFlagship = entries
    .filter(([, u]) => u.tier >= 9)
    .filter(([id]) => !flagshipSet.has(id))
    .map(([id, u]) => `${id} (tier ${u.tier})`);
  if (missingFlagship.length) {
    errors.push(
      `${missingFlagship.length} tier>=9 usable card(s) missing a USAGE_FLAGSHIPS entry:\n    - ` +
        missingFlagship.join("\n    - "),
    );
  }
  const staleFlagship = flagships.filter((id) => !usable[id]);
  if (staleFlagship.length) {
    errors.push(
      `${staleFlagship.length} USAGE_FLAGSHIPS entr(y/ies) keyed to a card that is not an ` +
        `implemented instant/activated buff:\n    - ${staleFlagship.join("\n    - ")}`,
    );
  }

  // 3. Art backing.
  const css = fs.readFileSync(CSS, "utf8");
  const unbacked = families.filter((f) => !css.includes(`.us-f-${f} `));
  if (unbacked.length) {
    errors.push(
      `${unbacked.length} usage famil(y/ies) with no .us-f-<family> choreography in useSpectacle.css:` +
        `\n    - ${unbacked.join("\n    - ")}`,
    );
  }

  // 4. Distinctness ratchet.
  const baselinePath = path.join(__dirname, "usage-variant-baseline.json");
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const seen = new Map(); // family|tuple -> [ids]
  for (const [id, u] of entries) {
    const k = `${u.family}|${u.tuple}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(id);
  }
  let collisions = 0;
  const collided = [];
  for (const [k, ids] of seen) {
    if (ids.length > 1) {
      collisions += ids.length - 1;
      collided.push(`${k}: ${ids.join(", ")}`);
    }
  }
  if (collisions > baseline.tupleCollisions) {
    errors.push(
      `usage-variant collisions grew: ${collisions} > baseline ${baseline.tupleCollisions}.` +
        ` Cards sharing a family AND a variant tuple perform identically:\n    - ` +
        collided.slice(0, 20).join("\n    - ") +
        `\n    Widen the tuple space (or move a card to another family); never raise the baseline.`,
    );
  }

  if (errors.length) {
    console.error("usage-coverage check FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  const crowned = entries.filter(([, u]) => u.crown).length;
  console.log(
    `usage-coverage: ${entries.length} usable cards all resolve ` +
      `(${families.length} families, ${flagships.length} flagships, ${crowned} crowned); ` +
      `${collisions} same-family tuple collision(s) (baseline ${baseline.tupleCollisions})`,
  );
}

main();
