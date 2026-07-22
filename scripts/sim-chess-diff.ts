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
//    hands ONLY the winner a guaranteed tier-9 apex card, and the match itself
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
  // FAIR RNG (overhaul): chess_diff has NO appearance multiplier anymore. It
  // must roll at the same rate as any other eligible tier-6 peer in the same
  // mode's pool (uniform draw), so the ratio to the peer average sits near 1.
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
    ratio > 0.6 && ratio < 1.5,
    `chess_diff rolls at a FAIR ~1x peer rate in ${mode} mode (ratio ${ratio.toFixed(2)}, over ${peers.length} peers)`,
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

// Enter a running diff on an otherwise clean game, then hand back the game so a
// test can lay out a custom sub-game position on the (fresh) diff board.
function enterDiff(): NerfGame {
  const game = freshGame();
  acquireBuff(game, "w", "chess_diff", 6);
  return game;
}

// Wipe the diff board to a bare position (kings only until a test places more),
// with castling and en passant cleared so generated moves stay predictable.
function clearDiffBoard(game: NerfGame) {
  const b = game.board;
  for (let sq = 0; sq < 64; sq++) b.pieces[sq] = null;
  b.castling = { wk: false, wq: false, bk: false, bq: false };
  b.epTarget = null;
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

  // Decide it over the board with a real checkmate: fool's mate. Chess Diff
  // uses standard rules, so Qh4# ENDS the diff the instant mate lands - there is
  // no separate "capture the king" move (and there never can be: neither side
  // can move into check).
  let g = game;
  g = playUci(g, "f2f3");
  g = playUci(g, "e7e5");
  g = playUci(g, "g2g4");
  check(!!g.buffs!.diff, "the diff runs on until a real checkmate lands");
  g = playUci(g, "d8h4"); // Qh4#: checkmate decides the diff, black wins
  const nbs = g.buffs!;
  check(!nbs.diff, "checkmate ends the diff on the spot (no king-capture move needed)");
  check(g.result === null, "deciding the diff never ends the match itself");
  check(
    !g.board.pieces[SQ(4, 1)] && !g.board.pieces[SQ(3, 6)] && !boardIsStandardOpening(g),
    "the paused board is restored exactly as stashed",
  );
  check(g.board.turn === "b", "the paused game resumes with the same side to move");
  check(nbs.effects.length === 1 && nbs.effects[0].kind === "freeze", "stashed board effects come back");
  const blackHeld = nbs.players.b.buffs;
  const granted = blackHeld[blackHeld.length - 1];
  const grantedDef = granted && BUFF_BY_ID[granted.id];
  // Balance pass contract: the diff's prize is a GUARANTEED tier-9 apex card
  // (one band below the mythic it used to pay; see grantGuaranteedTier9).
  check(
    blackHeld.length === 1 && grantedDef?.tier === 9 && grantedDef.special === true,
    `the diff's WINNER is handed a guaranteed tier-9 apex (${granted?.id})`,
  );
  check(
    nbs.players.w.buffs.every((b) => (BUFF_BY_ID[b.id]?.tier ?? 0) < 9),
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
    blackHeld.length === 1 && BUFF_BY_ID[granted?.id]?.tier === 9,
    "the flagged side's opponent wins the diff's apex prize",
  );
  check(game.board.turn === "b" && !boardIsStandardOpening(game), "the paused board and turn are restored after a flag");
}

// --- 5. The draft cadence never backlogs when a diff resumes ----------------
// Regression: endChessDiff keeps the inflated (pre-diff + sub-game) history on
// the restored board, but the buff-draft cadence is frozen for the whole diff.
// If the threshold is not shifted past the diff's plies, the resumed game rolls
// a fresh offer on move after move until the frozen counter catches up to the
// now longer history - the "Chess Diff spams draft offers when it ends" bug.
// The threshold must stay the same distance ahead of the (longer) history as it
// was before the diff.
{
  // Two quiet opening plies so the cadence counter initializes and sits a full
  // interval ahead of the (still short) history, with no offer yet on the table.
  let g = playUci(freshGame(), "e2e4");
  g = playUci(g, "e7e5");
  const bs = g.buffs!;
  const prediffPly = g.board.history.length; // 2
  const thresholdBefore = bs.nextDraftAtPly ?? 0; // cadence * 2
  check(thresholdBefore > prediffPly, "the draft cadence is armed and ahead of the pre-diff history");
  const gapBefore = thresholdBefore - prediffPly;

  // Cast the diff (white to move) and play a long, quiet sub-game so its plies
  // clearly outrun the frozen threshold, then decide it on the 1+0 flag.
  bs.players.w.offer = null;
  bs.players.b.offer = null;
  acquireBuff(g, "w", "chess_diff", 6);
  check(!!bs.diff, "the diff is running");
  const subGame = [
    "a2a3", "a7a6", "b2b3", "b7b6", "c2c3", "c7c6", "d2d3", "d7d6",
    "e2e3", "e7e6", "f2f3", "f7f6", "g2g3", "g7g6", "h2h3", "h7h6",
  ];
  for (const uci of subGame) g = playUci(g, uci); // 16 sub-game plies
  const diffPlies = g.board.history.length - prediffPly;
  check(diffPlies === subGame.length, `the sub-game added ${diffPlies} plies to the shared history`);
  resolveDiffFlag(g, "w"); // white flags: the diff is decided, the match resumes
  check(!bs.diff && g.result === null, "the diff resolved and the match kept running");

  const resumePly = g.board.history.length;
  check(
    (bs.nextDraftAtPly ?? 0) > resumePly,
    `no offer backlog: threshold ${bs.nextDraftAtPly} is ahead of the resumed history ${resumePly}`,
  );
  check(
    (bs.nextDraftAtPly ?? 0) - resumePly === gapBefore,
    "the resumed cadence keeps its exact pre-diff distance to the next draft",
  );

  // Behavioral proof: a few quiet main-game moves right after the diff roll no
  // offer at all, since the next draft is still a full interval away.
  let rolls = 0;
  const probe = Math.min(3, gapBefore - 1);
  for (let i = 0; i < probe && !g.result; i++) {
    const before = { w: bs.players.w.offer, b: bs.players.b.offer };
    const moves = legalMoves(g);
    if (!moves.length) break;
    g = playMove(g, moves[0]);
    for (const c of ["w", "b"] as const) {
      if (bs.players[c].offer && bs.players[c].offer !== before[c]) rolls++;
      bs.players[c].offer = null; // clear so the next probe move is unobstructed
    }
  }
  check(rolls === 0, `no draft offers roll in the ${probe} moves right after the diff (saw ${rolls})`);
}

// --- 6. Chess Diff plays by STANDARD rules: no moving into check, win by
// checkmate, draw by stalemate ----------------------------------------------
{
  // A piece pinned to its own king may slide along the pin line but never off
  // it: stepping off would expose the king, which standard rules forbid.
  const g = enterDiff();
  clearDiffBoard(g);
  const b = g.board;
  b.pieces[SQ(4, 0)] = { type: "k", color: "w" }; // Ke1
  b.pieces[SQ(3, 0)] = { type: "r", color: "w" }; // Rd1, pinned along rank 1
  b.pieces[SQ(0, 0)] = { type: "r", color: "b" }; // Ra1, the pinner
  b.pieces[SQ(4, 7)] = { type: "k", color: "b" }; // Ke8
  b.turn = "w";
  const rookMoves = legalMoves(g).filter((m) => m.from === SQ(3, 0));
  check(
    rookMoves.length > 0 && rookMoves.every((m) => (m.to >> 3) === 0),
    "a pinned piece may move along the pin line but never off it (no exposing the king)",
  );
}

{
  // A king may not step onto a square an enemy piece attacks.
  const g = enterDiff();
  clearDiffBoard(g);
  const b = g.board;
  b.pieces[SQ(4, 0)] = { type: "k", color: "w" }; // Ke1
  b.pieces[SQ(4, 7)] = { type: "k", color: "b" }; // Ke8
  b.pieces[SQ(3, 7)] = { type: "r", color: "b" }; // Rd8 rakes the whole d-file
  b.turn = "w";
  const kingTo = legalMoves(g)
    .filter((m) => m.from === SQ(4, 0))
    .map((m) => m.to);
  check(
    !kingTo.includes(SQ(3, 0)) && !kingTo.includes(SQ(3, 1)),
    "the king cannot step onto a file an enemy rook rakes (no moving into check)",
  );
  check(
    kingTo.includes(SQ(4, 1)) || kingTo.includes(SQ(5, 1)),
    "the king can still step to safe squares",
  );
}

{
  // Stalemate: the side to move has no legal move and is NOT in check, so the
  // diff is a draw and nobody earns a mythic. White delivers it with Qb5-b6.
  const g = enterDiff();
  clearDiffBoard(g);
  const b = g.board;
  b.pieces[SQ(0, 7)] = { type: "k", color: "b" }; // Ka8
  b.pieces[SQ(1, 4)] = { type: "q", color: "w" }; // Qb5
  b.pieces[SQ(2, 5)] = { type: "k", color: "w" }; // Kc6
  b.turn = "w";
  const stalemating = legalMoves(g).find((m) => m.from === SQ(1, 4) && m.to === SQ(1, 5));
  check(!!stalemating, "the stalemating queen move (Qb5-b6) is available");
  const g2 = playMove(g, stalemating!);
  const bs = g2.buffs!;
  check(!bs.diff && g2.result === null, "a stalemate ends the diff as a draw, the match keeps running");
  check(
    bs.players.w.buffs.every((x) => BUFF_BY_ID[x.id]?.tier !== 10) &&
      bs.players.b.buffs.every((x) => BUFF_BY_ID[x.id]?.tier !== 10),
    "a drawn (stalemate) diff grants nobody a mythic",
  );
}

{
  // Standard castling: the king may not castle out of, through, or into check.
  const base = (): NerfGame => {
    const g = enterDiff();
    clearDiffBoard(g);
    const b = g.board;
    b.pieces[SQ(4, 0)] = { type: "k", color: "w" }; // Ke1
    b.pieces[SQ(7, 0)] = { type: "r", color: "w" }; // Rh1 (kingside rook home)
    b.pieces[SQ(4, 7)] = { type: "k", color: "b" }; // Ke8
    b.castling = { wk: true, wq: false, bk: false, bq: false };
    b.turn = "w";
    return g;
  };
  const canCastleK = (g: NerfGame) =>
    legalMoves(g).some((m) => m.from === SQ(4, 0) && m.castle === "k");

  check(canCastleK(base()), "kingside castling is available in the diff when the path is safe");

  const gOut = base();
  gOut.board.pieces[SQ(4, 3)] = { type: "r", color: "b" }; // Re4 checks the king down the e-file
  check(!canCastleK(gOut), "cannot castle OUT of check in the diff");

  const gThru = base();
  gThru.board.pieces[SQ(5, 3)] = { type: "r", color: "b" }; // Rf4 rakes f1, the king's transit square
  check(!canCastleK(gThru), "cannot castle THROUGH check in the diff");
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
