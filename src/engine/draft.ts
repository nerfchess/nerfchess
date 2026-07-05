import { Buff, BuffMatchState, BuffOffer, PlayerBuffState, isBoon } from "./buff";
import { BUFF_POOL_BY_TIER } from "./buffs/library";
import { Tier } from "./nerf";
import { RNG } from "./rng";
import { Color } from "./types";

// ---------------------------------------------------------------------------
// Draft mechanics: tier progression, card rolling, banking.
//
// Design decisions (see docs/draft-system.md):
// - Buff cadence: a draft every 6 of your own moves.
// - Natural tier curve: draft round k rolls one shared tier pair for BOTH
//   players. The base follows TIER_CURVE (1, 2, 3, 5, 7; later rounds stay
//   at 7), a single ±1 jitter applies to the whole round, and every level
//   above 6 has a 45% chance to be knocked back down one, per card, so the
//   top tiers stay rare blowout moments rather than the default endgame.
// - Banking: skipping a draft lifts your next offer exactly one tier above
//   the shared roll for that round. It does not stack (cap +1).
// ---------------------------------------------------------------------------

// Draft cadence in own moves. Tuning guide: 5 creates faster chaos, 6 is the
// default arc, 7 slows the arc and delays high-tier cards.
export const DEFAULT_CADENCE = 6;

// Nerf mode draft cadence: a hex-or-boon pick lands every six of your own
// moves, matching the buff-mode arc so the curses arrive steadily.
export const NERF_MODE_CADENCE = 6;

// Nerf mode pool composition: each card slot first rolls which bucket it
// draws from. HEX_SHARE of draws prefer the hex bucket (curses cast on your
// opponent, drawback intensifiers included); the rest prefer the boon/item
// bucket (self-relief and consumables). When the preferred bucket has no
// legal card at the rolled tier the slot falls back to the whole nerf-mode
// pool, so composition bends rather than blocking a draft. The bucket roll
// runs through the same draft RNG stream as the card pick, so offers stay
// deterministic for a given seed.
export const HEX_SHARE = 0.6;

function drawRng(bs: BuffMatchState): RNG {
  return RNG.fromState(bs.rngState);
}

function saveRng(bs: BuffMatchState, rng: RNG) {
  bs.rngState = rng.getState();
}

// Base tier per draft round (1-based); later rounds stay at the cap.
const TIER_CURVE = [1, 2, 3, 5, 7];

/** Roll the shared pair of card tiers for the next draft round. Both
 * players' offers that round use exactly this pair: the base comes from
 * TIER_CURVE, a single ±1 jitter is rolled once for the whole round, and
 * each card then runs the rare top-tier slip gate (every level above 6 has
 * a 45% chance to slip back one). */
export function rollSharedTiers(bs: BuffMatchState): [Tier, Tier] {
  const rng = drawRng(bs);
  const round = Math.max(bs.players.w.draftsTaken, bs.players.b.draftsTaken) + 1;
  let t = TIER_CURVE[Math.min(Math.max(1, round), TIER_CURVE.length) - 1];
  const r = rng.next();
  if (r < 0.18) t += 1;
  else if (r > 0.82) t -= 1;
  const gate = (): Tier => {
    let g = t;
    while (g > 6 && rng.next() < 0.45) g -= 1;
    return Math.max(1, Math.min(8, g)) as Tier;
  };
  const tiers: [Tier, Tier] = [gate(), gate()];
  saveRng(bs, rng);
  return tiers;
}

/** Roll a fresh offer for `color` at the round's shared tiers and attach it
 * to their draft state. Returns null (and attaches nothing) when the mode's
 * card pool has run completely dry: the draft is skipped instead of blocking
 * the player behind an empty offer. */
export function rollOffer(bs: BuffMatchState, color: Color, tiers: [Tier, Tier]): BuffOffer | null {
  const ps = bs.players[color];
  const rng = drawRng(bs);
  const index = ps.draftsTaken + 1;
  const cardCount = ps.flags.prepThree ? 3 : 2;
  ps.flags.prepThree = undefined;

  const bonus = Math.min(1, ps.flags.bankBonus ?? 0);
  ps.flags.bankBonus = undefined;
  const forced = ps.flags.forceTier;
  ps.flags.forceTier = undefined;
  // Suppress: this offer carries no draft-manipulation cards.
  const suppressed = (ps.flags.noDraftCards ?? 0) > 0;
  if (suppressed) ps.flags.noDraftCards = (ps.flags.noDraftCards ?? 0) - 1;

  // Mode filter: buff mode never offers nerf-relief cards or hexes (hexes
  // are nerf-mode only); nerf mode draws hexes plus the boon pool (every
  // nerf-relief card, the light general cards flagged `boon`, and items);
  // legacy merged games (no mode) keep the full pool. The adjacent-tier
  // fallback below runs on the filtered pool as well, so neither mode can
  // leak the other's cards.
  const inMode = (b: Buff) =>
    bs.mode === "buff"
      ? b.category !== "nerf" && b.category !== "hex"
      : bs.mode === "nerf"
        ? isBoon(b) || b.category === "hex" || b.category === "item"
        : true;

  const cards: BuffOffer["cards"] = [];
  // Never offer a card the player already holds unspent.
  const used = new Set<string>(
    ps.buffs.filter((b) => !b.spent && !b.nullified).map((b) => b.id),
  );
  for (let i = 0; i < cardCount; i++) {
    // A banked skip rolls exactly one tier above the shared roll (cap +1).
    const shared = tiers[Math.min(i, tiers.length - 1)];
    const tier = forced ?? (Math.min(8, shared + bonus) as Tier);
    let pool = BUFF_POOL_BY_TIER[tier].filter(
      (b) => inMode(b) && !used.has(b.id) && (!suppressed || b.category !== "draft"),
    );
    // A tier's pool can run dry (few implemented cards, prep = 3 picks);
    // fall back to adjacent tiers rather than offering duplicates.
    for (let spread = 1; pool.length === 0 && spread < 8; spread++) {
      pool = [
        ...(BUFF_POOL_BY_TIER[tier - spread] ?? []),
        ...(BUFF_POOL_BY_TIER[tier + spread] ?? []),
      ].filter((b) => inMode(b) && !used.has(b.id) && (!suppressed || b.category !== "draft"));
    }
    if (pool.length === 0) break;
    // Nerf mode composition: roll the slot's preferred bucket (HEX_SHARE of
    // draws prefer hexes, the rest boons/items) and draw from it when it has
    // cards; otherwise fall back to the full nerf-mode pool for this tier.
    if (bs.mode === "nerf") {
      const wantHex = rng.next() < HEX_SHARE;
      const bucket = pool.filter((b) => (b.category === "hex") === wantHex);
      if (bucket.length > 0) pool = bucket;
    }
    const card = pool[rng.int(pool.length)];
    used.add(card.id);
    cards.push({ id: card.id, tier: card.tier });
  }

  saveRng(bs, rng);
  // Pool exhausted (possible in nerf mode's tiny card list): skip this draft
  // entirely rather than presenting an empty, unresolvable offer.
  if (cards.length === 0) return null;
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
