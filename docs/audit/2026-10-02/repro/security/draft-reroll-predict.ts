// Companion to draft-seed-predict.ts: with the draft seed from the start
// frame, a client can also preview what a REROLL would deal before spending
// one (rerolls are scarce, rerollsLeft is in dtState).
import { UNRESTRICTED_NERF, enableDraftMode, legalMoves, newGame, pickDraftCard, playMove, rerollDraft, type NerfGame } from "../../../../../src/engine/game";
import { RNG } from "../../../../../src/engine/rng";

const ids = (g: NerfGame, c: "w" | "b") => (g.buffs?.players[c].offer?.cards ?? []).map((x) => x.id).join("+");
let tried = 0, matched = 0;
const meta = new RNG(77);
for (let n = 0; n < 10; n++) {
  const setupSeed = Math.floor(meta.next() * 2 ** 31), draftSeed = Math.floor(meta.next() * 2 ** 31);
  const rng = new RNG(setupSeed);
  // Server and the client's replica start identical (same seeds, same public stream).
  let server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, setupSeed);
  enableDraftMode(server, draftSeed, { mode: "buff" });
  let client = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, setupSeed);
  enableDraftMode(client, draftSeed, { mode: "buff" });
  for (let ply = 0; ply < 50 && !server.result; ply++) {
    for (const c of ["w", "b"] as const) {
      if (server.buffs?.players[c].offer) {
        if (ply > 0 && (server.buffs.players[c].rerollsLeft ?? 0) > 0) {
          // Client previews the reroll on a throwaway copy of its replica.
          const preview: NerfGame = structuredClone(client);
          rerollDraft(preview, c);
          const guess = ids(preview, c);
          rerollDraft(server, c); rerollDraft(client, c);
          tried++; if (guess === ids(server, c)) matched++;
        }
        pickDraftCard(server, c, 0); pickDraftCard(client, c, 0);
      }
    }
    const legal = legalMoves(server);
    if (!legal.length) break;
    const i = Math.floor(rng.next() * legal.length);
    server = playMove(server, legal[i]);
    client = playMove(client, legalMoves(client)[i]);
  }
}
console.log(`rerolls previewed=${tried} preview equals the server's reroll=${matched}`);
