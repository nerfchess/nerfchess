// Glicko-2 lichess-parity checks. Run with:
//   npx -y tsx scripts/test-glicko.ts
//
// Verifies, against the parameters extracted from lichess (lila
// modules/rating Glicko.scala + scalachess rating/glicko):
//   1. The core math reproduces the worked example in Glickman's paper.
//   2. A brand-new account (1500, RD 500) gains way more than 150 for its
//      first win — lichess-style provisional swings, no 150-point cap.
//   3. RD decays on a lichess-like curve: non-provisional (<= 110) within a
//      handful of games, near the 45-60 settled band by ~30 games.
//   4. A house bot seeded settled (RD 60) stays settled: its seeded rating
//      and the roster spread are not wrecked by a few games.

import {
  glickoUpdate,
  glickoUpdateMany,
  glickoUpdatePair,
  isProvisional,
  MAX_RATING_DELTA,
  PROVISIONAL_RD,
  RD_MIN,
  RD_START,
  RATING_START,
  VOL_START,
  type GlickoRating,
  type GlickoScore,
} from "../src/lib/glicko";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  if (!ok) failures++;
}

// --- 1. Glickman's paper, example calculation (tau 0.5, one full period) ---
const paper = glickoUpdateMany(
  { rating: 1500, rd: 200, vol: 0.06 },
  [
    { opponent: { rating: 1400, rd: 30, vol: 0.06 }, score: 1 },
    { opponent: { rating: 1550, rd: 100, vol: 0.06 }, score: 0 },
    { opponent: { rating: 1700, rd: 300, vol: 0.06 }, score: 0 },
  ],
  0.5,
  1, // the paper's example applies the full-period deviation increase
);
check(
  "paper test vector",
  Math.abs(paper.rating - 1464.06) < 0.05 && Math.abs(paper.rd - 151.52) < 0.05,
  `rating ${paper.rating.toFixed(2)} (want 1464.06), RD ${paper.rd.toFixed(2)} (want 151.52)`,
);

// --- 2. New account beats a settled 1500 player: gain >> 150 ---
const fresh: GlickoRating = { rating: RATING_START, rd: RD_START, vol: VOL_START };
const settled1500: GlickoRating = { rating: 1500, rd: 60, vol: 0.06 };
const firstWin = glickoUpdate(fresh, settled1500, 1);
const firstGain = firstWin.rating - RATING_START;
check(
  "new-account first-win swing",
  firstGain > 150 && firstGain < MAX_RATING_DELTA,
  `1500±${RD_START} beats settled 1500 → +${firstGain.toFixed(1)} (must be > 150; lichess caps at ${MAX_RATING_DELTA})`,
);
const firstLoss = glickoUpdate(fresh, settled1500, 0);
check(
  "swing is symmetric",
  Math.abs(firstLoss.rating - RATING_START + firstGain) < 1e-6,
  `first loss → ${(firstLoss.rating - RATING_START).toFixed(1)}`,
);
check(
  "still provisional after one game",
  isProvisional(firstWin),
  `RD after game 1 = ${firstWin.rd.toFixed(1)} (provisional while > ${PROVISIONAL_RD})`,
);

// --- 3. RD decay curve: alternating results vs settled opposition ---
let p: GlickoRating = { ...fresh };
const rdAt: Record<number, number> = {};
const gainAt: Record<number, number> = {};
for (let game = 1; game <= 40; game++) {
  const before = p.rating;
  const opp: GlickoRating = { rating: p.rating, rd: 60, vol: 0.06 }; // fair pairing
  p = glickoUpdate(p, opp, (game % 2 === 1 ? 1 : 0) as GlickoScore);
  rdAt[game] = p.rd;
  gainAt[game] = Math.abs(p.rating - before);
}
console.log(
  "RD curve (new account, alternating W/L vs settled equals): " +
    [1, 2, 3, 5, 8, 10, 15, 20, 30, 40]
      .map((n) => `g${n}=${rdAt[n].toFixed(1)}`)
      .join("  "),
);
console.log(
  "|Δrating| per game:                                        " +
    [1, 2, 3, 5, 8, 10, 15, 20, 30, 40]
      .map((n) => `g${n}=${gainAt[n].toFixed(0)}`)
      .join("  "),
);
check(
  "settles out of provisional fast",
  rdAt[10] <= PROVISIONAL_RD,
  `RD after 10 games = ${rdAt[10].toFixed(1)} (<= ${PROVISIONAL_RD}; lichess clears the "?" in ~10 games)`,
);
check("lichess-like settled band by 30 games", rdAt[30] <= 70, `RD after 30 games = ${rdAt[30].toFixed(1)} (heading into lichess's 45-60 band)`);
check("lichess-like settled band by 40 games", rdAt[40] <= 60, `RD after 40 games = ${rdAt[40].toFixed(1)} (~45-60 like lichess)`);
check("RD floor holds", rdAt[40] >= RD_MIN, `RD after 40 games = ${rdAt[40].toFixed(1)} (floor ${RD_MIN})`);
check(
  "RD decays monotonically for active play",
  Object.values(rdAt).every((v, i, a) => i === 0 || v <= a[i - 1] + 1e-9),
  "no per-game inflation (lichess ties inflation to inactivity, not games)",
);

// --- 4. Seeded house bot stays settled ---
let bot: GlickoRating = { rating: 1900, rd: 60, vol: 0.06 }; // HOUSE_SEED_RD
const botSeed = bot.rating;
for (let game = 1; game <= 20; game++) {
  // Realistic outcomes: mostly beats weaker opposition, occasional upset.
  const opp: GlickoRating = { rating: 1750, rd: 90, vol: 0.06 };
  const { a } = glickoUpdatePair(bot, opp, (game % 5 === 0 ? 0 : 1) as GlickoScore);
  bot = a;
}
check(
  "settled bot rating stays in its band",
  Math.abs(bot.rating - botSeed) < 120 && bot.rd >= RD_MIN && bot.rd <= 62 && !isProvisional(bot),
  `after 20 games: rating ${bot.rating.toFixed(0)} (seed ${botSeed}), RD ${bot.rd.toFixed(1)} (never provisional)`,
);

// --- 5. Both-sides update sanity: rating is conserved-ish between settled equals ---
const pair = glickoUpdatePair(settled1500, { ...settled1500 }, 1);
check(
  "settled-vs-settled game moves single digits",
  pair.a.rating - 1500 < 15 && pair.a.rating > 1500 && pair.b.rating < 1500,
  `winner +${(pair.a.rating - 1500).toFixed(1)}, loser ${(pair.b.rating - 1500).toFixed(1)}`,
);

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll glicko checks passed.");
