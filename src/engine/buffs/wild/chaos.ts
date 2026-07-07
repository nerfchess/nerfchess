// Wild set: CHAOS & JOKE buffs. Slapstick stuns, curses with a punchline, silly
// creature summons, and Faustian trade-offs that cost you something real. Every
// card is built ENTIRELY from primitives that already ship in the engine
// (helpers.ts) or an existing board-effect kind (freeze / walnut / barred /
// short_leash / king_only / king_safe), plus the BuffApi board methods
// (place / removePiece / relocate / setPieceType) that the warfare and funny
// sets already compose by hand.
//
// This is a single self-contained file: it imports the shared primitives
// straight from ../helpers and, like fantasy/shared.ts and the sibling wild
// files, keeps LOCAL copies of the handful of composite helpers that live in a
// sibling shared.ts elsewhere (curse, freezeTargetTyped, petrifyTarget,
// walnutAll, freezeTypedAll, freezeMany, summonTemp, convertEnemies) so it needs
// no barrel of its own. Safety rails come from the wrapped helpers: kings are
// never frozen, petrified, converted, or removed, every opponent-move filter
// keeps a non-empty fallback (via `curse`), and every movement grant only ever
// widens a move list, so nothing here can soft-lock a turn.

import { Buff, BuffApi, BuffInstance, BuffCategory, CardFx, FreezeSkin } from "../../buff";
import { Tier } from "../../nerf";
import { FILE, inBoard, Move, PieceType, RANK, SQ, Square } from "../../types";
import {
  ALL_DIRS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  augment,
  captureExplosion,
  emptySquares,
  inHalf,
  instant,
  lineSweep,
  mySquares,
  pawnRankOk,
  placePieces,
  relRank,
  reviveOne,
  slideMoves,
  timedAugment,
  timedOppFilter,
  voidSquares,
} from "../helpers";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type ChaosMeta = {
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

/** Build a fully implemented card from metadata + mechanics. Mirrors the `def`
 * factory in library.ts and the `card` factories in funny/, fantasy/, and the
 * sibling wild files. */
function card(meta: ChaosMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// --- Destination zones -------------------------------------------------------
const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
const oppHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.opp, sq);

// Chebyshev (king-step) distance, reused by the range / adjacency curses.
const dist = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

// --- Local composite helpers (copies of the sibling shared.ts surfaces) ------

/** Opponent-move filter with the non-empty safety guarantee: the filter is
 * always partial, so it can never strand the opponent with zero moves. */
function curse(
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return timedOppFilter(turns, (moves, _inst, api) => {
    if (moves.length === 0) return moves;
    const kept = filter(moves, api);
    return kept.length > 0 ? kept : moves;
  });
}

/** Activated: freeze one targeted enemy piece of the given types for `turns` of
 * their turns. Kings are never eligible. */
function freezeTargetTyped(turns: number, types: PieceType[], label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && types.includes(t);
            }),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, { kind: "freeze", sq: picks[0].square, owner: api.opp, turns });
      }
    },
  );
}

/** Activated: one targeted enemy piece (never a king), optionally restricted to
 * `types`, is petrified (walnut: it cannot move at all) for `turns` of their
 * turns. */
function petrifyTarget(turns: number, label: string, types?: PieceType[]): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && (!types || types.includes(t));
            }),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, { kind: "walnut", sq: picks[0].square, owner: api.opp, turns });
      }
    },
  );
}

/** Instant: every enemy piece of the given types turns to stone (walnut: it
 * cannot move) for `turns` of their turns. Kings are never petrified. */
function walnutAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
    }
  });
}

/** Instant: freeze every enemy piece of the given types for `turns` of their
 * turns. Kings are never frozen. */
function freezeTypedAll(types: PieceType[], turns: number, skin?: FreezeSkin): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "freeze", sq, owner: api.opp, turns, ...(skin ? { skin } : {}) });
    }
  });
}

/** Activated: freeze up to `count` targeted enemy non-king pieces, each for
 * `turns` of their turns. */
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

/** A temporary summon: place a fresh piece, then remove it again after `turns`
 * of the owner's own turns. Copied from the sibling wild files (which model it
 * on voidSquares): it ticks its own timer, follows the piece, and retires it via
 * an uncounted removePiece so nothing enters the revive pool. Non-pawns only,
 * so there is never a promotion edge to track. */
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
            label: "Choose where your critter appears",
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
        : `critter wanders off in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

/** Activated: convert `count` enemy pieces of the given types to your color.
 * A local copy of library.ts's convertEnemies; kings are never eligible. */
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

// --- Move generators for the movement-grant cards ----------------------------

/** Each of my pawns may step one square straight backward onto an empty square
 * (never onto rank 1 / rank 8). Used by Moonwalk. */
function pawnBackstepGen(_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] {
  const out: Move[] = [];
  const back = api.me === "w" ? -8 : 8;
  for (const from of mySquares(api.board, api.me, "p")) {
    const to = from + back;
    if (to < 0 || to > 63) continue;
    if (api.board.pieces[to]) continue;
    if (!pawnRankOk(to)) continue;
    out.push({ from, to, piece: "p", color: api.me, via: inst.id });
  }
  return out;
}

/** Each of my knights may also step one square in any direction (king-step).
 * Used once by Kangaroo Hop. */
function knightHopGen(_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] {
  return mySquares(api.board, api.me, "n").flatMap((sq) =>
    slideMoves(api.board, sq, ALL_DIRS, inst.id, 1),
  );
}

// ---------------------------------------------------------------------------

export const WILD_CHAOS: Buff[] = [
  // =========================================================================
  // SLAPSTICK STUNS: freeze and petrify, with a straight face.
  // =========================================================================
  card(
    {
      id: "wc_slip_on_ice",
      name: "Slip on Ice",
      description: "Freeze one of your opponent's rooks in place for their next 2 turns.",
      tier: 3,
      category: "tempo",
      flavor: "Legs out from under it, dignity gone.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    freezeTargetTyped(2, ["r"], "Choose an enemy rook to send skidding"),
  ),
  card(
    {
      id: "wc_tar_pit",
      name: "Tar Pit",
      description: "Every one of your opponent's bishops is stuck fast and cannot move for their next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "The diagonals go nowhere today.",
      fx: { motif: "jail", pieces: ["b"] },
    },
    freezeTypedAll(["b"], 2, "tar"),
  ),
  card(
    {
      id: "wc_concrete_shoes",
      name: "Concrete Shoes",
      description: "Fit one of your opponent's rooks or queens with concrete shoes: it cannot move at all for their next 3 turns, then it hardens into a walnut that can only shuffle one square at a time for the rest of the game. Kings cannot be targeted.",
      tier: 5,
      category: "tempo",
      flavor: "It is not going for a swim, it is going to stand here. Forever.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to set in concrete",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "q";
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "cement" });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) { inst.spent = true; inst.state.sq = undefined; return; }
        if (move.to === sq && move.from !== sq) { inst.spent = true; inst.state.sq = undefined; return; }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color !== api.opp) return;
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          const cur = inst.state.sq as Square | undefined;
          if (cur != null && api.board.pieces[cur]?.color === api.opp) {
            addEffect(api, { kind: "walnut", sq: cur, owner: api.opp, turns: 999 });
          }
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to set concrete"
          : `setting, ${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "wc_quicksand_patch",
      name: "Quicksand Patch",
      description: "Every one of your opponent's pawns sinks into quicksand and cannot move for their next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "Do not struggle, it only makes it worse.",
      fx: { motif: "jail", pieces: ["p"] },
    },
    walnutAll(["p"], 2),
  ),
  card(
    {
      id: "wc_double_trouble",
      name: "Double Trouble",
      description: "Freeze two of your opponent's pieces you choose for their next 3 turns each. Kings cannot be targeted.",
      tier: 6,
      category: "tempo",
      flavor: "One is bad luck. Two is a bit.",
      fx: { motif: "jail" },
    },
    freezeMany(2, 3, "Choose an enemy piece to freeze"),
  ),

  // =========================================================================
  // CURSES WITH A PUNCHLINE: partial opponent-move filters.
  // =========================================================================
  card(
    {
      id: "wc_stage_fright",
      name: "Stage Fright",
      description: "Your opponent's queen freezes up under the lights: she cannot move on your opponent's next turn.",
      tier: 3,
      category: "hex",
      flavor: "All those eyes, and she just blanks.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    curse(1, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  card(
    {
      id: "wc_sticky_floor",
      name: "Sticky Floor",
      description: "The whole floor is flypaper: every one of your opponent's pieces may move at most one square for their next 2 turns.",
      tier: 6,
      category: "hex",
      flavor: "Peel, step, peel, step.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(2, (moves) => moves.filter((m) => dist(m.from, m.to) <= 1)),
  ),
  card(
    {
      id: "wc_shy_pieces",
      name: "Shy Pieces",
      description: "Your opponent's pieces are too shy to approach the crown: for their next 2 turns none of them may move onto a square touching your king.",
      tier: 4,
      category: "hex",
      flavor: "They will wave from over here, thanks.",
      fx: { motif: "blindfold", pieces: "all" },
    },
    curse(2, (moves, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return moves;
      return moves.filter((m) => dist(m.to, k) > 1);
    }),
  ),
  card(
    {
      id: "wc_butterfingers",
      name: "Butterfingers",
      description: "Your opponent's queen cannot hold onto anything: she may not capture for their next 2 turns.",
      tier: 4,
      category: "hex",
      flavor: "So close, and it squirts right out.",
      fx: { motif: "muzzle", pieces: ["q"] },
    },
    curse(2, (moves) => moves.filter((m) => !(m.piece === "q" && m.captured))),
  ),
  card(
    {
      id: "wc_backseat_driver",
      name: "Backseat Driver",
      description: "Someone will not stop yelling push a pawn: on your opponent's next turn they must move a pawn if any pawn of theirs can legally move.",
      tier: 3,
      category: "hex",
      flavor: "No, the OTHER pawn.",
      fx: { motif: "slow", pieces: ["p"] },
    },
    curse(1, (moves) => moves.filter((m) => m.piece === "p")),
  ),
  card(
    {
      id: "wc_wrong_way",
      name: "Wrong Way",
      description: "Every one of your opponent's pieces has its map upside down: for their next 2 turns none of them may retreat toward their own back rank.",
      tier: 5,
      category: "hex",
      flavor: "Recalculating. Recalculating.",
      fx: { motif: "slow", pieces: "all" },
    },
    curse(2, (moves, api) =>
      moves.filter((m) => relRank(api.opp, m.to) >= relRank(api.opp, m.from)),
    ),
  ),
  card(
    {
      id: "wc_broken_elevator",
      name: "Broken Elevator",
      description: "The lift to your half is out of order: for their next 2 turns your opponent cannot move any piece onto either of your two back ranks.",
      tier: 5,
      category: "hex",
      flavor: "Please use the stairs. There are no stairs.",
      fx: { motif: "blindfold", pieces: "all" },
    },
    curse(2, (moves, api) => {
      const home = (sq: Square) => (api.me === "w" ? RANK(sq) <= 1 : RANK(sq) >= 6);
      return moves.filter((m) => !home(m.to));
    }),
  ),
  card(
    {
      id: "wc_hot_seat",
      name: "Hot Seat",
      description: "The spotlight swings to their king and queen: on your opponent's next turn they may move only their king or their queen.",
      tier: 5,
      category: "tempo",
      flavor: "Two chairs left under the lights, everyone else in the dark.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r"] },
    },
    curse(1, (moves) => moves.filter((m) => m.piece === "k" || m.piece === "q")),
  ),

  // =========================================================================
  // SILLY SUMMONS: rentals, reinforcements, and a stolen recruit.
  // =========================================================================
  card(
    {
      id: "wc_attack_goose",
      name: "Attack Goose",
      description: "An attack goose invades your opponent's half as a knight for 3 of your turns, then honks off.",
      tier: 5,
      category: "pieces",
      flavor: "It has your bread and it has your king.",
    },
    summonTemp("n", 3, oppHalfZone),
  ),
  card(
    {
      id: "wc_repo_rook",
      name: "Repo Rook",
      description: "A repo man's rook rolls up behind enemy lines: place it on an empty square in your opponent's half, and it tows itself away after 3 of your turns.",
      tier: 5,
      category: "pieces",
      flavor: "You missed a payment somewhere.",
    },
    summonTemp("r", 3, oppHalfZone),
  ),
  card(
    {
      id: "wc_clown_car",
      icon: "Car",
      name: "Clown Car",
      description: "Two knights pile out of one tiny car: place both on empty squares in your half, once.",
      tier: 5,
      category: "pieces",
      flavor: "How were they all in there.",
    },
    placePieces(["n", "n"], myHalfZone),
  ),
  card(
    {
      id: "wc_conga_line",
      name: "Conga Line",
      description: "Three pawns conga straight into enemy territory: place them on empty squares in your opponent's half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Da, da, da, da-da-da, HEY.",
    },
    placePieces(["p", "p", "p"], oppHalfZone),
  ),
  card(
    {
      id: "wc_rubber_duck_squad",
      name: "Rubber Duck Squad",
      description: "Two rubber ducks waddle in as bishops: place both on empty squares in your half, once.",
      tier: 5,
      category: "pieces",
      flavor: "Squeak. Squeak.",
    },
    placePieces(["b", "b"], myHalfZone),
  ),
  card(
    {
      id: "wc_lost_and_found",
      name: "Lost and Found",
      description: "Dig through the lost and found: return one of your captured pieces other than the queen to an empty square in your half, once. The heaviest lost piece comes back first.",
      tier: 4,
      category: "pieces",
      flavor: "That has been back there for ages.",
    },
    reviveOne(["r", "b", "n", "p"], myHalfZone),
  ),
  card(
    {
      id: "wc_body_double",
      name: "Body Double",
      description: "Slip one of your opponent's knights or bishops a better offer: it switches to your side for the rest of the game, once. Kings cannot be swayed.",
      tier: 4,
      category: "pieces",
      flavor: "Same face, different jersey.",
    },
    convertEnemies(1, ["n", "b"], "Choose the enemy knight or bishop to poach"),
  ),
  card(
    {
      id: "wc_genie_wish",
      name: "Genie Wish",
      description: "You get one wish and you wished for a queen: place a new queen on any empty square in your half, once.",
      tier: 7,
      category: "pieces",
      flavor: "Should have read the terms.",
    },
    placePieces(["q"], myHalfZone),
  ),

  // =========================================================================
  // TRADE-OFFS: something strong now, a real bill later.
  // =========================================================================
  card(
    {
      id: "wc_deal_with_the_devil",
      name: "Deal with the Devil",
      description: "Sign here: promote one of your pawns to a queen at once, but the devil collects and you skip your next 2 turns.",
      tier: 5,
      category: "pieces",
      requires: ["p"],
      flavor: "The ink is still smoking.",
      fx: { motif: "empower", pieces: ["p"], moveAs: "q", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to crown",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.setPieceType(sq, "q");
        api.bs.skips[api.me] += 2;
      },
    ),
  ),
  card(
    {
      id: "wc_berserk_pawn",
      name: "Berserk Pawn",
      description: "One of your pawns flies into a frenzy: for your next 3 turns it also moves like a queen, then it burns out and is removed from the board.",
      tier: 5,
      category: "movement",
      requires: ["p"],
      flavor: "Glorious, brief.",
      fx: { motif: "empower", pieces: ["p"], moveAs: "q", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to send berserk",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || (inst.state.turns as number) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me) return;
        const have = new Set(moves.map((m) => m.from * 64 + m.to));
        for (const mv of slideMoves(api.board, sq, ALL_DIRS, inst.id)) {
          const key = mv.from * 64 + mv.to;
          if (!have.has(key)) {
            have.add(key);
            moves.push(mv);
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        else if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.color !== api.me) return;
        const left = (inst.state.turns as number) - 1;
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
          ? "activate to send a pawn berserk"
          : `berserk, ${(inst.state.turns as number) ?? 0} of your turns left`,
    },
  ),
  card(
    {
      id: "wc_chaos_reigns",
      name: "Chaos Reigns",
      description: "Fairness goes out the window: take two extra moves right now, but your opponent also takes two extra moves on their next turn.",
      tier: 4,
      category: "tempo",
      flavor: "If everyone breaks the rules, is anyone.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        api.bs.extraMoves[api.opp] += 2;
      }),
      freeAction: true,
    },
  ),
  card(
    {
      id: "wc_juggling_act",
      name: "Juggling Act",
      description: "Keep every plate spinning: take three extra moves right now, then it all comes crashing down and you skip your next 2 turns.",
      tier: 6,
      category: "tempo",
      flavor: "Ta-daaa. Uh oh.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 3;
        api.bs.skips[api.me] += 2;
      }),
      freeAction: true,
    },
  ),
  card(
    {
      id: "wc_clumsy_dash",
      name: "Clumsy Dash",
      description: "Bolt for it and fumble: take one extra move right now, but one of your pawns is dropped and frozen in place for your next 2 turns.",
      tier: 3,
      category: "tempo",
      flavor: "Legs going faster than the brain.",
    },
    instant((_inst, api) => {
      api.bs.extraMoves[api.me] += 1;
      const pawns = mySquares(api.board, api.me, "p");
      if (pawns.length) {
        addEffect(api, {
          kind: "freeze",
          sq: pawns[api.rng.int(pawns.length)],
          owner: api.me,
          turns: 2,
        });
      }
    }),
  ),
  card(
    {
      id: "wc_red_tape",
      name: "Red Tape",
      description: "Bury your opponent in paperwork: they skip their next turn, but the forms catch up with you and you skip the turn after that.",
      tier: 3,
      category: "tempo",
      flavor: "Please take a number.",
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.bs.skips[api.me] += 1;
    }),
  ),
  card(
    {
      id: "wc_pinata",
      icon: "PartyPopper",
      name: "Pinata",
      description: "Swing wildly and hope: one random enemy piece other than the king is knocked off the board, but one of your own pawns bursts in the mess and is lost too.",
      tier: 4,
      category: "attack",
      flavor: "Candy everywhere, mostly regret.",
    },
    instant((_inst, api) => {
      const foes = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      if (foes.length) api.removePiece(foes[api.rng.int(foes.length)]);
      const pawns = mySquares(api.board, api.me, "p");
      if (pawns.length) api.removePiece(pawns[api.rng.int(pawns.length)]);
    }),
  ),
  card(
    {
      id: "wc_sacrificial_bishop",
      name: "Sacrificial Bishop",
      description: "Feed one of your bishops to the volcano to smite one enemy knight or bishop you name: both leave the board, once.",
      tier: 3,
      category: "attack",
      flavor: "The volcano is very grateful.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        if (mySquares(api.board, api.me, "b").length === 0) {
          return { kind: "square", label: "You have no bishop to sacrifice", squares: [] };
        }
        return {
          kind: "square",
          label: "Choose the enemy knight or bishop to smite",
          squares: mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return t === "n" || t === "b";
          }),
        };
      },
      (_inst, api, picks) => {
        const target = picks[0]?.square;
        if (target == null) return;
        const myBishop = mySquares(api.board, api.me, "b")[0];
        if (myBishop == null) return;
        api.removePiece(target);
        api.removePiece(myBishop, { uncounted: true });
      },
    ),
  ),
  card(
    {
      id: "wc_voodoo_doll",
      icon: "Pin",
      name: "Voodoo Doll",
      description: "Stitch a little doll of the enemy army: the first time your opponent captures one of your pieces, a random enemy piece of the very same type is destroyed in sympathy. Kings are never harmed.",
      tier: 5,
      category: "attack",
      flavor: "Ouch. Why did that hurt me.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        const t = move.captured;
        const twins = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type === t,
        );
        if (twins.length) api.removePiece(twins[api.rng.int(twins.length)]);
        inst.spent = true;
      },
      status: () => "the doll is watching",
    },
  ),

  // =========================================================================
  // CHAOS ON THE BOARD: teleports, swaps, traps, and one very big swing.
  // =========================================================================
  card(
    {
      id: "wc_yeet",
      name: "Yeet",
      description: "Wind up and launch one of your own pieces deep into enemy territory: send it to any empty square in your opponent's half, once. Your king stays put.",
      tier: 4,
      category: "movement",
      flavor: "It is going to be fine, probably.",
    },
    activated(
      (_inst, api, picks) => {
        const dests = (from: Square): Square[] => {
          const p = api.board.pieces[from];
          return emptySquares(api.board, oppHalfZone(api)).filter(
            (d) => !p || p.type !== "p" || pawnRankOk(d),
          );
        };
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to launch",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && dests(sq).length > 0,
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose where it crash-lands in your opponent's half",
          squares: dests(picks[0].square!),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from != null && to != null && api.board.pieces[from] && !api.board.pieces[to]) {
          api.relocate(from, to);
        }
      },
    ),
  ),
  card(
    {
      id: "wc_musical_chairs",
      icon: "Armchair",
      name: "Musical Chairs",
      description: "The music stops: swap the squares of one of your pieces and one of your opponent's pieces, once. Neither may be a king.",
      tier: 5,
      category: "movement",
      flavor: "Everyone scramble.",
    },
    (() => {
      const swapTargets = (api: BuffApi, mySq: Square): Square[] => {
        const pa = api.board.pieces[mySq];
        if (!pa) return [];
        return mySquares(api.board, api.opp).filter((sq) => {
          const pb = api.board.pieces[sq]!;
          if (pb.type === "k") return false;
          if (pa.type === "p" && !pawnRankOk(sq)) return false;
          if (pb.type === "p" && !pawnRankOk(mySq)) return false;
          return true;
        });
      };
      return activated(
        (_inst, api, picks) => {
          if (picks.length >= 2) return null;
          if (picks.length === 0) {
            return {
              kind: "square",
              label: "Choose your piece to swap",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && swapTargets(api, sq).length > 0,
              ),
            };
          }
          return {
            kind: "square",
            label: "Choose the enemy piece to trade places with",
            squares: swapTargets(api, picks[0].square!),
          };
        },
        (_inst, api, picks) => {
          const a = picks[0]?.square, b = picks[1]?.square;
          if (a == null || b == null) return;
          const pa = api.board.pieces[a], pb = api.board.pieces[b];
          if (!pa || !pb) return;
          if (pa.type === "p" && !pawnRankOk(b)) return;
          if (pb.type === "p" && !pawnRankOk(a)) return;
          const ta = pa.type, ca = pa.color, tb = pb.type, cb = pb.color;
          api.removePiece(a, { uncounted: true });
          api.removePiece(b, { uncounted: true });
          api.place(b, ta, ca);
          api.place(a, tb, cb);
        },
      );
    })(),
  ),
  card(
    {
      id: "wc_moonwalk",
      name: "Moonwalk",
      description: "Teach your pawns to moonwalk: for your next 3 turns each of your pawns may also step one square straight backward onto an empty square.",
      tier: 3,
      category: "movement",
      requires: ["p"],
      flavor: "Smooth. Wrong direction, but smooth.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    timedAugment(3, pawnBackstepGen),
  ),
  card(
    {
      id: "wc_kangaroo_hop",
      name: "Kangaroo Hop",
      description: "One of your knights takes a little kangaroo hop: it may also step one square in any direction, once.",
      tier: 2,
      category: "movement",
      requires: ["n"],
      flavor: "Boing.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    augment(knightHopGen),
  ),
  card(
    {
      id: "wc_black_hole",
      icon: "Atom",
      name: "Black Hole",
      description: "Open a black hole on one empty square: any enemy piece that steps onto it, never a king, is swallowed off the board. It stays open for the rest of the game.",
      tier: 4,
      category: "attack",
      flavor: "Do not look directly into it.",
      fx: { motif: "blindfold" },
    },
    voidSquares(1, null),
  ),
  card(
    {
      id: "wc_haunted_house",
      name: "Haunted House",
      description: "Two rooms turn haunted: mark two empty squares and any enemy piece that enters one, never a king, vanishes. The haunting lasts 4 of your turns.",
      tier: 5,
      category: "attack",
      flavor: "It was the butler. It is always the butler.",
      fx: { motif: "blindfold" },
    },
    voidSquares(2, 4),
  ),
  card(
    {
      id: "wc_banana_peel_trail",
      icon: "Banana",
      name: "Banana Peel Trail",
      description: "Grease one file with banana peels: pieces may still enter it, but the first enemy piece to do so slips one square back toward its own home rank and is too dazed to move on its next turn.",
      tier: 4,
      category: "tempo",
      flavor: "Whoops. Whoops. Whoops.",
      fx: { motif: "anchor", pieces: "all" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.file != null
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to grease",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.file != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.file = FILE(sq);
      },
      onMovePlayed: (inst, move, api) => {
        const file = inst.state.file as number | undefined;
        if (file == null) return;
        if (move.color !== api.opp || move.piece === "k" || FILE(move.to) !== file) return;
        const p = api.board.pieces[move.to];
        if (!p || p.color !== api.opp) { inst.spent = true; return; }
        // The first enemy onto the greased file slips one rank back toward its
        // own home rank; if there is no room, it is just dazed where it stands.
        const homeDir = api.opp === "w" ? -1 : 1;
        const r = RANK(move.to) + homeDir;
        let land = move.to;
        if (inBoard(FILE(move.to), r)) {
          const back = SQ(FILE(move.to), r);
          if (!api.board.pieces[back] && (p.type !== "p" || pawnRankOk(back))) {
            api.relocate(move.to, back);
            land = back;
          }
        }
        addEffect(api, { kind: "freeze", sq: land, owner: api.opp, turns: 1, skin: "slime" });
        addEffect(api, { kind: "bonk", squares: [land], owner: api.me, turns: 1 });
        inst.spent = true;
      },
      status: (inst) => (inst.state.file == null ? "activate to lay the peels" : "peels laid"),
    },
  ),
  card(
    {
      id: "wc_panic_button",
      name: "Panic Button",
      description: "Slam the big red button: your king cannot be captured on your opponent's next turn, and you take one extra move right now to sort out the mess.",
      tier: 4,
      category: "protection",
      flavor: "That is what it is there for.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
      api.bs.extraMoves[api.me] += 1;
    }),
  ),
  card(
    {
      id: "wc_confetti_cannon",
      name: "Confetti Cannon",
      description: "Your next capture goes off like a confetti cannon: every enemy piece other than a king within two squares of the captured square is blown off the board.",
      tier: 5,
      category: "attack",
      flavor: "Cleanup is going to be a nightmare.",
    },
    captureExplosion({ radius: 2, charges: 1 }),
  ),
  card(
    {
      id: "wc_wrecking_ball",
      icon: "Hammer",
      name: "Wrecking Ball",
      description: "One of your queens swings a wrecking ball down a rank or file, removing every enemy piece in its path, never a king, and stopping at the end, once.",
      tier: 6,
      category: "attack",
      requires: ["q"],
      flavor: "Structural integrity was more of a suggestion.",
    },
    lineSweep("q", ORTHO_DIRS, null),
  ),
];
