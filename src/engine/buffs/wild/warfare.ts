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
  pawnRankOk,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  addEffect,
  addNovel,
  augment,
  bindCandidates,
  bindPiece,
  captureSquare,
  emptySquares,
  explodeAt,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  markRevived,
  mySquares,
  permanentAugment,
  phasingSlideMoves,
  pieceBound,
  placePieces,
  relRank,
  removeEnemies,
  revivable,
  reviveOne,
  shieldArmy,
  slideMoves,
  timedAugment,
  trackBoundPiece,
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
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
  /** Piece types the caster must own on the board for this card to be offered
   * (dead-draft guard). Omit for cards that work regardless of your pieces. */
  requires?: PieceType[];
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

/** lineSweep, but the squares the ray CLEARS stay barred to the opponent for
 * `barTurns` of their turns: a breakthrough that holds the lane. Same ray rules
 * as helpers.lineSweep (friendly pieces and kings block it). */
function sweepThenBar(
  type: PieceType,
  dirs: readonly (readonly [number, number])[],
  maxCaptures: number | null,
  barTurns: number,
): Mech {
  const dests = (api: BuffApi, from: Square): Square[] => {
    const out: Square[] = [];
    for (const [df, dr] of dirs) {
      let f = FILE(from) + df, r = RANK(from) + dr, swept = 0;
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (!p) {
          if (swept > 0) out.push(sq);
        } else {
          if (p.color === api.me || p.type === "k") break;
          swept++;
          if (maxCaptures != null && swept > maxCaptures) break;
          out.push(sq);
        }
        f += df; r += dr;
      }
    }
    return out;
  };
  return activated(
    (_inst, api, picks) => {
      if (picks.length >= 2) return null;
      if (picks.length === 0) {
        return {
          kind: "square",
          label: "Choose the attacking rook",
          squares: mySquares(api.board, api.me, type).filter((sq) => dests(api, sq).length > 0),
        };
      }
      return { kind: "square", label: "Choose where the drive ends", squares: dests(api, picks[0].square!) };
    },
    (_inst, api, picks) => {
      const from = picks[0]?.square, to = picks[1]?.square;
      if (from == null || to == null || from === to) return;
      const df = Math.sign(FILE(to) - FILE(from)), dr = Math.sign(RANK(to) - RANK(from));
      let f = FILE(from) + df, r = RANK(from) + dr;
      const cleared: Square[] = [];
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          api.removePiece(sq);
          cleared.push(sq);
        }
        if (sq === to) break;
        f += df; r += dr;
      }
      if (!api.board.pieces[to]) api.relocate(from, to);
      // Bar the squares the drive punched through (the rook's own landing is
      // occupied, so barring it would be a no-op; drop it from the trail).
      const trail = cleared.filter((sq) => sq !== to);
      if (trail.length) {
        addEffect(api, { kind: "barred", squares: trail, against: api.opp, turns: barTurns });
      }
    },
  );
}

/** Like voidSquares, but the first enemy piece (never a king) to step onto a
 * mine is destroyed ALONG WITH every enemy piece on the squares around it (a
 * claymore blast; kings and shielded pieces survive). Mines stay armed for the
 * game. */
function claymoreSquares(count: number): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) =>
      picks.length >= count || inst.state.squares != null
        ? null
        : {
            kind: "square",
            label:
              count > 1 ? `Choose a mine square (${picks.length + 1}/${count})` : "Choose the mine square",
            squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
          },
    effect: (inst, _api, picks) => {
      if (inst.state.squares != null) return;
      inst.state.squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
    },
    onMovePlayed: (inst, move, api) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return;
      if (move.color === api.opp && squares.includes(move.to) && move.piece !== "k") {
        explodeAt(api, move.to);
        api.removePiece(move.to);
      }
    },
    status: (inst) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return "activate to place";
      const names = squares.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
      return `mines armed at ${names}`;
    },
  };
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
      description: "Return one of your captured rooks to an empty square on your back rank. For the rest of the game the refitted rook may pass through one friendly piece on each move.",
      tier: 4,
      category: "pieces",
      flavor: "Back into service, and it phases through its own ranks now.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (picks.length > 0 || inst.state.sq != null) return null;
        if (revivable(api, "r") <= 0) return { kind: "square", label: "No rook to recommission", squares: [] };
        return { kind: "square", label: "Choose where the rook returns", squares: emptySquares(api.board, backRankZone(api)) };
      },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null || revivable(api, "r") <= 0 || api.board.pieces[sq]) return;
        api.place(sq, "r", api.me);
        markRevived(api, "r");
        inst.state.sq = sq;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "r") return;
        addNovel(moves, phasingSlideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1));
      },
      onMovePlayed: (inst, move) => trackBoundPiece(inst, move),
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to recommission a rook"
          : `refitted rook at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    {
      id: "ww_outriders",
      name: "Outriders",
      description: "Place a new knight on any empty square in your half, then advance one of your pawns one square.",
      tier: 3,
      category: "pieces",
      flavor: "Cavalry ahead, infantry a step behind.",
    },
    {
      kind: "activated",
      spendOnUse: true,
      targets: (_inst, api, picks) => {
        if (picks.length === 0) {
          return { kind: "square", label: "Place your new knight", squares: emptySquares(api.board, myHalfZone(api)) };
        }
        if (picks.length === 1) {
          const fwd = api.me === "w" ? 8 : -8;
          const advancers = mySquares(api.board, api.me, "p").filter((sq) => {
            const to = sq + fwd;
            return to >= 0 && to < 64 && !api.board.pieces[to] && pawnRankOk(to) && to !== picks[0].square;
          });
          if (advancers.length === 0) return null;
          return { kind: "square", label: "Advance one of your pawns one square", squares: advancers, finishable: true };
        }
        return null;
      },
      effect: (_inst, api, picks) => {
        const knightSq = picks[0]?.square;
        if (knightSq != null && !api.board.pieces[knightSq]) api.place(knightSq, "n", api.me);
        const pawnSq = picks[1]?.square;
        if (
          pawnSq != null &&
          api.board.pieces[pawnSq]?.type === "p" &&
          api.board.pieces[pawnSq]?.color === api.me
        ) {
          const fwd = api.me === "w" ? 8 : -8;
          const to = pawnSq + fwd;
          if (to >= 0 && to < 64 && !api.board.pieces[to] && pawnRankOk(to)) api.relocate(pawnSq, to);
        }
      },
    },
  ),
  card(
    {
      id: "ww_sapper_team",
      name: "Sapper Team",
      description: "A bishop reports to your pocket, then spend a later turn to drop it onto any empty square.",
      tier: 3,
      category: "pieces",
      flavor: "They dig the tunnels no one else will.",
    },
    instant((_inst, api) => grantInventory(api, "b", 1)),
  ),
  card(
    {
      id: "ww_muster_the_ranks",
      name: "Muster the Ranks",
      description: "A knight and two pawns muster into your pocket, then drop them onto empty squares on later turns.",
      tier: 5,
      category: "pieces",
      flavor: "The muster roll fills out fast.",
    },
    instant((_inst, api) => {
      grantInventory(api, "n", 1);
      grantInventory(api, "p", 2);
    }),
  ),
  card(
    {
      id: "ww_combined_arms",
      name: "Combined Arms",
      description: "A rook and a knight report to your pocket, then drop them onto empty squares on later turns.",
      tier: 6,
      category: "pieces",
      flavor: "Armor and cavalry, moving as one.",
    },
    instant((_inst, api) => {
      grantInventory(api, "r", 1);
      grantInventory(api, "n", 1);
    }),
  ),
  card(
    {
      id: "ww_shieldbearers",
      name: "Shieldbearers",
      description: "Two pawns fall in to your pocket, then drop them onto empty squares on later turns.",
      tier: 4,
      category: "pieces",
      flavor: "Close ranks around the crown.",
    },
    instant((_inst, api) => grantInventory(api, "p", 2)),
  ),
  card(
    {
      id: "ww_paratroopers",
      icon: "Send",
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
      icon: "Cross",
      name: "Field Hospital",
      description: "The first time your opponent captures one of your knights, a new pawn is raised on an empty square of your back rank.",
      tier: 2,
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
      requires: ["b"],
      flavor: "Fix bayonets and do not stop.",
    },
    lineSweep("b", DIAG_DIRS, 1),
  ),
  card(
    {
      id: "ww_spearhead",
      name: "Spearhead",
      description: "One of your rooks drives in a straight line, capturing up to two enemy pieces in its path and stopping. The squares it punches through stay barred to your opponent for their next 2 turns.",
      tier: 5,
      category: "attack",
      requires: ["r"],
      flavor: "Punch a hole and hold it open.",
      fx: { motif: "blindfold" },
    },
    sweepThenBar("r", ORTHO_DIRS, 2, 2),
  ),
  card(
    {
      id: "ww_armored_breakthrough",
      name: "Armored Breakthrough",
      description: "One of your queens rolls in a straight line, capturing up to two enemy pieces in its path and stopping, once.",
      tier: 6,
      category: "attack",
      requires: ["q"],
      flavor: "Nothing in this lane survives the advance.",
    },
    lineSweep("q", ALL_DIRS, 2),
  ),
  card(
    {
      id: "ww_bombardment",
      icon: "Crosshair",
      name: "Bombardment",
      description: "Remove two enemy pawns you name from the board, once.",
      tier: 3,
      category: "attack",
      flavor: "Soften the trenches before the push.",
    },
    removeEnemies(2, ["p"]),
  ),
  card(
    {
      id: "ww_counter_battery",
      icon: "Target",
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
      requires: ["n"],
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
      tier: 2,
      category: "movement",
      requires: ["p"],
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
      requires: ["b"],
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
      icon: "Tent",
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
      tier: 3,
      category: "movement",
      requires: ["r"],
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
      requires: ["n"],
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
      tier: 4,
      category: "movement",
      requires: ["p"],
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
      requires: ["b"],
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
      requires: ["r", "b", "q"],
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
      tier: 2,
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
              (sq) =>
                api.board.pieces[sq]!.type !== "k" &&
                api.board.pieces[sq]!.type !== "p" &&
                dests(sq).length > 0,
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
        if (api.board.pieces[to]) return null;
        // Never push an enemy pawn onto a rank a pawn may not stand on.
        if (api.board.pieces[sq]?.type === "p" && !pawnRankOk(to)) return null;
        return to;
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
      tier: 7,
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
      description: "Choose one of your pieces, your king aside: while it stands in your half it cannot be captured, and enemy pieces standing next to it cannot capture at all.",
      tier: 6,
      category: "protection",
      flavor: "Hold your own ground and nobody gets a swing in.",
      fx: { motif: "ward", self: true },
    },
    bindPiece("Choose the piece to make a bulwark", bindCandidates(), {
      filterOpp: (moves, sq, api) => {
        if (!inHalf(api.me, sq)) return moves;
        const kept = moves.filter((m) => {
          if (captureSquare(m) === sq) return false;
          if (m.captured) {
            const d = Math.max(Math.abs(FILE(m.from) - FILE(sq)), Math.abs(RANK(m.from) - RANK(sq)));
            if (d === 1) return false;
          }
          return true;
        });
        return kept.length > 0 ? kept : moves;
      },
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
      description: "Pick two files: your opponent cannot move onto either file for their next 2 turns, and any enemy piece standing on those files cannot capture in that time.",
      tier: 6,
      category: "protection",
      flavor: "Two lines of wire, and the guns behind them jam.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.files != null
          ? null
          : {
              kind: "square",
              label: `Pick any square on a file to trench (${picks.length + 1}/2)`,
              squares: Array.from({ length: 64 }, (_, i) => i).filter(
                (sq) => !picks.some((k) => k.square != null && FILE(k.square) === FILE(sq)),
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.files != null) return;
        const files = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null)
          .map((sq) => FILE(sq));
        inst.state.files = files;
        inst.state.turns = 2;
        for (const file of files) {
          const squares: Square[] = [];
          for (let r = 0; r < 8; r++) squares.push(SQ(file, r));
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
        }
      },
      filterOpponentMoves: (moves, inst) => {
        const files = inst.state.files as number[] | undefined;
        if (!files?.length || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter((m) => !(m.captured && files.includes(FILE(m.from))));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.files == null || move.color !== api.opp) return;
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.files == null
          ? "activate to dig the trenches"
          : `trenches hold, ${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "ww_claymore_line",
      name: "Claymore Line",
      description: "Mark two empty squares: the first enemy piece to step onto either one, a king aside, is destroyed along with every enemy piece on the squares around it. The mines stay armed for the game.",
      tier: 5,
      category: "protection",
      flavor: "Front toward enemy.",
      fx: { motif: "blindfold" },
    },
    claymoreSquares(2),
  ),

  // -------------------------------------------------------------------------
  // AMBUSH & SUPPRESSION: freeze, convert, retaliate.
  // -------------------------------------------------------------------------
  card(
    {
      id: "ww_suppressive_fire",
      name: "Suppressive Fire",
      description: "Every one of your opponent's knights is pinned down for their next 2 turns, and so is every enemy pawn standing directly beside one.",
      tier: 4,
      category: "tempo",
      flavor: "Keep their heads down, and their diggers too.",
      fx: { motif: "jail", pieces: ["n", "p"] },
    },
    instant((_inst, api) => {
      const knights = mySquares(api.board, api.opp, "n");
      const frozen = new Set<Square>();
      for (const sq of knights) {
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        frozen.add(sq);
      }
      for (const ksq of knights) {
        for (const [df, dr] of ORTHO_DIRS) {
          const f = FILE(ksq) + df, r = RANK(ksq) + dr;
          if (!inBoard(f, r)) continue;
          const asq = SQ(f, r);
          const p = api.board.pieces[asq];
          if (p && p.color === api.opp && p.type === "p" && !frozen.has(asq)) {
            addEffect(api, { kind: "freeze", sq: asq, owner: api.opp, turns: 2 });
            frozen.add(asq);
          }
        }
      }
    }),
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
          addEffect(api, { kind: "freeze", sq: at, owner: api.opp, turns: 3 });
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
      tier: 4,
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
