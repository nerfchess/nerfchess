// Estimate websocket frame sizes for a draft game: move frame, dtState-like
// draft state, checkpoint snapshot (serializeGame) and spectator snapshot.
import { newGame, playMove, legalMoves, serializeGame, enableDraftMode, aiResolveDraft, toPublicSnapshot, UNRESTRICTED_NERF, type NerfGame } from "../../../../../src/engine/game";
import { moveToUCI, positionKey } from "../../../../../src/engine/board";
import { fnv1a } from "../../../../../src/engine/desync";
import zlib from "node:zlib";

const sz = (o: unknown) => { const s = JSON.stringify(o); return `${s.length}B (${zlib.deflateRawSync(s).length}B deflated)`; };
for (const seed of [1, 7, 42]) {
  let game: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed);
  let rnd = seed * 9301 + 49297;
  const rand = (n: number) => { rnd = (rnd * 9301 + 49297) % 233280; return Math.floor((rnd / 233280) * n); };
  const uci: string[] = [];
  for (let ply = 0; ply <= 80 && !game.result; ply++) {
    for (const c of ["w", "b"] as const) if (game.buffs?.players[c].offer) aiResolveDraft(game, c);
    if (ply % 20 === 0) {
      const bits: any = { gameId: "x".repeat(12), replayVersion: 1, stateRevision: ply, lastSeq: ply, cursor: 0, capturedAtMs: Date.now(), mode: null, rated: true,
        players: { w: { name: "playerone", rating: 1500 }, b: { name: "playertwo", rating: 1500 } }, clocks: { w: 1, b: 1 }, timeSec: 300, incrementSec: 3, timerState: {} as any, revealedNerfs: { w: null, b: null }, draftActions: [] };
      let pub = "n/a"; try { pub = sz(toPublicSnapshot(game, bits)); } catch (e) { pub = "threw " + (e as Error).message.slice(0, 60); }
      console.log(`seed ${seed} ply ${ply}: buffs(dtState-ish) ${sz(game.buffs)} | serializeGame ${sz(serializeGame(game))} | publicSnapshot ${pub} | moves[] ${sz(uci)}`);
    }
    const ms = legalMoves(game);
    if (!ms.length) break;
    const m = ms[rand(ms.length)];
    uci.push(moveToUCI(m));
    game = playMove(game, m);
  }
  const moveFrame = { t: "move", d: { u: "e2e4", ply: 42, wc: 123456, bc: 123456, f: fnv1a(positionKey(game.board)) } };
  console.log(`seed ${seed}: move frame ${sz(moveFrame)}; plies ${uci.length}; result ${JSON.stringify(game.result)?.slice(0, 60)}`);
}
