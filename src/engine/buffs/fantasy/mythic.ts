// Fantasy set: THE MYTHIC LADDER. One buff, one hex and one boon on every tier
// from 1 to 8, so the fantasy flavour is dealt at every stage of a game and
// not only in the upper band. Each card is a single clear rule built from an
// existing primitive; the spectacle lives in the play art (fantasyPlays.tsx),
// the canvas spec (vfxSpecs.ts) and, from tier 4 up, the 3D board layer.
//
// Rails, same as every fantasy file: kings are never frozen, petrified or
// removed; every opponent filter is partial (curse() keeps a fallback); rng is
// never read outside init / effect / onMovePlayed.

import { Buff } from "./shared";
import {
  card,
  curse,
  activated,
  activatedSimple,
  addEffect,
  emptySquares,
  freezeTarget,
  instant,
  leapMoves,
  mySquares,
  petrifyTarget,
  reviveOne,
  shieldZone,
  slideMoves,
  timedAugment,
  walnutAll,
  ALL_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
  inHalf,
  relRank,
} from "./shared";
import type { BuffApi, Square } from "./shared";

/** The eight squares around a king (those on the board). */
function ringAround(api: BuffApi, kingSq: Square): Square[] {
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = FILE(kingSq) + df;
      const r = RANK(kingSq) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  }
  return out;
}

const kingSq = (api: BuffApi, color = api.me) => mySquares(api.board, color, "k")[0];

export const FANTASY_MYTHIC: Buff[] = [
  /* --------------------------------------------------------------------------
     BUFFS: powers on your own army.
     ----------------------------------------------------------------------- */
  card(
    {
      id: "fm_glowmoss_ward",
      name: "Glowmoss Ward",
      description:
        "Soft light grows over your king's square and the eight squares around it: pieces standing there cannot be captured for your opponent's next 2 turns.",
      tier: 1,
      category: "protection",
      flavor: "It only grows where something is worth keeping.",
      fx: { motif: "ward", pieces: "all", king: true, self: true },
    },
    shieldZone((api) => {
      const k = kingSq(api);
      return k == null ? [] : [k, ...ringAround(api, k)];
    }, 2),
  ),
  card(
    {
      id: "fm_moonlit_stride",
      name: "Moonlit Stride",
      description:
        "For your next 3 turns each of your knights may also step one square straight up, down or sideways.",
      tier: 2,
      category: "movement",
      requires: ["n"],
      flavor: "The horses walk where the moon lays a path.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "fm_wyrmscale_mail",
      name: "Wyrmscale Mail",
      description:
        "Choose one of your pieces other than the king. It cannot be captured for your opponent's next 4 turns.",
      tier: 3,
      category: "protection",
      flavor: "One scale, shed by something that never needed it.",
      fx: { motif: "ward", pieces: ["p", "n", "b", "r", "q"], self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to armour",
              squares: mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]!.type !== "k"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 4 });
        }
      },
    ),
  ),
  card(
    {
      id: "fm_stormcaller",
      name: "Stormcaller",
      description:
        "For your next 2 turns your rooks may also move diagonally and your bishops may also move straight, each as far as a queen would.",
      tier: 4,
      category: "movement",
      requires: ["r", "b"],
      flavor: "The sky forgets which way is down.",
      fx: { motif: "empower", pieces: ["r", "b"], moveAs: "q", self: true },
    },
    timedAugment(2, (_m, inst, api) => [
      ...mySquares(api.board, api.me, "r").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
      ...mySquares(api.board, api.me, "b").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ]),
  ),
  card(
    {
      id: "fm_phoenix_feather",
      name: "Phoenix Feather",
      description:
        "One of your captured knights, bishops or rooks returns to the board on an empty square in your half. Knights first, then bishops, then rooks.",
      tier: 5,
      category: "pieces",
      flavor: "Ash remembers the shape it came from.",
    },
    reviveOne(["n", "b", "r"], (api) => (sq) => inHalf(api.me, sq)),
  ),
  card(
    {
      id: "fm_dragonblood",
      name: "Dragonblood",
      description: "For your next 4 turns your queen may also leap like a knight.",
      tier: 6,
      category: "movement",
      requires: ["q"],
      flavor: "It burns going down, and then nothing is out of reach.",
      fx: { motif: "empower", pieces: ["q"], moveAs: "a", self: true },
    },
    timedAugment(4, (_m, inst, api) =>
      mySquares(api.board, api.me, "q").flatMap((sq) => leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id)),
    ),
  ),
  card(
    {
      id: "fm_sunforge",
      name: "Sunforge",
      description:
        "Choose one of your pawns on your 5th rank or beyond. It becomes a knight where it stands.",
      tier: 7,
      category: "pieces",
      requires: ["p"],
      flavor: "Hammered in daylight, quenched in the enemy's shadow.",
      fx: { motif: "empower", pieces: ["p"], moveAs: "n", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to forge",
              squares: mySquares(api.board, api.me, "p").filter((sq) => relRank(api.me, sq) >= 5),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.setPieceType(picks[0].square, "n");
      },
    ),
  ),
  card(
    {
      id: "fm_eclipse_crown",
      name: "Eclipse Crown",
      description:
        "Your opponent's next turn is skipped, and none of your pieces can be captured until your following turn begins.",
      tier: 8,
      category: "tempo",
      flavor: "For one breath the whole board looks away.",
      fx: { motif: "ward", pieces: "all", king: true, self: true },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),

  /* --------------------------------------------------------------------------
     HEXES: curses on the enemy army.
     ----------------------------------------------------------------------- */
  card(
    {
      id: "fm_hex_thistledown",
      name: "Thistledown",
      description: "Burrs tangle the enemy cavalry: for their next 2 turns, enemy knights may move but may not take anything.",
      tier: 1,
      category: "hex",
      flavor: "Burrs in the mane. Nothing bites through a mouthful of thistle.",
      fx: { motif: "muzzle", pieces: ["n"] },
    },
    curse(2, (moves) => moves.filter((m) => !(m.piece === "n" && m.captured))),
  ),
  card(
    {
      id: "fm_hex_fogbank",
      name: "Fogbank",
      description: "Your opponent's bishops cannot move more than 2 squares for their next 2 turns.",
      tier: 2,
      category: "hex",
      flavor: "The diagonals go grey after the second step.",
      fx: { motif: "anchor", pieces: ["b"] },
    },
    curse(2, (moves) =>
      moves.filter((m) => m.piece !== "b" || Math.abs(FILE(m.to) - FILE(m.from)) <= 2),
    ),
  ),
  card(
    {
      id: "fm_hex_brambleroot",
      name: "Brambleroot",
      description: "Your opponent's rooks cannot move sideways along a rank for their next 3 turns.",
      tier: 3,
      category: "hex",
      flavor: "Thorns grow up through the wheels.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "r" || FILE(m.to) === FILE(m.from))),
  ),
  card(
    {
      id: "fm_hex_sirens_call",
      name: "Siren's Call",
      description:
        "Choose an enemy knight, bishop, rook or queen. It stands entranced and cannot move for your opponent's next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "It hears its own name sung from under the water.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    petrifyTarget(3, "Choose the piece that hears the song", ["n", "b", "r", "q"]),
  ),
  card(
    {
      id: "fm_hex_gorgon_gaze",
      name: "Gorgon Gaze",
      description: "Every enemy knight and bishop turns to stone for your opponent's next 2 turns.",
      tier: 5,
      category: "hex",
      flavor: "Do not look at what looked at you.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 2),
  ),
  card(
    {
      id: "fm_hex_iron_maiden",
      name: "Iron Maiden",
      description: "Choose an enemy piece other than the king. It is locked in place for your opponent's next 4 turns.",
      tier: 6,
      category: "hex",
      flavor: "The door closes softly. That is the worst part.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeTarget(4),
  ),
  card(
    {
      id: "fm_hex_kings_moat",
      name: "King's Moat",
      description:
        "For your opponent's next 3 turns none of their pieces may move onto a square next to your king.",
      tier: 7,
      category: "hex",
      flavor: "Black water, no bottom, no bridge.",
      fx: { motif: "blindfold", pieces: "all" },
    },
    curse(3, (moves, api) => {
      const k = kingSq(api);
      if (k == null) return moves;
      const moat = new Set(ringAround(api, k));
      return moves.filter((m) => !moat.has(m.to));
    }),
  ),
  card(
    {
      id: "fm_hex_winter_court",
      name: "Winter Court",
      description:
        "Every enemy piece other than the king standing in your half of the board is frozen for your opponent's next 3 turns.",
      tier: 8,
      category: "hex",
      flavor: "They came too far in, and the season turned.",
      fx: { motif: "jail", pieces: "all" },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k" || !inHalf(api.me, sq)) continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "ice" });
      }
    }),
  ),

  /* --------------------------------------------------------------------------
     BOONS: small self-relief, part of nerf mode's boon share.
     ----------------------------------------------------------------------- */
  card(
    {
      id: "fm_boon_lanternlight",
      name: "Lanternlight",
      description: "For your next 2 turns your king may move two squares in a straight line, as long as the first square is empty.",
      tier: 1,
      category: "movement",
      boon: true,
      flavor: "Two steps of light in a dark hall.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "r", self: true },
    },
    timedAugment(2, (_m, inst, api) => {
      const k = kingSq(api);
      if (k == null) return [];
      return slideMoves(api.board, k, ALL_DIRS, inst.id, 2).filter((m) => Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) === 2);
    }),
  ),
  card(
    {
      id: "fm_boon_hearthbread",
      name: "Hearthbread",
      description: "Choose an empty square on your first two ranks. A new pawn appears there.",
      tier: 2,
      category: "pieces",
      boon: true,
      flavor: "Warm from the oven, and already marching.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the pawn appears",
              squares: emptySquares(api.board, (sq) => relRank(api.me, sq) === 2 || relRank(api.me, sq) === 3),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.place(picks[0].square, "p", api.me);
      },
    ),
  ),
  card(
    {
      id: "fm_boon_dewdrop",
      name: "Dewdrop",
      description: "Your most advanced pawn cannot be captured for the rest of the game.",
      tier: 3,
      category: "protection",
      boon: true,
      requires: ["p"],
      flavor: "One drop, and the blade slides off.",
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    instant((_inst, api) => {
      const pawns = mySquares(api.board, api.me, "p");
      if (!pawns.length) return;
      const lead = pawns.reduce((a, b) => (relRank(api.me, b) > relRank(api.me, a) ? b : a));
      addEffect(api, { kind: "shield", owner: api.me, squares: [lead], turns: null });
    }),
  ),
  card(
    {
      id: "fm_boon_oathstone",
      name: "Oathstone",
      description: "None of your pawns can be captured for your opponent's next 2 turns.",
      tier: 4,
      category: "protection",
      boon: true,
      requires: ["p"],
      flavor: "They swore on it. So did the stone.",
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 2),
  ),
  card(
    {
      id: "fm_boon_windrider",
      name: "Windrider",
      description: "For your next 2 turns each of your bishops may also leap like a knight.",
      tier: 5,
      category: "movement",
      boon: true,
      requires: ["b"],
      flavor: "The wind does not care about colour.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "n", self: true },
    },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "b").flatMap((sq) => leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id)),
    ),
  ),
  card(
    {
      id: "fm_boon_lifebloom",
      name: "Lifebloom",
      description: "One of your captured pawns returns to the board on an empty square of your second rank.",
      tier: 6,
      category: "pieces",
      boon: true,
      flavor: "Where it fell, something green.",
    },
    reviveOne(["p"], (api) => (sq) => relRank(api.me, sq) === 2),
  ),
  card(
    {
      id: "fm_boon_royal_road",
      name: "Royal Road",
      description: "Your king steps to any empty square on your back rank.",
      tier: 7,
      category: "movement",
      boon: true,
      flavor: "A door only the crown can see.",
      fx: { motif: "empower", pieces: ["k"], self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the king steps",
              squares: emptySquares(api.board, (sq) => relRank(api.me, sq) === 1),
            },
      (_inst, api, picks) => {
        const k = kingSq(api);
        if (k != null && picks[0]?.square != null) api.relocate(k, picks[0].square);
      },
    ),
  ),
  card(
    {
      id: "fm_boon_worldheart",
      name: "Worldheart",
      description: "Take two extra moves right now. Your army cannot be captured until your next turn begins.",
      tier: 8,
      category: "tempo",
      boon: true,
      flavor: "For a moment the world beats to your pulse.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
      }),
      freeAction: true,
    },
  ),
];
