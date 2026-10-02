// Repro: a passive card drafted by BLACK at a draft round (white to move) that
// leaves WHITE with zero legal moves is never resolved (no forced pass, no
// result), because acquireBuff only runs settleAfterBuff/resolveNoMoves for
// instants. Draft rounds always fire with white to move (even ply).
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, NerfGame } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { IMPLEMENTED_BY_ID } from "../../../../../src/engine/nerfs/library";

function run(mode: "nerf" | "buff", cardId: string) {
  const nerf = mode === "nerf" ? IMPLEMENTED_BY_ID["heavy_boots"] ?? UNRESTRICTED_NERF : UNRESTRICTED_NERF;
  let g: NerfGame = newGame(nerf, nerf, 12345);
  enableDraftMode(g, 777, { mode });
  // clear opener offers (buff mode) so moves can be played
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  for (const uci of ["b1c3", "b8c6", "g1f3", "g8f6", "a2a3", "a7a6", "b2b3", "b7b6", "h2h3", "h7h6"]) {
    const m = legalMoves(g).find((x) => moveToUCI(x) === uci);
    if (!m) throw new Error("scripted move illegal " + uci);
    g = playMove(g, m);
  }
  const offer = g.buffs!.players.b.offer;
  console.log(`\n[${mode}] ${cardId} (retired=${isRetired(cardId)}, tier ${BUFF_BY_ID[cardId].tier}, ${BUFF_BY_ID[cardId].kind}, ${BUFF_BY_ID[cardId].category})`);
  console.log(`  ply ${g.board.history.length}, turn ${g.board.turn}, black offer before injection: ${JSON.stringify(offer?.cards)}`);
  // Inject the card into black's live offer at its library tier (stand-in for the seeded roll).
  g.buffs!.players.b.offer = { cards: [{ id: cardId, tier: BUFF_BY_ID[cardId].tier }, ...(offer?.cards.slice(1) ?? [])], index: offer?.index ?? 1 };
  pickDraftCard(g, "b", 0);
  if (g.buffs!.players.w.offer) pickDraftCard(g, "w", 0);
  const lm = legalMoves(g);
  console.log(`  after black picks it: turn ${g.board.turn}, white legal moves = ${lm.length}, result = ${JSON.stringify(g.result)}`);
}
run("nerf", "court_in_exile");
run("buff", "bn4_long_winter");
