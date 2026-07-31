// Every passive that marks pieces must SHOW that it marks them.
//
//   npm run test:passive-motifs            # verify (ratchet)
//   npx -y tsx scripts/audit-passive-motifs.ts --write   # re-baseline
//   npx -y tsx scripts/audit-passive-motifs.ts --list    # the missing cards
//
// WHY THIS EXISTS
//
// A passive has no cast moment. It is drafted once and then it is simply true
// for the rest of the game, which means the ONLY thing telling a player it is
// still in force is the persistent icon on the pieces it touches
// (`CardFx.motif` -> MotifBadge / EmpowerAura). A passive without one is a
// rule the player has to remember unaided, and 206 of them shipped that way.
//
// HOW IT DECIDES WHICH PASSIVES NEED ONE
//
// Not all of them do, and demanding an icon from all 973 would be wrong: a
// draft lock or a clock drain has no piece to mark, and buff.ts says so
// directly. The split has to be mechanical or it does not finish, so it reuses
// the anchor derivation (scripts/lib/anchor-rule.ts): a card whose defensible
// anchors include "cast" or "aim" lands on specific pieces, and a card that
// can only be "board" does not. One derivation, used twice, rather than two
// that can disagree.
//
// It is a RATCHET on the missing count, so passives can only get more legible.

import fs from "node:fs";
import path from "node:path";

import { ALL_BUFFS } from "../src/engine/buffs/library";
import { allowedAnchors } from "./lib/anchor-rule";

const ROOT = path.join(__dirname, "..");
const BASELINE = path.join(ROOT, "scripts", "passive-motif-baseline.json");
const WRITE = process.argv.includes("--write");
const LIST = process.argv.includes("--list");

function cardFacts(): Map<string, { cat: string; rule: string }> {
  const t = fs.readFileSync(path.join(ROOT, "docs", "card-categories.md"), "utf8");
  const out = new Map<string, { cat: string; rule: string }>();
  let cat = "";
  for (const line of t.split("\n")) {
    const h = /^## ([a-z0-9-]+)/.exec(line);
    if (h) {
      cat = h[1];
      continue;
    }
    const c = line.split("|").map((x) => x.trim());
    if (c.length >= 8 && c[1] && c[1] !== "id" && !c[1].startsWith("---") && cat) {
      out.set(c[1], { cat, rule: c[6] ?? "" });
    }
  }
  return out;
}

interface Missing {
  id: string;
  name: string;
  tier: number;
  cat: string;
  rule: string;
}

function main(): void {
  const facts = cardFacts();
  const passives = ALL_BUFFS.filter(
    (b) => b.implemented && b.kind === "passive",
  ) as unknown as {
    id: string;
    name: string;
    tier: number;
    fx?: { motif?: string };
  }[];

  let noBoardPresence = 0;
  let has = 0;
  const missing: Missing[] = [];

  for (const b of passives) {
    const f = facts.get(b.id);
    if (!f) continue;
    const anchors = allowedAnchors(f.cat, f.rule);
    if (!anchors.includes("cast") && !anchors.includes("aim")) {
      // Nothing on the board to mark. An icon here would be pointing at
      // nothing, so its absence is correct rather than missing.
      noBoardPresence++;
      continue;
    }
    if (b.fx?.motif) has++;
    else missing.push({ id: b.id, name: b.name, tier: b.tier, cat: f.cat, rule: f.rule });
  }

  console.log(
    `[passive-motifs] ${passives.length} passives: ${noBoardPresence} have no board ` +
      `presence (icon correctly absent), ${has + missing.length} mark pieces; ` +
      `${has} carry an icon, ${missing.length} do not`,
  );

  if (LIST) {
    const byCat = new Map<string, Missing[]>();
    for (const m of missing) {
      const g = byCat.get(m.cat);
      if (g) g.push(m);
      else byCat.set(m.cat, [m]);
    }
    for (const [cat, ms] of [...byCat].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n## ${cat} (${ms.length})`);
      for (const m of ms) {
        console.log(`  ${m.id}  t${m.tier}  ${m.name}`);
        console.log(`      ${m.rule.slice(0, 130)}`);
      }
    }
  }

  const baseline = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, "utf8")) as { missingMotifs: number })
    : { missingMotifs: Number.POSITIVE_INFINITY };

  if (WRITE) {
    if (missing.length > baseline.missingMotifs && !process.argv.includes("--allow-raise")) {
      console.error(
        `REFUSING to re-baseline upward: ${missing.length} > ${baseline.missingMotifs}. ` +
          "The ratchet is shrink-only.",
      );
      process.exit(1);
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ missingMotifs: missing.length }, null, 2)}\n`);
    console.log(`[passive-motifs] baseline written: ${missing.length}`);
    return;
  }

  if (missing.length > baseline.missingMotifs) {
    console.error(
      `\nFAIL: passives without a piece icon grew to ${missing.length} ` +
        `(baseline ${baseline.missingMotifs}).`,
    );
    for (const m of missing.slice(0, 10)) console.error(`  ${m.id}  (${m.cat}, t${m.tier})`);
    console.error(
      "\nA passive has no cast moment, so the icon is the only thing telling a " +
        "player the rule is still in force. Add `fx: { motif, pieces }` to the card, " +
        "or run with --list for the full set.",
    );
    process.exit(1);
  }
  console.log("PASS: passive piece icons OK.");
}

main();
