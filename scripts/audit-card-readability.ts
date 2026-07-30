// Ranks every card description by how hard it is to read at a glance, so the
// worst offenders can be rewritten instead of guessed at.
//
//   npx tsx scripts/audit-card-readability.ts            # ranked report
//   npx tsx scripts/audit-card-readability.ts --check     # CI gate
//   npx tsx scripts/audit-card-readability.ts --top 40    # worst 40 only
//   npx tsx scripts/audit-card-readability.ts --json      # machine-readable
//
// A card is read mid-game with a 20-second clock running, so the cost of a
// clause is real. The score is deliberately crude and mechanical — it exists to
// point a human at the right 200 cards, not to grade prose:
//
//   length      characters over the comfortable ceiling
//   sentences   every sentence past the second
//   clauses     comma / semicolon / colon breaks
//   conditions  stacked conditionals ("if ... unless ... even when ...")
//   nesting     parentheticals
//   hedges      throat-clearing that carries no rule ("note that", "keep in
//               mind", "it is worth noting")
//   passive     passive-voice constructions, which hide who does what
//
// The gate is on the WORST cards, not the average: a long description is fine
// when a card genuinely does a lot, but nothing should need 300 characters and
// six clauses to explain.

import { ALL_BUFFS } from "../src/engine/buffs/library";
import { ALL_NERFS } from "../src/engine/nerfs/library";

/** Comfortable at a glance on a phone card face. */
const LEN_SOFT = 150;
/** Nothing should exceed this; the gate fails on it. */
const LEN_HARD = 260;
/** Score above which a card is flagged for a rewrite. */
const SCORE_FLAG = 10;

interface Row {
  id: string;
  name: string;
  kind: "buff" | "nerf";
  tier: number;
  len: number;
  score: number;
  reasons: string[];
  text: string;
}

const HEDGES = [
  "note that",
  "please note",
  "keep in mind",
  "it is worth noting",
  "worth noting",
  "bear in mind",
  "for the avoidance of doubt",
  "in other words",
  "that is to say",
  "as it happens",
];

const CONDITIONALS = /\b(if|unless|whenever|provided that|so long as|as long as|even when|even if|except)\b/gi;
const PASSIVES = /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/gi;

function score(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let total = 0;

  const len = text.length;
  if (len > LEN_SOFT) {
    const pts = Math.round((len - LEN_SOFT) / 20);
    total += pts;
    reasons.push(`${len} chars (+${pts})`);
  }

  // Sentence count: the first two are free.
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
  if (sentences > 2) {
    const pts = (sentences - 2) * 2;
    total += pts;
    reasons.push(`${sentences} sentences (+${pts})`);
  }

  // Mid-sentence breaks. A couple are natural; a pile of them is a list
  // pretending to be a sentence.
  const clauses = (text.match(/[,;:]/g) ?? []).length;
  if (clauses > 2) {
    const pts = clauses - 2;
    total += pts;
    reasons.push(`${clauses} clause breaks (+${pts})`);
  }

  const conditions = (text.match(CONDITIONALS) ?? []).length;
  if (conditions > 1) {
    const pts = (conditions - 1) * 2;
    total += pts;
    reasons.push(`${conditions} conditionals (+${pts})`);
  }

  const parens = (text.match(/\(/g) ?? []).length;
  if (parens > 0) {
    const pts = parens * 2;
    total += pts;
    reasons.push(`${parens} parenthetical${parens > 1 ? "s" : ""} (+${pts})`);
  }

  const hedges = HEDGES.filter((h) => text.toLowerCase().includes(h));
  if (hedges.length) {
    const pts = hedges.length * 3;
    total += pts;
    reasons.push(`hedge "${hedges[0]}" (+${pts})`);
  }

  const passive = (text.match(PASSIVES) ?? []).length;
  if (passive > 1) {
    const pts = passive - 1;
    total += pts;
    reasons.push(`${passive} passive constructions (+${pts})`);
  }

  return { score: total, reasons };
}

const rows: Row[] = [];
for (const b of ALL_BUFFS) {
  const text = b.description ?? "";
  if (!text) continue;
  rows.push({ id: b.id, name: b.name, kind: "buff", tier: b.tier ?? 0, len: text.length, ...score(text), text });
}
for (const n of ALL_NERFS) {
  const text = n.description ?? "";
  if (!text) continue;
  rows.push({ id: n.id, name: n.name, kind: "nerf", tier: n.tier ?? 0, len: text.length, ...score(text), text });
}
rows.sort((a, b) => b.score - a.score || b.len - a.len);

const args = process.argv.slice(2);
const check = args.includes("--check");
const json = args.includes("--json");
const topArg = args.indexOf("--top");
const top = topArg >= 0 ? Number(args[topArg + 1]) : 60;

const overHard = rows.filter((r) => r.len > LEN_HARD);
const flagged = rows.filter((r) => r.score >= SCORE_FLAG);

if (json) {
  console.log(JSON.stringify({ total: rows.length, flagged: flagged.length, overHard: overHard.length, rows: rows.slice(0, top) }, null, 1));
} else {
  const avg = Math.round(rows.reduce((a, r) => a + r.len, 0) / rows.length);
  console.log(`${rows.length} descriptions. average ${avg} chars.`);
  console.log(`${flagged.length} score >= ${SCORE_FLAG}. ${overHard.length} over the ${LEN_HARD}-char hard ceiling.`);
  console.log(`\nworst ${Math.min(top, rows.length)}:`);
  for (const r of rows.slice(0, top)) {
    console.log(`\n[${r.score}] ${r.name} (${r.id}, ${r.kind} t${r.tier})  ${r.reasons.join(", ")}`);
    console.log(`     ${r.text}`);
  }
}

if (check) {
  const problems: string[] = [];
  if (overHard.length > 0) {
    problems.push(
      `${overHard.length} description(s) over the ${LEN_HARD}-char ceiling: ` +
        overHard.slice(0, 6).map((r) => `${r.id} (${r.len})`).join(", "),
    );
  }
  if (problems.length) {
    console.error("\nreadability gate failed:");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  console.log("\nreadability gate: OK");
}
