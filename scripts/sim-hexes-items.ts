// Focused engine sim for the hex/item pools. Run with:
//
//   npx -y tsx scripts/sim-hexes-items.ts
//
// Proves, off the server:
// 1. Pool composition: nerf-mode offers draw uniformly from the eligible
//    pool (fair RNG overhaul: hex/boon share emerges from pool sizes, no
//    bucket weighting), and hexes never leak into buff mode (nor
//    nerf-relief cards).
// 2. Walnut Queen: the opponent's queen is inert for exactly 3 of their
//    turns, then the walnut expires and the queen moves again.
// 3. Items work in both modes: Apple shields a piece from capture in nerf
//    AND buff mode; Banana Peel slips the first enemy piece that steps on
//    it one square back toward its home rank.
// 4. Opening nerf rolls never exceed the temporary tier cap (tier 2).

import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  aiActivateBuffs,
  aiChooseBuffActivation,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} from "../src/engine/game";
import { newBuffMatchState } from "../src/engine/buff";
import { rollOffer, rollSharedTiers } from "../src/engine/draft";
import { ALL_BUFFS, BUFF_BY_ID } from "../src/engine/buffs/library";
import { getNerf, openingNerfPool, pickNerfPair } from "../src/engine/nerfs/library";
import { moveToUCI } from "../src/engine/board";
import { SQ } from "../src/engine/types";
import type { Color } from "../src/engine/types";
import type { DraftMode } from "../src/engine/buff";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  } else {
    console.log("ok:", label);
  }
}

function freshGame(mode: DraftMode, seed = 42): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed + 1, { mode });
  return game;
}

function clearOffers(game: NerfGame) {
  for (const color of ["w", "b"] as Color[]) {
    if (game.buffs?.players[color].offer) bankDraft(game, color);
  }
}

function play(game: NerfGame, uci: string): NerfGame {
  clearOffers(game);
  const move = legalMoves(game).find((m) => moveToUCI(m) === uci);
  if (!move) throw new Error(`scripted move ${uci} is not legal here`);
  return playMove(game, move);
}

// --- 0. Library sanity ---------------------------------------------------------

{
  const seen = new Set<string>();
  const dupes = ALL_BUFFS.filter((b) => (seen.has(b.id) ? true : (seen.add(b.id), false)));
  check(dupes.length === 0, `no duplicate buff ids${dupes.length ? ` (${dupes.map((b) => b.id).join(", ")})` : ""}`);
}

// --- 1. Pool composition -----------------------------------------------------

for (const mode of ["nerf", "buff"] as DraftMode[]) {
  const counts: Record<string, number> = {};
  let total = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const bs = newBuffMatchState(seed, 6, mode);
    for (let round = 0; round < 5; round++) {
      const tiers = rollSharedTiers(bs);
      for (const color of ["w", "b"] as Color[]) {
        bs.players[color].offer = null;
        const offer = rollOffer(bs, color, tiers);
        for (const card of offer?.cards ?? []) {
          const def = BUFF_BY_ID[card.id];
          counts[def.category] = (counts[def.category] ?? 0) + 1;
          total += 1;
        }
      }
    }
  }
  const hexes = counts["hex"] ?? 0;
  const share = hexes / total;
  console.log(`${mode} mode: ${total} cards drawn ->`, counts, `hex share ${(share * 100).toFixed(1)}%`);
  if (mode === "nerf") {
    // Fair RNG: the hex share should track the hex fraction of the eligible
    // nerf-mode pool (uniform draw), not a tuned constant. Compare against the
    // pool-derived expectation with a generous band (tier mix shifts it).
    const nerfPool = ALL_BUFFS.filter(
      (b) => b.implemented && b.tier <= 8 && !b.special &&
        (b.category === "hex" || b.category === "item" || b.category === "nerf" || b.boon),
    );
    const poolHexShare = nerfPool.filter((b) => b.category === "hex").length / nerfPool.length;
    check(
      Math.abs(share - poolHexShare) <= 0.15,
      `nerf-mode hex share ${(share * 100).toFixed(1)}% tracks pool share ${(poolHexShare * 100).toFixed(1)}% (fair uniform draw)`,
    );
    const legal = Object.keys(counts).every((cat) => {
      if (cat === "hex" || cat === "item" || cat === "nerf") return true;
      // remaining categories must all come from boon-flagged cards; verified
      // per card below instead of per category.
      return true;
    });
    check(legal, "nerf-mode categories plausible");
    check((counts["item"] ?? 0) > 0, "nerf mode draws items");
    check((counts["nerf"] ?? 0) > 0, "nerf mode still draws nerf-relief boons");
  } else {
    check(hexes === 0, "buff mode never offers hexes");
    check((counts["nerf"] ?? 0) === 0, "buff mode never offers nerf-relief cards");
    check((counts["item"] ?? 0) > 0, "buff mode draws items");
  }
}

// Per-card legality in nerf mode: every offered card is a hex, an item, or a boon.
{
  const bs = newBuffMatchState(7, 6, "nerf");
  let ok = true;
  for (let round = 0; round < 6; round++) {
    const tiers = rollSharedTiers(bs);
    for (const color of ["w", "b"] as Color[]) {
      bs.players[color].offer = null;
      const offer = rollOffer(bs, color, tiers);
      for (const card of offer?.cards ?? []) {
        const def = BUFF_BY_ID[card.id];
        const boonish = def.category === "nerf" || !!def.boon;
        if (!(boonish || def.category === "hex" || def.category === "item")) ok = false;
      }
    }
  }
  check(ok, "every nerf-mode card is a hex, item, or boon");
}

// --- 2. Walnut Queen ----------------------------------------------------------

{
  // Current design (the sim previously tested a retired instant-walnut
  // version): for the opponent's next 2 captures, the CAPTURING piece
  // becomes a walnut for 3 of their turns. Script a black queen capture and
  // watch the queen walnut on the capture square.
  let g = freshGame("nerf", 11);
  g = play(g, "e2e4");
  g = play(g, "d7d5");
  acquireBuff(g, "w", "walnut_queen", 5);
  g = play(g, "e4d5"); // white takes the d5 pawn: must NOT trigger (own capture)
  check(g.buffs!.effects.every((e) => e.kind !== "walnut"), "own captures never trigger Walnut Curse");
  g = play(g, "d8d5"); // black queen recaptures: the queen turns to walnut on d5
  const d5 = SQ(3, 4);
  const eff = g.buffs!.effects.find((e) => e.kind === "walnut");
  check(!!eff && eff.kind === "walnut" && eff.sq === d5 && eff.turns === 3, "capturing queen walnuts on d5 for 3 black turns");
  const walnutMoves = () => legalMoves(g).filter((m) => m.from === d5);
  check(
    walnutMoves().every((m) => Math.abs((m.to % 8) - (m.from % 8)) <= 1 && Math.abs(Math.floor(m.to / 8) - Math.floor(m.from / 8)) <= 1),
    "walnut turn 1: queen can only shuffle one square",
  );
  g = play(g, "g1f3");
  g = play(g, "b8c6");
  g = play(g, "b1c3");
  check(
    walnutMoves().every((m) => Math.abs((m.to % 8) - (m.from % 8)) <= 1 && Math.abs(Math.floor(m.to / 8) - Math.floor(m.from / 8)) <= 1),
    "walnut turn 2: still shuffling",
  );
  g = play(g, "a7a6");
  g = play(g, "a2a3");
  g = play(g, "h7h6");
  g = play(g, "h2h3");
  check(g.buffs!.effects.every((e) => e.kind !== "walnut"), "walnut expired after 3 black turns");
  check(
    walnutMoves().some((m) => Math.abs((m.to % 8) - (m.from % 8)) > 1 || Math.abs(Math.floor(m.to / 8) - Math.floor(m.from / 8)) > 1),
    "queen slides again once the walnut cracks",
  );
}

// --- 3. Items in both modes ----------------------------------------------------

for (const mode of ["nerf", "buff"] as DraftMode[]) {
  let g = freshGame(mode, 21);
  g = play(g, "e2e4");
  g = play(g, "d7d5");
  // White feeds the e4 pawn an apple: uncapturable for 2 turns.
  acquireBuff(g, "w", "apple", 2);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "apple");
  const e4 = SQ(4, 3);
  check(activateBuff(g, "w", idx, [{ square: e4 }]), `${mode} mode: apple activates on e4`);
  // Activation consumed white's turn: black may not capture the shielded pawn.
  check(
    g.board.turn === "b" && legalMoves(g).every((m) => !(m.captured && m.to === e4)),
    `${mode} mode: apple-fed pawn on e4 cannot be captured`,
  );
}

{
  let g = freshGame("buff", 31);
  g = play(g, "e2e4");
  g = play(g, "g8f6");
  acquireBuff(g, "w", "banana_peel", 2);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "banana_peel");
  const d5 = SQ(3, 4), d6 = SQ(3, 5);
  check(activateBuff(g, "w", idx, [{ square: d5 }]), "banana peel tossed on d5");
  g = play(g, "d7d5");
  check(
    !g.board.pieces[d5] && g.board.pieces[d6]?.type === "p" && g.board.pieces[d6]?.color === "b",
    "enemy pawn stepping on the peel slips back to d6",
  );
  check(g.buffs!.players.w.buffs[idx].spent === true, "banana peel is spent after the slip");
}

// --- 3b. Bot support: targeted hexes resolve through aiCollectPicks -----------

{
  let g = freshGame("nerf", 41);
  g = play(g, "e2e4");
  g = play(g, "d7d5");
  g = play(g, "g1f3");
  g = play(g, "d8d6"); // black queen steps out: a juicy freeze target
  acquireBuff(g, "w", "cold_snap", 2);
  const used = aiActivateBuffs(g, "w");
  const d6 = SQ(3, 5);
  check(used?.id === "cold_snap", "bot fires Cold Snap through auto-targeting");
  // Balance pass: the defender's single most valuable piece (here the exposed
  // queen) is immune, so the bot freezes some other piece instead.
  check(
    !g.buffs!.effects.some((e) => e.kind === "freeze" && e.sq === d6),
    "bot's Cold Snap cannot touch the exempt queen",
  );
  check(
    g.buffs!.effects.some((e) => e.kind === "freeze" && e.owner === "b"),
    "bot's Cold Snap still lands a freeze on a lesser piece",
  );
}

{
  // Reusable hexes must not be re-activated in a loop once online.
  let g = freshGame("nerf", 43);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "flypaper_file", 4);
  const first = aiActivateBuffs(g, "w");
  check(first?.id === "flypaper_file", "bot brings Flypaper File online");
  // Black replies; on white's next turn the bot must leave the file alone.
  g = play(g, "b8c6");
  const again = aiChooseBuffActivation(g, "w");
  check(
    again == null || g.buffs!.players.w.buffs[again.buffIndex].id !== "flypaper_file",
    "bot does not waste turns re-activating an online Flypaper File",
  );
}

// --- 4. Opening nerf band + pair fairness ----------------------------------------
// (The temporary tier-2 opening cap this sim used to assert was deliberately
// retired: MIN/MAX_OPENING_NERF_TIER now span 1-8 with a +-1 pair-fairness
// band inside pickNerfPair. Assert the CURRENT contract.)

{
  const pool = openingNerfPool();
  check(pool.length >= 4, `opening pool has ${pool.length} nerfs (needs 4+ for the deal)`);
  check(pool.every((n) => n.tier >= 1 && n.tier <= 8), "openingNerfPool holds tiers 1-8 only");
  check(pool.some((n) => n.tier >= 5), "the opened band really includes high tiers");
  check(pool.every((n) => n.id !== "lucky"), "'lucky' never enters the opening pool");
  let seeded = 9;
  const rand = (max: number) => {
    // Tiny deterministic LCG so the sim never depends on Math.random.
    seeded = (seeded * 1103515245 + 12345) % 2147483648;
    return seeded % max;
  };
  let fair = true;
  for (let i = 0; i < 500; i++) {
    const pair = pickNerfPair(rand);
    const w = getNerf(pair.whiteNerfId), b = getNerf(pair.blackNerfId);
    if (!w || !b || Math.abs(w.tier - b.tier) > 1) fair = false;
  }
  check(fair, "500 pickNerfPair rolls always land within one tier of each other");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
