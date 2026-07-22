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
// parameters, while names/flavor stay hand-picked. This file holds the
// movement-flavored families; the info/rider/cosmetic families live in
// openers2.ts (built through buildOpeners2 so the two modules' import cycle
// never calls the opener factory before it exists, mirroring how helpers.ts
// and tier9.ts resolve theirs).

import {
  Buff,
  type BuffApi,
  DIAG_DIRS,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  advancePawn,
  advanceablePawns,
  attackersOf,
  augment,
  captureSquare,
  card,
  flashSquares,
  fwdOf,
  inBoard,
  leapMoves,
  mySquares,
  ownRank,
  pawnRankOk,
  phasingSlideMoves,
  slideMoves,
  teleportMoves,
  turnsLeft,
  type Tier,
} from "./shared";
import { buildOpeners2 } from "./openers2";

export type OpenerMeta = {
  id: string;
  name: string;
  flavor: string;
  icon: string;
  /** Balance-pass tier override. Openers default to tier 1; the opener pool
   * ignores tier entirely (openerPool keys off `opener: true`), so this only
   * changes the tier shown on the card face and in the codex. */
  tier?: Tier;
};

const FILE_NAMES = "abcdefgh";

/** Stamp the opener flags onto a built card. */
export function opener(
  meta: OpenerMeta,
  description: string,
  mech: Parameters<typeof card>[1],
): Buff {
  return {
    ...card(
      {
        id: `op_${meta.id}`,
        name: meta.name,
        description,
        tier: meta.tier ?? 1,
        category: mech.kind === "passive" ? "movement" : "item",
        icon: meta.icon,
        flavor: meta.flavor,
      },
      mech,
    ),
    opener: true,
  };
}

/** Like `augment`, but "use it or lose it": whenever a turn passes on which the
 * granted move was on offer yet the owner played something else, one charge is
 * forfeit (the engine only ever offers the move when it is legal, so a genuinely
 * failed attempt cannot occur; this is the faithful stand-in). Charges are also
 * spent normally when a tagged move is played. */
function lossyAugment(
  gen: Parameters<typeof augment>[0],
  charges = 1,
): Parameters<typeof card>[1] {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    augmentMoves: (moves, inst, api) => {
      if (((inst.state.charges as number) ?? 0) <= 0) return;
      const extra = gen(moves, inst, api);
      if (extra.length > 0) inst.state.armed = true;
      addNovel(moves, extra);
    },
    onMovePlayed: (inst, move, api) => {
      if (((inst.state.charges as number) ?? 0) <= 0) return;
      if (move.color !== api.me) return;
      if (move.via === inst.id) {
        const left = ((inst.state.charges as number) ?? 1) - 1;
        inst.state.charges = left;
        inst.state.armed = false;
        if (left <= 0) inst.spent = true;
        return;
      }
      // A turn passed with the move on offer but unplayed: forfeit one charge.
      if (inst.state.armed) {
        const left = ((inst.state.charges as number) ?? 1) - 1;
        inst.state.charges = left;
        inst.state.armed = false;
        if (left <= 0) inst.spent = true;
      }
    },
    status: (inst) => {
      const c = (inst.state.charges as number) ?? charges;
      return c > 0 ? `${c} attempt${c > 1 ? "s" : ""} left` : null;
    },
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
  if (entry.id === "back_alley") {
    // Reworked identity: the a-file pawn slips one square inward onto the empty
    // b-file square (a quiet step, never a capture).
    return opener(
      entry,
      "Once, your a-file pawn may step one square sideways to the b-file. The destination must be empty; not a capture.",
      augment((_moves, inst, api) => {
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "p")) {
          if (FILE(sq) !== 0) continue;
          out.push(...teleportMoves(api.board, sq, [sq + 1], inst.id));
        }
        return out;
      }),
    );
  }
  if (entry.id === "cloister_step") {
    // Reworked: a free-action pair move. Reposition one bishop a single diagonal
    // step onto an empty square, and the c-file pawn nearest it sidesteps one
    // square toward that bishop's file if that square is empty.
    const diagStep = (api: BuffApi, bsq: Square): Square[] =>
      DIAG_DIRS.map(([df, dr]) => [FILE(bsq) + df, RANK(bsq) + dr] as const)
        .filter(([f, r]) => inBoard(f, r) && !api.board.pieces[SQ(f, r)])
        .map(([f, r]) => SQ(f, r));
    return opener(
      entry,
      "Use once as a free action: step one of your bishops one square diagonally onto an empty square (not a capture); your c-file pawn nearest it then sidesteps one square toward that bishop if that square is empty.",
      activated(
        (_inst, api, picks) => {
          if (picks.length === 0) {
            return {
              kind: "square",
              label: "Choose a bishop to reposition",
              squares: mySquares(api.board, api.me, "b").filter((bsq) => diagStep(api, bsq).length > 0),
            };
          }
          const bsq = picks[0]?.square;
          if (picks.length === 1 && bsq != null) {
            return {
              kind: "square",
              label: "Step the bishop one square diagonally",
              squares: diagStep(api, bsq),
            };
          }
          return null;
        },
        (_inst, api, picks) => {
          const bsq = picks[0]?.square,
            dest = picks[1]?.square;
          if (bsq == null || dest == null || api.board.pieces[dest]) return;
          const bishopFile = FILE(bsq);
          api.relocate(bsq, dest);
          const cPawns = mySquares(api.board, api.me, "p").filter((sq) => FILE(sq) === 2);
          if (cPawns.length > 0) {
            let chosen = cPawns[0];
            for (const p of cPawns) {
              if (Math.abs(RANK(p) - RANK(dest)) < Math.abs(RANK(chosen) - RANK(dest))) chosen = p;
            }
            const dir = bishopFile > 2 ? 1 : bishopFile < 2 ? -1 : 0;
            if (dir !== 0) {
              const f = FILE(chosen) + dir,
                r = RANK(chosen);
              const to = SQ(f, r);
              if (inBoard(f, r) && !api.board.pieces[to] && pawnRankOk(to)) api.relocate(chosen, to);
            }
          }
        },
        { freeAction: true },
      ),
    );
  }
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
  const earlyBird = entry.id === "early_bird";
  const what =
    entry.prize === "reroll"
      ? "gain a draft reroll"
      : entry.prize === "peek"
        ? earlyBird
          ? "see your opponent's next draft offer and gain 5 seconds"
          : "see your opponent's next draft offer"
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
      else if (entry.prize === "peek") {
        api.mine.flags.seeOppCards = true;
        if (earlyBird) api.adjustClock({ addSelfSec: 5 });
      } else api.adjustClock({ addSelfSec: 6 });
      inst.spent = true;
    },
    status: (inst) => `pays out in ${turnsLeft(inst)} of your moves`,
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Country Roads. One named pawn file keeps its two-square stride for
// later: once, that pawn may advance two squares from wherever it stands
// (both squares empty, no capture, no en passant granted).
// ---------------------------------------------------------------------------

const COUNTRY_ROADS: Array<OpenerMeta & { file: number }> = [
  { id: "towpath", name: "Towpath", flavor: "The barge horse knows exactly two speeds. This is the fast one.", icon: "Ship", file: 0 },
  { id: "bridle_path", name: "Bridle Path", flavor: "Two lengths at a canter, then back to plodding.", icon: "Route", file: 1 },
  { id: "corduroy_road", name: "Corduroy Road", flavor: "Logs laid crosswise. Bumpy, but you cover ground.", icon: "TreePine", file: 2, tier: 2 },
  { id: "old_post_road", name: "Old Post Road", flavor: "The mail coach never stopped for scenery.", icon: "Milestone", file: 3 },
  { id: "pilgrim_road", name: "Pilgrim Road", flavor: "Long strides for the faithful of the e-file.", icon: "Footprints", file: 4 },
  { id: "ferry_crossing", name: "Ferry Crossing", flavor: "Two squares for one coin. The ferryman keeps the change.", icon: "Sailboat", file: 5 },
  { id: "goat_track", name: "Goat Track", flavor: "Steep, narrow, and faster than the king's own highway.", icon: "Mountain", file: 6 },
  { id: "smugglers_lane", name: "Smugglers' Lane", flavor: "Nobody counts your steps after dark on the h-file.", icon: "Moon", file: 7 },
];

function countryRoad(entry: (typeof COUNTRY_ROADS)[number]): Buff {
  const fileName = FILE_NAMES[entry.file];
  const lossy = entry.id === "bridle_path";
  const gen: Parameters<typeof augment>[0] = (_moves, inst, api) => {
    const out: Move[] = [];
    const fwd = fwdOf(api.me);
    for (const sq of mySquares(api.board, api.me, "p")) {
      if (FILE(sq) !== entry.file) continue;
      const mid = sq + fwd, to = sq + fwd * 2;
      if (to < 0 || to > 63) continue;
      if (!pawnRankOk(to)) continue;
      if (!api.board.pieces[mid] && !api.board.pieces[to]) {
        out.push(...teleportMoves(api.board, sq, [to], inst.id));
      }
    }
    return out;
  };
  return opener(
    entry,
    `Once, your ${fileName}-file pawn may advance two squares from wherever it stands. Both squares must be empty; it cannot capture this way.${
      lossy ? " If the advance is on offer on your turn but you play something else, the charge is spent." : ""
    }`,
    lossy ? lossyAugment(gen) : augment(gen),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Strange Gaits. One of your knights gets a single alternate leap
// borrowed from a fairy-chess stable. Capturing on landing is allowed; the
// charge is spent when the tagged move is played.
// ---------------------------------------------------------------------------

function symLeaps(a: number, b: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (const [x, y] of [[a, b], [b, a]]) {
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        const p: readonly [number, number] = [x * sx, y * sy];
        if (!out.some((q) => q[0] === p[0] && q[1] === p[1])) out.push(p);
      }
    }
  }
  return out;
}

const STRANGE_GAITS: Array<
  OpenerMeta & {
    leaps: Array<readonly [number, number]>;
    forward?: boolean;
    how: string;
    /** "none": non-capturing only. "only": capturing only. */
    capture?: "none" | "only";
    /** Use it or lose it: an unplayed turn spends a charge. */
    lossy?: boolean;
  }
> = [
  { id: "camel_fair", name: "Camel Fair", flavor: "Rented by the hour. Spits at bishops.", icon: "Tent", leaps: symLeaps(3, 1), how: "a camel leap, 3 by 1, in any direction", capture: "none" },
  { id: "zebra_crossing", name: "Zebra Crossing", flavor: "Look both ways, then confuse everyone.", icon: "Fence", leaps: symLeaps(3, 2), how: "a zebra leap, 3 by 2, in any direction" },
  { id: "parade_elephant", name: "Parade Elephant", flavor: "Ceremonial, enormous, and surprisingly diagonal.", icon: "Landmark", leaps: symLeaps(2, 2), how: "an elephant hop, exactly 2 diagonally, jumping anything between" },
  { id: "siege_wagon", name: "Siege Wagon", flavor: "It only knows one trick: straight ahead, loudly.", icon: "Castle", leaps: symLeaps(2, 0), how: "a wagon hop, exactly 2 straight, jumping anything between" },
  { id: "viziers_errand", name: "Vizier's Errand", flavor: "One dignified step. No hopping. There are appearances.", icon: "Crown", leaps: symLeaps(1, 0), how: "a single step to an adjacent square, straight only" },
  { id: "old_counselor", name: "Old Counselor", flavor: "He moves one diagonal square per decade, but he is never wrong.", icon: "Glasses", leaps: symLeaps(1, 1), how: "a single diagonal step to an adjacent square" },
  { id: "pole_vault", name: "Pole Vault", flavor: "Plant, swing, and clear the whole hedgerow.", icon: "TrendingUp", leaps: symLeaps(3, 0), how: "a vault of exactly 3 straight, jumping anything between" },
  { id: "long_jump", name: "Long Jump", flavor: "The sand pit is three ranks over. Stick the landing.", icon: "Wind", leaps: symLeaps(3, 3), how: "a jump of exactly 3 diagonally, clearing anything between" },
  { id: "giraffe_keeper", name: "Giraffe Keeper", flavor: "The enclosure was never going to hold her.", icon: "TreePalm", leaps: symLeaps(4, 1), how: "a giraffe leap, 4 by 1, in any direction" },
  { id: "dromedary_post", name: "Dromedary Post", flavor: "One hump, two deliveries, no return address.", icon: "Sun", leaps: symLeaps(3, 1), forward: true, how: "a camel leap, 3 by 1, toward the enemy side only", capture: "only" },
  { id: "colts_gallop", name: "Colt's Gallop", flavor: "All legs, no brakes, forward only.", icon: "Sprout", leaps: symLeaps(3, 2), forward: true, how: "a zebra leap, 3 by 2, toward the enemy side only", lossy: true },
  { id: "signal_rocket", name: "Signal Rocket", flavor: "Four squares of flight and a very confused landing.", icon: "Rocket", leaps: symLeaps(4, 0), how: "a launch of exactly 4 straight, clearing anything between" },
];

function strangeGait(entry: (typeof STRANGE_GAITS)[number]): Buff {
  // Forward-only gaits trade the lost directions for a second use, so the
  // any-direction sibling never strictly dominates them.
  const uses = entry.forward ? 2 : 1;
  const captureNote =
    entry.capture === "none"
      ? " Not a capture; the landing square must be empty."
      : entry.capture === "only"
        ? " Only to capture on landing; a leap onto an empty square is not offered."
        : " It may capture on landing.";
  const lossyNote = entry.lossy
    ? " A turn where the leap is on offer but not taken spends one use."
    : "";
  const gen: Parameters<typeof augment>[0] = (_moves, inst, api) => {
    const dir = api.me === "w" ? 1 : -1;
    const leaps = entry.forward
      ? entry.leaps.filter(([, dr]) => dr * dir > 0)
      : entry.leaps;
    const out: Move[] = [];
    for (const sq of mySquares(api.board, api.me, "n")) {
      for (const m of leapMoves(api.board, sq, leaps, inst.id)) {
        if (entry.capture === "none" && m.captured) continue;
        if (entry.capture === "only" && !m.captured) continue;
        out.push(m);
      }
    }
    return out;
  };
  return opener(
    entry,
    `${uses > 1 ? "Twice" : "Once"}, one of your knights may make ${entry.how}.${captureNote}${lossyNote}`,
    entry.lossy ? lossyAugment(gen, uses) : augment(gen, uses),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Leapfrogs. One-shot playground vault: a named piece may hop over an
// ADJACENT friendly piece of a named type, landing on the empty square
// directly beyond. Never a capture.
// ---------------------------------------------------------------------------

const ORTHO4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const ALL8 = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]] as const;

const LEAPFROGS: Array<
  OpenerMeta & {
    mover: "p" | "n" | "b" | "r" | "q" | "k";
    over: "p" | "n" | "b" | "r" | "q";
    dirs: readonly (readonly [number, number])[];
    oriented?: boolean;
    what: string;
  }
> = [
  { id: "leapfrog_lesson", name: "Leapfrog Lesson", flavor: "Hands on the shoulders, eyes on the diagonal.", icon: "Rabbit", mover: "b", over: "p", dirs: DIAG_DIRS, what: "One of your bishops may hop over an adjacent friendly pawn on its diagonal" },
  { id: "vaulting_horse", name: "Vaulting Horse", flavor: "For once, the horse is the obstacle.", icon: "Dumbbell", mover: "b", over: "n", dirs: DIAG_DIRS, what: "One of your bishops may hop over an adjacent friendly knight on its diagonal" },
  { id: "sandbag_hurdle", name: "Sandbag Hurdle", flavor: "Sappers stack them; towers clear them.", icon: "Layers", mover: "r", over: "p", dirs: ORTHO4, what: "One of your rooks may hop over an adjacent friendly pawn on its rank or file" },
  { id: "stable_gate", name: "Stable Gate", flavor: "The rook took the fence like it owed him money.", icon: "DoorOpen", mover: "r", over: "n", dirs: ORTHO4, what: "One of your rooks may hop over an adjacent friendly knight on its rank or file" },
  { id: "garden_hedge", name: "Garden Hedge", flavor: "Her majesty does not walk around topiary.", icon: "Shrub", mover: "q", over: "p", dirs: ALL8, what: "Your queen may hop over an adjacent friendly pawn in any direction" },
  { id: "piggyback", name: "Piggyback", flavor: "Infantry regulations are silent on the matter.", icon: "Baby", mover: "p", over: "p", dirs: [[0, 1]], oriented: true, what: "One of your pawns may hop over the friendly pawn directly ahead of it" },
  { id: "silk_curtain", name: "Silk Curtain", flavor: "She stepped through the bishop's shadow and out the other side.", icon: "Wand", mover: "q", over: "b", dirs: DIAG_DIRS, what: "Your queen may hop over an adjacent friendly bishop on a diagonal" },
  { id: "tower_bridge", name: "Tower Bridge", flavor: "One tower raises, the other rolls straight across.", icon: "Building2", mover: "r", over: "r", dirs: ORTHO4, what: "One of your rooks may hop over your other rook when adjacent on a rank or file" },
];

function leapfrog(entry: (typeof LEAPFROGS)[number]): Buff {
  return opener(
    entry,
    `${entry.what}, landing on the square directly beyond, once. The landing square must be empty.`,
    augment((_moves, inst, api) => {
      const dir = api.me === "w" ? 1 : -1;
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, entry.mover)) {
        for (const [df, dr0] of entry.dirs) {
          const dr = entry.oriented ? dr0 * dir : dr0;
          const f1 = FILE(sq) + df, r1 = RANK(sq) + dr;
          const f2 = FILE(sq) + df * 2, r2 = RANK(sq) + dr * 2;
          if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
          const mid = api.board.pieces[SQ(f1, r1)];
          if (!mid || mid.color !== api.me || mid.type !== entry.over) continue;
          const to = SQ(f2, r2);
          if (entry.mover === "p" && !pawnRankOk(to)) continue;
          out.push(...teleportMoves(api.board, sq, [to], inst.id));
        }
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Backstage Passes. While standing on your back rank, a named piece
// may make one sideways hop of a fixed distance along that rank, ignoring
// whatever stands between. Destination must be empty; never a capture.
// ---------------------------------------------------------------------------

const BACKSTAGE: Array<OpenerMeta & { type: "n" | "b" | "r" | "q"; dist: number }> = [
  { id: "green_room", name: "Green Room", flavor: "The knight slides one seat down the sofa.", icon: "Sofa", type: "n", dist: 1 },
  { id: "stage_left", name: "Stage Left", flavor: "Exit knight, pursued by absolutely nothing.", icon: "Theater", type: "n", dist: 2 },
  { id: "prompt_corner", name: "Prompt Corner", flavor: "The bishop shuffles over to whisper the next line.", icon: "MessageSquare", type: "b", dist: 1 },
  { id: "trapdoor_exit", name: "Trapdoor", flavor: "The bishop vanishes and reappears two boards over.", icon: "DoorClosed", type: "b", dist: 2 },
  { id: "star_dressing_room", name: "Star Dressing Room", flavor: "Two doors down, better lighting, same queen.", icon: "Star", type: "q", dist: 2 },
  { id: "set_change", name: "Set Change", flavor: "The tower is scenery. Scenery moves between acts.", icon: "Hammer", type: "r", dist: 2 },
];

function backstagePass(entry: (typeof BACKSTAGE)[number]): Buff {
  const names: Record<string, string> = { n: "knight", b: "bishop", r: "rook", q: "queen" };
  return opener(
    entry,
    `Once, while on your back rank, one of your ${names[entry.type]}s may hop exactly ${entry.dist} square${entry.dist > 1 ? "s" : ""} sideways along it, ignoring anything between. The destination must be empty.`,
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      const home = ownRank(api.me, 0);
      for (const sq of mySquares(api.board, api.me, entry.type)) {
        if (RANK(sq) !== home) continue;
        for (const s of [-1, 1]) {
          const f = FILE(sq) + s * entry.dist;
          if (f < 0 || f > 7) continue;
          out.push(...teleportMoves(api.board, sq, [SQ(f, home)], inst.id));
        }
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Ballroom Steps. Your king learns one two-square figure: a lateral
// dash, a diagonal glide, a straight stride, or a hop over a neighbor. All
// one-shot, all to an empty square, never a capture.
// ---------------------------------------------------------------------------

const BALLROOM: Array<OpenerMeta & { df: number; dr: number; hop?: boolean }> = [
  { id: "quickstep", name: "Quickstep", flavor: "Two beats toward the h-side, chin up.", icon: "Music2", df: 1, dr: 0 },
  { id: "waltz_left", name: "Waltz Left", flavor: "One two three, one two three, toward the a-side.", icon: "Music", df: -1, dr: 0 },
  { id: "tango_dip", name: "Tango Dip", flavor: "Two squares forward and to the left, with feeling.", icon: "Flame", df: -1, dr: 1 },
  { id: "foxtrot_slide", name: "Foxtrot Slide", flavor: "Smooth, forward, and slightly to the right of expectations.", icon: "PawPrint", df: 1, dr: 1 },
  { id: "grand_march", name: "Grand March", flavor: "Straight up the hall while the band still remembers the tune.", icon: "Flag", df: 0, dr: 1 },
  { id: "do_si_do", name: "Do-Si-Do", flavor: "Swing your partner, land on the far side.", icon: "Repeat", df: 0, dr: 0, hop: true, tier: 2 },
];

function ballroomStep(entry: (typeof BALLROOM)[number]): Buff {
  const desc = entry.hop
    ? "Once, your king may hop sideways over an adjacent friendly piece on his rank, landing on the empty square directly beyond."
    : `Once, your king may move two squares ${
        entry.dr === 0
          ? entry.df > 0
            ? "sideways toward the h-file"
            : "sideways toward the a-file"
          : entry.df === 0
            ? "straight forward"
            : entry.df < 0
              ? "diagonally forward toward the a-file"
              : "diagonally forward toward the h-file"
      }. Both squares must be empty.`;
  return opener(
    entry,
    desc,
    augment((_moves, inst, api) => {
      const dir = api.me === "w" ? 1 : -1;
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "k")) {
        if (entry.hop) {
          for (const s of [-1, 1]) {
            const f1 = FILE(sq) + s, f2 = FILE(sq) + s * 2;
            if (f2 < 0 || f2 > 7) continue;
            const mid = api.board.pieces[SQ(f1, RANK(sq))];
            if (!mid || mid.color !== api.me) continue;
            out.push(...teleportMoves(api.board, sq, [SQ(f2, RANK(sq))], inst.id));
          }
          continue;
        }
        const dr = entry.dr * dir;
        const f1 = FILE(sq) + entry.df, r1 = RANK(sq) + dr;
        const f2 = FILE(sq) + entry.df * 2, r2 = RANK(sq) + dr * 2;
        if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
        if (api.board.pieces[SQ(f1, r1)] || api.board.pieces[SQ(f2, r2)]) continue;
        out.push(...teleportMoves(api.board, sq, [SQ(f2, r2)], inst.id));
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Guardians. A named piece has a watcher: the first time an enemy
// piece attacks it, it flinches behind a 1-turn shield, automatically. One
// use, no activation needed.
// ---------------------------------------------------------------------------

const GUARDIANS: Array<OpenerMeta & { file?: number; piece?: "q" | "r" | "b" | "n" }> = [
  { id: "harbor_gull", name: "Harbor Gull", flavor: "Nobody ambushes a pawn under a screaming gull.", icon: "Bird", file: 0 },
  { id: "alley_cat", name: "Alley Cat", flavor: "The b-file belongs to the cat. The pawn just lives there.", icon: "Cat", file: 1, tier: 2 },
  { id: "cloister_bell", name: "Cloister Bell", flavor: "One toll, and the c-file pawn is suddenly elsewhere in spirit.", icon: "Bell", file: 2, tier: 2 },
  { id: "market_dog", name: "Market Dog", flavor: "Fed by every stall on the d-file. Repays in barking.", icon: "Dog", file: 3 },
  { id: "parade_marshal", name: "Parade Marshal", flavor: "Nobody touches the e-file pawn on the marshal's watch.", icon: "Shield", file: 4 },
  { id: "garden_scarecrow", name: "Garden Scarecrow", flavor: "It works on crows. It works on rooks. Mostly.", icon: "Wheat", file: 5 },
  { id: "gallery_docent", name: "Gallery Docent", flavor: "Please do not touch the g-file exhibit.", icon: "Frame", file: 6 },
  { id: "lighthouse_keeper", name: "Lighthouse Keeper", flavor: "The lamp swings round the moment trouble sails in.", icon: "Flashlight", file: 7 },
  { id: "lady_in_waiting", name: "Lady in Waiting", flavor: "She steps in front of the first blade, exactly once.", icon: "Crown", piece: "q" },
  { id: "tower_warden", name: "Tower Warden", flavor: "First knock on the tower door gets a bolted answer.", icon: "Castle", piece: "r" },
  { id: "chapel_warden", name: "Chapel Warden", flavor: "The first heckler finds the pulpit warded.", icon: "Church", piece: "b", tier: 2 },
  { id: "stable_groom", name: "Stable Groom", flavor: "Touch the horse and answer to the groom.", icon: "PawPrint", piece: "n" },
];

function guardian(entry: (typeof GUARDIANS)[number]): Buff {
  const what =
    entry.piece != null
      ? { q: "your queen", r: "one of your rooks", b: "one of your bishops", n: "one of your knights" }[entry.piece]
      : `your ${FILE_NAMES[entry.file!]}-file pawn`;
  const getTargets = (api: BuffApi): Square[] =>
    entry.piece != null
      ? mySquares(api.board, api.me, entry.piece)
      : mySquares(api.board, api.me, "p").filter((sq) => FILE(sq) === entry.file);

  // The shared "shield" board effect is pruned on the very turn it is added
  // (its timer ticks on the attacker's move, which is the move that installs
  // it), so the three retiered guardians below enforce their protection with a
  // move filter that reliably survives into the opponent's turn instead.
  // `delay` postpones the guard until after the opponent's next move;
  // `exceptPawns` lets enemy pawn captures through.
  const filterGuard = (opts: { delay?: boolean; exceptPawns?: boolean }): Parameters<typeof card>[1] => ({
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent) return;
      if (inst.state.armed) {
        // The guarded square follows the piece if I reposition it, and the
        // guard ends the moment that piece is captured or the turn passes.
        if (move.from === (inst.state.sq as number)) inst.state.sq = move.to;
        if (captureSquare(move) === (inst.state.sq as number) && move.from !== (inst.state.sq as number)) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp) {
          inst.state.turns = ((inst.state.turns as number) ?? 0) - 1;
          if (((inst.state.turns as number) ?? 0) <= 0) inst.spent = true;
        }
        return;
      }
      if (move.color !== api.opp) return;
      const arm = (sq: number) => {
        inst.state.armed = true;
        inst.state.sq = sq;
        inst.state.turns = 1;
        inst.state.pending = false;
      };
      if (opts.delay && inst.state.pending) {
        // The opponent has now replied: begin the guard on the current piece.
        const sq = getTargets(api)[0];
        if (sq != null) arm(sq);
        else inst.state.pending = false;
        return;
      }
      const hit = getTargets(api).find((sq) => attackersOf(api.board, api.opp, sq).length > 0);
      if (hit == null) return;
      if (opts.delay) {
        inst.state.pending = true;
        return;
      }
      arm(hit);
    },
    filterOpponentMoves: (moves, inst) => {
      if (!inst.state.armed || ((inst.state.turns as number) ?? 0) <= 0) return moves;
      const sq = inst.state.sq as number;
      return moves.filter((m) => !(captureSquare(m) === sq && (!opts.exceptPawns || m.piece !== "p")));
    },
    status: (inst) =>
      inst.state.armed ? "warded" : inst.state.pending ? "arming after the reply" : "standing guard",
  });

  if (entry.id === "alley_cat") {
    // Retier + delay: the protection now begins only after the opponent's next
    // move (template: delay activation until after the opponent replies).
    return opener(
      entry,
      `One use: the first time an enemy piece attacks ${what}, that pawn cannot be captured for one turn, but the guard begins only after your opponent's next move.`,
      filterGuard({ delay: true }),
    );
  }

  if (entry.id === "chapel_warden") {
    // Retier + the shield does not stop pawn captures.
    return opener(
      entry,
      `The first time an enemy piece attacks ${what}, that bishop cannot be captured during your opponent's next turn, except by a pawn. One use.`,
      filterGuard({ exceptPawns: true }),
    );
  }

  if (entry.id === "cloister_bell") {
    // Retier + "ends after preventing one capture": the one-turn guard lasts
    // through the opponent's single reply, turning that capture aside, then ends.
    return opener(
      entry,
      `The first time an enemy piece attacks ${what}, that pawn cannot be captured during your opponent's next turn. The guard ends once it has turned that reply aside. One use.`,
      filterGuard({}),
    );
  }

  const standardMech: Parameters<typeof card>[1] = {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.opp) return;
      for (const sq of getTargets(api)) {
        if (attackersOf(api.board, api.opp, sq).length > 0) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 1 });
          inst.spent = true;
          return;
        }
      }
    },
    status: () => "standing guard",
  };

  return opener(
    entry,
    `The first time an enemy piece attacks ${what}, that piece cannot be captured during your opponent's next turn. One use.`,
    standardMech,
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Side Doors. One pawn from a named district may take a single
// diagonal step forward onto an EMPTY square (a quiet slip, not a capture).
// ---------------------------------------------------------------------------

const SIDE_DOORS: Array<OpenerMeta & { files?: number[]; mode?: "in" | "out" }> = [
  { id: "servants_entrance", name: "Servants' Entrance", flavor: "The a-through-d staff know which hinges are oiled.", icon: "DoorOpen", files: [0, 1, 2, 3] },
  { id: "garden_door", name: "Garden Door", flavor: "Kingside pawns prefer to arrive smelling of roses.", icon: "Flower2", files: [4, 5, 6, 7] },
  { id: "revolving_door", name: "Revolving Door", flavor: "Central pawns enter at an angle and act like they meant to.", icon: "RotateCw", files: [2, 3, 4, 5] },
  { id: "fire_escape", name: "Fire Escape", flavor: "Rim pawns keep one bolted ladder for emergencies.", icon: "Siren", files: [0, 1, 6, 7] },
  { id: "palace_gate", name: "Palace Gate", flavor: "The d- and e-pawns bow once and step through sideways.", icon: "Landmark", files: [3, 4] },
  { id: "cellar_hatch", name: "Cellar Hatch", flavor: "The edge files hide a trapdoor under the barrels.", icon: "Archive", files: [0, 1, 6, 7] },
  { id: "drawbridge_in", name: "Drawbridge", flavor: "Lowered once, toward the middle of things.", icon: "Castle", mode: "in" },
  { id: "storm_door", name: "Storm Door", flavor: "When weather comes, pawns angle for the walls.", icon: "CloudRain", mode: "out" },
];

function sideDoor(entry: (typeof SIDE_DOORS)[number]): Buff {
  const who = entry.files
    ? entry.files.length === 2
      ? `on the ${FILE_NAMES[entry.files[0]]}- or ${FILE_NAMES[entry.files[1]]}-file`
      : `on files ${entry.files.map((f) => FILE_NAMES[f]).join(", ")}`
    : entry.mode === "in"
      ? "(any file)"
      : "(any file)";
  const dirNote =
    entry.mode === "in"
      ? " The step must angle toward the center files."
      : entry.mode === "out"
        ? " The step must angle toward the board's edge."
        : "";
  const lossy = entry.id === "drawbridge_in";
  const gen: Parameters<typeof augment>[0] = (_moves, inst, api) => {
    const dir = api.me === "w" ? 1 : -1;
    const out: Move[] = [];
    for (const sq of mySquares(api.board, api.me, "p")) {
      if (entry.files && !entry.files.includes(FILE(sq))) continue;
      const dfs =
        entry.mode === "in"
          ? [FILE(sq) < 4 ? 1 : -1]
          : entry.mode === "out"
            ? [FILE(sq) < 4 ? -1 : 1]
            : [-1, 1];
      for (const df of dfs) {
        const f = FILE(sq) + df, r = RANK(sq) + dir;
        if (!inBoard(f, r)) continue;
        const to = SQ(f, r);
        if (!pawnRankOk(to)) continue;
        out.push(...teleportMoves(api.board, sq, [to], inst.id));
      }
    }
    return out;
  };
  return opener(
    entry,
    `Once, one of your pawns ${who} may step one square diagonally forward onto an empty square. Not a capture.${dirNote}${
      lossy ? " If the step is on offer on your turn but you move elsewhere, the charge is spent." : ""
    }`,
    lossy ? lossyAugment(gen) : augment(gen),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Orderly Retreats. One pawn from a named district may take a single
// step BACKWARD onto an empty square, once. Deeply unregulation.
// ---------------------------------------------------------------------------

const RETREATS: Array<OpenerMeta & { files?: number[]; diag?: boolean; uses?: number }> = [
  { id: "tactical_withdrawal", name: "Tactical Withdrawal", flavor: "It is only running away if someone writes it down.", icon: "Undo2" },
  { id: "back_to_barracks", name: "Back to Barracks", flavor: "The queenside bunks are warmer anyway.", icon: "Home", files: [0, 1, 2, 3] , uses: 2, tier: 2 },
  { id: "homesick_private", name: "Homesick Private", flavor: "A kingside pawn just remembered it left the stove on.", icon: "Mailbox", files: [4, 5, 6, 7] , uses: 2 },
  { id: "regroup_at_camp", name: "Regroup at Camp", flavor: "The center pawns call it consolidating the narrative.", icon: "Tent", files: [2, 3, 4, 5] , uses: 2 },
  { id: "second_thoughts", name: "Second Thoughts", flavor: "The d- and e-pawns saw the middlegame and politely declined.", icon: "RotateCcw", files: [3, 4] , uses: 2 },
  { id: "edge_of_the_map", name: "Edge of the Map", flavor: "Rook pawns back away from where the dragons are drawn.", icon: "Map", files: [0, 7] , uses: 2 },
  { id: "squires_errand", name: "Squire's Errand", flavor: "The b- and g-pawns trot back to fetch the good lance.", icon: "Backpack", files: [1, 6] , uses: 2 },
  { id: "sidestep_and_bow", name: "Sidestep and Bow", flavor: "Retreat diagonally and it counts as courtly manners.", icon: "Feather", diag: true },
];

function orderlyRetreat(entry: (typeof RETREATS)[number]): Buff {
  const who = entry.files
    ? entry.files.length === 2
      ? `on the ${FILE_NAMES[entry.files[0]]}- or ${FILE_NAMES[entry.files[1]]}-file `
      : `on files ${entry.files.map((f) => FILE_NAMES[f]).join(", ")} `
    : "";
  const how = entry.diag ? "one square diagonally backward" : "one square straight backward";
  const uses = entry.uses ?? 1;
  const gen: Parameters<typeof augment>[0] = (_moves, inst, api) => {
    const back = api.me === "w" ? -1 : 1;
    const out: Move[] = [];
    for (const sq of mySquares(api.board, api.me, "p")) {
      if (entry.files && !entry.files.includes(FILE(sq))) continue;
      for (const df of entry.diag ? [-1, 1] : [0]) {
        const f = FILE(sq) + df, r = RANK(sq) + back;
        if (!inBoard(f, r)) continue;
        const to = SQ(f, r);
        if (!pawnRankOk(to)) continue;
        out.push(...teleportMoves(api.board, sq, [to], inst.id));
      }
    }
    return out;
  };
  const baseDesc = `${uses > 1 ? "Twice" : "Once"}, one of your pawns ${who}may step ${how} onto an empty square.${uses > 1 ? " The narrower district runs the errand twice." : ""}`;
  if (entry.id === "edge_of_the_map") {
    // Preserve the narrow (edge-file) identity; if the retreat is never used by
    // the owner's 12th move, the remaining charge converts into one draft reroll.
    return opener(
      entry,
      `${baseDesc} If unused by your 12th move, the remaining charge becomes one draft reroll.`,
      {
        kind: "passive",
        init: (inst) => {
          inst.state.charges = uses;
          inst.state.moves = 0;
        },
        augmentMoves: (moves, inst, api) => {
          if (((inst.state.charges as number) ?? 0) <= 0) return;
          addNovel(moves, gen(moves, inst, api));
        },
        onMovePlayed: (inst, move, api) => {
          if (move.via === inst.id && move.color) {
            const left = ((inst.state.charges as number) ?? 1) - 1;
            inst.state.charges = left;
            if (left <= 0) inst.spent = true;
          }
          if (move.color === api.me) {
            inst.state.moves = ((inst.state.moves as number) ?? 0) + 1;
            if (
              ((inst.state.moves as number) ?? 0) >= 12 &&
              ((inst.state.charges as number) ?? 0) > 0 &&
              !inst.spent
            ) {
              api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
              inst.state.charges = 0;
              inst.spent = true;
            }
          }
        },
        status: (inst) => {
          const c = (inst.state.charges as number) ?? uses;
          return c > 0 ? `${c} left, reroll at your 12th move` : null;
        },
      },
    );
  }
  return opener(entry, baseDesc, augment(gen, uses));
}

// ---------------------------------------------------------------------------
// FAMILY: Dead Letters. One named pawn file learns to capture straight
// ahead, once. The post must go through.
// ---------------------------------------------------------------------------

const DEAD_LETTERS: Array<OpenerMeta & { file: number }> = [
  { id: "airmail", name: "Airmail", flavor: "The a-file delivers over the counter, not around it.", icon: "Send", file: 0 },
  { id: "bulk_postage", name: "Bulk Postage", flavor: "The b-file charges by weight. The blocker weighs plenty.", icon: "Package", file: 1 },
  { id: "certified_letter", name: "Certified Letter", flavor: "Signature required. Refusal is not an option on the c-file.", icon: "Mail", file: 2 },
  { id: "dead_letter_office", name: "Dead Letter Office", flavor: "Whatever blocks the d-file gets filed. Permanently.", icon: "Inbox", file: 3 },
  { id: "express_courier", name: "Express Courier", flavor: "The e-file guarantees delivery through the recipient.", icon: "Truck", file: 4 },
  { id: "first_class_stamp", name: "First Class Stamp", flavor: "Lick, stick, and flatten whatever stands on the f-file.", icon: "Stamp", file: 5 },
  { id: "general_delivery", name: "General Delivery", flavor: "The g-file accepts parcels addressed to Occupant.", icon: "Mailbox", file: 6 },
  { id: "homing_pigeon", name: "Homing Pigeon", flavor: "The h-file bird flies straight and files a complaint on impact.", icon: "Bird", file: 7 },
];

function deadLetter(entry: (typeof DEAD_LETTERS)[number]): Buff {
  const fileName = FILE_NAMES[entry.file];

  if (entry.id === "airmail") {
    // Expand eligibility one adjacent file inward: the a- OR b-file pawn.
    return opener(
      entry,
      "Once, your a- or b-file pawn may capture the enemy piece directly in front of it.",
      augment((_moves, inst, api) => {
        const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "p")) {
          if (FILE(sq) !== 0 && FILE(sq) !== 1) continue;
          for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
            if (m.captured) out.push(m);
          }
        }
        return out;
      }),
    );
  }

  if (entry.id === "bulk_postage") {
    // Capture straight ahead; if the a-file square beside the landing is empty
    // the pawn slides on to it (a single move: capture at the front square,
    // finishing one file toward the a-file).
    return opener(
      entry,
      "Once, your b-file pawn may capture the enemy piece directly ahead; if the a-file square beside it is empty, the pawn slides there instead of stopping.",
      augment((_moves, inst, api) => {
        const fwd = fwdOf(api.me);
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "p")) {
          if (FILE(sq) !== 1) continue;
          const front = sq + fwd;
          if (front < 0 || front > 63) continue;
          const target = api.board.pieces[front];
          if (!target || target.color !== api.opp) continue;
          const slide = SQ(0, RANK(front));
          const landing = !api.board.pieces[slide] && pawnRankOk(slide) ? slide : front;
          out.push({
            from: sq,
            to: landing,
            piece: "p",
            color: api.me,
            captured: target.type,
            capturedSquare: front,
            via: inst.id,
          });
        }
        return out;
      }),
    );
  }

  if (entry.id === "certified_letter") {
    // Capture straight ahead only if the target is defended; the pawn is then
    // uncapturable until the opponent replies.
    return opener(
      entry,
      "Once, your c-file pawn may capture the enemy piece directly ahead only if that piece is defended. After the capture the pawn cannot be captured until your opponent replies.",
      {
        kind: "passive",
        init: (inst) => {
          inst.state.charges = 1;
        },
        augmentMoves: (moves, inst, api) => {
          if (((inst.state.charges as number) ?? 0) <= 0) return;
          const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
          const out: Move[] = [];
          for (const sq of mySquares(api.board, api.me, "p")) {
            if (FILE(sq) !== 2) continue;
            for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
              if (!m.captured) continue;
              const front = m.capturedSquare ?? m.to;
              if (attackersOf(api.board, api.opp, front).length > 0) out.push(m);
            }
          }
          addNovel(moves, out);
        },
        onMovePlayed: (inst, move, api) => {
          if (move.via !== inst.id) return;
          addEffect(api, { kind: "shield", owner: api.me, squares: [move.to], turns: 1 });
          inst.state.charges = 0;
          inst.spent = true;
        },
        status: (inst) => (((inst.state.charges as number) ?? 0) > 0 ? "certified delivery" : null),
      },
    );
  }

  if (entry.id === "dead_letter_office") {
    // Capture straight ahead; the captured square (where the pawn now stands) is
    // sealed to both players until the owner's next turn, so nothing may move
    // onto it (the pawn cannot be recaptured there).
    return opener(
      entry,
      "Once, your d-file pawn may capture the enemy piece directly ahead; the square it lands on is sealed to both players until your next turn, so nothing may move onto it.",
      {
        kind: "passive",
        init: (inst) => {
          inst.state.charges = 1;
        },
        augmentMoves: (moves, inst, api) => {
          if (((inst.state.charges as number) ?? 0) <= 0) return;
          const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
          const out: Move[] = [];
          for (const sq of mySquares(api.board, api.me, "p")) {
            if (FILE(sq) !== 3) continue;
            for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
              if (m.captured) out.push(m);
            }
          }
          addNovel(moves, out);
        },
        onMovePlayed: (inst, move, api) => {
          if (move.via !== inst.id) return;
          // The opponent seal ticks on their turns (one reply, then it lifts).
          // The self seal ticks on MY turns, and this capture move is one of
          // them, so it needs turns:2 to survive this move and still bar me on
          // my next turn (a turns:1 self seal would be pruned immediately).
          addEffect(api, { kind: "barred", squares: [move.to], against: api.opp, turns: 1 });
          addEffect(api, { kind: "barred", squares: [move.to], against: api.me, turns: 2 });
          inst.state.charges = 0;
          inst.spent = true;
        },
        status: (inst) => (((inst.state.charges as number) ?? 0) > 0 ? "special delivery" : null),
      },
    );
  }

  if (entry.id === "express_courier") {
    // Capture straight ahead; on that pawn's following move it may then advance
    // two squares forward if both are empty.
    return opener(
      entry,
      "Once, your e-file pawn may capture the enemy piece directly ahead; on its following move that pawn may then advance two squares forward if both are empty.",
      {
        kind: "passive",
        init: (inst) => {
          inst.state.charges = 1;
        },
        augmentMoves: (moves, inst, api) => {
          const fwd = fwdOf(api.me);
          const out: Move[] = [];
          if (((inst.state.charges as number) ?? 0) > 0) {
            const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
            for (const sq of mySquares(api.board, api.me, "p")) {
              if (FILE(sq) !== 4) continue;
              for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
                if (m.captured) out.push(m);
              }
            }
          }
          const boost = inst.state.boost as number | undefined;
          if (boost != null) {
            const p = api.board.pieces[boost];
            if (p && p.color === api.me && p.type === "p") {
              const mid = boost + fwd,
                to = boost + fwd * 2;
              if (to >= 0 && to <= 63 && pawnRankOk(to) && !api.board.pieces[mid] && !api.board.pieces[to]) {
                out.push(...teleportMoves(api.board, boost, [to], inst.id));
              }
            }
          }
          addNovel(moves, out);
        },
        onMovePlayed: (inst, move, api) => {
          if (move.color !== api.me) return;
          if (inst.state.boost != null) {
            const b = inst.state.boost as number;
            if (captureSquare(move) === b && move.from !== b) {
              inst.spent = true;
              inst.state.boost = undefined;
              return;
            }
            if (move.from === b) {
              inst.spent = true;
              inst.state.boost = undefined;
            }
            return;
          }
          if (move.via === inst.id && move.captured) {
            inst.state.charges = 0;
            inst.state.boost = move.to;
          }
        },
        status: (inst) =>
          inst.state.boost != null
            ? "one long stride ready"
            : ((inst.state.charges as number) ?? 0) > 0
              ? "express delivery"
              : null,
      },
    );
  }

  return opener(
    entry,
    `Once, your ${fileName}-file pawn may capture the enemy piece directly in front of it.`,
    augment((_moves, inst, api) => {
      const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (FILE(sq) !== entry.file) continue;
        for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
          if (m.captured) out.push(m);
        }
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Site Works. One-shot phasing slide: a named piece may pass through
// friendly pieces on a fixed set of lines (never capturing them), landing
// anywhere legal beyond. Charged via the tagged move like every augment.
// ---------------------------------------------------------------------------

const SITE_WORKS: Array<
  OpenerMeta & { type: "r" | "b" | "q"; line: "fwd" | "lat" | "diag"; through: number }
> = [
  { id: "freight_elevator", name: "Freight Elevator", flavor: "Hold the door. The tower is coming up.", icon: "ArrowUp", type: "r", line: "fwd", through: 1 },
  { id: "rolling_gantry", name: "Rolling Gantry", flavor: "It glides along the rails, straight through the scaffolding crew.", icon: "Forklift", type: "r", line: "lat", through: 1 },
  { id: "painters_lift", name: "Painter's Lift", flavor: "Her majesty rises past the workmen without spilling her tea.", icon: "Paintbrush", type: "q", line: "fwd", through: 1 },
  { id: "crane_swing", name: "Crane Swing", flavor: "The load swings diagonally over everyone's hard hats.", icon: "Construction", type: "q", line: "diag", through: 1 },
  { id: "window_washer", name: "Window Washer", flavor: "The bishop squeegees straight past the tenants.", icon: "Sparkles", type: "b", line: "diag", through: 1 },
  { id: "chimney_sweep", name: "Chimney Sweep", flavor: "Two flues, one brush, zero apologies.", icon: "Brush", type: "b", line: "diag", through: 2, tier: 2 },
];

function siteWork(entry: (typeof SITE_WORKS)[number]): Buff {
  const names: Record<string, string> = { r: "rooks", b: "bishops", q: "queen" };
  const lineText =
    entry.line === "fwd" ? "straight forward" : entry.line === "lat" ? "sideways along its rank" : "along its diagonals";
  const owner = entry.type === "q" ? "your queen" : `one of your ${names[entry.type]}`;
  return opener(
    entry,
    `Once, ${owner} may slide ${lineText} passing through up to ${entry.through} friendly piece${entry.through > 1 ? "s" : ""} (never capturing them), landing beyond as normal.`,
    augment((_moves, inst, api) => {
      const dir = api.me === "w" ? 1 : -1;
      const dirs: readonly (readonly [number, number])[] =
        entry.line === "fwd" ? [[0, dir]] : entry.line === "lat" ? [[1, 0], [-1, 0]] : DIAG_DIRS;
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, entry.type)) {
        out.push(...phasingSlideMoves(api.board, sq, dirs, inst.id, entry.through));
      }
      return out;
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Kitchen Errands. A free-action one-shot: send one pawn from a named
// district a single square forward, right now, within your turn.
// ---------------------------------------------------------------------------

const KITCHEN_ERRANDS: Array<OpenerMeta & { files: number[] }> = [
  { id: "fetch_the_flour", name: "Fetch the Flour", flavor: "The mill is queenside. Everything important is queenside.", icon: "ShoppingBasket", files: [0, 1, 2, 3] },
  { id: "run_for_eggs", name: "Run for Eggs", flavor: "The henhouse is kingside and the souffle will not wait.", icon: "Egg", files: [4, 5, 6, 7] },
  { id: "soups_on", name: "Soup's On", flavor: "Center pawns eat first. Kitchen rules.", icon: "Soup", files: [2, 3, 4, 5] },
  { id: "spice_run", name: "Spice Run", flavor: "The b- and g-file merchants keep the good paprika in back.", icon: "Citrus", files: [1, 6] },
  { id: "salt_from_the_coast", name: "Salt from the Coast", flavor: "Rim pawns fetch it by the barrel and complain the whole way.", icon: "Waves", files: [0, 7] },
  { id: "bread_for_the_table", name: "Bread for the Table", flavor: "The d- and e-pawns carry the loaves. Carefully.", icon: "Croissant", files: [3, 4] },
];

function kitchenErrand(entry: (typeof KITCHEN_ERRANDS)[number]): Buff {
  const who =
    entry.files.length === 2
      ? `a ${FILE_NAMES[entry.files[0]]}- or ${FILE_NAMES[entry.files[1]]}-file pawn`
      : `a pawn on files ${entry.files.map((f) => FILE_NAMES[f]).join(", ")}`;
  return opener(
    entry,
    `Use once as a free action: ${who} advances one square immediately. The square ahead must be empty.`,
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn running the errand",
              squares: advanceablePawns(api).filter((sq) => entry.files.includes(FILE(sq))),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) advancePawn(api, picks[0].square);
      },
      { freeAction: true },
    ),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Swap Meet. One free-action trade: two named home squares exchange
// the pieces standing on them, provided both still hold the advertised types.
// (Types are swapped in place, so nothing is captured, summoned, or moved.)
// ---------------------------------------------------------------------------

const SWAP_MEET: Array<
  OpenerMeta & ({ f1: number; t1: "n" | "b" | "r" | "q"; f2: number; t2: "n" | "b" | "r" | "q"; twins?: never } | { twins: true; f1?: never })
> = [
  { id: "stable_swap", name: "Stable Swap", flavor: "One horse, one tower, one firm handshake.", icon: "Repeat", f1: 0, t1: "r", f2: 1, t2: "n" },
  { id: "country_auction", name: "Country Auction", flavor: "Sold: one slightly used tower, to the knight in the corner.", icon: "Gavel", f1: 7, t1: "r", f2: 6, t2: "n" },
  { id: "flea_market_find", name: "Flea Market Find", flavor: "The bishop haggled the knight out of his parking spot.", icon: "Tags", f1: 2, t1: "b", f2: 1, t2: "n" },
  { id: "rummage_sale", name: "Rummage Sale", flavor: "Everything on the kingside table must go.", icon: "Boxes", f1: 5, t1: "b", f2: 6, t2: "n" },
  { id: "royal_barter", name: "Royal Barter", flavor: "Her majesty trades pews with the c-file clergy.", icon: "Handshake", f1: 3, t1: "q", f2: 2, t2: "b" },
  { id: "identical_twins", name: "Identical Twins", flavor: "They switched places years ago. Nobody has noticed yet.", icon: "Copy", twins: true },
];

function swapMeet(entry: (typeof SWAP_MEET)[number]): Buff {
  if (entry.twins) {
    return opener(
      entry,
      "Use once as a free action: your two knights swap places with each other. They are identical, so nothing observable happens.",
      {
        ...activatedSimple((_inst, api) => {
          const knights = mySquares(api.board, api.me, "n");
          if (knights.length >= 2) flashSquares(api, knights.slice(0, 2), true);
        }),
        freeAction: true,
      },
    );
  }
  const names: Record<string, string> = { n: "knight", b: "bishop", r: "rook", q: "queen" };
  const s1 = `${FILE_NAMES[entry.f1!]}1`, s2 = `${FILE_NAMES[entry.f2!]}1`;
  return opener(
    entry,
    `Use once as a free action: if your ${names[entry.t1!]} still stands on its home square (${s1} for white) and your ${names[entry.t2!]} on ${s2}, they swap places.`,
    {
      ...activatedSimple((_inst, api) => {
        const home = ownRank(api.me, 0);
        const a = SQ(entry.f1!, home), b = SQ(entry.f2!, home);
        const pa = api.board.pieces[a], pb = api.board.pieces[b];
        if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) return;
        if (pa.type !== entry.t1 || pb.type !== entry.t2) return;
        api.setPieceType(a, entry.t2!);
        api.setPieceType(b, entry.t1!);
      }),
      freeAction: true,
    },
  );
}

// ---------------------------------------------------------------------------
// Assembly. The info, rider, draft-perk, and cosmetic families live in
// openers2.ts; buildOpeners2 is called here (not at that module's top level)
// so the openers <-> openers2 import cycle resolves cleanly.
// ---------------------------------------------------------------------------

export const OPENER_CARDS: Buff[] = [
  ...FILE_SCOUTS.map(fileScout),
  ...FIRST_STEPS.map(firstStep),
  ...COUNTRY_ROADS.map(countryRoad),
  ...STRANGE_GAITS.map(strangeGait),
  ...LEAPFROGS.map(leapfrog),
  ...BACKSTAGE.map(backstagePass),
  ...BALLROOM.map(ballroomStep),
  ...GUARDIANS.map(guardian),
  ...SIDE_DOORS.map(sideDoor),
  ...RETREATS.map(orderlyRetreat),
  ...DEAD_LETTERS.map(deadLetter),
  ...SITE_WORKS.map(siteWork),
  ...KITCHEN_ERRANDS.map(kitchenErrand),
  ...SWAP_MEET.map(swapMeet),
  ...buildOpeners2(),
];
