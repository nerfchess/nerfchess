// Static check: a card's clock TEXT and its clock CODE must agree.
//
// Run: npx -y tsx scripts/check-clock-claims.ts
//      npx -y tsx scripts/check-clock-claims.ts --list
//
// Written during the clock rebalance, which removes the seconds payout from
// cards where time was never the point. That pass touches two things per card,
// a description and an api.adjustClock call, and getting only one of them is
// silent: the card keeps working, the harnesses stay green, and it simply lies
// to the player about what it does.
//
// It caught three real cases the same day it was written:
//   - two files held the SAME adjustClock statement twice, so a by-statement
//     delete hit the wrong card (Midas Gauntlet lost the clock that Private
//     Gallery was supposed to lose, and Chrono Siphon kept stealing time its
//     text no longer mentioned);
//   - lost_weekend kept "and their clock loses 20 seconds" after its code went.
//
// The rule: if a description names a number of seconds, the card must call
// adjustClock, and if it calls adjustClock, the description must say so.
// Vaguer wording ("restore some of your clock") satisfies the second direction
// without naming a figure, so only NUMBERED claims are required in the first.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const LIST = process.argv.includes("--list");
const BUFFS = join(ROOT, "src", "engine", "buffs");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

interface Finding {
  id: string;
  file: string;
  why: string;
}

const findings: Finding[] = [];

for (const file of walk(BUFFS)) {
  const src = readFileSync(file, "utf8");
  // Card bodies are delimited by their own id fields: everything from one id to
  // the next belongs to that card.
  const ids = [...src.matchAll(/id:\s*"([a-z0-9_]+)"/g)].map(
    (m) => [m.index ?? 0, m[1]] as const,
  );
  for (let k = 0; k < ids.length; k++) {
    const [start, id] = ids[k];
    const end = k + 1 < ids.length ? ids[k + 1][0] : src.length;
    const body = src.slice(start, end);
    const desc = /description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/.exec(body)?.[1];
    if (!desc) continue;

    const claimsSeconds = /\b\d+\s*seconds?\b/i.test(desc);
    // "some of your clock" is an honest unnumbered claim, so it counts as text.
    const claimsClock = claimsSeconds || /\byour (?:own )?clock\b|\btheir clock\b/i.test(desc);
    const touchesClock = /adjustClock/.test(body);

    if (claimsSeconds && !touchesClock) {
      findings.push({
        id,
        file: relative(ROOT, file),
        why: "description names seconds but the card never calls adjustClock",
      });
    } else if (touchesClock && !claimsClock) {
      findings.push({
        id,
        file: relative(ROOT, file),
        why: "card calls adjustClock but its description never mentions the clock",
      });
    }
  }
}

if (findings.length === 0) {
  console.log("[check-clock-claims] OK: every card's clock text matches its clock code");
  process.exit(0);
}

console.log(`[check-clock-claims] ${findings.length} card(s) disagree with themselves:\n`);
for (const f of LIST ? findings : findings.slice(0, 30)) {
  console.log(`  ${f.id}  (${f.file})\n    ${f.why}`);
}
if (!LIST && findings.length > 30) console.log(`  ... and ${findings.length - 30} more (--list)`);
console.log(
  "\nA card that advertises seconds it does not grant, or quietly grants seconds it " +
    "does not advertise, is lying to the player. Fix the description and the " +
    "adjustClock call together.",
);
process.exit(1);
