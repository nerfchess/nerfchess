// Exercise the real worker.ts dealNerfDraftOptions over many seeds.
import { GameServer } from "../../../../../worker";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
(globalThis as any).WebSocket = { OPEN: 1 };
const ctx: any = { getWebSockets: () => [], setWebSocketAutoResponse() {}, storage: {} };
const server: any = new GameServer(ctx, {} as any);
const tier = (id: string) => PLAYABLE_NERFS.find((n) => n.id === id)!.tier;
let notDistinct = 0, sameTierWithinSeat = 0, seatTierMixDiffers = 0, tierGapGt1 = 0;
const N = 20000;
const counts = new Map<string, number>();
for (let s = 1; s <= N; s++) {
  const o = server.dealNerfDraftOptions({ setup: { seed: s * 2654435 % 2147483647 } });
  const all = [...o.w, ...o.b];
  if (new Set(all).size !== 4) notDistinct++;
  for (const id of all) counts.set(id, (counts.get(id) ?? 0) + 1);
  const tw = o.w.map(tier).sort(), tb = o.b.map(tier).sort();
  if (tw[0] === tw[1]) sameTierWithinSeat++;
  if (tw.join() !== tb.join()) seatTierMixDiffers++;
  if (Math.abs(tw[1] - tw[0]) > 1) tierGapGt1++;
}
const vals = [...counts.values()];
console.log(JSON.stringify({ deals: N, notDistinct, seatsWhosePairSharesATier: sameTierWithinSeat, seatTierMixDiffers, tierGapGt1, distinctNerfsDealt: counts.size, minPerNerf: Math.min(...vals), maxPerNerf: Math.max(...vals) }));
