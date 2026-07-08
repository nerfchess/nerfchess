// Tier 2 (Easy) hexes: a small standing restriction or a ~4-turn timed debuff
// on ONE piece class. No material loss. Slightly heavier than Tier 1 (longer
// durations, brief petrify/freeze, barred squares, a single draft or turn
// denied), but every card is easily played around and carries no material
// swing. Import ONLY from ./shared so the safety rails come for free.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutTarget,
  activated,
  mySquares,
  instant,
  addEffect,
  blockDrafts,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(2);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

export const HEXES_T2: Buff[] = [
  H(
    { id: "short_leash", name: "Short Leash", description: "Your opponent's bishops slide at most 2 squares for their next 4 turns.", flavor: "Kept close to home.", fx: { motif: "anchor", pieces: ["b"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "b" || dist(m.from, m.to) <= 2)),
  ),
  H(
    { id: "seized_axles", name: "Seized Axles", description: "Your opponent's rooks slide at most 2 squares for their next 4 turns.", fx: { motif: "anchor", pieces: ["r"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 2)),
  ),
  H(
    { id: "rusted_hinges", name: "Rusted Hinges", description: "Your opponent's rooks cannot capture for their next 4 turns.", fx: { motif: "muzzle", pieces: ["r"] } },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "r" && m.captured))),
  ),
  H(
    { id: "blunted_lance", name: "Blunted Lance", description: "Your opponent's knights cannot capture for their next 4 turns.", flavor: "A lance with no point.", fx: { motif: "muzzle", pieces: ["n"] } },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "n" && m.captured))),
  ),
  H(
    { id: "safe_passage", name: "Safe Passage", description: "Your opponent's pawns cannot capture for their next 4 turns.", fx: { motif: "muzzle", pieces: ["p"] } },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "p" && m.captured))),
  ),
  H(
    { id: "stone_hooves", name: "Stone Hooves", description: "Petrify one of your opponent's knights for 3 of their turns: it can only shuffle one square at a time. Kings cannot be targeted.", flavor: "The cavalry sets like plaster." },
    walnutTarget(3, ["n"]),
  ),
  H(
    { id: "gargoyles", name: "Gargoyles", description: "Petrify one of your opponent's bishops for 3 of their turns: it can only shuffle one square at a time.", flavor: "Perched, and quite forgotten." },
    walnutTarget(3, ["b"]),
  ),
  H(
    // Distinct from the plain 2-turn single freezes (evil_eye is the canonical
    // one): this stakes the target down first, then leaves it a heavy walnut as
    // it thaws. Freeze (cannot move at all) for 2 turns overlaps a walnut (can
    // only shuffle one square) that outlasts it by a turn, so on the third turn
    // the piece can crawl a single step but no further. A staggered 3-turn
    // lockdown that eases into a shuffle, not another bare freeze.
    { id: "pinned_down", name: "Pinned Down", description: "Freeze one targeted enemy piece, never the king, for 2 of their turns. As it thaws it stays a heavy walnut for 1 more turn, able only to shuffle a single square.", flavor: "Staked to the ground, then too heavy to lift." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to pin down",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
      },
    ),
  ),
  H(
    { id: "cut_purse", name: "Cut Purse", description: "Your opponent's next draft is skipped.", flavor: "A hand in every pocket." },
    blockDrafts(1),
  ),
  H(
    { id: "timid_king", name: "Timid King", description: "Your opponent's king cannot capture for their next 4 turns.", flavor: "Beneath the dignity of the crown.", fx: { motif: "muzzle", pieces: ["k"] } },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "k" && m.captured))),
  ),
  H(
    { id: "leaden_queen", name: "Leaden Queen", description: "Your opponent's queen slides at most 2 squares for their next 3 turns.", flavor: "Her gown is sewn with lead.", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 2)),
  ),
  H(
    // Board already paints no_pawn_advance; fx carried for consistency.
    { id: "trench_line", name: "Trench Line", description: "Your opponent's pawns cannot advance for their next 3 turns. They may still capture diagonally.", flavor: "The infantry are pinned in the mud.", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
    }),
  ),
  H(
    // Board already paints barred squares; fx carried for consistency
    // (square-scoped, so no pieces field).
    { id: "no_mans_land", name: "No Man's Land", description: "Your opponent cannot enter the four center squares (d4, e4, d5, e5) for their next 3 turns.", flavor: "The middle of the board is scorched ground.", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const squares = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),
  H(
    { id: "sealed_orders", name: "Sealed Orders", description: "Your opponent's next draft is skipped outright, giving them no new card.", flavor: "The dispatch never reaches the tent." },
    blockDrafts(1),
  ),
];
