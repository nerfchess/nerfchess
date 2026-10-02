// Per-tier draft pool sizes by mode (code-defined pools, no overrides), plus
// truncated/skipped offers over simulated games.
import { BUFF_POOL_BY_TIER, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
import { NERF_REVEAL, openerPool } from "../../../../../src/engine/draft";
import { openingNerfPool } from "../../../../../src/engine/nerfs/library";
import { newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { RNG } from "../../../../../src/engine/rng";
const rows: string[] = [];
for (let t = 1; t <= 8; t++) {
  const base = (BUFF_POOL_BY_TIER[t] ?? []).filter((b) => !isRetired(b.id) && !b.opener && !b.special);
  const buff = base.filter((b) => b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id)).length;
  const nerf = base.filter((b) => isBoon(b) || b.category === "hex" || b.category === "item").length;
  rows.push(`T${t}: all=${base.length} buffMode=${buff} nerfMode=${nerf}`);
}
console.log(rows.join("\n"));
console.log(`openers=${openerPool().length}`);
const onp = openingNerfPool();
const byTier: Record<number, number> = {};
for (const n of onp) byTier[n.tier] = (byTier[n.tier] ?? 0) + 1;
console.log(`opening nerf pool=${onp.length} byTier=${JSON.stringify(byTier)}`);
// Duplicate ids across BUFF_BY_ID keys vs pools
const ids = Object.values(BUFF_POOL_BY_TIER).flat().map((b) => b.id);
console.log(`pool entries=${ids.length} unique=${new Set(ids).size}`);
for (const mode of ["buff", "nerf"] as const) {
  let offers = 0, short = 0, dupInOffer = 0, heldDup = 0, skipped = 0;
  for (let g = 0; g < 150; g++) {
    let game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, g + 3);
    enableDraftMode(game, 500 + g * 17, { mode });
    const r = new RNG(9 + g);
    for (let ply = 0; ply < 160 && !game.result; ply++) {
      for (const c of ["w", "b"] as const) {
        const ps = game.buffs!.players[c];
        if (ps.lastSkip) skipped++;
        const o = ps.offer;
        if (o) {
          offers++;
          if (o.cards.length < 2) short++;
          if (new Set(o.cards.map((x) => x.id)).size !== o.cards.length) dupInOffer++;
          const held = new Set(ps.buffs.filter((b) => !b.spent && !b.nullified).map((b) => b.id));
          if (o.cards.some((x) => held.has(x.id))) heldDup++;
          pickDraftCard(game, c, r.int(o.cards.length));
        }
      }
      const lm = legalMoves(game);
      if (!lm.length) break;
      game = playMove(game, lm[r.int(lm.length)]);
    }
  }
  console.log(`${mode}: offers=${offers} short(<2 cards)=${short} dupWithinOffer=${dupInOffer} offeredAHeldCard=${heldDup}`);
}
