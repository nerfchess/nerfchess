// Repro: worker.ts sameMove (line ~1180) ignores `drop`, so the DO's lookup of
// a remote engine move legalMoves(game).find(sameMove) can return a DIFFERENT
// drop piece than the engine chose. sameMove copied verbatim from worker.ts.
import { enableDraftMode, legalMoves, newGame, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import type { Move } from "../../../../../src/engine/types";
function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null) && (a.via ?? null) === (b.via ?? null);
}
const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 1, { mode: "buff" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
g.buffs!.players.w.inventory = { p: 1, q: 1 } as any;
const legal = legalMoves(g);
const remote = legal.find((m) => m.drop === "q" && moveToUCI(m) === "q@e4")!;
const committed = legal.find((m) => sameMove(m, remote))!;
console.log("engine chose", moveToUCI(remote), "-> DO commits", moveToUCI(committed), committed.drop === remote.drop ? "(same)" : "(DIFFERENT PIECE)");
