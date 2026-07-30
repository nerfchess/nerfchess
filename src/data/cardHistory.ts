// Editorial history for the codex card pages: when each card entered the
// game, plus curated per-card balance notes. Server-safe pure data (no React,
// no client APIs) so the card routes render it statically as crawlable HTML.
//
// Two layers:
// - WAVES: one "added" event per shipping wave, dated from the git history of
//   the card barrels and the PR numbers in docs/CHANGELOG.md. Every card maps
//   to a wave via resolveWave, so every page has at least one history line.
// - CARD_HISTORY: hand-curated per-card events (tier moves, reworks) keyed
//   "buff:<id>" / "nerf:<id>". Starts sparse; grows as balance changes ship.
//
// Runtime moderator changes (card_overrides edits) are NOT here: those are
// recorded in the card_override_history table and merged in client-side by
// the CardInsights panel.

import { BALANCE_WAVE_2026_07_22 } from "./balanceWave1";
import { isBoon, type Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import { buffCollection } from "@/lib/cardCollections";
import { EXPANDED_NERFS } from "@/engine/nerfs/expanded";
import { WILD_NERFS } from "@/engine/nerfs/wild";

export interface CardHistoryEvent {
  /** ISO date, ET calendar day (matching docs/CHANGELOG.md). */
  date: string;
  kind: "added" | "retier" | "rework" | "reword" | "disabled" | "enabled";
  /** One human sentence, rendered verbatim on the card page. */
  note: string;
  pr?: number;
}

// --- Waves --------------------------------------------------------------------

type WaveId =
  | "nerf-core"
  | "nerf-expanded"
  | "nerf-wild"
  | "buff-core"
  | "hex"
  | "boon"
  | "fantasy"
  | "funny"
  | "wild"
  | "mystic"
  | "apex";

const WAVES: Record<WaveId, CardHistoryEvent> = {
  "nerf-core": {
    date: "2026-05-14",
    kind: "added",
    note: "Part of the original nerf library Nerf Chess launched with.",
  },
  "nerf-expanded": {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the expanded-nerfs wave: 82 new handicaps across all eight tiers.",
    pr: 144,
  },
  "nerf-wild": {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the Wild expansion nerfs.",
  },
  "buff-core": {
    date: "2026-07-04",
    kind: "added",
    note: "Part of the original buff library that shipped with Buff mode and the draft system.",
  },
  hex: {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the opponent-hex wave: the first curses you cast on the other player.",
    pr: 140,
  },
  boon: {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the nerf-relief boon wave, growing the relief pool from 25 to 52 cards.",
    pr: 142,
  },
  fantasy: {
    date: "2026-07-06",
    kind: "added",
    note: "Added with the Fantasy collection.",
  },
  funny: {
    date: "2026-07-06",
    kind: "added",
    note: "Added with the Funny / meta collection.",
  },
  wild: {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the Wild collection: elemental, warfare, arcane, and chaos cards.",
  },
  mystic: {
    date: "2026-07-10",
    kind: "added",
    note: "Added with the Mystic collection: prophecy, star signs, tarot, and spirit cards.",
  },
  apex: {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the apex and mythic bands: cards never drafted normally, won only through a gamble or a top-tier bank.",
  },
};

const EXPANDED_NERF_IDS = new Set(EXPANDED_NERFS.map((n) => n.id));
const WILD_NERF_IDS = new Set(WILD_NERFS.map((n) => n.id));

function buffWave(b: Buff): WaveId {
  // Tier 9-10 cards shipped as their own band regardless of theme.
  if (b.tier >= 9) return "apex";
  const collection = buffCollection(b);
  if (collection === "Fantasy") return "fantasy";
  if (collection === "Mystic") return "mystic";
  if (collection === "Wild") return "wild";
  if (collection === "Funny") return "funny";
  if (b.category === "hex") return "hex";
  if (isBoon(b)) return "boon";
  return "buff-core";
}

function nerfWave(n: Nerf): WaveId {
  if (WILD_NERF_IDS.has(n.id)) return "nerf-wild";
  if (EXPANDED_NERF_IDS.has(n.id)) return "nerf-expanded";
  return "nerf-core";
}

// --- Curated per-card events ---------------------------------------------------

/** Hand-written balance notes, key "buff:<id>" | "nerf:<id>". Append here when
 * a card is retiered, reworked, or reworded in code, with the changelog date
 * and PR. Keep each note one sentence; the page renders them as a timeline. */
const D_2026_07_30 = "2026-07-30";

export const CARD_HISTORY: Record<string, CardHistoryEvent[]> = {
  // 2026-07-30 effect-category pass. Tier is the only power dial (draft.ts:
  // "one uniform seeded pick, no weights"), so a family is buffed by making its
  // weak members cheaper to reach and flattened by making its outliers cost
  // more. Every move below is justified against a same-family comparison, not
  // against an absolute scale.

  // Freeze family: the single-piece ladder is 1 turn ~ T2/T3, 2 turns ~ T5,
  // 3 turns ~ T6 (wa_arrest_time is the benchmark). These sat above it.
  "buff:hx4_glass_prison": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 8 to 6: freezing one rook or queen for 3 turns is exactly wa_arrest_time, which has always been tier 6." },
  ],
  "buff:hx4_tolling_thirds": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 8 to 6: two staggered one-turn freezes on their second most valuable piece is mid-ladder value, not flagship value." },
  ],
  "buff:hx4_iron_maiden": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 6 to 5: two turns, and delayed a move, against wa_arrest_time's three immediate turns at the same tier." },
  ],
  "buff:hx4_hundred_year_nap": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 6 to 5: three turns like wa_arrest_time, but it thaws the moment you attack the sleeper." },
  ],
  "buff:bn4_glacier_calving": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 6 to 5: three one-turn freezes, paid for with your next draft." },
  ],
  "buff:hx4_undertow": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 5 to 4: one turn, and only on pieces that choose to move backward." },
  ],
  "buff:hx4_caught_mid_stride": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 4 to 3: freezing the last-moved piece for one turn is snap_freeze, which sat a tier lower." },
  ],
  "buff:snap_freeze": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 3 to 2: the shortest freeze in the game, on a piece you do not choose." },
  ],
  "buff:hx4_the_ides": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 3 to 2: one turn, four turns away, on whichever piece they happen to move." },
  ],

  // Extra-move family flattened the other way: a bonus move is the strongest
  // tempo effect in the game, so the cards handing out two and three of them
  // now cost what they are worth.
  "buff:sugar_rush": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 4 to 6: three extra moves at once, for one skipped turn, was the cheapest triple-move in the library." },
  ],
  "buff:white_monster": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 5 to 6: two extra moves with no crash at all, where every other multi-move card pays a price." },
  ],
  "buff:coffee": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 4 to 5: two extra moves, against one given back to your opponent." },
  ],

  // Promotion denial: two cards in the whole library, one of them draftable.
  "buff:hx4_glass_ceiling": [
    { date: D_2026_07_30, kind: "retier", note: "Tier 4 to 3: shutting promotion off for five turns is a narrow window on a slow plan, and it is the only draftable card of its kind." },
  ],
};

// --- Lookup ---------------------------------------------------------------------

/** The full editorial timeline for a card: its wave-introduction event plus
 * any generated balance-wave events and curated events, oldest first. Never
 * empty. */
export function historyFor(kind: "buff" | "nerf", card: Buff | Nerf): CardHistoryEvent[] {
  const wave = kind === "buff" ? buffWave(card as Buff) : nerfWave(card as Nerf);
  const key = `${kind}:${card.id}`;
  const balance = BALANCE_WAVE_2026_07_22[key] ?? [];
  const curated = CARD_HISTORY[key] ?? [];
  return [WAVES[wave], ...balance, ...curated].sort((a, b) => a.date.localeCompare(b.date));
}
