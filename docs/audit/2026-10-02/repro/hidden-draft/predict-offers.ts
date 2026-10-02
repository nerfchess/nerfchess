// Scratch repro: a client that receives `draftSeed` in the `start` frame
// (worker.ts startPayload ~2709) can predict FUTURE buff offers and the result
// of a reroll before spending it. Read-only; imports repo modules.
import {
  newGame,
  newGameAsColor,
  enableDraftMode,
  legalMoves,
  playMove,
  pickDraftCard,
  rerollDraft,
  UNRESTRICTED_NERF,
  serializeGame,
  deserializeGame,
  type NerfGame,
} from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { RNG } from "../../../../../src/engine/rng";
import { playReplicaMove } from "../../../../../src/lib/draftOnline";

const clone = (g: NerfGame): NerfGame => deserializeGame(JSON.parse(JSON.stringify(serializeGame(g))))!;
const sig = (o: { cards: { id: string }[] } | null | undefined) => (o ? o.cards.map((c) => c.id).join(",") : "none");

let exactNext = 0;
let exactReroll = 0;
let trials = 0;
let rerollTrials = 0;
let rngEqual = 0;
for (let t = 0; t < 40; t++) {
  const setupSeed = 1000 + t * 7919;
  const draftSeed = (t * 2654435761) >>> 1; // server: makeSeed()
  // SERVER: authoritative game (gameFromMatch shape).
  let server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, setupSeed);
  enableDraftMode(server, draftSeed, { mode: "buff" });
  // Openers: both seats pick card 0 (public in either case).
  pickDraftCard(server, "w", 0);
  pickDraftCard(server, "b", 0);

  // CLIENT (white seat), knowing only what the start frame carries: own nerf,
  // own nerf seed, draftSeed, the public move list and public dt actions.
  let client = newGameAsColor(UNRESTRICTED_NERF, "w", 12345);
  enableDraftMode(client, draftSeed, { mode: "buff" });
  pickDraftCard(client, "w", 0);
  pickDraftCard(client, "b", 0);

  // At ply 0 the cheater simulates an ARBITRARY hypothetical line (seeded
  // differently from the real game) on a clone until the first cadence offer.
  const hypo = clone(client);
  let hg = hypo;
  const hr = new RNG(99 + t);
  for (let i = 0; i < 40 && !hg.buffs!.players.w.offer && !hg.result; i++) {
    const lm = legalMoves(hg);
    if (!lm.length) break;
    hg = playMove(hg, lm[hr.int(lm.length)]);
  }
  const predicted = sig(hg.buffs!.players.w.offer);

  // The REAL game: a different random line on the server.
  const sr = new RNG(5 + t);
  const realMoves: string[] = [];
  for (let i = 0; i < 40 && !server.buffs!.players.w.offer && !server.result; i++) {
    const lm = legalMoves(server);
    if (!lm.length) break;
    const mv = lm[sr.int(lm.length)];
    realMoves.push(moveToUCI(mv));
    server = playMove(server, mv);
  }
  // Client replica replays the public moves (playReplicaMove discards its
  // locally rolled offer, but the rngState it advanced is kept).
  for (const u of realMoves) {
    const mv = legalMoves(client).find((m) => moveToUCI(m) === u)!;
    client = playReplicaMove(client, mv);
  }
  if (client.buffs!.rngState === server.buffs!.rngState) rngEqual++;
  const actual = sig(server.buffs!.players.w.offer);
  if (actual !== "none") {
    trials++;
    if (actual === predicted) exactNext++;
  }

  // Reroll prediction: the cheater rolls the reroll on a private copy of the
  // server state as the client replica knows it (offer from dtOffer, rngState
  // from its own replay). Here we use a clone of the server state minus
  // nothing: the replica's rngState equals the server's because only seeded
  // draws happened (no rerolls yet).
  if (server.buffs!.players.w.offer && (server.buffs!.players.w.rerollsLeft ?? 0) > 0) {
    rerollTrials++;
    const priv = clone(client);
    // the dtOffer frame hands the client the real current offer
    priv.buffs!.players.w.offer = JSON.parse(JSON.stringify(server.buffs!.players.w.offer));
    priv.buffs!.players.w.offerTiers = server.buffs!.players.w.offer!.cards.map((c) => c.tier);
    rerollDraft(priv, "w");
    const predictedReroll = sig(priv.buffs!.players.w.offer);
    rerollDraft(server, "w");
    if (sig(server.buffs!.players.w.offer) === predictedReroll) exactReroll++;
  }
}
console.log(`next-offer predicted from ply 0 via an unrelated hypothetical line: ${exactNext}/${trials} exact`);
console.log(`client replica rngState == server rngState after replaying public moves: ${rngEqual}/40`);
console.log(`reroll result predicted before spending it: ${exactReroll}/${rerollTrials} exact`);
