// In-play card counts and tiers per codex tab, computed once on the server so
// the codex intro ("732 buffs in this tab") and the tier filter's options are
// final at the first paint instead of changing when the browser's library
// import lands (the intro grew a line and pushed the list down 22px on a phone;
// the tier select widened and pushed the filter row 43px on desktop). Retired
// cards are left out, as in the browser.

import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { isRetired } from "@/engine/retired";
import { isBoonCard, isHexCard, tiersPresent, type Library } from "./codexData";

const live = ALL_BUFFS.filter((b) => !isRetired(b.id));

const families: Record<Library, { tier: number }[]> = {
  buffs: live.filter((b) => !isHexCard(b) && !isBoonCard(b)),
  rules: ALL_NERFS.filter((n) => !isRetired(n.id)),
  hexes: live.filter(isHexCard),
  boons: live.filter(isBoonCard),
};

export const CODEX_COUNTS: Record<Library, number> = {
  buffs: families.buffs.length,
  rules: families.rules.length,
  hexes: families.hexes.length,
  boons: families.boons.length,
};

export const CODEX_TIERS: Record<Library, number[]> = {
  buffs: tiersPresent(families.buffs),
  rules: tiersPresent(families.rules),
  hexes: tiersPresent(families.hexes),
  boons: tiersPresent(families.boons),
};
