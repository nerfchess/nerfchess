// Client/server engine parity fuzz (brief 14, proposal P-fuzz).
//
// Plays random legal games with random draft picks, banks, rerolls and card
// activations, and after every action asserts that the three ways the site
// arrives at a position agree exactly:
//
//   live:        the game object mutated in place, one action at a time. This
//                is what a player's browser (OnlineMatch) and the DO's commit
//                path hold between frames.
//   replay:      a full rebuild from the stored record (moves + draft actions)
//                through replayToPosition, the path the DO's gameFromMatch, the
//                engine service, history review and every reconnect take.
//   checkpoint:  serializeGame at an earlier point, deserializeGame, then the
//                delta replayed forward (the DO's gameFromCheckpoint).
//
// "Agree" means the same serializeGame JSON (board, captures, result, rng
// states, full draft state) and the same desyncFingerprint (position, legal
// move signature, active rules). Any difference is a divergence: the fuzz
// prints the seed, the ply, the action that caused it and a minimal record.
//
//   scripts/polish/heavy.sh nice ./node_modules/.bin/tsx scripts/polish/parity-fuzz.ts \
//     [--games 200] [--seed 1] [--plies 160] [--json out.json] [--repro <seed>] [--seeds a,b,c]
//
// Exit code 1 on any divergence or engine exception.

import { writeFileSync } from "node:fs";
import type { BuffPick, DraftMode } from "../../src/engine/buff";
import { BUFF_BY_ID } from "../../src/engine/buffs/library";
import { desyncFingerprint } from "../../src/engine/desync";
import {
  NerfGame,
  UNRESTRICTED_NERF,
  activateBuff,
  bankDraft,
  buffNextTarget,
  deserializeGame,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  rerollDraft,
  serializeGame,
} from "../../src/engine/game";
import { moveToUCI } from "../../src/engine/board";
import { PLAYABLE_NERFS } from "../../src/engine/nerfs/library";
import { moveByUci, replayToPosition, type EngineDraftAction, type EngineMatch } from "../../src/engine/replay";
import { RNG } from "../../src/engine/rng";
import type { Color } from "../../src/engine/types";

// ---------------------------------------------------------------- args

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const GAMES = Number(arg("games", "200"));
const BASE_SEED = Number(arg("seed", "1"));
const MAX_PLIES = Number(arg("plies", "160"));
const JSON_OUT = arg("json", "");
const REPRO = args.includes("--repro") ? Number(arg("repro", "0")) : null;
// --seeds 2,20,30: an explicit list (the regression set of seeds that once
// diverged; see docs/polish-pass/slices/H.md).
const SEED_LIST = args.includes("--seeds") ? arg("seeds", "").split(",").filter(Boolean).map(Number) : null;

// ---------------------------------------------------------------- rng

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- compare

// Canonical JSON: object keys sorted, so two states that differ only in key
// insertion order (a JSON round trip reorders flags) compare equal. Array
// order is kept: it is meaningful (hand indices, effect order).
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonical(v);
    }
    return out;
  }
  return value;
}

function stateJson(game: NerfGame): string {
  const snap = serializeGame(game) as unknown as Record<string, unknown>;
  // startedAt is wall-clock (Date.now() in newGame), not game state.
  delete snap.startedAt;
  return JSON.stringify(canonical(snap));
}

function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 80);
  return `at char ${i}:\n      A ...${a.slice(from, i + 80)}\n      B ...${b.slice(from, i + 80)}`;
}

// ---------------------------------------------------------------- one game

type Action =
  | { kind: "move"; uci: string }
  | { kind: "draft"; action: EngineDraftAction };

type Divergence = {
  seed: number;
  mode: DraftMode;
  ply: number;
  step: number;
  path: "replay" | "checkpoint" | "exception" | "replay-null" | "failed-activation-mutated";
  action: string;
  detail: string;
  record: EngineMatch;
};

// The checkpoint path: deserialize a snapshot taken after `ply` moves and
// `cursor` actions, then fold in the rest of the record (the DO's
// replayForward from a checkpoint).
function fromCheckpoint(snapJson: string, record: EngineMatch, ply: number, cursor: number): NerfGame | null {
  let game = deserializeGame(JSON.parse(snapJson));
  if (!game) return null;
  const actions = record.draftActions ?? [];
  let c = cursor;
  const applyUpTo = (p: number) => {
    while (c < actions.length && actions[c].ply <= p) {
      applyAction(game!, actions[c]);
      c++;
    }
  };
  for (let i = ply; i < record.moves.length; i++) {
    applyUpTo(i);
    const move = moveByUci(game, record.moves[i]);
    if (!move) return null;
    game = playMove(game, move);
  }
  applyUpTo(record.moves.length);
  return game;
}

function applyAction(game: NerfGame, a: EngineDraftAction): boolean {
  if (a.a === "pick") {
    pickDraftCard(game, a.color, a.index);
    return true;
  }
  if (a.a === "bank") {
    bankDraft(game, a.color);
    return true;
  }
  if (a.a === "reroll") return rerollDraft(game, a.color);
  if (a.a === "use") return activateBuff(game, a.color, a.buffIndex, a.picks);
  return false;
}

// Random target collection that walks buffNextTarget exactly the way the DO's
// dtUse validation does, choosing uniformly at each step and sometimes
// stopping early on a finishable step.
function randomPicks(game: NerfGame, color: Color, buffIndex: number, rand: () => number): BuffPick[] | null {
  const picks: BuffPick[] = [];
  for (let step = 0; step < 16; step++) {
    const target = buffNextTarget(game, color, buffIndex, picks);
    if (!target) return picks.length || step > 0 ? picks : null;
    if (target.kind === "square") {
      if (target.finishable && picks.length > 0 && rand() < 0.3) return picks;
      if (!target.squares.length) return picks.length ? picks : null;
      picks.push({ square: target.squares[Math.floor(rand() * target.squares.length)] });
    } else {
      if (!target.options.length) return picks.length ? picks : null;
      picks.push({ buffIndex: target.options[Math.floor(rand() * target.options.length)].index });
    }
  }
  return picks;
}

function describe(a: Action): string {
  if (a.kind === "move") return `move ${a.uci}`;
  const d = a.action;
  if (d.a === "use") return `use ${d.color} #${d.buffIndex} picks=${JSON.stringify(d.picks)}`;
  if (d.a === "pick") return `pick ${d.color} #${d.index}`;
  return `${d.a} ${d.color}`;
}

function playOne(seed: number): { divergences: Divergence[]; plies: number; actions: number; uses: number; cards: Set<string> } {
  const rand = mulberry32(seed);
  const mode: DraftMode = rand() < 0.5 ? "buff" : "nerf";
  let whiteNerfId = "none";
  let blackNerfId = "none";
  if (mode === "nerf") {
    whiteNerfId = PLAYABLE_NERFS[Math.floor(rand() * PLAYABLE_NERFS.length)].id;
    blackNerfId = PLAYABLE_NERFS[Math.floor(rand() * PLAYABLE_NERFS.length)].id;
  }
  const nerfById = (id: string) => (mode === "buff" ? UNRESTRICTED_NERF : PLAYABLE_NERFS.find((n) => n.id === id)!);
  const draftSeed = Math.floor(rand() * 2 ** 31);
  const stacked = rand() < 0.15;
  const record: EngineMatch = {
    setup: { whiteNerfId, blackNerfId, seed },
    mode,
    draft: true,
    draftSeed,
    stacked,
    moves: [],
    draftActions: [],
  };
  let live = newGame(nerfById(whiteNerfId), nerfById(blackNerfId), seed);
  enableDraftMode(live, draftSeed, { mode, ...(stacked ? { stackFor: "b" as Color, stackBoost: 2 } : {}) });

  const divergences: Divergence[] = [];
  const cards = new Set<string>();
  let uses = 0;
  let step = 0;
  // Rolling checkpoint, refreshed every few events like maybeCheckpoint.
  let ckpt: { json: string; ply: number; cursor: number } | null = null;

  const check = (action: Action) => {
    step++;
    const liveJson = stateJson(live);
    const liveFp = desyncFingerprint(live).hash;
    let replayed: NerfGame | null = null;
    try {
      replayed = replayToPosition(record);
    } catch (err) {
      divergences.push({ seed, mode, ply: record.moves.length, step, path: "exception", action: describe(action), detail: `replay threw: ${(err as Error).stack ?? err}`, record: structuredClone(record) });
      return false;
    }
    if (!replayed) {
      divergences.push({ seed, mode, ply: record.moves.length, step, path: "replay-null", action: describe(action), detail: "replayToPosition returned null (a recorded move did not resolve)", record: structuredClone(record) });
      return false;
    }
    const replayJson = stateJson(replayed);
    if (replayJson !== liveJson || desyncFingerprint(replayed).hash !== liveFp) {
      divergences.push({ seed, mode, ply: record.moves.length, step, path: "replay", action: describe(action), detail: firstDiff(liveJson, replayJson), record: structuredClone(record) });
      return false;
    }
    if (ckpt) {
      const fromCk = fromCheckpoint(ckpt.json, record, ckpt.ply, ckpt.cursor);
      const ckJson = fromCk ? stateJson(fromCk) : "null";
      if (ckJson !== liveJson) {
        divergences.push({ seed, mode, ply: record.moves.length, step, path: "checkpoint", action: describe(action), detail: `checkpoint at ply ${ckpt.ply} cursor ${ckpt.cursor}: ${firstDiff(liveJson, ckJson)}`, record: structuredClone(record) });
        return false;
      }
    }
    if (step % 7 === 0) {
      ckpt = { json: JSON.stringify(serializeGame(live)), ply: record.moves.length, cursor: record.draftActions!.length };
    }
    return true;
  };

  const record_ = (a: EngineDraftAction) => record.draftActions!.push(a);

  while (!live.result && record.moves.length < MAX_PLIES) {
    const bs = live.buffs!;
    const turn = live.board.turn;
    let acted = false;
    // Pending offers resolve first (the DO holds moves behind them).
    for (const color of [turn, turn === "w" ? "b" : "w"] as Color[]) {
      const ps = bs.players[color];
      if (!ps.offer || bs.diff) continue;
      const r = rand();
      const ply = record.moves.length;
      let a: EngineDraftAction;
      if (r < 0.1 && ps.rerollsLeft > 0) a = { ply, color, a: "reroll" };
      else if (r < 0.22) a = { ply, color, a: "bank" };
      else a = { ply, color, a: "pick", index: Math.floor(rand() * ps.offer.cards.length) };
      try {
        const okApplied = applyAction(live, a);
        if (a.a === "reroll" && !okApplied) continue;
      } catch (err) {
        divergences.push({ seed, mode, ply, step, path: "exception", action: describe({ kind: "draft", action: a }), detail: `live apply threw: ${(err as Error).stack ?? err}`, record: structuredClone(record) });
        return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
      }
      record_(a);
      acted = true;
      if (!check({ kind: "draft", action: a })) return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
      break;
    }
    if (acted) continue;

    // Sometimes fire a held activated card for the side to move.
    if (!bs.diff && rand() < 0.35) {
      const held = bs.players[turn].buffs
        .map((inst, i) => ({ inst, i, def: BUFF_BY_ID[inst.id] }))
        .filter(({ inst, def }) => def?.kind === "activated" && def.implemented && !inst.spent && !inst.nullified && !inst.usedActivation);
      if (held.length) {
        const pick = held[Math.floor(rand() * held.length)];
        let picks: BuffPick[] | null = null;
        try {
          picks = def_targets(pick.def) ? randomPicks(live, turn, pick.i, rand) : [];
        } catch (err) {
          divergences.push({ seed, mode, ply: record.moves.length, step, path: "exception", action: `targets ${pick.inst.id}`, detail: `buffNextTarget threw: ${(err as Error).stack ?? err}`, record: structuredClone(record) });
          return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
        }
        if (picks) {
          const a: EngineDraftAction = { ply: record.moves.length, color: turn, a: "use", buffIndex: pick.i, picks };
          const before = stateJson(live);
          let fired = false;
          try {
            fired = activateBuff(live, turn, pick.i, picks);
          } catch (err) {
            divergences.push({ seed, mode, ply: record.moves.length, step, path: "exception", action: describe({ kind: "draft", action: a }) + ` (${pick.inst.id})`, detail: `activateBuff threw: ${(err as Error).stack ?? err}`, record: structuredClone(record) });
            return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
          }
          if (fired) {
            uses++;
            cards.add(pick.inst.id);
            record_(a);
            if (!check({ kind: "draft", action: a })) return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
            continue;
          }
          // A refused activation must leave the game exactly as it was: the
          // DO records nothing for it, so any mutation is state no replica
          // will ever reproduce.
          const after = stateJson(live);
          if (after !== before) {
            divergences.push({ seed, mode, ply: record.moves.length, step, path: "failed-activation-mutated", action: describe({ kind: "draft", action: a }) + ` (${pick.inst.id})`, detail: firstDiff(before, after), record: structuredClone(record) });
            return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
          }
        }
      }
    }

    const moves = legalMoves(live);
    if (!moves.length) break;
    const move = moves[Math.floor(rand() * moves.length)];
    const uci = moveToUCI(move);
    try {
      live = playMove(live, move);
    } catch (err) {
      divergences.push({ seed, mode, ply: record.moves.length, step, path: "exception", action: `move ${uci}`, detail: `playMove threw: ${(err as Error).stack ?? err}`, record: structuredClone(record) });
      break;
    }
    record.moves.push(uci);
    if (!check({ kind: "move", uci })) break;
  }
  return { divergences, plies: record.moves.length, actions: record.draftActions!.length, uses, cards };
}

function def_targets(def: { targets?: unknown }): boolean {
  return typeof def.targets === "function";
}

// ---------------------------------------------------------------- RNG self-check

// The engine RNG must keep a uint32 state (so a snapshot restores the exact
// state) and must draw exactly what the original unbounded-state Mulberry32
// drew (so every recorded game still replays identically).
function rngSelfCheck(): string[] {
  const problems: string[] = [];
  class Original {
    s: number;
    constructor(seed: number) {
      this.s = seed >>> 0 || 1;
    }
    next() {
      let t = (this.s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }
  for (const seed of [1, 2, 12345, 2 ** 31 - 1, 4294967295]) {
    const a = new RNG(seed);
    const b = new Original(seed);
    for (let i = 0; i < 50_000; i++) {
      if (a.next() !== b.next()) {
        problems.push(`seed ${seed}: draw ${i} differs from the original Mulberry32`);
        break;
      }
    }
    const state = a.getState();
    if (!(state >= 0 && state < 2 ** 32)) problems.push(`seed ${seed}: getState() ${state} is not a uint32`);
    const restored = RNG.fromState(state);
    if (restored.next() !== a.next()) problems.push(`seed ${seed}: fromState(getState()) draws differently`);
  }
  return problems;
}

// ---------------------------------------------------------------- main

const t0 = Date.now();
const rngProblems = rngSelfCheck();
for (const p of rngProblems) console.log(`RNG ${p}`);
const all: Divergence[] = [];
let plies = 0;
let actions = 0;
let uses = 0;
const cardsFired = new Set<string>();
const seeds = REPRO !== null ? [REPRO] : SEED_LIST ?? Array.from({ length: GAMES }, (_, i) => BASE_SEED + i);
for (const seed of seeds) {
  const r = playOne(seed);
  plies += r.plies;
  actions += r.actions;
  uses += r.uses;
  for (const c of r.cards) cardsFired.add(c);
  for (const d of r.divergences) {
    all.push(d);
    console.log(`DIVERGENCE seed=${d.seed} mode=${d.mode} ply=${d.ply} step=${d.step} path=${d.path}\n    after: ${d.action}\n    ${d.detail.split("\n").join("\n    ")}`);
  }
}
const summary = {
  games: seeds.length,
  baseSeed: BASE_SEED,
  maxPlies: MAX_PLIES,
  plies,
  draftActions: actions,
  activations: uses,
  distinctCardsFired: cardsFired.size,
  rngProblems: rngProblems.length,
  divergences: all.length,
  byPath: all.reduce<Record<string, number>>((acc, d) => ((acc[d.path] = (acc[d.path] ?? 0) + 1), acc), {}),
  ms: Date.now() - t0,
};
console.log(JSON.stringify(summary, null, 2));
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ summary, divergences: all.map((d) => ({ ...d, detail: d.detail.slice(0, 2000) })) }, null, 2) + "\n",
  );
}
process.exit(all.length || rngProblems.length ? 1 : 0);
