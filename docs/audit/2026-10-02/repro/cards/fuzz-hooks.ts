// Seeded random-game fuzz over the engine API with random nerfs + drafted/granted
// cards. Asserts no exception and board/move invariants after every action.
// Usage: tsx fuzz.ts <seconds> <startSeed> [--plies N] [--grant P]
import { RNG } from "../../../../../src/engine/rng";
import {
  NerfGame, UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove,
  pickDraftCard, bankDraft, rerollDraft, buffNextTarget, activateBuff, acquireBuff,
  serializeGame, deserializeGame,
} from "../../../../../src/engine/game";
import { ALL_BUFFS, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { NERF_REVEAL } from "../../../../../src/engine/draft";
import { isBoon, Buff } from "../../../../../src/engine/buff";
import { Color, Move, RANK } from "../../../../../src/engine/types";
import { COMBO_TAGS } from "../../../../../src/engine/comboTags";
import fs from "node:fs";

const args = process.argv.slice(2);
const SECONDS = Number(args[0] ?? 150);
const START = Number(args[1] ?? 1);
const PLIES = Number((args.find((a) => a.startsWith("--plies=")) ?? "--plies=140").split("=")[1]);
const GRANT_P = Number((args.find((a) => a.startsWith("--grant=")) ?? "--grant=0.05").split("=")[1]);
const ONLY = (args.find((a) => a.startsWith("--seed=")) ?? "").split("=")[1];

const LIVE_NERFS = PLAYABLE_NERFS.filter((n) => !isRetired(n.id));
const LIVE_BUFFS = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && !b.opener);
const inMode = (mode: string | undefined, b: Buff) =>
  mode === "buff" ? b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id)
  : mode === "nerf" ? isBoon(b) || b.category === "hex" || b.category === "item" : true;

type Finding = { seed: number; ply: number; action: string; kind: string; detail: string; wN: string; bN: string; held: string[] };
const findings: Finding[] = [];
const kindsSeen = new Map<string, number>();
const cardsSeen = new Set<string>();
let bothFired = 0, anyFired = 0; const bothPairs: Record<string, number> = {};
let games = 0, totalPlies = 0, totalActs = 0, decided: Record<string, number> = {};

function heldIds(g: NerfGame): string[] {
  const bs = g.buffs; if (!bs) return [];
  return (["w", "b"] as Color[]).flatMap((c) => bs.players[c].buffs.map((b) => `${c}:${b.id}${b.spent ? "(spent)" : ""}${b.nullified ? "(null)" : ""}`));
}

function invariants(g: NerfGame, ctx: { maxKings: Record<Color, number> }): string[] {
  const errs: string[] = [];
  const b = g.board;
  if (!Array.isArray(b.pieces) || b.pieces.length !== 64) errs.push(`board has ${b.pieces?.length} squares`);
  const kings: Record<Color, number> = { w: 0, b: 0 };
  for (let sq = 0; sq < 64; sq++) {
    const p = b.pieces[sq];
    if (!p) continue;
    if (!"pnbrqk".includes(p.type) || (p.color !== "w" && p.color !== "b")) errs.push(`bad piece at ${sq}: ${JSON.stringify(p)}`);
    if (p.type === "k") kings[p.color]++;
    if (p.type === "p" && (RANK(sq) === 0 || RANK(sq) === 7)) errs.push(`PAWN_BACK_RANK ${p.color} pawn on ${sq}`);
  }
  for (const c of ["w", "b"] as Color[]) {
    if (kings[c] > ctx.maxKings[c]) errs.push(`EXTRA_KING ${c} has ${kings[c]} kings (allowed ${ctx.maxKings[c]})`);
    if (kings[c] === 0 && !g.result) errs.push(`NO_KING_NO_RESULT ${c} has no king but game continues`);
  }
  if (b.turn !== "w" && b.turn !== "b") errs.push(`bad turn ${b.turn}`);
  const bs = g.buffs;
  if (bs) {
    for (const e of bs.effects) {
      const sqs: number[] = [];
      if ("sq" in e) sqs.push((e as any).sq);
      if ("squares" in e && Array.isArray((e as any).squares)) sqs.push(...(e as any).squares);
      for (const s of sqs) if (!(Number.isInteger(s) && s >= 0 && s < 64)) errs.push(`EFFECT_OFFBOARD ${e.kind} sq ${s}`);
      if ((e.kind === "freeze" || e.kind === "walnut") && !g.result) {
        const p = b.pieces[e.sq];
        if (!p || p.color !== e.owner) errs.push(`ORPHAN_EFFECT ${e.kind} on ${e.sq} (piece ${JSON.stringify(p)})`);
      }
      if (e.turns != null && (e.turns as number) < 0) errs.push(`NEG_TIMER ${e.kind} turns=${e.turns}`);
    }
    for (const c of ["w", "b"] as Color[]) {
      const inv = bs.players[c].inventory ?? {};
      for (const [k, v] of Object.entries(inv)) if ((v as number) < 0 || k === "k") errs.push(`BAD_POCKET ${c} ${k}=${v}`);
    }
  }
  if (!g.result) {
    let lm: Move[] = [];
    try { lm = legalMoves(g); } catch (e: any) { errs.push(`THROW legalMoves: ${e?.stack?.split("\n").slice(0, 3).join(" | ")}`); return errs; }
    if (lm.length === 0) errs.push(`NO_MOVES_NO_RESULT side ${b.turn} has 0 legal moves and no result`);
    for (const m of lm) {
      if (!(m.to >= 0 && m.to < 64 && m.from >= 0 && m.from < 64)) { errs.push(`MOVE_OFFBOARD ${JSON.stringify(m)}`); continue; }
      if (m.color !== b.turn) errs.push(`MOVE_WRONG_COLOR ${JSON.stringify(m)} turn ${b.turn}`);
      if (m.drop) {
        if (b.pieces[m.to]) errs.push(`DROP_OCCUPIED ${JSON.stringify(m)}`);
        if (m.drop === "p" && (RANK(m.to) === 0 || RANK(m.to) === 7)) errs.push(`DROP_PAWN_BACKRANK ${JSON.stringify(m)}`);
        continue;
      }
      const p = b.pieces[m.from];
      if (!p) { errs.push(`MOVE_FROM_EMPTY ${JSON.stringify(m)}`); continue; }
      if (p.color !== b.turn) errs.push(`MOVE_ENEMY_PIECE ${JSON.stringify(m)}`);
      if (p.type !== m.piece) errs.push(`MOVE_PIECE_MISLABEL actual ${p.type} vs move.piece ${m.piece} via ${m.via ?? "-"} ${m.from}->${m.to}`);
      const capSq = m.capturedSquare ?? m.to;
      const target = b.pieces[capSq];
      const atTo = b.pieces[m.to];
      if (atTo && atTo.color === p.color && !m.castle) errs.push(`OWN_CAPTURE via ${m.via ?? "-"} ${JSON.stringify(m)}`);
      if (m.captured && (!target || target.color === p.color)) errs.push(`PHANTOM_CAPTURE via ${m.via ?? "-"} ${JSON.stringify(m)} target ${JSON.stringify(target)}`);
      if (m.captured && target && target.type !== m.captured) errs.push(`CAPTURE_MISLABEL via ${m.via ?? "-"} labeled ${m.captured} actual ${target.type}`);
      if (!m.captured && atTo && atTo.color !== p.color) errs.push(`UNLABELED_CAPTURE via ${m.via ?? "-"} ${m.from}->${m.to} lands on ${atTo.color}${atTo.type}`);
      if (p.type === "p" && !m.promotion && (RANK(m.to) === 0 || RANK(m.to) === 7)) errs.push(`PAWN_NO_PROMO via ${m.via ?? "-"} ${m.from}->${m.to}`);
    }
  }
  return errs;
}

function randomPicks(g: NerfGame, c: Color, idx: number, rng: RNG): any[] | null {
  const picks: any[] = [];
  for (let step = 0; step < 20; step++) {
    const t = buffNextTarget(g, c, idx, picks);
    if (!t) return picks;
    if (t.kind === "square") {
      if (t.squares.length === 0) return t.finishable && picks.length > 0 ? picks : null;
      if (t.finishable && picks.length > 0 && rng.next() < 0.25) return picks;
      picks.push({ square: rng.pick(t.squares) });
    } else {
      if (t.options.length === 0) return picks.length > 0 ? picks : null;
      picks.push({ buffIndex: rng.pick(t.options).index });
    }
  }
  return picks;
}

type Act = { t: "pick"; c: Color; i: number } | { t: "bank"; c: Color } | { t: "reroll"; c: Color } | { t: "grant"; c: Color; id: string; tier: number } | { t: "use"; c: Color; idx: number; picks: any[] } | { t: "move"; m: Move };

function setup(seed: number) {
  const rng = new RNG(seed);
  const mode = rng.pick(["nerf", "buff", "nerf", "buff", undefined] as const);
  const wN = mode === "buff" ? UNRESTRICTED_NERF : rng.pick(LIVE_NERFS);
  const bN = mode === "buff" ? UNRESTRICTED_NERF : rng.pick(LIVE_NERFS);
  const g = newGame(wN, bN, seed);
  const cadence = rng.pick([2, 3, 5]);
  const stack = rng.next() < 0.3;
  enableDraftMode(g, (seed * 7919) >>> 0, { mode, cadence, ...(stack ? { stackFor: rng.pick(["w", "b"] as Color[]), stackBoost: 1 + rng.int(4) } : {}) });
  return { rng, g, mode, wN: wN.id, bN: bN.id };
}

function applyAct(g: NerfGame, a: Act): NerfGame {
  switch (a.t) {
    case "pick": pickDraftCard(g, a.c, a.i); return g;
    case "bank": bankDraft(g, a.c); return g;
    case "reroll": rerollDraft(g, a.c); return g;
    case "grant": acquireBuff(g, a.c, a.id, a.tier as any); return g;
    case "use": activateBuff(g, a.c, a.idx, a.picks); return g;
    case "move": {
      const lm = legalMoves(g);
      const m = lm.find((x) => x.from === a.m.from && x.to === a.m.to && (x.promotion ?? null) === (a.m.promotion ?? null) && (x.drop ?? null) === (a.m.drop ?? null) && (x.via ?? null) === (a.m.via ?? null) && (x.castle ?? null) === (a.m.castle ?? null));
      if (!m) throw new Error(`REPLAY_DESYNC move ${JSON.stringify(a.m)} not legal on replay`);
      return playMove(g, m);
    }
  }
}

function sig(g: NerfGame): string {
  return JSON.stringify({ p: g.board.pieces, t: g.board.turn, r: g.result, e: g.buffs?.effects, h: g.board.history.length, held: heldIds(g) });
}

function runGame(seed: number, doReplay: boolean) {
  const { rng, g: g0, mode, wN, bN } = setup(seed);
  let g = g0;
  const acts: Act[] = [];
  const maxKings = { w: 1, b: 1 } as Record<Color, number>;
  const record = (kind: string, detail: string, action: string, ply: number) => {
    kindsSeen.set(kind, (kindsSeen.get(kind) ?? 0) + 1);
    if (findings.filter((f) => f.kind === kind).length < 25)
      findings.push({ seed, ply, action, kind, detail, wN, bN, held: heldIds(g) });
  };
  const check = (action: string, ply: number) => {
    // a second king is documented (second_king): allow per color while held
    for (const c of ["w", "b"] as Color[]) if (g.buffs?.players[c].buffs.some((x) => x.id === "second_king" || x.id === "bn4_kingswap" )) maxKings[c] = 2;
    for (const e of invariants(g, { maxKings })) { const kind = e.split(" ")[0]; record(kind, e, action, ply); return false; }
    return true;
  };
  let ply = 0;
  try {
    if (!check("setup", 0)) return;
    while (!g.result && ply < PLIES) {
      // 1. resolve offers
      for (const c of ["w", "b"] as Color[]) {
        const ps = g.buffs!.players[c];
        let guard = 0;
        while (ps.offer && guard++ < 4) {
          const r = rng.next();
          let a: Act;
          if (r < 0.07) a = { t: "bank", c };
          else if (r < 0.12 && ps.rerollsLeft > 0) a = { t: "reroll", c };
          else a = { t: "pick", c, i: rng.int(ps.offer.cards.length) };
          if (a.t === "pick") for (const card of ps.offer.cards) cardsSeen.add(card.id);
          acts.push(a); g = applyAct(g, a); totalActs++;
          if (!check(JSON.stringify(a), ply)) return;
          if (a.t === "bank" || g.result) break;
        }
        if (g.result) break;
      }
      if (g.result) break;
      // 2. occasional extra grant (simulates jackpot/take-both style grants)
      if (rng.next() < GRANT_P) {
        const c = rng.pick(["w", "b"] as Color[]);
        const held = new Set(g.buffs!.players[c].buffs.filter((x) => !x.spent && !x.nullified).map((x) => x.id));
        const tags = new Set(g.buffs!.players[c].buffs.filter((x) => !x.spent && !x.nullified).flatMap((x) => COMBO_TAGS[x.id] ?? []));
        const pool = LIVE_BUFFS.filter((b) => inMode(mode, b) && !held.has(b.id) && !(COMBO_TAGS[b.id] ?? []).some((t) => tags.has(t)));
        const def = rng.pick(pool);
        cardsSeen.add(def.id);
        const a: Act = { t: "grant", c, id: def.id, tier: def.tier };
        acts.push(a); g = applyAct(g, a); totalActs++;
        if (!check(JSON.stringify(a), ply)) return;
        if (g.result) break;
      }
      // 3. maybe activate a held card for the side to move
      const me = g.board.turn;
      if (rng.next() < 0.35) {
        const list = g.buffs!.players[me].buffs;
        const cands = list.map((x, i) => ({ x, i })).filter(({ x }) => !x.spent && !x.nullified && !x.usedActivation && BUFF_BY_ID[x.id]?.kind === "activated");
        if (cands.length) {
          const { i } = rng.pick(cands);
          const picks = randomPicks(g, me, i, rng);
          if (picks) {
            const a: Act = { t: "use", c: me, idx: i, picks };
            acts.push(a); g = applyAct(g, a); totalActs++;
            if (!check(JSON.stringify({ use: list[i]?.id, picks }), ply)) return;
            if (g.result) break;
            for (const c of ["w", "b"] as Color[]) if (g.buffs!.players[c].offer) continue;
          }
        }
      }
      if (g.result) break;
      if (g.buffs!.players.w.offer || g.buffs!.players.b.offer) continue;
      // 4. a move
      const lm = legalMoves(g);
      if (!lm.length) { record("NO_MOVES_NO_RESULT", "before move", "move", ply); return; }
      const caps = lm.filter((m) => m.captured);
      const m = caps.length && rng.next() < 0.35 ? rng.pick(caps) : rng.pick(lm);
      const a: Act = { t: "move", m };
      acts.push(a); g = applyAct(g, a); totalActs++; ply++; totalPlies++;
      { const lh = g.buffs?.lastHookMutations ?? []; if (lh.length) anyFired++; if (lh.some((x) => x.color === "w") && lh.some((x) => x.color === "b")) { bothFired++; const k = lh.map((x) => x.color + ":" + g.buffs!.players[x.color].buffs[x.index]?.id).sort().join(" + "); bothPairs[k] = (bothPairs[k] ?? 0) + 1; } }
      if (!check(`move ${m.from}->${m.to}${m.via ? " via " + m.via : ""}${m.drop ? " drop " + m.drop : ""}`, ply)) return;
    }
  } catch (e: any) {
    record("THROW", `${e?.message}\n${(e?.stack ?? "").split("\n").slice(1, 6).join("\n")}`, JSON.stringify(acts[acts.length - 1])?.slice(0, 300), ply);
    return;
  }
  const reason = g.result ? g.result.reason.replace(/^.*: /, "nerf-loss: ") : "unfinished";
  decided[reason] = (decided[reason] ?? 0) + 1;
  // Determinism replay + snapshot round trip
  if (doReplay) {
    try {
      const { g: r0 } = setup(seed);
      let r = r0;
      for (const a of acts) r = applyAct(r, a);
      if (sig(r) !== sig(g)) record("REPLAY_DIVERGE", `final state differs after replaying ${acts.length} actions`, "replay", ply);
      const snap = serializeGame(g); const back = deserializeGame(snap);
      if (!back) record("SNAPSHOT_NULL", "deserialize returned null", "snapshot", ply);
      else if (!g.result) {
        const a1 = legalMoves(g).map((m) => `${m.from}-${m.to}-${m.promotion ?? ""}-${m.via ?? ""}`).sort().join(",");
        const a2 = legalMoves(back).map((m) => `${m.from}-${m.to}-${m.promotion ?? ""}-${m.via ?? ""}`).sort().join(",");
        if (a1 !== a2) record("SNAPSHOT_MOVES_DIFFER", `legal moves differ after snapshot round trip`, "snapshot", ply);
      }
    } catch (e: any) {
      record(String(e?.message ?? "").startsWith("REPLAY_DESYNC") ? "REPLAY_DESYNC" : "THROW_REPLAY", `${e?.message}`.slice(0, 300), "replay", ply);
    }
  }
}

const t0 = Date.now();
let seed = START;
if (ONLY) { runGame(Number(ONLY), true); games = 1; }
else while (Date.now() - t0 < SECONDS * 1000) { runGame(seed, seed % 3 === 0); games++; seed++; }
const out = { bothFired, anyFired, bothPairsTop: Object.entries(bothPairs).sort((a, b) => b[1] - a[1]).slice(0, 12),
  games, seeds: `${START}..${seed - 1}`, secs: (Date.now() - t0) / 1000, totalPlies, totalActs,
  distinctCardsSeen: cardsSeen.size, results: decided, kinds: Object.fromEntries(kindsSeen), findings,
};
fs.writeFileSync(`${__dirname}/fuzz-out-${START}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, findings: findings.length }, null, 1));
