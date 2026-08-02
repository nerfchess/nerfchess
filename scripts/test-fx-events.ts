// Tests the transient fx-event narration in src/engine/fxEvents.ts.
//
//   npx tsx scripts/test-fx-events.ts
//
// The contract under test: every observable "fruition" moment inside an apply
// cycle (a nerf filter biting, an effect landing on a victim, a timer ticking
// out, a clock raid) appends a typed event to game.fx, and none of it ever
// leaks into a snapshot or affects game state.

import { newBuffMatchState, type ActiveEffect } from "../src/engine/buff";
import { ALL_BUFFS } from "../src/engine/buffs/library";
import { effectVictim } from "../src/engine/fxEvents";
import {
  acquireBuff,
  legalMoves,
  newGame,
  playMove,
  serializeGame,
  UNRESTRICTED_NERF,
} from "../src/engine/game";
import type { Nerf } from "../src/engine/nerf";

let failures = 0;
function check(ok: boolean, what: string) {
  if (!ok) {
    failures++;
    console.error("  FAIL " + what);
  }
}

const openNerf: Nerf = { id: "fx_open", name: "fx open", description: "", tier: 1, implemented: true };

function freshGame(white: Nerf = openNerf, black: Nerf = openNerf) {
  const game = newGame(white, black, 42);
  game.buffs = newBuffMatchState(7, 5);
  return game;
}

function playAny(game: ReturnType<typeof freshGame>) {
  const move = legalMoves(game)[0];
  check(!!move, "a legal move exists for the scripted position");
  if (move) playMove(game, move);
}

console.log("fx events");

// 1. A nerf filter that bites narrates nerf-constrained for the mover, with
//    the squares whose pieces lost every move.
{
  const noKnights: Nerf = {
    id: "fx_no_knights",
    name: "fx no knights",
    description: "",
    tier: 1,
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.piece !== "n"),
  };
  const game = freshGame(openNerf, noKnights);
  playAny(game); // white moves; black (nerfed) is now the mover
  const ev = game.fx?.find((e) => e.kind === "nerf-constrained");
  check(!!ev, "a biting filter emits nerf-constrained");
  if (ev && ev.kind === "nerf-constrained") {
    check(ev.color === "b", "the event names the constrained mover");
    check(ev.nerfId === "fx_no_knights", "the event names the nerf");
    check(ev.removed > 0, "the removed count is positive");
    check(ev.fromSquares.length === 2, `both knight squares lost all moves (got ${ev.fromSquares.length})`);
  }
}

// 2. A filter that would empty the list is relaxed, and narrated as such.
{
  const noMoves: Nerf = {
    id: "fx_no_moves",
    name: "fx no moves",
    description: "",
    tier: 1,
    implemented: true,
    filterMoves: () => [],
  };
  const game = freshGame(openNerf, noMoves);
  playAny(game);
  check(
    game.fx?.some((e) => e.kind === "nerf-relaxed" && e.color === "b" && e.nerfId === "fx_no_moves") ?? false,
    "the empty-list safety net emits nerf-relaxed",
  );
  check(
    !game.fx?.some((e) => e.kind === "nerf-constrained"),
    "a relaxed turn does not also claim to constrain",
  );
}

// 3. A quiet nerf (filter lets everything through) narrates nothing.
{
  const game = freshGame();
  playAny(game);
  check(
    !game.fx?.some((e) => e.kind === "nerf-constrained" || e.kind === "nerf-relaxed"),
    "an open position emits no nerf filter events",
  );
}

// 4. An effect ticking out narrates effect-expired with the right victim.
{
  const game = freshGame();
  const frozen: ActiveEffect = { kind: "freeze", sq: 57, owner: "b", turns: 1 }; // b1 knight... black's b8 is 57? owner b piece square
  // Pin the freeze to a real black piece so the orphan pruning keeps it.
  const sq = game.board.pieces.findIndex((p) => p?.color === "b");
  (frozen as { sq: number }).sq = sq;
  game.buffs!.effects.push(frozen);
  playAny(game); // white's move: no tick (freeze ticks on its owner's moves)
  check(
    !game.fx?.some((e) => e.kind === "effect-expired"),
    "the freeze survives the opponent's move",
  );
  playAny(game); // black's move ticks the freeze to 0 and prunes it
  const ev = game.fx?.find((e) => e.kind === "effect-expired");
  check(!!ev, "the ticked-out freeze emits effect-expired");
  if (ev && ev.kind === "effect-expired") {
    check(ev.victim === "b", "the freeze's victim is its owner");
  }
}

// 5. Library scan: real instant cards that plant a board effect or raid the
//    clock must narrate it on acquire. This keeps the narration honest across
//    the whole library, not just hand-picked ids.
{
  let planted = 0;
  let raided = 0;
  let narratedEffects = 0;
  let narratedClock = 0;
  for (const def of ALL_BUFFS) {
    if (def.kind !== "instant" || !def.implemented) continue;
    const game = freshGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF);
    try {
      acquireBuff(game, "w", def.id, def.tier);
    } catch {
      continue; // cards that need a mid-game board can throw on ply 0; not this test's concern
    }
    const bs = game.buffs!;
    if (bs.effects.length > 0) {
      planted++;
      if (game.fx?.some((e) => e.kind === "effect-applied" && e.sourceCardId === def.id)) narratedEffects++;
    }
    if ((bs.clockFx?.length ?? 0) > 0) {
      raided++;
      if (game.fx?.some((e) => e.kind === "clock-fx" && e.sourceCardId === def.id)) narratedClock++;
    }
  }
  check(planted > 0, `the scan found instant cards that plant effects (got ${planted})`);
  check(raided > 0, `the scan found instant cards that adjust clocks (got ${raided})`);
  check(
    narratedEffects === planted,
    `every planted effect is narrated with its source card (${narratedEffects}/${planted})`,
  );
  check(
    narratedClock === raided,
    `every clock request is narrated with its source card (${narratedClock}/${raided})`,
  );
}

// 6. Victim mapping: benefit-side kinds point at the opponent, afflictions at
//    the owner, `against` kinds at their target.
{
  check(effectVictim({ kind: "freeze", sq: 0, owner: "w", turns: 1 }) === "w", "freeze afflicts its owner");
  check(effectVictim({ kind: "shield", owner: "w", squares: null, turns: 1 }) === "b", "a shield constrains the opponent");
  check(effectVictim({ kind: "king_only", against: "b", turns: 1 }) === "b", "king_only afflicts its target");
}

// 7. Hygiene: nothing transient survives a snapshot round-trip, and the log is
//    reset every cycle rather than accumulating.
{
  const game = freshGame();
  playAny(game);
  playAny(game);
  const snap = serializeGame(game) as Record<string, unknown>;
  check(!("fx" in snap), "snapshots carry no fx log");
  check(!("lastNerfFilter" in snap), "snapshots carry no nerf filter report");
  check(!snap.buffs || !("fxEvents" in (snap.buffs as object)), "buff state carries no event fields");
  const before = game.fx;
  playAny(game);
  check(game.fx !== before, "each apply cycle starts a fresh log");
}

if (failures) {
  console.error(`\n${failures} fx-event assertion(s) failed`);
  process.exit(1);
}
console.log("fx events: OK");
