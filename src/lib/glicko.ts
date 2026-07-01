// Glicko-2 rating math (http://www.glicko.net/glicko/glicko2.pdf), single-game
// updates. Used for the local bot ladder (lib/rating.ts) and for rated online
// games (server side), so it must stay dependency-free and environment-agnostic.

const TAU = 0.5;
const SCALE = 173.7178;

export interface GlickoRating {
  rating: number;
  rd: number;
  vol: number;
}

export const GLICKO_DEFAULT: GlickoRating = { rating: 1500, rd: 350, vol: 0.06 };

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number) {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

// score: 1 = win for `player`, 0.5 = draw, 0 = loss.
export function glickoUpdate(player: GlickoRating, opponent: GlickoRating, score: 0 | 0.5 | 1): GlickoRating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const muJ = (opponent.rating - 1500) / SCALE;
  const phiJ = opponent.rd / SCALE;
  const gJ = g(phiJ);
  const eJ = E(mu, muJ, phiJ);
  const v = 1 / (gJ * gJ * eJ * (1 - eJ));
  const delta = v * gJ * (score - eJ);

  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 30 && Math.abs(B - A) > 1e-6; i++) {
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
  const newVol = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gJ * (score - eJ);

  return {
    rating: newMu * SCALE + 1500,
    rd: newPhi * SCALE,
    vol: newVol,
  };
}

// Updates both sides of one game from their pre-game ratings.
// scoreForA: 1 = A won, 0.5 = draw, 0 = B won.
export function glickoUpdatePair(
  a: GlickoRating,
  b: GlickoRating,
  scoreForA: 0 | 0.5 | 1,
): { a: GlickoRating; b: GlickoRating } {
  const scoreForB = (1 - scoreForA) as 0 | 0.5 | 1;
  return {
    a: glickoUpdate(a, b, scoreForA),
    b: glickoUpdate(b, a, scoreForB),
  };
}
