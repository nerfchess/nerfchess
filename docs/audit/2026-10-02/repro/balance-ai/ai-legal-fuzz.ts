// Scratch fuzz (audit group balance-ai): AI vs AI with random cards, asserting
// every AI move is in legalMoves(game), the AI's pick never mutates the game,
// AI-chosen activations are accepted, and playMove of a legal move changes the
// board. Read-only on the repo: imports by absolute path, writes nothing.
//
//   ./node_modules/.bin/tsx ai-legal-fuzz.ts --games 40 --plies 80 --seed 1 [--secs 200]

import { ALL_BUFFS, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
import {
  acquireBuff,
  activateBuff,
  aiActivateBuffs,
  aiChooseBuffActivation,
  aiDraftChoice,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  serializeGame,
  UNRESTRICTED_NERF,
  type NerfGame,
} from "../../../../../src/engine/game";
import { pickAIMove, type AILevel } from "../../../../../src/engine/ai";
import {
  HOUSE_ROSTER,
  HOUSE_SKILLS,
  houseChooseActivation,
  houseDraftChoice,
  houseSnapMove,
  pickHouseMove,
  type HouseSkill,
} from "../../../../../src/lib/server/bots";
import { moveToUCI } from "../../../../../src/engine/board";
import type { Color, Move } from "../../../../../src/engine/types";

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const GAMES = Number(arg("games", "40"));
const PLIES = Number(arg("plies", "80"));
const SEED0 = Number(arg("seed", "1"));
const SECS = Number(arg("secs", "210"));
const ONLY = arg("only", "");

// Freeze the clock like the win-rate harness: searches are bounded by depth and
// node cap, so a seed reproduces.
const FROZEN = Date.now();
const realNow = Date.now.bind(Date);
Date.now = () => FROZEN;
const t0 = realNow();

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cards = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id));
const nerfs = PLAYABLE_NERFS.filter((n) => !isRetired(n.id));

const sameMove = (a: Move, b: Move) =>
  a.from === b.from &&
  a.to === b.to &&
  (a.promotion ?? null) === (b.promotion ?? null) &&
  (a.via ?? null) === (b.via ?? null) &&
  (a.drop ?? null) === (b.drop ?? null) &&
  (a.castle ?? null) === (b.castle ?? null);

type Finding = { seed: number; ply: number; kind: string; detail: string };
const findings: Finding[] = [];
const stats = {
  games: 0,
  plies: 0,
  activations: 0,
  activationRejected: 0,
  activationThrew: 0,
  pickThrew: 0,
  illegal: 0,
  mutated: 0,
  noop: 0,
  nullWithLegal: 0,
  results: {} as Record<string, number>,
  pickers: {} as Record<string, number>,
  cardsHeld: new Set<string>(),
  nerfsUsed: new Set<string>(),
};

function fingerprint(g: NerfGame): string {
  try {
    const s = serializeGame(g) as unknown as Record<string, unknown>;
    // fx log / lastNerfFilter are narration side effects of legalMoves, not state.
    return JSON.stringify(s, (k, v) => (k === "fx" || k === "fxLog" || k === "lastNerfFilter" ? undefined : v));
  } catch (e) {
    return `ERR ${String(e)}`;
  }
}

function playOne(seed: number) {
  const rnd = mulberry32(seed * 7919 + 13);
  const ri = (max: number) => Math.floor(rnd() * max);
  Math.random = rnd; // easy level and pickNerfPair defaults read Math.random
  const mode = ri(3) === 0 ? "buff" : "nerf";
  const wn = mode === "buff" && ri(2) === 0 ? UNRESTRICTED_NERF : nerfs[ri(nerfs.length)];
  const bn = mode === "buff" && ri(2) === 0 ? UNRESTRICTED_NERF : nerfs[ri(nerfs.length)];
  stats.nerfsUsed.add(wn.id);
  stats.nerfsUsed.add(bn.id);
  const game = newGame(wn, bn, seed);
  enableDraftMode(game, seed, { mode: mode as "nerf" | "buff" });
  for (const c of ["w", "b"] as Color[]) {
    const n = 1 + ri(3);
    for (let i = 0; i < n; i++) {
      const pool = ONLY ? cards.filter((b) => b.id.includes(ONLY)) : cards;
      const b = pool[ri(pool.length)];
      try {
        acquireBuff(game, c, b.id, b.tier);
        stats.cardsHeld.add(b.id);
      } catch (e) {
        findings.push({ seed, ply: -1, kind: "acquire-threw", detail: `${b.id}: ${String(e).slice(0, 160)}` });
      }
    }
  }
  // Picker per seat: 0 pickAIMove easy/medium/hard, 1 pickHouseMove at a random tier w/ persona
  const seat = (c: Color) => {
    const k = ri(4);
    if (k === 0) return { kind: "ai", level: (["easy", "medium", "hard"] as AILevel[])[ri(3)], budget: 5 + ri(30) };
    const skill = HOUSE_SKILLS[ri(HOUSE_SKILLS.length)] as HouseSkill;
    const persona = HOUSE_ROSTER.find((p) => p.skill === skill) ?? HOUSE_ROSTER[ri(HOUSE_ROSTER.length)];
    return { kind: "house", skill, persona, budget: 10 + ri(30) };
  };
  const seats = { w: seat("w"), b: seat("b") };

  let ply = 0;
  for (; ply < PLIES && !game.result; ply++) {
    for (const c of ["w", "b"] as Color[]) {
      if (!game.buffs?.players[c].offer) continue;
      try {
        const s = seats[c];
        const choice = s.kind === "house" ? houseDraftChoice(game, c, (s as any).persona, ri) : aiDraftChoice(game, c);
        if (!choice) {
          findings.push({ seed, ply, kind: "offer-no-choice", detail: c });
          continue;
        }
        if (choice.action === "bank") bankDraft(game, c);
        else pickDraftCard(game, c, choice.index);
      } catch (e) {
        findings.push({ seed, ply, kind: "draft-threw", detail: String(e).slice(0, 200) });
      }
    }
    if (game.result) break;
    const me = game.board.turn;
    const s = seats[me];
    // Activation, 50% of turns, via the engine policy or the house policy.
    if (ri(2) === 0) {
      try {
        if (s.kind === "house") {
          const act = houseChooseActivation(game, me, (s as any).persona, ri);
          if (act) {
            stats.activations++;
            const ok = activateBuff(game, me, act.buffIndex, act.picks);
            if (!ok) {
              stats.activationRejected++;
              const id = game.buffs?.players[me].buffs[act.buffIndex]?.id;
              findings.push({ seed, ply, kind: "house-activation-rejected", detail: `${id}` });
            }
          }
        } else {
          const choice = aiChooseBuffActivation(game, me);
          if (choice) {
            stats.activations++;
            const id = game.buffs?.players[me].buffs[choice.buffIndex]?.id;
            const ok = activateBuff(game, me, choice.buffIndex, choice.picks);
            if (!ok) {
              stats.activationRejected++;
              findings.push({ seed, ply, kind: "ai-activation-rejected", detail: `${id}` });
            }
          }
        }
      } catch (e) {
        stats.activationThrew++;
        findings.push({ seed, ply, kind: "activation-threw", detail: String(e).slice(0, 200) });
      }
      if (game.result) break;
      if (game.board.turn !== me) continue;
    }

    const legal = legalMoves(game);
    const before = fingerprint(game);
    let move: Move | null = null;
    let picker = "";
    try {
      if (s.kind === "ai") {
        picker = `ai-${(s as any).level}`;
        move = pickAIMove(game, (s as any).level, (s as any).budget);
      } else {
        const skill = (s as any).skill as HouseSkill;
        // Occasionally exercise the snap path too.
        if (ri(6) === 0) {
          picker = "house-snap";
          move = houseSnapMove(game, me);
        }
        if (!move) {
          picker = `house-${skill}`;
          move = pickHouseMove(game, skill, ri, ri(3) === 0 ? 5_000 + ri(60_000) : undefined, (s as any).budget, undefined, (s as any).persona, { varietySeed: seed });
        }
      }
    } catch (e) {
      stats.pickThrew++;
      findings.push({ seed, ply, kind: "pick-threw", detail: `${picker}: ${String(e).slice(0, 200)}` });
      // keep going with a legal move so the rest of the game is still fuzzed
      move = legal[ri(Math.max(1, legal.length))] ?? null;
    }
    stats.pickers[picker] = (stats.pickers[picker] ?? 0) + 1;
    const after = fingerprint(game);
    if (before !== after) {
      stats.mutated++;
      if (stats.mutated <= 5) {
        // find first differing char for a hint
        let i = 0;
        while (i < before.length && before[i] === after[i]) i++;
        findings.push({ seed, ply, kind: "pick-mutated-game", detail: `${picker} at char ${i}: ...${before.slice(Math.max(0, i - 60), i + 60)} | ${after.slice(Math.max(0, i - 60), i + 60)}` });
      }
    }
    if (!move) {
      if (legal.length) {
        stats.nullWithLegal++;
        findings.push({ seed, ply, kind: "null-with-legal", detail: `${picker} legal=${legal.length}` });
      }
      break;
    }
    const legal2 = legalMoves(game);
    const found = legal2.find((m) => sameMove(m, move!));
    if (!found) {
      stats.illegal++;
      findings.push({
        seed,
        ply,
        kind: "ILLEGAL-MOVE",
        detail: `${picker} played ${moveToUCI(move)}${move.via ? ` via ${move.via}` : ""} nerf=${(me === "w" ? game.white : game.black).nerf.id} buffs=${game.buffs?.players[me].buffs.map((b) => b.id).join(",")}`,
      });
      break;
    }
    const boardBefore = game.board;
    playMove(game, move);
    stats.plies++;
    if (game.board === boardBefore && !game.result) {
      stats.noop++;
      findings.push({ seed, ply, kind: "legal-move-noop", detail: `${picker} ${moveToUCI(move)}` });
      break;
    }
  }
  stats.games++;
  const r = game.result ? `${game.result.winner}:${game.result.reason}` : "unfinished";
  const key = game.result ? game.result.winner : "unfinished";
  stats.results[key] = (stats.results[key] ?? 0) + 1;
  return r;
}

let lastSeed = SEED0;
for (let g = 0; g < GAMES; g++) {
  if ((realNow() - t0) / 1000 > SECS) {
    console.log(`time box hit after ${g} games`);
    break;
  }
  const seed = SEED0 + g;
  lastSeed = seed;
  try {
    playOne(seed);
  } catch (e) {
    findings.push({ seed, ply: -2, kind: "game-threw", detail: String((e as Error).stack ?? e).slice(0, 400) });
  }
}
const secs = ((realNow() - t0) / 1000).toFixed(1);
console.log(
  JSON.stringify(
    {
      ...stats,
      cardsHeld: stats.cardsHeld.size,
      nerfsUsed: stats.nerfsUsed.size,
      seeds: `${SEED0}..${lastSeed}`,
      secs,
    },
    null,
    1,
  ),
);
const byKind: Record<string, number> = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
console.log("findings by kind", byKind);
for (const f of findings.slice(0, 40)) console.log(JSON.stringify(f));
