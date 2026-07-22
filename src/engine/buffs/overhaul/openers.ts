// OPENERS: buff mode's opening pick (owner feature). Each game starts with a
// pair of these tiny cards dealt to each player (rollOpenerOffers), exactly
// like the opening nerf pair. Design rules:
//   - SMALL improvements only: a one-shot move quirk, a scouting glimpse, a
//     single draft perk, a tiny delayed gift. Nothing that swings the opening
//     by more than roughly a tempo.
//   - opener: true, tier 1, never in the cadence pools (draft.ts filters).
//   - Time effects rare and tiny (owner rule: time is garnish).
//   - Names are CURATED, not patterned: no "X of Y" mills, no numbered
//     variants. Every entry has its own name, flavor, and icon.
//   - Every card gets a unique deterministic entrance animation client-side
//     (see cardEntrance's opener entrance generator), keyed off its id.
//
// The file is organized as small parametrized FAMILIES (a builder + a bank of
// curated entries), which keeps 250 cards honest: mechanics vary by real
// parameters, while names/flavor stay hand-picked.

import {
  Buff,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  activatedSimple,
  augment,
  card,
  instant,
  leapMoves,
  mySquares,
  ownRank,
  slideMoves,
  teleportMoves,
  tickTurns,
  turnsLeft,
} from "./shared";

type OpenerMeta = {
  id: string;
  name: string;
  flavor: string;
  icon: string;
};

/** Stamp the opener flags onto a built card. */
function opener(meta: OpenerMeta, description: string, mech: Parameters<typeof card>[1]): Buff {
  return {
    ...card(
      {
        id: `op_${meta.id}`,
        name: meta.name,
        description,
        tier: 1,
        category: mech.kind === "passive" ? "movement" : "item",
        icon: meta.icon,
        flavor: meta.flavor,
      },
      mech,
    ),
    opener: true,
  };
}

// ---------------------------------------------------------------------------
// FAMILY: File Scouts. One named pawn file gets a single free sideways step
// (one-shot, empty destination). 8 entries, one per file, each with its own
// personality. Reference family: every other family follows this shape.
// ---------------------------------------------------------------------------

const FILE_SCOUTS: Array<OpenerMeta & { file: number }> = [
  { id: "harbor_walk", name: "Harbor Walk", flavor: "The a-file smells of salt and opportunity.", icon: "Anchor", file: 0 },
  { id: "back_alley", name: "Back Alley", flavor: "The b-file has shortcuts the map refuses to show.", icon: "MapPin", file: 1 },
  { id: "cloister_step", name: "Cloister Step", flavor: "The c-file monks shuffle quietly but decisively.", icon: "Church", file: 2 },
  { id: "market_lane", name: "Market Lane", flavor: "On the d-file everything is negotiable, even geometry.", icon: "ShoppingBasket", file: 3 },
  { id: "parade_route", name: "Parade Route", flavor: "The e-file was built for marching. Sideways, today.", icon: "Flag", file: 4 },
  { id: "garden_gate", name: "Garden Gate", flavor: "The f-file gardeners trim their hedges diagonally.", icon: "Flower2", file: 5 },
  { id: "gallery_row", name: "Gallery Row", flavor: "The g-file critics agree: a bold lateral composition.", icon: "Palette", file: 6 },
  { id: "harborside_h", name: "Lighthouse Walk", flavor: "The h-file keeps one light burning and one path open.", icon: "Lightbulb", file: 7 },
];

function fileScout(entry: (typeof FILE_SCOUTS)[number]): Buff {
  const fileName = "abcdefgh"[entry.file];
  return opener(
    entry,
    `Your ${fileName}-file pawn may step one square sideways, once. The destination must be empty.`,
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (FILE(sq) !== entry.file) continue;
        const tos: Square[] = [];
        if (FILE(sq) > 0) tos.push(sq - 1);
        if (FILE(sq) < 7) tos.push(sq + 1);
        out.push(...teleportMoves(api.board, sq, tos, inst.id));
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: First Steps. A tiny delayed gift that pays out after your Nth move.
// Board-based payouts only. Reference family for delayed openers.
// ---------------------------------------------------------------------------

const FIRST_STEPS: Array<OpenerMeta & { after: number; prize: "reroll" | "peek" | "seconds" }> = [
  { id: "slow_burn", name: "Slow Burn", flavor: "Patience is a position too.", icon: "FlameKindling", after: 6, prize: "reroll" },
  { id: "early_bird", name: "Early Bird", flavor: "It does not catch the worm. It reads the worm's mail.", icon: "Sunrise", after: 4, prize: "peek" },
  { id: "second_wind_sip", name: "Water Break", flavor: "Hydration wins endgames.", icon: "GlassWater", after: 8, prize: "seconds" },
];

function firstStep(entry: (typeof FIRST_STEPS)[number]): Buff {
  const what =
    entry.prize === "reroll"
      ? "gain a draft reroll"
      : entry.prize === "peek"
        ? "see your opponent's next draft offer"
        : "gain 6 seconds";
  return opener(entry, `After your ${entry.after}th move, ${what}.`, {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = entry.after;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.me) return;
      const t = ((inst.state.turns as number) ?? 0) - 1;
      inst.state.turns = t;
      if (t > 0) return;
      if (entry.prize === "reroll") api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      else if (entry.prize === "peek") api.mine.flags.seeOppCards = true;
      else api.adjustClock({ addSelfSec: 6 });
      inst.spent = true;
    },
    status: (inst) => `pays out in ${turnsLeft(inst)} of your moves`,
  });
}

// ---------------------------------------------------------------------------
// Assembly. Further families land alongside these two until the set reaches
// roughly 250 cards (see docs/overhaul-checklist.md, opener task).
// ---------------------------------------------------------------------------

export const OPENER_CARDS: Buff[] = [
  ...FILE_SCOUTS.map(fileScout),
  ...FIRST_STEPS.map(firstStep),
];
