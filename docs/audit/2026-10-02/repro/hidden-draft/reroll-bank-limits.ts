// Engine-level reroll/bank limit checks (scratch; no repo test pins these).
import { newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, bankDraft, rerollDraft, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { RNG } from "../../../../../src/engine/rng";
const out: Record<string, unknown> = {};
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 11);
enableDraftMode(g, 4242, { mode: "buff" });
out.openerRerollRefused = rerollDraft(g, "w") === false && g.buffs!.players.w.rerollsLeft === 1;
pickDraftCard(g, "w", 0); pickDraftCard(g, "b", 0);
const r = new RNG(3);
const toOffer = () => { for (let i = 0; i < 40 && !g.buffs!.players.w.offer; i++) { const lm = legalMoves(g); g = playMove(g, lm[r.int(lm.length)]); if (g.buffs!.players.b.offer) pickDraftCard(g, "b", 0); } };
toOffer();
const rl0 = g.buffs!.players.w.rerollsLeft;
const first = rerollDraft(g, "w");
const second = rerollDraft(g, "w");
out.rerollsStart = rl0; out.firstRerollOk = first; out.secondRerollRefusedAtZero = second === false && g.buffs!.players.w.rerollsLeft === 0;
// Bank twice in a row: the bonus must cap at +1.
const roundTier = () => g.buffs!.players.w.offer!.cards[0].tier;
bankDraft(g, "w");
out.bankBonusAfterOne = g.buffs!.players.w.flags.bankBonus;
toOffer();
const t1 = roundTier();
bankDraft(g, "w");
out.bankBonusAfterTwo = g.buffs!.players.w.flags.bankBonus;
toOffer();
out.tierAfterSecondBank = roundTier(); out.tierAfterFirstBank = t1;
console.log(JSON.stringify(out));
