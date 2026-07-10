// The ONE way to decide how a rating renders, shared by every display
// surface (leaderboard, profiles, community hub, in-game rows).
//
// A rating is "provisional" while its rating deviation is still wide, and
// renders with a trailing "?" ("1500?"). The threshold is PROVISIONAL_RD in
// lib/glicko.ts — the same constant the server uses when it stamps
// `provisional` onto start/end frames — so a player can never look
// provisional on one surface and settled on another. (Several pages used to
// hardcode `rd > 150` while the server said RD > 110; a player with RD 130
// showed "1487?" in-game but a bare "1487" on the leaderboard.)

import { isProvisional, PROVISIONAL_RD } from "./glicko";

export { PROVISIONAL_RD };

/** True when a rating with this deviation should render as provisional
 *  ("1500?"). Null/undefined RD (unknown) is treated as settled, matching the
 *  server, which omits the provisional flag when RD is untracked. */
export function isProvisionalRd(rd: number | null | undefined): boolean {
  return typeof rd === "number" && isProvisional({ rd });
}

/** The display string for a rating: "1487", "1500?" (provisional), or "?"
 *  when there is no rating at all. Every surface that renders the number and
 *  the marker as one string should go through this. */
export function formatRating(
  rating: number | null | undefined,
  rd?: number | null,
): string {
  if (rating == null) return "?";
  return `${Math.round(rating)}${isProvisionalRd(rd) ? "?" : ""}`;
}
