import fs from "node:fs"; import path from "node:path";
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const cards = [...ALL_NERFS, ...ALL_BUFFS].filter(c=>c.implemented && !isRetired(c.id));
const vocab = new Map<string,number>();
const skip = /src\/engine\/(buffs|nerfs)|card-registry|card-audit|cardHistory|balanceWave|node_modules|\.next|dist/;
function walk(d: string) { for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p = path.join(d,e.name); if (skip.test(p)) continue; if (e.isDirectory()) walk(p); else if (/\.(md|tsx?|cjs|mjs)$/.test(e.name) && fs.statSync(p).size < 3_000_000) { for (const w of fs.readFileSync(p,"utf8").toLowerCase().match(/[a-z]{3,}/g) ?? []) vocab.set(w,(vocab.get(w)??0)+1); } } }
walk("./docs"); walk("./src"); walk("./scripts");
const cardWords = new Map<string, Set<string>>();
for (const c of cards) for (const f of [c.name, c.description, (c as any).tip ?? "", c.flavor ?? ""]) for (const w of f.toLowerCase().match(/[a-z]{3,}/g) ?? []) (cardWords.get(w) ?? cardWords.set(w,new Set()).get(w)!).add(c.id);
const unknown = [...cardWords.entries()].filter(([w, s]) => !vocab.has(w) && s.size === 1);
console.log("card words never seen outside card libraries:", unknown.length);
console.log(unknown.map(([w,s])=>`${w}(${[...s][0]})`).join("  "));
