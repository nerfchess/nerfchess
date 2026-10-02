import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { GLOSSARY_ENTRIES, GLOSSARY_REGEX } from "../../../../../src/lib/glossary";
const cards = [...ALL_NERFS, ...ALL_BUFFS].filter((c) => c.implemented && !isRetired(c.id));
const keys = new Set<string>(); for (const e of GLOSSARY_ENTRIES) for (const k of [e.term, ...(e.aliases ?? [])]) keys.add(k.toLowerCase());
const cand: Record<string, RegExp> = {
  teleport: /\bteleport\w*/i, swap: /\bswap\w*/i, convert: /\bconvert\w*|\bdefect\w*/i, revive: /\breviv\w*|\bresurrect\w*|\brises?\b/i,
  sacrifice: /\bsacrific\w*/i, explode: /\bexplo\w*|\bblow\w* up|\bdetonat\w*/i, charm: /\bcharm\w*/i, charge: /\bcharges?\b/i,
  "escape move": /\bescape move/i, rooted: /\broot(ed|s)\b/i, camel: /\bcamel\w*/i, zebra: /\bzebra/i, wazir: /\bwazir/i, ferz: /\bferz/i, alfil: /\balfil/i,
  nightrider: /\bnightrider/i, archbishop: /\barchbishop/i, chancellor: /\bchancellor/i, officer: /\bofficers?\b/i, "heavy piece": /\bheav(y|ies)\b( pieces?)?/i,
  slider: /\bsliders?\b/i, leaper: /\bleapers?\b/i, phase: /\bphas(e|ing)\b/i, seal: /\bseal(ed|s)?\b/i, moat: /\bmoat/i, wall: /\bwalls?\b/i, zone: /\bzones?\b/i,
  "use-it-or-lose-it": /use-it-or-lose-it/i, mirror: /\bmirror\w*/i, steal: /\bsteal\w*|\bstole\w*/i, fizzle: /\bfizzl\w*/i, spent: /\bspent\b|\bspend\w*/i,
  midline: /\bmidline|middle line|halfway line/i, centre: /\bcent(er|re) squares?\b/i, corner: /\bcorners?\b/i, "cannot be captured": /cannot be captured|can't be captured/i,
  immune: /\bimmun\w*/i, "royal": /\broyal\b/i, banish: /\bbanish\w*|\bexile\w*/i, promote: /\bpromot\w*/i, check: /\bchecks?\b/i, "lock-in": /\block-in\b/i,
  "free action": /\bfree action/i, "ring": /\bring\b/i, "explosive capture": /explosive capture/i, "chain": /\bchain(s|ed)?\b/i, "pocket": /\bpocket/i,
};
const rows: string[] = [];
for (const [k, re] of Object.entries(cand)) {
  const n = cards.filter((c) => re.test(c.description)).length;
  if (!n) continue;
  const inGloss = [...keys].some((g) => re.test(g));
  rows.push(`${String(n).padStart(4)}  ${k.padEnd(20)} glossary:${inGloss ? "yes" : "NO"}`);
}
console.log(rows.sort().reverse().join("\n"));
// share of cards with at least one glossary-underlined term
const withTerm = cards.filter((c) => new RegExp(GLOSSARY_REGEX.source, "i").test(c.description)).length;
console.log("cards whose description contains >=1 glossary term:", withTerm, "/", cards.length);
console.log("glossary entries:", GLOSSARY_ENTRIES.length, "keys incl aliases:", keys.size);
