import { BuffMatchState, BuffOffer, PlayerBuffState } from "./buff";
import { BUFF_POOL_BY_TIER } from "./buffs/library";
import { Tier } from "./nerf";
import { RNG } from "./rng";
import { Color } from "./types";

// ---------------------------------------------------------------------------
// Draft mechanics: tier progression, card rolling, banking.
//
// Design decisions (see docs/draft-system.md):
// - Buff cadence: a draft every 6 of your own moves.
// - Natural tier curve: draft #k rolls around tier min(6, k), with per-card
//   jitter of ±1. Tiers 7-8 are gated: they are only reachable via jitter,
//   banking, or draft-manipulation buffs, and every level above 6 has a 45%
//   chance to be knocked back down one — so the top tiers stay rare blowout
//   moments rather than the default endgame.
// - Banking: skipping a draft banks +1 tier on your next one. It does not
//   stack (cap +1).
// ---------------------------------------------------------------------------

// Draft cadence in own moves. Tuning guide: 5 creates faster chaos, 6 is the
// default arc, 7 slows the arc and delays high-tier cards.
export const DEFAULT_CADENCE = 6;

function drawRng(bs: BuffMatchState): RNG {
  return RNG.fromState(bs.rngState);
}

function saveRng(bs: BuffMatchState, rng: RNG) {
  bs.rngState = rng.getState();
}

export function rollTier(draftIndex: number, bonus: number, rng: RNG): Tier {
  let t = Math.min(6, Math.max(1, draftIndex)) + bonus;
  // Mild per-card jitter.
  const r = rng.next();
  if (r < 0.18) t += 1;
  else if (r > 0.82) t -= 1;
  // Gate the top tiers: each level above 6 has a 45% chance to slip back.
  while (t > 6 && rng.next() < 0.45) t -= 1;
  return Math.max(1, Math.min(8, t)) as Tier;
}

/** Roll a fresh offer for `color` and attach it to their draft state. */
export function rollOffer(bs: BuffMatchState, color: Color): BuffOffer {
  const ps = bs.players[color];
  const rng = drawRng(bs);
  const index = ps.draftsTaken + 1;
  const cardCount = ps.flags.prepThree ? 3 : 2;
  ps.flags.prepThree = undefined;

  const bonus = Math.min(1, ps.flags.bankBonus ?? 0);
  ps.flags.bankBonus = undefined;
  const forced = ps.flags.forceTier;
  ps.flags.forceTier = undefined;

  const cards: BuffOffer["cards"] = [];
  // Never offer a card the player already holds unspent.
  const used = new Set<string>(
    ps.buffs.filter((b) => !b.spent && !b.nullified).map((b) => b.id),
  );
  for (let i = 0; i < cardCount; i++) {
    const tier = forced ?? rollTier(index, bonus, rng);
    let pool = BUFF_POOL_BY_TIER[tier].filter((b) => !used.has(b.id));
    // A tier's pool can run dry (few implemented cards, prep = 3 picks);
    // fall back to adjacent tiers rather than offering duplicates.
    for (let spread = 1; pool.length === 0 && spread < 8; spread++) {
      pool = [
        ...(BUFF_POOL_BY_TIER[tier - spread] ?? []),
        ...(BUFF_POOL_BY_TIER[tier + spread] ?? []),
      ].filter((b) => !used.has(b.id));
    }
    if (pool.length === 0) break;
    const card = pool[rng.int(pool.length)];
    used.add(card.id);
    cards.push({ id: card.id, tier: card.tier });
  }

  saveRng(bs, rng);
  const offer: BuffOffer = { cards, index, ...(bonus > 0 ? { banked: true } : {}) };
  ps.offer = offer;
  ps.draftsTaken = index;

  // One-shot reveals (Peek, Quick Glance, Draft Insight): the holder gets a
  // snapshot of this single offer, then the reveal expires.
  const watcher = bs.players[color === "w" ? "b" : "w"];
  if (watcher.flags.seeOppCards) {
    watcher.oppReveal = { index, cards: offer.cards.map((c) => ({ ...c })) };
    watcher.flags.seeOppCards = undefined;
    watcher.flags.seeOppTier = undefined;
  } else if (watcher.flags.seeOppTier) {
    watcher.oppReveal = {
      index,
      tier: offer.cards.reduce<number>((t, c) => Math.max(t, c.tier), 1) as Tier,
    };
    watcher.flags.seeOppTier = undefined;
  }
  return offer;
}

/** Skip the pending offer, banking +1 tier for the next one (capped). */
export function bankOffer(ps: PlayerBuffState) {
  ps.offer = null;
  ps.flags.bankBonus = 1;
}
