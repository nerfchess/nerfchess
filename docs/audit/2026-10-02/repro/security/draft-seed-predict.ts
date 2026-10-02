// Repro: the start frame ships the real draft seed (worker.ts startPayload,
// `draftSeed: match.draftSeed ?? match.setup.seed`), which
// docs/game-server-protocol.md:148-150 says must never reach a client because
// "they would let a client predict every future offer".
//
// Model: the SERVER plays a buff-mode draft game (random legal moves, always
// takes card 0). Before every server move, a CLIENT that only knows what the
// start frame + public frames give it (setup seed, draftSeed, the move list
// and public pick actions) rebuilds the game from scratch, plays the SAME
// candidate move on its copy, and reads the offer it rolls. We count how often
// the predicted offer (card ids, both seats) equals the one the server then
// actually deals.
import {
  UNRESTRICTED_NERF,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  type NerfGame,
} from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { moveByUci } from "../../../../../src/engine/replay";
import { RNG } from "../../../../../src/engine/rng";

type Act = { ply: number; color: "w" | "b"; index: number };

function build(setupSeed: number, draftSeed: number, moves: string[], acts: Act[]): NerfGame {
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, setupSeed);
  enableDraftMode(g, draftSeed, { mode: "buff" });
  let ai = 0;
  const flush = (ply: number) => {
    while (ai < acts.length && acts[ai].ply === ply) {
      pickDraftCard(g, acts[ai].color, acts[ai].index);
      ai++;
    }
  };
  flush(0);
  for (let i = 0; i < moves.length; i++) {
    const m = moveByUci(g, moves[i]);
    if (!m) throw new Error(`replay failed at ${i} ${moves[i]}`);
    g = playMove(g, m);
    flush(i + 1);
  }
  return g;
}

const offerIds = (g: NerfGame) =>
  (["w", "b"] as const).map((c) => (g.buffs?.players[c].offer?.cards ?? []).map((x) => x.id).join("+")).join(" | ");

let predicted = 0;
let rolled = 0;
let mismatched = 0;
const examples: string[] = [];
const meta = new RNG(20261002);
for (let gameNo = 0; gameNo < 12; gameNo++) {
  const setupSeed = Math.floor(meta.next() * 2 ** 31);
  const draftSeed = Math.floor(meta.next() * 2 ** 31);
  const rng = new RNG(setupSeed ^ 0x5eed);
  let server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, setupSeed);
  enableDraftMode(server, draftSeed, { mode: "buff" });
  const moves: string[] = [];
  const acts: Act[] = [];
  const resolveOffers = () => {
    for (const c of ["w", "b"] as const) {
      if (server.buffs?.players[c].offer) {
        pickDraftCard(server, c, 0);
        acts.push({ ply: moves.length, color: c, index: 0 });
      }
    }
  };
  resolveOffers();
  for (let ply = 0; ply < 60 && !server.result; ply++) {
    const legal = legalMoves(server);
    if (!legal.length) break;
    const mv = legal[Math.floor(rng.next() * legal.length)];
    const uci = moveToUCI(mv);
    // CLIENT: rebuild from public info + draftSeed, try the move, read the roll.
    let guess = "";
    try {
      const client = build(setupSeed, draftSeed, moves, acts);
      const cm = moveByUci(client, uci);
      if (cm) guess = offerIds(playMove(client, cm));
    } catch (e) {
      guess = "ERR " + (e as Error).message;
    }
    // SERVER: actually play it.
    const before = offerIds(server);
    server = playMove(server, mv);
    moves.push(uci);
    const after = offerIds(server);
    if (after !== before && after.replace(/[ |]/g, "") !== "") {
      rolled++;
      if (guess === after) predicted++;
      else mismatched++;
      if (examples.length < 4) examples.push(`game ${gameNo} ply ${ply + 1}: client predicted [${guess}] server dealt [${after}]`);
    }
    resolveOffers();
  }
}
console.log(`offers rolled=${rolled} predicted exactly before the deal=${predicted} mismatched=${mismatched}`);
for (const e of examples) console.log(e);
