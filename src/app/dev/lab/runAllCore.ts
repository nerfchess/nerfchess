// Shared run-all harness core for the Card Laboratory (/dev/lab) and the
// headless gate (scripts/lab-run-all.ts). Pure engine code, no React, no DOM:
// for every implemented card it builds a fresh sandbox game, grants the card,
// auto-activates it with first-candidate picks (the same targets() walk
// aiChooseBuffActivation performs, minus the value thresholds), then advances
// a fixed number of plies with random legal moves off a seeded RNG. Every
// thrown error is caught and reported per card, so a silently broken card
// becomes a visible FAIL row instead of a runtime landmine mid-game.
//
// Relative imports on purpose: scripts/lab-run-all.ts runs this through tsx,
// which must resolve the modules without Next's "@/" alias.

import { ALL_BUFFS } from "../../../engine/buffs/library";
import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  bankDraft,
  buffNextTarget,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} from "../../../engine/game";
import { RNG } from "../../../engine/rng";
import type { Buff, BuffPick } from "../../../engine/buff";
import type { Color } from "../../../engine/types";

/** Fixed seed so every run (browser or CLI) replays the identical games. */
export const LAB_RUN_SEED = 0x1ab5eed;

/** Plies of random play after the grant/activation, per card. */
export const LAB_RUN_PLIES = 12;

export interface RunAllRow {
  id: string;
  name: string;
  tier: number;
  mechanic: Buff["kind"];
  /** acquireBuff appended a live instance. */
  granted: "ok" | "failed";
  /** Activated cards: fired with first-candidate picks, or had no valid use.
   * "auto" covers instants (fire on grant) and passives (run while held). */
  activated: "ok" | "no-valid-use" | "auto" | "failed";
  /** Random plies actually advanced after the card landed. */
  plies: number;
  error: string | null;
}

export function runnableCards(): Buff[] {
  return ALL_BUFFS.filter((b) => b.implemented);
}

/** Fresh sandbox: no nerfs, draft mode on, opener offers cleared so the
 * board is immediately playable. */
export function freshLabGame(seed: number = LAB_RUN_SEED): NerfGame {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g, seed + 1, { mode: "buff" });
  if (g.buffs) {
    g.buffs.players.w.offer = null;
    g.buffs.players.b.offer = null;
  }
  return g;
}

/** Walk targets() picking the FIRST candidate at each step (the lab's dumb
 * auto-aim). Returns the completed pick list, or null when the card has no
 * valid use right now (an empty non-finishable first step). */
export function firstCandidatePicks(
  game: NerfGame,
  color: Color,
  buffIndex: number,
): BuffPick[] | null {
  const picks: BuffPick[] = [];
  for (let step = 0; step < 16; step++) {
    const target = buffNextTarget(game, color, buffIndex, picks);
    if (!target) return picks;
    if (target.kind === "square") {
      if (target.squares.length === 0) {
        // A finishable step with picks in hand can stop here; an empty first
        // step means the card is currently unusable.
        return target.finishable && picks.length > 0 ? picks : null;
      }
      picks.push({ square: target.squares[0] });
    } else {
      if (target.options.length === 0) return picks.length > 0 ? picks : null;
      picks.push({ buffIndex: target.options[0].index });
    }
  }
  return picks;
}

function errText(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

/** Run the full grant / activate / advance loop for one card. Never throws:
 * every engine failure lands in row.error. */
export function runOneCard(
  def: Buff,
  opts?: { plies?: number; seed?: number },
): RunAllRow {
  const plies = opts?.plies ?? LAB_RUN_PLIES;
  const seed = opts?.seed ?? LAB_RUN_SEED;
  const row: RunAllRow = {
    id: def.id,
    name: def.name,
    tier: def.tier,
    mechanic: def.kind,
    granted: "failed",
    activated: "auto",
    plies: 0,
    error: null,
  };
  const fail = (phase: string, e: unknown) => {
    if (!row.error) row.error = `${phase}: ${errText(e)}`;
  };

  let game: NerfGame;
  try {
    game = freshLabGame(seed);
  } catch (e) {
    fail("setup", e);
    return row;
  }

  const color: Color = "w";
  let index = -1;
  try {
    const ps = game.buffs!.players[color];
    index = ps.buffs.length;
    acquireBuff(game, color, def.id, def.tier);
    row.granted = ps.buffs.length > index ? "ok" : "failed";
    if (row.granted === "failed") {
      row.error = "grant: acquireBuff added no instance";
    }
  } catch (e) {
    fail("grant", e);
    return row;
  }

  if (row.granted === "ok" && def.kind === "activated" && !game.result) {
    try {
      const picks = firstCandidatePicks(game, color, index);
      if (picks == null) {
        row.activated = "no-valid-use";
      } else if (activateBuff(game, color, index, picks)) {
        row.activated = "ok";
      } else {
        row.activated = "failed";
        row.error = "activate: activateBuff returned false";
      }
    } catch (e) {
      row.activated = "failed";
      fail("activate", e);
    }
  }

  // Advance random plies off the fixed seed, banking any cadence offers so
  // the game never stalls behind an open draft. Errors here are the harness's
  // whole point: a card whose hook explodes three moves later surfaces now.
  try {
    const rng = new RNG((seed ^ 0x9e3779b9) >>> 0);
    for (let i = 0; i < plies && !game.result; i++) {
      for (const c of ["w", "b"] as const) {
        if (game.buffs?.players[c].offer) bankDraft(game, c);
      }
      const moves = legalMoves(game);
      if (moves.length === 0) break;
      playMove(game, moves[rng.int(moves.length)]);
      row.plies = i + 1;
    }
  } catch (e) {
    fail(`advance (ply ${row.plies + 1})`, e);
  }
  return row;
}

export interface RunAllSummary {
  total: number;
  pass: number;
  fail: number;
  noValidUse: number;
  failures: RunAllRow[];
}

export function rowFailed(row: RunAllRow): boolean {
  return row.error != null || row.granted !== "ok" || row.activated === "failed";
}

export function summarize(rows: RunAllRow[]): RunAllSummary {
  const failures = rows.filter(rowFailed);
  return {
    total: rows.length,
    pass: rows.length - failures.length,
    fail: failures.length,
    noValidUse: rows.filter((r) => r.activated === "no-valid-use").length,
    failures,
  };
}
