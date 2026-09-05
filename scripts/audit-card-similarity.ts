// Near-duplicate card detector.
//
//   npx -y tsx scripts/audit-card-similarity.ts            # verify (ratchet)
//   npx -y tsx scripts/audit-card-similarity.ts --write    # re-baseline
//   npx -y tsx scripts/audit-card-similarity.ts --list     # show the pairs
//
// WHY THIS EXISTS
//
// audit-animations.ts F2 catches two cards whose flagship dressing is
// BYTE-IDENTICAL. That is the easy half. The half that actually degrades the
// library is two cards that are not identical but are the same card twice:
// Court Jester and Dunce Detail are both "after your opponent's next move, one
// of their pieces chosen at random wears a hat for N turns and is frozen for
// 1". Different words, different art, same card.
//
// Nothing measured that, so nothing stopped it accumulating.
//
// HOW IT MEASURES
//
// Two cards are compared only when they share a mechanical CATEGORY (from
// scripts/gen-card-categories.ts, which derives 58 buckets from rules text plus
// engine hooks), the same tier, and the same family. Cards in different buckets
// are different cards by construction, so comparing them is noise.
//
// Within a bucket, similarity is the Jaccard overlap of the rule text's
// meaningful words - numbers and piece names kept, since "freeze one knight for
// 2 turns" and "freeze one knight for 5 turns" differ exactly there, and
// stopwords dropped. A pair over the threshold is reported as a candidate, not
// a verdict: the fix is to pull the two cards apart in rule and art, and the
// user's standing instruction is that no card is ever deleted.
//
// It is a RATCHET on the candidate count, so the library can only get more
// distinct.

import fs from "node:fs";
import { RETIRED_IDS } from "../src/engine/retired";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const BASELINE = path.join(ROOT, "scripts", "card-similarity-baseline.json");
const CATS = path.join(ROOT, "docs", "card-categories.md");

const WRITE = process.argv.includes("--write");
const LIST = process.argv.includes("--list");

/** Overlap above this reads as "the same card twice" rather than "two cards in
 *  the same bucket". Calibrated against known pairs: Court Jester / Dunce
 *  Detail sit at 0.62, while genuinely distinct siblings sit under 0.4. */
const THRESHOLD = 0.55;

/** Words that carry no mechanical meaning, so they cannot make two cards look
 *  alike on their own. */
const STOP = new Set([
  "the", "a", "an", "of", "for", "on", "in", "to", "and", "or", "is", "it", "its",
  "their", "them", "they", "your", "you", "opponent", "opponents", "next", "then",
  "that", "this", "with", "at", "by", "be", "are", "as", "if", "one", "not", "no",
  "can", "cannot", "may", "any", "all", "each", "every", "after", "before", "when",
  "whenever", "while", "until", "from", "into", "onto", "over", "up", "down",
]);

interface Card {
  id: string;
  name: string;
  family: string;
  tier: number;
  rule: string;
  cat: string;
}

/** Parse the generated category tables. This is master's taxonomy, derived
 *  from rules text plus engine hooks; deriving a second one would only give
 *  two things to disagree. */
function readCards(): Card[] {
  const t = fs.readFileSync(CATS, "utf8");
  const out: Card[] = [];
  let cat = "";
  for (const line of t.split("\n")) {
    const h = line.match(/^## ([a-z0-9-]+)/);
    if (h) {
      cat = h[1];
      continue;
    }
    const c = line.split("|").map((x) => x.trim());
    if (c.length >= 8 && c[1] && c[1] !== "id" && !c[1].startsWith("---") && cat) {
      out.push({ id: c[1], name: c[2], family: c[3], tier: Number(c[4]), rule: c[6] ?? "", cat });
    }
  }
  return out;
}

/**
 * A file letter IS the mechanical difference between "your b-file pawn may
 * advance two" and "your d-file pawn may advance two", so it has to survive
 * tokenising. It does not survive naively: `b-file` splits to `b` + `file`, and
 * a bare `b` is indistinguishable from an article. Rewrite the two forms the
 * rules actually use into single opaque tokens FIRST, so `fileb` is kept and a
 * stray article never masquerades as a file reference.
 */
function markFiles(rule: string): string {
  return rule
    .replace(/\b([a-h])-file/g, "file$1")
    .replace(/\bfiles? ([a-h](?:\s*(?:,|or|and)\s*[a-h])*)/g, (_m, list: string) =>
      list
        .split(/\s*(?:,|or|and)\s*/)
        .filter(Boolean)
        .map((f) => `file${f}`)
        .join(" "),
    );
}

function words(rule: string): Set<string> {
  return new Set(
    markFiles(rule.toLowerCase())
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      // Numbers are the other place two cards differ by exactly one token
      // ("frozen for 2 turns" vs "for 5"), and single digits are the common
      // case, so length alone cannot be the filter.
      .filter((w) => (w.length > 1 || /^[0-9]$/.test(w)) && !STOP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

function main(): void {
  // Retired cards left the pools; near-duplicates among them no longer count.
  const cards = readCards().filter((c) => !RETIRED_IDS.has(c.id));
  const groups = new Map<string, Card[]>();
  for (const c of cards) {
    const k = `${c.cat}|t${c.tier}|${c.family}`;
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }

  const pairs: { a: Card; b: Card; score: number }[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const w = g.map((c) => words(c.rule));
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const s = jaccard(w[i], w[j]);
        if (s >= THRESHOLD) pairs.push({ a: g[i], b: g[j], score: s });
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  console.log(
    `[card-similarity] ${cards.length} cards, ${groups.size} category+tier+family groups; ` +
      `${pairs.length} pairs at or above ${THRESHOLD} overlap`,
  );

  if (LIST) {
    for (const p of pairs) {
      console.log(`\n  ${p.score.toFixed(2)}  [${p.a.cat} t${p.a.tier} ${p.a.family}]`);
      console.log(`    ${p.a.id}  ${p.a.name}`);
      console.log(`      ${p.a.rule.slice(0, 150)}`);
      console.log(`    ${p.b.id}  ${p.b.name}`);
      console.log(`      ${p.b.rule.slice(0, 150)}`);
    }
  }

  const baseline = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, "utf8")) as { nearDuplicatePairs: number })
    : { nearDuplicatePairs: Number.POSITIVE_INFINITY };

  if (WRITE) {
    if (pairs.length > baseline.nearDuplicatePairs && !process.argv.includes("--allow-raise")) {
      console.error(
        `REFUSING to re-baseline upward: ${pairs.length} > ${baseline.nearDuplicatePairs}. ` +
          "The ratchet is shrink-only.",
      );
      process.exit(1);
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ nearDuplicatePairs: pairs.length }, null, 2)}\n`);
    console.log(`[card-similarity] baseline written: ${pairs.length}`);
    return;
  }

  if (pairs.length > baseline.nearDuplicatePairs) {
    console.error(
      `\nFAIL: near-duplicate pairs grew to ${pairs.length} (baseline ${baseline.nearDuplicatePairs}).`,
    );
    for (const p of pairs.slice(0, 10)) {
      console.error(`  ${p.score.toFixed(2)}  ${p.a.id} <-> ${p.b.id}  (${p.a.cat} t${p.a.tier})`);
    }
    console.error(
      "\nPull the pair apart in rule text and art. Cards are never deleted; " +
        "run with --list to see the full text of each pair.",
    );
    process.exit(1);
  }
  console.log("PASS: card similarity OK.");
}

main();
