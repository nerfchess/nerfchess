// Scratch audit part 2: threefold identity, history-diverged suspension, immobility.
import { NerfGame, UNRESTRICTED_NERF, enableDraftMode, legalMoves, newGame, playMove } from "../../../../../src/engine/game";
import { generateMoves, moveToUCI, positionKey, countRepetitions } from "../../../../../src/engine/board";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { Color } from "../../../../../src/engine/types";

function draftGame(): NerfGame {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1234);
  enableDraftMode(g, 99, {});
  for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = undefined as never;
  g.buffs!.nextDraftAtPly = 100000;
  return g;
}
function play(g: NerfGame, uci: string): NerfGame {
  const m = legalMoves(g).find((x) => moveToUCI(x) === uci);
  if (!m) throw new Error(`illegal ${uci}`);
  return playMove(g, m);
}
const cycle = ["g1f3", "g8f6", "f3g1", "f6g8"];

// A. Threefold ignores active board effects (a freeze that changes the legal-move set).
{
  let g = draftGame();
  const sig = () => legalMoves(g).map(moveToUCI).sort().join(",");
  const sigs = [sig()];
  for (const u of cycle) g = play(g, u);
  sigs.push(sig());
  // freeze White's b1 knight for 20 turns: pure effect, no board mutation, no historyDiverged
  g.buffs!.effects.push({ kind: "freeze", owner: "w", sq: 1, turns: 20 } as never);
  const sigFrozen = sig();
  for (const u of cycle) if (!g.result) g = play(g, u);
  console.log(`A. occurrence1 legal=${sigs[0].split(",").length} moves, occurrence3 legal=${sigFrozen.split(",").length} moves (b1 frozen); result=${JSON.stringify(g.result)}`);
}
// B. Threefold after historyDiverged (any summon/removal/teleport/drop) is suspended for the rest of the game.
{
  let g = draftGame();
  g.buffs!.historyDiverged = true;
  for (let i = 0; i < 4 && !g.result; i++) for (const u of cycle) if (!g.result) g = play(g, u);
  console.log(`B. 16 plies of pure repetition after historyDiverged: result=${JSON.stringify(g.result)} halfmove=${g.board.halfmove}`);
}
// C. Baseline: same repetition without divergence draws at the third occurrence.
{
  let g = draftGame();
  let plies = 0;
  for (let i = 0; i < 4 && !g.result; i++) for (const u of cycle) if (!g.result) { g = play(g, u); plies++; }
  console.log(`C. baseline repetition: result=${JSON.stringify(g.result)} after ${plies} plies`);
}
// D. Zero pseudo-legal moves = loss for the side to move (the guide says lack of moves never ends the game).
for (const draft of [false, true]) {
  const g = draft ? draftGame() : newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  // white: Ka1 Bb1 Rb2 Pa2 Pc2 Pb3; black: Ke8 pa3 pc3 pb4; black to move, then black plays a quiet king move.
  g.board = fenToBoard("4k3/8/8/8/1p6/pPp5/PRP5/KB6 b - - 0 1")!;
  const wPseudo = (() => { const b = { ...g.board, turn: "w" as Color }; return generateMoves(b).length; })();
  const after = play(g, "e8d8");
  console.log(`D(${draft ? "draft" : "classic"}). white pseudo-legal moves=${wPseudo}; after ...Kd8 result=${JSON.stringify(after.result)}`);
}
// E. countRepetitions assumes the game began at the standard opening.
{
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  g.board = fenToBoard("4k3/8/8/8/8/8/8/4K1N1 w - - 0 1")!;
  let x = g;
  const c2 = ["g1f3", "e8d8", "f3g1", "d8e8"];
  for (let i = 0; i < 3 && !x.result; i++) for (const u of c2) if (!x.result) x = play(x, u);
  console.log(`E. FEN-start game, 12 plies of exact repetition: result=${JSON.stringify(x.result)} countRepetitions=${countRepetitions(x.board)} key=${positionKey(x.board).slice(-8)}`);
}
