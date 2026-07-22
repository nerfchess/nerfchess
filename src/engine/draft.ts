import { Buff, BuffMatchState, BuffOffer, PlayerBuffState, isBoon } from "./buff";
import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "./buffs/library";
import { APEX_MYTHIC_CHANCE, TIER9, TIER10 } from "./buffs/tier9";
import { Tier } from "./nerf";
import { RNG } from "./rng";
import { BoardState, Color, PieceType } from "./types";

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

// Cards whose TEXT or MECHANIC references the opponent's (or their own) NERF.
// Buff mode has no nerfs (Core Requirement: buff mode must stand on its own,
// with no dead nerf references in any visible text), so every one of these is
// excluded from buff drafts. They are all boon-flagged and stay fully alive in
// nerf mode, where the reference is real. extra_glance is the pure reveal; the
// others are dual-effect cards whose nerf clause would be dead text in buff
// mode (Phishing Email, Stream Sniper, Third Eye, Foresight, Omniscience, The
// Long Truce's suspension rider). Enforced by scripts/test-buff-purity.ts.
export const NERF_REVEAL = new Set([
  "extra_glance",
  "pr_phishing",
  "stream_sniper",
  "third_eye",
  "wa_foresight",
  "wa_omniscience",
  "bw2_long_truce",
]);

// Draft cadence in own moves. Tuning guide: 5 creates faster chaos, 6 is the
// slower arc, 7 slows it further and delays high-tier cards. Set to 5 so
// drafts land more often and the game stays lively.
export const DEFAULT_CADENCE = 5;

// Nerf mode draft cadence: a hex-or-boon pick lands every five of your own
// moves, matching the buff-mode arc so the curses arrive steadily.
export const NERF_MODE_CADENCE = 5;

// ---------------------------------------------------------------------------
// FAIR DRAFT RNG (overhaul, 2026-07-22): once a slot's tier is resolved, every
// eligible card in that tier's pool has an EQUAL chance. All appearance
// weighting was removed:
//   - the Funny/Fantasy/PT collection 1.5x draw boost,
//   - the per-card appearance multipliers (Chess Diff 2x),
//   - the nerf-mode HEX_SHARE 60/40 bucket roll (hex/boon composition now
//     emerges from pool sizes),
//   - the streak-based nerf-relief decline suppression (NERF_DECLINE_LIMIT).
// What remains is pool ELIGIBILITY, not weighting: tier progression + banking,
// held-card and reroll exclusions, dead-draft guards (requires / dead reveals /
// relief with no nerf to relieve), combo-tag exclusivity, and moderator
// overrides. Enforced by scripts/test-draft-fairness.cjs (seeded chi-square
// over thousands of rolls; normal, reroll, banked, both colors, both modes).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Oppressive-combination guard: exclusive combo tags.
//
// Some effects are fine alone but oppressive when a player holds several at
// once: chained turn-skips leave the victim never taking a normal turn,
// stacked draft denial locks them out of the card game entirely, and layered
// board-wide freezes remove every response. Rather than nerfing each card,
// the draft refuses to OFFER a card while the caster already HOLDS an
// unspent, un-nullified card sharing one of its combo tags — a deterministic
// pool filter over synced state, so every replica rolls identically
// (desync-safe), and replays are unaffected (the filter only shapes new
// rolls).
//
// This is a visible rule, not a silent one: BuffCard renders the exclusivity
// line (via COMBO_TAG_LABELS) in the card details, so a player always knows
// why the family is one-at-a-time. Spending the held card re-opens the
// family on the NEXT roll — the guard caps simultaneous possession, it never
// bans a strategy outright.
// ---------------------------------------------------------------------------

/** card id -> exclusive families it belongs to. A card may carry several. */
export const COMBO_TAGS: Record<string, readonly string[]> = {
  // Turn theft: the opponent skips a turn. Two held at once = back-to-back
  // skips, the "opponent never gets a normal turn" loop.
  time_skip: ["turn-theft"],
  time_lock: ["turn-theft", "draft-denial"],
  time_freeze: ["turn-theft", "mass-freeze"],
  unshackled_wrath: ["turn-theft"],
  grand_malediction: ["turn-theft", "draft-denial"],
  lost_weekend: ["turn-theft"],
  throne_and_silence: ["turn-theft", "draft-denial"],
  wc_red_tape: ["turn-theft"],
  // Draft denial: skips/blocks the opponent's drafts. Stacked, it removes
  // the opponent from the card game for long stretches.
  patch_notes: ["draft-denial"],
  absolute_nullify: ["draft-denial"],
  dead_letter: ["draft-denial"],
  draft_seize: ["draft-denial"],
  draft_supremacy: ["draft-denial"],
  suppress: ["draft-denial"],
  riddle_game: ["draft-denial"],
  burned_dispatches: ["draft-denial"],
  empty_handed: ["draft-denial"],
  lost_fortnight: ["draft-denial"],
  sealed_archive: ["draft-denial"],
  sacked_capital: ["draft-denial"],
  time_out: ["draft-denial"],
  // Mass freeze: board-wide immobilization. One at a time is a tempo swing;
  // two make the whole army unplayable for several turns.
  mass_freeze: ["mass-freeze"],
};

/** Human-readable family names for the card-details exclusivity line. */
export const COMBO_TAG_LABELS: Record<string, string> = {
  "turn-theft": "Turn theft",
  "draft-denial": "Draft denial",
  "mass-freeze": "Mass freeze",
};

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

/** The set of piece types `color` currently has ON THE BOARD. Used by the
 * draft pool's piece-eligibility guard (Buff.requires): a card whose whole
 * effect targets the caster's own pieces of some type is a DEAD DRAFT when
 * the caster owns none of it, so it leaves the pool. A pure read of the same
 * synced, authoritative board every effect and legal-move check operates on
 * (game.board, threaded in from playMove / rerollDraft), so the filter is
 * identical on both clients and the server: it can never desync. */
function ownedPieceTypes(board: BoardState, color: Color): Set<PieceType> {
  const set = new Set<PieceType>();
  for (const p of board.pieces) if (p && p.color === color) set.add(p.type);
  return set;
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
 * identically to a first roll. `suppressed` drops draft-manipulation cards.
 * `exclude` adds extra card ids to the never-offer set: a reroll passes the
 * cards currently on the table so the fresh set is guaranteed to differ from
 * what the player is looking at. */
function rollCards(
  bs: BuffMatchState,
  color: Color,
  slotTiers: Tier[],
  suppressed: boolean,
  board?: BoardState,
  exclude?: Iterable<string>,
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
  // Piece-eligibility guard: a card whose whole effect needs the caster to own
  // a specific piece type (Buff.requires) is a DEAD DRAFT when they have none
  // of it, so it leaves the pool. Computed once per roll from the synced board
  // (same source as effects/legalMoves), so both sides filter identically. The
  // board is always threaded in during real play; when absent (offline pool
  // sims) the guard is skipped and requires-cards stay eligible.
  const owned = board ? ownedPieceTypes(board, color) : null;
  // Combination guard: the exclusive-family tags of every card this player
  // currently holds unspent (see COMBO_TAGS above). A candidate sharing one
  // of these tags leaves the pool for this roll. Synced state only, so every
  // replica computes the identical set.
  const heldComboTags = new Set<string>();
  for (const held of ps.buffs) {
    if (held.spent || held.nullified) continue;
    for (const tag of COMBO_TAGS[held.id] ?? []) heldComboTags.add(tag);
  }
  const inMode = (b: Buff) => {
    if (heldComboTags.size > 0 && (COMBO_TAGS[b.id] ?? []).some((t) => heldComboTags.has(t)))
      return false;
    // Apex cards (special / tier 9 apex / tier 10 mythic) are never in the
    // normal pool: they are only obtainable through the dedicated grants.
    // Banking at the top tier deals a two-card apex offer and Jackpot grants a
    // single apex card; in both, every draw is a tier-9 card with an
    // APEX_MYTHIC_CHANCE (~10%) upgrade to a tier-10 mythic.
    if (b.special || b.tier === 9 || b.tier === 10) return false;
    if (reliefIsDead && b.category === "nerf") return false;
    if (owned && b.requires && !b.requires.some((t) => owned.has(t))) return false;
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
  // Reroll exclusion: fold in the cards currently on the table so a reroll is
  // GUARANTEED to change what's offered rather than re-dealing a card the
  // player is already looking at. The ids come from synced offer state, so both
  // replicas exclude the same set and the seeded draw stays byte-identical
  // (desync-safe). Empty on a first roll.
  if (exclude) for (const id of exclude) used.add(id);
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
    // FAIR DRAW: one uniform seeded pick over the whole eligible pool. No
    // buckets, no weights, no per-card multipliers (see the fairness note at
    // the top of this file). Both replicas build the identical pool in the
    // same order, so the single rng.int() draw stays byte-identical.
    const card = pool[rng.int(pool.length)];
    used.add(card.id);
    cards.push({ id: card.id, tier: overriddenTier(card) });
  }

  saveRng(bs, rng);
  return cards;
}

/** Roll one apex slot off the draft RNG: a tier-9 apex card, upgraded to a
 * tier-10 mythic APEX_MYTHIC_CHANCE of the time. Pass `tier` to pin the band
 * instead of rolling the gate (a reroll keeps a landed mythic at tier 10; a
 * tier-9 slot rerolls the gate again, so it can still roll UP). `taken` (held
 * unspent cards plus the slots already rolled this offer) keeps the two-card
 * offer distinct; a dry band falls back to the other band, then to duplicates,
 * rather than truncating the offer. Deterministic: the gate and the pick are
 * plain seeded draws, so every replica rolls the identical card. */
function rollApexCard(rng: RNG, taken: Set<string>, tier?: 9 | 10): { id: string; tier: Tier } {
  const band: 9 | 10 =
    tier ?? (rng.next() < APEX_MYTHIC_CHANCE && TIER10.length > 0 ? 10 : 9);
  let pool = (band === 10 ? TIER10 : TIER9).filter((b) => !taken.has(b.id));
  if (pool.length === 0) pool = (band === 10 ? TIER9 : TIER10).filter((b) => !taken.has(b.id));
  if (pool.length === 0) pool = band === 10 ? TIER10 : TIER9;
  const pick = pool[rng.int(pool.length)];
  taken.add(pick.id);
  return { id: pick.id, tier: pick.tier };
}

/** The card ids `color` holds unspent: never offered again while held. */
function heldUnspentIds(ps: PlayerBuffState): Set<string> {
  return new Set(ps.buffs.filter((b) => !b.spent && !b.nullified).map((b) => b.id));
}

/** Roll a fresh offer for `color` at the round's shared tiers and attach it
 * to their draft state. Returns null (and attaches nothing) when the mode's
 * card pool has run completely dry: the draft is skipped instead of blocking
 * the player behind an empty offer. */
export function rollOffer(
  bs: BuffMatchState,
  color: Color,
  tiers: [Tier, Tier],
  board?: BoardState,
): BuffOffer | null {
  const ps = bs.players[color];
  // (Nerf-relief decline tracking removed in the fairness overhaul: category
  // eligibility no longer depends on a player's pick history.)
  ps.lastNerfOffered = undefined;

  const index = ps.draftsTaken + 1;
  const prepping = ps.flags.prepThree === true;
  const cardCount = prepping ? 3 : 2;
  ps.flags.prepThree = undefined;

  const bonus = Math.min(1, ps.flags.bankBonus ?? 0);
  ps.flags.bankBonus = undefined;
  // Whether the offer just banked held a tier-8 (the apex gate; see below).
  // Consumed here so it only ever applies to this one banked roll.
  const bankedTier8 = ps.flags.bankedTier8 === true;
  ps.flags.bankedTier8 = undefined;
  // "Stacked draft" preset: a persistent lift on every offer (not consumed),
  // so a surprised friend keeps drafting high-tier cards. Capped at +3.
  const boost = Math.min(3, Math.max(0, ps.flags.stackBoost ?? 0));
  const forced = ps.flags.forceTier;
  ps.flags.forceTier = undefined;
  // Suppress: this offer carries no draft-manipulation cards.
  const suppressed = (ps.flags.noDraftCards ?? 0) > 0;
  if (suppressed) ps.flags.noDraftCards = (ps.flags.noDraftCards ?? 0) - 1;

  // Apex bank: banking an offer that CONTAINED a tier-8 card promotes the next
  // (banked) roll past tier 8 into an apex offer. Everywhere else tiers 9 and
  // 10 stay out of the pool. The offer deals TWO distinct apex cards (a real
  // pick, like every other draft), each rolled tier 9 with the shared
  // APEX_MYTHIC_CHANCE (~10%) upgrade to a tier-10 mythic — a mythic replaces a
  // tier 9 about one time in ten, per slot, exactly like the Jackpot grant.
  // Deterministic: each slot is one gate draw plus one pick draw off the seeded
  // draft RNG, so the offer replays identically.
  //
  // A prepThree offer (All In) is never collapsed into an apex offer: it owes
  // the player THREE cards one tier higher, so it must keep going down the
  // normal multi-card path even when its banked tier would otherwise hit 8.
  //
  // GATED on skipping a tier-8 (owner rule): the apex (tier 9/10) offer is the
  // reward for BANKING an offer that contained a tier-8 card. You don't have to
  // draft the tier-8 — passing it up is what earns the apex pull, and once you
  // do it is GUARANTEED. The promotion depends ONLY on bankedTier8, never on
  // what the next round's shared tiers happen to roll: that roll is a fresh
  // draw (rollSharedTiers) independent of the banked offer, and the top-tier
  // slip gate lands it below 8 often enough that keying the reward on it used
  // to silently cancel a legitimately-earned apex pull. bankedTier8 is set by
  // bankOffer from the skipped offer's cards and consumed above.
  const bankedToTop =
    !prepping &&
    bonus > 0 &&
    forced == null &&
    bankedTier8 &&
    TIER9.length > 0;
  if (bankedToTop) {
    const rng = drawRng(bs);
    const taken = heldUnspentIds(ps);
    const cards: BuffOffer["cards"] = [rollApexCard(rng, taken), rollApexCard(rng, taken)];
    saveRng(bs, rng);
    const apexOffer: BuffOffer = { cards, index, banked: true };
    ps.offer = apexOffer;
    ps.offerTiers = cards.map((c) => c.tier);
    ps.draftsTaken = index;
    const apexWatcher = bs.players[color === "w" ? "b" : "w"];
    if (apexWatcher.flags.seeOppCards) {
      apexWatcher.oppReveal = { index, cards: apexOffer.cards.map((c) => ({ ...c })) };
      apexWatcher.flags.seeOppCards = undefined;
      apexWatcher.flags.seeOppTier = undefined;
    } else if (apexWatcher.flags.seeOppTier) {
      apexWatcher.oppReveal = {
        index,
        tier: cards.reduce<number>((t, c) => Math.max(t, c.tier), 9) as Tier,
      };
      apexWatcher.flags.seeOppTier = undefined;
    }
    return apexOffer;
  }

  // Resolve each slot's pool tier: a banked skip rolls exactly one tier above
  // the shared roll (cap +1) and the stacked-draft preset lifts every offer by
  // a further fixed amount. These lifts (and their flags) are consumed here, so
  // a later reroll rolls off the stored resolved tiers, not the shared pair.
  const slotTiers: Tier[] = [];
  for (let i = 0; i < cardCount; i++) {
    const shared = tiers[Math.min(i, tiers.length - 1)];
    slotTiers.push(forced ?? (Math.min(8, shared + bonus + boost) as Tier));
  }
  const cards = rollCards(bs, color, slotTiers, suppressed, board);

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
  // Reward for skipping a strong offer: if the offer being banked CONTAINED a
  // tier-8 card, the next (banked) roll may deal an apex offer. Captured here
  // before the offer is cleared; consumed in rollOffer.
  if (ps.offer?.cards.some((c) => c.tier === 8)) ps.flags.bankedTier8 = true;
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
export function rerollOffer(bs: BuffMatchState, color: Color, board?: BoardState): boolean {
  const ps = bs.players[color];
  const offer = ps.offer;
  if (!offer || (ps.rerollsLeft ?? 0) <= 0) return false;
  const slotTiers = (ps.offerTiers?.length ? ps.offerTiers : offer.cards.map((c) => c.tier)) as Tier[];
  // An apex offer (from banking at the top tier) never rolls off the normal
  // pool: rerolling it draws FRESH apex cards off the seeded RNG rather than
  // collapsing it into ordinary tier-8 cards. Per slot, a landed tier-10
  // mythic stays tier 10 (a reroll never downgrades it) while a tier-9 slot
  // rerolls the APEX_MYTHIC_CHANCE gate again — so a reroll can still roll UP
  // into a mythic, but can never lose one. The current cards join the
  // exclusion set so the reroll actually changes what is on the table.
  const isApexOffer = slotTiers.length > 0 && slotTiers.every((t) => t === 9 || t === 10);
  if (isApexOffer) {
    if (TIER9.length === 0) return false;
    const rng = drawRng(bs);
    const taken = heldUnspentIds(ps);
    for (const c of offer.cards) taken.add(c.id);
    const cards: BuffOffer["cards"] = slotTiers.map((t) =>
      rollApexCard(rng, taken, t === 10 ? 10 : undefined),
    );
    saveRng(bs, rng);
    ps.rerollsLeft = (ps.rerollsLeft ?? 0) - 1;
    offer.cards = cards;
    // Keep the stored slot tiers in step with the rerolled cards so a further
    // reroll still detects this as an apex offer (and keeps any new mythic).
    ps.offerTiers = cards.map((c) => c.tier);
    offer.rerolled = (offer.rerolled ?? 0) + 1;
    const w = bs.players[color === "w" ? "b" : "w"];
    if (w.oppReveal && w.oppReveal.index === offer.index) {
      if (w.oppReveal.cards) w.oppReveal.cards = offer.cards.map((c) => ({ ...c }));
      else if (w.oppReveal.tier != null) {
        w.oppReveal.tier = cards.reduce<number>((t, c) => Math.max(t, c.tier), 9) as Tier;
      }
    }
    return true;
  }
  // Suppression was already consumed at the first roll; honor whatever remains.
  const suppressed = (ps.flags.noDraftCards ?? 0) > 0;
  // Exclude the cards currently on the table so the reroll deals a genuinely
  // different set (mirrors the apex path above, which adds offer.cards to its
  // exclusion set). The ids are synced offer state, so both replicas exclude
  // the same cards and the reroll stays replay-safe.
  const cards = rollCards(bs, color, slotTiers, suppressed, board, offer.cards.map((c) => c.id));
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
