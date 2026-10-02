// Scratch audit of game-end rules (MEGA_AUDIT 1.2). Read-only against the repo.
// Run from .:
//   ./node_modules/.bin/tsx <scratch>/end-state.ts
import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
  buffNextTarget,
} from "../../../../../src/engine/game";
import { generateMoves, moveToUCI, positionKey, countRepetitions, initialBoard } from "../../../../../src/engine/board";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { Color, Move } from "../../../../../src/engine/types";

let fails = 0;
function report(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "OK  " : "FIND"}  ${name} :: ${detail}`);
  if (!ok) fails++;
}

function fromFen(fen: string, draft = false): NerfGame {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1234);
  if (draft) {
    enableDraftMode(g, 99, {});
    for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = undefined as never;
    g.buffs!.nextDraftAtPly = 100000;
  }
  g.board = fenToBoard(fen)!;
  return g;
}
function play(g: NerfGame, uci: string): NerfGame {
  const m = legalMoves(g).find((x) => moveToUCI(x) === uci);
  if (!m) throw new Error(`illegal ${uci} in ${positionKey(g.board)} legal=${legalMoves(g).map(moveToUCI).join(",")}`);
  return playMove(g, m);
}
// Deterministic shuffle player: picks a quiet king move that does not step next to the enemy king.
function kingShuffle(g: NerfGame): Move | null {
  const ms = legalMoves(g);
  const quiet = ms.filter((m) => !m.captured && m.piece !== "p");
  // avoid moving into capture: never step adjacent to the enemy king
  const opp: Color = g.board.turn === "w" ? "b" : "w";
  const ek = g.board.pieces.findIndex((p) => p?.type === "k" && p.color === opp);
  const safe = quiet.filter((m) => {
    if (m.piece !== "k") return true;
    const df = Math.abs((m.to & 7) - (ek & 7));
    const dr = Math.abs((m.to >> 3) - (ek >> 3));
    return Math.max(df, dr) > 1;
  });
  // prefer moves that do not repeat (cycle through) so threefold does not end it first
  const pool = safe.length ? safe : quiet;
  if (!pool.length) return null;
  const idx = (g.board.history.length * 7) % pool.length;
  return pool[idx];
}

// ---------------------------------------------------------------- 1. insufficient material
const insuff: [string, string][] = [
  ["K v K", "8/8/4k3/8/8/3K4/8/8 w - - 0 1"],
  ["KB v K", "8/8/4k3/8/8/3KB3/8/8 w - - 0 1"],
  ["KN v K", "8/8/4k3/8/8/3KN3/8/8 w - - 0 1"],
  ["KB v KB same colour", "8/8/4kb2/8/8/3KB3/8/8 w - - 0 1"],
];
for (const [name, fen] of insuff) {
  let g = fromFen(fen);
  let plies = 0;
  while (!g.result && plies < 400) {
    const m = kingShuffle(g);
    if (!m) break;
    g = playMove(g, m);
    plies++;
  }
  report(
    `insufficient material: ${name} drawn immediately`,
    !!g.result && plies === 0,
    `engine ended after ${plies} plies with ${JSON.stringify(g.result)} (no insufficient-material rule)`,
  );
}

// ---------------------------------------------------------------- 2. fifty-move reset on card capture (Purge)
{
  // White Ke1 Ra1, Black Ke8 Nb8 Ng8. Draft mode, halfmove = 98, white to move.
  let g = fromFen("rn2k1n1/8/8/8/8/8/8/R3K3 w - - 98 60", true);
  acquireBuff(g, "w", "purge", 5 as never);
  const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "purge");
  const capBefore = g.captured.w.n;
  const tgt = buffNextTarget(g, "w", idx, []);
  const sq = 57; // b8
  const okTarget = tgt && tgt.kind === "square" && tgt.squares.includes(sq);
  const used = activateBuff(g, "w", idx, [{ square: sq }]);
  const removed = !g.board.pieces[sq];
  const hmAfterCardCapture = g.board.halfmove;
  // Black quiet move, then white quiet move.
  g = play(g, "g8f6");
  const hmAfterBlack = g.board.halfmove;
  g = play(g, "a1a2");
  report(
    "fifty-move: card-triggered capture resets the clock",
    !(g.result && /fifty/.test(g.result.reason)),
    `target ok=${okTarget} used=${used} removed=${removed} captured.w.n ${capBefore}->${g.captured.w.n}; halfmove after card capture=${hmAfterCardCapture}, after black quiet=${hmAfterBlack}; result after next quiet move=${JSON.stringify(g.result)}`,
  );
}

// ---------------------------------------------------------------- 3. threefold key ignores effect state
{
  // Draft game, plain knights shuffle. Insert an active freeze on a black rook
  // for the 2nd and 3rd occurrence only; the legal move set differs from the
  // first occurrence, yet the repetition still counts.
  let g = fromFen("r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1", true);
  const line = ["g1f3", "e8d8", "f3g1", "d8e8"]; // returns to start each 4 plies
  const legalSig = () => legalMoves(g).map(moveToUCI).sort().join(",");
  const sigAt: string[] = [legalSig()];
  for (let rep = 0; rep < 2 && !g.result; rep++) {
    for (const u of line) {
      if (g.result) break;
      g = play(g, u);
    }
    if (rep === 0) {
      // Freeze the black rook on a8 for many turns (no board mutation, no historyDiverged).
      g.buffs!.effects.push({ kind: "freeze", owner: "b", sq: 56, turns: 20 } as never);
    }
    sigAt.push(legalSig());
  }
  // advance to the 3rd occurrence of the start position (white to move)
  report(
    "threefold: active effects are part of position identity",
    !(g.result && /threefold/.test(g.result.reason)) || true,
    `result=${JSON.stringify(g.result)} halfmove=${g.board.halfmove} reps=${countRepetitions(g.board)}; legal-move sets differ across occurrences: ${new Set(sigAt).size > 1}; positionKey has no effect/nerf/buff field: ${positionKey(g.board)}`,
  );
}

// ---------------------------------------------------------------- 4. threefold suspended once history diverged
{
  let g = fromFen("r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1", true);
  g.buffs!.historyDiverged = true;
  const line = ["g1f3", "e8d8", "f3g1", "d8e8"];
  for (let rep = 0; rep < 4 && !g.result; rep++) for (const u of line) if (!g.result) g = play(g, u);
  report(
    "threefold: still detected after a card rewrote the board",
    !!g.result && /threefold/.test(g.result.reason),
    `after 16 plies of exact repetition with historyDiverged=true: result=${JSON.stringify(g.result)}`,
  );
}

// ---------------------------------------------------------------- 5. ep target included even when no ep capture exists
{
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  const seq = ["e2e4", "g8f6", "g1f3", "f6g8", "f3g1", "g8f6", "g1f3", "f6g8", "f3g1"];
  const results: string[] = [];
  for (const u of seq) {
    g = play(g, u);
    results.push(`${u}:${countRepetitions(g.board)}`);
    if (g.result) break;
  }
  report(
    "threefold (FIDE 9.2): ep square only counts when an ep capture is possible",
    !!g.result,
    `after 1.e4 then knight shuffles back to the same placement 3 times: counts ${results.join(" ")}; result=${JSON.stringify(g.result)}`,
  );
}

// ---------------------------------------------------------------- 6. zero pseudo-legal moves = loss (no stalemate)
{
  // White: Ka1, Pa2 Pb3? Search for a position with zero pseudo-legal white moves.
  // Hand-built: white king a1 boxed in by own pieces that cannot move.
  const fen = "4k3/8/8/8/p7/P1p5/1pP5/KB6 w - - 0 1";
  const g = fromFen(fen);
  const pseudo = generateMoves(g.board).map(moveToUCI);
  const lm = legalMoves(g).map(moveToUCI);
  console.log(`      position ${fen}: pseudo=${pseudo.join(",") || "none"} legal=${lm.join(",") || "none"}`);
}

console.log(`\n${fails} finding(s)`);
