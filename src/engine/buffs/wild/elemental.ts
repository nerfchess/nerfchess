// Wild set: ELEMENTAL & NATURE. Fire, ice, storm, earth, tide, and growth
// turned into war. Every card reuses a primitive that already ships in the
// engine (helpers.ts) or an existing board-effect kind (freeze / walnut /
// barred / shield / king_safe / king_only / no_pawn_advance / timed_loss).
//
// This is a single self-contained file: it imports the shared primitives
// straight from ../helpers and, like fantasy/shared.ts, keeps LOCAL copies of
// the handful of composite helpers that live in a sibling `shared.ts` there
// (curse, walnutAll, petrifyTarget, summonTemp, convertEnemies,
// relocateAnywhere, barNeighbors) so it needs no barrel of its own. Safety
// rails come from the wrapped helpers: kings are never frozen, petrified, or
// targeted, and every opponent-move filter keeps a non-empty fallback (via
// `curse`) so no card can ever soft-lock a turn.

import { Buff, BuffApi, BuffInstance, BuffCategory, CardFx } from "../../buff";
import { Tier } from "../../nerf";
import {
  BoardState,
  Color,
  FILE,
  Move,
  PieceType,
  RANK,
  SQ,
  Square,
  inBoard,
} from "../../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  ORTHO_DIRS,
  activated,
  addEffect,
  augment,
  barLine,
  captureExplosion,
  emptySquares,
  explodeAt,
  freezeAllEnemies,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  mySquares,
  pawnRankOk,
  phasingSlideMoves,
  markRevived,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
  shieldZone,
  slideMoves,
  timedAugment,
  timedOppFilter,
  voidSquares,
} from "../helpers";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type WildMeta = {
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
 * factory in library.ts and the `card` factories in funny/ and fantasy/. */
function card(meta: WildMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// --- Destination zones -------------------------------------------------------
const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
const backRankZone = (api: BuffApi) => (sq: Square) =>
  RANK(sq) === (api.me === "w" ? 0 : 7);

// A 3-1 "camel" leap set, reused by Updraft.
const CAMEL_LEAPS = [
  [1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1],
] as const;

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

/** Instant: every enemy piece of the given types turns to stone (walnut: it
 * cannot move at all) for `turns` of their turns. Kings are never petrified. */
function walnutAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
    }
  });
}

/** Activated: one targeted enemy piece (never a king) is petrified for
 * `turns` of their turns. */
function petrifyTarget(turns: number, label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, { kind: "walnut", sq: picks[0].square, owner: api.opp, turns });
      }
    },
  );
}

/** A temporary summon: place a fresh piece, then remove it again after `turns`
 * of the owner's own turns. Copied from fantasy/shared.ts's summonTemp: it
 * ticks its own timer, follows the piece, and retires it via an uncounted
 * removePiece so nothing enters the revive pool. Non-pawns only, so there is
 * never a promotion edge to track. */
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
            label: "Choose where your conjured piece appears",
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
        : `conjured piece fades in ${(inst.state.turns as number) ?? 0} of your turns`,
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

/** Activated: pick one of your non-king pieces, then any empty square, and set
 * it down there (pawns never on rank 1/8). Board mutation only, so it cannot
 * soft-lock. Copied from fantasy/shared.ts's relocateAnywhere. */
function relocateAnywhere(pieceLabel: string, destLabel: string): Mech {
  const dests = (api: BuffApi, from: Square): Square[] =>
    emptySquares(api.board).filter(
      (sq) => api.board.pieces[from]?.type !== "p" || pawnRankOk(sq),
    );
  return activated(
    (_inst, api, picks) => {
      if (picks.length === 0) {
        return {
          kind: "square",
          label: pieceLabel,
          squares: mySquares(api.board, api.me).filter(
            (sq) => api.board.pieces[sq]!.type !== "k" && dests(api, sq).length > 0,
          ),
        };
      }
      if (picks.length === 1 && picks[0].square != null) {
        return { kind: "square", label: destLabel, squares: dests(api, picks[0].square) };
      }
      return null;
    },
    (_inst, api, picks) => {
      const from = picks[0]?.square, to = picks[1]?.square;
      if (from == null || to == null || !api.board.pieces[from] || api.board.pieces[to]) return;
      api.relocate(from, to);
      // The current does not just carry you: it drags the nearest enemy piece
      // (never a king) one square toward where you land. Deterministic: closest
      // by king-distance, lowest square index breaking ties.
      const foes = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      let best: Square | null = null, bestD = Infinity;
      for (const sq of foes) {
        const d = Math.max(Math.abs(FILE(sq) - FILE(to)), Math.abs(RANK(sq) - RANK(to)));
        if (d < bestD || (d === bestD && (best == null || sq < best))) { best = sq; bestD = d; }
      }
      if (best != null) {
        const df = Math.sign(FILE(to) - FILE(best)), dr = Math.sign(RANK(to) - RANK(best));
        const f = FILE(best) + df, r = RANK(best) + dr;
        if (inBoard(f, r)) {
          const drag = SQ(f, r);
          const bp = api.board.pieces[best]!;
          if (!api.board.pieces[drag] && (bp.type !== "p" || pawnRankOk(drag))) {
            api.relocate(best, drag);
          }
        }
      }
    },
  );
}

/** Activated: pick an empty square; the up to 8 squares around it become
 * impassable to the opponent for `turns` of their turns. A partial barred
 * zone (like Kraken), so it can never seal the board into a soft-lock. */
function barNeighbors(barTurns: number, freezeTurns: number, label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : { kind: "square", label, squares: emptySquares(api.board) },
    (_inst, api, picks) => {
      const c = picks[0]?.square;
      if (c == null) return;
      const squares: Square[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(c) + df, r = RANK(c) + dr;
        if (inBoard(f, r)) squares.push(SQ(f, r));
      }
      if (squares.length) {
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: barTurns });
      }
      // The thorns bite: any enemy piece already caught in the ring is snared
      // and cannot move for `freezeTurns` of their turns.
      for (const sq of squares) {
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: freezeTurns, skin: "vines" });
        }
      }
    },
  );
}

// Destination zone for Riptide: the (up to 8) neighbours of a chosen piece.
const stepDest = (_api: BuffApi, from: Square): Square[] =>
  ALL_DIRS.flatMap(([df, dr]) => {
    const f = FILE(from) + df, r = RANK(from) + dr;
    return inBoard(f, r) ? [SQ(f, r)] : [];
  });

// Move generators for the movement-grant cards.
const bishopsPhaseGen = (_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] =>
  mySquares(api.board, api.me, "b").flatMap((sq) =>
    phasingSlideMoves(api.board, sq, DIAG_DIRS, inst.id, 1),
  );
const rooksPhaseGen = (_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] =>
  mySquares(api.board, api.me, "r").flatMap((sq) =>
    phasingSlideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1),
  );
const rookDiagGen = (_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] =>
  mySquares(api.board, api.me, "r").flatMap((sq) =>
    slideMoves(api.board, sq, DIAG_DIRS, inst.id, 2),
  );
const knightCamelGen = (_moves: Move[], inst: BuffInstance, api: BuffApi): Move[] =>
  mySquares(api.board, api.me, "n").flatMap((sq) =>
    leapMoves(api.board, sq, CAMEL_LEAPS, inst.id),
  );

// Chebyshev (king-step) distance, reused by the range / adjacency riders.
const dist = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

/** Empty, pawn-legal squares on the caster's 4th rank, or the nearest rank
 * outward that still has room. Deterministic ring search out from rank 4. */
const fourthRankSquares = (api: BuffApi): Square[] => {
  for (const relr of [4, 5, 3, 6, 2, 7, 1]) {
    const opts = emptySquares(api.board).filter(
      (sq) => relRank(api.me, sq) === relr && pawnRankOk(sq),
    );
    if (opts.length) return opts;
  }
  return [];
};

/** lineSweep, but once the ray clears its up-to-`maxCaptures` victims the arc
 * jumps: the nearest surviving enemy piece to the landing square is frozen for
 * `freezeTurns` of their turns. Same ray rules as helpers.lineSweep (friendly
 * pieces and kings block it). */
function sweepThenFreeze(
  type: PieceType,
  dirs: readonly (readonly [number, number])[],
  maxCaptures: number | null,
  freezeTurns: number,
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
          label: "Choose the attacking piece",
          squares: mySquares(api.board, api.me, type).filter((sq) => dests(api, sq).length > 0),
        };
      }
      return { kind: "square", label: "Choose where the arc ends", squares: dests(api, picks[0].square!) };
    },
    (_inst, api, picks) => {
      const from = picks[0]?.square, to = picks[1]?.square;
      if (from == null || to == null || from === to) return;
      const df = Math.sign(FILE(to) - FILE(from)), dr = Math.sign(RANK(to) - RANK(from));
      let f = FILE(from) + df, r = RANK(from) + dr;
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
        if (sq === to) break;
        f += df; r += dr;
      }
      if (!api.board.pieces[to]) api.relocate(from, to);
      // The bolt jumps to the closest surviving foe (lowest square breaks ties).
      const foes = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      let best: Square | null = null, bestD = Infinity;
      for (const sq of foes) {
        const d = dist(sq, to);
        if (d < bestD || (d === bestD && (best == null || sq < best))) { best = sq; bestD = d; }
      }
      if (best != null) {
        addEffect(api, { kind: "freeze", sq: best, owner: api.opp, turns: freezeTurns, skin: "shock" });
      }
    },
  );
}

/** Non-lethal trap: mark `count` empty squares; any enemy piece except a king
 * that steps onto one is stuck fast (frozen) for `freezeTurns` of its turns
 * instead of being removed. The mud stays for the rest of the game. */
function mireSquares(count: number, freezeTurns: number): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) =>
      picks.length >= count || inst.state.squares != null
        ? null
        : {
            kind: "square",
            label:
              count > 1
                ? `Choose a quagmire square (${picks.length + 1}/${count})`
                : "Choose the quagmire square",
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
        // Fired on the opponent's own move, so the shared post-move tick eats
        // one turn immediately. +1 keeps freezeTurns the number of turns the
        // victim is actually stuck (the description's count); without it the
        // piece is stuck one turn fewer than promised.
        addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: freezeTurns + 1, skin: "quicksand" });
      }
    },
    status: (inst) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return "activate to place";
      const names = squares.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
      return `quagmire at ${names}`;
    },
  };
}

/** A temporary summon whose ARRIVAL also blasts one adjacent enemy pawn off the
 * board (deterministic: lowest square index). Otherwise identical to summonTemp:
 * it follows the piece and retires it after `turns` of the owner's own turns via
 * an uncounted removePiece. */
function summonTempStrike(
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
            label: "Choose where the storm cloud gathers",
            squares: emptySquares(api.board, zone(api)),
          },
    effect: (inst, api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null || inst.state.sq != null) return;
      api.place(sq, type, api.me);
      inst.state.sq = sq;
      inst.state.turns = turns;
      // Storm entrance: knock out one enemy pawn standing beside the cloud.
      let target: Square | null = null;
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(sq) + df, r = RANK(sq) + dr;
        if (!inBoard(f, r)) continue;
        const asq = SQ(f, r);
        const p = api.board.pieces[asq];
        if (p && p.color === api.opp && p.type === "p" && (target == null || asq < target)) target = asq;
      }
      if (target != null) api.removePiece(target);
    },
    onMovePlayed: (inst, move, api) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      if (move.capturedSquare === sq && move.from !== sq) {
        inst.spent = true; inst.state.sq = undefined; return;
      }
      if (move.from === sq) {
        inst.state.sq = move.to;
      } else if (move.to === sq && move.from !== sq) {
        inst.spent = true; inst.state.sq = undefined; return;
      }
      if (move.color !== api.me) return;
      const left = ((inst.state.turns as number) ?? 0) - 1;
      inst.state.turns = left;
      if (left <= 0) {
        const cur = inst.state.sq as Square | undefined;
        if (cur != null && api.board.pieces[cur]) api.removePiece(cur, { uncounted: true });
        inst.spent = true; inst.state.sq = undefined;
      }
    },
    status: (inst) =>
      inst.state.sq == null
        ? "activate to summon the storm"
        : `cloud rolls away in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

// ---------------------------------------------------------------------------

export const WILD_ELEMENTAL: Buff[] = [
  // ===================== FIRE =====================
  card(
    {
      id: "we_cinder_strike",
      name: "Cinder Strike",
      description: "Remove one of your opponent's pawns from the board, once.",
      tier: 2,
      category: "attack",
      flavor: "One ember, one pawn, gone.",
    },
    removeEnemies(1, ["p"]),
  ),
  card(
    {
      id: "we_scorch",
      name: "Scorch",
      description: "Remove one enemy knight or bishop from the board; the fire spreads to every enemy pawn standing beside it, once.",
      tier: 5,
      category: "attack",
      flavor: "Nothing minor about losing a minor.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to scorch",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const p = api.board.pieces[c];
        if (!p || p.color !== api.opp || (p.type !== "n" && p.type !== "b")) return;
        api.removePiece(c);
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (!inBoard(f, r)) continue;
          const sq = SQ(f, r);
          const t = api.board.pieces[sq];
          if (t && t.color === api.opp && t.type === "p") api.removePiece(sq);
        }
      },
    ),
  ),
  card(
    {
      id: "we_immolation",
      name: "Immolation",
      description: "Offer one of your own pawns to the flame: it is consumed, and the blast removes every enemy piece except kings on the 8 squares around it. Shielded pieces resist the fire.",
      tier: 6,
      category: "attack",
      requires: ["p"],
      flavor: "The offering burns brightest.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to immolate",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]?.type !== "p") return;
        api.removePiece(sq, { uncounted: true });
        explodeAt(api, sq);
      },
    ),
  ),
  card(
    {
      id: "we_conflagration",
      name: "Conflagration",
      description: "Remove two enemy pieces, each a pawn, knight, or bishop, once.",
      tier: 5,
      category: "attack",
      flavor: "It spreads.",
    },
    removeEnemies(2, ["p", "n", "b"]),
  ),
  card(
    {
      id: "we_flame_lance",
      name: "Flame Lance",
      description:
        "One of your rooks breathes a lance of flame straight up its own file, without moving: the first enemy piece in the jet, if it is not a king, burns away. Friendly pieces block the flame, once.",
      tier: 5,
      category: "attack",
      requires: ["r"],
      flavor: "A straight line of ash.",
    },
    activated(
      (_inst, api, picks) => {
        const fwd = api.me === "w" ? 1 : -1;
        const target = (from: Square): Square | null => {
          let r = RANK(from) + fwd;
          const f = FILE(from);
          while (r >= 0 && r <= 7) {
            const sq = SQ(f, r);
            const p = api.board.pieces[sq];
            if (p) {
              return p.color === api.opp && p.type !== "k" ? sq : null;
            }
            r += fwd;
          }
          return null;
        };
        if (picks.length > 0) return null;
        return {
          kind: "square",
          label: "Choose the rook that fires",
          squares: mySquares(api.board, api.me, "r").filter((sq) => target(sq) != null),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square;
        if (from == null) return;
        const fwd = api.me === "w" ? 1 : -1;
        let r = RANK(from) + fwd;
        const f = FILE(from);
        while (r >= 0 && r <= 7) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (p) {
            if (p.color === api.opp && p.type !== "k") api.removePiece(sq);
            return;
          }
          r += fwd;
        }
      },
    ),
  ),
  card(
    {
      id: "we_hellfire_beam",
      name: "Hellfire Beam",
      description:
        "The beam scorches an X across the board: pick any square, and both diagonals through it stay burning: your opponent cannot move onto them for their next 3 turns.",
      tier: 6,
      category: "hex",
      flavor: "The ground remembers the beam.",
      fx: { motif: "blindfold" },
    },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the square the beam crosses",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const squares: Square[] = [c];
        for (const [df, dr] of DIAG_DIRS) {
          let f = FILE(c) + df, r = RANK(c) + dr;
          while (inBoard(f, r)) {
            squares.push(SQ(f, r));
            f += df;
            r += dr;
          }
        }
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
      },
    ),
  ),
  card(
    {
      id: "we_firestorm",
      name: "Firestorm",
      description:
        "A firestorm falls on the crossroads: every enemy piece except a king standing on the four center squares (d4, e4, d5, e5) is consumed.",
      tier: 5,
      category: "attack",
      flavor: "Everything near the middle catches.",
    },
    instant((_inst, api) => {
      for (const sq of [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)]) {
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
      }
    }),
  ),
  card(
    {
      id: "we_backdraft",
      name: "Backdraft",
      description:
        "The next 3 times your opponent captures one of your pieces, every enemy piece other than a pawn or king on the squares around it is destroyed.",
      tier: 4,
      category: "attack",
      flavor: "Take one of mine, the fire answers.",
    },
    captureExplosion({ onMyLosses: true, sparePawns: true, charges: 3 }),
  ),

  // ===================== ICE =====================
  card(
    {
      id: "we_frost_nip",
      name: "Frost Nip",
      description: "Frost nips at the rearguard: every enemy piece except the king still standing on its own back rank is frozen for 1 of their turns.",
      tier: 2,
      category: "tempo",
      flavor: "Just long enough.",
      fx: { motif: "jail" },
    },
    instant((_inst, api) => {
      const back = api.opp === "w" ? 0 : 7;
      for (const sq of mySquares(api.board, api.opp)) {
        if (RANK(sq) !== back) continue;
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
      }
    }),
  ),
  card(
    {
      id: "we_glaciate",
      name: "Glaciate",
      description:
        "Freeze one enemy piece (never a king) for 3 of their turns, and the frost spreads: every enemy piece directly beside it (up, down, left, or right) is frozen for 1 of their turns.",
      tier: 4,
      category: "tempo",
      flavor: "The cold does not stop at one. It creeps outward.",
      fx: { motif: "jail" },
    },
    // Distinct from wild/arcane's wa_time_stop (a single-target 3-turn lock): the
    // ice spreads. The chosen piece is frozen for 3 turns, and every enemy piece
    // orthogonally adjacent (never a king) is chilled for 1 turn. Reuses the same
    // ORTHO_DIRS adjacency + addEffect(freeze) pattern as Stone Grip.
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to encase in ice",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "ice" });
        for (const [df, dr] of ORTHO_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const asq = SQ(f, r);
          const p = api.board.pieces[asq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: asq, owner: api.opp, turns: 1, skin: "ice" });
          }
        }
      },
    ),
  ),
  card(
    {
      id: "we_hailstorm",
      icon: "CloudRain",
      name: "Hailstorm",
      description: "Freeze every one of your opponent's pawns for their next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "The whole front line, pinned under ice.",
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "p")) {
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),
  card(
    {
      id: "we_flash_freeze",
      name: "Flash Freeze",
      description:
        "Freeze every enemy piece standing next to your king for their next 2 turns and bonk it where it stands.",
      tier: 6,
      category: "protection",
      flavor: "The bodyguard's beat: the crowd around the crown, iced.",
      fx: { motif: "jail" },
    },
    instant((_inst, api) => {
      const king = mySquares(api.board, api.me, "k")[0];
      if (king == null) return;
      const hit: Square[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(king) + df, r = RANK(king) + dr;
        if (!inBoard(f, r)) continue;
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
          hit.push(sq);
        }
      }
      if (hit.length) addEffect(api, { kind: "bonk", squares: hit, owner: api.me, turns: 1 });
    }),
  ),
  card(
    {
      id: "we_glacier_wall",
      name: "Glacier Wall",
      description:
        "Two walls of ice rise: pick any two squares and each of their files becomes impassable to your opponent for their next 2 turns.",
      tier: 6,
      category: "protection",
      flavor: "Two rivers, both frozen shut.",
      fx: { motif: "blindfold" },
    },
    barLine("file", 2, 2),
  ),
  card(
    {
      id: "we_frost_ward",
      icon: "ShieldCheck",
      name: "Frost Ward",
      description:
        "Your king cannot be captured for your opponent's next 2 turns. Every enemy piece that ends a move next to your king in that time is frozen for 1 turn and bonked where it stands.",
      tier: 5,
      category: "protection",
      flavor: "A rime of protection, and it bites back.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    // Distinct from library/core iron_reign's plain king shield: the ward is a
    // frozen moat. King uncapturable for 2 turns, and an enemy that steps next
    // to the king in that window is frozen for 1 turn. A passive so the instance
    // lives to run the counter-freeze rider; it self-spends when the moat melts.
    {
      kind: "passive",
      init: (inst, api) => {
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
        inst.state.turns = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        if (move.color === api.opp && move.piece !== "k") {
          const king = mySquares(api.board, api.me, "k")[0];
          if (
            king != null &&
            api.board.pieces[move.to]?.color === api.opp &&
            ALL_DIRS.some(([df, dr]) => {
              const f = FILE(king) + df, r = RANK(king) + dr;
              return inBoard(f, r) && SQ(f, r) === move.to;
            })
          ) {
            // Added during the opponent's own move, so the shared post-move
            // tick eats one turn immediately: 2 here leaves 1 of their turns
            // frozen (the described "frozen for 1 turn"). turns:1 would tick to
            // 0 on this same move and never hold.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2, skin: "ice" });
            addEffect(api, { kind: "bonk", squares: [move.to], owner: api.me, turns: 1 });
          }
        }
        if (move.color === api.opp) {
          const left = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = left;
          if (left <= 0) inst.spent = true;
        }
      },
      status: (inst) => `moat frozen, ${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "we_frostbite_curse",
      name: "Frostbite",
      description:
        "Your opponent's pieces go numb: for their next 2 turns they cannot make any capture, and no piece may move more than 2 squares.",
      tier: 5,
      category: "protection",
      flavor: "Fingers too cold to close, joints too stiff to reach.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(2, (moves) => moves.filter((m) => !m.captured && dist(m.from, m.to) <= 2)),
  ),
  card(
    {
      id: "we_whiteout",
      icon: "CloudFog",
      name: "Whiteout",
      description:
        "A blizzard freezes every enemy piece except the king and pawns for their next 2 turns. The pawns can still trudge.",
      tier: 7,
      category: "tempo",
      flavor: "Only the smallest feet still find the ground.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "k" || t === "p") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
      }
    }),
  ),

  // ===================== EARTH =====================
  card(
    {
      id: "we_stone_grip",
      name: "Stone Grip",
      description:
        "Turn one enemy piece (never a king) to a walnut for 3 of their turns: it can only shuffle one square at a time. The enemy pieces directly beside it (up, down, left, or right) cannot capture for their next 2 turns.",
      tier: 3,
      category: "tempo",
      flavor: "The ground closes over its feet, and the rock spreads.",
      fx: { motif: "jail" },
    },
    // Distinct from wa_stasis_field's plain 2-turn freeze: the target becomes a
    // walnut (it may still shuffle one square) for 3 turns, and the petrification
    // spreads to its orthogonal neighbours, who are struck too numb to capture
    // for 2 of their turns. spendOnUse:false keeps the instance alive to run the
    // no-capture filter; it self-spends once that rider expires.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.active === true
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to petrify",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.active === true) return;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        const beside: Square[] = [];
        for (const [df, dr] of ORTHO_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const asq = SQ(f, r);
          const p = api.board.pieces[asq];
          if (p && p.color === api.opp && p.type !== "k") beside.push(asq);
        }
        inst.state.beside = beside;
        inst.state.turns = 2;
        inst.state.active = true;
      },
      filterOpponentMoves: (moves, inst) => {
        const beside = inst.state.beside as Square[] | undefined;
        if (!beside?.length || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter((m) => !(m.captured && beside.includes(m.from)));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.active !== true || move.color !== api.opp) return;
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.active === true
          ? `spread numb, ${(inst.state.turns as number) ?? 0} of their turns left`
          : "activate to petrify",
    },
  ),
  card(
    {
      id: "we_petrify_ranks",
      name: "Petrify the Ranks",
      description:
        "Every enemy knight and bishop turns to stone: they cannot move for their next 2 turns.",
      tier: 5,
      category: "tempo",
      flavor: "A gallery of statues.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 2),
  ),
  card(
    {
      id: "we_stone_soldiers",
      name: "Stone Soldiers",
      description: "One of your pawns is carved into a stone soldier: it cannot move and cannot be captured for your opponent's next 6 turns, then the stone crumbles and it wakes.",
      tier: 4,
      category: "protection",
      requires: ["p"],
      flavor: "Cut from the bedrock. Returned to it, standing.",
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to carve into stone",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 6 });
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 6, skin: "stone" });
      },
    ),
  ),
  card(
    {
      id: "we_quagmire",
      name: "Quagmire",
      description:
        "Open two patches of sucking mud on empty squares: any enemy piece except a king that steps onto one is stuck fast for its next 3 turns instead of removed. The mud stays for the rest of the game.",
      tier: 5,
      category: "tempo",
      flavor: "It does not swallow you. It just will not let go.",
      fx: { motif: "jail" },
    },
    mireSquares(2, 3),
  ),
  card(
    {
      id: "we_stoneskin",
      icon: "ShieldAlert",
      name: "Stoneskin",
      description:
        "Your whole army cannot be captured for your opponent's next 2 turns, and every enemy piece standing next to one of your pieces is locked in place for its next turn.",
      tier: 8,
      category: "protection",
      flavor: "Skin like slate, and the ground grips whoever leans on it.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      const mineSet = new Set(mySquares(api.board, api.me));
      for (const sq of mySquares(api.board, api.opp)) {
        const p = api.board.pieces[sq]!;
        if (p.type === "k") continue;
        const adj = ALL_DIRS.some(([df, dr]) => {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          return inBoard(f, r) && mineSet.has(SQ(f, r));
        });
        if (adj) addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stone" });
      }
    }),
  ),
  card(
    {
      id: "we_mountain_range",
      icon: "MountainSnow",
      name: "Mountain Range",
      description:
        "Three peaks heave up out of the board: pick three empty squares; your opponent's pieces can never move onto them, for the rest of the game.",
      tier: 6,
      category: "protection",
      flavor: "You do not go over a mountain.",
      fx: { motif: "blindfold" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose where a peak rises (${picks.length + 1}/3)`,
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((v): v is Square => v != null);
        if (squares.length) {
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
        }
      },
    ),
  ),
  card(
    {
      id: "we_rooted",
      name: "Rooted",
      description:
        "Roots seize the heavy pieces: your opponent's rooks and queen cannot move for their next 2 turns.",
      tier: 5,
      category: "protection",
      flavor: "Too big to pull free.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "r" && m.piece !== "q")),
  ),
  card(
    {
      id: "we_landslide",
      name: "Landslide",
      description: "The whole slope gives way: every enemy piece except the king is pushed one square back toward its own home rank. Pieces with no room behind them stand fast.",
      tier: 7,
      category: "attack",
      flavor: "The whole hillside came down.",
    },
    instant((_inst, api) => {
      const back = api.opp === "w" ? -8 : 8;
      // Push the pieces nearest their home rank first so space opens up for
      // the ones behind them (deterministic order on every replica).
      const foes = mySquares(api.board, api.opp)
        .filter((sq) => api.board.pieces[sq]!.type !== "k")
        .sort((a, b) => relRank(api.opp, a) - relRank(api.opp, b) || a - b);
      for (const sq of foes) {
        const to = sq + back;
        if (to < 0 || to > 63) continue;
        const p = api.board.pieces[sq]!;
        if (!api.board.pieces[to] && (p.type !== "p" || pawnRankOk(to))) {
          api.relocate(sq, to);
        }
      }
    }),
  ),

  // ===================== STORM =====================
  card(
    {
      id: "we_lightning_bolt",
      name: "Lightning Bolt",
      description:
        "One queen looses a bolt down a diagonal, removing the first enemy piece it hits (never a king) and landing beyond it, once.",
      tier: 4,
      category: "attack",
      requires: ["q"],
      flavor: "One target, struck clean.",
    },
    lineSweep("q", DIAG_DIRS, 1),
  ),
  card(
    {
      id: "we_arc_lightning",
      name: "Arc Lightning",
      description:
        "One rook arcs lightning along a diagonal, removing up to two enemy pieces in its path (never a king) and landing beyond them. The bolt then jumps to freeze the nearest surviving enemy piece for its next 2 turns.",
      tier: 5,
      category: "attack",
      requires: ["r"],
      flavor: "It jumps where it likes.",
    },
    sweepThenFreeze("r", DIAG_DIRS, 2, 2),
  ),
  card(
    {
      id: "we_ball_lightning",
      name: "Ball Lightning",
      description:
        "Your next 2 captures each also destroy the enemy pieces (never a king) on the two squares immediately left and right of the captured square.",
      tier: 3,
      category: "attack",
      flavor: "It rolls sideways.",
    },
    captureExplosion({ beside: true, charges: 2 }),
  ),
  card(
    {
      id: "we_static_field",
      name: "Static Field",
      description:
        "Static builds on anything that runs: for your opponent's next 3 turns, any enemy piece except the king that travels 3 or more squares in one move is grounded, frozen for 1 turn where it lands.",
      tier: 3,
      category: "tempo",
      flavor: "The faster you move, the harder it bites.",
      fx: { motif: "anchor", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t < 0) return;
        const dist = Math.max(
          Math.abs(FILE(move.to) - FILE(move.from)),
          Math.abs(RANK(move.to) - RANK(move.from)),
        );
        if (dist >= 3 && move.piece !== "k") {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp) {
            // Added during their own move, so the shared post-move tick eats
            // one turn immediately: 2 here leaves 1 of their turns frozen.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2 });
          }
        }
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${Math.max(0, (inst.state.turns as number) ?? 0)} of their turns left`,
    },
  ),
  card(
    {
      id: "we_gale",
      name: "Gale",
      description:
        "A driving wind opens gaps: for your next 2 turns your bishops may each slip through one friendly piece in their way.",
      tier: 3,
      category: "movement",
      requires: ["b"],
      flavor: "The wind holds the door.",
      fx: { motif: "empower", pieces: ["b"], self: true },
    },
    timedAugment(2, bishopsPhaseGen),
  ),
  card(
    {
      id: "we_thunder_step",
      name: "Thunder Step",
      description: "One rook may move up to two squares diagonally, once.",
      tier: 2,
      category: "movement",
      requires: ["r"],
      flavor: "A short crack of speed.",
      fx: { motif: "empower", pieces: ["r"], moveAs: "b", self: true },
    },
    augment(rookDiagGen),
  ),
  card(
    {
      id: "we_updraft",
      name: "Updraft",
      description: "One knight may make a longer 3-by-1 leap, once.",
      tier: 1,
      category: "movement",
      requires: ["n"],
      flavor: "Caught on a thermal.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "n", self: true },
    },
    augment(knightCamelGen),
  ),
  card(
    {
      id: "we_thunderhead",
      icon: "Cloud",
      name: "Thunderhead",
      description:
        "A charged cloud takes shape as a knight on an empty square in your half, and its arrival blasts one enemy pawn standing beside it off the board. It fights for 3 of your turns, then rolls away.",
      tier: 4,
      category: "pieces",
      flavor: "Borrowed from the sky, and it lands with a crack.",
    },
    summonTempStrike("n", 3, myHalfZone),
  ),

  // ===================== TIDE =====================
  card(
    {
      id: "we_undertow",
      icon: "Sailboat",
      name: "Undertow",
      description:
        "A current sweeps one of your pieces to any empty square, then drags the nearest enemy piece one square toward where it lands.",
      tier: 4,
      category: "movement",
      flavor: "It takes you somewhere better and pulls them off their feet.",
    },
    relocateAnywhere("Choose the piece the current takes", "Choose where it washes up"),
  ),
  card(
    {
      id: "we_riptide",
      icon: "Waves",
      name: "Riptide",
      description: "A countercurrent runs through the middle of the board: for your opponent's next 3 turns, any enemy piece except the king that ends its move on the 4th or 5th rank is dragged one square back toward its home rank, when that square is free.",
      tier: 4,
      category: "hex",
      flavor: "The water rearranges the shore.",
      fx: { motif: "anchor", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t < 0) return;
        if (move.piece !== "k" && (RANK(move.to) === 3 || RANK(move.to) === 4)) {
          const back = api.opp === "w" ? -8 : 8;
          const to = move.to + back;
          const p = api.board.pieces[move.to];
          if (
            p &&
            p.color === api.opp &&
            to >= 0 &&
            to <= 63 &&
            !api.board.pieces[to] &&
            (p.type !== "p" || pawnRankOk(to))
          ) {
            api.relocate(move.to, to);
          }
        }
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${Math.max(0, (inst.state.turns as number) ?? 0)} of their turns left`,
    },
  ),
  card(
    {
      id: "we_whirlpool",
      name: "Whirlpool",
      description:
        "A whirlpool drags one enemy pawn to your side and deposits it on your 4th rank, yours now and ready to advance.",
      tier: 3,
      category: "pieces",
      flavor: "Down on their side, up on ours.",
    },
    {
      kind: "activated",
      spendOnUse: true,
      targets: (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          const dests = fourthRankSquares(api);
          return {
            kind: "square",
            label: "Choose an enemy pawn to pull under",
            squares: dests.length > 0 ? mySquares(api.board, api.opp, "p") : [],
          };
        }
        return {
          kind: "square",
          label: "Choose where it surfaces on your 4th rank",
          squares: fourthRankSquares(api),
        };
      },
      effect: (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        if (!p || p.type !== "p" || p.color !== api.opp) return;
        if (api.board.pieces[to] || !pawnRankOk(to)) return;
        api.setPieceColor(from, api.me);
        api.relocate(from, to);
      },
    },
  ),
  card(
    {
      id: "we_riverflow",
      name: "River Flow",
      description:
        "The board runs like water: for your next 2 turns your rooks may each slip through one friendly piece in their way.",
      tier: 3,
      category: "movement",
      requires: ["r"],
      flavor: "Water goes around nothing, it goes through.",
      fx: { motif: "empower", pieces: ["r"], self: true },
    },
    timedAugment(2, rooksPhaseGen),
  ),
  card(
    {
      id: "we_flood",
      name: "Flood",
      description:
        "Three floodwaters spread over empty squares: the first enemy piece to step onto each (never a king) is swept off the board. They stay for 2 of your turns.",
      tier: 6,
      category: "attack",
      flavor: "The water finds the low ground first.",
    },
    voidSquares(3, 2),
  ),

  // ===================== GROWTH =====================
  card(
    {
      id: "we_regrow",
      name: "Regrow",
      description:
        "One of your captured pawns sprouts back on your 4th rank, or the nearest rank with room, already pointed at promotion.",
      tier: 2,
      category: "pieces",
      flavor: "It came up facing the right way this time.",
    },
    {
      kind: "activated",
      spendOnUse: true,
      targets: (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const squares = revivable(api, "p") > 0 ? fourthRankSquares(api) : [];
        return { kind: "square", label: "Choose where the pawn sprouts", squares };
      },
      effect: (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || revivable(api, "p") <= 0 || api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
      },
    },
  ),
  card(
    {
      id: "we_ancient_grove",
      icon: "TreePine",
      name: "Ancient Grove",
      description:
        "Old roots give one piece back: return a captured rook, knight, or bishop to an empty square on your back rank, once.",
      tier: 4,
      category: "pieces",
      flavor: "The forest remembers its own.",
    },
    reviveOne(["r", "n", "b"], backRankZone),
  ),
  card(
    {
      id: "we_seedlings",
      icon: "Sprout",
      name: "Seedlings",
      description: "Plant two seeds on empty squares in your half: after 3 of your turns, a pawn sprouts on each square that is still empty.",
      tier: 3,
      category: "pieces",
      flavor: "Give it a season.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once planted, the seeds never move.
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: `Choose where to plant a seed (${picks.length + 1}/2)`,
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                (sq) => pawnRankOk(sq) && !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.squares != null) return;
        inst.state.squares = picks.map((k) => k.square).filter((v): v is Square => v != null);
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        for (const sq of squares) {
          if (!api.board.pieces[sq] && pawnRankOk(sq)) api.place(sq, "p", api.me);
        }
        inst.spent = true;
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return "activate to plant";
        return `sprouting in ${(inst.state.turns as number) ?? 0} of your turns`;
      },
    },
  ),
  card(
    {
      id: "we_creeping_roots",
      name: "Creeping Roots",
      description:
        "Roots grip at the border: your opponent's pawns cannot cross into your half of the board for their next 4 turns.",
      tier: 3,
      category: "protection",
      flavor: "Every furrow at the frontier holds them fast.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => m.piece !== "p" || !inHalf(api.me, m.to)),
    ),
  ),
  card(
    {
      id: "we_bramble_wall",
      icon: "Trees",
      name: "Bramble Wall",
      description:
        "Thorns snare the clergy: your opponent's bishops cannot move or capture for their next 3 turns.",
      tier: 3,
      category: "protection",
      flavor: "No angle out of the thorns.",
      fx: { motif: "jail", pieces: ["b"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "b")) {
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "vines" });
      }
    }),
  ),
  card(
    {
      id: "we_overgrowth",
      icon: "Leaf",
      name: "Overgrowth",
      description:
        "One of your pawns blooms into a queen for your next 3 turns, then withers back into a pawn.",
      tier: 5,
      category: "pieces",
      requires: ["p"],
      flavor: "A season of glory.",
      fx: { motif: "empower", pieces: ["p"], moveAs: "q", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose a pawn to bloom into a queen",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.setPieceType(sq, "q");
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 4, then: "demote", into: "p" });
      },
    ),
  ),
  card(
    {
      id: "we_thorn_barrier",
      name: "Thorn Barrier",
      description:
        "A hedge of thorns bursts up on an empty square: your opponent cannot enter any of the 8 squares around it for their next 3 turns, and any enemy piece already caught in that ring is snared and cannot move for its next 2 turns.",
      tier: 6,
      category: "protection",
      flavor: "Grown too fast to climb, and it grabs what it can reach.",
      fx: { motif: "blindfold" },
    },
    barNeighbors(3, 2, "Choose the empty square the thorns burst from"),
  ),
  card(
    {
      id: "we_verdant_shield",
      icon: "Flower2",
      name: "Verdant Shield",
      description:
        "A canopy of bark: all of your pawns cannot be captured for your opponent's next 2 turns. Any enemy pawn directly in front of one of your pawns is rooted and cannot move for 1 turn.",
      tier: 4,
      category: "protection",
      requires: ["p"],
      flavor: "Wrapped in living wood, and the roots reach out.",
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    // Distinct from library/core phalanx's plain pawn shield: a bramble that
    // also entangles. Pawns uncapturable for 2 turns, and every enemy pawn
    // standing directly in front of one of yours is rooted (frozen) for 1 turn.
    instant((_inst, api) => {
      const pawns = mySquares(api.board, api.me, "p");
      addEffect(api, { kind: "shield", owner: api.me, squares: pawns, turns: 2 });
      const fwd = api.me === "w" ? 1 : -1;
      for (const sq of pawns) {
        const f = FILE(sq), r = RANK(sq) + fwd;
        if (!inBoard(f, r)) continue;
        const front = SQ(f, r);
        const p = api.board.pieces[front];
        if (p && p.color === api.opp && p.type === "p") {
          addEffect(api, { kind: "freeze", sq: front, owner: api.opp, turns: 1, skin: "roots" });
        }
      }
    }),
  ),
];
