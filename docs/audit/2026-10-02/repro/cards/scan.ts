import fs from "node:fs";
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { GLOSSARY_ENTRIES, GLOSSARY_REGEX } from "../../../../../src/lib/glossary";
type C = { kind: string; id: string; name: string; description: string; tip?: string; flavor?: string; tier: number; icon?: string; category?: string; ckind?: string };
const cards: C[] = [
  ...ALL_NERFS.filter(n=>n.implemented && !isRetired(n.id)).map(n=>({kind:"nerf", id:n.id, name:n.name, description:n.description, tip:n.tip, flavor:n.flavor, tier:n.tier, icon:n.icon})),
  ...ALL_BUFFS.filter(b=>b.implemented && !isRetired(b.id)).map(b=>({kind:"buff", id:b.id, name:b.name, description:b.description, tip:b.tip, flavor:b.flavor, tier:b.tier, icon:b.icon, category:b.category, ckind:b.kind})),
];
const out: string[] = []; const P = (s: string) => { out.push(s); };
P(`live cards scanned: ${cards.length}`);
// ---- 1. Durations
const durRe = /\b(for|during|over|within|after|until)?\s*(the\s+)?(their|your|its|the|both players'|each player's)?\s*(next|following|first|last)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(of\s+(their|your|its)\s+(own\s+)?)?(full\s+)?(own\s+)?(turns?|moves?|plies|ply|rounds?)\b/gi;
const forms: Record<string, Set<string>> = {};
const numStyle = { digit: 0, word: 0 };
const unitCount: Record<string, number> = {};
for (const c of cards) {
  for (const m of c.description.matchAll(durRe)) {
    const n = m[5].toLowerCase(); const unit = m[11].toLowerCase().replace(/s$/,"");
    if (/^\d+$/.test(n)) numStyle.digit++; else if (!["a","an"].includes(n)) numStyle.word++;
    unitCount[unit] = (unitCount[unit]??0)+1;
    const tmpl = m[0].toLowerCase().replace(/\b\d+\b/g,"N").replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g,"W").replace(/\s+/g," ").trim();
    (forms[tmpl] ??= new Set()).add(c.id);
  }
}
P(`\n== DURATIONS: number style ${JSON.stringify(numStyle)}; units ${JSON.stringify(unitCount)}`);
const fsorted = Object.entries(forms).sort((a,b)=>b[1].size-a[1].size);
P(`distinct duration templates: ${fsorted.length}`);
for (const [t, s] of fsorted.slice(0, 60)) P(`  ${String(s.size).padStart(4)}  "${t}"  e.g. ${[...s].slice(0,3).join(", ")}`);
// cards mixing digit & word numbers
const mixed = cards.filter(c => /\b\d+\s+(turns?|moves?)\b/i.test(c.description) && /\b(two|three|four|five|six)\s+(turns?|moves?)\b/i.test(c.description));
P(`cards mixing digit and word durations in one text: ${mixed.length} ${mixed.slice(0,8).map(c=>c.id).join(", ")}`);
// ---- turn vs move ambiguity
const ambiguous = cards.filter(c => /\b(\d+|one|two|three|four|five|six|a)\s+(more\s+)?moves?\b/i.test(c.description) && /\bturns?\b/i.test(c.description));
P(`cards using both "N moves" and "turns": ${ambiguous.length} e.g. ${ambiguous.slice(0,10).map(c=>c.id).join(", ")}`);
const bareTurns = cards.filter(c => /\bfor (\d+|one|two|three|four|five|six|seven|eight) turns?\b/i.test(c.description));
P(`cards with bare "for N turns" (whose turns unstated): ${bareTurns.length} e.g. ${bareTurns.slice(0,12).map(c=>c.id).join(", ")}`);
// ---- 2. Piece name capitalisation
const pieces = ["Pawn","Knight","Bishop","Rook","Queen","King"];
const capMid: Record<string, string[]> = {};
for (const c of cards) {
  const text = [c.description, c.tip ?? ""].join(" ");
  for (const m of text.matchAll(/([a-z,;:]\s+)(Pawns?|Knights?|Bishops?|Rooks?|Queens?|Kings?)\b/g)) {
    (capMid[m[2]] ??= []).push(c.id);
  }
}
P(`\n== PIECE CAPITALISATION mid-sentence (description+tip):`);
for (const [k, ids] of Object.entries(capMid)) P(`  ${k}: ${ids.length} e.g. ${[...new Set(ids)].slice(0,8).join(", ")}`);
const lowerCount = cards.filter(c=>/\b(pawn|knight|bishop|rook|queen|king)s?\b/.test(c.description)).length;
P(`  cards using lowercase piece names: ${lowerCount}`);
// ---- 3. Typos: rare words near frequent words
const wordFreq = new Map<string, number>(); const wordCards = new Map<string, Set<string>>();
for (const c of cards) for (const field of [c.name, c.description, c.tip ?? "", c.flavor ?? ""]) for (const w of field.toLowerCase().match(/[a-z][a-z']+/g) ?? []) { wordFreq.set(w,(wordFreq.get(w)??0)+1); (wordCards.get(w) ?? wordCards.set(w,new Set()).get(w)!).add(c.id); }
function ed1(a: string, b: string): boolean { if (Math.abs(a.length-b.length)>1) return false; let i=0,j=0,e=0; while(i<a.length&&j<b.length){ if(a[i]===b[j]){i++;j++;continue;} if(++e>1) return false; if(a.length>b.length) i++; else if(b.length>a.length) j++; else {i++;j++;} } return e + (a.length-i) + (b.length-j) <= 1; }
function transp(a: string,b: string){ if(a.length!==b.length) return false; const d=[]; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) d.push(i); return d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]]; }
const freq = [...wordFreq.entries()].filter(([w,n])=>n>=4 && w.length>=4);
const cands: string[] = [];
for (const [w, n] of wordFreq) {
  if (n > 1 || w.length < 5) continue;
  const near = freq.filter(([f])=> f!==w && (ed1(w,f)||transp(w,f)) && !(w===f+"s"||f===w+"s"||w===f+"d"||w===f+"ed"||f===w+"d"||w===f+"'s"||f===w+"'s"||w===f+"r"||w===f+"y"));
  if (near.length) cands.push(`${w} (~${near.map(x=>x[0]+":"+x[1]).join("/")}) in ${[...wordCards.get(w)!].join(",")}`);
}
P(`\n== TYPO CANDIDATES (hapax within edit distance 1 of a frequent word): ${cands.length}`);
for (const c of cands) P("  " + c);
// doubled words
const dbl = cards.filter(c=>/\b(\w+)\s+\1\b/i.test(c.description)).map(c=>c.id+": "+c.description.match(/\b(\w+)\s+\1\b/i)![0]);
P(`doubled words: ${dbl.length} ${dbl.slice(0,10).join(" | ")}`);
const spaces = cards.filter(c=>/ {2,}| ,|\s\.$|\.\./.test(c.description)).map(c=>c.id);
P(`spacing/punctuation glitches: ${spaces.length} ${spaces.slice(0,10).join(", ")}`);
const noPeriod = cards.filter(c=>!/[.!?)"']$/.test(c.description.trim())).map(c=>c.id);
P(`descriptions not ending in terminal punctuation: ${noPeriod.length} e.g. ${noPeriod.slice(0,12).join(", ")}`);
const lowerStart = cards.filter(c=>/^[a-z]/.test(c.description)).map(c=>c.id);
P(`descriptions starting lowercase: ${lowerStart.length} ${lowerStart.slice(0,10).join(", ")}`);
const unicode = cards.filter(c=>/[≤≥→←×]/.test(c.description)).map(c=>c.id+":"+c.description.match(/[≤≥→←×]/)![0]);
P(`descriptions with math/arrow symbols: ${unicode.length} ${unicode.slice(0,12).join(", ")}`);
const dashes = cards.filter(c=>/[, –]/.test(c.description+c.name+(c.flavor??"")+(c.tip??""))).map(c=>c.id);
P(`em/en dashes: ${dashes.length} ${dashes.slice(0,10).join(", ")}`);
// name casing: Title Case vs sentence case
const nameNotTitle = cards.filter(c=>c.name.split(/\s+/).some((w,i)=> i>0 && /^[a-z]/.test(w) && !["of","the","a","an","and","or","to","in","on","for","at","by","from","with","into"].includes(w))).map(c=>c.kind+":"+c.id+"="+c.name);
P(`names with lowercase non-function words (title case breaks): ${nameNotTitle.length} e.g. ${nameNotTitle.slice(0,15).join(" | ")}`);
// second person consistency: "You" vs "the holder" vs "Your opponent" vs "opponent"
const holder = cards.filter(c=>/\b(the holder|the caster|its owner|the player)\b/i.test(c.description)).map(c=>c.id);
P(`descriptions in third person ("the holder/caster/player"): ${holder.length} e.g. ${holder.slice(0,10).join(", ")}`);
const nerfNoSubject = cards.filter(c=>c.kind==="nerf" && /^(Can't|Cannot|Must|Can only|Lose|If )/.test(c.description)).length;
const nerfYou = cards.filter(c=>c.kind==="nerf" && /^(You|Your)\b/.test(c.description)).length;
P(`nerf texts starting subject-less ("Can't...", "Must..."): ${nerfNoSubject}; starting "You/Your": ${nerfYou}`);
const cant = cards.filter(c=>/\bcan't\b/i.test(c.description)).length, cannot = cards.filter(c=>/\bcannot\b/i.test(c.description)).length;
P(`"can't" cards: ${cant}; "cannot" cards: ${cannot}`);
// opponent naming
const opp1 = cards.filter(c=>/\byour opponent\b/i.test(c.description)).length, opp2 = cards.filter(c=>/\b(the )?opponent's\b/i.test(c.description) && !/\byour opponent/i.test(c.description)).length, opp3 = cards.filter(c=>/\benemy\b/i.test(c.description)).length;
P(`"your opponent": ${opp1}; bare "opponent('s)": ${opp2}; "enemy": ${opp3}`);
fs.writeFileSync(__dirname + "/scan-out.txt", out.join("\n"));
console.log(out.join("\n"));
