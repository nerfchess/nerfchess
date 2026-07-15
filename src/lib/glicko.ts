// Glicko-2 rating math (http://www.glicko.net/glicko/glicko2.pdf), run the way
// lichess runs it: every game is its own one-game rating period, applied
// instantly for both players. Used for the local bot ladder (lib/rating.ts)
// and for rated online games (server side, src/lib/server/games.ts), so it
// must stay dependency-free and environment-agnostic.
//
// System constants (lichess parity — sourced from lichess-org/lila
// modules/rating Glicko.scala and lichess-org/scalachess rating/glicko):
//   tau = 0.75, start = 1500 / RD 500 / volatility 0.09,
//   RD floor 45 (lichess minDeviation), RD cap 500 (lichess maxDeviation),
//   provisional while RD > 110 (lichess provisionalDeviation).
// Sanity clamps applied to every update's OUTPUT (never to the math's inputs,
// so the algorithm itself stays the paper's):
//   RD in [45, 500], volatility in [0.01, 0.1], |rating delta| <= 700
//   (lichess maxRatingDelta — a brand-new account CAN and SHOULD swing
//   hundreds of points in its first games; only pathological inputs hit 700).
//
// Rating periods: lichess ties the paper's per-period deviation increase to
// wall-clock inactivity (ratingPeriodsPerDay = 0.21436), NOT to games played,
// so for active players the sigma^2 inflation per game is ~0 and RD decays
// monotonically to the 45 floor. We model the same behavior with
// `elapsedPeriods` (default 0 = active play, lichess-style); pass 1 to
// reproduce the paper's full-period example.

export interface GlickoRating {
  rating: number;
  rd: number;
  vol: number;
}

/** System constant tau: constrains volatility change per game. */
export const GLICKO_TAU = 0.75;

const SCALE = 173.7178; // glicko2 <-> glicko1 scale
const CONVERGENCE_EPS = 1e-6; // step 5.1 epsilon from the paper
const MAX_VOL_ITERATIONS = 100;

export const RATING_START = 1500;
/** Lichess default deviation (= maxDeviation 500 in lila's Glicko.scala). A
 *  new account is maximally uncertain, so its first games swing hundreds of
 *  points and converge on true strength within a handful of games. */
export const RD_START = 500;
export const VOL_START = 0.09;

// Output clamps (lichess minDeviation / maxDeviation / maxVolatility).
export const RD_MIN = 45;
export const RD_MAX = 500;
export const VOL_MIN = 0.01;
export const VOL_MAX = 0.1;
/** Sanity cap on how far one game can move a rating, against pathological
 *  inputs (corrupt rows, absurd RD combinations). Lichess's maxRatingDelta is
 *  700; normal games — including a brand-new account's first win, worth
 *  200-300 points — never come close. */
export const MAX_RATING_DELTA = 700;

/** A rating is provisional (rendered "1500?") while its RD is above this. */
export const PROVISIONAL_RD = 110;

export const GLICKO_DEFAULT: GlickoRating = { rating: RATING_START, rd: RD_START, vol: VOL_START };

export function isProvisional(r: Pick<GlickoRating, "rd">): boolean {
  return r.rd > PROVISIONAL_RD;
}

export type GlickoScore = 0 | 0.5 | 1;

export interface GlickoResult {
  opponent: GlickoRating;
  /** 1 = win for the player being updated, 0.5 = draw, 0 = loss. */
  score: GlickoScore;
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function finite(x: number, fallback: number): number {
  return Number.isFinite(x) ? x : fallback;
}

// Repair a stored rating that has gone non-finite / non-positive (corrupt row,
// bad seed) before feeding it to the math. Valid values pass through untouched
// so the algorithm sees exactly what the paper expects.
function sane(r: GlickoRating): GlickoRating {
  const rating = finite(r.rating, RATING_START);
  let rd = finite(r.rd, RD_START);
  if (rd <= 0) rd = RD_START;
  if (rd > RD_MAX) rd = RD_MAX;
  let vol = finite(r.vol, VOL_START);
  if (vol <= 0) vol = VOL_START;
  if (vol > VOL_MAX) vol = VOL_MAX;
  return { rating, rd, vol };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

// Step 5 of the paper: new volatility sigma', found with the iterative
// Illinois-method root search on f(x).
function newVolatility(phi: number, v: number, delta: number, vol: number, tau: number): number {
  const a = Math.log(vol * vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };

  // 5.2: initial bounds.
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }

  // 5.3-5.4: Illinois iteration until |B - A| <= epsilon.
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < MAX_VOL_ITERATIONS && Math.abs(B - A) > CONVERGENCE_EPS; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  return Math.exp(A / 2);
}

/** Full Glicko-2 rating-period update: one player against any number of
 *  results. `tau` and `elapsedPeriods` are parameterized so the algorithm is
 *  verifiable against the multi-game test vector in Glickman's paper (which
 *  uses tau 0.5 and one full period); production callers use the defaults.
 *
 *  `elapsedPeriods` scales the paper's step-6 deviation increase
 *  (phi* = sqrt(phi^2 + elapsed * sigma'^2)). Lichess ties it to wall-clock
 *  inactivity (0.21436 periods/day), so between back-to-back games it is ~0 —
 *  that is what lets an active player's RD settle to the 45 floor instead of
 *  plateauing near ~75 the way a full period per game would force. We don't
 *  track per-bucket timestamps, so production uses 0 (the active-play case). */
export function glickoUpdateMany(
  player: GlickoRating,
  results: readonly GlickoResult[],
  tau: number = GLICKO_TAU,
  elapsedPeriods = 0,
): GlickoRating {
  const p = sane(player);
  if (!results.length) return p;

  // Steps 1-2: convert to the glicko2 scale.
  const mu = (p.rating - RATING_START) / SCALE;
  const phi = p.rd / SCALE;

  // Steps 3-4: estimated variance v and improvement delta.
  let vInv = 0;
  let deltaSum = 0; // sum of g(phiJ) * (score - E)
  for (const { opponent, score } of results) {
    const o = sane(opponent);
    const muJ = (o.rating - RATING_START) / SCALE;
    const phiJ = o.rd / SCALE;
    const gJ = g(phiJ);
    const eJ = E(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Step 5: new volatility (clamped to sane bounds).
  const vol = clamp(newVolatility(phi, v, delta, p.vol, tau), VOL_MIN, VOL_MAX);

  // Steps 6-7: new RD and rating. The deviation increase is scaled by elapsed
  // rating periods, lichess-style (0 for active play — see the module header).
  const phiStar = Math.sqrt(phi * phi + elapsedPeriods * vol * vol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  // Step 8: back to the display scale, with output clamps.
  const rawRating = newMu * SCALE + RATING_START;
  const rating = clamp(rawRating, p.rating - MAX_RATING_DELTA, p.rating + MAX_RATING_DELTA);
  const rd = clamp(newPhi * SCALE, RD_MIN, RD_MAX);
  return { rating, rd, vol };
}

/** One-game update (lichess-style: one game = one rating period).
 *  score: 1 = win for `player`, 0.5 = draw, 0 = loss. */
export function glickoUpdate(player: GlickoRating, opponent: GlickoRating, score: GlickoScore): GlickoRating {
  return glickoUpdateMany(player, [{ opponent, score }]);
}

// Updates both sides of one game from their pre-game ratings.
// scoreForA: 1 = A won, 0.5 = draw, 0 = B won.
export function glickoUpdatePair(
  a: GlickoRating,
  b: GlickoRating,
  scoreForA: GlickoScore,
): { a: GlickoRating; b: GlickoRating } {
  const scoreForB = (1 - scoreForA) as GlickoScore;
  return {
    a: glickoUpdate(a, b, scoreForA),
    b: glickoUpdate(b, a, scoreForB),
  };
}
