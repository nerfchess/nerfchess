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
  SQ,
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
    },
    skipOpponent(2),
  ),

  // --- petrify all: the whole royal battery, queen AND both rooks ----------
  H(
    {
      id: "crown_and_castle",
      name: "Crown and Castle",
      description: "Your opponent's queen and rooks turn to walnuts and cannot move for 2 of their turns.",
      flavor: "The heaviest pieces set like mortar overnight.",
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
    },
    freezeAllEnemies(3),
  ),

  // --- petrify all: every minor piece, knights and bishops, for 3 turns ----
  H(
    {
      id: "petrified_forest",
      name: "Petrified Forest",
      description: "Your opponent's knights and bishops turn to walnuts and cannot move for 5 of their turns.",
      flavor: "Every horse and prelate grown into ancient stone timber.",
    },
    walnutAll(["n", "b"], 5),
  ),

  // --- petrify one targeted piece (any non-king) for 6 turns --------------
  H(
    {
      id: "medusa_stare",
      name: "Basilisk's Stare",
      description: "Turn one enemy piece you target into a walnut so it cannot move for 6 of their turns. Kings cannot be targeted.",
      flavor: "Meet its eyes once and you are a garden ornament.",
    },
    walnutTarget(6),
  ),

  // --- no_pawn_advance: pawns nailed down for 8 turns (near-permanent) -----
  H(
    {
      id: "blighted_furrows",
      name: "Blighted Furrows",
      description: "Your opponent's pawns cannot advance for their next 8 turns.",
      flavor: "The fields are poisoned; not one seed dares push upward.",
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
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 2;
    }),
  ),

  // --- barred: seal ranks 4, 5 and 6 so nothing can advance for 3 turns ----
  H(
    {
      id: "scorched_earth",
      name: "Scorched Earth",
      description: "Your opponent cannot move any piece onto the 4th, 5th, or 6th ranks for their next 3 turns.",
      flavor: "A cratered killing field where no army dares set foot.",
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let f = 0; f < 8; f++) {
        squares.push(SQ(f, 3), SQ(f, 4), SQ(f, 5));
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

  // --- freeze one targeted piece for 6 turns ------------------------------
  H(
    {
      id: "everfrost_shard",
      name: "Everfrost Shard",
      description: "Freeze one enemy piece you target so it cannot move for 6 of their turns. Kings cannot be targeted.",
      flavor: "A splinter of unmelting winter driven straight through it.",
    },
    freezeTarget(6),
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
    },
    curse(3, (moves) => moves.filter((m) => !m.captured)),
  ),
];
