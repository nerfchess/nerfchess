// Apply the hand-audit tier changes (scripts/hand-audit.json `retier`) to the
// card definitions in src/engine. Each entry rewrites the `tier: N` that
// follows `id: "<id>"` inside the same object literal. Idempotent: a card
// already at its target tier is left alone.
//
//   node scripts/apply-retiers.mjs          # rewrite
//   node scripts/apply-retiers.mjs --check  # CI: fail if any card is off its target

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "hand-audit.json"), "utf8"));
// A key may carry a pool prefix ("nerf:heavy_boots") when the same id exists
// as both a nerf and a buff; the rewrite then only touches that pool's
// directory. Unprefixed keys apply anywhere under src/engine.
const retier = {};
const scopeOf = {};
for (const [key, tier] of Object.entries(audit.retier ?? {})) {
  const m = /^(nerf|buff):(.+)$/.exec(key);
  const id = m ? m[2] : key;
  retier[id] = tier;
  scopeOf[id] = m ? path.join("src", "engine", m[1] === "nerf" ? "nerfs" : "buffs") : null;
}
const inScope = (file, id) => !scopeOf[id] || file.includes(path.sep + scopeOf[id].split(path.sep).join(path.sep) + path.sep);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, "src", "engine"));
const found = new Map();
let changed = 0;
let stale = [];
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let touched = false;
  for (const [id, tier] of Object.entries(retier)) {
    if (!inScope(file, id)) continue;
    const re = new RegExp(`(id:\\s*"${id}"[\\s\\S]{0,1200}?\\btier:\\s*)(\\d+)`, "g");
    src = src.replace(re, (m, head, cur) => {
      // Stop at the next id: the tier must belong to this card's object.
      if (/id:\s*"/.test(head.slice(id.length + 6))) return m;
      found.set(id, Number(cur));
      if (Number(cur) === tier) return m;
      touched = true;
      changed++;
      stale.push(`${id}: ${cur} -> ${tier}`);
      return `${head}${tier}`;
    });
  }
  if (touched && !CHECK) fs.writeFileSync(file, src);
}
// Second pass for the three other definition shapes:
//   A. hexes/wave4*.ts   -> H<tier>({ id: "x", ... })   (tier lives in the helper name)
//   B. hexes/tier<N>.ts  -> H({ id: "x", ... })         (file-wide helper; switch to hex() with a tier)
//   C. overhaul/openers* -> { id: "x", name: ..., }     (one-line table row; add a tier field)
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let touched = false;
  for (const [id, tier] of Object.entries(retier)) {
    if (found.has(id) || !inScope(file, id)) continue;
    // D. nerfs/expanded/tier<N>.ts -> N(...) / N5(...) with `const N = tierNerf(k)`
    //    helpers: switch the call to N<tier>( and declare that helper once.
    const reD = new RegExp(`\\bN(\\d?)\\((\\s*\\{\\s*id:\\s*"${id}")`);
    const mD = reD.exec(src);
    if (mD && /const N = tierNerf\(/.test(src)) {
      const cur = mD[1] ? Number(mD[1]) : Number(/const N = tierNerf\((\d)\)/.exec(src)[1]);
      found.set(id, cur);
      if (cur !== tier) {
        src = src.replace(reD, `N${tier}($2`);
        if (!new RegExp(`const N${tier} = tierNerf\\(${tier}\\)`).test(src)) {
          src = src.replace(/const N = tierNerf\((\d)\);/, (m) => `${m}\nconst N${tier} = tierNerf(${tier});`);
        }
        touched = true;
        changed++;
        stale.push(`${id}: ${cur} -> ${tier}`);
      }
      continue;
    }
    const reA = new RegExp(`H(\\d)\\((\\s*\\{\\s*id:\\s*"${id}")`);
    const mA = reA.exec(src);
    if (mA) {
      found.set(id, Number(mA[1]));
      if (Number(mA[1]) !== tier) {
        src = src.replace(reA, `H${tier}($2`);
        touched = true;
        changed++;
        stale.push(`${id}: ${mA[1]} -> ${tier}`);
      }
      continue;
    }
    const reB = new RegExp(`\\bH\\((\\s*\\{)(\\s*)id:\\s*"${id}",`);
    const mB = reB.exec(src);
    if (mB) {
      const fileTier = /tierHexes\((\d)\)/.exec(src)?.[1] ?? "?";
      found.set(id, Number(fileTier));
      if (Number(fileTier) !== tier) {
        src = src.replace(reB, `hex($1$2id: "${id}",$2tier: ${tier},`);
        touched = true;
        changed++;
        stale.push(`${id}: ${fileTier} -> ${tier}`);
      }
      continue;
    }
    const bare = id.replace(/^op_/, "");
    const reC = new RegExp(`(\\{ id: "${bare}", name: "[^"]*",)( tier: (\\d+),)?`);
    const mC = reC.exec(src);
    if (mC && file.includes("openers")) {
      const cur = mC[3] ? Number(mC[3]) : 1;
      found.set(id, cur);
      if (cur !== tier) {
        src = src.replace(reC, `$1 tier: ${tier},`);
        touched = true;
        changed++;
        stale.push(`${id}: ${cur} -> ${tier}`);
      }
      continue;
    }
  }
  if (touched && !CHECK) fs.writeFileSync(file, src);
}

const missing = Object.keys(retier).filter((id) => !found.has(id));
if (missing.length) console.error(`[apply-retiers] not found: ${missing.join(", ")}`);
if (CHECK) {
  if (stale.length) {
    console.error(`[apply-retiers] ${stale.length} card(s) off their hand-audit tier:\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[apply-retiers] check OK: ${found.size} hand-tiered cards in place`);
} else {
  console.log(`[apply-retiers] ${changed} tier(s) rewritten${stale.length ? ":\n  " + stale.join("\n  ") : ""}`);
}
if (missing.length) process.exit(1);
