import { BUFF_POOL_BY_TIER } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
let H = 0, T = 0; const rows: string[] = [];
for (let t = 1; t <= 8; t++) { const pool = (BUFF_POOL_BY_TIER[t] ?? []).filter((b) => !isRetired(b.id) && !b.opener && !b.special && (isBoon(b) || b.category === "hex" || b.category === "item"));
  const h = pool.filter((b) => b.category === "hex").length; H += h; T += pool.length; rows.push(`t${t}: ${h}/${pool.length} = ${(100 * h / pool.length).toFixed(0)}%`); }
console.log("nerf-mode pool hex share by tier:", rows.join("  "), "| overall", (100 * H / T).toFixed(1) + "%");
