// Canvas-VFX coverage gate.
//
// Every bespoke tier>=4 card must carry a hand-tuned CardVfx, and every
// CardVfx entry must belong to a card that actually has bespoke art. This was
// previously a dev-only `console.warn` inside vfxSpecs.ts (runVfxSelfCheck),
// which is stripped from production builds and scrolls past in dev — so it
// rotted to 21 uncovered cards and 1 orphan before anyone noticed. Same
// treatment as sig-plugins drift: a real script, wired into `test:rules`.
//
//   node scripts/check-vfx-coverage.cjs
//
// Two rules, mirroring how Board actually resolves a card's canvas spec
// (vfxSpecs.resolveCardVfx: `CARD_VFX[id] ?? EXTRA_CARD_VFX[id]`):
//
//   1. COVERAGE — a core SIGNATURES card of tier >= 4 with no entry in EITHER
//      table silently falls back to the generated per-family default, losing
//      the palette/travel/impact that was authored for its fiction. This is
//      the contract vfxSpecs' own header states. Note the scope: PLUGIN cards
//      are deliberately NOT required to carry a spec — each plugin set
//      documents itself as "one entry per card whose canvas moment should
//      differ from the tier default" (see funnyVfx.ts), so the family default
//      is a legitimate answer for them.
//   2. ORPHANS — an entry keyed to a card with no bespoke art anywhere is
//      dead weight, and usually a typo'd or renamed card id. Here plugins DO
//      count: an entry is legitimate if any of the 13 modules draws that card.
//
// The old in-file self-check got both halves slightly wrong: it looked only at
// `CARD_VFX` for coverage (so a card covered via vfxExtra read as missing) and
// only at god/great/basic PLAYS for orphans (so the other ten plugin modules'
// cards read as orphans). Plugin coverage here comes from PLUGIN_IDS in
// sigPlugins.tsx, which check-sig-plugins.cjs already guarantees mirrors all
// 13 modules — this script inherits that guarantee instead of re-deriving it.
// SIGNATURES itself lives in BoardEffects.tsx, which cannot be imported
// headlessly (JSX + a component graph), so its keys are read with the shared
// source scanner.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { extractPlayKeys, EFFECTS, SIG_PLUGINS } = require("./check-sig-plugins.cjs");

const BOARD_EFFECTS = path.join(EFFECTS, "BoardEffects.tsx");

/** Card ids with bespoke core art, from BoardEffects' SIGNATURES table. */
function signatureIds() {
  const src = fs.readFileSync(BOARD_EFFECTS, "utf8");
  return extractPlayKeys(src, "BoardEffects.tsx", "export const SIGNATURES");
}

/** Card ids any plugin module supplies art for (all 13 modules). */
function pluginIds() {
  const { committedIds } = require("./check-sig-plugins.cjs");
  return committedIds(fs.readFileSync(SIG_PLUGINS, "utf8"));
}

/**
 * The VFX tables and each card's tier, read from the real modules. These are
 * plain .ts (no JSX, no browser globals), so a short tsx sub-process can
 * import them and hand back JSON — no second copy of the tables to drift.
 * NODE_ENV=production keeps vfxSpecs' own dev self-check from firing here.
 */
function vfxTables() {
  const probe = path.join(__dirname, "vfx-coverage-probe.mts");
  const out = execFileSync("npx", ["-y", "tsx", probe], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  // The probe prints one JSON line; tsx/npx may prepend install chatter.
  const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  if (!line) throw new Error(`vfx-coverage-probe produced no JSON:\n${out}`);
  return JSON.parse(line);
}

function main() {
  const { cardVfx, extraVfx, tiers } = vfxTables();
  const covered = new Set([...cardVfx, ...extraVfx]);
  const signatures = signatureIds();
  const plugins = pluginIds();
  const bespoke = new Set([...signatures, ...plugins]);

  const errors = [];

  // 1. Coverage — core SIGNATURES only (see the scope note in the header).
  const missing = signatures
    .filter((id) => (tiers[id] ?? 0) >= 4 && !covered.has(id))
    .map((id) => `${id} (tier ${tiers[id]})`)
    .sort();
  if (missing.length) {
    errors.push(
      `${missing.length} bespoke tier>=4 card(s) with no CARD_VFX / EXTRA_CARD_VFX entry ` +
        `(they fall back to the generated family default):\n    - ${missing.join("\n    - ")}`,
    );
  }

  // 2. Orphans.
  const orphaned = [...cardVfx, ...extraVfx].filter((id) => !bespoke.has(id)).sort();
  if (orphaned.length) {
    errors.push(
      `${orphaned.length} VFX entr(y/ies) keyed to a card with no bespoke art:\n    - ${orphaned.join("\n    - ")}`,
    );
  }

  if (errors.length) {
    console.error("vfx-coverage check FAILED:");
    for (const e of errors) console.error("  - " + e);
    console.error(
      "\nFix: add a fiction-matched CardVfx (travel/impact/aftermath/palette/source)" +
        "\n     to src/components/effects/vfxSpecs.ts (core) or vfxExtra.ts (plugin sets)," +
        "\n     or drop the stale key. Shake stays a tier 7+ privilege.",
    );
    process.exit(1);
  }

  console.log(
    `vfx-coverage: ${covered.size} specs cover every bespoke tier>=4 card ` +
      `(${signatures.length} core signatures + ${plugins.length} plugin ids), no orphans`,
  );
}

module.exports = { signatureIds, pluginIds };

if (require.main === module) main();
