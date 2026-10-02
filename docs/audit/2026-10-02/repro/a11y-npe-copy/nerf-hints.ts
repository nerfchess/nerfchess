// Counts how many live (implemented, not retired) nerfs define a UI hint
// (src/engine/nerf.ts `hint`), i.e. how many can explain themselves when they
// narrow or forbid moves. Read-only.
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
const live = ALL_NERFS.filter((n: any) => n.implemented && !isRetired(n.id));
const withHint = live.filter((n: any) => typeof n.hint === "function");
console.log(`nerfs total=${ALL_NERFS.length} live=${live.length} withHint=${withHint.length} (${((100 * withHint.length) / live.length).toFixed(1)}%)`);
const byTier: Record<number, [number, number]> = {};
for (const n of live as any[]) { const t = byTier[n.tier] ?? [0, 0]; t[0]++; if (n.hint) t[1]++; byTier[n.tier] = t; }
console.log("tier -> [live, withHint]", JSON.stringify(byTier));
