// Focused engine sim for the Chess Diff tier-6 card. Run with:
//
//   npx -y tsx scripts/sim-chess-diff.ts
//
// Proves, off the server:
// 1. chess_diff is a tier-6 implemented buff and lands in BOTH the buff-mode
//    and nerf-mode draft pools (the "appears both nerf and buff" requirement).
// 2. Its 2x appearance multiplier makes it roll about twice as often as a
//    peer tier-6 card, in both modes, deterministically off the seeded RNG.
// 3. Acquiring it wipes the board and re-seats a fresh standard opening, and
//    the caster is handed a guaranteed tier-10 mythic buff.
// 4. The three amped mythics (Oblivion, Grand Army, Ascendancy) plus the new
//    Total War card resolve without stranding the opponent's king.

import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
} from "../src/engine/game";
import { newBuffMatchState } from "../src/engine/buff";
import { rollOffer, rollSharedTiers } from "../src/engine/draft";
import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "../src/engine/buffs/library";
import { TIER10 } from "../src/engine/buffs/tier9";
import { initialBoard } from "../src/engine/board";
import { SQ } from "../src/engine/types";
import type { DraftMode } from "../src/engine/buff";

let failures = 0;
function check(ok: boolean, label: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
}

// --- 1. chess_diff is tier 6 and implemented -------------------------------
const diff = BUFF_BY_ID["chess_diff"];
check(!!diff && diff.implemented && diff.tier === 6, "chess_diff is an implemented tier-6 card");
check(BUFF_POOL_BY_TIER[6].some((b) => b.id === "chess_diff"), "chess_diff sits in the tier-6 draft pool");

// --- 2. Appears in both modes, at ~2x, off the same seeded RNG -------------
function countOffers(mode: DraftMode, rounds: number): Record<string, number> {
  const tally: Record<string, number> = {};
  for (let seed = 1; seed <= rounds; seed++) {
    const bs = newBuffMatchState(seed * 7919 + 3, 5, mode);
    // Force a tier-6 round for both slots by driving draftsTaken up so the
    // curve caps out; simplest is to roll shared tiers a few times then use a
    // fixed tier-6 pair, mirroring how rollOffer resolves slot tiers.
    const board = initialBoard();
    rollSharedTiers(bs); // advance like a real round
    const offer = rollOffer(bs, "w", [6, 6], board);
    if (!offer) continue;
    for (const c of offer.cards) tally[c.id] = (tally[c.id] ?? 0) + 1;
  }
  return tally;
}

for (const mode of ["buff", "nerf"] as DraftMode[]) {
  const tally = countOffers(mode, 4000);
  const diffCount = tally["chess_diff"] ?? 0;
  // chess_diff's true baseline is the cards it is drawn AGAINST in the same
  // pool. In buff mode that is every other tier-6 card; in nerf mode the draw
  // is split into a hex bucket and a boon/item bucket (HEX_SHARE), and
  // chess_diff (category "pieces", a boon) only ever competes inside the
  // boon/item bucket, so its peers there are the other NON-hex tier-6 cards.
  const peers = Object.entries(tally)
    .filter(([id]) => {
      const b = BUFF_BY_ID[id];
      if (!b || id === "chess_diff" || b.tier !== 6) return false;
      return mode === "nerf" ? b.category !== "hex" : true;
    })
    .map(([, n]) => n);
  const peerAvg = peers.length ? peers.reduce((a, b) => a + b, 0) / peers.length : 0;
  const ratio = peerAvg ? diffCount / peerAvg : 0;
  check(diffCount > 0, `chess_diff is offered in ${mode} mode (${diffCount} hits)`);
  check(
    ratio > 1.5 && ratio < 2.6,
    `chess_diff rolls ~2x a bucket peer in ${mode} mode (ratio ${ratio.toFixed(2)}, over ${peers.length} peers)`,
  );
}

// --- 3. Casting it resets the board and grants a tier-10 -------------------
function freshGame(): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 12345);
  enableDraftMode(game, 12345, { mode: "buff" });
  return game;
}

{
  const game = freshGame();
  // Make a messy board first: remove some pieces so we can see the reset.
  game.board.pieces[SQ(4, 1)] = null; // clear a white pawn
  game.board.pieces[SQ(3, 6)] = null; // clear a black pawn
  const before = game.buffs!.players.w.buffs.length;
  acquireBuff(game, "w", "chess_diff", 6);

  const std = initialBoard();
  let boardMatches = true;
  for (let sq = 0; sq < 64; sq++) {
    const a = game.board.pieces[sq];
    const b = std.pieces[sq];
    if (!!a !== !!b || (a && b && (a.type !== b.type || a.color !== b.color))) {
      boardMatches = false;
      break;
    }
  }
  check(boardMatches, "chess_diff re-seats a fresh standard starting position");
  check(
    game.board.castling.wk && game.board.castling.wq && game.board.castling.bk && game.board.castling.bq,
    "chess_diff restores full castling rights for both sides",
  );

  const held = game.buffs!.players.w.buffs;
  const granted = held[held.length - 1];
  const grantedDef = BUFF_BY_ID[granted.id];
  check(
    held.length === before + 2 && grantedDef?.tier === 10 && grantedDef.special === true,
    `chess_diff hands the caster a guaranteed tier-10 mythic (${granted.id})`,
  );
}

// --- 4. Amped mythics never strand the enemy king --------------------------
// All four are activatedSimple (no target picks), so activate with empty picks.
for (const id of ["oblivion", "grand_army", "ascendancy", "total_war"]) {
  const def = BUFF_BY_ID[id];
  check(!!def && def.tier === 10 && def.implemented, `${id} is an implemented tier-10 mythic`);
  const game = freshGame();
  acquireBuff(game, "w", id, 10);
  const idx = game.buffs!.players.w.buffs.findIndex((b) => b.id === id);
  activateBuff(game, "w", idx, []);
  // The opponent's king must still stand and still have legal moves.
  const blackKing = game.board.pieces.some((p) => p && p.color === "b" && p.type === "k");
  game.board.turn = "b";
  const blackMoves = legalMoves(game).length;
  check(blackKing && blackMoves > 0, `${id} leaves the opponent's king on the board with legal moves`);
}

check(TIER10.some((b) => b.id === "total_war"), "Total War joined the tier-10 mythic pool");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
