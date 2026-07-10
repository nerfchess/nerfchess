// Tier 6 (Cruel) hexes: board-wide or repeated control that denies a whole
// plan at once. Each card petrifies or freezes entire classes of enemy pieces
// for multiple turns, locks the army down to the king, bars whole files, strips
// two turns, or blocks two drafts. Spread across every piece target and every
// mechanic type (timed filters, petrify via walnutAll/walnutTarget, freeze,
// freeze-all, barred squares, king-only, no-pawn-advance, draft denial, skip).
// Safety rails (kings never frozen or petrified, filters never soft-lock) come
// from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeAllEnemies,
  skipOpponent,
  blockDrafts,
  instant,
  addEffect,
  mySquares,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(6);

export const HEXES_T6: Buff[] = [
  // --- king_only: whole court frozen out for two full turns ---------------
  H(
    {
      id: "court_in_exile",
      name: "Court in Exile",
      description: "On your opponent's next 2 turns they may move only their king.",
      flavor: "The whole court walks out and leaves the crown alone.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 2 });
    }),
  ),

  // --- petrify all knights ------------------------------------------------
  H(
    {
      id: "stone_riders",
      name: "Stone Riders",
      description: "Your opponent's knights turn to walnuts for 4 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "Horse and rider both set hard in the saddle.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    walnutAll(["n"], 4),
  ),

  // --- petrify all bishops ------------------------------------------------
  H(
    {
      id: "stone_prelates",
      name: "Stone Prelates",
      description: "Your opponent's bishops turn to walnuts for 4 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "The clergy is carved into the transept wall.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["b"] },
    },
    walnutAll(["b"], 4),
  ),

  // --- petrify all rooks --------------------------------------------------
  H(
    {
      id: "stone_bastions",
      name: "Stone Bastions",
      description: "Your opponent's rooks turn to walnuts for 4 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "The towers forget how to roll.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 4),
  ),

  // --- petrify the queen, long --------------------------------------------
  H(
    {
      id: "queen_of_stone",
      name: "Queen of Stone",
      description: "Your opponent's queen turns to a walnut for 4 of their turns: it can only shuffle one square at a time.",
      flavor: "Her majesty holds court as a statue.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q"] },
    },
    walnutAll(["q"], 4),
  ),

  // --- freeze every minor piece (knights and bishops) ---------------------
  H(
    {
      id: "glacial_flanks",
      name: "Glacial Flanks",
      description: "Freeze your opponent's knights and bishops for 2 of their turns.",
      flavor: "Both wings of the army seize in the cold.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t !== "n" && t !== "b") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),

  // --- freeze the whole enemy army but pawns and king for two turns -------
  H(
    {
      id: "total_whiteout",
      name: "Total Whiteout",
      description: "A blizzard buries every sightline: for their next 3 turns, your opponent's pieces can only capture at arm's length, exactly one square away.",
      flavor: "A blizzard buries the whole board.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(3, (moves) =>
      moves.filter(
        (m) =>
          !m.captured ||
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1,
      ),
    ),
  ),

  // --- freeze the entire enemy army for two turns ---------------------------
  H(
    {
      // Moved up from tier 5: freezing the WHOLE enemy army for two of their
      // turns is the scaled-up sibling of Mass Freeze (1 turn, tier 4) and
      // sits two clean tiers below Absolute Zero (3 turns, tier 8).
      id: "the_big_chill",
      name: "The Big Chill",
      description: "Freeze all of your opponent's pieces except their king for 2 of their turns.",
      flavor: "The whole board glazes over in a single night.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(2),
  ),

  // --- full pawn lock: the infantry cannot move at all for four turns -------
  H(
    {
      // The scaled-up sibling of Sown Salt (tier 3, 2 turns): a full pawn
      // lock, no advance and no capture, held twice as long.
      id: "leaden_fields",
      name: "Leaden Fields",
      description: "Your opponent's pawns are cast in lead and cannot move at all, not even to capture, for their next 4 turns.",
      flavor: "Every furrow is poured full of lead.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    curse(4, (moves) => moves.filter((m) => m.piece !== "p")),
  ),

  // --- timed filter: lock down every major piece --------------------------
  H(
    {
      id: "grounded_command",
      name: "Grounded Command",
      description: "Your opponent cannot move their queen or rooks for their next 3 turns.",
      flavor: "The heavy pieces are chained to their squares.",
      fx: { motif: "jail", pieces: ["q", "r"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" && m.piece !== "r")),
  ),

  // --- petrify one targeted piece for the rest of the game ------------------
  H(
    {
      id: "eternal_statue",
      name: "Eternal Statue",
      description: "Turn one enemy piece you target into a walnut for the rest of the game: it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Chosen once, still for an age.",
    },
    // 999 turns: outlasts any realistic game, so the card reads "for the game".
    walnutTarget(999),
  ),

  // --- barred: seal the two central files for four turns ------------------
  H(
    {
      id: "sealed_avenues",
      name: "Sealed Avenues",
      description: "Your opponent cannot enter any square on the d or e files for their next 4 turns.",
      flavor: "The two great avenues are walled off end to end.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let r = 0; r < 8; r++) {
        squares.push(SQ(3, r), SQ(4, r));
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),

  // --- draft denial: block the next two drafts outright -------------------
  H(
    {
      id: "empty_handed",
      name: "Empty Handed",
      description: "Your opponent's next 2 drafts are blocked and skipped entirely.",
      flavor: "The deck is pulled away twice running.",
    },
    blockDrafts(2),
  ),

  // --- skip: strip two whole turns ----------------------------------------
  H(
    {
      id: "lost_days",
      name: "Lost Days",
      description: "Your opponent skips their next 2 turns entirely.",
      flavor: "Two days fall out of their calendar.",
      fx: { motif: "slow", pieces: "all" },
    },
    skipOpponent(2),
  ),
];
