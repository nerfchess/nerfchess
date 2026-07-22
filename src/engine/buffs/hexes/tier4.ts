// Tier 4 (Severe) hexes: heavy curses on the opponent. Each one shapes several
// of their turns or takes a whole piece off the board for a while: petrify a
// class of pieces for 3 turns, freeze a targeted piece for 4, bar a whole file,
// force king-only turns, stall every pawn, or gut a draft. Spread across every
// piece target and across mechanic types (timed filter, petrify, freeze, barred
// squares, king-only, no-pawn-advance, draft denial, skip).

import { Buff } from "./shared";
import {
  hex,
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
      description: "After your opponent's next move, their rooks turn to walnuts for their following 3 turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The towers set hard as granite.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    // Delayed petrify: the granite does not set until the opponent has taken
    // one more move; then every rook turns to a walnut for their next 3 turns.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.delay = 1;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const d = ((inst.state.delay as number) ?? 0) - 1;
        inst.state.delay = d;
        if (d > 0) return;
        // The delay is spent: petrify every enemy rook now. Added during their
        // own move, so the shared post-move tick eats one turn immediately; 4
        // here leaves exactly 3 of their turns.
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type !== "r") continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
        }
        inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.delay as number) ?? 0) > 0 ? "sets after their next move" : null,
    },
  ),

  // --- petrify all: bishops for 3 turns -----------------------------------
  H(
    {
      id: "stone_clergy",
      name: "Stone Clergy",
      description: "Your opponent's bishops turn to walnuts for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time. The first bishop keeps one free move before it too sets.",
      flavor: "The clergy are carved into the pews.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["b"] },
    },
    // All bishops petrify now, save one: the first bishop is left a single
    // escape move, then it sets to stone where it lands for the rest of the run.
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        const bishops = mySquares(api.board, api.opp, "b");
        const escapeSq = bishops.length ? bishops[0] : null;
        inst.state.escapeSq = escapeSq;
        for (const sq of bishops) {
          if (sq === escapeSq) continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
      },
      onMovePlayed: (inst, move, api) => {
        const esc = inst.state.escapeSq as number | undefined;
        if (esc != null && move.color === api.opp && move.from === esc) {
          // The freed bishop spent its escape move: petrify it where it lands.
          // Added during their own move, so the post-move tick eats one turn;
          // the current count leaves exactly its remaining turns.
          const rem = (inst.state.turns as number) ?? 0;
          if (rem > 1) {
            addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: rem });
          }
          inst.state.escapeSq = null;
        } else if (esc != null && move.to === esc && move.from !== esc) {
          // The freed bishop was captured before it could flee.
          inst.state.escapeSq = null;
        }
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.escapeSq != null
          ? "one bishop may still flee"
          : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- petrify all knights, and YOUR knights take stone-skin ---------------
  // Not a heavier Hobbled Cavalry (T3 walnuts their knights and stops there):
  // the same casting spills onto your own stable, so your knights ride out as
  // living statues, uncapturable while theirs sit inert.
  hex(
    {
      id: "statue_stable",
      name: "Statue Stable",
      tier: 5,
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
      description: "Turn one enemy queen you target into a walnut for 2 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "Even majesty turns to stone under that gaze.",
    },
    walnutTarget(2, ["q"]),
  ),

  // --- freeze: a targeted piece AND its neighbors, briefly ------------------
  H(
    {
      id: "cryostasis",
      name: "Cryostasis",
      description: "Flash-freeze one enemy piece you target: it and every enemy piece beside it are frozen for 1 of their turns. The defender keeps their single most valuable caught piece free. Kings are never frozen.",
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
        // Everything the one-turn freeze would catch: the target and its
        // non-king neighbors.
        const caught: number[] = [c];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(c) + df, r = RANK(c) + dr;
            if (f < 0 || f > 7 || r < 0 || r > 7) continue;
            const sq = SQ(f, r);
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") caught.push(sq);
          }
        }
        // A one-turn effect gives one defender-chosen piece immunity. A
        // caster-cast hex has no defender-choice flow, so exempt the defender's
        // most valuable caught piece deterministically (first on a value tie).
        const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        let exempt = caught[0];
        let best = -1;
        for (const sq of caught) {
          const v = VALUE[api.board.pieces[sq]!.type] ?? 0;
          if (v > best) {
            best = v;
            exempt = sq;
          }
        }
        for (const sq of caught) {
          if (sq === exempt) continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
        }
      },
    ),
  ),

  // --- freeze: two targeted enemy pieces for 2 turns ----------------------
  hex(
    {
      id: "hard_frost",
      name: "Hard Frost",
      tier: 5,
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
      description: "Brick up one gate of your choosing: pick any square. The first enemy piece to step onto that square's file passes through freely; the instant it does, the whole file seals against your opponent for the remainder of their next 3 turns.",
      flavor: "Any gate can be bricked shut, if you know which one.",
      // Board paints the barred file once it seals; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once aimed, the gate never re-aims.
      targets: (inst, _api, picks) =>
        picks.length > 0 || inst.state.file != null
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to seal",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.file != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.file = FILE(sq);
        inst.state.turns = 3;
        // The gate stands open until one piece slips through it.
        inst.state.open = true;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const file = inst.state.file as number | undefined;
        if (file == null || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        if (inst.state.open) return moves; // one piece may still pass
        const kept = moves.filter((m) => FILE(m.to) !== file);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const file = inst.state.file as number | undefined;
        if (file == null) return;
        if (inst.state.open && FILE(move.to) === file) {
          // The escaping piece pulls the gate shut behind it: paint and seal the
          // file for the rest of the duration. Added during their move, so the
          // post-move tick eats one turn; the current count leaves the rest.
          inst.state.open = false;
          const rem = (inst.state.turns as number) ?? 0;
          if (rem > 1) {
            const squares: number[] = [];
            for (let r = 0; r < 8; r++) squares.push(SQ(file, r));
            addEffect(api, { kind: "barred", squares, against: api.opp, turns: rem });
          }
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.file == null
          ? "activate to seal a file"
          : inst.state.open
            ? "the gate stands open for one pass"
            : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- direction-gated clamp: advances crawl, retreats are free ------------
  // Not a lighter Leaden Limbs (T8 clamps EVERY move to one square): only
  // moves TOWARD you are clamped, and only to 2 squares. Their army can
  // regroup and retreat at full speed; it just cannot press the attack.
  H(
    {
      id: "abandoned_post",
      name: "Abandoned Post",
      description: "Nobody presses the attack: starting after your opponent's next move, for their following 3 turns any move toward your side of the board may cover at most 2 squares. Sideways moves and retreats keep their full range.",
      flavor: "The ranks hold their ground and refuse to march far.",
      // Board already paints the slowed pieces; fx carried for consistency.
      fx: { motif: "anchor", pieces: "all" },
    },
    // Same clamp as before, but it takes hold one opponent move later: their
    // next move is free, then the 3-turn clamp runs.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.delay = 1;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (((inst.state.delay as number) ?? 0) > 0) return moves;
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter(
          (m) =>
            relRank(api.opp, m.to) <= relRank(api.opp, m.from) ||
            Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 2,
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (((inst.state.delay as number) ?? 0) > 0) {
          inst.state.delay = ((inst.state.delay as number) ?? 0) - 1;
          return;
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.delay as number) ?? 0) > 0
          ? "takes hold after their next move"
          : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- stateful cooldown: rooks must rest a turn between hauls -------------
  // Not a rook-flavored Slippery Grip (T1 clamps their slide length): rooks
  // keep their FULL range, but after any rook moves, every rook must sit out
  // the following turn. A cooldown, not a range clamp.
  H(
    {
      id: "frozen_furrows",
      name: "Frozen Furrows",
      description: "The ruts freeze over between hauls: for your opponent's next 5 turns, whenever they move a rook, their rooks cannot move at all on their following turn.",
      flavor: "Every pass of the cart leaves ice the next one sticks in.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
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
  hex(
    {
      id: "lost_weekend",
      name: "Lost Weekend",
      tier: 5,
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
      description: "Bind one enemy rook to its rank: for 4 of their turns it cannot leave the rank it stands on. Its first move may still break to any rank; after that it may only slide sideways along the rank it then holds.",
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
        // The bound rook keeps one legal escape move off its rank.
        inst.state.escape = true;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        if (inst.state.escape) return moves; // the rook's one free break
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
        if (move.from === sq) {
          // The rook has taken its one escape move: bind it to its new rank.
          inst.state.escape = false;
          inst.state.sq = move.to;
        }
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
      description: "Your opponent's queen and rooks are in irons for their next 2 turns. The first heavy piece they move slips free for that one move; after it, no queen or rook may move for the rest of the duration.",
      flavor: "The heavy pieces are all in irons.",
      fx: { motif: "jail", pieces: ["q", "r"] },
    },
    // Same lock, but the first heavy piece they move gets one legal escape move
    // before the irons hold for the rest of the duration.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
        inst.state.escape = true;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        if (inst.state.escape) return moves; // one heavy piece may still flee
        const kept = moves.filter((m) => m.piece !== "q" && m.piece !== "r");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (inst.state.escape && (move.piece === "q" || move.piece === "r")) {
          inst.state.escape = false; // the escaping heavy piece spends it
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
];
