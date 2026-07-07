// Tier 8 (Unhinged) hexes: game-defining curses that swing the whole match if
// the opponent has no answer. Each card strips multiple turns, petrifies the
// royal battery, ices the entire army, seals huge regions of the board, or
// stands as a permanent standing curse. Spread across every piece target
// (queen, rook, bishop, knight, pawn, king) and every mechanic type (timed
// filter, permanent filter, petrify one or many, freeze one or all, barred
// squares, king-only, no-pawn-advance, draft denial, and skips). Safety rails
// (kings never frozen or petrified, filters never soft-lock) come from the
// shared helpers, so nothing here can hard-lock the game.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  permaOppFilter,
  walnutAll,
  walnutTarget,
  freezeAllEnemies,
  freezeTarget,
  skipOpponent,
  nullifyDrafts,
  instant,
  addEffect,
  relRank,
  FILE,
  RANK,
} from "./shared";

const H = tierHexes(8);

export const HEXES_T8: Buff[] = [
  // --- skip: opponent loses two whole turns in a row ----------------------
  H(
    {
      id: "endless_night",
      name: "Endless Night",
      description: "Your opponent skips their next 2 turns entirely.",
      flavor: "The sun forgets to rise, and no one moves in the dark.",
      fx: { motif: "slow", pieces: "all" },
    },
    skipOpponent(2),
  ),

  // --- petrify all: the whole royal battery, queen AND both rooks ----------
  H(
    {
      id: "crown_and_castle",
      name: "Crown and Castle",
      description: "Your opponent's queen and rooks turn to walnuts for 2 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The heaviest pieces set like mortar overnight.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q", "r"] },
    },
    walnutAll(["q", "r"], 2),
  ),

  // --- king_only: only the king may move, for 3 long turns ----------------
  H(
    {
      id: "abdication_edict",
      name: "Abdication Edict",
      description: "For your opponent's next 3 turns they may move only their king. Every other piece is stuck fast.",
      flavor: "The crown rules alone, and the court simply stops answering.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 3 });
    }),
  ),

  // --- freeze all: the entire army but the king iced for 2 turns ----------
  H(
    {
      id: "absolute_zero",
      name: "Absolute Zero",
      description: "Freeze all of your opponent's pieces except their king for 3 of their turns, so only their king may move.",
      flavor: "The board drops below freezing and everything but the crown locks solid.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(3),
  ),

  // --- petrify all: every minor piece, knights and bishops, for 4 turns ----
  H(
    {
      id: "petrified_forest",
      name: "Petrified Forest",
      description: "Your opponent's knights and bishops turn to walnuts for 4 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "Every horse and prelate grown into ancient stone timber.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 4),
  ),

  // --- petrify one targeted piece (any non-king) for 5 turns --------------
  H(
    {
      id: "medusa_stare",
      name: "Basilisk's Stare",
      description: "Turn one enemy piece you target into a walnut for 5 of their turns: a walnut is so heavy it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Meet its eyes once and you are a garden ornament.",
    },
    walnutTarget(5),
  ),

  // --- no_pawn_advance: pawns nailed down for 8 turns (near-permanent) -----
  H(
    {
      id: "blighted_furrows",
      name: "Blighted Furrows",
      description: "Your opponent's pawns cannot advance for their next 8 turns. They may still capture diagonally.",
      flavor: "The fields are poisoned; not one seed dares push upward.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 8 });
    }),
  ),

  // --- combo: skip a whole turn AND block the next 2 drafts ----------------
  H(
    {
      id: "sacked_capital",
      name: "Sacked Capital",
      description: "Your opponent skips their next turn entirely, and their next 2 drafts are skipped as well.",
      flavor: "The capital burns, the messengers scatter, and no orders reach the field.",
      // fx covers the turn skip; the draft denial half shows no board motif.
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 2;
    }),
  ),

  // --- barred: seal the victim's 4th, 5th and 6th ranks for 3 turns --------
  // Side-relative fix: the old version barred absolute ranks 4-6, which cut
  // three ranks out of a black victim's own half but only one of white's.
  // Now the sealed band is always the victim's OWN 4th to 6th ranks.
  H(
    {
      id: "scorched_earth",
      name: "Scorched Earth",
      description: "Your opponent cannot move any piece onto their own 4th, 5th, or 6th ranks for their next 3 turns.",
      flavor: "A cratered killing field where no army dares set foot.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        const r = relRank(api.opp, sq);
        if (r >= 4 && r <= 6) squares.push(sq);
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- permanent filter: the opponent's rooks can never move again ---------
  H(
    {
      id: "sealed_ramparts",
      name: "Sealed Ramparts",
      description: "Your opponent's rooks can never move again for the rest of the game. Their other pieces are unaffected.",
      flavor: "The gates are bricked over for good; the towers will never open.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    permaOppFilter((moves) => moves.filter((m) => m.piece !== "r")),
  ),

  // --- timed filter: every piece hobbled to one square for 3 turns ---------
  H(
    {
      id: "leaden_limbs",
      name: "Leaden Limbs",
      description: "Your opponent may move each piece at most one square in any direction for their next 3 turns.",
      flavor: "Every limb turns to lead; a single shuffling step is all anyone manages.",
      // "all" is right: the filter also strips castling off the king.
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves) =>
      moves.filter(
        (m) =>
          Math.max(
            Math.abs(FILE(m.to) - FILE(m.from)),
            Math.abs(RANK(m.to) - RANK(m.from)),
          ) <= 1,
      ),
    ),
  ),

  // --- freeze one targeted piece for 5 turns ------------------------------
  H(
    {
      id: "everfrost_shard",
      name: "Everfrost Shard",
      description: "Freeze one enemy piece you target so it cannot move for 5 of their turns. Kings cannot be targeted.",
      flavor: "A splinter of unmelting winter driven straight through it.",
    },
    freezeTarget(5),
  ),

  // --- draft denial: opponent's next 3 drafts arrive nullified ------------
  H(
    {
      id: "poisoned_counsel",
      name: "Poisoned Counsel",
      description: "Your opponent's next 3 drafted buffs arrive nullified and do nothing.",
      flavor: "Every advisor whispers rot, and every plan curdles on arrival.",
    },
    nullifyDrafts(3),
  ),

  // --- timed filter: no captures with any piece for 3 turns ---------------
  H(
    {
      id: "peace_of_the_grave",
      name: "Peace of the Grave",
      description: "Your opponent cannot capture with any piece for their next 3 turns.",
      flavor: "A forced truce enforced by the dead; no blade may be drawn.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(3, (moves) => moves.filter((m) => !m.captured)),
  ),
];
