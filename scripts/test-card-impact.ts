// Card-impact checks. Run with:
//   npx -y tsx scripts/test-card-impact.ts
//
// The existing lab gate (npm run test:lab) grants every card, plays 12 random
// plies, and passes as long as nothing throws. That catches crashes but not
// SILENCE, and silence is the failure mode that actually shipped: five wave-4
// hexes and one tier-6 card were live in the draft pool for weeks doing
// literally nothing, while the lab harness and the card audit both called them
// healthy.
//
// This harness asks the other question. Each case plays one scripted line twice
// - once with the card, once without - and asserts the carded run DIVERGES from
// the control in the opponent's legal-move count or the active-effect set. A
// card that promises a restriction and changes nothing is a FAIL.
//
// Cases are hand-written because the provocation matters: a curse on queenside
// captures does nothing down a line with no captures, and that is correct
// behaviour, not a bug. Adding a case here is the cheap way to pin a card whose
// mechanic you just touched.

import { BUFF_BY_ID } from "../src/engine/buffs/library";
import { moveToUCI } from "../src/engine/board";
import {
  UNRESTRICTED_NERF,
  acquireBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} from "../src/engine/game";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} - ${detail}`);
  if (!ok) failures++;
}

interface Trace {
  /** Legal-move count on each of the victim's turns. */
  counts: (number | string)[];
  /** Active board effects at the end of the line. */
  effects: number;
}

/** Play `line` with `cardId` held by white, tracing black's options. */
function trace(cardId: string | null, line: string[]): Trace {
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  enableDraftMode(g, 9, { mode: "buff" });
  if (cardId) {
    const def = BUFF_BY_ID[cardId];
    if (!def) throw new Error(`unknown card ${cardId}`);
    acquireBuff(g, "w", cardId, def.tier);
  }
  const counts: (number | string)[] = [];
  for (const uci of line) {
    if (g.board.turn === "b") counts.push(legalMoves(g).length);
    const m = legalMoves(g).find((x) => moveToUCI(x) === uci);
    if (!m) {
      // The card made a scripted move illegal, which is itself a divergence.
      counts.push(`blocked:${uci}`);
      break;
    }
    g = playMove(g, m);
  }
  return { counts, effects: (g.buffs?.effects ?? []).length };
}

/** A card must visibly change the game along a line that provokes it. */
function mustBite(cardId: string, line: string[], why: string) {
  const control = trace(null, line);
  const carded = trace(cardId, line);
  const diverged =
    JSON.stringify(control.counts) !== JSON.stringify(carded.counts) ||
    control.effects !== carded.effects;
  check(
    cardId,
    diverged,
    diverged
      ? `${why}: ${JSON.stringify(control.counts)} -> ${JSON.stringify(carded.counts)}`
      : `NO EFFECT along a line that should provoke it (${why}); control and carded runs are identical`,
  );
}

// A line where black pushes pawns and then captures: provokes the pawn and
// capture curses.
const PAWN_LINE = ["g1f3", "d7d5", "f3g1", "d5d4", "b1c3", "d4d3", "c3b1", "e7e5"];
// A line with a real capture by black, plus a follow-up move by the capturer.
const CAPTURE_LINE = ["e2e4", "d7d5", "g1f3", "d5e4", "f1c4", "e4e3"];
// Black walks a piece out past the halfway line.
const SORTIE_LINE = ["e2e4", "e7e5", "g1f3", "d8h4", "b1c3", "h4h5", "f1e2", "h5g4"];

// --- The six cards that shipped doing nothing at all -----------------------
// Each was a guaranteed no-op: the escape-curse helpers turned the restriction
// OFF while the escape was unspent and still ticked the duration down, so a
// one-turn curse expired before it could ever apply. Verified individually.

mustBite("hx4_early_frost", PAWN_LINE, "pawn advances must be restricted");
mustBite("hx4_hopscotch", PAWN_LINE, "light-square pawns must be restricted");
mustBite("hx4_tea_break", PAWN_LINE, "pieces far from the king must be restricted");
mustBite("hx4_hiccups", PAWN_LINE, "pieces past their own half must be restricted");
mustBite("hx4_matins_bell", CAPTURE_LINE, "queenside captures must be restricted");
mustBite("ov_paperwork_avalanche", CAPTURE_LINE, "a capturing piece must be frozen");

// --- The two-turn escape curses, same family ------------------------------

// (hx4_buttoned_scabbard is the same family but only blocks king captures, and
// the first one is precisely what the escape hands back, so pinning it would
// need a line with two king captures. Covered structurally by the two below.)
mustBite("hx4_tar_flood", PAWN_LINE, "moves onto their third rank must be restricted");
mustBite("hx4_dead_calm", SORTIE_LINE, "long slider moves must be restricted");

// --- Control: the harness must be able to FAIL ----------------------------
// A card whose mechanic cannot fire down this line should look identical to the
// control, proving mustBite is measuring something real rather than always
// diverging.
{
  const control = trace(null, PAWN_LINE);
  const unrelated = trace("hx4_matins_bell", PAWN_LINE);
  check(
    "harness self-check",
    JSON.stringify(control.counts) === JSON.stringify(unrelated.counts),
    "a capture curse down a captureless line matches the control, so divergence is not automatic",
  );
}

console.log(
  failures === 0
    ? "\nPASS: every card measurably affected the game."
    : `\nFAIL: ${failures} card(s) had no measurable effect.`,
);
process.exit(failures === 0 ? 0 : 1);
