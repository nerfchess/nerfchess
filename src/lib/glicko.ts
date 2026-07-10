// Glicko-2 rating math (http://www.glicko.net/glicko/glicko2.pdf), run the way
// lichess runs it: every game is its own one-game rating period, applied
// instantly for both players. Used for the local bot ladder (lib/rating.ts)
// and for rated online games (server side, src/lib/server/games.ts), so it
// must stay dependency-free and environment-agnostic.
//
// System constants (lichess-style):
//   tau = 0.75, start = 1500 / RD 350 / volatility 0.09.
// Sanity clamps applied to every update's OUTPUT (never to the math's inputs,
// so the algorithm itself stays the paper's):
//   RD in [45, 350], volatility in [0.01, 0.1], |rating delta| <= 150.

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
export const RD_START = 350;
export const VOL_START = 0.09;

// Output clamps.
export const RD_MIN = 45;
export const RD_MAX = 350;
export const VOL_MIN = 0.01;
export const VOL_MAX = 0.1;
/** Sanity cap on how far one game can move a rating, against pathological
 *  inputs (corrupt rows, absurd RD combinations). Normal games never hit it. */
export const MAX_RATING_DELTA = 150;

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
 *  results. In lichess-style operation a period is exactly one game, but the
 *  general form is kept so the algorithm is verifiable against the multi-game
 *  test vector in Glickman's paper. `tau` is parameterized for the same reason
 *  (the paper's example uses 0.5); production callers use the default. */
export function glickoUpdateMany(
  player: GlickoRating,
  results: readonly GlickoResult[],
  tau: number = GLICKO_TAU,
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

  // Steps 6-7: new RD and rating.
  const phiStar = Math.sqrt(phi * phi + vol * vol);
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
