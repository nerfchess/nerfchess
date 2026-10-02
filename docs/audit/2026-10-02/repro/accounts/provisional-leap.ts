import { glickoUpdate, GLICKO_DEFAULT } from "../../../../../src/lib/glicko";
for (const opp of [1500, 1800, 2000, 2200]) {
  const r = glickoUpdate(GLICKO_DEFAULT, { rating: opp, rd: 60, vol: 0.06 }, 1);
  let r2 = r;
  r2 = glickoUpdate(r2, { rating: opp, rd: 60, vol: 0.06 }, 1);
  console.log(`new account beats settled ${opp}: 1 win -> ${r.rating.toFixed(0)} (RD ${r.rd.toFixed(0)}), 2 wins -> ${r2.rating.toFixed(0)} (RD ${r2.rd.toFixed(0)})`);
}
// inactivity: settled player RD after a year off, lichess-style 0.21436 periods/day
import { glickoUpdateMany } from "../../../../../src/lib/glicko";
const settled = { rating: 1800, rd: 50, vol: 0.06 };
const now = glickoUpdate(settled, { rating: 1800, rd: 50, vol: 0.06 }, 1);
const year = glickoUpdateMany(settled, [{ opponent: { rating: 1800, rd: 50, vol: 0.06 }, score: 1 }], 0.75, 365 * 0.21436);
console.log(`settled 1800/RD50 wins first game back: as implemented +${(now.rating - 1800).toFixed(1)} (RD ${now.rd.toFixed(0)}); with 1 year of lichess-style inactivity +${(year.rating - 1800).toFixed(1)} (RD ${year.rd.toFixed(0)})`);
