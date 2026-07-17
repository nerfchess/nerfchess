// Focused engine sim for the PublicMutation collector (timeline/notation
// foundation). Run with:
//
//   npx -y tsx scripts/sim-mutation-notation.ts
//
// Proves, off the server, that the BuffApi mutation primitives record the
// right PublicMutation for each observable board change, attributed to the
// running card, and that api.swap exchanges pieces as ONE swap op (not two
// teleports). These records are what the timeline/notation layer reads;
// getting the op shape right here is the whole point of the audit that added
// api.swap and routed the 6 direct-write swap sites through it.

import {
  UNRESTRICTED_NERF,
  activateBuff,
  bankDraft,
  enableDraftMode,
  makeBuffApi,
  newGame,
  type NerfGame,
} from "../src/engine/game";
import { SQ } from "../src/engine/types";
import type { Color } from "../src/engine/types";
import type { PublicMutation } from "../src/engine/buff";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  } else {
    console.log("ok:", label);
  }
}

function freshGame(seed = 42): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed + 1, { mode: "buff" });
  return game;
}

function clearOffers(game: NerfGame) {
  for (const color of ["w", "b"] as Color[]) {
    if (game.buffs?.players[color].offer) bankDraft(game, color);
  }
}

const at = (game: NerfGame, name: string) =>
  game.board.pieces[SQ(name.charCodeAt(0) - 97, name.charCodeAt(1) - 49)];
const idx = (name: string) => SQ(name.charCodeAt(0) - 97, name.charCodeAt(1) - 49);
const fx = (game: NerfGame): PublicMutation[] => game.buffs?.lastEventMutations ?? [];

// ---------------------------------------------------------------------------
// 1. api.swap records ONE swap op and exchanges the pieces.
// ---------------------------------------------------------------------------
{
  const game = freshGame(101);
  clearOffers(game);
  // Piece Swap: swap two of my own pieces. Swap the b1 knight and g1 knight
  // (both present in the opening), so the exchange is observable and legal.
  game.buffs!.players.w.buffs.push({ id: "piece_swap", tier: 2, state: {} });
  const bKnight = at(game, "b1");
  const gKnight = at(game, "g1");
  const fired = activateBuff(game, "w", game.buffs!.players.w.buffs.length - 1, [
    { square: idx("b1") },
    { square: idx("g1") },
  ]);
  check(fired, "piece_swap activates");
  check(at(game, "b1") === gKnight && at(game, "g1") === bKnight, "swap exchanged the two knights");
  const m = fx(game);
  check(m.length === 1, `swap recorded exactly one mutation (got ${m.length})`);
  check(m[0]?.op === "swap", `mutation op is swap (got ${m[0]?.op})`);
  check(
    m[0]?.op === "swap" && ((m[0].a === idx("b1") && m[0].b === idx("g1")) || (m[0].a === idx("g1") && m[0].b === idx("b1"))),
    "swap names the two squares",
  );
  check(m[0]?.by === "piece_swap", `swap attributed to the card (by=${m[0]?.by})`);
}

// ---------------------------------------------------------------------------
// 2. Genesis (whole-board rewrite via place/removePiece) records summon/remove
//    ops, all attributed, and the per-event list resets between activations.
// ---------------------------------------------------------------------------
{
  const game = freshGame(202);
  clearOffers(game);
  game.buffs!.players.w.buffs.push({ id: "genesis", tier: 8, state: {} });
  const fired = activateBuff(game, "w", game.buffs!.players.w.buffs.length - 1, []);
  check(fired, "genesis activates");
  const m = fx(game);
  check(m.length > 0, "genesis recorded mutations");
  check(
    m.every((x) => x.op === "remove" || x.op === "summon"),
    "genesis mutations are all remove/summon (board rewrite)",
  );
  check(m.every((x) => x.by === "genesis"), "every genesis mutation attributed to genesis");
  check(
    m.some((x) => x.op === "summon" && x.type === "k"),
    "genesis re-summoned kings",
  );
}

// ---------------------------------------------------------------------------
// 3. A no-op swap (empty squares) records nothing — inert calls reveal no card.
// ---------------------------------------------------------------------------
{
  const game = freshGame(303);
  clearOffers(game);
  game.buffs!.lastEventMutations = undefined;
  game.buffs!.mutationBy = "probe";
  const api = makeBuffApi(game, "w");
  api.swap(idx("e4"), idx("e5")); // both empty in the opening
  game.buffs!.mutationBy = undefined;
  check(fx(game).length === 0, "no-op swap of two empty squares records nothing");
}

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nOK: mutation-notation sim passed");
