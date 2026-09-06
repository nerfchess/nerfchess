// Deterministic checks for the 2026-09 full balance pass (structural batch).
// Run: npx -y tsx scripts/test-balance-pass-2026-09.ts
//
// 1. Tier pins for every card the pass moved or deliberately kept, plus the
//    ladder invariants as code, so the next blanket retier wave cannot
//    silently undo them.
// 2. warp_home is a free action: the warp lands and the turn is still ours.
// 3. hard_reset never does nothing: home square taken => the pawn freezes.
// 4. bishop_archbishop and god_knight still bind and move after the retier.
// 5. fm_boon_lifebloom: the pawn returns to rank 4 under a two-turn shield.

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
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import { moveToUCI } from "../src/engine/board";
import { SQ } from "../src/engine/types";

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
    if (ps?.offer) ps.offer = null;
  }
  const move = legalMoves(g).find((m) => moveToUCI(m) === uci);
  if (!move) throw new Error(`scripted move ${uci} is not legal here`);
  return playMove(g, move);
}

const tier = (id: string) => BUFF_BY_ID[id]?.tier ?? -1;

// --- 1. Tier pins and ladder invariants ---------------------------------------

const PINS: Record<string, number> = {
  bishop_archbishop: 4,
  knight_nightrook: 3,
  camel_knight: 3,
  // Sized to 4 by the 2026-09 targeted sweep (see CARD_HISTORY).
  dragon_pawn: 4,
  cannon: 3,
  phase_rook: 3,
  god_knight: 7,
  dragon_mount: 4,
  wc_black_hole: 3,
  bn4_shepherds_watch: 5,
  hx4_lantern_out: 5,
  hx4_prowlers_bell: 6,
  second_army: 4,
  ov_pet_rock: 1,
  bn4_night_watch: 1,
  ov_sandbags: 2,
  // Deliberate keeps: the anchors the moves were priced against.
  warp_home: 2,
  recall: 2,
  full_rewind: 6,
  hard_reset: 3,
  twin_knights: 4,
  amazon_knight: 6,
  wazir_bishop: 3,
  wazir_rook: 3,
};
for (const [id, t] of Object.entries(PINS)) check(tier(id) === t, `${id} is Tier ${t} (got ${tier(id)})`);

check(tier("bishop_archbishop") >= tier("wazir_bishop") + 1, "a full extra piece-class sits above a one-step add");
check(tier("twin_knights") >= tier("knight_nightrook") + 1, "two upgraded knights sit above one");
check(tier("god_knight") >= tier("amazon_knight") + 1, "a permanent amazon sits above a two-turn one");
check(tier("dragon_mount") === tier("bishop_archbishop"), "the two archbishop builds share a tier");
check(tier("full_rewind") > tier("recall"), "five pieces home sits above one");
check(tier("hx4_prowlers_bell") >= tier("fm_hex_kings_moat") - 1, "the broader landing ban is priced beside King's Moat");
check(tier("bn4_shepherds_watch") > tier("fm_boon_oathstone"), "one more turn of pawn immunity costs a tier");
check(tier("ov_pet_rock") < tier("pawn_shield"), "one turn of pawn cover sits below four");
check(tier("bn4_night_watch") < tier("sidestep_king"), "one turn of king cover sits below three");
check(tier("second_army") <= tier("bodyguard"), "two pocket pawns are not dearer than a pocket knight");

// --- 2. warp_home is a free action -------------------------------------------

{
  let g = freshGame(7);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  check(BUFF_BY_ID.warp_home.freeAction === true, "warp_home is declared a free action");
  acquireBuff(g, "w", "warp_home", 2);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "warp_home");
  const e4 = SQ(4, 3);
  const e2 = SQ(4, 1);
  const ok = activateBuff(g, "w", idx, [{ square: e4 }, { square: e2 }]);
  check(ok === true, "the e4 pawn warps home to e2");
  check(g.board.pieces[e2]?.type === "p" && g.board.pieces[e2]?.color === "w" && !g.board.pieces[e4], "pawn stands on e2 again, e4 empty");
  check(g.board.turn === "w", "the warp did not spend White's turn");
}

{
  // A free action that grants no follow-up move must not arm the chained-move
  // king guard: the activator's regular move this turn may still take the
  // king. 1. e4 f5 2. Qh5+ a6?? leaves the e8 king en prise (this variant
  // never forces the reply); after warping the e4 pawn home, Qxe8 must still
  // be on offer.
  let g = freshGame(8);
  g = play(g, "e2e4");
  g = play(g, "f7f5");
  g = play(g, "d1h5");
  g = play(g, "a7a6");
  const e8 = SQ(4, 7);
  const kingTake = (game: NerfGame) => legalMoves(game).some((m) => m.to === e8 && m.captured === "k");
  check(kingTake(g), "precondition: Qxe8 (king capture) is legal before the warp");
  acquireBuff(g, "w", "warp_home", 2);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "warp_home");
  const e4 = SQ(4, 3);
  const e2 = SQ(4, 1);
  check(activateBuff(g, "w", idx, [{ square: e4 }, { square: e2 }]) === true, "the e4 pawn warps home");
  check(g.board.turn === "w", "White still has the move after the warp");
  check(g.buffs!.chainKingGuard !== "w", "the warp did not arm the chained-move king guard");
  check(kingTake(g), "Qxe8 (king capture) is still legal after the warp");
}

// --- 3. hard_reset fallback ------------------------------------------------------

{
  // Home square taken: e7 pawn advanced to e5, bishop parked on e7.
  let g = freshGame(11);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  g = play(g, "d2d4");
  g = play(g, "f8e7");
  // Instants fire the moment they are acquired.
  acquireBuff(g, "w", "hard_reset", 3);
  const e5 = SQ(4, 4);
  const e7 = SQ(4, 6);
  check(g.board.pieces[e5]?.type === "p" && g.board.pieces[e7]?.type === "b", "home square taken: the pawn stays on e5 (bishop keeps e7)");
  const frozen = (g.buffs?.effects ?? []).some(
    (e) => e.kind === "freeze" && e.sq === e5 && e.owner === "b" && e.turns === 1,
  );
  check(frozen, "the stranded pawn is frozen for one turn instead");
}
{
  // Home square free: the pawn goes back.
  let g = freshGame(12);
  g = play(g, "e2e4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "hard_reset", 3);
  const e5 = SQ(4, 4);
  const e7 = SQ(4, 6);
  check(g.board.pieces[e7]?.type === "p" && !g.board.pieces[e5], "home square free: the pawn reboots to e7");
}

// --- 4. The retiered upgrades still bind and move -------------------------------

{
  let g = freshGame(21);
  g = play(g, "d2d4");
  g = play(g, "d7d5");
  acquireBuff(g, "w", "bishop_archbishop", 4);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "bishop_archbishop");
  const c1 = SQ(2, 0);
  check(activateBuff(g, "w", idx, [{ square: c1 }]) === true, "archbishop binds to c1");
  // Binding spends the turn; Black replies, then the leap must be on offer.
  g = play(g, "g8f6");
  const leap = legalMoves(g).some((m) => m.from === c1 && m.to === SQ(1, 2));
  check(leap, "the c1 bishop leaps like a knight (c1 to b3)");
}
{
  let g = freshGame(22);
  g = play(g, "c2c4");
  g = play(g, "e7e5");
  acquireBuff(g, "w", "god_knight", 7);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "god_knight");
  const b1 = SQ(1, 0);
  check(activateBuff(g, "w", idx, [{ square: b1 }]) === true, "god knight binds to b1");
  g = play(g, "g8f6");
  const slide = legalMoves(g).some((m) => m.from === b1 && m.to === SQ(2, 1));
  check(slide, "the b1 knight steps like a queen onto the vacated c2");
}

// --- 5. Lifebloom rework -----------------------------------------------------------

{
  let g = freshGame(31);
  g = play(g, "e2e4");
  g = play(g, "d7d5");
  g = play(g, "e4d5"); // white pawn takes
  g = play(g, "d8d5"); // queen takes back: White has lost a pawn
  acquireBuff(g, "w", "fm_boon_lifebloom", 6);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "fm_boon_lifebloom");
  const e4 = SQ(4, 3);
  const ok = activateBuff(g, "w", idx, [{ square: e4 }]);
  check(ok === true, "lifebloom places the pawn on the fourth rank (e4)");
  check(g.board.pieces[e4]?.type === "p" && g.board.pieces[e4]?.color === "w", "a white pawn stands on e4");
  const shielded = (g.buffs?.effects ?? []).some(
    (e) => e.kind === "shield" && e.owner === "w" && Array.isArray(e.squares) && e.squares.includes(e4) && (e.turns ?? 0) >= 1,
  );
  check(shielded, "the returned pawn wears a shield");
}

if (failures > 0) {
  console.error(`\n${failures} balance-pass check(s) failed`);
  process.exit(1);
}
console.log("\nbalance pass 2026-09: OK");
