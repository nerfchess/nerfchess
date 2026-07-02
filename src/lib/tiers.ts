// Single source of truth for the 8 difficulty tiers. Index 0 is a filler so
// arrays can be indexed directly by tier number (1..8).

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
];

export const TIER_ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export const TIER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
