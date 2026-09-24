// Bespoke play-art coverage audit. Run AFTER `npm run server:build`.
// Lists every LIVE card in ALL_BUFFS that has NO hand-made play animation, i.e.
// it is neither in the core SIGNATURES table (BoardEffects.tsx) nor in any
// plugin module's PLAYS map (PLUGIN_IDS in sigPlugins.tsx), and so falls back
// to the generated signature. Grouped by category and tier so art batches can
// be sliced up. Retired cards (src/engine/retired.ts) never reach a draft, so
// they are counted separately and left out of the worklist; pass
// --include-retired to list them too.
//
//   npm run server:build && node scripts/audit-bespoke-coverage.cjs
//
// Exits 1 when a live card has no hand-made art, so it can run as a check.

const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist-server", "src", "engine");
const { ALL_BUFFS } = require(path.join(DIST, "buffs", "library.js"));
const { isRetired } = require(path.join(DIST, "retired.js"));
const INCLUDE_RETIRED = process.argv.includes("--include-retired");

// Core SIGNATURES keys: parse the table literally (same trick as
// check-sig-plugins.cjs: key at the start of a line inside the block).
const boardFx = fs.readFileSync(path.join(__dirname, "..", "src", "components", "effects", "BoardEffects.tsx"), "utf8");
const sigBlock = boardFx.slice(boardFx.indexOf("export const SIGNATURES"), boardFx.indexOf("// --- Cast spectacles"));
const core = new Set([...sigBlock.matchAll(/^ {2}(\w+):\s*\{/gm)].map((m) => m[1]));

// Plugin ids: the machine-generated PLUGIN_IDS list.
const plugins = fs.readFileSync(path.join(__dirname, "..", "src", "components", "effects", "sigPlugins.tsx"), "utf8");
const idBlock = plugins.slice(plugins.indexOf("<plugin-ids:generated>"), plugins.indexOf("</plugin-ids:generated>"));
const plugin = new Set([...idBlock.matchAll(/"([\w:]+)"/g)].map((m) => m[1]));

const retired = ALL_BUFFS.filter((b) => isRetired(b.id));
const pool = INCLUDE_RETIRED ? ALL_BUFFS : ALL_BUFFS.filter((b) => !isRetired(b.id));
const missing = pool.filter((b) => !core.has(b.id) && !plugin.has(b.id));
const retiredMissing = retired.filter((b) => !core.has(b.id) && !plugin.has(b.id)).length;
const byCat = new Map();
for (const b of missing) {
  if (!byCat.has(b.category)) byCat.set(b.category, []);
  byCat.get(b.category).push(b);
}
console.log(
  `cards: ${ALL_BUFFS.length - retired.length} live, ${retired.length} retired` +
    `${INCLUDE_RETIRED ? " (included)" : " (left out)"}; core bespoke: ${core.size}; plugin bespoke: ${plugin.size}; ` +
    `MISSING: ${missing.length}` +
    `${INCLUDE_RETIRED ? "" : ` (retired without art: ${retiredMissing})`}`,
);
for (const [cat, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n== ${cat} (${list.length})`);
  for (const b of list.sort((x, y) => y.tier - x.tier)) {
    console.log(`  [t${b.tier}] ${b.id}${isRetired(b.id) ? " (retired)" : ""}: ${b.name}: ${b.description.slice(0, 110)}`);
  }
}
if (missing.length) process.exitCode = 1;
