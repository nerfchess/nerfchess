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
  freezeTarget,
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
    { id: "short_leash", name: "Short Leash", description: "Your opponent's bishops slide at most 2 squares for their next 4 turns.", flavor: "Kept close to home." },
    curse(4, (moves) => moves.filter((m) => m.piece !== "b" || dist(m.from, m.to) <= 2)),
  ),
  H(
    { id: "seized_axles", name: "Seized Axles", description: "Your opponent's rooks slide at most 2 squares for their next 4 turns." },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 2)),
  ),
  H(
    { id: "leaden_crown", name: "Leaden Crown", description: "Your opponent's queen slides at most 2 squares for their next 4 turns.", flavor: "The crown weighs heavy." },
    curse(4, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 2)),
  ),
  H(
    { id: "rusted_hinges", name: "Rusted Hinges", description: "Your opponent's rooks cannot capture for their next 4 turns." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "r" && m.captured))),
  ),
  H(
    { id: "blunted_lance", name: "Blunted Lance", description: "Your opponent's knights cannot capture for their next 4 turns.", flavor: "A lance with no point." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "n" && m.captured))),
  ),
  H(
    { id: "royal_restraint", name: "Royal Restraint", description: "Your opponent's king cannot capture for their next 4 turns.", flavor: "The crown does not stoop to brawling." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "k" && m.captured))),
  ),
  H(
    { id: "safe_passage", name: "Safe Passage", description: "Your opponent's pawns cannot capture for their next 4 turns." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "p" && m.captured))),
  ),
  H(
    { id: "stone_hooves", name: "Stone Hooves", description: "Petrify one of your opponent's knights for 2 of their turns. Kings cannot be targeted.", flavor: "The cavalry sets like plaster." },
    walnutTarget(2, ["n"]),
  ),
  H(
    { id: "gargoyles", name: "Gargoyles", description: "Petrify one of your opponent's bishops for 2 of their turns.", flavor: "Perched, and quite forgotten." },
    walnutTarget(2, ["b"]),
  ),
  H(
    { id: "pinned_down", name: "Pinned Down", description: "Freeze one targeted enemy piece, never the king, so it cannot move for 2 of their turns." },
    freezeTarget(2),
  ),
  H(
    { id: "sown_salt", name: "Sown Salt", description: "Your opponent's pawns cannot advance for their next 4 turns.", flavor: "Nothing grows in salted fields." },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 4 });
    }),
  ),
  H(
    { id: "no_trespass", name: "No Trespass", description: "Your opponent cannot move any piece onto the four center squares (d4, e4, d5, e5) for their next 4 turns." },
    instant((_inst, api) => {
      addEffect(api, {
        kind: "barred",
        squares: [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)],
        against: api.opp,
        turns: 4,
      });
    }),
  ),
  H(
    { id: "cut_purse", name: "Cut Purse", description: "Your opponent's next draft is skipped.", flavor: "A hand in every pocket." },
    blockDrafts(1),
  ),
];
