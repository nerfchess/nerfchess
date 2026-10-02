import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const cards = [...ALL_NERFS, ...ALL_BUFFS].filter((c) => c.implemented && !isRetired(c.id));
const hits = cards.filter((c) => /\b[A-Z]{3,}('S)?\b/.test(c.description.replace(/\b(RNG|UI|AI|OK|HP|XP|NPC|GG|AFK|DJ|ATM|TV|CEO|LOL|BRB|SOS|VIP|RPG)\b/g, "")));
console.log("live descriptions with ALL-CAPS words:", hits.length);
for (const c of hits.slice(0, 30)) console.log("  ", c.id, "::", c.description.match(/\b[A-Z]{3,}('S)?\b/g)!.join(" "));
// numbers: digits vs words outside durations
const wordNums = cards.filter((c) => /\b(two|three|four|five|six)\b/i.test(c.description)).length;
const digitNums = cards.filter((c) => /\b[2-9]\b/.test(c.description)).length;
console.log("cards using spelled numbers two..six:", wordNums, " cards using digits 2..9:", digitNums);
const both = cards.filter((c) => /\b(two|three|four|five|six)\b/i.test(c.description) && /\b[2-9]\b/.test(c.description));
console.log("cards mixing both styles in one text:", both.length, both.slice(0, 8).map((c) => c.id + ": " + c.description.slice(0, 120)).join("\n   "));
// rank/file naming styles
const rankStyles = { "rank N": 0, "Nth rank": 0, "back rank": 0, "home rank": 0, "first rank": 0 } as Record<string, number>;
for (const c of cards) { const d = c.description;
  if (/\brank [1-8]\b/i.test(d)) rankStyles["rank N"]++; if (/\b[1-8](st|nd|rd|th) rank\b/i.test(d)) rankStyles["Nth rank"]++;
  if (/\bback rank\b/i.test(d)) rankStyles["back rank"]++; if (/\bhome rank\b/i.test(d)) rankStyles["home rank"]++; if (/\b(first|second|third|fourth|fifth|sixth|seventh|eighth) rank\b/i.test(d)) rankStyles["first rank"]++; }
console.log("rank naming styles:", JSON.stringify(rankStyles));
const fileStyles = { "a-file": cards.filter((c) => /\b[a-h]-file\b/.test(c.description)).length, "file a": cards.filter((c) => /\bfile [a-h]\b/.test(c.description)).length, "a file": cards.filter((c) => /\b[a-h] file\b/.test(c.description)).length };
console.log("file naming styles:", JSON.stringify(fileStyles));
