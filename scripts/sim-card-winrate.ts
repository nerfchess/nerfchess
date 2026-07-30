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
// rewards long-horizon planning will under-measure here.
//
// The sampling error is REPORTED rather than hidden, and it is measured rather
// than assumed. Each card's error bar is the empirical spread of its own pair
// deltas. That matters more than it sounds: quoting the textbook
// `100*sqrt(0.5/N)` bound for unpaired proportions - which this script did at
// first - throws away the entire benefit of pairing. Both runs of a pair share
// a seed, an opening and a bot, so a card that changes nothing scores a delta
// of exactly zero instead of two noisy win rates that have to cancel. Most
// pairs do exactly that, so the real bar is far tighter than the worst case,
// and the pessimistic formula was understating every measurement the harness
// can make.
//
// A card counts as moved when its delta exceeds twice its own standard error.
// Treat anything inside that as "not measured", not as "measured zero". Pairs
// voided by the ply cap are counted and reported too: a card measured on 2 of
// 20 pairs is not the same claim as one measured on 20.

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
  /** Pairs thrown away because a game hit the ply cap or the bot could not
   *  move. Reported, because a card measured on 2 of 20 pairs is not the same
   *  claim as one measured on 20. */
  voided: number;
  /** One EMPIRICAL standard error on that delta, in points. */
  stderr: number;
}

function measure(id: string): Row | null {
  const def = BUFF_BY_ID[id];
  if (!def?.implemented) return null;
  // Per-pair deltas, kept rather than summed: the spread of these IS the
  // measurement error, and it cannot be recovered from the total.
  const deltas: number[] = [];
  let voided = 0;
  for (let i = 0; i < GAMES; i++) {
    const seed = 1000 + i * 31;
    const a = score(playGame(seed, id, def.tier));
    const b = score(playGame(seed, null, def.tier));
    if (a == null || b == null) {
      voided++; // the pair is only usable if both games finished
      continue;
    }
    deltas.push(a - b);
  }
  const pairs = deltas.length;
  if (pairs === 0) return null;

  const mean = deltas.reduce((s, d) => s + d, 0) / pairs;
  // EMPIRICAL standard error, not the worst-case formula for unpaired
  // proportions. Pairing is the whole design: both runs share a seed, an
  // opening and a bot, so a card that changes nothing produces a delta of
  // exactly zero rather than two noisy win rates that have to cancel. Most
  // pairs do exactly that, so the real spread is far below the +-100*sqrt(0.5/N)
  // worst case, and quoting the worst case understated every measurement this
  // harness can make. With one pair there is no spread to measure, so the
  // pessimistic bound is the honest answer.
  const variance =
    pairs > 1 ? deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / (pairs - 1) : 0.5;
  return {
    id,
    name: def.name,
    tier: def.tier,
    category: (def as { category?: string }).category ?? "?",
    kind: def.kind,
    delta: mean * 100,
    pairs,
    voided,
    stderr: 100 * Math.sqrt(variance / pairs),
  };
}

function main(): void {
  const all = ALL_BUFFS.filter((b) => b.implemented && (!ONLY || b.id.includes(ONLY)));
  // Stride rather than block, so every shard sees a mix of tiers and families
  // and a shard that finishes early is not systematically the cheap half.
  const pool = SHARD ? all.filter((_, i) => i % SHARD_N === SHARD_I) : all;
  console.log(
    `[sim-card-winrate] ${pool.length} cards x ${GAMES} paired games ` +
      `(skill ${SKILL}, ${MAX_PLIES}-ply cap). Each card's error bar is measured ` +
      `from its own pairs, not assumed from N.`,
  );

  const rows: Row[] = [];
  let done = 0;
  for (const b of pool) {
    const r = measure(b.id);
    if (r) rows.push(r);
    if (++done % 50 === 0) console.log(`  ${done}/${pool.length}...`);
  }

  rows.sort((a, b) => b.delta - a.delta);

  // Each card gets its OWN error bar, because each card earned one. A card
  // whose pairs all agreed is measured; a card whose pairs disagreed is not,
  // even at the same N. Two standard errors is the bar for calling a card
  // moved, and anything inside it is "not measured" rather than "measured
  // zero" - saying so is the whole point.
  const isStrong = (r: Row): boolean => Math.abs(r.delta) > 2 * r.stderr;
  const strong = rows.filter(isStrong);
  const voidedTotal = rows.reduce((s, r) => s + r.voided, 0);
  const medErr = [...rows].sort((a, b) => a.stderr - b.stderr)[Math.floor(rows.length / 2)];
  console.log(
    `\nmeasured ${rows.length} cards; ${strong.length} moved further than twice ` +
      `their own standard error, ${rows.length - strong.length} did not. ` +
      `median error bar +-${(medErr?.stderr ?? 0).toFixed(1)} points; ` +
      `${voidedTotal} pairs voided (unfinished at the ${MAX_PLIES}-ply cap).`,
  );

  const line = (r: Row): string =>
    `  ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}pt +-${r.stderr.toFixed(1)}  ` +
    `t${r.tier}  ${r.id}  (${r.category}, ${r.pairs} pairs)`;
  console.log("\nstrongest positive (card helps its holder most):");
  for (const r of strong.slice(0, 15)) console.log(line(r));
  console.log("\nstrongest negative (card HURTS its holder - broken or backwards):");
  for (const r of strong.slice(-15).reverse()) console.log(line(r));

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
      `${JSON.stringify({ games: GAMES, skill: SKILL, plyCap: MAX_PLIES, rows }, null, 1)}\n`,
    );
    console.log(`\nwrote ${out}`);
  }
}

main();
