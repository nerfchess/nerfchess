import { dailyIndex, shiftDay, utcDateKey } from "../../../../../src/lib/puzzles/daily";
import fs from "node:fs";
const n = JSON.parse(fs.readFileSync("./public/puzzle-data/puzzles.json","utf8")).puzzles.length;
const seen = new Map<number,string>(); let k = "2026-09-01";
for (let i=0;i<200;i++){ const idx=dailyIndex(k,n); if(seen.has(idx)){ console.log(`corpus ${n}: first repeat on ${k} (repeats ${seen.get(idx)}), today ${utcDateKey()}`); break;} seen.set(idx,k); k=shiftDay(k,1); }
