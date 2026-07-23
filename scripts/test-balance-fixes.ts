// Deterministic tests for the overhaul's named balance redesigns.
// Run: npx -y tsx scripts/test-balance-fixes.ts
//
// 1. summoning_circle (T8): permanent Amazon (queen + knight moves) placed on
//    any empty square; her killer (non-king) is dragged through and removed;
//    a king capturing her survives (no mate immunity).
// 2. sovereign_draft (T7): takeBoth on the next draft AND the offer rolls one
//    tier higher (distinct from wa_greed T6, which is take-both only).
// 3. ww_outriders (T4): knight placement plus up to TWO different pawn
//    advances (distinct from summon_knight T3).

import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} from "../src/engine/game";
import { rollOffer } from "../src/engine/draft";
import { moveToUCI } from "../src/engine/board";
import { SQ } from "../src/engine/types";
import type { Tier } from "../src/engine/nerf";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  } else {
    console.log("ok:", label);
  }
}

function freshGame(seed = 42): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed + 1, { mode: "buff" });
  return game;
}

function play(g: NerfGame, uci: string): NerfGame {
  for (const c of ["w", "b"] as const) {
    const ps = g.buffs?.players[c];
    if (ps?.offer) ps.offer = null; // clear pending offers so scripted moves flow
  }
  const move = legalMoves(g).find((m) => moveToUCI(m) === uci);
  if (!move) throw new Error(`scripted move ${uci} is not legal here`);
  return playMove(g, move);
}

// --- 1. Summoning Circle -------------------------------------------------------

{
  let g = freshGame(7);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "summoning_circle", 8);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "summoning_circle");
  const d4 = SQ(3, 3);
  check(activateBuff(g, "w", idx, [{ square: d4 }]) === true, "circle activates onto d4");
  const inst = g.buffs!.players.w.buffs[idx];
  check(g.board.pieces[d4]?.type === "q" && g.board.pieces[d4]?.color === "w", "an Amazon (queen piece) stands on d4");
  check(inst.state.sq === d4 && !inst.spent, "the circle stays bound to her while she serves");
  check(inst.state.turns === 4, "she serves for four owner turns (balance pass timer)");
  // Amazon movement: queen slides plus knight leaps. From d4 a knight leap to
  // c6... is a black knight square; use the empty leap b3? d4 -> b3 is (-2,-1):
  // a knight leap onto an empty square, never a queen slide of one step.
  g = play(g, "b8c6");
  const leaps = legalMoves(g).filter((m) => m.from === d4);
  const b3 = SQ(1, 2);
  check(leaps.some((m) => m.to === b3), "she leaps like a knight (d4 to b3)");
  // Revenge clause: the c6 knight attacks d4; taking her must kill the knight.
  g = play(g, "a2a3");
  const cap = legalMoves(g).find((m) => m.from === SQ(2, 5) && m.to === d4);
  check(!!cap, "black knight can capture the Amazon");
  if (cap) {
    g = playMove(g, cap);
    // Balance pass: the killer now survives, frozen in place for one of their
    // turns, instead of being dragged through and removed.
    check(
      g.board.pieces[d4]?.type === "n" && g.board.pieces[d4]?.color === "b",
      "the killer survives the circle (frozen, not destroyed)",
    );
    check(
      (g.buffs!.effects ?? []).some((e) => e.kind === "freeze" && e.sq === d4 && e.owner === "b"),
      "the killer is frozen in place by the closing circle",
    );
    const inst2 = g.buffs!.players.w.buffs[idx];
    check(inst2.spent === true, "the circle closes once she falls");
  }
}

{
  // King exemption: a king capturing her survives.
  let g = freshGame(11);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "summoning_circle", 8);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "summoning_circle");
  const d7 = SQ(3, 6); // adjacent to the black king on e8
  check(activateBuff(g, "w", idx, [{ square: d7 }]) === true, "circle activates onto d7");
  const kingCap = legalMoves(g).find((m) => m.from === SQ(4, 7) && m.to === d7);
  check(!!kingCap, "black king can capture the adjacent Amazon");
  if (kingCap) {
    g = playMove(g, kingCap);
    check(g.board.pieces[d7]?.type === "k" && g.board.pieces[d7]?.color === "b", "a capturing KING survives the circle (no mate immunity)");
  }
}

// --- 2. Sovereign Draft ----------------------------------------------------------

{
  const g = freshGame(23);
  acquireBuff(g, "w", "sovereign_draft", 7);
  const ps = g.buffs!.players.w;
  check(ps.flags.takeBoth === 1, "sovereign_draft arms takeBoth on the next draft");
  check(ps.flags.bankBonus === 1, "sovereign_draft lifts the next offer one tier");
  const offer = rollOffer(g.buffs!, "w", [3 as Tier, 3 as Tier], g.board);
  check(!!offer && offer.banked === true, "the lifted offer carries the banked (+1 tier) badge");
  check(
    !!offer && (g.buffs!.players.w.offerTiers ?? []).every((t) => t === 4),
    `the offer rolled at tier 4, one above the shared tier 3 (got ${(g.buffs!.players.w.offerTiers ?? []).join(",")})`,
  );
}

// --- 3. Outriders ------------------------------------------------------------------

{
  let g = freshGame(31);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "ww_outriders", 4);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "ww_outriders");
  const c3 = SQ(2, 2), a2 = SQ(0, 1), h2 = SQ(7, 1), a3 = SQ(0, 2), h3 = SQ(7, 2);
  check(
    activateBuff(g, "w", idx, [{ square: c3 }, { square: a2 }, { square: h2 }]) === true,
    "outriders: knight placed and two pawns advanced",
  );
  check(g.board.pieces[c3]?.type === "n", "new knight stands on c3");
  check(!g.board.pieces[a2] && g.board.pieces[a3]?.type === "p", "first pawn advanced a2 to a3");
  check(!g.board.pieces[h2] && g.board.pieces[h3]?.type === "p", "second pawn advanced h2 to h3");
}

{
  // One pawn (finishable early) still works.
  let g = freshGame(37);
  g = play(g, "d2d4");
  g = play(g, "d7d5");
  acquireBuff(g, "w", "ww_outriders", 4);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "ww_outriders");
  const f3 = SQ(5, 2), b2 = SQ(1, 1), b3 = SQ(1, 2);
  check(
    activateBuff(g, "w", idx, [{ square: f3 }, { square: b2 }]) === true,
    "outriders: knight plus a single pawn advance still resolves",
  );
  check(g.board.pieces[f3]?.type === "n" && g.board.pieces[b3]?.type === "p", "knight on f3, pawn on b3");
}

console.log(failures ? `\n${failures} FAILURES` : "\nall balance-fix checks passed");
process.exit(failures ? 1 : 0);
