// Turn-cost audit. Run AFTER `npm run server:build` compiles the engine to
// dist-server/. Classifies every buff/boon/hex/item card by whether using it
// consumes the activator's turn, and flags cards whose written description
// contradicts that classification (the objective half of the audit; the
// design-judgment half is in docs/2026-07-05-turn-cost-badges-design.md).
//
//   npm run server:build && node scripts/audit-turn-cost.cjs
//
// Turn-cost is derived from the SAME two fields the game engine uses to decide
// whether to pass the turn (see game.ts passTurnAfterBuff / def.freeAction):
//   activated + !freeAction -> "turn"    (using it is your move)
//   activated + freeAction  -> "free"    (resolves within your turn)
//   instant                 -> "instant" (applies the moment you draft it)
//   passive                 -> "passive" (always on while held)

const path = require("path");

function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const { ALL_BUFFS } = load("buffs/library.js");

/** The single mapping. Mirror of the turnCost() helper shipped in buff.ts. */
function turnCost(b) {
  if (b.kind === "activated") return b.freeAction ? "free" : "turn";
  if (b.kind === "instant") return "instant";
  return "passive";
}

const LABEL = {
  turn: "Uses your turn",
  free: "Free action",
  instant: "Instant",
  passive: "Passive",
};

// --- Distribution -----------------------------------------------------------
const byCost = { turn: 0, free: 0, instant: 0, passive: 0 };
const byCategoryCost = {};
for (const b of ALL_BUFFS) {
  const c = turnCost(b);
  byCost[c]++;
  byCategoryCost[b.category] = byCategoryCost[b.category] || {
    turn: 0,
    free: 0,
    instant: 0,
    passive: 0,
  };
  byCategoryCost[b.category][c]++;
}

// --- Contradiction detection (text vs behavior) -----------------------------
// Words in a description that assert one turn-cost while the flags say another.
const flags = [];
for (const b of ALL_BUFFS) {
  const cost = turnCost(b);
  const d = (b.description || "").toLowerCase();
  const saysFree = /\bfree action\b/.test(d) || /without using (?:up )?(?:your|a) turn/.test(d);
  const saysCostsTurn =
    /\buses (?:up )?your turn\b/.test(d) ||
    /\bcosts your turn\b/.test(d) ||
    /\bends your turn\b/.test(d);
  const saysInstant = /\binstantly\b/.test(d) || /\bthe moment you draft\b/.test(d);

  if (saysFree && cost !== "free") {
    flags.push({
      id: b.id,
      name: b.name,
      cost,
      severity: "obvious",
      why: `description says "free action" but flags resolve to ${LABEL[cost]}`,
    });
  }
  if (saysCostsTurn && cost === "free") {
    flags.push({
      id: b.id,
      name: b.name,
      cost,
      severity: "obvious",
      why: `description says it uses your turn but the card is a Free action`,
    });
  }
  // Instant cards can never collect targets (they resolve on draft), so an
  // instant whose text tells the player to choose/target a square is suspect.
  if (cost === "instant" && /\b(choose|target|pick) (?:an?|one|the) /.test(d) && !b.targets) {
    flags.push({
      id: b.id,
      name: b.name,
      cost,
      severity: "review",
      why: `instant (applies on draft) but description implies targeting`,
    });
  }
  if (saysInstant && cost === "turn") {
    flags.push({
      id: b.id,
      name: b.name,
      cost,
      severity: "review",
      why: `description says "instantly" but the card uses your turn`,
    });
  }
}

// --- Output -----------------------------------------------------------------
console.log("=== Turn-cost distribution (all %d cards) ===", ALL_BUFFS.length);
for (const c of ["turn", "free", "instant", "passive"]) {
  console.log("  %s: %d", LABEL[c].padEnd(16), byCost[c]);
}
console.log("\n=== By category ===");
for (const cat of Object.keys(byCategoryCost).sort()) {
  const row = byCategoryCost[cat];
  console.log(
    "  %s  turn=%d free=%d instant=%d passive=%d",
    cat.padEnd(12),
    row.turn,
    row.free,
    row.instant,
    row.passive,
  );
}

console.log("\n=== Flagged contradictions (%d) ===", flags.length);
const obvious = flags.filter((f) => f.severity === "obvious");
const review = flags.filter((f) => f.severity === "review");
console.log("-- obvious (%d) --", obvious.length);
for (const f of obvious) console.log("  [%s] %s -> %s :: %s", f.id, f.name, LABEL[f.cost], f.why);
console.log("-- review (%d) --", review.length);
for (const f of review) console.log("  [%s] %s -> %s :: %s", f.id, f.name, LABEL[f.cost], f.why);

// Full machine-readable dump for the report generator / cross-check.
const dump = ALL_BUFFS.map((b) => ({
  id: b.id,
  name: b.name,
  category: b.category,
  tier: b.tier,
  kind: b.kind,
  freeAction: !!b.freeAction,
  cost: turnCost(b),
  label: LABEL[turnCost(b)],
}));
require("fs").writeFileSync(
  path.join(__dirname, "..", "docs", "turn-cost-table.json"),
  JSON.stringify(dump, null, 2),
);
console.log("\nWrote docs/turn-cost-table.json (%d rows).", dump.length);
