// The owner's signature cards: the handful named after real people, which get a
// distinct radiance when they come out of a draft.
//
// This is PRESENTATION ONLY. It changes nothing about tiers, pools, odds, or
// rules, so it can never affect a game's outcome or the deterministic replay.
// The list lives here rather than in the engine because the engine has no
// business knowing which cards are sentimental.

/** Cards that pull with a godlike halo instead of the ordinary tier glow. */
export const GODLIKE_CARD_IDS: ReadonlySet<string> = new Set([
  "i_love_my_gf",
  "i_love_cam",
  "joseph_leung",
]);

export function isGodlikeCard(id: string): boolean {
  return GODLIKE_CARD_IDS.has(id);
}
