// Per-card win-rate measurement.
//
//   npx -y tsx scripts/sim-card-winrate.ts --games 20            # every card
//   npx -y tsx scripts/sim-card-winrate.ts --games 60 --only hx4_ # a subset
//   npx -y tsx scripts/sim-card-winrate.ts --games 20 --write     # persist JSON
//
// WHY THIS EXISTS
//
// The library has 2,448 cards sorted into 58 mechanical categories, a turn-cost
// table and a tier ladder - and no measurement of whether any of it is true. A
// card's tier is an assertion about its power that nothing has ever checked.
// `test:card-impact` proves a card DOES something (it catches cards that were
// live in the draft pool doing literally nothing), but "does something" and
// "is worth tier 7" are different questions.
//
// This answers the second one the only way it can honestly be answered: play
// the game.
//
// HOW IT MEASURES
//
// Paired games. For each card, N pairs; in each pair the same seed drives the
// same two bots from the same opening, and the only difference is that White
// holds the card in one run and does not in the other. Scoring the pair as a
// delta cancels most of the seed-to-seed noise that would otherwise swamp a
// single card's contribution.
//
// The reported number is the win-rate delta in percentage points: how much
// more often the holder wins WITH the card than without it. A tier-1 card
// should sit near zero. A tier-8 card should be clearly positive. A card whose
// delta has the wrong SIGN is either broken or mis-tiered, and that is the
// finding worth acting on.
//
// WHAT THIS IS NOT
//
// It is not a ladder simulation and the absolute numbers are not win rates
// against humans. Bots play a narrow, deterministic style, so a card that
// rewards long-horizon planning will under-measure here. The sampling error at
// small N is large and is REPORTED rather than hidden: at N pairs the standard
// error on a delta of proportions is roughly `100 * sqrt(0.5/N)` points, which
// is +-11 points at N=20 and +-5 at N=100. Treat anything inside the error bar
// as "not measured", not as "measured zero".

import { BUFF_BY_ID, ALL_BUFFS } from "../src/engine/buffs/library";
import { pickHouseMove, type HouseSkill } from "../src/lib/server/bots";
import {
  UNRESTRICTED_NERF,
  acquireBuff,
  enableDraftMode,
  newGame,
  playMove,
} from "../src/engine/game";
import type { NerfGame } from "../src/engine/game";
import type { Buff } from "../src/engine/buff";

type Tier = Buff["tier"];

const args = process.argv.slice(2);
const flag = (name: string, dflt: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const GAMES = Number(flag("games", "20"));
const ONLY = flag("only", "");
const MAX_PLIES = Number(flag("plies", "120"));
const WRITE = args.includes("--write");
/** `--shard i/n` measures only every n-th card starting at i. One process per
 *  core: a full sweep is hours of CPU and the box has four of them, so the
 *  sweep is sharded rather than run single-file. Shards write separate JSON
 *  and are merged by --merge. */
const SHARD = flag("shard", "");
const [SHARD_I, SHARD_N] = SHARD ? SHARD.split("/").map(Number) : [0, 1];
/** Both seats play at this skill. HouseSkill is a RATING, not an index.
 *  Mid-ladder: strong enough that a card has to do real work, weak enough that
 *  games finish inside the ply cap. */
const SKILL: HouseSkill = 1350;

/** Deterministic PRNG, so a run is reproducible and a pair is truly paired. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Outcome = "w" | "b" | "draw" | "unfinished";

/**
 * One game. `cardId` is granted to White at the start when given.
 *
 * Both seats use the same skill and the same RNG stream, so with the same seed
 * and no card the two runs of a pair are identical move for move. That is what
 * makes the delta attributable to the card rather than to the seed.
 */
function playGame(seed: number, cardId: string | null, tier: Tier): Outcome {
  const game: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed);
  if (cardId) acquireBuff(game, "w", cardId, tier);

  const rnd = mulberry32(seed * 7919 + (cardId ? 1 : 0));
  const pick = (max: number): number => Math.floor(rnd() * max);

  for (let ply = 0; ply < MAX_PLIES && !game.result; ply++) {
    let move;
    try {
      move = pickHouseMove(game, SKILL, pick);
    } catch (err) {
      // A bot that cannot pick in this position ends the game as unfinished
      // rather than taking the whole run down: one card is not worth losing
      // the other 2,447 measurements. DEBUG=1 surfaces why.
      if (process.env.DEBUG) console.error("pick failed:", err);
      return "unfinished";
    }
    if (!move) break;
    try {
      playMove(game, move);
    } catch (err) {
      if (process.env.DEBUG) console.error("play failed:", err);
      return "unfinished";
    }
  }
  if (!game.result) return "unfinished";
  return game.result.winner as Outcome;
}

/** White's score for one game: 1 win, 0.5 draw, 0 loss. */
function score(o: Outcome): number | null {
  if (o === "w") return 1;
  if (o === "b") return 0;
  if (o === "draw") return 0.5;
  return null; // unfinished: excluded from the average rather than counted as a draw
}

interface Row {
  id: string;
  name: string;
  tier: number;
  category: string;
  kind: string;
  /** Win-rate delta in percentage points, with minus without. */
  delta: number;
  /** Pairs that actually produced two finished games. */
  pairs: number;
  /** One standard error on that delta, in points. */
  stderr: number;
}

function measure(id: string): Row | null {
  const def = BUFF_BY_ID[id];
  if (!def?.implemented) return null;
  let withSum = 0;
  let withoutSum = 0;
  let pairs = 0;
  for (let i = 0; i < GAMES; i++) {
    const seed = 1000 + i * 31;
    const a = score(playGame(seed, id, def.tier));
    const b = score(playGame(seed, null, def.tier));
    if (a == null || b == null) continue; // the pair is only usable if both finished
    withSum += a;
    withoutSum += b;
    pairs++;
  }
  if (pairs === 0) return null;
  return {
    id,
    name: def.name,
    tier: def.tier,
    category: (def as { category?: string }).category ?? "?",
    kind: def.kind,
    delta: ((withSum - withoutSum) / pairs) * 100,
    pairs,
    // Standard error of a paired difference of proportions, worst case p=0.5.
    stderr: 100 * Math.sqrt(0.5 / pairs),
  };
}

function main(): void {
  const all = ALL_BUFFS.filter((b) => b.implemented && (!ONLY || b.id.includes(ONLY)));
  // Stride rather than block, so every shard sees a mix of tiers and families
  // and a shard that finishes early is not systematically the cheap half.
  const pool = SHARD ? all.filter((_, i) => i % SHARD_N === SHARD_I) : all;
  console.log(
    `[sim-card-winrate] ${pool.length} cards x ${GAMES} paired games ` +
      `(skill ${SKILL}, ${MAX_PLIES}-ply cap). +-${(100 * Math.sqrt(0.5 / GAMES)).toFixed(1)} ` +
      `points of standard error at this N.`,
  );

  const rows: Row[] = [];
  let done = 0;
  for (const b of pool) {
    const r = measure(b.id);
    if (r) rows.push(r);
    if (++done % 50 === 0) console.log(`  ${done}/${pool.length}...`);
  }

  rows.sort((a, b) => b.delta - a.delta);
  const band = 100 * Math.sqrt(0.5 / GAMES);

  // Only report what the sample can actually support. Anything inside the
  // error bar is "not measured", and saying so is the whole point.
  const strong = rows.filter((r) => Math.abs(r.delta) > band);
  console.log(
    `\nmeasured ${rows.length} cards; ${strong.length} moved further than the ` +
      `+-${band.toFixed(1)} point error bar, ${rows.length - strong.length} did not`,
  );

  console.log("\nstrongest positive (card helps its holder most):");
  for (const r of strong.slice(0, 15)) {
    console.log(
      `  ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}pt  t${r.tier}  ${r.id}  (${r.category}, ${r.pairs} pairs)`,
    );
  }
  console.log("\nstrongest negative (card HURTS its holder - broken or backwards):");
  for (const r of strong.slice(-15).reverse()) {
    console.log(
      `  ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}pt  t${r.tier}  ${r.id}  (${r.category}, ${r.pairs} pairs)`,
    );
  }

  // The tier ladder is an assertion about power; this is the check of it.
  console.log("\nmean delta by tier (the ladder should rise):");
  for (let t = 1; t <= 10; t++) {
    const at = rows.filter((r) => r.tier === t);
    if (!at.length) continue;
    const mean = at.reduce((a, r) => a + r.delta, 0) / at.length;
    console.log(`  t${t}  ${mean >= 0 ? "+" : ""}${mean.toFixed(1)}pt  (${at.length} cards)`);
  }

  console.log("\nmean delta by kind:");
  for (const k of ["passive", "activated", "instant"]) {
    const at = rows.filter((r) => r.kind === k);
    if (!at.length) continue;
    const mean = at.reduce((a, r) => a + r.delta, 0) / at.length;
    console.log(`  ${k.padEnd(10)} ${mean >= 0 ? "+" : ""}${mean.toFixed(1)}pt  (${at.length} cards)`);
  }

  if (WRITE) {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const out = path.join(
      __dirname,
      "..",
      "docs",
      SHARD ? `card-winrate.shard${SHARD_I}.json` : "card-winrate.json",
    );
    fs.writeFileSync(
      out,
      `${JSON.stringify({ games: GAMES, skill: SKILL, plyCap: MAX_PLIES, errorBar: band, rows }, null, 1)}\n`,
    );
    console.log(`\nwrote ${out}`);
  }
}

main();
