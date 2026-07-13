// Tier 4 (Severe) hexes: heavy curses on the opponent. Each one shapes several
// of their turns or takes a whole piece off the board for a while: petrify a
// class of pieces for 3 turns, freeze a targeted piece for 4, bar a whole file,
// force king-only turns, stall every pawn, or gut a draft. Spread across every
// piece target and across mechanic types (timed filter, petrify, freeze, barred
// squares, king-only, no-pawn-advance, draft denial, skip).

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeTarget,
  instant,
  activated,
  addEffect,
  mySquares,
  relRank,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(4);

export const HEXES_T4: Buff[] = [
  // --- petrify all: rooks for 3 turns -------------------------------------
  H(
    {
      id: "granite_towers",
      name: "Granite Towers",
      description: "Your opponent's rooks turn to walnuts for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The towers set hard as granite.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 3),
  ),

  // --- petrify all: bishops for 3 turns -----------------------------------
  H(
    {
      id: "stone_clergy",
      name: "Stone Clergy",
      description: "Your opponent's bishops turn to walnuts for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The clergy are carved into the pews.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["b"] },
    },
    walnutAll(["b"], 3),
  ),

  // --- petrify all knights, and YOUR knights take stone-skin ---------------
  // Not a heavier Hobbled Cavalry (T3 walnuts their knights and stops there):
  // the same casting spills onto your own stable, so your knights ride out as
  // living statues, uncapturable while theirs sit inert.
  H(
    {
      id: "statue_stable",
      name: "Statue Stable",
      description: "Your opponent's knights turn to walnuts for 2 of their turns, and your own knights harden into living statues: they cannot be captured for those same 2 turns.",
      flavor: "One stable turns to plinths, the other to armor.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "n")) {
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
      }
      const mine = mySquares(api.board, api.me, "n");
      if (mine.length) {
        addEffect(api, { kind: "shield", owner: api.me, squares: mine, turns: 2 });
      }
    }),
  ),

  // --- petrify: one targeted queen for 3 turns ----------------------------
  H(
    {
      id: "medusas_stare",
      name: "Medusa's Stare",
      description: "Turn one enemy queen you target into a walnut for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "Even majesty turns to stone under that gaze.",
    },
    walnutTarget(3, ["q"]),
  ),

  // --- freeze: a targeted piece AND its neighbors, briefly ------------------
  H(
    {
      id: "cryostasis",
      name: "Cryostasis",
      description: "Flash-freeze one enemy piece you target: it and every enemy piece beside it are frozen for 1 of their turns. Kings are never frozen.",
      flavor: "The cold spreads faster than the warning.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece at the center of the freeze",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        addEffect(api, { kind: "freeze", sq: c, owner: api.opp, turns: 1 });
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(c) + df, r = RANK(c) + dr;
            if (f < 0 || f > 7 || r < 0 || r > 7) continue;
            const sq = SQ(f, r);
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
            }
          }
        }
      },
    ),
  ),

  // --- freeze: two targeted enemy pieces for 2 turns ----------------------
  H(
    {
      id: "hard_frost",
      name: "Hard Frost",
      description: "Freeze two enemy pieces you target so they cannot move for 2 of their turns. Kings cannot be targeted.",
      flavor: "The whole army rimed white overnight.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const chosen = picks.map((p) => p.square);
        return {
          kind: "square",
          label: "Choose an enemy piece to freeze",
          squares: mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type !== "k" && !chosen.includes(sq),
          ),
        };
      },
      (_inst, api, picks) => {
        for (const pick of picks) {
          if (pick.square != null) {
            addEffect(api, { kind: "freeze", sq: pick.square, owner: api.opp, turns: 2 });
          }
        }
      },
    ),
  ),

  // --- barred: seal ANY file of your choosing for 3 turns ------------------
  // Not a fixed center seal (Sealed Avenues owns the d+e files): you pick the
  // gate. Aim it down their rook's file, their attack lane, wherever it hurts.
  H(
    {
      id: "sealed_gate",
      name: "Sealed Gate",
      description: "Brick up one gate of your choosing: pick any square, and your opponent cannot move any piece onto that square's entire file for their next 3 turns.",
      flavor: "Any gate can be bricked shut, if you know which one.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to seal",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const squares: number[] = [];
        for (let r = 0; r < 8; r++) squares.push(SQ(FILE(sq), r));
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
      },
    ),
  ),

  // --- direction-gated clamp: advances crawl, retreats are free ------------
  // Not a lighter Leaden Limbs (T8 clamps EVERY move to one square): only
  // moves TOWARD you are clamped, and only to 2 squares. Their army can
  // regroup and retreat at full speed; it just cannot press the attack.
  H(
    {
      id: "abandoned_post",
      name: "Abandoned Post",
      description: "Nobody presses the attack: for your opponent's next 3 turns, any move toward your side of the board may cover at most 2 squares. Sideways moves and retreats keep their full range.",
      flavor: "The ranks hold their ground and refuse to march far.",
      // Board already paints the slowed pieces; fx carried for consistency.
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          relRank(api.opp, m.to) <= relRank(api.opp, m.from) ||
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 2,
      ),
    ),
  ),

  // --- stateful cooldown: rooks must rest a turn between hauls -------------
  // Not a rook-flavored Slippery Grip (T1 clamps their slide length): rooks
  // keep their FULL range, but after any rook moves, every rook must sit out
  // the following turn. A cooldown, not a range clamp.
  H(
    {
      id: "frozen_furrows",
      name: "Frozen Furrows",
      description: "The ruts freeze over between hauls: for your opponent's next 6 turns, whenever they move a rook, their rooks cannot move at all on their following turn.",
      flavor: "Every pass of the cart leaves ice the next one sticks in.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        if (!inst.state.lastWasRook) return moves;
        const kept = moves.filter((m) => m.piece !== "r");
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        inst.state.lastWasRook = move.piece === "r";
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- skip plus a hangover: lose a turn AND 20 seconds off the clock ------
  H(
    {
      id: "lost_weekend",
      name: "Lost Weekend",
      description: "Your opponent skips their next turn, and their clock loses 20 seconds.",
      flavor: "A whole day gone, and the headache eats into the next one.",
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.adjustClock({ subOppSec: 20 });
    }),
  ),

  // --- targeted rail: one enemy rook is locked to its current rank ---------
  H(
    {
      id: "ironbound_rook",
      name: "Ironbound Rook",
      description: "Bind one enemy rook to its rank: for 4 of their turns it cannot leave the rank it stands on. It may still slide sideways.",
      flavor: "Banded, bolted, and rolled onto a rail.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once bound, the rail never re-aims.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy rook to bind",
              squares: mySquares(api.board, api.opp, "r"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter((m) => m.from !== sq || RANK(m.to) === RANK(sq));
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        // Track the bound rook; the bind ends if it is captured.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to bind a rook"
          : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- timed filter: neither rook nor queen may move for 2 turns ----------
  H(
    {
      id: "heavy_shackles",
      name: "Heavy Shackles",
      description: "Your opponent cannot move their queen or their rooks for their next 2 turns.",
      flavor: "The heavy pieces are all in irons.",
      fx: { motif: "jail", pieces: ["q", "r"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "q" && m.piece !== "r")),
  ),
];
