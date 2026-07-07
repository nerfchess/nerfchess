// ---------------------------------------------------------------------------
// TIER 9 - the apex band. These cards are the strongest in the game: each one
// is nearly game-winning, and several exist specifically as a comeback lifeline
// for a player who is all but lost (they respawn a whole force onto the board).
//
// Tier 9 is NEVER offered by the normal draft. Every card here is flagged
// `special: true` (and `tier: 9`), which draft.ts excludes from every roll. The
// only ways to obtain one are the dedicated grants: the gambling "Jackpot" card
// and banking a draft while already at the top tier (see draft.ts / helpers.ts).
//
// Safety and determinism, same rails as the rest of the buff library:
//   - Kings are never frozen, walnutted, removed, or targeted.
//   - No opponent-move filter is used, so no card can strand the opponent with
//     zero legal moves (a frozen army can still move its king).
//   - Every random choice runs on the seeded api.rng (never Math.random), and
//     the one over-time hook (Purge) mirrors the proven Voodoo Doll pattern
//     (rng inside onMovePlayed is revealed via lastHookMutations and replays).
// ---------------------------------------------------------------------------

import { Buff, BuffApi, BuffCategory, CardFx } from "../buff";
import { FILE, PieceType, RANK, Square } from "../types";
import {
  ALL_DIRS,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  emptySquares,
  inHalf,
  markRevived,
  mySquares,
  pawnRankOk,
  placePieces,
  relRank,
  revivable,
  slideMoves,
  tickTurns,
  turnsLeft,
} from "./helpers";

type Meta = {
  id: string;
  name: string;
  description: string;
  category: BuffCategory;
  icon?: string;
  flavor?: string;
  requires?: PieceType[];
  fx?: CardFx;
};

type Mech = Partial<Buff> & Pick<Buff, "kind">;

/** Build a fully implemented apex card: always tier 9 and always special, so it
 * can only ever reach a hand through a dedicated grant. */
function apex(meta: Meta, mech: Mech): Buff {
  return { ...meta, tier: 9, special: true, implemented: true, ...mech };
}

/** Chebyshev (king-step) distance between two squares. */
function cheb(a: Square, b: Square): number {
  return Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));
}

/** Empty squares in my half, ordered from my back rank outward, so a respawn
 * fills the safest ranks first. */
function backfillSpots(api: BuffApi): Square[] {
  return emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
    (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
  );
}

const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);

export const TIER9: Buff[] = [
  // --- Game-winning boons ---------------------------------------------------

  // Absolute Zero: the whole enemy army (kings excepted) freezes solid for 3 of
  // the opponent's turns. They can only shuffle their king while it thaws.
  apex(
    {
      id: "ice_age",
      icon: "Snowflake",
      name: "Ice Age",
      description:
        "Every enemy piece other than the king freezes solid and cannot move for your opponent's next 3 turns.",
      category: "tempo",
      flavor: "The board holds its breath.",
      fx: { motif: "jail", pieces: "all" },
    },
    activatedSimple((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "ice" });
      }
    }),
  ),

  // Regicide: your queen appears right next to the enemy king. If no empty
  // square borders the king, she takes the nearest empty square to it instead.
  apex(
    {
      id: "regicide",
      icon: "Crown",
      name: "Regicide",
      description:
        "Your queen teleports to an empty square next to the enemy king. If none is open, she lands on the nearest empty square to it. A decisive threat.",
      category: "attack",
      requires: ["q"],
      flavor: "The court has reached a verdict.",
      fx: { motif: "empower", pieces: ["q"], self: true },
    },
    activatedSimple((_inst, api) => {
      const queen = mySquares(api.board, api.me, "q")[0];
      const king = mySquares(api.board, api.opp, "k")[0];
      if (queen == null || king == null) return;
      const empties = emptySquares(api.board).filter((sq) => sq !== queen);
      if (empties.length === 0) return;
      const adjacent = empties.filter((sq) => cheb(sq, king) === 1);
      const pool = adjacent.length > 0 ? adjacent : empties;
      // Deterministic: closest to the king, ties broken by lowest square index.
      const dest = pool.sort((a, b) => cheb(a, king) - cheb(b, king) || a - b)[0];
      if (dest != null) api.relocate(queen, dest);
    }),
  ),

  // Resurrection: your whole graveyard marches back. Every captured piece
  // (queen first, pawns last) returns to an empty square in your half, filling
  // from your back rank outward. The flagship comeback card.
  apex(
    {
      id: "resurrection",
      icon: "Sparkles",
      name: "Resurrection",
      description:
        "Every piece your opponent has captured returns to the board on empty squares in your half, filling from your back rank outward.",
      category: "pieces",
      flavor: "Rise, and rise again.",
    },
    activatedSimple((_inst, api) => {
      const spots = backfillSpots(api);
      const order: PieceType[] = ["q", "r", "b", "n", "p"];
      for (const type of order) {
        let left = revivable(api, type);
        while (left > 0 && spots.length > 0) {
          const at = spots.findIndex((sq) => type !== "p" || pawnRankOk(sq));
          if (at < 0) break;
          const sq = spots.splice(at, 1)[0];
          api.place(sq, type, api.me);
          markRevived(api, type);
          left--;
        }
      }
    }),
  ),

  // Divine Right: for 3 turns your king moves and captures as a queen AND cannot
  // be captured. Held (spendOnUse:false) so its granted moves persist; it ticks
  // itself down on your turns and retires when the reign ends.
  apex(
    {
      id: "divine_right",
      icon: "Crown",
      name: "Divine Right",
      description:
        "For your next 3 turns your king may move and capture as a queen, and it cannot be captured.",
      category: "movement",
      flavor: "By the grace of no one in particular.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst, api) => {
        // One activation only; re-use is a guarded no-op.
        if (inst.state.turns != null) return;
        inst.state.turns = 3;
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
      },
      augmentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0) return;
        for (const sq of mySquares(api.board, api.me, "k")) {
          addNovel(moves, slideMoves(api.board, sq, ALL_DIRS, inst.id));
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.turns == null) return;
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.turns == null
          ? "activate: your king rules as a queen"
          : `divine reign: ${turnsLeft(inst)} of your turns left`,
    },
  ),

  // Second Coming: a fresh queen descends onto a square you choose in your half,
  // and your whole army is untouchable for the opponent's next 2 turns.
  apex(
    {
      id: "second_coming",
      icon: "Sparkle",
      name: "Second Coming",
      description:
        "Summon a queen on an empty square in your half, and your whole army cannot be captured for your opponent's next 2 turns.",
      category: "pieces",
      flavor: "Foretold, and right on time.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where your new queen descends",
              squares: emptySquares(api.board, myHalfZone(api)),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq != null && !api.board.pieces[sq]) api.place(sq, "q", api.me);
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      },
    ),
  ),

  // Iron Legion: a whole relief force marches in. Place a rook and two knights
  // on empty squares in your half. A second comeback lifeline.
  apex(
    {
      id: "iron_legion",
      icon: "Castle",
      name: "Iron Legion",
      description:
        "A relief force arrives: place a rook and two knights on empty squares in your half.",
      category: "pieces",
      flavor: "Reinforcements, at last.",
    },
    placePieces(["r", "n", "n"], myHalfZone),
  ),

  // --- Devastating hexes (cast on the opponent) -----------------------------

  // Blackout: the lights go out on your opponent for three whole turns.
  apex(
    {
      id: "blackout",
      icon: "PowerOff",
      name: "Blackout",
      description: "The lights go out: your opponent's next 3 turns are skipped entirely.",
      category: "hex",
      flavor: "Nobody home.",
      fx: { motif: "slow", pieces: "all" },
    },
    activatedSimple((_inst, api) => {
      api.bs.skips[api.opp] += 3;
    }),
  ),

  // Mass Petrify: every enemy knight and bishop turns to stone (a walnut) for 3
  // turns; a petrified piece can only shuffle a single square while it lasts.
  apex(
    {
      id: "mass_petrify",
      icon: "Gem",
      name: "Mass Petrify",
      description:
        "Every enemy knight and bishop turns to stone for your opponent's next 3 turns. A petrified piece may only shuffle one square.",
      category: "hex",
      flavor: "Do not meet its gaze.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    activatedSimple((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "n" || t === "b") {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
      }
    }),
  ),

  // Purge: at the start of each of your next 2 turns, a random enemy piece
  // (never the king) is dragged off the board. Held (spendOnUse:false) so it
  // can fire twice; it arms on use and retires when both purges are spent.
  apex(
    {
      id: "culling",
      icon: "Skull",
      name: "The Culling",
      description:
        "At the start of each of your next 2 turns, a random enemy piece other than the king is captured.",
      category: "hex",
      flavor: "The list grows shorter.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst) => {
        // Arm the purge on use; onMovePlayed does the work over the next turns.
        if (inst.state.charges == null) inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        // Fire at the boundary before each of my turns (the opponent's move
        // just completed). Mirrors Voodoo Doll's rng-in-hook pattern.
        if (move.color !== api.opp) return;
        const targets = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (targets.length === 0) return;
        const victim = targets[api.rng.int(targets.length)];
        api.removePiece(victim);
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => {
        const c = (inst.state.charges as number) ?? 0;
        return c > 0 ? `${c} purge${c === 1 ? "" : "s"} left` : null;
      },
    },
  ),
];
