// The featured board's public draft record and the helpers that grow it from a
// live watch. Split out of featuredBoard.ts so the watch hook (useFeaturedTune)
// can keep the record without importing the draft engine: featuredBoard.ts
// reaches buildSpectatorDraftGame, which pulls the rules engine and both card
// libraries, and the home page's hero only needs that for a live draft game.

import type { Color } from "@/engine/types";
import type { BuffPick, DraftMode } from "@/engine/buff";
import type { MPDraftAction, MPDraftCard, MPHiddenCard, MPWatchStart } from "@/lib/multiplayer";

/** The public draft record accumulated from a live watch, enough to rebuild the
 *  authoritative board. `draft: false` marks a plain game (moves-only replay). */
export interface FeaturedDraft {
  draft: boolean;
  mode?: DraftMode;
  dtActions: MPDraftAction[];
  dtState?: MPWatchStart["dtState"];
}

export const NOT_A_DRAFT: FeaturedDraft = { draft: false, dtActions: [] };

/** Seed the record from a watch-start (spectator bootstrap) payload. */
export function featuredDraftFromWatchStart(setup: MPWatchStart): FeaturedDraft {
  if (!setup.draft) return NOT_A_DRAFT;
  return {
    draft: true,
    mode: setup.mode,
    dtActions: setup.dtActions ? [...setup.dtActions] : [],
    dtState: setup.dtState,
  };
}

/** Append one live draft resolution to the record. `ply` is the accepted-move
 *  count at the moment it fired (so the engine interleaves it correctly). A
 *  no-op for plain games. Returns a new record (state-update friendly). */
export type FeaturedDraftEvent =
  | { kind: "used"; color: Color; buffIndex: number; picks: BuffPick[]; card?: MPDraftCard }
  | { kind: "resolved"; color: Color; picked: boolean; cards?: (MPDraftCard | MPHiddenCard)[] };

export function appendFeaturedDraftAction(
  d: FeaturedDraft,
  ply: number,
  action: FeaturedDraftEvent,
): FeaturedDraft {
  if (!d.draft) return d;
  const entry: MPDraftAction =
    action.kind === "used"
      ? { ply, color: action.color, a: "use", buffIndex: action.buffIndex, picks: action.picks, card: action.card }
      : action.picked
        ? { ply, color: action.color, a: "pick", cards: action.cards ?? [] }
        : { ply, color: action.color, a: "bank" };
  return { ...d, dtActions: [...d.dtActions, entry] };
}

/** Store an updated live draft-state snapshot (effects/buffs), used by the
 *  reconstruction for zone effects; a no-op for plain games. */
export function withFeaturedDraftState(d: FeaturedDraft, dtState: MPWatchStart["dtState"]): FeaturedDraft {
  if (!d.draft) return d;
  return { ...d, dtState };
}
