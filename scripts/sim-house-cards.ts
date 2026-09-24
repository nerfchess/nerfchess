// House-bot card use and drafting (slice HB, track HB1).
//
//   ./node_modules/.bin/tsx scripts/sim-house-cards.ts --games 40 --tiers 1350,1450,1550,1650 --seed 1
//
// Run it through scripts/polish/heavy.sh nice -n 10 on the shared box.
//
// Part 1, activations, in Buff-mode draft games between two personas of the
// same tier. Every seed is played twice with colors swapped: one seat uses the
// policy under test (houseChooseActivation and houseDraftChoice when bots.ts
// exports them), the other uses the policy worker.ts ships today (a persona
// coin on activationChance, then aiChooseBuffActivation's first qualifying card;
// aiDraftChoice plus the persona's bankBias roll). On the baseline tree the new
// helpers do not exist, so both seats run today's policy and the paired score
// sits near 50% by construction. Reported per policy:
//
//   - fires: activations played
//   - bad fires: a turn-costing card (not a free action) fired while an own
//     piece worth 3 or more hung, the same piece still hung afterwards (the card
//     did not save it), and some king-safe move would have left no such piece
//     hanging (the move that could have saved it did not happen). When every
//     move leaves a piece hanging, a card is no worse than a move and the fire
//     does not count.
//   - unused: activated cards still held and usable when the game ended, and
//     the part of those the engine's own gates (aiChooseBuffActivation) had
//     accepted at some point in the game: a card the gates never accept is out
//     of any house policy's reach, since every policy works inside the gates
//   - the paired score of the new policy against today's, with a Wilson CI
//
// A piece "hangs" when the opponent can capture it and either it is undefended
// or the cheapest attacker is worth less than it. Deliberately crude (no full
// exchange), the same class of test the engine's own activation gate uses.
//
// Part 2, drafts: 200 same-tier offers (25 per tier 1-8) shown to 40 personas.
// Reports the share of offers on which the personas do not all pick the same
// card (banks aside), and the bank rate by offered tier.
//
// Searches run with Date.now frozen and a small ceiling (node cap only): card
// policy is the question, not chess strength, and the run must not depend on
// box load.

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as bots from "../src/lib/server/bots";
import {
  HOUSE_ROSTER,
  bakedResolvedProfile,
  houseStyle,
  pickHouseMove,
  type HousePersona,
  type HouseSkill,
} from "../src/lib/server/bots";
import { attackedBy, generateMoves, makeMove, moveToUCI } from "../src/engine/board";
import { rollOffer } from "../src/engine/draft";
import {
  UNRESTRICTED_NERF,
  activateBuff,
  aiChooseBuffActivation,
  aiDraftChoice,
  bankDraft,
  enableDraftMode,
  gameInCheck,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  type NerfGame,
} from "../src/engine/game";
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import type { BuffPick } from "../src/engine/buff";
import type { Color, PieceType, Square } from "../src/engine/types";
import type { Tier } from "../src/engine/nerf";

const FROZEN = Date.now();
Date.now = () => FROZEN;

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const GAMES = Number(arg("games") ?? 40);
const TIERS = (arg("tiers") ?? "1350,1450,1550,1650").split(",").map(Number) as HouseSkill[];
const SEED = Number(arg("seed") ?? 1);
// Both seats search at the tier's baked profile capped to --max-depth plies,
// with the clock frozen (so the node cap of the DO ceiling is the other bound).
// Shallow, but the same for both seats, and it keeps 80 full draft games to a
// few minutes: card policy is the question here, not chess strength.
const CEILING = Number(arg("ceiling") ?? 80);
const MAX_DEPTH = Number(arg("max-depth") ?? 2);
const PLY_CAP = Number(arg("plies") ?? 160);
const OFFERS_PER_TIER = Number(arg("offers-per-tier") ?? 25);
const DRAFT_PERSONAS = Number(arg("personas") ?? 40);
const OUT = arg("out");

function gitHead(): string {
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain -- src/lib/server/bots.ts src/engine/ai.ts", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return dirty ? `${head}+dirty` : head;
  } catch {
    return "unknown";
  }
}
const COMMIT = arg("commit") ?? gitHead();

function makeRng(seed: number): (max: number) => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}
function wilson(k: number, n: number, z = 1.96) {
  if (n === 0) return { p: 0, lo: 0, hi: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, lo: Math.max(0, (c - r) / d), hi: Math.min(1, (c + r) / d) };
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

type Activation = { buffIndex: number; picks: BuffPick[] } | null;
type DraftChoice = { action: "pick"; index: number } | { action: "bank" } | null;
type Rng = (max: number) => number;
type Policy = {
  name: string;
  activate: (g: NerfGame, c: Color, p: HousePersona, r: Rng) => Activation;
  draft: (g: NerfGame, c: Color, p: HousePersona, r: Rng) => DraftChoice;
};

// Today's worker.ts (playHouseAction): a persona coin, then the first card the
// engine's gates let through; aiDraftChoice, then the persona's bank roll.
const today: Policy = {
  name: "today",
  activate: (g, c, p, r) =>
    r(100) < Math.round(houseStyle(p).activationChance * 100) ? aiChooseBuffActivation(g, c) : null,
  draft: (g, c, p, r) => {
    const choice = aiDraftChoice(g, c);
    const bankRoll = choice?.action === "pick" ? r(100) < Math.round(houseStyle(p).bankBias * 100) : false;
    return choice?.action === "pick" && !bankRoll ? choice : { action: "bank" };
  },
};

const exported = bots as unknown as {
  houseChooseActivation?: (g: NerfGame, c: Color, p: HousePersona, r: Rng) => Activation;
  houseDraftChoice?: (g: NerfGame, c: Color, p: HousePersona, r: Rng) => DraftChoice;
};
const candidate: Policy = {
  name: exported.houseChooseActivation ? "houseChooseActivation" : "today (no wrapper on this tree)",
  activate: exported.houseChooseActivation ?? today.activate,
  draft: exported.houseDraftChoice ?? today.draft,
};

// ---------------------------------------------------------------------------
// Hanging pieces
// ---------------------------------------------------------------------------

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Own pieces worth 3+ that the opponent can take at a profit, as squares. */
function hanging(g: NerfGame, me: Color): Square[] {
  const opp: Color = me === "w" ? "b" : "w";
  const board = g.board;
  const replies = generateMoves({ ...board, turn: opp });
  const defended = attackedBy(board, me);
  const minAttacker = new Map<Square, number>();
  for (const m of replies) {
    if (!m.captured) continue;
    const victim = board.pieces[m.to];
    if (!victim || victim.color !== me || VALUE[victim.type] < 3 || victim.type === "k") continue;
    const v = VALUE[m.piece];
    minAttacker.set(m.to, Math.min(minAttacker.get(m.to) ?? Infinity, v));
  }
  const out: Square[] = [];
  for (const [sq, att] of minAttacker) {
    const victim = board.pieces[sq]!;
    if (!defended.has(sq) || att < VALUE[victim.type]) out.push(sq);
  }
  return out;
}

/** True when some king-safe move leaves no own piece worth 3 or more hanging. */
function savable(g: NerfGame, me: Color): boolean {
  for (const m of legalMoves(g)) {
    const next = { ...g, board: makeMove(g.board, m) };
    if (m.captured !== "k" && gameInCheck(next, me)) continue;
    if (!hanging(next, me).length) return true;
  }
  return false;
}

function usableActivated(g: NerfGame, c: Color): number {
  return usableActivatedIdx(g, c).length;
}

/** Buff indices the engine's own gates (aiChooseBuffActivation) accept right
 * now, found by asking again with each accepted card masked as used. */
function gateQualified(g: NerfGame, c: Color): number[] {
  const bs = g.buffs;
  if (!bs || bs.diff) return [];
  const out: number[] = [];
  for (let k = 0; k < 6; k++) {
    const masked = new Set(out);
    const view: NerfGame = masked.size
      ? {
          ...g,
          buffs: {
            ...bs,
            players: {
              ...bs.players,
              [c]: {
                ...bs.players[c],
                buffs: bs.players[c].buffs.map((b, i) => (masked.has(i) ? { ...b, usedActivation: true } : b)),
              },
            },
          },
        }
      : g;
    const choice = aiChooseBuffActivation(view, c);
    if (!choice || masked.has(choice.buffIndex)) break;
    out.push(choice.buffIndex);
  }
  return out;
}

function usableActivatedIdx(g: NerfGame, c: Color): number[] {
  const ps = g.buffs?.players[c];
  if (!ps) return [];
  const n: number[] = [];
  for (let i = 0; i < ps.buffs.length; i++) {
    const inst = ps.buffs[i];
    const def = BUFF_BY_ID[inst.id];
    if (!def?.implemented || def.kind !== "activated") continue;
    if (inst.spent || inst.nullified || inst.usedActivation) continue;
    if (
      def.spendOnUse === false &&
      (inst.state.sq != null || inst.state.sqs != null || inst.state.squares != null || inst.state.active === true)
    ) {
      continue;
    }
    n.push(i);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Part 1: games
// ---------------------------------------------------------------------------

type Tally = { fires: number; turnFires: number; badFires: number; seats: number; unused: number; unusedQualified: number; score: number; games: number };
const tallies: Record<string, Tally> = {
  candidate: { fires: 0, turnFires: 0, badFires: 0, seats: 0, unused: 0, unusedQualified: 0, score: 0, games: 0 },
  today: { fires: 0, turnFires: 0, badFires: 0, seats: 0, unused: 0, unusedQualified: 0, score: 0, games: 0 },
};
const reasons: Record<string, number> = {};

function playGame(tier: HouseSkill, seed: number, candidateColor: Color) {
  const rng = makeRng(seed * 31 + (candidateColor === "w" ? 1 : 2));
  const tierPersonas = HOUSE_ROSTER.filter((p) => p.skill === tier);
  const pr = makeRng(seed);
  const persona: Record<Color, HousePersona> = {
    w: tierPersonas[pr(tierPersonas.length)],
    b: tierPersonas[pr(tierPersonas.length)],
  };
  const policy: Record<Color, Policy> = {
    w: candidateColor === "w" ? candidate : today,
    b: candidateColor === "b" ? candidate : today,
  };
  const key = (c: Color) => (c === candidateColor ? "candidate" : "today");
  const baked = bakedResolvedProfile(tier);
  const profile = { ...baked, maxDepth: Math.min(baked.maxDepth, MAX_DEPTH) };
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g, seed + 1, { mode: "buff" });
  const qualified: Record<Color, Set<number>> = { w: new Set(), b: new Set() };
  for (let ply = 0; ply < PLY_CAP && !g.result; ply++) {
    for (const c of ["w", "b"] as Color[]) {
      if (!g.buffs?.players[c].offer) continue;
      let choice: DraftChoice = null;
      try {
        choice = policy[c].draft(g, c, persona[c], rng);
      } catch {
        choice = { action: "bank" };
      }
      if (choice?.action === "pick") pickDraftCard(g, c, choice.index);
      else bankDraft(g, c);
    }
    if (g.result) break;
    const turn = g.board.turn;
    const t = tallies[key(turn)];
    for (const i of gateQualified(g, turn)) qualified[turn].add(i);
    let act: Activation = null;
    try {
      act = policy[turn].activate(g, turn, persona[turn], rng);
    } catch {
      act = null;
    }
    if (act) {
      const inst = g.buffs!.players[turn].buffs[act.buffIndex];
      const def = inst ? BUFF_BY_ID[inst.id] : undefined;
      const turnCosting = !!def && def.kind === "activated" && !def.freeAction;
      // Only a fire that a move could have avoided counts: some king-safe move
      // leaves no own piece of 3 or more hanging. When every move leaves one
      // hanging, passing the turn with a card is no worse than moving.
      const before = savable(g, turn) ? hanging(g, turn) : [];
      if (activateBuff(g, turn, act.buffIndex, act.picks)) {
        t.fires++;
        if (turnCosting) {
          t.turnFires++;
          if (before.length) {
            // The turn passed to the opponent: does any of the pieces that hung
            // before still hang now?
            const after = new Set(hanging(g, turn));
            if (before.some((sq) => after.has(sq))) {
              t.badFires++;
              if (process.env.HB_DEBUG_BAD) {
                console.log(`    bad fire (${key(turn)}): ${inst?.id} before ${before.join(",")} after ${[...after].join(",")}`);
              }
            }
          }
        }
        if (g.result) break;
        if (g.board.turn !== turn) continue;
      }
    }
    const m = pickHouseMove(g, tier, rng, undefined, CEILING, profile, persona[turn]);
    if (!m) break;
    const lm = legalMoves(g).find((x) => moveToUCI(x) === moveToUCI(m));
    if (!lm) break;
    g = playMove(g, lm);
  }
  for (const c of ["w", "b"] as Color[]) {
    const t = tallies[key(c)];
    t.seats++;
    const unusedIdx = usableActivatedIdx(g, c);
    t.unused += unusedIdx.length;
    t.unusedQualified += unusedIdx.filter((i) => qualified[c].has(i)).length;
    if (process.env.HB_DEBUG_UNUSED) {
      const ids = (g.buffs?.players[c].buffs ?? [])
        .filter((b) => BUFF_BY_ID[b.id]?.kind === "activated" && !b.spent && !b.usedActivation && !b.nullified)
        .map((b) => b.id);
      if (ids.length) console.log(`    unused (${key(c)}, ${g.board.history.length} plies): ${ids.join(" ")}`);
    }
  }
  const w = g.result?.winner;
  const candScore = w === candidateColor ? 1 : w == null || w === "draw" ? 0.5 : 0;
  tallies.candidate.score += candScore;
  tallies.candidate.games++;
  tallies.today.score += 1 - candScore;
  tallies.today.games++;
  const reason = (g.result?.reason ?? "ply cap").replace(/[0-9]+/g, "#");
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

const t0 = performance.now();
console.log(`part 1: ${GAMES} seeds x 2 colors, Buff-mode drafts, tiers ${TIERS.join(",")}, policy under test: ${candidate.name}`);
for (let s = 0; s < GAMES; s++) {
  const tier = TIERS[s % TIERS.length];
  const seed = SEED * 100_000 + s * 17 + 3;
  playGame(tier, seed, "w");
  playGame(tier, seed, "b");
}
const rows1: Record<string, unknown> = {};
for (const [name, t] of Object.entries(tallies)) {
  const w = wilson(t.score, t.games);
  rows1[name] = {
    ...t,
    unusedPerSeat: t.unused / Math.max(1, t.seats),
    unusedQualifiedPerSeat: t.unusedQualified / Math.max(1, t.seats),
    badFireShare: t.badFires / Math.max(1, t.turnFires),
    scoreShare: w.p,
    scoreCi: [w.lo, w.hi],
  };
  console.log(
    `  ${name.padEnd(9)}: fires ${t.fires} (turn-costing ${t.turnFires}), bad fires ${t.badFires}, unused activated cards per seat ${(t.unused / Math.max(1, t.seats)).toFixed(2)} (of which the gates had accepted ${(t.unusedQualified / Math.max(1, t.seats)).toFixed(2)}), score ${pct(w.p)} (95% CI ${pct(w.lo)}-${pct(w.hi)})`,
  );
}
console.log(`  results: ${Object.entries(reasons).map(([r, n]) => `${r} x${n}`).join(", ")}  [${((performance.now() - t0) / 1000).toFixed(0)}s]`);

// ---------------------------------------------------------------------------
// Part 2: drafts
// ---------------------------------------------------------------------------

const step = Math.max(1, Math.floor(HOUSE_ROSTER.length / DRAFT_PERSONAS));
const draftPersonas = HOUSE_ROSTER.filter((_, i) => i % step === 0).slice(0, DRAFT_PERSONAS);
let offers = 0;
let varied = 0;
const bankByTier: Record<number, { banks: number; n: number }> = {};
for (let tier = 1; tier <= 8; tier++) {
  bankByTier[tier] = { banks: 0, n: 0 };
  for (let k = 0; k < OFFERS_PER_TIER; k++) {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
    enableDraftMode(g, SEED * 7_777 + tier * 1_000 + k * 3, { mode: "buff" });
    g.buffs!.rngState = ((0x9e3779b9 ^ ((tier * 1000 + k) * 2246822519)) >>> 0) || 1;
    const offer = rollOffer(g.buffs!, "w", [tier as Tier, tier as Tier], g.board);
    if (!offer || offer.cards.length < 2) continue;
    g.buffs!.players.w.offer = offer;
    const picks = new Set<number>();
    for (let i = 0; i < draftPersonas.length; i++) {
      const r = makeRng(SEED * 13 + tier * 101 + k * 7 + i);
      let choice: DraftChoice = null;
      try {
        choice = candidate.draft(g, "w", draftPersonas[i], r);
      } catch {
        choice = { action: "bank" };
      }
      bankByTier[tier].n++;
      if (choice?.action === "pick") picks.add(choice.index);
      else bankByTier[tier].banks++;
    }
    offers++;
    if (picks.size > 1) varied++;
  }
}
const vw = wilson(varied, offers);
console.log(
  `\npart 2: ${offers} same-tier offers x ${draftPersonas.length} personas (${candidate.name}): personas disagree on the card in ${varied} (${pct(vw.p)}, 95% CI ${pct(vw.lo)}-${pct(vw.hi)})`,
);
console.log(
  "  bank rate by offered tier: " +
    Object.entries(bankByTier)
      .map(([t, b]) => `${t}:${pct(b.banks / Math.max(1, b.n))}`)
      .join(" "),
);

const payload = {
  script: "scripts/sim-house-cards.ts",
  commit: COMMIT,
  argv: argv.join(" "),
  frozenClock: true,
  ceilingMs: CEILING,
  maxDepth: MAX_DEPTH,
  policyUnderTest: candidate.name,
  seconds: (performance.now() - t0) / 1000,
  games: { seeds: GAMES, perSeed: 2, tiers: TIERS, results: reasons, ...rows1 },
  drafts: {
    offers,
    personas: draftPersonas.length,
    variedOffers: varied,
    variedShare: vw.p,
    variedCi: [vw.lo, vw.hi],
    bankRateByTier: Object.fromEntries(Object.entries(bankByTier).map(([t, b]) => [t, b.banks / Math.max(1, b.n)])),
  },
};
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}
