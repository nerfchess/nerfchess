// Focused engine sim for the Chess Diff tier-6 card. Run with:
//
//   npx -y tsx scripts/sim-chess-diff.ts
//
// Proves, off the server:
// 1. chess_diff is a tier-6 implemented buff and lands in BOTH the buff-mode
//    and nerf-mode draft pools (the "appears both nerf and buff" requirement).
// 2. Its 2x appearance multiplier makes it roll about twice as often as a
//    peer tier-6 card, in both modes, deterministically off the seeded RNG.
// 3. Acquiring it PAUSES the game and spawns a fresh, plain sub-game: the
//    board snaps to the standard opening with white to move, the pre-diff
//    board/effects are stashed, pending offers are cancelled, buffs cannot be
//    activated, and NO mythic is granted at cast time.
// 4. Deciding the diff (king capture) restores the paused board and effects,
//    hands ONLY the winner a guaranteed tier-10 mythic, and the match itself
//    keeps running. A clock flag (resolveDiffFlag) resolves the same way.
// 5. The three amped mythics (Oblivion, Grand Army, Ascendancy) plus the
//    Total War card resolve without stranding the opponent's king.

import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
  resolveDiffFlag,
} from "../src/engine/game";
import { newBuffMatchState } from "../src/engine/buff";
import { rollOffer, rollSharedTiers } from "../src/engine/draft";
import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "../src/engine/buffs/library";
import { TIER10 } from "../src/engine/buffs/tier9";
import { initialBoard, moveToUCI } from "../src/engine/board";
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

// --- 3 + 4. The paused-game 1+0 sub-game lifecycle --------------------------
function freshGame(): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 12345);
  enableDraftMode(game, 12345, { mode: "buff" });
  return game;
}

function boardIsStandardOpening(game: NerfGame): boolean {
  const std = initialBoard();
  for (let sq = 0; sq < 64; sq++) {
    const a = game.board.pieces[sq];
    const b = std.pieces[sq];
    if (!!a !== !!b || (a && b && (a.type !== b.type || a.color !== b.color))) return false;
  }
  return true;
}

function playUci(game: NerfGame, uci: string): NerfGame {
  const move = legalMoves(game).find((m) => moveToUCI(m) === uci);
  if (!move) throw new Error(`sim move ${uci} is not legal here`);
  return playMove(game, move);
}

// Cast: pause, fresh board, no grant, no drafts/buffs during the diff.
function castDiff(): NerfGame {
  const game = freshGame();
  // Make a messy paused game first: remove pieces, park an effect, open an
  // offer, and put black on move — everything the diff must stash + restore.
  game.board.pieces[SQ(4, 1)] = null; // clear a white pawn
  game.board.pieces[SQ(3, 6)] = null; // clear a black pawn
  game.board.turn = "b";
  game.buffs!.effects.push({ kind: "freeze", sq: SQ(0, 0), owner: "w", turns: 5 });
  game.buffs!.players.b.offer = { cards: [{ id: "chess_diff", tier: 6 }], index: 1 };
  acquireBuff(game, "w", "chess_diff", 6);
  return game;
}

{
  const game = castDiff();
  const bs = game.buffs!;
  check(!!bs.diff && bs.diff.caster === "w", "casting chess_diff starts a sub-game (bs.diff)");
  check(boardIsStandardOpening(game), "the diff plays from a fresh standard starting position");
  check(game.board.turn === "w" && game.board.halfmove === 0, "the diff starts with white to move, fifty-move clock reset");
  check(
    game.board.castling.wk && game.board.castling.wq && game.board.castling.bk && game.board.castling.bq,
    "the diff grants full castling rights to both sides",
  );
  check(bs.effects.length === 0 && (bs.diff?.savedEffects.length ?? 0) === 1, "pre-diff board effects are stashed away");
  check(bs.players.b.offer === null, "a pending draft offer is cancelled when the diff starts");
  const held = bs.players.w.buffs;
  check(
    held.length === 1 && held[0].id === "chess_diff",
    "no mythic is granted at cast time (the winner earns it)",
  );
  check(legalMoves(game).length === 20, "the diff is plain chess (20 opening moves)");

  // Buff activations are refused while the diff runs.
  acquireBuff(game, "w", "lightning_strike", 3);
  const idx = bs.players.w.buffs.findIndex((b) => b.id === "lightning_strike");
  check(
    idx < 0 || activateBuff(game, "w", idx, [{ square: SQ(4, 6) }]) === false,
    "buffs cannot be activated during the diff",
  );

  // Decide it over the board: fool's mate, then black captures the king
  // (this variant has no checkmate — you win the diff by taking the king).
  let g = game;
  g = playUci(g, "f2f3");
  g = playUci(g, "e7e5");
  g = playUci(g, "g2g4");
  g = playUci(g, "d8h4");
  check(!!g.buffs!.diff, "the diff keeps running until the king actually falls");
  g = playUci(g, "a2a3");
  g = playUci(g, "h4e1"); // queen takes the white king: black wins the diff
  const nbs = g.buffs!;
  check(g.result === null, "deciding the diff never ends the match itself");
  check(!nbs.diff, "the decided diff clears bs.diff");
  check(
    !g.board.pieces[SQ(4, 1)] && !g.board.pieces[SQ(3, 6)] && !boardIsStandardOpening(g),
    "the paused board is restored exactly as stashed",
  );
  check(g.board.turn === "b", "the paused game resumes with the same side to move");
  check(nbs.effects.length === 1 && nbs.effects[0].kind === "freeze", "stashed board effects come back");
  const blackHeld = nbs.players.b.buffs;
  const granted = blackHeld[blackHeld.length - 1];
  const grantedDef = granted && BUFF_BY_ID[granted.id];
  check(
    blackHeld.length === 1 && grantedDef?.tier === 10 && grantedDef.special === true,
    `the diff's WINNER is handed a guaranteed tier-10 mythic (${granted?.id})`,
  );
  check(
    nbs.players.w.buffs.every((b) => BUFF_BY_ID[b.id]?.tier !== 10),
    "the loser (the caster here) gets nothing",
  );
}

// A clock flag decides the diff the same way (the game server records this
// as a diffFlag draft action; resolveDiffFlag is what replays it).
{
  const game = castDiff();
  resolveDiffFlag(game, "w"); // white flags the 1+0 clock
  const bs = game.buffs!;
  check(!bs.diff && game.result === null, "a flag ends the diff, not the match");
  const blackHeld = bs.players.b.buffs;
  const granted = blackHeld[blackHeld.length - 1];
  check(
    blackHeld.length === 1 && BUFF_BY_ID[granted?.id]?.tier === 10,
    "the flagged side's opponent wins the diff's mythic",
  );
  check(game.board.turn === "b" && !boardIsStandardOpening(game), "the paused board and turn are restored after a flag");
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
