import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { BALANCE_WAVE_2026_07_22 as W } from "../../../../../src/data/balanceWave1";
const keys = Object.keys(W); console.log("wave events", keys.length);
let n=0;
for (const k of keys) {
  const id = k.split(":")[1]; const b = BUFF_BY_ID[id]; if (!b) { console.log("MISSING", k); continue; }
  const note = W[k][0].note;
  if (/Rename to|Replace with/.test(note) && n < 14) { n++; console.log("\n"+k, "retired:", isRetired(id), "| name:", b.name, "t"+b.tier); console.log("  NOTE:", note.slice(0,200)); console.log("  DESC:", b.description.slice(0,260)); }
}
