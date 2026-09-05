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
const retier = audit.retier ?? {};

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
    if (found.has(id)) continue;
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
