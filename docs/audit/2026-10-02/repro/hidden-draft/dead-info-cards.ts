// Lower bound on draftable cards whose acquisition sets an "see the opponent's
// offer" flag (seeOppCards / seeOppTier). Under the server's FULL TRANSPARENCY
// rule (worker.ts draftStateFor) every offer is already visible to both seats
// and to spectators, so in online games that part of the card does nothing.
import { newGame, enableDraftMode, acquireBuff, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { BUFF_POOL_BY_TIER, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
import { NERF_REVEAL } from "../../../../../src/engine/draft";

const hits: { id: string; tier: number; kind: string; buffMode: boolean; nerfMode: boolean; opener: boolean }[] = [];
const seen = new Set<string>();
const all = [
  ...Object.values(BUFF_POOL_BY_TIER).flat(),
  ...Object.values(BUFF_BY_ID).filter((b) => b.opener && b.implemented),
];
for (const b of all) {
  if (seen.has(b.id) || isRetired(b.id) || !b.implemented) continue;
  seen.add(b.id);
  for (const mode of ["buff", "nerf"] as const) {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 42);
    enableDraftMode(g, 7, { mode });
    g.buffs!.players.w.offer = null;
    g.buffs!.players.b.offer = null;
    try {
      acquireBuff(g, "w", b.id, b.tier);
    } catch {
      continue;
    }
    const f = g.buffs!.players.w.flags;
    if (f.seeOppCards || f.seeOppTier) {
      const inBuff = b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id);
      const inNerf = isBoon(b) || b.category === "hex" || b.category === "item";
      hits.push({ id: b.id, tier: b.tier, kind: b.kind, buffMode: inBuff, nerfMode: inNerf, opener: !!b.opener });
      break;
    }
  }
}
console.log(`active cards scanned: ${seen.size}`);
console.log(`cards whose pick sets seeOppCards/seeOppTier: ${hits.length}`);
console.log(`  eligible in buff-mode pool: ${hits.filter((h) => h.buffMode).length}; nerf-mode pool: ${hits.filter((h) => h.nerfMode).length}; openers: ${hits.filter((h) => h.opener).length}`);
console.log(hits.map((h) => `${h.id}(T${h.tier},${h.kind}${h.opener ? ",opener" : ""})`).join(" "));
