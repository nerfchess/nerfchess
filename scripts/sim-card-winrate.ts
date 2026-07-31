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
  aiActivateBuffs,
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
/** Ply cap. 240 rather than the old 120, because the cap was silently eating
 *  the sample: at 90 plies a card whose games run long (Warp Legion) voided 7
 *  of 8 pairs, and the pairs that survived were the ones that happened to end
 *  FAST -- a biased slice, not a smaller one. At 240 the same card voids none,
 *  and it costs nothing on cards whose games end naturally (11s for 4 pairs at
 *  either cap), because the cap only bites on the games it was discarding. */
const MAX_PLIES = Number(flag("plies", "240"));
const WRITE = args.includes("--write");
/**
 * `--no-activate` holds the card but never fires it.
 *
 * This is the diagnostic that separates a BAD CARD from a BAD POLICY, which
 * the delta alone cannot do. Firm Footing measured -40 points: either the card
 * hurts its owner, or the bot is choosing to fire it at a terrible moment.
 * Running the same card both ways answers that directly, because the only
 * difference between the two runs is the decision to use it.
 */
const NO_ACTIVATE = args.includes("--no-activate");
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

/** Cards between partial saves. Small enough that a kill costs minutes, large
 *  enough that the write is not the bottleneck. */
const FLUSH_EVERY = 10;

/**
 * A fingerprint of the code whose behaviour is being measured.
 *
 * The resume cache was keyed on games and ply cap alone, which cannot see the
 * thing most likely to invalidate a result: a change to the engine. Fixing the
 * bot's activation policy moved Pawn Shield from -35 to 0, and the very next
 * sweep happily resumed 90 rows measured under the old policy and reported
 * them as current. Settings matched, so the cache saw no reason to object.
 *
 * Hashing the sources that decide a game -- the harness, the rules, the
 * search, the bot, and every card definition -- means a resume is refused
 * whenever any of them changes, which is exactly when the old numbers stop
 * describing the current game.
 */
function codeFingerprint(): string {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const root = path.join(__dirname, "..");
  const files: string[] = [
    path.join(__dirname, "sim-card-winrate.ts"),
    path.join(root, "src", "engine", "game.ts"),
    path.join(root, "src", "engine", "ai.ts"),
    path.join(root, "src", "engine", "board.ts"),
    path.join(root, "src", "lib", "server", "bots.ts"),
  ];
  const buffDir = path.join(root, "src", "engine", "buffs");
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".ts")) files.push(p);
    }
  };
  try {
    walk(buffDir);
  } catch {
    /* missing dir: the hash is still useful for the rest */
  }
  const h = crypto.createHash("sha256");
  for (const f of files.sort()) {
    try {
      h.update(fs.readFileSync(f));
    } catch {
      /* ignore unreadable */
    }
  }
  return h.digest("hex").slice(0, 16);
}

const CODE_HASH = codeFingerprint();

function partialPath(): string {
  const path = require("node:path") as typeof import("node:path");
  return path.join(
    __dirname,
    "..",
    "docs",
    SHARD ? `card-winrate.shard${SHARD_I}.json` : "card-winrate.json",
  );
}

/**
 * Rows measured by an earlier run of this same shard, if any.
 *
 * Gated on --write, and that gate is load-bearing. Without it every ad-hoc
 * diagnostic run both read and wrote the shared file, so a one-card
 * investigation replayed a cached number instead of measuring anything: two
 * runs of the same card with the activation policy ON and OFF returned
 * byte-identical results because NEITHER had re-measured. A cache that
 * survives a change to the code under test is not a cache, it is a way to
 * keep believing an old answer.
 */
function loadPartial(): Row[] {
  if (!WRITE) return [];
  const fs = require("node:fs") as typeof import("node:fs");
  try {
    const raw = JSON.parse(fs.readFileSync(partialPath(), "utf8")) as {
      games?: number;
      plyCap?: number;
      codeHash?: string;
      rows?: Row[];
    };
    // Same settings AND the same code. Settings alone let a sweep resume rows
    // measured before an engine fix and present them as current; stitching a
    // 90-ply run onto a 240-ply one would mix two populations the same way.
    if (raw.games !== GAMES || raw.plyCap !== MAX_PLIES) return [];
    if (raw.codeHash !== CODE_HASH) {
      console.log("[resume] engine changed since those results; measuring fresh");
      return [];
    }
    return raw.rows ?? [];
  } catch {
    return [];
  }
}

function savePartial(rows: Row[]): void {
  if (!WRITE) return;
  const fs = require("node:fs") as typeof import("node:fs");
  fs.writeFileSync(
    partialPath(),
    `${JSON.stringify({ games: GAMES, skill: SKILL, plyCap: MAX_PLIES, codeHash: CODE_HASH, rows }, null, 1)}\n`,
  );
}

/**
 * Freeze the clock, because the search is cut off by WALL TIME.
 *
 * engine/ai.ts stops iterative deepening on `Date.now() - start > budget`. Under
 * a real clock the same position searches to different depths depending on how
 * busy the machine is, so the same seed produces different games -- and with
 * four shards competing for four cores, wildly so. That is fatal here rather
 * than merely untidy: the entire paired design rests on the control and the
 * treatment being the same game until the card acts, and a load-dependent
 * search means they never were. A control-versus-control run diverged at ply 8.
 *
 * Freezing Date.now makes the time check never fire, so the search runs to its
 * configured depth every time and a pair is reproducible. This is not a hack
 * bolted on for the benchmark: ai.ts's own comment notes that on Cloudflare
 * Workers, where this game actually runs, Date.now() is frozen during
 * synchronous compute. The harness now matches production instead of drifting
 * with local CPU load.
 */
const FROZEN_NOW = Date.now();
Date.now = () => FROZEN_NOW;

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
 * One game's result, plus whether the card under test ever actually FIRED.
 *
 * This flag is the validity guard the harness was missing. A card that is
 * never used scores a delta of zero, which is indistinguishable from a card
 * that is used and does nothing -- and for 752 activated cards the harness was
 * silently reporting the first as if it were the second. Carrying "did it
 * fire" alongside the outcome means an unused card can be reported as NOT
 * MEASURED instead of as measured-zero, and it generalises to any card whose
 * trigger conditions simply never come up in bot play.
 */
interface GameRun {
  outcome: Outcome;
  fired: boolean;
}

/**
 * One game. `cardId` is granted to White at the start when given.
 *
 * Both seats use the same skill and the same RNG stream, so with the same seed
 * and no card the two runs of a pair are identical move for move. That is what
 * makes the delta attributable to the card rather than to the seed.
 */
function playGame(seed: number, cardId: string | null, tier: Tier): GameRun {
  const game: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed);
  if (cardId) acquireBuff(game, "w", cardId, tier);
  // An `instant` fires inside acquireBuff, so it has already been used by the
  // time the first move is picked.
  let fired = cardId ? BUFF_BY_ID[cardId]?.kind === "instant" : false;

  // The SAME stream in both arms of a pair. It used to be seeded with
  // `seed * 7919 + (cardId ? 1 : 0)`, which gave the treatment and the control
  // different random streams and so destroyed the pairing outright: the two
  // games diverged from the first tie-broken choice for reasons that had
  // nothing to do with the card. The header claimed they were "identical move
  // for move"; they never were.
  const rnd = mulberry32(seed * 7919);
  const pick = (max: number): number => Math.floor(rnd() * max);

  for (let ply = 0; ply < MAX_PLIES && !game.result; ply++) {
    // Give the side to move a chance to FIRE a held card before it moves.
    //
    // Without this the harness measured nothing at all for the 752 activated
    // cards: pickHouseMove only picks chess moves and never touches the buff
    // system, so a card like Warp Legion ("up to three of your pieces teleport
    // to empty squares beside your king") sat in hand for the whole game and
    // scored a delta of exactly zero. Not "weak" -- unused.
    //
    // aiActivateBuffs is the engine's OWN policy, the same one the house bots
    // use online: it auto-picks targets by value, makes offensive one-shots
    // hold out for a knight's worth of value, and makes protective cards wait
    // for real danger. That makes this a measurement of the card as players
    // actually meet it, rather than of a policy invented for the benchmark.
    const mover = game.board.turn;
    try {
      if (!NO_ACTIVATE && aiActivateBuffs(game, mover)) fired = true;
    } catch (err) {
      if (process.env.DEBUG) console.error("activate failed:", err);
    }
    // Activating can end the turn (or the game), so re-check before moving.
    if (game.result) break;
    if (game.board.turn !== mover) continue;

    let move;
    try {
      move = pickHouseMove(game, SKILL, pick);
    } catch (err) {
      // A bot that cannot pick in this position ends the game as unfinished
      // rather than taking the whole run down: one card is not worth losing
      // the other 2,447 measurements. DEBUG=1 surfaces why.
      if (process.env.DEBUG) console.error("pick failed:", err);
      return { outcome: "unfinished", fired };
    }
    if (!move) break;
    try {
      playMove(game, move);
    } catch (err) {
      if (process.env.DEBUG) console.error("play failed:", err);
      return { outcome: "unfinished", fired };
    }
  }
  if (!game.result) return { outcome: "unfinished", fired };
  return { outcome: game.result.winner as Outcome, fired };
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
  /** Pairs in which the card actually FIRED. Zero means the card was never
   *  used, so its delta is not a measurement of the card at all. */
  firedPairs: number;
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
  let firedPairs = 0;
  for (let i = 0; i < GAMES; i++) {
    const seed = 1000 + i * 31;
    const withCard = playGame(seed, id, def.tier);
    const without = playGame(seed, null, def.tier);
    if (withCard.fired) firedPairs++;
    const a = score(withCard.outcome);
    const b = score(without.outcome);
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
  // Empirical spread, but only once there is enough of it to believe. Two
  // pairs that happen to agree have an empirical standard deviation of exactly
  // zero, and the first run of this reported several cards as "+50.0pt +-0.0"
  // off two games -- infinite confidence from no evidence. Below the
  // threshold the conservative bound is the honest answer.
  const MIN_PAIRS_FOR_EMPIRICAL = 8;
  const variance =
    pairs >= MIN_PAIRS_FOR_EMPIRICAL
      ? deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / (pairs - 1)
      : 0.5;
  return {
    id,
    name: def.name,
    tier: def.tier,
    category: (def as { category?: string }).category ?? "?",
    kind: def.kind,
    delta: mean * 100,
    pairs,
    voided,
    firedPairs,
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

  // RESUMABLE, because a multi-hour sweep does not get to assume it will be
  // left alone. Three separate launches of this were reaped mid-run, each
  // losing every card it had measured, because results only existed in memory
  // until the final write. Partial results are now flushed as they accumulate
  // and reloaded on the next start, so a kill costs one flush interval instead
  // of the whole run.
  const rows: Row[] = [...loadPartial()];
  const alreadyDone = new Set(rows.map((r) => r.id));
  if (alreadyDone.size) {
    console.log(`[resume] ${alreadyDone.size} cards already measured, continuing`);
  }
  let done = alreadyDone.size;
  for (const b of pool) {
    if (alreadyDone.has(b.id)) continue;
    const r = measure(b.id);
    if (r) rows.push(r);
    done++;
    if (done % FLUSH_EVERY === 0) {
      savePartial(rows);
      console.log(`  ${done}/${pool.length}... (saved)`);
    }
  }
  savePartial(rows);

  rows.sort((a, b) => b.delta - a.delta);

  // Each card gets its OWN error bar, because each card earned one. A card
  // whose pairs all agreed is measured; a card whose pairs disagreed is not,
  // even at the same N. Two standard errors is the bar for calling a card
  // moved, and anything inside it is "not measured" rather than "measured
  // zero" - saying so is the whole point.
  // A card that never fired is NOT MEASURED, whatever its delta says. Reporting
  // it as a zero would be the harness's own silence dressed up as a finding.
  const unused = rows.filter((r) => r.firedPairs === 0);
  const usable = rows.filter((r) => r.firedPairs > 0);
  if (unused.length) {
    console.log(
      `\nNOT MEASURED: ${unused.length} cards never fired in any pair, so their ` +
        "delta says nothing about the card. By kind: " +
        ["passive", "activated", "instant"]
          .map((k) => `${k} ${unused.filter((r) => r.kind === k).length}`)
          .join(", "),
    );
    for (const r of unused.slice(0, 10)) console.log(`  t${r.tier}  ${r.id}  (${r.category})`);
  }

  const isStrong = (r: Row): boolean => Math.abs(r.delta) > 2 * r.stderr;
  const strong = usable.filter(isStrong);
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
    const at = usable.filter((r) => r.tier === t);
    if (!at.length) continue;
    const mean = at.reduce((a, r) => a + r.delta, 0) / at.length;
    console.log(`  t${t}  ${mean >= 0 ? "+" : ""}${mean.toFixed(1)}pt  (${at.length} cards)`);
  }

  console.log("\nmean delta by kind:");
  for (const k of ["passive", "activated", "instant"]) {
    const at = usable.filter((r) => r.kind === k);
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
      `${JSON.stringify({ games: GAMES, skill: SKILL, plyCap: MAX_PLIES, codeHash: CODE_HASH, rows }, null, 1)}\n`,
    );
    console.log(`\nwrote ${out}`);
  }
}

main();
