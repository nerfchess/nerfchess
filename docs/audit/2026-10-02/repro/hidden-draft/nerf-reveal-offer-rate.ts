// How often does a nerf-mode game OFFER a card whose text says "see your
// opponent's nerf" (extra_glance, stream_sniper)? Rolls each game's draft
// offers along the real cadence with random play, both seats.
import { newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { RNG } from "../../../../../src/engine/rng";
const REVEAL = new Set(["extra_glance", "stream_sniper"]);
let games = 0, gamesOffered = 0, offers = 0, revealOffers = 0;
for (let g = 0; g < 300; g++) {
  let game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1 + g);
  enableDraftMode(game, 1000 + g * 31, { mode: "nerf" });
  const r = new RNG(77 + g);
  let saw = false;
  games++;
  for (let ply = 0; ply < 80 && !game.result; ply++) {
    for (const c of ["w", "b"] as const) {
      const o = game.buffs!.players[c].offer;
      if (o) {
        offers++;
        if (o.cards.some((x) => REVEAL.has(x.id))) { revealOffers++; saw = true; }
        pickDraftCard(game, c, 0);
      }
    }
    const lm = legalMoves(game);
    if (!lm.length) break;
    game = playMove(game, lm[r.int(lm.length)]);
  }
  if (saw) gamesOffered++;
}
console.log(JSON.stringify({ games, offers, revealOffers, gamesWithARevealOffer: gamesOffered, pctGames: +(100 * gamesOffered / games).toFixed(1) }));
