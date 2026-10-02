import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const cards = [...ALL_NERFS.map((n) => ({ ...n, k: "nerf" })), ...ALL_BUFFS.map((b) => ({ ...b, k: "buff" }))].filter((c) => c.implemented && !isRetired(c.id));
const c = (re: RegExp) => cards.filter((x) => re.test(x.description)).length;
console.log("future 'will':", c(/\bwill\b/i), "| imperative start (Choose/Pick/Select/Name/Move/Swap/Freeze...):", c(/^(Choose|Pick|Select|Name|Move|Swap|Freeze|Teleport|Place|Summon|Remove|Destroy|Take|Drop|Grant|Give|Steal|Send|Put|Mark|Curse|Prop|Draw|Book|Knock|Call|Crown|Stack|Charge|Flash|Sacrifice|Reset|Cancel)\b/),
  "| 'once' clause:", c(/\bonce\b/i), "| 'for the rest of the game':", c(/rest of the game/i), "| 'permanently':", c(/permanent/i), "| 'forever':", c(/\bforever\b/i));
const len = cards.map((x) => x.description.length).sort((a, b) => a - b);
console.log("description length p50/p90/max:", len[len.length >> 1], len[Math.floor(len.length * 0.9)], len[len.length - 1], "| >220 chars:", cards.filter((x) => x.description.length > 220).length);
console.log("tips present:", cards.filter((x) => (x as any).tip).length, "| flavor present:", cards.filter((x) => x.flavor).length, "| missing flavor:", cards.filter((x) => !x.flavor).length);
