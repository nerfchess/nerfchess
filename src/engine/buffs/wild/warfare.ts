// Wild set: WARFARE & TACTICS. A batch of soldierly power cards built ENTIRELY
// from primitives that already live in the engine: charges that cut a line
// (lineSweep), reinforcements and rentals (placePieces / summonTemp), permanent
// veteran upgrades on a single piece (pieceBound / bindPiece), army-wide grants
// (permanentAugment / timedAugment), sieges and sealed ground (barLine /
// voidSquares), bodyguards and shield walls (shieldArmy / shield zones), and
// ambushes (freeze / convertEnemies / removeEnemies). Every movement grant only
// ever WIDENS a move list, every opponent effect is partial or targeted, and no
// king is ever frozen, converted, or removed, so nothing here can soft-lock a
// turn. This file is self-contained: it imports shared helpers from
// ../helpers and keeps local copies of the summon / convert patterns (exactly as
// the fantasy and funny sets do in their own shared.ts).

import { Buff, BuffApi, BuffCategory, BuffInstance, CardFx } from "../../buff";
import { Tier } from "../../nerf";
import { FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  addEffect,
  augment,
  barLine,
  bindCandidates,
  bindPiece,
  captureSquare,
  emptySquares,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  mySquares,
  permanentAugment,
  phasingSlideMoves,
  pieceBound,
  placePieces,
  relRank,
  removeEnemies,
  reviveOne,
  shieldArmy,
  slideMoves,
  timedAugment,
  voidSquares,
} from "../helpers";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type WarfareMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  boon?: boolean;
  fx?: CardFx;
};

/** Build a fully implemented card. Mirrors library.ts's private `def`. */
function card(meta: WarfareMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// --- Destination zones -------------------------------------------------------
const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
const oppHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.opp, sq);
const backRankZone = (api: BuffApi) => (sq: Square) =>
  RANK(sq) === (api.me === "w" ? 0 : 7);
const kingAdjacentZone = (api: BuffApi) => {
  const k = mySquares(api.board, api.me, "k")[0];
  return (sq: Square) => {
    if (k == null) return false;
    const df = Math.abs(FILE(sq) - FILE(k)), dr = Math.abs(RANK(sq) - RANK(k));
    return df <= 1 && dr <= 1 && sq !== k;
  };
};
const backRankDest = (api: BuffApi, _from: Square) => {
  const r = api.me === "w" ? 0 : 7;
  return Array.from({ length: 8 }, (_, f) => SQ(f, r));
};

// --- Local copy of the summon-a-rental pattern (see funny/shared.ts). A fresh
// piece is placed, follows its own moves, and is quietly removed after `turns`
// of the owner's turns via an uncounted removePiece so nothing enters the
// revive pool. Only non-pawns, so there is never a promotion edge to track. ----
function summonTemp(
  type: Exclude<PieceType, "p" | "k">,
  turns: number,
  zone: (api: BuffApi) => (sq: Square) => boolean,
): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) =>
      picks.length > 0 || inst.state.sq != null
        ? null
        : {
            kind: "square",
            label: "Choose where your reinforcement lands",
            squares: emptySquares(api.board, zone(api)),
          },
    effect: (inst, api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null || inst.state.sq != null) return;
      api.place(sq, type, api.me);
      inst.state.sq = sq;
      inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      if (move.capturedSquare === sq && move.from !== sq) {
        inst.spent = true;
        inst.state.sq = undefined;
        return;
      }
      if (move.from === sq) {
        inst.state.sq = move.to;
      } else if (move.to === sq && move.from !== sq) {
        inst.spent = true;
        inst.state.sq = undefined;
        return;
      }
      if (move.color !== api.me) return;
      const left = ((inst.state.turns as number) ?? 0) - 1;
      inst.state.turns = left;
      if (left <= 0) {
        const cur = inst.state.sq as Square | undefined;
        if (cur != null && api.board.pieces[cur]) api.removePiece(cur, { uncounted: true });
        inst.spent = true;
        inst.state.sq = undefined;
      }
    },
    status: (inst) =>
      inst.state.sq == null
        ? "activate to summon"
        : `reinforcement withdraws in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

// --- Local copy of convertEnemies (see fantasy/shared.ts): take control of
// `count` enemy pieces of the given types. Kings are never offered. ------------
function convertEnemies(count: number, types: PieceType[], label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: count > 1 ? `${label} (${picks.length + 1}/${count})` : label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const p = api.board.pieces[sq]!;
              return types.includes(p.type) && !picks.some((k) => k.square === sq);
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.setPieceColor(k.square, api.me);
    },
  );
}

// --- Instant: freeze every enemy piece of the given types for `turns` of their
// turns. Kings are never frozen. (Same shape as fantasy/shared.ts's walnutAll,
// but with a freeze effect instead of a walnut.) ------------------------------
function freezeTypedAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "freeze", sq, owner: api.opp, turns });
    }
  });
}

// --- Activated: freeze up to `count` targeted enemy non-king pieces, each for
// `turns` of their turns. --------------------------------------------------
function freezeMany(count: number, turns: number, label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: count > 1 ? `${label} (${picks.length + 1}/${count})` : label,
            squares: mySquares(api.board, api.opp).filter(
              (sq) =>
                api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
            ),
            ...(picks.length > 0 ? { finishable: true } : {}),
          },
    (_inst, api, picks) => {
      for (const k of picks) {
        if (k.square != null) {
          addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns });
        }
      }
    },
  );
}

// --- Every one of my pawns that can capture the enemy piece directly ahead of
// it, expanding promotions on the last rank. Used by Field Fortification. -----
function forwardCaptureGen(inst: BuffInstance, api: BuffApi): Move[] {
  const out: Move[] = [];
  const fwd = api.me === "w" ? 8 : -8;
  for (const from of mySquares(api.board, api.me, "p")) {
    const to = from + fwd;
    if (to < 0 || to > 63) continue;
    const t = api.board.pieces[to];
    if (!t || t.color !== api.opp) continue;
    if (relRank(api.me, to) === 8) {
      for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
        out.push({
          from, to, piece: "p", color: api.me,
          captured: t.type, capturedSquare: to, via: inst.id, promotion: promo,
        });
      }
    } else {
      out.push({
        from, to, piece: "p", color: api.me,
        captured: t.type, capturedSquare: to, via: inst.id,
      });
    }
  }
  return out;
}

export const WILD_WARFARE: Buff[] = [
  // -------------------------------------------------------------------------
  // REINFORCEMENTS: bring more soldiers to the field.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_reclaim_the_fallen",
      name: "Reclaim the Fallen",
      description: "Return one of your captured pawns to any empty square in your half, once.",
      tier: 2,
      category: "pieces",
      flavor: "No body left behind.",
    },
    reviveOne(["p"], myHalfZone),
  ),
  card(
    {
      id: "ww_last_reserves",
      name: "Last Reserves",
      description: "Return one of your captured knights or bishops to any empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "Pull the veterans off the bench.",
    },
    reviveOne(["n", "b"], myHalfZone),
  ),
  card(
    {
      id: "ww_recommission",
      name: "Recommission",
      description: "Return one of your captured rooks to an empty square on your back rank, once.",
      tier: 4,
      category: "pieces",
      flavor: "Back into service, same old siege.",
    },
    reviveOne(["r"], backRankZone),
  ),
  card(
    {
      id: "ww_outriders",
      name: "Outriders",
      description: "Place a new knight on any empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "Scouts ride ahead of the column.",
    },
    placePieces(["n"], myHalfZone),
  ),
  card(
    {
      id: "ww_sapper_team",
      name: "Sapper Team",
      description: "Place a new bishop on any empty square in your half, once.",
      tier: 4,
      category: "pieces",
      flavor: "They dig the tunnels no one else will.",
    },
    placePieces(["b"], myHalfZone),
  ),
  card(
    {
      id: "ww_muster_the_ranks",
      name: "Muster the Ranks",
      description: "Place a new knight and two new pawns on empty squares in your half, once.",
      tier: 5,
      category: "pieces",
      flavor: "The muster roll fills out fast.",
    },
    placePieces(["n", "p", "p"], myHalfZone),
  ),
  card(
    {
      id: "ww_combined_arms",
      name: "Combined Arms",
      description: "Place a new rook and a new knight on empty squares in your half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Armor and cavalry, moving as one.",
    },
    placePieces(["r", "n"], myHalfZone),
  ),
  card(
    {
      id: "ww_shieldbearers",
      name: "Shieldbearers",
      description: "Place two new pawns on empty squares adjacent to your king, once.",
      tier: 4,
      category: "pieces",
      flavor: "Close ranks around the crown.",
    },
    placePieces(["p", "p"], kingAdjacentZone),
  ),
  card(
    {
      id: "ww_paratroopers",
      name: "Paratroopers",
      description: "Place two new pawns on empty squares in your opponent's half, once.",
      tier: 5,
      category: "pieces",
      flavor: "They land behind the lines.",
    },
    placePieces(["p", "p"], oppHalfZone),
  ),
  card(
    {
      id: "ww_forward_outpost",
      name: "Forward Outpost",
      description: "Place a new rook on any empty square in your opponent's half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Plant the flag deep in their ground.",
    },
    placePieces(["r"], oppHalfZone),
  ),
  card(
    {
      id: "ww_bridgehead",
      name: "Bridgehead",
      description: "Place a new knight and a new pawn on empty squares in your opponent's half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Hold the crossing and pour through it.",
    },
    placePieces(["n", "p"], oppHalfZone),
  ),
  card(
    {
      id: "ww_forward_observer",
      name: "Forward Observer",
      description: "Deploy a bishop that scouts for you as a bishop for 3 of your turns, then pulls back.",
      tier: 4,
      category: "pieces",
      flavor: "Eyes on the far ridge.",
    },
    summonTemp("b", 3, myHalfZone),
  ),
  card(
    {
      id: "ww_reserve_cavalry",
      name: "Reserve Cavalry",
      description: "Call up a knight that rides with you for 4 of your turns, then returns to reserve.",
      tier: 4,
      category: "pieces",
      flavor: "Held back for exactly this moment.",
    },
    summonTemp("n", 4, myHalfZone),
  ),
  card(
    {
      id: "ww_mercenary_queen",
      name: "Mercenary Queen",
      description: "Hire a sellsword who fights as a queen for 3 of your turns, then rides off with her pay.",
      tier: 6,
      category: "pieces",
      flavor: "Loyalty runs exactly as long as the contract.",
    },
    summonTemp("q", 3, myHalfZone),
  ),
  card(
    {
      id: "ww_field_hospital",
      name: "Field Hospital",
      description: "The first time your opponent captures one of your knights, a new pawn is raised on an empty square of your back rank.",
      tier: 3,
      category: "pieces",
      flavor: "For every rider lost, a recruit patched up and sent forward.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || move.captured !== "n") return;
        const r = api.me === "w" ? 0 : 7;
        const spot = Array.from({ length: 8 }, (_, f) => SQ(f, r)).find(
          (sq) => !api.board.pieces[sq],
        );
        if (spot != null) api.place(spot, "p", api.me);
        inst.spent = true;
      },
      status: () => "triage standing by",
    },
  ),

  // -------------------------------------------------------------------------
  // CHARGES & BOMBARDMENT: break the enemy line.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_bayonet_charge",
      name: "Bayonet Charge",
      description: "One of your bishops charges diagonally, capturing the first enemy piece in its path and landing just beyond, once.",
      tier: 4,
      category: "attack",
      flavor: "Fix bayonets and do not stop.",
    },
    lineSweep("b", DIAG_DIRS, 1),
  ),
  card(
    {
      id: "ww_spearhead",
      name: "Spearhead",
      description: "One of your rooks drives in a straight line, capturing up to two enemy pieces in its path and stopping, once.",
      tier: 5,
      category: "attack",
      flavor: "Punch a hole and widen it.",
    },
    lineSweep("r", ORTHO_DIRS, 2),
  ),
  card(
    {
      id: "ww_armored_breakthrough",
      name: "Armored Breakthrough",
      description: "One of your queens rolls in a straight line, capturing up to two enemy pieces in its path and stopping, once.",
      tier: 6,
      category: "attack",
      flavor: "Nothing in this lane survives the advance.",
    },
    lineSweep("q", ALL_DIRS, 2),
  ),
  card(
    {
      id: "ww_bombardment",
      name: "Bombardment",
      description: "Remove two enemy pawns you name from the board, once.",
      tier: 4,
      category: "attack",
      flavor: "Soften the trenches before the push.",
    },
    removeEnemies(2, ["p"]),
  ),
  card(
    {
      id: "ww_counter_battery",
      name: "Counter Battery Fire",
      description: "Remove one enemy rook or bishop you name from the board, once.",
      tier: 5,
      category: "attack",
      flavor: "Silence their guns first.",
    },
    removeEnemies(1, ["r", "b"]),
  ),
  card(
    {
      id: "ww_demolition_charge",
      name: "Demolition Charge",
      description: "Rig one of your pieces with charges: for the game, whenever it captures an enemy piece the squares around the capture are cleared of enemy pieces. Kings are never caught in the blast.",
      tier: 5,
      category: "attack",
      flavor: "It goes off exactly where you point it.",
    },
    bindPiece("Choose the piece to rig with charges", bindCandidates(), {
      explodeOnCapture: true,
    }),
  ),

  // -------------------------------------------------------------------------
  // VETERAN UPGRADES: one piece is trained into something more (for the game).
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_dragoons",
      name: "Dragoons",
      description: "One of your knights may also step one square in any direction like a king, for the game.",
      tier: 3,
      category: "movement",
      flavor: "Ride to the fight, dismount to win it.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    pieceBound("n", "Choose the knight to train as dragoons", (board, sq, via) =>
      slideMoves(board, sq, ALL_DIRS, via, 1),
    ),
  ),
  card(
    {
      id: "ww_pikemen",
      name: "Pikemen",
      description: "One of your pawns may also move and capture one square sideways, for the game.",
      tier: 3,
      category: "movement",
      flavor: "The hedge of pikes points every way at once.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    pieceBound("p", "Choose the pawn to arm with a pike", (board, sq, via) =>
      slideMoves(board, sq, [[1, 0], [-1, 0]], via, 1),
    ),
  ),
  card(
    {
      id: "ww_war_wagon",
      name: "War Wagon",
      description: "One of your bishops may also move up to two squares straight in any direction, for the game.",
      tier: 3,
      category: "movement",
      flavor: "A rolling fort with a blade on top.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "r", self: true },
    },
    pieceBound("b", "Choose the bishop to mount on a war wagon", (board, sq, via) =>
      slideMoves(board, sq, ORTHO_DIRS, via, 2),
    ),
  ),
  card(
    {
      id: "ww_command_tent",
      name: "Command Tent",
      description: "Your king may also move like a knight, for the game.",
      tier: 4,
      category: "movement",
      flavor: "The general is never quite where they left him.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "n", self: true },
    },
    pieceBound("k", "Confirm your king takes command", (board, sq, via) =>
      leapMoves(board, sq, KNIGHT_LEAPS, via),
    ),
  ),
  card(
    {
      id: "ww_phalanx_advance",
      name: "Phalanx Advance",
      description: "One of your rooks may pass through up to two of your own pieces on its move, for the game.",
      tier: 4,
      category: "movement",
      flavor: "Shields locked, the whole line moves together.",
      fx: { motif: "empower", pieces: ["r"], self: true },
    },
    pieceBound("r", "Choose the rook to anchor the phalanx", (board, sq, via) =>
      phasingSlideMoves(board, sq, ORTHO_DIRS, via, 2),
    ),
  ),

  // -------------------------------------------------------------------------
  // ARMY-WIDE DRILLS: grants across a whole piece type.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_flanking_knights",
      name: "Flanking Knights",
      description: "Both of your knights may also step one square in any direction like a king, for the game.",
      tier: 4,
      category: "movement",
      flavor: "Hit them from two sides at once.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "ww_field_fortification",
      name: "Field Fortification",
      description: "Your pawns may also capture the enemy piece directly ahead of them, for the game.",
      tier: 5,
      category: "movement",
      flavor: "Dug in and biting back.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    permanentAugment((_m, inst, api) => forwardCaptureGen(inst, api)),
  ),
  card(
    {
      id: "ww_flank_march",
      name: "Flank March",
      description: "For your next 3 turns, each of your bishops may also step one square straight in any direction.",
      tier: 3,
      category: "movement",
      flavor: "Off the diagonal and around the wing.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "k", self: true },
    },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "b").flatMap((sq) =>
        slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "ww_pontoon_bridge",
      name: "Pontoon Bridge",
      description: "One of your rooks, bishops, or queens may pass through up to two of your own pieces on its move, once.",
      tier: 3,
      category: "movement",
      flavor: "Lay the planks, cross your own crowd.",
      fx: { motif: "empower", pieces: ["r", "b", "q"], self: true },
    },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me)) {
        const t = api.board.pieces[sq]!.type;
        const dirs = t === "r" ? ORTHO_DIRS : t === "b" ? DIAG_DIRS : t === "q" ? ALL_DIRS : null;
        if (dirs) out.push(...phasingSlideMoves(api.board, sq, dirs, inst.id, 2));
      }
      return out;
    }),
  ),

  // -------------------------------------------------------------------------
  // MANEUVER: reposition your own line, shove the enemy's.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_regroup_lines",
      name: "Regroup the Lines",
      description: "Return any one of your pieces to an empty square on your back rank, once.",
      tier: 3,
      category: "movement",
      flavor: "Fall back, re-form, hold.",
    },
    {
      kind: "activated",
      spendOnUse: true,
      targets: (_inst, api, picks) => {
        const dests = (from: Square) =>
          backRankDest(api, from).filter((sq) => !api.board.pieces[sq]);
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to pull back",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && dests(sq).length > 0,
            ),
          };
        }
        if (picks.length === 1 && picks[0].square != null) {
          return { kind: "square", label: "Choose the back-rank square", squares: dests(picks[0].square) };
        }
        return null;
      },
      effect: (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from != null && to != null && api.board.pieces[from] && !api.board.pieces[to]) {
          api.relocate(from, to);
        }
      },
    },
  ),
  card(
    {
      id: "ww_forced_retreat",
      name: "Forced Retreat",
      description: "Push one enemy piece one square directly away from your king, if that square is empty, once. Kings cannot be pushed.",
      tier: 3,
      category: "tempo",
      flavor: "Give ground, general's orders.",
    },
    (() => {
      const destOf = (api: BuffApi, sq: Square): Square | null => {
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null) return null;
        const df = Math.sign(FILE(sq) - FILE(k)), dr = Math.sign(RANK(sq) - RANK(k));
        if (df === 0 && dr === 0) return null;
        const f = FILE(sq) + df, r = RANK(sq) + dr;
        if (!inBoard(f, r)) return null;
        const to = SQ(f, r);
        return api.board.pieces[to] ? null : to;
      };
      return activated(
        (_inst, api, picks) =>
          picks.length > 0
            ? null
            : {
                kind: "square",
                label: "Choose the enemy piece to push back",
                squares: mySquares(api.board, api.opp).filter(
                  (sq) => api.board.pieces[sq]!.type !== "k" && destOf(api, sq) != null,
                ),
              },
        (_inst, api, picks) => {
          const from = picks[0]?.square;
          if (from == null) return;
          const to = destOf(api, from);
          if (to != null) api.relocate(from, to);
        },
      );
    })(),
  ),

  // -------------------------------------------------------------------------
  // FORTIFICATIONS & DEFENSE: shields, walls, bodyguards.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_form_square",
      name: "Form Square",
      description: "Pick any square: your pieces standing on it or any of the up-to-eight squares around it, your king aside, cannot be captured for your opponent's next 2 turns.",
      tier: 5,
      category: "protection",
      flavor: "Backs together, blades out.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the center of the square formation",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const squares: Square[] = [c];
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (inBoard(f, r)) squares.push(SQ(f, r));
        }
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "ww_dug_in_defense",
      name: "Dug-In Defense",
      description: "None of your pieces can be captured for your opponent's next 1 turn.",
      tier: 5,
      category: "protection",
      flavor: "One turn to weather anything.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    shieldArmy(1),
  ),
  card(
    {
      id: "ww_iron_bulwark",
      name: "Iron Bulwark",
      description: "Choose one of your pieces, your king aside: it cannot be captured for the rest of the game.",
      tier: 6,
      category: "protection",
      flavor: "Some walls simply do not fall.",
      fx: { motif: "ward", self: true },
    },
    bindPiece("Choose the piece to make a bulwark", bindCandidates(), {
      filterOpp: (moves, sq) => moves.filter((m) => captureSquare(m) !== sq),
    }),
  ),
  card(
    {
      id: "ww_praetorian_guard",
      name: "Praetorian Guard",
      description: "Choose one of your pieces: for your next 4 turns it cannot be captured and may also step one square in any direction like a king.",
      tier: 5,
      category: "protection",
      flavor: "Sworn to the last, and quick about it.",
      fx: { motif: "ward", moveAs: "k", self: true },
    },
    bindPiece("Choose the piece the guard protects", bindCandidates(), {
      turns: 4,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via, 1),
      filterOpp: (moves, sq) => moves.filter((m) => captureSquare(m) !== sq),
    }),
  ),
  card(
    {
      id: "ww_high_ground",
      name: "High Ground",
      description: "Choose one of your pieces: for the game it cannot be captured while it stands in your opponent's half.",
      tier: 4,
      category: "protection",
      flavor: "They have to climb to reach you, and they will not.",
      fx: { motif: "ward", self: true },
    },
    bindPiece("Choose the piece that takes the high ground", bindCandidates(), {
      filterOpp: (moves, sq, api) =>
        inHalf(api.opp, sq) ? moves.filter((m) => captureSquare(m) !== sq) : moves,
    }),
  ),

  // -------------------------------------------------------------------------
  // SIEGE & SEALED GROUND: deny the enemy the map.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_double_trench",
      name: "Double Trench",
      description: "Pick two files: your opponent cannot move onto either file for their next 2 turns.",
      tier: 6,
      category: "protection",
      flavor: "Two lines of wire, no way across.",
      fx: { motif: "blindfold" },
    },
    barLine("file", 2, 2),
  ),
  card(
    {
      id: "ww_claymore_line",
      name: "Claymore Line",
      description: "Mark two empty squares: the first enemy piece to step onto either one, a king aside, is destroyed. The mines stay armed for the game.",
      tier: 5,
      category: "protection",
      flavor: "Front toward enemy.",
      fx: { motif: "blindfold" },
    },
    voidSquares(2, null),
  ),

  // -------------------------------------------------------------------------
  // AMBUSH & SUPPRESSION: freeze, convert, retaliate.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_suppressive_fire",
      name: "Suppressive Fire",
      description: "Every one of your opponent's knights is pinned down and cannot move for their next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "Keep their heads down.",
      fx: { motif: "jail", pieces: ["n"] },
    },
    freezeTypedAll(["n"], 2),
  ),
  card(
    {
      id: "ww_pincer_movement",
      name: "Pincer Movement",
      description: "Freeze two enemy pieces you choose for their next 2 turns each. Kings cannot be targeted.",
      tier: 5,
      category: "tempo",
      flavor: "Close both jaws at the same time.",
      fx: { motif: "jail" },
    },
    freezeMany(2, 2, "Choose an enemy piece to trap in the pincer"),
  ),
  card(
    {
      id: "ww_counter_charge",
      name: "Counter Charge",
      description: "The first time your opponent captures one of your pieces, the capturing piece is frozen in place for its next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "Take one of ours and you stop where you stand.",
      fx: { motif: "jail" },
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        const at = move.to;
        const p = api.board.pieces[at];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq: at, owner: api.opp, turns: 2 });
        }
        inst.spent = true;
      },
      status: () => "braced for their attack",
    },
  ),
  card(
    {
      id: "ww_defectors",
      name: "Defectors",
      description: "Turn one enemy pawn or knight to your side for the rest of the game, once. Kings cannot be swayed.",
      tier: 4,
      category: "pieces",
      flavor: "Better pay, warmer tent.",
    },
    convertEnemies(1, ["p", "n"], "Choose the enemy piece to win over"),
  ),
  card(
    {
      id: "ww_mass_defection",
      name: "Mass Defection",
      description: "Turn two enemy pawns to your side for the rest of the game, once.",
      tier: 5,
      category: "pieces",
      flavor: "Word spreads down the whole trench.",
    },
    convertEnemies(2, ["p"], "Choose an enemy pawn to win over"),
  ),
  card(
    {
      id: "ww_relentless_assault",
      name: "Relentless Assault",
      description: "Each of your next two capturing moves immediately grants you an extra move. You cannot capture the king on a bonus move: your opponent replies first.",
      tier: 5,
      category: "tempo",
      flavor: "Do not let them set their feet.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        const left = ((inst.state.charges as number) ?? 0) - 1;
        inst.state.charges = left;
        api.bs.extraMoves[api.me] += 1;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} follow-up assaults left`,
    },
  ),
];
