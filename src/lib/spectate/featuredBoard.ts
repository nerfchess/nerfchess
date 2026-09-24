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
import type { BoardState, Move } from "@/engine/types";

export {
  appendFeaturedDraftAction,
  featuredDraftFromWatchStart,
  NOT_A_DRAFT,
  withFeaturedDraftState,
  type FeaturedDraft,
  type FeaturedDraftEvent,
} from "./featuredDraft";
import type { FeaturedDraft } from "./featuredDraft";

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
