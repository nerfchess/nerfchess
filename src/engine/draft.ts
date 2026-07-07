import { Buff, BuffMatchState, BuffOffer, PlayerBuffState, isBoon } from "./buff";
import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "./buffs/library";
import { Tier } from "./nerf";
import { RNG } from "./rng";
import { Color } from "./types";

// ---------------------------------------------------------------------------
// Draft mechanics: tier progression, card rolling, banking.
//
// Design decisions (see docs/draft-system.md):
// - Buff cadence: a draft every 5 of your own moves.
// - Natural tier curve: draft round k rolls one shared tier pair for BOTH
//   players. The base follows TIER_CURVE (1, 2, 3, 5, 7; later rounds stay
//   at 7), a single ±1 jitter applies to the whole round, and every level
//   above 6 has a 45% chance to be knocked back down one, per card, so the
//   top tiers stay rare blowout moments rather than the default endgame.
// - Banking: skipping a draft lifts your next offer exactly one tier above
//   the shared roll for that round. It does not stack (cap +1).
// ---------------------------------------------------------------------------

// Info cards whose whole effect is reading the opponent's NERF. Buff mode has
// no nerfs, so these are dead weight there and are filtered out of buff drafts.
const NERF_REVEAL = new Set(["extra_glance", "watchtower"]);

// Draft cadence in own moves. Tuning guide: 5 creates faster chaos, 6 is the
// slower arc, 7 slows it further and delays high-tier cards. Set to 5 so
// drafts land more often and the game stays lively.
export const DEFAULT_CADENCE = 5;

// Nerf mode draft cadence: a hex-or-boon pick lands every five of your own
// moves, matching the buff-mode arc so the curses arrive steadily.
export const NERF_MODE_CADENCE = 5;

// Nerf mode pool composition: each card slot first rolls which bucket it
// draws from. HEX_SHARE of draws prefer the hex bucket (curses cast on your
// opponent, drawback intensifiers included); the rest prefer the boon/item
// bucket (self-relief and consumables). When the preferred bucket has no
// legal card at the rolled tier the slot falls back to the whole nerf-mode
// pool, so composition bends rather than blocking a draft. The bucket roll
// runs through the same draft RNG stream as the card pick, so offers stay
// deterministic for a given seed.
export const HEX_SHARE = 0.6;

// ---------------------------------------------------------------------------
// Card overrides (server side): the game server can install a snapshot of
// moderator card overrides (card_overrides in D1) before rolling offers, so a
// disabled card leaves every draft pool and a tier-overridden card rolls in
// its new tier's pool, all without a code deploy. The snapshot a match uses is
// FIXED at match creation (the worker stamps it on the match record): rebuilds
// replay recorded pick indexes against re-rolled offers, so a pool that
// shifted mid-match would desync them. Clients never install a snapshot, so
// local games, live client mirrors, and saved replays keep the code-defined
// pools unchanged; overrides apply only where offers are rolled server side.
// ---------------------------------------------------------------------------

export type DraftPoolOverrides = {
  /** Card ids removed from every draft pool (enabled = 0). */
  off?: string[];
  /** Card id -> overridden tier (1-8): the card rolls in that tier's pool. */
  tier?: Record<string, number>;
};

let poolOverrides: { off: Set<string>; tier: Map<string, Tier> } | null = null;

/** Install (or clear, with null) the active overrides snapshot. Callers must
 * clear it again once their rolls are done so no other game's rolls see it. */
export function setDraftPoolOverrides(next: DraftPoolOverrides | null | undefined): void {
  const off = next?.off ?? [];
  const tiers = Object.entries(next?.tier ?? {}).filter(
    ([, t]) => Number.isInteger(t) && t >= 1 && t <= 8,
  );
  if (off.length === 0 && tiers.length === 0) {
    poolOverrides = null;
    return;
  }
  poolOverrides = {
    off: new Set(off),
    tier: new Map(tiers.map(([id, t]) => [id, t as Tier])),
  };
}

/** A card's tier under the active overrides (its code tier when none). */
function overriddenTier(b: Buff): Tier {
  return poolOverrides?.tier.get(b.id) ?? b.tier;
}

/** The draftable pool at a tier under the active overrides: disabled cards
 * leave every pool and a tier-overridden card moves to its new tier's pool.
 * With no snapshot installed this is exactly BUFF_POOL_BY_TIER[tier]. */
function poolAtTier(tier: number): Buff[] {
  const base = BUFF_POOL_BY_TIER[tier] ?? [];
  const o = poolOverrides;
  if (!o) return base;
  const pool = base.filter((b) => !o.off.has(b.id) && overriddenTier(b) === tier);
  for (const [id, t] of o.tier) {
    if (t !== tier || o.off.has(id)) continue;
    const b = BUFF_BY_ID[id];
    if (b && b.implemented && b.tier !== tier) pool.push(b);
  }
  return pool;
}

function drawRng(bs: BuffMatchState): RNG {
  return RNG.fromState(bs.rngState);
}

/** True while `color`'s nerf is currently off: removed for good (Nerf Breaker)
 * or suspended (Grace Period / Reprieve). Nerf-relief cards have nothing to
 * ease then, so they leave that player's pool. A pure read of buff match state
 * (the same fields nerfDisabled checks), no board scan, so it stays
 * replay-safe. */
function nerfIsOff(bs: BuffMatchState, color: Color): boolean {
  if (bs.players[color].nerfRemoved) return true;
  return bs.effects.some(
    (e) => e.kind === "nerf_suspended" && e.owner === color && (e.turns == null || e.turns > 0),
  );
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

/** Roll one fresh card per resolved pool tier in `slotTiers`, applying the
 * mode filter, the never-offer-a-held-card rule, the nerf-mode bucket roll,
 * and the adjacent-tier fallback, advancing the draft RNG exactly as a normal
 * offer does. Shared by rollOffer and rerollOffer so a reroll consumes the RNG
 * identically to a first roll. `suppressed` drops draft-manipulation cards. */
function rollCards(
  bs: BuffMatchState,
  color: Color,
  slotTiers: Tier[],
  suppressed: boolean,
): BuffOffer["cards"] {
  const ps = bs.players[color];
  const rng = drawRng(bs);
  // Mode filter: buff mode never offers nerf-relief cards or hexes (hexes
  // are nerf-mode only); nerf mode draws hexes plus the boon pool (every
  // nerf-relief card, the light general cards flagged `boon`, and items);
  // legacy merged games (no mode) keep the full pool. The adjacent-tier
  // fallback below runs on the filtered pool as well, so neither mode can
  // leak the other's cards.
  //
  // Buff mode has no nerfs, so info cards that read the opponent's NERF are
  // dead there: they can never do anything. Keep them out of buff drafts.
  // (Info cards that reveal buffs or upcoming draft cards stay valid in both.)
  // When this player's nerf is off (suspended or removed) there is nothing to
  // relieve, so nerf-relief / nerf-referencing cards (category "nerf") leave
  // their pool entirely: the draft must not offer an upgrade that eases a nerf
  // that is not in effect. Pure pool filter, computed once per roll.
  const reliefIsDead = nerfIsOff(bs, color);
  const inMode = (b: Buff) => {
    if (reliefIsDead && b.category === "nerf") return false;
    return bs.mode === "buff"
      ? b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id)
      : bs.mode === "nerf"
        ? isBoon(b) || b.category === "hex" || b.category === "item"
        : true;
  };

  const cards: BuffOffer["cards"] = [];
  // Never offer a card the player already holds unspent.
  const used = new Set<string>(
    ps.buffs.filter((b) => !b.spent && !b.nullified).map((b) => b.id),
  );
  for (const tier of slotTiers) {
    let pool = poolAtTier(tier).filter(
      (b) => inMode(b) && !used.has(b.id) && (!suppressed || b.category !== "draft"),
    );
    // A tier's pool can run dry (few implemented cards, prep = 3 picks);
    // fall back to adjacent tiers rather than offering duplicates.
    for (let spread = 1; pool.length === 0 && spread < 8; spread++) {
      pool = [
        ...poolAtTier(tier - spread),
        ...poolAtTier(tier + spread),
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
    cards.push({ id: card.id, tier: overriddenTier(card) });
  }

  saveRng(bs, rng);
  return cards;
}

/** Roll a fresh offer for `color` at the round's shared tiers and attach it
 * to their draft state. Returns null (and attaches nothing) when the mode's
 * card pool has run completely dry: the draft is skipped instead of blocking
 * the player behind an empty offer. */
export function rollOffer(bs: BuffMatchState, color: Color, tiers: [Tier, Tier]): BuffOffer | null {
  const ps = bs.players[color];
  const index = ps.draftsTaken + 1;
  const cardCount = ps.flags.prepThree ? 3 : 2;
  ps.flags.prepThree = undefined;

  const bonus = Math.min(1, ps.flags.bankBonus ?? 0);
  ps.flags.bankBonus = undefined;
  // "Stacked draft" preset: a persistent lift on every offer (not consumed),
  // so a surprised friend keeps drafting high-tier cards. Capped at +3.
  const boost = Math.min(3, Math.max(0, ps.flags.stackBoost ?? 0));
  const forced = ps.flags.forceTier;
  ps.flags.forceTier = undefined;
  // Suppress: this offer carries no draft-manipulation cards.
  const suppressed = (ps.flags.noDraftCards ?? 0) > 0;
  if (suppressed) ps.flags.noDraftCards = (ps.flags.noDraftCards ?? 0) - 1;

  // Resolve each slot's pool tier: a banked skip rolls exactly one tier above
  // the shared roll (cap +1) and the stacked-draft preset lifts every offer by
  // a further fixed amount. These lifts (and their flags) are consumed here, so
  // a later reroll rolls off the stored resolved tiers, not the shared pair.
  const slotTiers: Tier[] = [];
  for (let i = 0; i < cardCount; i++) {
    const shared = tiers[Math.min(i, tiers.length - 1)];
    slotTiers.push(forced ?? (Math.min(8, shared + bonus + boost) as Tier));
  }
  const cards = rollCards(bs, color, slotTiers, suppressed);

  // Pool exhausted (possible in nerf mode's tiny card list): skip this draft
  // entirely rather than presenting an empty, unresolvable offer.
  if (cards.length === 0) return null;
  const offer: BuffOffer = { cards, index, ...(bonus > 0 ? { banked: true } : {}) };
  ps.offer = offer;
  // Store the tiers actually produced (a dry slot can truncate the offer) so a
  // reroll rolls the same number of cards at the same tiers.
  ps.offerTiers = slotTiers.slice(0, cards.length);
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

/** Reroll the pending offer: discard the current cards and roll a FRESH set at
 * the SAME tiers off the deterministic RNG (advancing rngState like a normal
 * roll), spending one reroll. The draft index and any banked-tier flag stay
 * put; only the cards change. Returns false (touching nothing) when there is no
 * offer, no reroll left, or the reroll somehow rolls empty. Server-owned and
 * broadcast in online games, so it is replay-safe exactly like a normal offer.
 */
export function rerollOffer(bs: BuffMatchState, color: Color): boolean {
  const ps = bs.players[color];
  const offer = ps.offer;
  if (!offer || (ps.rerollsLeft ?? 0) <= 0) return false;
  const slotTiers = (ps.offerTiers?.length ? ps.offerTiers : offer.cards.map((c) => c.tier)) as Tier[];
  // Suppression was already consumed at the first roll; honor whatever remains.
  const suppressed = (ps.flags.noDraftCards ?? 0) > 0;
  const cards = rollCards(bs, color, slotTiers, suppressed);
  if (cards.length === 0) return false;
  ps.rerollsLeft = (ps.rerollsLeft ?? 0) - 1;
  offer.cards = cards;
  offer.rerolled = (offer.rerolled ?? 0) + 1;
  // Keep a still-pending opponent reveal (Peek / Quick Glance) honest: it
  // snapshotted this same offer index, so refresh it to the new cards/tier.
  const watcher = bs.players[color === "w" ? "b" : "w"];
  if (watcher.oppReveal && watcher.oppReveal.index === offer.index) {
    if (watcher.oppReveal.cards) {
      watcher.oppReveal.cards = offer.cards.map((c) => ({ ...c }));
    } else if (watcher.oppReveal.tier != null) {
      watcher.oppReveal.tier = offer.cards.reduce<number>((t, c) => Math.max(t, c.tier), 1) as Tier;
    }
  }
  return true;
}
