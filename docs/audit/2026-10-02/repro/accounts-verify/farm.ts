import { glickoUpdatePair, GLICKO_DEFAULT } from "../../../../../src/lib/glicko.ts";
let me = { rating: 1500, rd: 60, vol: 0.06 };
const start = me.rating;
for (let i = 0; i < 50; i++) { me = glickoUpdatePair(me, { ...GLICKO_DEFAULT }, 1).a; }
console.log("settled 1500/RD60 beating 50 fresh guests:", start, "->", me.rating.toFixed(1), "RD", me.rd.toFixed(1));
let p = { ...GLICKO_DEFAULT };
for (let i = 0; i < 20; i++) { p = glickoUpdatePair(p, { ...GLICKO_DEFAULT }, 1).a; }
console.log("fresh account beating 20 fresh guests:", p.rating.toFixed(1), "RD", p.rd.toFixed(1));
