// Why an inert card is inert.
//
//   npx -y tsx scripts/audit-dead-triggers.ts            # the classified list
//   npx -y tsx scripts/audit-dead-triggers.ts --group    # by condition shape
//
// WHY THIS EXISTS
//
// The win-rate sweep found that a large share of the library changes the
// outcome of ZERO games out of twenty. Probing a sample showed something
// sharper than "small effect": the games are byte-identical with and without
// the card. Not one move differs. Ever.
//
// "Inert" is not one finding though, it is two, and they need opposite
// responses:
//
//   UNMEASURABLE  the bot cannot exploit the card, so the harness cannot see
//                 it. Information cards are 100% inert because the search
//                 never consults the information; draft cards are 95% inert
//                 because one game has no future draft. These cards may be
//                 excellent against a human. Retiering them on this data would
//                 be acting on the instrument's blind spot.
//
//   DEAD TRIGGER  the card is live, correctly implemented, and its condition
//                 simply never occurs. Cornerstone wards rooks "while on their
//                 starting squares" and rooks leave home in the opening. That
//                 is dead weight against a human too, and it is a design fix.
//
// Only the second group is safe to act on from this data, so the whole point
// of this script is to keep them apart.

import fs from "node:fs";
import path from "node:path";

import { BUFF_BY_ID } from "../src/engine/buffs/library";

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");

interface Row {
  id: string;
  tier: number;
  category: string;
  kind: string;
  delta: number;
  pairs: number;
  firedPairs: number;
  stderr: number;
}

/**
 * Categories the harness structurally cannot measure in a single game.
 *
 * Not a guess: `info` measured 100% inert and `draft` 95%, and the probe
 * confirmed the games are move-for-move identical. A bot that never reads
 * revealed information and never sees a second draft cannot express what these
 * cards are worth.
 */
const BLIND_CATEGORIES = new Set(["info", "draft"]);

/** Rule text that pays off outside the game the harness plays. */
const BLIND_TEXT = [
  /\bdraft\b/,
  /\breroll/,
  /\bon your clock\b/,
  /\bseconds\b/,
  /\bsee (?:your|their|the)\b/,
  /\breveal/,
  /\bflashes\b/,
];

/**
 * Condition shapes that tend never to occur. Each is a lead, not a verdict:
 * the point is to group ~1,000 cards into a handful of repeated mistakes
 * rather than hand-reading them one at a time.
 */
const NARROW: { name: string; re: RegExp; why: string }[] = [
  {
    name: "on-starting-square",
    re: /\bon (?:its|their) (?:starting|home) squares?\b/,
    why: "pieces leave home in the opening, so the ward is live only while it is not needed",
  },
  {
    name: "first-rank-only",
    re: /\bon your (?:first|back) rank\b/,
    why: "the guarded rank empties as the game develops",
  },
  {
    name: "requires-adjacency",
    re: /\b(?:beside|next to|adjacent to) (?:another|a friendly|one of your)\b/,
    why: "requires a specific formation that rarely holds when it matters",
  },
  {
    name: "narrow-window",
    re: /\b(?:within|during|before) (?:your|their) (?:next )?\d+ (?:turns|moves)\b/,
    why: "the window closes before the situation arises",
  },
  {
    name: "single-named-file",
    re: /\b[a-h]-file\b/,
    why: "keyed to one file, so it does nothing in most games",
  },
  {
    name: "only-if-attacked",
    re: /\bthe first time (?:an )?enemy\b/,
    why: "waits for a specific attack that may never come",
  },
  {
    name: "promotion-gated",
    re: /\bpromotes?\b/,
    why: "most games end before a promotion happens",
  },
];

function loadRows(): Row[] {
  const files = fs
    .readdirSync(DOCS)
    .filter((f) => /^card-winrate(\.shard\d+)?\.json$/.test(f))
    .map((f) => path.join(DOCS, f));
  if (!files.length) {
    console.error("No sweep output. Run scripts/sim-card-winrate.ts --write first.");
    process.exit(1);
  }
  const byId = new Map<string, Row>();
  for (const f of files) {
    const s = JSON.parse(fs.readFileSync(f, "utf8")) as { rows: Row[] };
    for (const r of s.rows) byId.set(r.id, r);
  }
  return [...byId.values()];
}

function main(): void {
  const rows = loadRows();
  // Inert: it fired (or was always in force) and still never changed a single
  // paired outcome. A card that never fired is a different problem entirely.
  const inert = rows.filter((r) => r.firedPairs > 0 && r.delta === 0 && r.pairs >= 18);

  const blind: Row[] = [];
  const dead: { row: Row; shape: string; why: string }[] = [];
  const unexplained: Row[] = [];

  for (const r of inert) {
    const def = BUFF_BY_ID[r.id] as { description?: string } | undefined;
    const text = (def?.description ?? "").toLowerCase();
    if (BLIND_CATEGORIES.has(r.category) || BLIND_TEXT.some((re) => re.test(text))) {
      blind.push(r);
      continue;
    }
    const hit = NARROW.find((n) => n.re.test(text));
    if (hit) dead.push({ row: r, shape: hit.name, why: hit.why });
    else unexplained.push(r);
  }

  console.log(
    `[dead-triggers] ${rows.length} measured, ${inert.length} inert ` +
      `(changed zero of ${inert[0]?.pairs ?? 20} paired outcomes)`,
  );
  console.log(`  ${blind.length} UNMEASURABLE HERE  - do not retier on this data`);
  console.log(`  ${dead.length} DEAD TRIGGER        - condition never occurs, safe to widen`);
  console.log(`  ${unexplained.length} unexplained         - needs reading`);

  const byShape = new Map<string, { row: Row; why: string }[]>();
  for (const d of dead) {
    const g = byShape.get(d.shape);
    if (g) g.push({ row: d.row, why: d.why });
    else byShape.set(d.shape, [{ row: d.row, why: d.why }]);
  }

  console.log("\n=== DEAD TRIGGERS, by condition shape ===");
  for (const [shape, group] of [...byShape].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n## ${shape} (${group.length} cards)`);
    console.log(`   ${group[0].why}`);
    if (process.argv.includes("--group")) continue;
    for (const g of group.slice(0, 8)) {
      const def = BUFF_BY_ID[g.row.id] as { description?: string } | undefined;
      console.log(`   t${g.row.tier} ${g.row.id}`);
      console.log(`      ${(def?.description ?? "").slice(0, 120)}`);
    }
    if (group.length > 8) console.log(`   ... and ${group.length - 8} more`);
  }

  console.log("\n=== UNMEASURABLE (blind spot, not weakness) ===");
  const byCat = new Map<string, number>();
  for (const r of blind) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
  for (const [c, n] of [...byCat].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${c}`);
  }
}

main();
