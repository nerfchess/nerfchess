// Card Laboratory headless gate: iterate EVERY implemented card through the
// same loop the /dev/lab run-all harness uses (fresh sandbox game, grant,
// first-candidate auto-activation, then 12 random plies off a fixed seed),
// catching every thrown error. Silent per-card failures become visible rows.
//
// Run: npx -y tsx scripts/lab-run-all.ts        (npm run test:lab)
//      npx -y tsx scripts/lab-run-all.ts --all  (print every row, not just failures)
//
// Exits non-zero when any card fails, so this doubles as a CI gate.

import {
  LAB_RUN_PLIES,
  LAB_RUN_SEED,
  rowFailed,
  runOneCard,
  runnableCards,
  summarize,
  type RunAllRow,
} from "../src/app/dev/lab/runAllCore";

const printAll = process.argv.includes("--all");

function fmt(row: RunAllRow): string {
  const status = rowFailed(row) ? "FAIL" : "PASS";
  const parts = [
    status,
    row.id.padEnd(28),
    `T${row.tier}`.padEnd(4),
    row.mechanic.padEnd(10),
    `grant=${row.granted}`,
    `activate=${row.activated}`,
    `plies=${row.plies}`,
  ];
  if (row.error) parts.push(`error=${row.error}`);
  return parts.join(" ");
}

const cards = runnableCards();
console.log(
  `Card lab run-all: ${cards.length} implemented cards, seed ${LAB_RUN_SEED}, ${LAB_RUN_PLIES} plies each\n`,
);

const rows: RunAllRow[] = [];
for (const def of cards) {
  const row = runOneCard(def);
  rows.push(row);
  if (printAll || rowFailed(row)) console.log(fmt(row));
}

const s = summarize(rows);
console.log("\n--- Summary ---");
console.log(`total: ${s.total}`);
console.log(`pass:  ${s.pass}`);
console.log(`fail:  ${s.fail}`);
console.log(`activated with no valid use (expected for some targets): ${s.noValidUse}`);
if (s.failures.length > 0) {
  console.log(`\nFailing cards: ${s.failures.map((r) => r.id).join(", ")}`);
}
process.exitCode = s.fail > 0 ? 1 : 0;
