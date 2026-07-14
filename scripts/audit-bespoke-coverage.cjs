// Bespoke play-art coverage audit. Run AFTER `npm run server:build`.
// Lists every card in ALL_BUFFS that has NO hand-made play animation — i.e.
// it is neither in the core SIGNATURES table (BoardEffects.tsx) nor in any
// plugin module's PLAYS map (PLUGIN_IDS in sigPlugins.tsx) — and so falls
// back to the generated signature. Grouped by category and tier so art
// batches can be sliced up.
//
//   npm run server:build && node scripts/audit-bespoke-coverage.cjs

const fs = require("fs");
const path = require("path");

const { ALL_BUFFS } = require(path.join(__dirname, "..", "dist-server", "src", "engine", "buffs", "library.js"));

// Core SIGNATURES keys: parse the table literally (same trick as
// check-sig-plugins.cjs — key at the start of a line inside the block).
const boardFx = fs.readFileSync(path.join(__dirname, "..", "src", "components", "effects", "BoardEffects.tsx"), "utf8");
const sigBlock = boardFx.slice(boardFx.indexOf("export const SIGNATURES"), boardFx.indexOf("// --- Cast spectacles"));
const core = new Set([...sigBlock.matchAll(/^ {2}(\w+):\s*\{/gm)].map((m) => m[1]));

// Plugin ids: the machine-generated PLUGIN_IDS list.
const plugins = fs.readFileSync(path.join(__dirname, "..", "src", "components", "effects", "sigPlugins.tsx"), "utf8");
const idBlock = plugins.slice(plugins.indexOf("<plugin-ids:generated>"), plugins.indexOf("</plugin-ids:generated>"));
const plugin = new Set([...idBlock.matchAll(/"([\w:]+)"/g)].map((m) => m[1]));

const missing = ALL_BUFFS.filter((b) => !core.has(b.id) && !plugin.has(b.id));
const byCat = new Map();
for (const b of missing) {
  if (!byCat.has(b.category)) byCat.set(b.category, []);
  byCat.get(b.category).push(b);
}
console.log(`total cards: ${ALL_BUFFS.length}; core bespoke: ${core.size}; plugin bespoke: ${plugin.size}; MISSING: ${missing.length}`);
for (const [cat, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n== ${cat} (${list.length})`);
  for (const b of list.sort((x, y) => y.tier - x.tier)) {
    console.log(`  [t${b.tier}] ${b.id} — ${b.name}: ${b.description.slice(0, 110)}`);
  }
}
