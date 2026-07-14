// Shared contract for the first-game onboarding tour.
//
// The guided game is a REAL local bot game: /tutorial/first-game renders the
// existing /game page component configured by query params (weakest bot, no
// clock, buff mode) and layers coach marks on top. The game page never knows
// about the tour beyond one additive hook: with ?tour=1 it broadcasts a tiny
// read-only snapshot of tour-relevant state (TOUR_STATE_EVENT) after every
// game update, and FirstGameTour listens to gate its steps on real play.
//
// This module is plain data + tiny helpers so both server components (the
// /tutorial entry page) and client components can import it.

/** localStorage flag set once the tour is finished or deliberately skipped. */
export const TUTORIAL_DONE_KEY = "nerf.tutorialDone";

/** localStorage flag set when the /play nudge chip is dismissed without
 * taking the tour (dismissing the chip is not completing the tour). */
export const TUTORIAL_NUDGE_DISMISSED_KEY = "nerf.tutorialNudgeDismissed";

/** CustomEvent name the game page dispatches (only with ?tour=1). */
export const TOUR_STATE_EVENT = "nerfchess:tour-state";

/** The guided game's fixed configuration: weakest bot, the player as White
 * (so the first move is immediately theirs), no clock, casual, buff mode
 * (drafts are the whole point of the tour). */
export const FIRST_GAME_TOUR_QUERY =
  "difficulty=easy&color=w&t=0&inc=0&rated=0&mode=buff&tour=1";

export const FIRST_GAME_TOUR_HREF = `/tutorial/first-game?${FIRST_GAME_TOUR_QUERY}`;

/** Read-only snapshot of the live game, broadcast by the game page. */
export interface TourGameState {
  /** False until the game object exists (bootstrap / restore finished). */
  ready: boolean;
  /** How many moves the PLAYER has made (drafts fire every 5 of these). */
  myMoves: number;
  /** It is the player's turn to move. */
  myTurn: boolean;
  /** The player's draft overlay is open (a card offer awaits them). */
  offerOpen: boolean;
  /** Cards the player holds (spent ones included). */
  heldBuffs: number;
  /** The player banked a draft and is owed a stronger next offer. */
  banked: boolean;
  /** The game has ended. */
  over: boolean;
}

export const EMPTY_TOUR_STATE: TourGameState = {
  ready: false,
  myMoves: 0,
  myTurn: false,
  offerOpen: false,
  heldBuffs: 0,
  banked: false,
  over: false,
};

export function markTutorialDone() {
  try {
    window.localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    // Private mode / storage disabled: the tour still works, it just re-offers.
  }
}
