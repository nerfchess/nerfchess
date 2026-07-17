// Timeline adapter: turns the raw draft/card events of a game into rows the
// move timeline (MoveList) renders beside the vanilla moves. See
// docs/2026-07-17-timeline-cards-notation-spec.md.
//
// This module is pure and UI-free: it owns the card-notation (CN) grammar and
// the event shape, so the same logic serves the live AI game, online play,
// spectating, and archived review once each feeds it its own event source.

import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { PublicMutation } from "@/engine/buff";
import type { Color, PieceType } from "@/engine/types";
import { squareName } from "@/engine/types";

/** One non-move event on the timeline, positioned by the number of accepted
 *  moves that had been played when it fired (`ply`) and its order within that
 *  ply (`cursor`). Moves themselves are NOT TimelineEvents — MoveList still
 *  builds those from the move list; these interleave between move rows. */
export interface TimelineEvent {
  ply: number;
  cursor: number;
  color: Color;
  /** pick/bank/reroll are draft chips; use/instant/grant are card plays that
   *  may carry board notation (`fx`). */
  kind: "pick" | "bank" | "reroll" | "use" | "instant" | "grant";
  /** The card. Omitted for `bank`/`reroll`, and withheld for a masked play
   *  (owner grant) — render `?` in that case. */
  cardId?: string;
  tier?: number;
  /** A play whose card identity must stay hidden (owner grant): show the board
   *  consequence, never the name. */
  masked?: boolean;
  /** Board mutations this event performed, in order (card plays only). */
  fx?: PublicMutation[];
}

/** Human name for a card id, falling back to the raw id so an unknown card
 *  (older/newer library) still renders instead of throwing. */
export function cardLabel(id: string | undefined): string {
  if (!id) return "Card";
  return BUFF_BY_ID[id]?.name ?? id;
}

const P = (t: PieceType) => t.toUpperCase();

/** One board mutation as a CN token. */
export function formatMutation(m: PublicMutation): string {
  switch (m.op) {
    case "summon":
      return `${P(m.type)}@${squareName(m.sq)}`;
    case "remove":
      return `x${squareName(m.sq)}`;
    case "teleport":
      return `${squareName(m.from)}>${squareName(m.to)}`;
    case "transform":
      return `${squareName(m.sq)}=${P(m.into)}`;
    case "convert":
      return `${squareName(m.sq)}~`;
    case "swap":
      return `${squareName(m.a)}<>${squareName(m.b)}`;
  }
}

/** The notation clause for a card play's board effects (empty when it did
 *  nothing to the board — a lingering effect, a reveal, a draft manipulation).
 *  A whole-board rewrite (Genesis, a reset) collapses to `#reset` past a
 *  threshold so it reads as one token instead of dozens. */
export function formatFx(fx: PublicMutation[] | undefined): string {
  if (!fx || fx.length === 0) return "";
  if (fx.length > 8) return "#reset";
  return fx.map(formatMutation).join(", ");
}

/** The full CN label for a card play: `Name! effects`, or `?! effects` when
 *  masked, or just `Name!` when the play had no board effect. */
export function formatPlay(ev: TimelineEvent): string {
  const head = ev.masked ? "?" : cardLabel(ev.cardId);
  const fx = formatFx(ev.fx);
  return fx ? `${head}! ${fx}` : `${head}!`;
}

/** Group events by the ply they fired at, each group ordered by cursor. A
 *  MoveList row for ply N renders group N after the move; group 0 renders
 *  before the first move. */
export function eventsByPly(events: TimelineEvent[]): Map<number, TimelineEvent[]> {
  const out = new Map<number, TimelineEvent[]>();
  for (const ev of events) {
    const arr = out.get(ev.ply) ?? [];
    arr.push(ev);
    out.set(ev.ply, arr);
  }
  for (const arr of out.values()) arr.sort((a, b) => a.cursor - b.cursor);
  return out;
}
