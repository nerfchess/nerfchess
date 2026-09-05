// Usage resolution: which consumption performance a card gets the moment it
// is USED — the beat between "the card sits in your hand" and "its effect
// lands on the board". The cast layer (CastSpectacle + signature scenes) owns
// the board-level effect; this layer owns the CARD itself being spent: the
// sigil ignites, shatters, unravels, is stamped void... anchored at the
// owner's board edge so the eye reads "that card just left the hand" before
// the board answers. Nullified cards get the cancel read (their performance
// plays broken) — the one moment a player most needs the board to say what
// happened to their card.
//
// Same discipline as entranceResolve: plain TS, type-only engine imports,
// headlessly importable — scripts/usage-coverage-probe.mts runs THIS resolver
// over the whole library and check-usage-coverage.cjs asserts totality (every
// implemented instant/activated card resolves) and the flagship rule (every
// tier >= 9 usable card carries a hand-authored flagship entry).

import type { BuffCategory } from "@/engine/buff";
import {
  ARRIVAL_THEME,
  DEFAULT_ARRIVAL_THEME,
  entranceVariant,
  isArrivalCategory,
  type ArrivalTheme,
  type EntranceVariant,
} from "./entranceResolve";

/** The twelve consumption families. Each is a distinct choreography in
 * useSpectacle.css (.us-f-<family>); the checker cross-checks this union
 * against the CSS so a family cannot exist here without art. */
export type UsageFamily =
  | "burst"
  | "shatter"
  | "ignite"
  | "unravel"
  | "stamp"
  | "drain"
  | "ripple"
  | "bloom"
  | "collapse"
  | "surge"
  | "seal"
  | "scatter";

export const USAGE_FAMILIES: UsageFamily[] = [
  "burst", "shatter", "ignite", "unravel", "stamp", "drain",
  "ripple", "bloom", "collapse", "surge", "seal", "scatter",
];

/** Category semantics pick the candidate families (an attack card should
 * break things, a protection card should seal), and the card's hash picks
 * within the candidates — so families stay meaningful AND two cards of one
 * category still differ. Record over BuffCategory: a new category cannot
 * ship without a usage vocabulary. */
const FAMILY_BY_CATEGORY: Record<BuffCategory, UsageFamily[]> = {
  movement: ["surge", "ripple", "scatter"],
  pieces: ["bloom", "stamp", "burst"],
  tempo: ["surge", "drain", "ripple"],
  protection: ["seal", "bloom", "stamp"],
  attack: ["shatter", "ignite", "burst"],
  info: ["unravel", "ripple", "stamp"],
  draft: ["scatter", "unravel", "bloom"],
  nerf: ["drain", "collapse", "unravel"],
  hex: ["collapse", "drain", "ignite"],
  item: ["stamp", "burst", "seal"],
};

export interface UsageResolution {
  family: UsageFamily;
  theme: ArrivalTheme;
  variant: EntranceVariant;
  /** Tier >= 9: the flagship crown chrome (rim arc + double echo). */
  crown: boolean;
  /** Hand-authored epithet for the flagship roster (title/aria text). */
  epithet?: string;
}

/** The hand-authored flagship roster: every implemented tier >= 9 instant or
 * activated card, each with a chosen family (overriding the category hash —
 * these performances are picked, not rolled) and an epithet. The coverage
 * gate fails if a tier >= 9 usable card is missing here, or if an entry goes
 * stale (unknown id, or the card stopped being usable). */
export const USAGE_FLAGSHIPS: Record<string, { family: UsageFamily; epithet: string }> = {
  // --- Tier 9, the apex band ---
  reality_warp: { family: "unravel", epithet: "reality folds" },
  full_resurrection: { family: "bloom", epithet: "the graves open" },
  eternal_freeze: { family: "seal", epithet: "the long winter" },
  philosophers_stone: { family: "stamp", epithet: "lead into gold" },
  grand_conjunction: { family: "surge", epithet: "the spheres align" },
  ov_continental_drift: { family: "ripple", epithet: "the plates move" },
  ov_let_me_play_for_you: { family: "scatter", epithet: "hands swapped" },
  ov_leviathan_below: { family: "collapse", epithet: "it surfaces" },
  ice_age: { family: "seal", epithet: "the world stills" },
  resurrection: { family: "bloom", epithet: "one returns" },
  second_coming: { family: "bloom", epithet: "the promised return" },
  iron_legion: { family: "stamp", epithet: "the foundries answer" },
  living_god: { family: "ignite", epithet: "worship is optional" },
  blackout: { family: "collapse", epithet: "the lights go out" },
  mass_petrify: { family: "seal", epithet: "flesh into stone" },
  culling: { family: "shatter", epithet: "the reaping" },
  queens_apocalypse: { family: "burst", epithet: "her final word" },
  titan_legion: { family: "surge", epithet: "monuments march" },
  // --- Tier 10, the mythic band ---
  oblivion: { family: "collapse", epithet: "nothing remains" },
  grand_army: { family: "surge", epithet: "the muster of a nation" },
  ascendancy: { family: "ignite", epithet: "ascend, all of you" },
  total_war: { family: "burst", epithet: "everything, everywhere" },
};

export interface UsageCardLike {
  id: string;
  category?: string;
  tier?: number;
}

/**
 * Total over any card record: the flagship roster first, then the category
 * vocabulary keyed by the card's hash, then a neutral stamp floor for cards
 * outside the taxonomy. Never returns nothing — the coverage gate re-asserts
 * that across every usable card on every run.
 */
export function resolveUsage(card: UsageCardLike): UsageResolution {
  const variant = entranceVariant(`use:${card.id}`);
  const tier = card.tier ?? 0;
  const flagship = USAGE_FLAGSHIPS[card.id];
  if (flagship) {
    const theme =
      card.category && isArrivalCategory(card.category)
        ? ARRIVAL_THEME[card.category]
        : DEFAULT_ARRIVAL_THEME;
    return { family: flagship.family, theme, variant, crown: true, epithet: flagship.epithet };
  }
  if (card.category && isArrivalCategory(card.category)) {
    const pool = FAMILY_BY_CATEGORY[card.category];
    return {
      family: pool[variant.seed % pool.length],
      theme: ARRIVAL_THEME[card.category],
      variant,
      crown: tier >= 9,
    };
  }
  return { family: "stamp", theme: DEFAULT_ARRIVAL_THEME, variant, crown: tier >= 9 };
}
