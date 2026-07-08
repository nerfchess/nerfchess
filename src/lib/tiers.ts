// Single source of truth for the difficulty tiers. Index 0 is a filler so
// arrays can be indexed directly by tier number (1..8). Tiers 9 (apex) and 10
// (mythic) are the special bands: neither appears in the normal draft
// (TIER_COUNT / TIER_NUMBERS stay 1..8), but their labels live here so a
// granted apex or mythic card still renders.

export const TIER_COUNT = 8;

export const TIER_LABEL = [
  "",
  "Trivial",
  "Easy",
  "Common",
  "Severe",
  "Brutal",
  "Cruel",
  "Punishing",
  "Unhinged",
  "Apex",
  "Mythic",
];

export const TIER_ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export const TIER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
