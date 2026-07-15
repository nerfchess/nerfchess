// Shared board reconstruction for the "lite" spectator surfaces (Nerf Chess TV
// and the landing-page hero). Both stream a game over an MPSession and paint a
// single featured board.
//
// The bug this fixes: those surfaces used to rebuild the board with
// replayUci(moves) — a MOVES-ONLY replay. In a draft (buff) game a card can
// REWRITE the board mid-game (summon, removal, teleport, drop, timed loss),
// which move history cannot reproduce, so the featured board rendered WRONG
// after such a play. The authoritative reconstruction interleaves the moves
// with the public draft-action record through the engine (buildSpectatorDraftGame,
// the same replica the full spectator view trusts), which reproduces every
// rewrite — so TV shows the true board.
//
// Archived (recent) games only carry a UCI move string, never the action record,
// so they keep the moves-only path (a rewrite there degrades to a truncated
// replay, the best a recordless archive allows — see ReplayView).

import { replayUci } from "@/lib/gameReview";
import { buildSpectatorDraftGame } from "@/lib/draftOnline";
import type { BoardState, Color, Move } from "@/engine/types";
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

/** The featured board. Draft games (live, with the action record) reconstruct
 *  through the engine so board rewrites are reproduced; everything else uses the
 *  plain move replay. */
export function featuredBoard(
  live: boolean,
  shownMoves: string[],
  d: FeaturedDraft,
): { board: BoardState; history: Move[] } {
  if (live && d.draft) {
    const g = buildSpectatorDraftGame(shownMoves, d.dtActions, d.dtState, d.mode);
    return { board: g.board, history: g.board.history };
  }
  const replayed = replayUci(shownMoves);
  return { board: replayed.board, history: replayed.history };
}
