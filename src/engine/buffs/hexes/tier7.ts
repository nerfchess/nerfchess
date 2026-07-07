// Tier 7 (Punishing) hexes: near-decisive curses on the opponent. Each card
// disables multiple pieces or an entire class for a long stretch, freezes the
// whole army, strips turns, or locks the position for so long it feels
// permanent. Spread across every piece target (queen, rook, bishop, knight,
// pawn, king) and every mechanic type (timed filter, petrify one or many,
// freeze one or all, barred squares, king-only, no-pawn-advance, draft denial,
// and a skip). Safety rails (kings never frozen or petrified, filters never
// soft-lock) come from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeAllEnemies,
  freezeTarget,
  skipOpponent,
  blockDrafts,
  instant,
  addEffect,
  SQ,
} from "./shared";

const H = tierHexes(7);

export const HEXES_T7: Buff[] = [
  // --- petrify all: both rooks locked for 4 turns -------------------------
  H(
    {
      id: "obsidian_bastions",
      name: "Obsidian Bastions",
      description: "Your opponent's rooks turn to walnuts for 4 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The towers cool into black glass.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 4),
  ),

  // --- petrify all: the entire minor line (knights and bishops) 3 turns ---
  H(
    {
      id: "statue_garden",
      name: "Statue Garden",
      description: "Your opponent's knights and bishops turn to walnuts for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "Every horse and prelate set among the topiary.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 3),
  ),

  // --- petrify all: the queen frozen in stone for 3 turns -----------------
  H(
    {
      id: "cockatrice_gaze",
      name: "Cockatrice Gaze",
      description: "Your opponent's queen turns to a walnut for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "One glance and the lady is limestone.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q"] },
    },
    walnutAll(["q"], 3),
  ),

  // --- petrify one targeted piece (any non-king) for 4 turns --------------
  H(
    {
      id: "chisel_curse",
      name: "Chisel Curse",
      description: "Turn one enemy piece you target into a walnut for 4 of their turns: a walnut is so heavy it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Marked, struck, and left as monument.",
    },
    walnutTarget(4),
  ),

  // --- freeze all: whole army but the king iced for 2 turns ---------------
  H(
    {
      id: "glacial_tomb",
      name: "Glacial Tomb",
      description: "Freeze all of your opponent's pieces except their king for 2 of their turns, so only their king may move.",
      flavor: "The army sealed under a sheet of blue ice.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(2),
  ),

  // --- freeze one targeted piece for 4 turns ------------------------------
  H(
    {
      id: "frozen_solid",
      name: "Frozen Solid",
      description: "Freeze one enemy piece you target so it cannot move for 4 of their turns. Kings cannot be targeted.",
      flavor: "Encased so deep the thaw never comes.",
    },
    freezeTarget(4),
  ),

  // --- king_only 1 turn AND block their next draft -------------------------
  H(
    {
      id: "throne_and_silence",
      name: "Throne and Silence",
      description: "For your opponent's next turn they may move only their king, and their next draft is skipped entirely.",
      flavor: "The whole court scatters and the messengers with it.",
      // fx covers the king_only half (board paints it too); the draft
      // denial half shows no board motif.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // --- no_pawn_advance: pawns nailed down for 6 turns (near-permanent) -----
  H(
    {
      id: "salted_earth",
      name: "Salted Earth",
      description: "Your opponent's pawns cannot advance for their next 6 turns. They may still capture diagonally.",
      flavor: "Nothing grows and nothing marches on ground sown with salt.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 6 });
    }),
  ),

  // --- barred: seal the entire center (4th and 5th ranks) for 3 turns -----
  H(
    {
      id: "molten_heart",
      name: "Molten Heart",
      description: "Your opponent cannot move any piece onto the 4th or 5th ranks for their next 3 turns.",
      flavor: "The middle of the board runs with lava.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let f = 0; f < 8; f++) {
        squares.push(SQ(f, 3), SQ(f, 4));
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: opponent's next 2 drafts skipped outright ------------
  H(
    {
      id: "sealed_archive",
      name: "Sealed Archive",
      description: "Your opponent's next 2 drafts are skipped entirely and they draft no cards.",
      flavor: "The vault is bricked over; no orders get out.",
    },
    blockDrafts(2),
  ),

  // --- skip: opponent loses two whole turns -------------------------------
  H(
    {
      id: "lost_fortnight",
      name: "Lost Fortnight",
      description: "Your opponent skips their next 2 turns entirely.",
      flavor: "Two weeks vanish and no one can say where.",
      fx: { motif: "slow", pieces: "all" },
    },
    skipOpponent(2),
  ),

  // --- timed filter: only pawns and the king may move for 3 turns ---------
  H(
    {
      id: "noble_rout",
      name: "Noble Rout",
      description: "Your opponent may move only their pawns and their king for their next 3 turns.",
      flavor: "Every noble has fled the field; only the levy holds.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- timed filter: no captures with any piece for 3 turns ---------------
  H(
    {
      id: "withered_hands",
      name: "Withered Hands",
      description: "Your opponent cannot capture with any piece for their next 3 turns.",
      flavor: "Every grip in the army has gone to rot.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(3, (moves) => moves.filter((m) => !m.captured)),
  ),
];
