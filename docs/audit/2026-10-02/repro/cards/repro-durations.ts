// Duration units: card-internal timers (tickTurns, e.g. "For your next 3 turns")
// count MOVES, board effects count handovers, and neither matches "turns" when
// extra moves or turn-consuming activations happen.
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff, activateBuff, NerfGame } from "../../../../../src/engine/game";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { RNG } from "../../../../../src/engine/rng";
function fresh() { const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1); enableDraftMode(g, 2, { mode: "buff", cadence: 50 }); g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null; return g; }
const rng = new RNG(9);
const quiet = (g: NerfGame) => { const lm = legalMoves(g).filter((m) => !m.captured); return playMove(g, rng.pick(lm)); };
// A) extra moves: Coffee gives white 2 extra moves in ONE turn
{
  let g = fresh();
  acquireBuff(g, "w", "bn4_pathfinders", 3);
  const pf = g.buffs!.players.w.buffs.find((b) => b.id === "bn4_pathfinders")!;
  acquireBuff(g, "w", "coffee", 4);
  const ci = g.buffs!.players.w.buffs.findIndex((b) => b.id === "coffee");
  console.log("Pathfinders text:", BUFF_BY_ID.bn4_pathfinders.description.slice(0, 60), "| turns at start:", pf.state.turns);
  activateBuff(g, "w", ci, []);
  let whiteMovesThisTurn = 0;
  while (g.board.turn === "w" && whiteMovesThisTurn < 5) { g = quiet(g); whiteMovesThisTurn++; }
  console.log(`A) white made ${whiteMovesThisTurn} moves in its first turn (Coffee) -> Pathfinders turns left ${pf.state.turns}, spent=${!!pf.spent}`);
}
// B) a turn spent activating a card does not tick card-internal timers, but does tick board effects
{
  let g = fresh();
  acquireBuff(g, "w", "bn4_pathfinders", 3);
  const pf = g.buffs!.players.w.buffs.find((b) => b.id === "bn4_pathfinders")!;
  g.buffs!.effects.push({ kind: "nerf_suspended", owner: "w", turns: 3 }); // owner-ticked board effect for comparison
  // find a turn-consuming activated card with no targets
  const turnCard = Object.values(BUFF_BY_ID).find((b) => b.kind === "activated" && !b.freeAction && !b.targets && b.implemented && b.category === "tempo")!;
  acquireBuff(g, "w", turnCard.id, turnCard.tier);
  const ti = g.buffs!.players.w.buffs.findIndex((b) => b.id === turnCard.id);
  activateBuff(g, "w", ti, []);
  const eff = g.buffs!.effects.find((e) => e.kind === "nerf_suspended");
  console.log(`B) white spent its turn activating ${turnCard.id}; turn now ${g.board.turn}. Pathfinders turns left ${pf.state.turns} (unticked) vs owner-ticked board effect turns left ${eff?.turns}`);
}
