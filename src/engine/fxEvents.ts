// Transient fx-event log: the engine's narration track for the animation layer.
//
// Every observable "fruition" moment — a nerf actually constraining its holder,
// a passive hook firing, a board effect landing on (or lifting from) a victim,
// a card raiding the clock — is appended here as it happens inside an apply
// cycle (playMove / acquireBuff / activateBuff). The UI drains the list after
// each engine call and turns it into animation; game logic NEVER reads it.
//
// Lifetime rules (same posture as mutations / lastHookMutations / clockFx):
//  - `game.fx` is reset at the start of each apply cycle and holds only that
//    cycle's events.
//  - It is never serialized: serializeGame builds snapshots by picking fields,
//    so the log simply isn't among them, and deserializeGame never recreates it.
//  - Replicas rebuilding from the move record regenerate the LAST cycle's
//    events like any other transient; consumers must cursor on `ply` so a
//    rebuild never replays stale art (see useFxEvents in the effects layer).
//  - Events are derived data. Emitting them must not touch persistent RNG or
//    any synced state, so a replica that skips emission stays byte-identical.

import type { ActiveEffect, BuffMatchState, ClockRequest } from "./buff";
import type { Color, Square } from "./types";

/** The side an effect constrains (the one a receive animation should address).
 * Benefit-side kinds (shield, king_safe, nerf_suspended) constrain the OTHER
 * color's options; affliction kinds sit on the afflicted piece's owner. */
export function effectVictim(e: ActiveEffect): Color {
  switch (e.kind) {
    case "freeze":
    case "walnut":
    case "timed_loss":
    case "short_leash":
    case "cosmetic":
      return e.owner;
    case "shield":
    case "king_safe":
    case "nerf_suspended":
    case "strike":
    case "bonk":
      return e.owner === "w" ? "b" : "w";
    case "barred":
    case "no_pawn_advance":
    case "king_only":
      return e.against;
  }
}

/** True for kinds that are good news for their victim's opponent but carry no
 * sting for the victim themselves (pure visuals ride along as cosmetic). */
export function effectIsCosmetic(e: ActiveEffect): boolean {
  return e.kind === "cosmetic" || e.kind === "strike" || e.kind === "bonk";
}

export type FxEvent =
  /** A held passive's onMovePlayed hook observably fired this cycle. */
  | { kind: "passive-fired"; color: Color; cardId: string; ply: number }
  /** A board effect landed. `victim` is the constrained side; `sourceCardId`
   * is the card whose hook or activation created it, when known. */
  | { kind: "effect-applied"; effect: ActiveEffect; victim: Color; sourceCardId?: string; ply: number }
  /** A board effect ticked out, was pruned, or was consumed. */
  | { kind: "effect-expired"; effect: ActiveEffect; victim: Color; ply: number }
  /** A card asked the server to adjust the match clocks. The authoritative
   * deltas arrive via clock frames; this event exists so the client can stage
   * the raid art the moment the request is made. */
  | { kind: "clock-fx"; caster: Color; request: ClockRequest; sourceCardId?: string; ply: number }
  /** The mover's nerf filter removed at least one otherwise-legal move this
   * turn. `fromSquares` are the (capped) squares whose pieces lost EVERY move
   * they had — where a "constrained" pulse lands hardest. */
  | { kind: "nerf-constrained"; color: Color; nerfId: string; removed: number; fromSquares: Square[]; ply: number }
  /** The empty-list safety net relaxed the mover's nerf for this one turn. */
  | { kind: "nerf-relaxed"; color: Color; nerfId: string; ply: number }
  /** The mover's nerf onTurnStart hook advanced its state (a counter ticked,
   * a phase flipped) — the per-turn heartbeat of a stateful handicap. */
  | { kind: "nerf-turnstart"; color: Color; nerfId: string; ply: number };

/** The slice of NerfGame the emitters need. Kept structural so fxEvents never
 * imports game.ts (game.ts imports us). */
export interface FxCarrier {
  board: { history: unknown[] };
  buffs?: BuffMatchState;
  /** The transient event log itself. */
  fx?: FxEvent[];
}

/** Hard cap so a pathological cycle can never balloon the log. */
const FX_CAP = 48;

export function beginFxCycle(game: FxCarrier): void {
  game.fx = [];
}

export function pushFxEvent(game: FxCarrier, ev: FxEvent): void {
  const fx = (game.fx ??= []);
  if (fx.length < FX_CAP) fx.push(ev);
}

export function fxPly(game: FxCarrier): number {
  return game.board.history.length;
}

/** Snapshot the current effect list by reference, for delta emission around a
 * hook or activation. Effects are mutated in place (timers tick) but object
 * identity is stable within a cycle, which is all the diff needs. */
export function snapshotEffects(game: FxCarrier): ReadonlySet<ActiveEffect> {
  return new Set(game.buffs?.effects ?? []);
}

/** Emit effect-applied for effects that appeared since `before`, and
 * effect-expired for ones that vanished. `sourceCardId` attributes additions
 * to the card whose hook/activation ran between the snapshots. */
export function emitEffectDelta(
  game: FxCarrier,
  before: ReadonlySet<ActiveEffect>,
  sourceCardId?: string,
): void {
  const bs = game.buffs;
  if (!bs) return;
  const ply = fxPly(game);
  const after = new Set(bs.effects);
  for (const e of bs.effects) {
    if (!before.has(e)) {
      pushFxEvent(game, { kind: "effect-applied", effect: e, victim: effectVictim(e), sourceCardId, ply });
    }
  }
  for (const e of before) {
    if (!after.has(e)) {
      pushFxEvent(game, { kind: "effect-expired", effect: e, victim: effectVictim(e), ply });
    }
  }
}

/** Emit clock-fx for requests pushed since `beforeLen` (the clockFx length
 * captured before a hook/activation ran). */
export function emitClockDelta(game: FxCarrier, beforeLen: number, sourceCardId?: string): void {
  const bs = game.buffs;
  if (!bs?.clockFx) return;
  const ply = fxPly(game);
  for (const request of bs.clockFx.slice(beforeLen)) {
    pushFxEvent(game, { kind: "clock-fx", caster: request.caster, request, sourceCardId, ply });
  }
}

/** The nerf filter's per-call report, written by legalMoves as it applies the
 * mover's handicap and folded into one fx event per ply by playMove. Transient:
 * recomputed on every legalMoves call, identical every time for a given
 * position, and never serialized (lives on the game, not the snapshot). */
export interface NerfFilterReport {
  color: Color;
  nerfId: string;
  /** Moves the filter removed (0 when the nerf let everything through). */
  removed: number;
  /** The safety net fired: the filter emptied the list and was relaxed. */
  relaxed: boolean;
  /** Squares whose pieces lost every move they had, capped. */
  fromSquares: Square[];
}

const FROM_SQUARES_CAP = 8;

/** Build the report for one filter application. Cheap when nothing was
 * removed; the square diff only runs when the filter actually bit. */
export function nerfFilterReport(
  color: Color,
  nerfId: string,
  before: { from: Square }[],
  after: { from: Square }[],
  relaxed: boolean,
): NerfFilterReport {
  const removed = relaxed ? 0 : before.length - after.length;
  let fromSquares: Square[] = [];
  if (removed > 0) {
    const kept = new Set(after.map((m) => m.from));
    const seen = new Set<Square>();
    for (const m of before) {
      if (kept.has(m.from) || seen.has(m.from)) continue;
      seen.add(m.from);
      if (fromSquares.length < FROM_SQUARES_CAP) fromSquares.push(m.from);
    }
  }
  return { color, nerfId, removed, relaxed, fromSquares };
}

/** Convert the freshest filter report into at most one fx event. Called once
 * per apply cycle, after the final legalMoves evaluation for the new mover. */
export function emitNerfFilterFx(game: FxCarrier & { lastNerfFilter?: NerfFilterReport | null }): void {
  const report = game.lastNerfFilter;
  if (!report) return;
  const ply = fxPly(game);
  if (report.relaxed) {
    pushFxEvent(game, { kind: "nerf-relaxed", color: report.color, nerfId: report.nerfId, ply });
  } else if (report.removed > 0) {
    pushFxEvent(game, {
      kind: "nerf-constrained",
      color: report.color,
      nerfId: report.nerfId,
      removed: report.removed,
      fromSquares: report.fromSquares,
      ply,
    });
  }
}
