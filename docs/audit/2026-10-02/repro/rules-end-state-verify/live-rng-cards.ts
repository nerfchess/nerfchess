import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const live: string[] = [];
for (const [id, def] of Object.entries(BUFF_BY_ID as Record<string, any>)) {
  if (!def.implemented || isRetired(id)) continue;
  const src = Object.values(def).concat(Object.values(def.mech ?? {})).filter((v) => typeof v === "function").map((f: any) => f.toString()).join("\n");
  if (/\brng\b/.test(src)) live.push(`${id}(${def.kind},t${def.tier})`);
}
console.log(live.length, live.slice(0, 60).join(" "));
