// House-bot behaviour helpers (slice HB, track HB1): the pure decisions in
// src/lib/server/bots.ts that worker.ts and the arena wire in.
//
//   ./node_modules/.bin/tsx scripts/test-house-policy.ts
//
// Run it through scripts/polish/heavy.sh nice -n 10 on the shared box.
//
// Checks, each an HB1 acceptance line:
//   1. Every existing houseStyle trait keeps its value for all 900 personas
//      (new traits use new hash salts), against an embedded copy of the
//      2026-09-23 formulas.
//   2. The opening repertoire replays legally from the start position.
//   3. Resign: in 100 synthetic lost histories at -600cp or worse, a 1500+ bot
//      resigns within 6 own moves at least 80% of the time; 800-1200 take a
//      median of 10 or more own moves or never resign; nobody resigns a
//      history inside +-150cp; the never-resign personas never do.
//   4. Draws: 20 of 20 dead-level endings accepted, 0 of 20 winning ones.
//   5. Rematch: acceptance between 50% and 85% in every rating band over 1000
//      draws, answered after 2-6 seconds.
//   6. The remote-engine breaker: closed, open after two failures, half-open
//      with exactly one probe after 45s, closed again on a healthy answer, and
//      never opened by a version mismatch or a rejected move.
//   7. Clock helpers: the graded budget never drops below its floor and never
//      exceeds the tier or the ceiling; the engine timeout is budget + 1s,
//      at most 3s; filler pacing is the frozen function.
//   8. Cards: in harvested Buff-mode positions where the engine's own chooser
//      would fire a turn-costing card while an own piece of 3 or more hangs and
//      the card does not save it, houseChooseActivation never fires it; drafts
//      return a valid index and never bank an offer that was already banked.

import {
  HOUSE_ROSTER,
  HOUSE_SEARCH_CEILING_MS,
  HOUSE_REMOTE_CEILING_MS,
  HouseEngineBreaker,
  houseBookIsLegal,
  houseChooseActivation,
  houseDeadLevel,
  houseDraftChoice,
  houseDrawDecision,
  houseEngineTimeoutMs,
  houseExpectedSearchMs,
  houseMoveBudgetMs,
  houseNeverResigns,
  houseRematchDecision,
  houseResignDecision,
  houseStyle,
  houseThinkMs,
  nameHash,
  personaBio,
  pickHouseMove,
  type HousePersona,
} from "../src/lib/server/bots";
import { attackedBy, generateMoves, moveToUCI } from "../src/engine/board";
import {
  UNRESTRICTED_NERF,
  activateBuff,
  aiChooseBuffActivation,
  bankDraft,
  aiDraftChoice,
  deserializeGame,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  serializeGame,
  type NerfGame,
} from "../src/engine/game";
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import type { Color, PieceType, Square } from "../src/engine/types";

let failures = 0;
function check(ok: boolean, what: string) {
  if (!ok) {
    failures++;
    console.error("  FAIL " + what);
  }
}
function seeded(seed: number): (max: number) => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// 1. Existing traits unchanged.
// ---------------------------------------------------------------------------
{
  const OW = ["e2e4", "d2d4", "c2c4", "g1f3", "b2b3", "f2f4", "g2g3", "b1c3"];
  const OBE = ["e7e5", "c7c5", "e7e6", "c7c6", "d7d6", "g7g6", "b8c6", "d7d5"];
  const OBD = ["g8f6", "d7d5", "e7e6", "f7f5", "g7g6", "c7c5", "d7d6", "b8c6"];
  let changed = 0;
  for (const p of HOUSE_ROSTER) {
    const h = (salt: string, mod: number) => nameHash(p.name + "|" + salt) % mod;
    const want = {
      tempo: 0.75 + h("tempo", 61) / 100,
      activationChance: 0.25 + h("act", 31) / 100,
      bankBias: h("bank", 26) / 100,
      aggression: h("aggro", 101) / 100,
      snapAppetite: 0.15 + h("snap", 36) / 100,
      openingWhite: OW[h("openw", OW.length)],
      openingBlackVsE4: OBE[h("openbe", OBE.length)],
      openingBlackVsD4: OBD[h("openbd", OBD.length)],
    };
    const got = houseStyle(p);
    for (const [k, v] of Object.entries(want)) {
      if ((got as Record<string, unknown>)[k] !== v) changed++;
    }
    check(got.rematchAppetite >= 0.5 && got.rematchAppetite <= 0.85, `rematch appetite in range for ${p.name}`);
    check(got.resolve >= 0 && got.resolve <= 1 && got.drawAppetite >= 0 && got.drawAppetite <= 1, `new traits in range for ${p.name}`);
  }
  console.log(`1. existing houseStyle traits: ${changed} changed values across ${HOUSE_ROSTER.length} personas (must be 0)`);
  check(changed === 0, "every existing houseStyle trait keeps its value");
}

// ---------------------------------------------------------------------------
// 2. Repertoire legality.
// ---------------------------------------------------------------------------
{
  check(houseBookIsLegal(), "every repertoire line replays legally");
  // And the repertoire is actually reached: a persona's first two moves come
  // from it far more often than not, and it varies across personas.
  const firsts = new Set<string>();
  for (const p of HOUSE_ROSTER.slice(0, 60)) {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
    const m = pickHouseMove(g, p.skill, seeded(nameHash(p.name)), undefined, 10, undefined, p);
    if (m) firsts.add(moveToUCI(m));
  }
  console.log(`2. repertoire legal: ${houseBookIsLegal()}; ${firsts.size} distinct first moves over 60 personas`);
  check(firsts.size >= 8, `personas open with at least 8 different moves (${firsts.size})`);
}

// ---------------------------------------------------------------------------
// 3. Resign.
// ---------------------------------------------------------------------------
{
  const rng = seeded(3);
  const resigners = (lo: number, hi: number) =>
    HOUSE_ROSTER.filter((p) => p.skill >= lo && p.skill <= hi && !houseNeverResigns(p));
  // A lost game: level for a while, then a collapse to -600..-1500 that never
  // recovers (small noise, never improving by more than 100).
  function lostRun(p: HousePersona, r: (max: number) => number): number | null {
    const hist: number[] = [];
    const lead = 5 + r(10);
    for (let i = 0; i < lead; i++) hist.push(r(201) - 100);
    let v = -600 - r(300);
    for (let k = 1; k <= 40; k++) {
      hist.push(v);
      const d = houseResignDecision({ persona: p, evalHistoryCp: hist }, r);
      if (d.resign) {
        check(d.delayMs >= 1000 && d.delayMs <= 4000, `resign delay ${d.delayMs}`);
        return k;
      }
      v = Math.max(-2000, v - r(60) + 20);
    }
    return null;
  }
  const strong = resigners(1500, 2700);
  let within6 = 0;
  for (let t = 0; t < 100; t++) {
    const k = lostRun(strong[rng(strong.length)], rng);
    if (k != null && k <= 6) within6++;
  }
  const weak = resigners(800, 1200);
  const weakK: number[] = [];
  for (let t = 0; t < 100; t++) weakK.push(lostRun(weak[rng(weak.length)], rng) ?? Infinity);
  weakK.sort((a, b) => a - b);
  const weakMedian = weakK[50];
  let levelResigns = 0;
  for (let t = 0; t < 200; t++) {
    const p = HOUSE_ROSTER[rng(HOUSE_ROSTER.length)];
    const hist: number[] = [];
    for (let i = 0; i < 60; i++) {
      hist.push(rng(301) - 150);
      if (houseResignDecision({ persona: p, evalHistoryCp: hist }, rng).resign) levelResigns++;
    }
  }
  const stubborn = HOUSE_ROSTER.filter((p) => houseNeverResigns(p));
  let stubbornResigns = 0;
  for (const p of stubborn) if (lostRun(p, rng) != null) stubbornResigns++;
  const named = HOUSE_ROSTER.filter(
    (p) => /nobodyresigns/i.test(p.name) || /never resign|resigning is for other people/i.test(personaBio(p) ?? ""),
  );
  console.log(
    `3. resign: 1500+ within 6 own moves ${within6}/100; 800-1200 median ${weakMedian === Infinity ? "never" : weakMedian} own moves; ` +
      `level histories resigned ${levelResigns}; never-resign personas ${stubborn.length} (named by bio or name ${named.length}), resigned ${stubbornResigns}`,
  );
  check(within6 >= 80, `1500+ resign within 6 own moves in at least 80 of 100 (${within6})`);
  check(weakMedian >= 10, `800-1200 median at least 10 own moves or never (${weakMedian})`);
  check(levelResigns === 0, `no resign inside +-150cp (${levelResigns})`);
  check(stubbornResigns === 0, `never-resign personas never resign (${stubbornResigns})`);
  check(named.length >= 2 && named.every((p) => houseNeverResigns(p)), "personas whose bio or name says so never resign");
  // Flag chances: an opponent about to flag keeps a lost bot playing.
  const p = strong[0];
  const lost = [0, 0, -700, -800, -900, -1000, -1100, -1200];
  let resignedVsFlag = 0;
  for (let i = 0; i < 100; i++) {
    if (houseResignDecision({ persona: p, evalHistoryCp: lost, myClockMs: 60_000, oppClockMs: 8_000 }, rng).resign) resignedVsFlag++;
  }
  check(resignedVsFlag === 0, "no resign while the opponent is about to flag");
}

// ---------------------------------------------------------------------------
// 4. Draws.
// ---------------------------------------------------------------------------
function position(pieces: Record<string, string>, turn: Color): NerfGame {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  g.board.pieces = new Array(64).fill(null);
  for (const [sq, code] of Object.entries(pieces)) {
    const idx = (Number(sq[1]) - 1) * 8 + (sq.charCodeAt(0) - 97);
    const color: Color = code === code.toUpperCase() ? "w" : "b";
    g.board.pieces[idx] = { type: code.toLowerCase() as PieceType, color };
  }
  g.board.turn = turn;
  g.board.castling = { wk: false, wq: false, bk: false, bq: false };
  g.board.history = [];
  return g;
}
{
  const rng = seeded(4);
  const dead: Array<Record<string, string>> = [
    { e1: "K", e8: "k" },
    { e1: "K", e8: "k", c1: "B" },
    { e1: "K", e8: "k", g8: "n" },
    { a1: "K", h8: "k", c1: "B", c8: "b" }, // opposite-coloured bishops: c1 dark, c8 light
    { e1: "K", e8: "k", b1: "N" },
  ];
  const winning: Array<Record<string, string>> = [
    { e1: "K", e8: "k", d1: "Q" },
    { e1: "K", e8: "k", a1: "R" },
    { e1: "K", e8: "k", a1: "R", h2: "P" },
    { e1: "K", e8: "k", d1: "Q", b7: "p" },
  ];
  let accepted = 0;
  let deadN = 0;
  let acceptedWinning = 0;
  let winN = 0;
  for (let i = 0; i < 20; i++) {
    const persona = HOUSE_ROSTER[rng(HOUSE_ROSTER.length)];
    const d = dead[i % dead.length];
    const color: Color = i % 2 ? "b" : "w";
    const g = position(d, color);
    check(houseDeadLevel(g), `dead-level detected for ${JSON.stringify(d)}`);
    deadN++;
    const r = houseDrawDecision({ persona, game: g, color }, rng);
    if (r.accept) accepted++;
    check(r.delayMs >= 1500 && r.delayMs <= 5000, `draw delay ${r.delayMs}`);
    const w = winning[i % winning.length];
    const gw = position(w, "w");
    winN++;
    if (houseDrawDecision({ persona, game: gw, color: "w" }, rng).accept) acceptedWinning++;
  }
  console.log(`4. draws: dead-level accepted ${accepted}/${deadN}, winning accepted ${acceptedWinning}/${winN}`);
  check(accepted === deadN, "every dead-level ending is accepted");
  check(acceptedWinning === 0, "no winning position is given away");
}

// ---------------------------------------------------------------------------
// 5. Rematch.
// ---------------------------------------------------------------------------
{
  const rng = seeded(5);
  const bands: Array<[string, number, number]> = [
    ["800-1200", 800, 1200],
    ["1350-1750", 1350, 1750],
    ["1900-2150", 1900, 2150],
    ["2400-2700", 2400, 2700],
  ];
  const out: string[] = [];
  for (const [label, lo, hi] of bands) {
    const pool = HOUSE_ROSTER.filter((p) => p.skill >= lo && p.skill <= hi);
    let yes = 0;
    for (let i = 0; i < 1000; i++) {
      const result = (["win", "loss", "draw"] as const)[rng(3)];
      const d = houseRematchDecision(pool[rng(pool.length)], result, 10 + rng(120), rng);
      if (d.accept) yes++;
      check(d.delayMs >= 2000 && d.delayMs <= 6000, `rematch delay ${d.delayMs}`);
    }
    out.push(`${label} ${pct(yes / 1000)}`);
    check(yes >= 500 && yes <= 850, `rematch acceptance in band ${label} between 50% and 85% (${yes / 10}%)`);
  }
  console.log(`5. rematch acceptance: ${out.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 6. Breaker.
// ---------------------------------------------------------------------------
{
  const b = new HouseEngineBreaker();
  let t = 0;
  check(b.allow(t), "closed allows");
  b.record("timeout", t);
  check(b.allow(t) && b.snapshot(t).state === "closed", "one failure keeps it closed");
  b.record("error", t);
  check(!b.allow(t) && b.snapshot(t).state === "open", "two consecutive failures open it");
  t += 44_000;
  check(!b.allow(t), "still open before 45s");
  t += 1_000;
  check(b.allow(t), "half-open lets one probe through after 45s");
  check(!b.allow(t), "and only one");
  b.record("timeout", t);
  check(!b.allow(t) && b.snapshot(t).state === "open", "a failed probe re-opens it");
  t += 45_000;
  check(b.allow(t), "probe again after another 45s");
  b.record("ok", t, 480);
  check(b.allow(t) && b.snapshot(t).state === "closed", "a healthy probe closes it");
  b.record("timeout", t);
  b.record("version", t);
  b.record("timeout", t);
  check(b.snapshot(t).state === "closed", "a version mismatch between failures resets the count");
  b.record("rejected", t);
  b.record("null", t);
  check(b.snapshot(t).state === "closed", "rejected and null moves never open it");
  const snap = b.snapshot(t);
  check(snap.rttEmaMs === 480 && snap.counts.timeout === 4 && snap.counts.ok === 1, "counts and RTT average");
  console.log(`6. breaker: transitions ok, counts ${JSON.stringify(snap.counts)}`);
}

// ---------------------------------------------------------------------------
// 7. Clock helpers.
// ---------------------------------------------------------------------------
{
  const rng = seeded(7);
  let bad = 0;
  for (let i = 0; i < 20_000; i++) {
    const budget = [24, 40, 120, 400, 1200, 1800][rng(6)];
    const ceiling = rng(2) ? HOUSE_SEARCH_CEILING_MS : HOUSE_REMOTE_CEILING_MS;
    const remaining = rng(3) ? rng(600_000) : undefined;
    const inc = rng(4);
    const b = houseMoveBudgetMs(budget, remaining, ceiling, inc);
    const cap = Math.max(10, Math.min(budget, ceiling));
    const floor = remaining == null ? cap : Math.min(cap, remaining < 5000 ? 40 : 60);
    if (b > cap || b < floor) bad++;
  }
  check(bad === 0, `graded budget within [floor, cap] (${bad} violations)`);
  check(houseMoveBudgetMs(1800, 20_000, HOUSE_SEARCH_CEILING_MS) >= 60, "no 25ms cliff under 30s");
  check(houseEngineTimeoutMs(1800) === 2800 && houseEngineTimeoutMs(60) === 1060 && houseEngineTimeoutMs(5000) === 3000, "engine timeout");
  check(
    houseExpectedSearchMs(1800, 120_000, true) > houseExpectedSearchMs(1800, 120_000, false),
    "the remote path is expected to cost more than the local one",
  );
  // Forced moves and bullet never get a long think; the opening is quick.
  let longBullet = 0;
  let longForced = 0;
  let openingFast = 0;
  for (let i = 0; i < 10_000; i++) {
    if (houseThinkMs(rng, 60_000, 60, 1, 1.35, { capturesAvailable: 3 }) >= 6000) longBullet++;
    if (houseThinkMs(rng, 300_000, 600, 1, 1.35, { kingSafeMoves: 1, capturesAvailable: 3 }) >= 6000) longForced++;
    if (houseThinkMs(rng, 300_000, 300, 1, 1, { ownMoveIndex: rng(5) }) < 1200) openingFast++;
  }
  check(longBullet === 0, `no long think in bullet (${longBullet})`);
  check(longForced === 0, `no long think on a forced move (${longForced})`);
  check(openingFast >= 6000, `own moves 1-5 under 1.2s at least 60% (${pct(openingFast / 10_000)})`);
  console.log(`7. clock helpers ok; opening moves under 1.2s ${pct(openingFast / 10_000)}`);
}

// ---------------------------------------------------------------------------
// 8. Cards and drafts, on harvested Buff-mode positions.
// ---------------------------------------------------------------------------
const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function hanging(g: NerfGame, me: Color): Square[] {
  const opp: Color = me === "w" ? "b" : "w";
  const replies = generateMoves({ ...g.board, turn: opp });
  const defended = attackedBy(g.board, me);
  const minAtt = new Map<Square, number>();
  for (const m of replies) {
    const victim = m.captured ? g.board.pieces[m.to] : null;
    if (!victim || victim.color !== me || victim.type === "k" || VALUE[victim.type] < 3) continue;
    minAtt.set(m.to, Math.min(minAtt.get(m.to) ?? Infinity, VALUE[m.piece]));
  }
  return [...minAtt].filter(([sq, a]) => !defended.has(sq) || a < VALUE[g.board.pieces[sq]!.type]).map(([sq]) => sq);
}
{
  let badFound = 0;
  let wrapperFiredBad = 0;
  let draftsChecked = 0;
  let draftBad = 0;
  const always = () => 0;
  for (let s = 0; s < 24 && badFound < 12; s++) {
    const rng = seeded(80 + s);
    const persona = HOUSE_ROSTER[rng(HOUSE_ROSTER.length)];
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 900 + s);
    enableDraftMode(g, 901 + s, { mode: "buff" });
    for (let ply = 0; ply < 120 && !g.result; ply++) {
      for (const c of ["w", "b"] as Color[]) {
        const offer = g.buffs?.players[c].offer;
        if (!offer) continue;
        const d = houseDraftChoice(g, c, persona, rng);
        draftsChecked++;
        if (!d || (d.action === "pick" && (d.index < 0 || d.index >= offer.cards.length)) || (d.action === "bank" && offer.banked)) {
          draftBad++;
        }
        const base = aiDraftChoice(g, c);
        if (base?.action === "pick") pickDraftCard(g, c, base.index);
        else bankDraft(g, c);
      }
      if (g.result) break;
      const turn = g.board.turn;
      const engine = aiChooseBuffActivation(g, turn);
      const hung = hanging(g, turn);
      if (engine && hung.length) {
        const inst = g.buffs!.players[turn].buffs[engine.buffIndex];
        const def = BUFF_BY_ID[inst.id];
        if (def && !def.freeAction) {
          const trial = deserializeGame(serializeGame(g))!;
          if (activateBuff(trial, turn, engine.buffIndex, engine.picks) && !trial.result) {
            const after = new Set(hanging(trial, turn));
            if (hung.some((sq) => after.has(sq))) {
              badFound++;
              const pick = houseChooseActivation(g, turn, persona, always);
              if (pick && pick.buffIndex === engine.buffIndex) wrapperFiredBad++;
            }
          }
        }
      }
      // Advance with a cheap search so positions stay varied.
      const m = pickHouseMove(g, 1200, rng, undefined, 10);
      if (!m) break;
      const lm = legalMoves(g).find((x) => moveToUCI(x) === moveToUCI(m));
      if (!lm) break;
      g = playMove(g, lm);
    }
  }
  console.log(
    `8. cards: ${badFound} positions where the engine's chooser would waste a turn with a piece hanging; houseChooseActivation fired that card ${wrapperFiredBad} times. drafts: ${draftsChecked} checked, ${draftBad} invalid`,
  );
  check(badFound > 0, "harvest found positions to test the activation floor on");
  check(wrapperFiredBad === 0, "houseChooseActivation never wastes the turn while a piece hangs");
  check(draftsChecked > 0 && draftBad === 0, "draft choices are valid and never re-bank a banked offer");
}

if (failures) {
  console.error(`\n${failures} house-policy assertion(s) failed`);
  process.exit(1);
}
console.log("\nhouse policy helpers: OK");
