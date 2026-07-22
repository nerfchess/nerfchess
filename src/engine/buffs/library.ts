import { isInCheck } from "../board";
import { NEW_HEXES } from "./hexes";
import { BOON_WAVE2 } from "./boons2";
import { BOON_WAVE3 } from "./boons3";
import { FUNNY_CARDS } from "./funny";
import { FANTASY_CARDS } from "./fantasy";
import { MYSTIC_CARDS } from "./mystic";
import { WILD_CARDS } from "./wild";
import { CROSSREF_CARDS } from "./crossref";
import { PT_CARDS } from "./pt";
import { TIER9, TIER10 } from "./tier9";
import { BRAINROT } from "./brainrot";
import { OVERHAUL_CARDS } from "./overhaul";
import { PERSONAL_CARDS, NEWJEANS_CARDS } from "./personal";
import { buffRegistry } from "./registry";
import { Buff, BuffApi, BuffCategory, BuffInstance, CardFx } from "../buff";
import { Tier } from "../nerf";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  augment,
  barLine,
  bindCandidates,
  bindPiece,
  captureExplosion,
  captureSquare,
  emptySquares,
  explodeAt,
  extraMovesNow,
  freezeAllEnemies,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  markRevived,
  mySquares,
  oppFilter,
  pawnRankOk,
  permanentAugment,
  phasingSlideMoves,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
  shieldZone,
  skipOpponent,
  slideMoves,
  stealBuffs,
  teleportMoves,
  tickTurns,
  timedAugment,
  timedOppFilter,
  trackBoundPiece,
  turnsLeft,
  voidSquares,
} from "./helpers";

// ---------------------------------------------------------------------------
// The buff library: 8 tiers, ~32 cards per tier, plus the cross-cutting
// nerf-modifier cards. Cards with `implemented: true` are mechanically wired
// into the engine; the rest are cataloged stubs that never appear in drafts
// (exactly like unimplemented nerfs in the nerf library).
// ---------------------------------------------------------------------------

type Meta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
  /** One-line flavor text, shown quoted at the foot of the full card. */
  flavor?: string;
  /** Light general card that also joins nerf mode's boon pool. Category
   * "nerf" cards are boons automatically and never need this flag. */
  boon?: boolean;
  /** Board motif drawn on the affected pieces while the constraint runs.
   * Display metadata only; never consulted by move generation. */
  fx?: CardFx;
  /** Piece types the caster must own on the board for this card to be offered
   * (dead-draft guard). Omit for cards that work regardless of your pieces. */
  requires?: PieceType[];
};

type Mech = Partial<Buff> & Pick<Buff, "kind">;

function def(meta: Meta, mech?: Mech): Buff {
  if (!mech) {
    return { ...meta, implemented: false, kind: "passive" };
  }
  return { ...meta, implemented: true, ...mech };
}

// --- Local helpers -----------------------------------------------------------

const fwdOf = (c: Color) => (c === "w" ? 8 : -8);
const CAMEL_LEAPS = [
  [1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1],
] as const;

/** Standard opening home squares by piece type and color. Used by the rewind
 * family (Full Rewind) to send pieces back where they started; a pure read of
 * the fixed initial layout, so it is fully deterministic. */
const HOME: Record<Color, Partial<Record<PieceType, Square[]>>> = {
  w: { r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [8, 9, 10, 11, 12, 13, 14, 15] },
  b: { r: [56, 63], n: [57, 62], b: [58, 61], q: [59], k: [60], p: [48, 49, 50, 51, 52, 53, 54, 55] },
};

/** Empty squares within Chebyshev (king-step) distance `maxDist` of `from`,
 * reachable as a blink (ignores intervening pieces). */
function nearbyEmpty(api: BuffApi, from: Square, maxDist: number): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (api.board.pieces[sq]) continue;
    const d = Math.max(Math.abs(FILE(sq) - FILE(from)), Math.abs(RANK(sq) - RANK(from)));
    if (d >= 1 && d <= maxDist) out.push(sq);
  }
  return out;
}

/** Empty squares a knight's leap away from `from`. */
function knightEmpties(api: BuffApi, from: Square): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of KNIGHT_LEAPS) {
    const f = FILE(from) + df, r = RANK(from) + dr;
    if (!inBoard(f, r)) continue;
    const sq = SQ(f, r);
    if (!api.board.pieces[sq]) out.push(sq);
  }
  return out;
}

function pawnMove(api: BuffApi, from: Square, to: Square, via: string): Move {
  const target = api.board.pieces[to];
  return {
    from,
    to,
    piece: "p",
    color: api.me,
    ...(target ? { captured: target.type, capturedSquare: to } : {}),
    via,
  };
}

/** Every one of my pawns whose one-ahead and two-ahead squares are empty. */
function doubleStepGen(moves: Move[], inst: BuffInstance, api: BuffApi): Move[] {
  const out: Move[] = [];
  const fwd = fwdOf(api.me);
  for (const sq of mySquares(api.board, api.me, "p")) {
    const one = sq + fwd, two = sq + 2 * fwd;
    if (two < 0 || two > 63) continue;
    if (!api.board.pieces[one] && !api.board.pieces[two]) {
      // A double step that reaches the last rank promotes instead of leaving a
      // stranded pawn. A promoting push is never an en passant target.
      if (relRank(api.me, two) === 8) pushPawnMoves(out, api, sq, two, inst.id);
      else out.push({ ...pawnMove(api, sq, two, inst.id), isDoublePawn: true });
    }
  }
  return out;
}

/** Activated: pick one of my pieces; its square is shielded for `turns`. */
function shieldTarget(turns: number, types?: PieceType[]): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label: "Choose a piece to protect",
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && (!types || types.includes(t));
            }),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns });
      }
    },
  );
}

/** Activated: convert `count` enemy pieces of the given types to my color. */
function convertEnemies(count: number, types: PieceType[]): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: `Choose an enemy piece to take control of (${picks.length + 1}/${count})`,
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

/** Activated: promote `count` of my pawns at or past `minRelRank` to `to`. */
function promotePawns(count: number, minRelRank: number, to: PieceType): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: `Choose a pawn to promote (${picks.length + 1}/${count})`,
            squares: mySquares(api.board, api.me, "p").filter(
              (sq) => relRank(api.me, sq) >= minRelRank && !picks.some((k) => k.square === sq),
            ),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.setPieceType(k.square, to);
    },
  );
}

/** Instant: auto-revive one piece per spec entry onto empty squares in my
 * half, filling from my back rank outward. An entry may list alternative
 * types ("one minor piece"): the first revivable type in the list is taken. */
function autoRevive(specs: (PieceType | PieceType[])[]): Mech {
  return instant((_inst, api) => {
    const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
      (a, b) => relRank(api.me, a) - relRank(api.me, b),
    );
    for (const spec of specs) {
      const type = (Array.isArray(spec) ? spec : [spec]).find((t) => revivable(api, t) > 0);
      if (type == null) continue;
      const at = spots.findIndex((sq) => type !== "p" || pawnRankOk(sq));
      if (at < 0) return;
      api.place(spots.splice(at, 1)[0], type, api.me);
      markRevived(api, type);
    }
  });
}

/** Instant: revive up to `n` captured pawns onto empty start-rank squares. */
function revivePawnsToStart(n: number): Mech {
  return instant((_inst, api) => {
    const rank = api.me === "w" ? 1 : 6;
    const spots = emptySquares(api.board, (sq) => RANK(sq) === rank);
    let left = Math.min(n, revivable(api, "p"));
    for (const sq of spots) {
      if (left <= 0) break;
      api.place(sq, "p", api.me);
      markRevived(api, "p");
      left--;
    }
  });
}

/** Activated: swap up to `pairs` pairs of my pieces. Every completed pair is
 * a full effect on its own, so once at least one pair is picked the next
 * pair's first step is finishable: the player may stop early instead of
 * being forced through all `pairs * 2` picks. */
function swapOwnPieces(types?: PieceType[], pairs = 1): Mech {
  const candidates = (api: BuffApi) =>
    mySquares(api.board, api.me).filter(
      (sq) => !types || types.includes(api.board.pieces[sq]!.type),
    );
  return activated(
    (_inst, api, picks) =>
      picks.length >= pairs * 2
        ? null
        : {
            kind: "square",
            label:
              picks.length % 2 === 0
                ? pairs > 1
                  ? `Choose a piece to swap (pair ${Math.floor(picks.length / 2) + 1}/${pairs})`
                  : "Choose the first piece"
                : "Choose the piece to swap with",
            squares: candidates(api).filter((sq) => !picks.some((k) => k.square === sq)),
            ...(picks.length > 0 && picks.length % 2 === 0 ? { finishable: true } : {}),
          },
    (_inst, api, picks) => {
      for (let i = 0; i + 1 < picks.length; i += 2) {
        const a = picks[i]?.square, b = picks[i + 1]?.square;
        if (a == null || b == null) continue;
        const pa = api.board.pieces[a];
        api.board.pieces[a] = api.board.pieces[b];
        api.board.pieces[b] = pa;
        api.bs.historyDiverged = true;
      }
    },
  );
}

/** Activated: advance `count` of my pawns one square each (empty ahead). */
function advancePawns(count: number): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: `Choose a pawn to advance (${picks.length + 1}/${count})`,
            squares: mySquares(api.board, api.me, "p").filter((sq) => {
              const ahead = sq + fwdOf(api.me);
              return (
                ahead >= 0 && ahead < 64 && !api.board.pieces[ahead] &&
                !picks.some((k) => k.square === sq || k.square === sq - fwdOf(api.me))
              );
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) {
        const sq = k.square;
        if (sq == null) continue;
        const ahead = sq + fwdOf(api.me);
        if (!api.board.pieces[ahead] && api.board.pieces[sq]?.type === "p") {
          api.relocate(sq, ahead);
        }
      }
    },
  );
}

/** Activated: nullify `n` chosen enemy buffs. */
function severBuffs(n: number): Mech {
  return activated(
    (_inst, api, picks) => {
      if (picks.length >= n) return null;
      const taken = picks.map((k) => k.buffIndex);
      const options = api.theirs.buffs
        .map((b, index) => ({ b, index }))
        .filter(({ b, index }) => !b.spent && !b.nullified && !taken.includes(index))
        .map(({ b, index }) => ({ index, name: b.id, tier: b.tier }));
      if (options.length === 0 && picks.length > 0) return null;
      return { kind: "enemy-buff", label: "Choose an enemy buff to disable", options };
    },
    (_inst, api, picks) => {
      for (const k of picks) {
        if (k.buffIndex == null) continue;
        const target = api.theirs.buffs[k.buffIndex];
        if (!target) continue;
        target.nullified = true;
        // A bound upgrade (Titan, Living God, Titan Legion...) parked a
        // permanent shield on its piece(s). Nullifying the card alone leaves
        // that ward on the board, so the severed piece would stay
        // uncapturable forever (legalMoves still honors the shield). Drop the
        // shields keyed to this instance's bound square(s): Sever is the
        // targeted counter that removes what broadNullify deliberately spares.
        if (!boundUpgrade(target)) continue;
        const held = boundSquaresOf(target);
        if (!held.length) continue;
        api.bs.effects = api.bs.effects.filter(
          (e) =>
            !(
              e.kind === "shield" &&
              e.owner === api.opp &&
              e.squares != null &&
              e.squares.length > 0 &&
              e.squares.every((sq) => held.includes(sq))
            ),
        );
      }
    },
  );
}

/** A genuinely owner-relative upgrade: an activated, spend-on-use:false card
 * that has already been BOUND to specific square(s) of its owner (God Knight,
 * Colossus, Living God, Anchor, the pieceBound family, a placed Void Realm).
 * Its instance state points at those squares and any board effects it added
 * are keyed to the owner, so a steal or copy would strand the effect on the
 * victim and hand the thief a dead card whose bound square now holds an enemy
 * piece. An unbound copy of the same card (never activated) has no square yet
 * and transfers cleanly, so it stays stealable. */
function boundUpgrade(b: BuffInstance): boolean {
  const d = BUFF_BY_ID[b.id];
  if (!d) return false;
  return (
    d.kind === "activated" &&
    d.spendOnUse === false &&
    (b.state.sq != null || b.state.sqs != null || b.state.squares != null)
  );
}

/** The board squares a bound upgrade currently keys its effects to: its single
 * bound piece (state.sq) or the several pieces of a legion / placed zone
 * (state.sqs / state.squares). Used to strip the ward it left behind when the
 * card is severed. */
function boundSquaresOf(b: BuffInstance): Square[] {
  const out: Square[] = [];
  if (typeof b.state.sq === "number") out.push(b.state.sq as Square);
  for (const key of ["sqs", "squares"] as const) {
    const v = b.state[key];
    if (Array.isArray(v)) {
      for (const s of v) if (typeof s === "number") out.push(s as Square);
    }
  }
  return out;
}

/** True when a held buff is an already-online permanent: a bound piece upgrade
 * (see boundUpgrade) or a permanent passive engine with no charges or timer.
 * These are build-arounds the opponent invested in; broad nullify effects
 * leave them alone. */
function onlinePermanent(b: BuffInstance): boolean {
  const d = BUFF_BY_ID[b.id];
  if (!d) return false;
  if (d.kind === "activated") return boundUpgrade(b);
  if (d.kind === "passive") return b.state.turns == null && b.state.charges == null;
  return false;
}

/** Steal / copy rule: only genuinely bound piece upgrades stay with their
 * owner. Their state points at the owner's square, so a transfer strands the
 * effect on the victim and hands the thief a dead card. Everything else a
 * player holds transfers cleanly: a permanent passive augment (Amazon Army,
 * Royal Ascension, the atomic-capture line) is re-derived from the current
 * owner every turn, so it works fully once siphoned. This is deliberately
 * narrower than the nullify exclusion, which also spares permanent passives. */
const notLockedIn = (b: BuffInstance) => !boundUpgrade(b);

/** Broad nullify: cancels unused activated cards and temporary passives.
 * Online permanents resist; only targeted counters like Sever remove those. */
function broadNullify(api: BuffApi) {
  for (const b of api.theirs.buffs) {
    if (!b.spent && !b.nullified && !onlinePermanent(b)) b.nullified = true;
  }
}

/** Chebyshev adjacency (king-step distance 1). */
function adjacent(a: Square, b: Square): boolean {
  return a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;
}

/** Amazon movement: queen slides plus knight leaps. */
function amazonGen(board: BoardState, sq: Square, via: string): Move[] {
  return [...slideMoves(board, sq, ALL_DIRS, via), ...leapMoves(board, sq, KNIGHT_LEAPS, via)];
}

/** A line sweep (mirrors helpers.ts lineSweep for target selection and removal)
 * that also runs `after(api, from, to, df, dr)` once the sweep resolves, so a
 * sweep card can leave a barred lane or a freeze wake behind. `df`/`dr` are the
 * sign of the swept direction. Pure function of the picks and board state. */
function lineSweepThen(
  type: PieceType,
  dirs: readonly (readonly [number, number])[],
  maxCaptures: number | null,
  after: (api: BuffApi, from: Square, to: Square, df: number, dr: number) => void,
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
      return { kind: "square", label: "Choose where the sweep ends", squares: dests(api, picks[0].square!) };
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
      after(api, from, to, df, dr);
    },
  );
}

/** Push a buff pawn move, expanding promotions on the last rank. */
function pushPawnMoves(out: Move[], api: BuffApi, from: Square, to: Square, via: string) {
  if (relRank(api.me, to) === 8) {
    for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
      out.push({ ...pawnMove(api, from, to, via), promotion: promo });
    }
  } else {
    out.push(pawnMove(api, from, to, via));
  }
}

/** The 16 starting squares for `me`, paired with the piece type each holds. */
function homeSquares(me: Color): [Square, PieceType][] {
  const hr = me === "w" ? 0 : 7;
  const pr = me === "w" ? 1 : 6;
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  return [
    ...back.map((t, f) => [SQ(f, hr), t] as [Square, PieceType]),
    ...Array.from({ length: 8 }, (_, f) => [SQ(f, pr), "p"] as [Square, PieceType]),
  ];
}

/** Move my strays back onto free starting squares of their own type. */
function reformArmy(api: BuffApi) {
  const homes = homeSquares(api.me);
  const settled = new Set<Square>();
  for (const [hsq, t] of homes) {
    const p = api.board.pieces[hsq];
    if (p && p.color === api.me && p.type === t) settled.add(hsq);
  }
  for (const [hsq, t] of homes) {
    if (settled.has(hsq) || api.board.pieces[hsq]) continue;
    const src = mySquares(api.board, api.me, t).find((sq) => !settled.has(sq));
    if (src == null) continue;
    api.relocate(src, hsq);
    settled.add(hsq);
  }
}

// Destination zones for relocateMany.
const stepDest = (_api: BuffApi, from: Square) =>
  ALL_DIRS.flatMap(([df, dr]) => {
    const f = FILE(from) + df, r = RANK(from) + dr;
    return inBoard(f, r) ? [SQ(f, r)] : [];
  });
const anyDest = () => Array.from({ length: 64 }, (_, i) => i);
const anyDestPawnSafe = (api: BuffApi, from: Square) =>
  api.board.pieces[from]?.type === "p" ? anyDest().filter(pawnRankOk) : anyDest();
const backRankDest = (api: BuffApi) => {
  const r = api.me === "w" ? 0 : 7;
  return Array.from({ length: 8 }, (_, f) => SQ(f, r));
};

const anyHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
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

// ---------------------------------------------------------------------------
// TIER 1 — small edges
// ---------------------------------------------------------------------------

const TIER1: Buff[] = [
  def(
    { id: "pawn_push", requires: ["p"], name: "Pawn Push", description: "On any turn, one of your pawns with two empty squares ahead may advance two squares in a single move, even after it has left its starting square, for the game.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    permanentAugment(doubleStepGen),
  ),
  def(
    { id: "wazir_rook", requires: ["r"], name: "Wazir Rook", description: "Choose one rook; for the game it may also step one square diagonally.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["r"], moveAs: "k", self: true } },
    pieceBound("r", "Choose the rook", (board, sq, via) => slideMoves(board, sq, DIAG_DIRS, via, 1)),
  ),
  def(
    { id: "ferz_king", name: "Ferz King", description: "Your king may move two squares diagonally, once per game.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "b", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) =>
        leapMoves(api.board, sq, [[2, 2], [2, -2], [-2, 2], [-2, -2]], inst.id),
      ),
    ),
  ),
  def(
    { id: "extra_glance", name: "Extra Glance", description: "See your opponent's nerf for the rest of the game.", tier: 1, category: "info", boon: true },
    instant((_inst, api) => { api.mine.oppNerfRevealed = true; }),
  ),
  def(
    { id: "castle_early", name: "Castle Early", description: "Castle even if your king has already moved once.", tier: 1, category: "movement" },
    instant((_inst, api) => api.restoreCastling()),
  ),
  def(
    { id: "pawn_shield", requires: ["p"], name: "Pawn Shield", description: "One pawn cannot be captured for your opponent's next 4 turns.", tier: 1, category: "protection", boon: true },
    shieldTarget(3, ["p"]),
  ),
  def(
    { id: "free_retreat", name: "Free Retreat", description: "Return your last-moved piece to the square it came from, once.", tier: 1, category: "tempo" },
    // No move-history replay: read board.history for my most recent move and
    // slide that piece back to its origin if it is still there and the origin
    // is empty. A faithful one-piece retreat without reconstructing the board.
    activatedSimple((_inst, api) => {
      const h = api.board.history;
      for (let i = h.length - 1; i >= 0; i--) {
        const m = h[i];
        if (m.color !== api.me) continue;
        const p = api.board.pieces[m.to];
        if (p && p.color === api.me && !api.board.pieces[m.from] && m.to !== m.from) {
          api.relocate(m.to, m.from);
          api.bs.historyDiverged = true;
        }
        break;
      }
    }),
  ),
  def(
    // Reworked for the full-transparency era (hands and offers are public, so
    // "see their next options" revealed nothing): a peek at the deck is now a
    // do-over token. Sole card granting exactly +1 reroll and nothing else.
    { id: "peek", name: "Peek", description: "Gain one draft reroll.", tier: 1, category: "draft", boon: true, flavor: "One look was enough to want a different look." },
    instant((_inst, api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; }),
  ),
  def(
    { id: "loyal_pawn", requires: ["p"], name: "Loyal Pawn", description: "One pawn promotes on your 7th rank instead of your 8th.", tier: 1, category: "pieces" },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      const fwd = fwdOf(api.me);
      for (const sq of mySquares(api.board, api.me, "p")) {
        const ahead = sq + fwd;
        if (ahead < 0 || ahead > 63) continue;
        if (relRank(api.me, ahead) !== 7 || api.board.pieces[ahead]) continue;
        for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
          out.push({ ...pawnMove(api, sq, ahead, inst.id), promotion: promo });
        }
      }
      return out;
    }),
  ),
  def(
    { id: "quiet_march", requires: ["p"], name: "Quiet March", description: "One pawn can move backward one square, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const back = sq - fwdOf(api.me);
        return back >= 0 && back < 64 && !api.board.pieces[back] && pawnRankOk(back)
          ? [pawnMove(api, sq, back, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "little_leap", requires: ["p"], name: "Little Leap", description: "One pawn jumps a single blocking piece directly ahead, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        if (two >= 0 && two < 64 && api.board.pieces[one] && !api.board.pieces[two]) {
          pushPawnMoves(out, api, sq, two, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    // Reworked for the full-transparency era (held buffs are public, so the
    // random reveal showed nothing new): the scout now raids the supply line.
    // Sole card granting exactly takeBoth+1 with no rider (Draft Seize and
    // Greed bundle it with a block / prepThree); priced against those peers.
    { id: "scout", name: "Scout", description: "Take both cards in your next draft instead of one, but spend one of your rerolls.", tier: 4, category: "draft", boon: true, flavor: "Sent ahead to look. Came back with the wagon." },
    // Rebalance: the free takeBoth+1 now carries a real cost (a lost reroll),
    // roughly a 20-30% trim on the tier's strongest no-rider draft grab.
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    }),
  ),
  def(
    // Guards the king without a shield effect, so the ward motif is the only
    // board paint it gets.
    { id: "steady_hand", name: "Steady Hand", description: "Enemy knights cannot move to squares that attack your king for your opponent's next 3 turns.", tier: 1, category: "protection", fx: { motif: "ward", pieces: ["k"], self: true } },
    timedOppFilter(3, (moves, _inst, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return moves;
      return moves.filter(
        (m) =>
          m.piece !== "n" ||
          Math.abs(FILE(m.to) - FILE(k)) * Math.abs(RANK(m.to) - RANK(k)) !== 2,
      );
    }),
  ),
  def(
    { id: "escape_hatch", requires: ["p"], name: "Escape Hatch", description: "Your king swaps places with one of its own pawns, once.", tier: 1, category: "movement" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the pawn your king swaps with", squares: mySquares(api.board, api.me, "p") },
      (_inst, api, picks) => {
        const pawnSq = picks[0]?.square;
        const kingSq = mySquares(api.board, api.me, "k")[0];
        if (pawnSq == null || kingSq == null) return;
        const pawn = api.board.pieces[pawnSq];
        api.board.pieces[pawnSq] = api.board.pieces[kingSq];
        api.board.pieces[kingSq] = pawn;
        api.bs.historyDiverged = true;
      },
    ),
  ),
  def(
    { id: "second_wind", name: "Second Wind", description: "One captured pawn returns to an empty square on your 2nd rank, once.", tier: 1, category: "pieces" },
    reviveOne(["p"], (api) => (sq) => RANK(sq) === (api.me === "w" ? 1 : 6)),
  ),
  def(
    { id: "diagonal_step", name: "Diagonal Step", description: "Your king moves like a bishop for one move.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "b", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    // An actual dodge, not a flat shield: the chosen piece slips one square to
    // an empty neighbour and is uncapturable on the reply. Only pieces that
    // have an empty adjacent square are offered, so the second pick is never
    // empty. king_safe is a separate card, so the king is not offered here.
    { id: "sidestep", name: "Sidestep", description: "Choose one piece: it steps one square to an empty square beside it and cannot be captured for your opponent's next turn.", tier: 1, category: "protection", fx: { motif: "empower", pieces: "all", moveAs: "k", self: true } },
    activated(
      (_inst, api, picks) => {
        // An empty neighbour the piece on `from` may legally step onto. A pawn
        // may never land on rank 1/8 (api.relocate refuses it), so those are
        // filtered here to keep the second pick honest.
        const openSteps = (from: Square) =>
          stepDest(api, from).filter(
            (d) => !api.board.pieces[d] && (api.board.pieces[from]?.type !== "p" || pawnRankOk(d)),
          );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to sidestep",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && openSteps(sq).length > 0,
            ),
          };
        }
        if (picks.length === 1 && picks[0].square != null) {
          return {
            kind: "square",
            label: "Step to an empty square beside it",
            squares: openSteps(picks[0].square),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square;
        const to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        if (!p || p.type === "k" || api.board.pieces[to]) return;
        if (p.type === "p" && !pawnRankOk(to)) return;
        api.relocate(from, to);
        addEffect(api, { kind: "shield", owner: api.me, squares: [to], turns: 1 });
      },
    ),
  ),
  def(
    { id: "tempo_shuffle", requires: ["p"], name: "Tempo Shuffle", description: "Move one pawn sideways one square, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) =>
        [-1, 1].flatMap((df) => {
          const f = FILE(sq) + df;
          if (!inBoard(f, RANK(sq))) return [];
          const to = SQ(f, RANK(sq));
          return api.board.pieces[to] ? [] : [pawnMove(api, sq, to, inst.id)];
        }),
      ),
    ),
  ),
  def(
    { id: "bishop_polish", requires: ["b"], name: "Bishop Polish", description: "One bishop can jump exactly one piece, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["b"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "b")) {
        for (const [df, dr] of DIAG_DIRS) {
          let f = FILE(sq) + df, r = RANK(sq) + dr, jumped = false;
          while (inBoard(f, r)) {
            const to = SQ(f, r);
            const t = api.board.pieces[to];
            if (!jumped) {
              if (t) jumped = true;
            } else {
              if (!t || t.color !== api.me) {
                out.push({
                  from: sq, to, piece: "b", color: api.me, via: inst.id,
                  ...(t ? { captured: t.type, capturedSquare: to } : {}),
                });
              }
              break;
            }
            f += df; r += dr;
          }
        }
      }
      return out;
    }),
  ),
  def(
    { id: "rook_slide", requires: ["r"], name: "Rook Slide", description: "One rook moves one square diagonally, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["r"], moveAs: "k", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id, 1)),
    ),
  ),
  def(
    { id: "sentinel_pawn", requires: ["p"], name: "Sentinel Pawn", description: "One pawn may capture an enemy piece two squares diagonally ahead, once.", tier: 1, category: "attack" },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        for (const df of [-2, 2]) {
          const f = FILE(sq) + df, r = RANK(sq) + (api.me === "w" ? 2 : -2);
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          const t = api.board.pieces[to];
          if (t && t.color === api.opp) pushPawnMoves(out, api, sq, to, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    // Reworked for the full-transparency era (offer tiers are public): one
    // glance now palms the opponent's do-over. Sole card whose whole effect is
    // stealing a reroll (War Room Sabotage bundles the steal with a block).
    { id: "quick_glance", name: "Quick Glance", description: "Your opponent loses one draft reroll, if they still hold one.", tier: 1, category: "draft", flavor: "You saw them reaching for the do-over. Now there is no do-over." },
    instant((_inst, api) => {
      api.theirs.rerollsLeft = Math.max(0, (api.theirs.rerollsLeft ?? 0) - 1);
    }),
  ),
  def(
    { id: "nudge", name: "Nudge", description: "Push one enemy pawn back one square if empty behind, once.", tier: 1, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy pawn to push back",
              squares: mySquares(api.board, api.opp, "p").filter((sq) => {
                const back = sq + fwdOf(api.me);
                return back >= 0 && back < 64 && !api.board.pieces[back] && pawnRankOk(back);
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const back = sq + fwdOf(api.me);
        if (!api.board.pieces[back] && pawnRankOk(back)) api.relocate(sq, back);
      },
    ),
  ),
  def(
    // The stability card, distinct from Sidestep's dodge: it braces a piece
    // together with the friendly pawns standing beside it, a whole planted
    // cluster rather than a single shielded piece. (The literal "cannot be
    // pushed or swapped by enemy buffs" anchor half is not wired here: the
    // engine's relocate hook only spares pieces bound by the card whose id is
    // "anchor" (game.ts), which this file cannot broaden.)
    { id: "firm_footing", name: "Firm Footing", description: "Choose one piece: it and your pawns on the squares beside it cannot be captured for your opponent's next 2 turns.", tier: 1, category: "protection", fx: { motif: "ward", pieces: "all", self: true } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to steady",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const bracing = mySquares(api.board, api.me, "p").filter((p) => adjacent(p, sq));
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq, ...bracing], turns: 1 });
      },
    ),
  ),
  def(
    // Guards the rooks without a shield effect, so the ward motif is the only
    // board paint it gets.
    { id: "cornerstone", name: "Cornerstone", description: "Your rooks cannot be captured while on their starting squares.", tier: 1, category: "protection", fx: { motif: "ward", pieces: ["r"], self: true } },
    oppFilter((moves, _inst, api) => {
      const hr = api.me === "w" ? 0 : 7;
      const corners = [SQ(0, hr), SQ(7, hr)].filter((sq) => {
        const p = api.board.pieces[sq];
        return p?.type === "r" && p.color === api.me;
      });
      if (!corners.length) return moves;
      return moves.filter((m) => {
        const cap = captureSquare(m);
        return cap == null || !corners.includes(cap);
      });
    }),
  ),
  def(
    { id: "half_step", requires: ["p"], name: "Half Step", description: "One pawn moves diagonally forward without capturing, once.", tier: 1, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        for (const df of [-1, 1]) {
          const f = FILE(sq) + df, r = RANK(sq) + (api.me === "w" ? 1 : -1);
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          if (!api.board.pieces[to]) pushPawnMoves(out, api, sq, to, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    { id: "prep", name: "Prep", description: "Your next buff draft shows three cards to pick from instead of two, once.", tier: 1, category: "draft" },
    instant((_inst, api) => { api.mine.flags.prepThree = true; }),
  ),
  def(
    // Guards the pawns without a shield effect, so the ward motif is the only
    // board paint it gets.
    { id: "loose_pawn", name: "Tight Formation", description: "Pawns still standing on your second rank cannot be captured, for the game. Once a pawn steps forward it is on its own.", tier: 1, category: "protection", fx: { motif: "ward", pieces: ["p"], self: true }, flavor: "Nobody pries a pawn out of formation." },
    oppFilter((moves, _inst, api) => {
      const home = api.me === "w" ? 1 : 6;
      return moves.filter((m) => {
        const cap = captureSquare(m);
        if (cap == null || RANK(cap) !== home) return true;
        const p = api.board.pieces[cap];
        return !(p && p.color === api.me && p.type === "p");
      });
    }),
  ),
  def(
    { id: "watchtower", name: "Watchtower", description: "The tower spots the cavalry a mile out: enemy knights cannot move into your half of the board for your opponent's next 3 turns.", tier: 1, category: "protection", boon: true, fx: { motif: "ward", pieces: ["n"] }, flavor: "Nothing on four legs sneaks past the watch." },
    timedOppFilter(3, (moves, _inst, api) =>
      moves.filter((m) => !(m.piece === "n" && inHalf(api.me, m.to))),
    ),
  ),
  def(
    { id: "steady_march", requires: ["p"], name: "Steady March", description: "Two pawns each advance one square immediately.", tier: 1, category: "movement" },
    advancePawns(2),
  ),
  def(
    // Guards the king without a shield effect, so the ward motif is the only
    // board paint it gets.
    { id: "guarded_king", name: "Guarded King", description: "Enemy pieces cannot move to the squares diagonally adjacent to your king for your opponent's next 2 turns.", tier: 1, category: "protection", fx: { motif: "ward", pieces: ["k"], self: true } },
    timedOppFilter(2, (moves, _inst, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return moves;
      return moves.filter(
        (m) => Math.abs(FILE(m.to) - FILE(k)) !== 1 || Math.abs(RANK(m.to) - RANK(k)) !== 1,
      );
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "reprieve", name: "Reprieve", description: "Suspend your nerf for your next 2 turns.", tier: 1, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
    }),
  ),
  def(
    { id: "deep_breath", name: "Deep Breath", description: "Free action: ignore your nerf for one move, used at the moment you choose.", tier: 1, category: "nerf" },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
      }),
      freeAction: true,
    },
  ),
  def(
    { id: "small_mercies", name: "Small Mercies", description: "The next 2 times your opponent captures one of your pieces, your nerf is suspended for your next turn.", tier: 1, category: "nerf" },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} mercies left`,
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 2 — real advantages
// ---------------------------------------------------------------------------

const TIER2: Buff[] = [
  def(
    { id: "ghost_pawn", requires: ["p"], name: "Ghost Pawn", description: "One pawn may advance two squares by passing through a single enemy piece directly ahead of it, landing on the empty square beyond without capturing, once.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        const blocker = one >= 0 && one < 64 ? api.board.pieces[one] : null;
        if (blocker && blocker.color !== api.me && two >= 0 && two < 64 && !api.board.pieces[two]) {
          pushPawnMoves(out, api, sq, two, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    { id: "double_step_army", requires: ["p"], name: "Battering Line", description: "Your pawns can capture straight ahead for your next 2 turns.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true }, flavor: "The line does not go around anything." },
    timedAugment(2, (_m, inst, api) => {
      const out: Move[] = [];
      const fwd = fwdOf(api.me);
      for (const sq of mySquares(api.board, api.me, "p")) {
        const to = sq + fwd;
        if (to < 0 || to > 63) continue;
        const t = api.board.pieces[to];
        if (t && t.color === api.opp) {
          if (relRank(api.me, to) === 8) pushPawnMoves(out, api, sq, to, inst.id);
          else out.push(pawnMove(api, sq, to, inst.id));
        }
      }
      return out;
    }),
  ),
  def(
    { id: "kings_guard", name: "King's Guard", description: "Add a pawn to your pocket, then spend a later turn to drop it onto any empty square.", tier: 2, category: "pieces" },
    instant((_inst, api) => grantInventory(api, "p", 1)),
  ),
  def(
    { id: "phase_rook", requires: ["r"], name: "Phase Rook", description: "Choose one rook. For the game it may pass through one friendly piece per move; it still cannot capture friendly pieces or phase through two.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["r"], self: true } },
    pieceBound("r", "Choose the rook", (board, sq, via) =>
      phasingSlideMoves(board, sq, ORTHO_DIRS, via, 1),
    ),
  ),
  def(
    { id: "wall", name: "Wall", description: "Raise a wall on one empty square you pick: enemy pieces can never move onto it, for the game.", tier: 3, category: "protection", flavor: "It was not there yesterday." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the empty square the wall rises on", squares: emptySquares(api.board) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "barred", squares: [picks[0].square], against: api.opp, turns: null });
        }
      },
    ),
  ),
  def(
    { id: "long_knight", requires: ["n"], name: "Long Knight", description: "One knight makes two knight-leaps in a single move, once.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "n", self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "n")) {
        for (const [df, dr] of KNIGHT_LEAPS) {
          const f1 = FILE(sq) + df, r1 = RANK(sq) + dr;
          if (!inBoard(f1, r1) || api.board.pieces[SQ(f1, r1)]) continue;
          for (const [df2, dr2] of KNIGHT_LEAPS) {
            const f2 = f1 + df2, r2 = r1 + dr2;
            if (!inBoard(f2, r2)) continue;
            const to = SQ(f2, r2);
            if (to === sq) continue;
            const t = api.board.pieces[to];
            if (!t || t.color !== api.me) {
              out.push({
                from: sq, to, piece: "n", color: api.me, via: inst.id,
                ...(t ? { captured: t.type, capturedSquare: to } : {}),
              });
            }
          }
        }
      }
      return out;
    }),
  ),
  def(
    { id: "camel_knight", requires: ["n"], name: "Camel Knight", description: "One knight also moves as a camel (3-1 leap), for the game.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "n", self: true } },
    pieceBound("n", "Choose the knight", (board, sq, via) => leapMoves(board, sq, CAMEL_LEAPS, via)),
  ),
  def(
    { id: "teleport_knight", requires: ["n"], name: "Teleport Knight", description: "Move one knight to any empty square within the 3x3 box around it, once. It cannot capture with this move.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1).filter((m) => !m.captured),
      ),
    ),
  ),
  def(
    // Bound-piece guard with no shield effect; ward is its only board paint.
    { id: "shielded_advance", requires: ["p"], name: "Shielded Advance", description: "Choose one pawn. While it stands in the enemy half it cannot be captured, for your next 3 turns.", tier: 2, category: "protection", fx: { motif: "ward", pieces: ["p"], self: true } },
    bindPiece("Choose the pawn", bindCandidates(["p"]), {
      turns: 3,
      filterOpp: (moves, sq, api) =>
        inHalf(api.opp, sq) ? moves.filter((m) => captureSquare(m) !== sq) : moves,
    }),
  ),
  def(
    { id: "reinforce", name: "Reinforce", description: "One of your pieces cannot be captured for your opponent's next 3 turns.", tier: 2, category: "protection", boon: true },
    shieldTarget(2),
  ),
  def(
    { id: "pawn_storm", requires: ["p"], name: "Pawn Storm", description: "Every one of your pawns still on its starting square advances one square, if the square ahead is empty.", tier: 2, category: "movement", flavor: "The whole front moves at dawn." },
    instant((_inst, api) => {
      const fwd = fwdOf(api.me);
      const home = api.me === "w" ? 1 : 6;
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (RANK(sq) !== home) continue;
        const to = sq + fwd;
        if (!api.board.pieces[to]) api.relocate(sq, to);
      }
    }),
  ),
  def(
    { id: "bodyguard", name: "Bodyguard", description: "Add a knight to your pocket, then spend a later turn to drop it onto any empty square.", tier: 3, category: "pieces" },
    instant((_inst, api) => grantInventory(api, "n", 1)),
  ),
  def(
    { id: "recall", name: "Recall", description: "Return one piece to any empty square in your back two ranks, once.", tier: 2, category: "movement" },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to recall",
            squares: mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]!.type !== "k"),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose where it returns",
            squares: emptySquares(api.board, (sq) =>
              api.me === "w" ? RANK(sq) < 2 : RANK(sq) >= 6,
            ),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        if (picks[0]?.square != null && picks[1]?.square != null) {
          api.relocate(picks[0].square, picks[1].square);
        }
      },
    ),
  ),
  def(
    { id: "trade_up", name: "Trade Up", description: "The next time you lose a minor piece, a new pawn appears in your half.", tier: 2, category: "pieces" },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || (move.captured !== "n" && move.captured !== "b")) return;
        const spot = emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
          (a, b) => relRank(api.me, a) - relRank(api.me, b),
        )[0];
        if (spot != null) api.place(spot, "p", api.me);
        inst.spent = true;
      },
      status: () => "waiting for a lost minor piece",
    },
  ),
  def(
    { id: "decoy", name: "Decoy", description: "Summon a decoy on an empty square in your half, and your king cannot be captured for your opponent's next 3 turns.", tier: 2, category: "protection", fx: { motif: "ward", pieces: ["k"], self: true } },
    // The decoy is a real stand-in pawn that draws fire while the king sits
    // untouchable (king_safe never petrifies, so it is soft-lock safe).
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Place your decoy",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.place(picks[0].square, "p", api.me);
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
      },
    ),
  ),
  def(
    { id: "berolina_pawns", requires: ["p"], name: "Berolina Pawns", description: "Your pawns may also step diagonally forward to empty squares and capture straight ahead, for the game.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    permanentAugment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        for (const df of [-1, 1]) {
          const f = FILE(sq) + df, r = RANK(sq) + (api.me === "w" ? 1 : -1);
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          if (!api.board.pieces[to]) pushPawnMoves(out, api, sq, to, inst.id);
        }
        const ahead = sq + fwdOf(api.me);
        if (ahead >= 0 && ahead < 64) {
          const t = api.board.pieces[ahead];
          if (t && t.color === api.opp) pushPawnMoves(out, api, sq, ahead, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    // Standing conditional guard; the shields it triggers are painted, the
    // waiting state is not, so it carries the ward motif.
    { id: "fork_guard", name: "Fork Guard", description: "Whenever one of your knights gives check, it cannot be captured on the reply turn.", tier: 2, category: "protection", fx: { motif: "ward", pieces: ["n"], self: true } },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.me || move.piece !== "n" || move.promotion) return;
        const k = mySquares(api.board, api.opp, "k")[0];
        if (k == null) return;
        if (Math.abs(FILE(move.to) - FILE(k)) * Math.abs(RANK(move.to) - RANK(k)) !== 2) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [move.to], turns: 1 });
      },
    },
  ),
  def(
    { id: "long_castle_anywhere", name: "Long Castle Anywhere", description: "Regain castling rights, and queenside castling ignores the b-file square.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["k", "r"], self: true } },
    {
      kind: "passive",
      init: (_inst, api) => api.restoreCastling(),
      augmentMoves: (moves, inst, api) => {
        const hr = api.me === "w" ? 0 : 7;
        const king = api.board.pieces[SQ(4, hr)];
        if (!king || king.type !== "k" || king.color !== api.me) return;
        const c = api.board.castling;
        const qSide = api.me === "w" ? c.wq : c.bq;
        const rook = api.board.pieces[SQ(0, hr)];
        if (
          qSide &&
          rook?.type === "r" &&
          rook.color === api.me &&
          !api.board.pieces[SQ(2, hr)] &&
          !api.board.pieces[SQ(3, hr)]
        ) {
          addNovel(moves, [
            { from: SQ(4, hr), to: SQ(2, hr), piece: "k", color: api.me, castle: "q", via: inst.id },
          ]);
        }
      },
    },
  ),
  def(
    // king_safe has no square paint of its own; ward marks the king.
    { id: "sidestep_king", name: "Sidestep King", description: "Your king cannot be captured for 1 turn.", tier: 2, category: "protection", fx: { motif: "ward", pieces: ["k"], self: true } },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
    }),
  ),
  def(
    { id: "piece_swap", name: "Piece Swap", description: "Swap positions of any two of your own pieces, once.", tier: 2, category: "movement" },
    swapOwnPieces(),
  ),
  def(
    { id: "wazir_bishop", requires: ["b"], name: "Wazir Bishop", description: "Choose one bishop; for the game it may also step one square horizontally or vertically.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["b"], moveAs: "k", self: true } },
    pieceBound("b", "Choose the bishop", (board, sq, via) => slideMoves(board, sq, ORTHO_DIRS, via, 1)),
  ),
  def(
    { id: "spring_pawn", requires: ["p"], name: "Spring Pawn", description: "Your pawns can spring one square sideways onto an empty square, twice.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true }, flavor: "A little hop, a whole new file." },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        for (const d of [-1, 1]) {
          const f = FILE(sq) + d, r = RANK(sq);
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          if (!api.board.pieces[to]) {
            out.push({ from: sq, to, piece: "p", color: api.me, via: inst.id });
          }
        }
      }
      return out;
    }, 2),
  ),
  def(
    { id: "rally", requires: ["n"], name: "Rally", description: "One of your knights may move like a king for 1 turn.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true } },
    timedAugment(1, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def(
    // Bound-piece guard with no shield effect; ward is its only board paint.
    { id: "anchor", name: "Anchor", description: "One piece cannot be pushed or swapped by enemy buffs, for the game.", tier: 2, category: "protection", fx: { motif: "ward", pieces: ["p", "n", "b", "r", "q"], self: true } },
    // The engine's relocate hook refuses enemy-buff pushes of the bound piece.
    bindPiece("Choose the piece to anchor", bindCandidates(), {}),
  ),
  def(
    { id: "shadow_step", name: "Shadow Step", description: "One of your pieces slips through shadow to a nearby empty square and cannot be captured on your opponent's next turn, once.", tier: 2, category: "movement", fx: { motif: "ward", self: true } },
    // A short blink (ignores blockers) plus a one-turn cloak: the piece is
    // "hidden" from capture on the reply, standing in for the un-revealed move.
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to shadow step",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && nearbyEmpty(api, sq, 2).length > 0,
            ),
          };
        }
        return { kind: "square", label: "Choose where it reappears", squares: nearbyEmpty(api, picks[0].square!, 2) };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from] && !api.board.pieces[to]) {
          api.relocate(from, to);
          addEffect(api, { kind: "shield", owner: api.me, squares: [to], turns: 1 });
        }
      },
    ),
  ),
  def(
    { id: "vault", requires: ["r"], name: "Vault", description: "One rook jumps its own pawn to the far side, once.", tier: 2, category: "movement", fx: { motif: "empower", pieces: ["r"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "r")) {
        for (const [df, dr] of ORTHO_DIRS) {
          const f1 = FILE(sq) + df, r1 = RANK(sq) + dr;
          const f2 = f1 + df, r2 = r1 + dr;
          if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
          const over = api.board.pieces[SQ(f1, r1)];
          if (over?.type === "p" && over.color === api.me && !api.board.pieces[SQ(f2, r2)]) {
            out.push({ from: sq, to: SQ(f2, r2), piece: "r", color: api.me, via: inst.id });
          }
        }
      }
      return out;
    }),
  ),
  def(
    // The augment offers the step to every piece, king included.
    { id: "reposition", name: "Reposition", description: "Move one piece, your king included, one square in any direction to an empty square, once. It cannot capture.", tier: 2, category: "movement", fx: { motif: "empower", pieces: "all", moveAs: "k", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1).filter((m) => !m.captured),
      ),
    ),
  ),
  def(
    // Reworked for the full-transparency era (opponent offers are public):
    // insight now bends your own draft instead. forceTier=3 is unique to this
    // card, priced on the forceTier ladder (North Star 4@t3, High Roll 6@t4,
    // Favorable Stars 6@t5).
    { id: "draft_insight", name: "Draft Insight", description: "Your next draft is fated to offer tier 3 cards.", tier: 2, category: "draft", boon: true, flavor: "You cannot change the cards. You can change where they are dealt from." },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 3;
    }),
  ),
  def(
    { id: "screen", requires: ["b"], name: "Screen", description: "Choose one bishop. While it stands on a square next to your king it cannot be captured, for your next 3 turns.", tier: 2, category: "protection" },
    bindPiece("Choose the bishop", bindCandidates(["b"]), {
      turns: 3,
      filterOpp: (moves, sq, api) => {
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null || !adjacent(sq, k)) return moves;
        return moves.filter((m) => captureSquare(m) !== sq);
      },
    }),
  ),
  def(
    { id: "counterstep", name: "Counterstep", description: "After your opponent's next capture, you take two moves in reply, once. You cannot capture the king on the bonus move: your opponent replies first.", tier: 2, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        api.bs.extraMoves[api.me] += 1;
        inst.spent = true;
      },
      status: () => "waiting for an enemy capture",
    },
  ),
  def(
    { id: "minor_recall", name: "Minor Recall", description: "Return a captured knight or bishop to your back rank, once.", tier: 2, category: "pieces" },
    reviveOne(["n", "b"], backRankZone),
  ),
  def(
    { id: "bulwark", name: "Bulwark", description: "Two pawns in front of your king cannot be captured for 3 turns.", tier: 2, category: "protection" },
    instant((_inst, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return;
      const squares = mySquares(api.board, api.me, "p")
        .filter((sq) => Math.abs(FILE(sq) - FILE(k)) <= 1 && relRank(api.me, sq) > relRank(api.me, k))
        .sort((a, b) => relRank(api.me, a) - relRank(api.me, b))
        .slice(0, 2);
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 3 });
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "loosen_the_leash", name: "Loosen the Leash", description: "Each of your next 3 captures loosens the leash: your nerf is suspended for your following turn.", tier: 2, category: "nerf" },
    // Distinct from Small Mercies (which triggers when the OPPONENT captures
    // you): this rewards YOUR captures, so pushing forward buys nerf relief.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} loosenings left`,
    },
  ),
  def(
    { id: "slack_chain", name: "Slack in the Chain", description: "Suspend your nerf for your next 3 turns.", tier: 2, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 3 });
    }),
  ),
  def(
    { id: "held_breath", name: "Held Breath", description: "Free action: suspend your nerf for your next 2 turns, used at the moment you choose.", tier: 2, category: "nerf" },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
      }),
      freeAction: true,
    },
  ),
  def(
    { id: "hunters_relief", name: "Hunter's Relief", description: "Your next 2 captures each suspend your nerf for your next turn.", tier: 2, category: "nerf" },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        // Two ticks: this effect loses one tick to the capturing move itself
        // (timers tick right after onMovePlayed), leaving the next turn free.
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} captures left`,
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 3 — strong swings
// ---------------------------------------------------------------------------

const TIER3: Buff[] = [
  def(
    { id: "knight_nightrook", requires: ["n"], name: "Knight to Nightrook", description: "One knight also slides straight up and down its file, any distance, for the game.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "r", self: true }, flavor: "At night, the horse remembers it was once a tower." },
    pieceBound("n", "Choose the knight", (board, sq, via) =>
      slideMoves(board, sq, [[0, 1], [0, -1]], via),
    ),
  ),
  def(
    { id: "bishop_archbishop", requires: ["b"], name: "Bishop to Archbishop", description: "One bishop also moves like a knight, for the game.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["b"], moveAs: "n", self: true } },
    pieceBound("b", "Choose the bishop", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def(
    { id: "rook_chancellor", requires: ["r"], name: "Rook to Chancellor", description: "One rook also moves like a knight, for the game.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["r"], moveAs: "n", self: true } },
    pieceBound("r", "Choose the rook", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def(
    { id: "extra_move", name: "Extra Move", description: "Take two moves in a row, once. You cannot capture the king on the bonus move: your opponent replies first.", tier: 4, category: "tempo", boon: true, fx: { motif: "rally", pieces: "all", self: true } },
    extraMovesNow(1),
  ),
  def(
    { id: "promote_now", requires: ["p"], name: "Promote Now", description: "Instantly promote one of your pawns on your 6th rank or beyond to a queen.", tier: 3, category: "pieces" },
    promotePawns(1, 6, "q"),
  ),
  def(
    { id: "summon_knight", name: "Summon Knight", description: "Place a new knight on any empty square in your half, once.", tier: 3, category: "pieces" },
    placePieces(["n"], anyHalfZone),
  ),
  def(
    { id: "queens_echo", requires: ["r"], name: "Queen's Echo", description: "Your rooks move like queens for your next 2 turns.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["r"], moveAs: "q", self: true } },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "time_skip", name: "Time Skip", description: "Your opponent skips their next turn, and the piece they last moved is frozen for their next 2 turns.", tier: 3, category: "tempo", fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      // Snap-freeze the piece the opponent last moved (it now sits on that
      // move's destination) for 2 of their turns. If that piece is gone or is
      // the king, the card is just the skip.
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color !== api.opp) continue;
        const sq = hist[i].to;
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        }
        break;
      }
    }),
  ),
  def(
    { id: "fortress", name: "Fortress", description: "One piece standing next to your king becomes uncapturable for your opponent's next 4 turns. Your king itself is not shielded.", tier: 3, category: "protection" },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const k = mySquares(api.board, api.me, "k")[0];
        return {
          kind: "square",
          label: "Choose the piece beside your king to protect",
          squares:
            k == null ? [] : mySquares(api.board, api.me).filter((sq) => adjacent(sq, k)),
        };
      },
      (_inst, api, picks) => {
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null || picks[0]?.square == null) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [k, picks[0].square], turns: 3 });
      },
    ),
  ),
  def(
    // Fairy hop with no chess analogue, so no moveAs; any non-king piece can
    // be bound.
    { id: "grasshopper", name: "Grasshopper", description: "Choose one non-king piece. For the game it may also move along any rank, file, or diagonal and land on the square immediately beyond the first piece in its path, capturing an enemy piece that stands there.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], self: true } },
    bindPiece("Choose the piece", bindCandidates(), {
      gen: (board, sq, via) => {
        const p = board.pieces[sq]!;
        const out: Move[] = [];
        for (const [df, dr] of ALL_DIRS) {
          let f = FILE(sq) + df, r = RANK(sq) + dr;
          while (inBoard(f, r) && !board.pieces[SQ(f, r)]) {
            f += df; r += dr;
          }
          const lf = f + df, lr = r + dr;
          if (!inBoard(f, r) || !inBoard(lf, lr)) continue;
          const to = SQ(lf, lr);
          const t = board.pieces[to];
          if (!t || t.color !== p.color) {
            out.push({
              from: sq, to, piece: p.type, color: p.color, via,
              ...(t ? { captured: t.type, capturedSquare: to } : {}),
            });
          }
        }
        return out;
      },
    }),
  ),
  def(
    { id: "cannon", requires: ["r"], name: "Cannon", description: "Choose one rook. For the game it keeps its normal moves and may also capture along a rank or file by jumping exactly one piece of either color and taking the first enemy piece beyond it.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["r"], self: true } },
    pieceBound("r", "Choose the rook", (board, sq, via) => {
      const p = board.pieces[sq]!;
      const out: Move[] = [];
      for (const [df, dr] of ORTHO_DIRS) {
        let f = FILE(sq) + df, r = RANK(sq) + dr, screened = false;
        while (inBoard(f, r)) {
          const to = SQ(f, r);
          const t = board.pieces[to];
          if (!screened) {
            if (t) screened = true;
          } else if (t) {
            if (t.color !== p.color) {
              out.push({
                from: sq, to, piece: "r", color: p.color,
                captured: t.type, capturedSquare: to, via,
              });
            }
            break;
          }
          f += df; r += dr;
        }
      }
      return out;
    }),
  ),
  def(
    { id: "sliding_king", name: "Sliding King", description: "Your king moves like a king or bishop for 3 turns.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "b", self: true } },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "dragon_pawn", requires: ["p"], name: "Dragon Pawn", description: "One pawn moves as a pawn or knight until it promotes.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["p"], moveAs: "n", self: true } },
    pieceBound("p", "Choose the pawn", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def(
    { id: "pin_breaker", name: "Pin Breaker", description: "One of your pieces breaks free with a knight's leap to an empty square, once.", tier: 3, category: "movement" },
    // Nerf chess is won by king capture, so there are no true pins; the card
    // instead lets any piece jump clear of whatever is holding it, knight-style.
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to break free",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && knightEmpties(api, sq).length > 0,
            ),
          };
        }
        return { kind: "square", label: "Choose where it lands", squares: knightEmpties(api, picks[0].square!) };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
      },
    ),
  ),
  def(
    { id: "rank_runner", requires: ["p"], name: "Rank Runner", description: "One pawn advances to any empty square on its file up to your 5th rank, once.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        let to = sq + fwdOf(api.me);
        while (to >= 0 && to < 64 && relRank(api.me, to) <= 5 && !api.board.pieces[to]) {
          out.push(pawnMove(api, sq, to, inst.id));
          to += fwdOf(api.me);
        }
      }
      return out;
    }),
  ),
  def(
    { id: "board_quake", name: "Board Quake", description: "Push every enemy pawn back one square where empty behind.", tier: 3, category: "attack" },
    instant((_inst, api) => {
      const back = fwdOf(api.me); // toward the opponent's back rank
      const pawns = mySquares(api.board, api.opp, "p");
      // Push the pawns closest to their back rank first so chains don't collide.
      pawns.sort((a, b) => (api.me === "w" ? b - a : a - b));
      for (const sq of pawns) {
        const dest = sq + back;
        if (dest >= 0 && dest < 64 && !api.board.pieces[dest] && relRank(api.opp, dest) > 1) {
          api.relocate(sq, dest);
        }
      }
    }),
  ),
  def(
    { id: "resurrect", name: "Resurrect", description: "Bring back your strongest captured piece to your half, once.", tier: 4, category: "pieces" },
    reviveOne(["q", "r", "b", "n", "p"], anyHalfZone),
  ),
  def(
    { id: "deflect", requires: ["q"], name: "Deflect", description: "Your queen cannot be captured for your opponent's next 4 turns.", tier: 3, category: "protection" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Confirm your queen", squares: mySquares(api.board, api.me, "q") },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 3 });
        }
      },
    ),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "bunker", name: "Bunker", description: "Three squares in front of your king are barred to enemies for 4 turns.", tier: 3, category: "protection", boon: true, fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return;
      const r = RANK(k) + (api.me === "w" ? 1 : -1);
      const squares: Square[] = [];
      for (const df of [-1, 0, 1]) {
        const f = FILE(k) + df;
        if (inBoard(f, r)) squares.push(SQ(f, r));
      }
      if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),
  def(
    { id: "overclock", requires: ["n"], name: "Overclock", description: "Your knights move like knights or kings for 3 turns.", tier: 3, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true } },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def(
    { id: "hunter_knight", requires: ["n"], name: "Hunter Knight", description: "One knight captures a piece one leap away and lands a second leap beyond, once.", tier: 5, category: "attack" },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "n")) {
        for (const [df, dr] of KNIGHT_LEAPS) {
          const f1 = FILE(sq) + df, r1 = RANK(sq) + dr;
          if (!inBoard(f1, r1)) continue;
          const mid = SQ(f1, r1);
          const prey = api.board.pieces[mid];
          if (!prey || prey.color !== api.opp) continue;
          for (const [df2, dr2] of KNIGHT_LEAPS) {
            const f2 = f1 + df2, r2 = r1 + dr2;
            if (!inBoard(f2, r2)) continue;
            const to = SQ(f2, r2);
            if (to !== sq && !api.board.pieces[to]) {
              out.push({
                from: sq, to, piece: "n", color: api.me,
                captured: prey.type, capturedSquare: mid, via: inst.id,
              });
            }
          }
        }
      }
      return out;
    }),
  ),
  def(
    { id: "chain_mail", name: "Chain Mail", description: "All your minor pieces are uncapturable for 2 full turns.", tier: 3, category: "protection" },
    instant((_inst, api) => {
      const squares = mySquares(api.board, api.me).filter((sq) =>
        ["n", "b"].includes(api.board.pieces[sq]!.type),
      );
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
    }),
  ),
  def(
    { id: "warp_step", name: "Warp Step", description: "Move one piece up to three squares in a straight line to an empty square, passing over any pieces in between, once. It cannot capture.", tier: 3, category: "movement" },
    augment((_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me)) {
        for (const [df, dr] of ALL_DIRS) {
          for (let d = 1; d <= 3; d++) {
            const f = FILE(sq) + df * d, r = RANK(sq) + dr * d;
            if (!inBoard(f, r)) break;
            const to = SQ(f, r);
            if (!api.board.pieces[to]) {
              out.push({ from: sq, to, piece: api.board.pieces[sq]!.type, color: api.me, via: inst.id });
            }
          }
        }
      }
      return out;
    }),
  ),
  def(
    { id: "tidal_push", name: "Tidal Push", description: "Shove one enemy piece two squares in a straight line if the path is empty, once.", tier: 3, category: "attack" },
    activated(
      (_inst, api, picks) => {
        const pushDests = (from: Square) =>
          ALL_DIRS.flatMap(([df, dr]) => {
            const f1 = FILE(from) + df, r1 = RANK(from) + dr;
            const f2 = f1 + df, r2 = r1 + dr;
            if (!inBoard(f1, r1) || !inBoard(f2, r2)) return [];
            return !api.board.pieces[SQ(f1, r1)] && !api.board.pieces[SQ(f2, r2)]
              ? [SQ(f2, r2)]
              : [];
          });
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy piece to shove",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && pushDests(sq).length > 0,
            ),
          };
        }
        if (picks.length === 1) {
          return { kind: "square", label: "Choose where it lands", squares: pushDests(picks[0].square!) };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
      },
    ),
  ),
  def(
    { id: "second_wind_major", name: "Second Wind Major", description: "Return a captured rook to any empty back-rank square, once.", tier: 3, category: "pieces" },
    reviveOne(["r"], backRankZone),
  ),
  def(
    { id: "split_march", requires: ["p"], name: "Split March", description: "Four pawns each advance one square immediately.", tier: 3, category: "movement" },
    advancePawns(4),
  ),
  def(
    { id: "guard_rotation", requires: ["r"], name: "Guard Rotation", description: "Swap your king with a rook anywhere on the board, once.", tier: 3, category: "movement" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the rook to swap your king with", squares: mySquares(api.board, api.me, "r") },
      (_inst, api, picks) => {
        const rookSq = picks[0]?.square;
        const kingSq = mySquares(api.board, api.me, "k")[0];
        if (rookSq == null || kingSq == null) return;
        const rook = api.board.pieces[rookSq];
        api.board.pieces[rookSq] = api.board.pieces[kingSq];
        api.board.pieces[kingSq] = rook;
        api.bs.historyDiverged = true;
      },
    ),
  ),
  def(
    { id: "iron_bishop", requires: ["b"], name: "Iron Bishop", description: "One bishop cannot be captured by pawns, for the game.", tier: 3, category: "protection" },
    bindPiece("Choose the bishop", bindCandidates(["b"]), {
      filterOpp: (moves, sq) =>
        moves.filter((m) => !(m.piece === "p" && captureSquare(m) === sq)),
    }),
  ),
  def(
    { id: "momentum", name: "Momentum", description: "After your next capture, immediately take a second move, once.", tier: 3, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        api.bs.extraMoves[api.me] += 1;
        inst.spent = true;
      },
      status: () => "waiting for your next capture",
    },
  ),
  def(
    { id: "frost", name: "Frost", description: "Freeze two adjacent enemy pieces for 1 turn each.", tier: 3, category: "tempo" },
    activated(
      (_inst, api, picks) => {
        const enemies = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the first piece to freeze",
            squares: enemies.filter((sq) => enemies.some((o) => adjacent(o, sq))),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose an adjacent piece to freeze",
            squares: enemies.filter((sq) => adjacent(sq, picks[0].square!)),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square != null) {
            addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns: 1 });
          }
        }
      },
    ),
  ),
  def(
    { id: "vanguard", requires: ["p"], name: "Vanguard", description: "One pawn on your 6th rank or beyond promotes to a knight, once.", tier: 3, category: "pieces" },
    promotePawns(1, 6, "n"),
  ),
  def(
    { id: "rewind_one", name: "Rewind One", description: "Undo the last two half-moves: send the last piece each side moved back to the square it came from, once.", tier: 3, category: "tempo" },
    // No history replay: walk board.history backwards two plies and slide each
    // moved piece home if it still stands where it landed. Distinct from Free
    // Retreat by rewinding BOTH sides' most recent moves, not just yours.
    instant((_inst, api) => {
      const h = api.board.history;
      for (let i = h.length - 1, undone = 0; i >= 0 && undone < 2; i--, undone++) {
        const m = h[i];
        const p = api.board.pieces[m.to];
        if (p && p.color === m.color && !api.board.pieces[m.from] && m.to !== m.from) {
          api.relocate(m.to, m.from);
          api.bs.historyDiverged = true;
        }
      }
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "piece_parole", name: "Piece Parole", description: "Release one of your pieces on parole: it gains a lasting shield, and your nerf is suspended for your next 2 turns.", tier: 3, category: "nerf", fx: { motif: "ward", self: true } },
    // The only nerf-relief card that also frees ONE piece for good (a permanent
    // square shield), on top of a short army-wide suspension.
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to release",
              squares: mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]!.type !== "k"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: null });
        }
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
      },
    ),
  ),
  def(
    { id: "half_measure", name: "Half Measure", description: "Cut your nerf to half strength: it is suspended on every other one of your next several turns.", tier: 3, category: "nerf" },
    // Alternating suspension: the nerf bites one turn, sleeps the next. Distinct
    // from the flat multi-turn suspends by only ever relieving every other turn.
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.charges = 4; // alternating suspensions remaining
        // The first relieved turn lands immediately.
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const armed = (inst.state.armed as boolean) ?? false;
        if (armed) {
          const left = (inst.state.charges as number) ?? 0;
          if (left > 0) {
            addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
            inst.state.charges = left - 1;
            if (left - 1 <= 0) inst.spent = true;
          }
        }
        inst.state.armed = !armed;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 4} half-measures left`,
    },
  ),
  def(
    { id: "respite", name: "Respite", description: "Suspend your nerf for your next 5 turns.", tier: 4, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 5 });
    }),
  ),
  def(
    { id: "timely_lull", name: "Timely Lull", description: "Free action: a lull settles over the whole board: both players' nerfs are suspended for their next 3 turns, used at the moment you choose.", tier: 3, category: "nerf", flavor: "For three turns, it is just chess." },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 3 });
        addEffect(api, { kind: "nerf_suspended", owner: api.opp, turns: 3 });
      }),
      freeAction: true,
    },
  ),
  def(
    { id: "underdogs_grit", name: "Underdog's Grit", description: "While you have fewer pieces than your opponent, your nerf is suspended.", tier: 3, category: "nerf" },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.opp) return;
        if (mySquares(api.board, api.me).length >= mySquares(api.board, api.opp).length) return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
      },
      status: () => "watching the material count",
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 4 — heavy hitters
// ---------------------------------------------------------------------------

const TIER4: Buff[] = [
  def(
    { id: "atomic_captures_small", name: "Atomic Captures (Small)", description: "Your captures clear enemy pieces on the two squares beside the captured piece.", tier: 4, category: "attack" },
    captureExplosion({ beside: true }),
  ),
  def(
    { id: "double_queen", requires: ["p"], name: "Double Queen", description: "Promote any pawn to a queen instantly, even mid-board.", tier: 5, category: "pieces" },
    promotePawns(1, 1, "q"),
  ),
  def(
    { id: "piece_steal", name: "Piece Steal", description: "Convert one enemy pawn to your color, once.", tier: 3, category: "pieces" },
    convertEnemies(1, ["p"]),
  ),
  def(
    { id: "split_bishop", name: "Split Bishop", description: "Add a new bishop to your pocket, then spend a later turn to drop it onto any empty square.", tier: 3, category: "pieces" },
    instant((_inst, api) => grantInventory(api, "b", 1)),
  ),
  def(
    { id: "twin_knights", requires: ["n"], name: "Twin Knights", description: "Both knights become nightrooks, for the game.", tier: 4, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "r", self: true } },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ORTHO_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "warp_rook", requires: ["r"], name: "Warp Rook", description: "One rook teleports to any empty square on the board, once.", tier: 4, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) =>
        teleportMoves(api.board, sq, emptySquares(api.board), inst.id),
      ),
    ),
  ),
  def(
    { id: "mass_recall", name: "Mass Recall", description: "Return any two pieces to your back rank, once.", tier: 4, category: "movement" },
    relocateMany(2, backRankDest),
  ),
  def(
    { id: "immobilizer", name: "Immobilizer", description: "One piece freezes all adjacent enemy pieces except kings while it stands there.", tier: 4, category: "tempo" },
    bindPiece("Choose the immobilizer", bindCandidates(), {
      filterOpp: (moves, sq) =>
        moves.filter((m) => m.piece === "k" || !adjacent(m.from, sq)),
    }),
  ),
  def(
    { id: "royal_decree", name: "Royal Decree", description: "Your king gains queen movement for 2 turns (still loses on capture).", tier: 4, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true } },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "purge", name: "Purge", description: "Remove one enemy piece below queen rank from the board.", tier: 5, category: "attack" },
    removeEnemies(1, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "mind_nudge", name: "Mind Nudge", description: "Force one enemy pawn to advance one square where empty, once.", tier: 2, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy pawn to push forward",
              squares: mySquares(api.board, api.opp, "p").filter((sq) => {
                const ahead = sq + fwdOf(api.opp);
                return ahead >= 0 && ahead < 64 && !api.board.pieces[ahead];
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const ahead = sq + fwdOf(api.opp);
        if (!api.board.pieces[ahead] && api.board.pieces[sq]?.type === "p") {
          api.relocate(sq, ahead);
        }
      },
    ),
  ),
  def(
    { id: "second_army", name: "Second Army", description: "Add two pawns to your pocket, then drop them onto empty squares on later turns.", tier: 4, category: "pieces" },
    instant((_inst, api) => grantInventory(api, "p", 2)),
  ),
  def(
    { id: "cascade_freeze", name: "Cascade Freeze", description: "For 3 turns, each capture you make freezes the nearest enemy piece 1 turn.", tier: 4, category: "tempo" },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.captured && turnsLeft(inst) > 0) {
          let best: Square | null = null;
          let bestDist = 99;
          for (const sq of mySquares(api.board, api.opp)) {
            if (api.board.pieces[sq]!.type === "k") continue;
            const d = Math.max(
              Math.abs(FILE(sq) - FILE(move.to)),
              Math.abs(RANK(sq) - RANK(move.to)),
            );
            if (d < bestDist) {
              bestDist = d;
              best = sq;
            }
          }
          if (best != null) addEffect(api, { kind: "freeze", sq: best, owner: api.opp, turns: 1 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns left`,
    },
  ),
  def(
    { id: "amazon_knight", requires: ["n"], name: "Amazon Knight", description: "One knight becomes a knight plus queen for 2 turns.", tier: 4, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    bindPiece("Choose the knight", bindCandidates(["n"]), {
      turns: 2,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via),
    }),
  ),
  def(
    { id: "buff_thief_minor", name: "Buff Thief (Minor)", description: "Steal one tier 1 or 2 buff from your opponent. Locked-in upgrades stay put.", tier: 4, category: "draft" },
    stealBuffs(1, 2, notLockedIn),
  ),
  def(
    { id: "chain_nullify", name: "Chain Nullify", description: "Cancel the next buff your opponent drafts before use.", tier: 4, category: "draft" },
    instant((_inst, api) => {
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  def(
    { id: "mirror", name: "Mirror", description: "Copy one random unspent buff your opponent holds. Locked-in upgrades cannot be copied.", tier: 4, category: "draft" },
    // Opponent buffs are hidden, so the copy is random rather than chosen.
    // Locked-in upgrades are excluded: their state points at the owner's
    // piece, so a copy would arrive bound to an enemy square.
    activatedSimple((_inst, api) => {
      const options = api.theirs.buffs.filter((b) => !b.spent && !b.nullified && notLockedIn(b));
      if (options.length === 0) return;
      const src = options[api.rng.int(options.length)];
      api.mine.buffs.push({ id: src.id, tier: src.tier, state: JSON.parse(JSON.stringify(src.state)) });
    }),
  ),
  def(
    { id: "warp_field", name: "Warp Field", description: "Move any two of your pieces one square each ignoring rules, once.", tier: 4, category: "movement" },
    relocateMany(2, stepDest),
  ),
  def(
    { id: "detonate", requires: ["p"], name: "Detonate", description: "Sacrifice one pawn to clear all pieces on its adjacent squares except kings.", tier: 4, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to detonate",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]?.type !== "p") return;
        explodeAt(api, sq);
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const n = SQ(f, r);
          const p = api.board.pieces[n];
          if (p && p.color === api.me && p.type !== "k") api.removePiece(n);
        }
        api.removePiece(sq);
      },
    ),
  ),
  def(
    { id: "regroup", name: "Regroup", description: "Return your advanced pawns to their starting rank where empty, once.", tier: 4, category: "movement" },
    activatedSimple((_inst, api) => {
      const home = api.me === "w" ? 1 : 6;
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (relRank(api.me, sq) <= 2) continue;
        const dest = SQ(FILE(sq), home);
        if (!api.board.pieces[dest]) api.relocate(sq, dest);
      }
    }),
  ),
  def(
    { id: "iron_wall", name: "Iron Wall", description: "Every piece on your back rank, your king aside, is uncapturable for 2 turns.", tier: 4, category: "protection" },
    shieldZone((api) => {
      const r = api.me === "w" ? 0 : 7;
      return Array.from({ length: 8 }, (_, f) => SQ(f, r));
    }, 2),
  ),
  def(
    { id: "snap_freeze", name: "Snap Freeze", description: "Freeze the piece that last moved for 2 of its turns.", tier: 3, category: "tempo", boon: true },
    instant((_inst, api) => {
      const last = [...api.board.history].reverse().find((m) => m.color === api.opp);
      if (!last) return;
      const p = api.board.pieces[last.to];
      if (p && p.color === api.opp && p.type !== "k") {
        addEffect(api, { kind: "freeze", sq: last.to, owner: api.opp, turns: 2 });
      }
    }),
  ),
  def(
    { id: "duelist", name: "Duelist", description: "One piece survives the first capture against it and the attacker dies instead, once (kings excluded).", tier: 4, category: "protection" },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: the duelist is chosen once and never re-aimed.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the duelist",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && move.captured && captureSquare(move) === sq) {
          const attacker = api.board.pieces[move.to];
          if (attacker && attacker.color === api.opp && attacker.type !== "k") {
            api.removePiece(move.to);
            api.place(sq, move.captured, api.me);
            api.capturedFromMe[move.captured] -= 1;
          }
          inst.spent = true;
          return;
        }
        trackBoundPiece(inst, move);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to choose a piece"
          : `dueling on ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  def(
    { id: "overrun", requires: ["p"], name: "Overrun", description: "Your pawns can capture straight ahead on your next turn.", tier: 4, category: "attack" },
    timedAugment(1, (_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const ahead = sq + fwdOf(api.me);
        if (ahead < 0 || ahead > 63) continue;
        const t = api.board.pieces[ahead];
        if (t && t.color === api.opp) pushPawnMoves(out, api, sq, ahead, inst.id);
      }
      return out;
    }),
  ),
  def(
    { id: "recast", name: "Recast", description: "Gain an extra draft reroll, and your next draft rolls one tier higher.", tier: 4, category: "draft", boon: true },
    instant((_inst, api) => {
      // A real reroll token (the reroll system supports these: rerollsLeft
      // starts at 1 and draft cards grant more) plus the one-tier lift on the
      // next offer, so the card is no longer a silent duplicate of banking.
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  def(
    { id: "phantom_rook", name: "Phantom Rook", description: "Spawn a rook that vanishes after 4 turns, on any empty square in your half.", tier: 4, category: "pieces" },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Place the phantom rook",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null || api.board.pieces[sq]) return;
        api.place(sq, "r", api.me);
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.sq == null) return;
        trackBoundPiece(inst, move);
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          const sq = inst.state.sq as Square;
          const p = api.board.pieces[sq];
          // Expiry of a summoned piece, not a capture: never pollute the
          // revive pools with a rook the opponent never took.
          if (p && p.color === api.me && p.type === "r") api.removePiece(sq, { uncounted: true });
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to place"
          : `vanishes in ${turnsLeft(inst)} of your turns`,
    },
  ),
  def(
    { id: "kingslide", name: "Kingslide", description: "Your king moves any distance in a straight line, once.", tier: 4, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true } },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "suppress", name: "Suppress", description: "Your opponent cannot draft manipulation buffs next draft.", tier: 4, category: "draft" },
    instant((_inst, api) => {
      api.theirs.flags.noDraftCards = (api.theirs.flags.noDraftCards ?? 0) + 1;
    }),
  ),
  def(
    { id: "blink_army", requires: ["p"], name: "Blink Army", description: "Teleport two pawns forward two squares each if empty, once.", tier: 4, category: "movement" },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const dest = (sq: Square) => sq + 2 * fwdOf(api.me);
        const prior = picks[0]?.square;
        const priorDest = prior != null ? dest(prior) : null;
        const squares = mySquares(api.board, api.me, "p").filter((sq) => {
          const d = dest(sq);
          return (
            d >= 0 && d < 64 && relRank(api.me, d) < 8 && !api.board.pieces[d] &&
            sq !== prior && d !== priorDest && d !== prior
          );
        });
        if (!squares.length && picks.length > 0) return null;
        return {
          kind: "square",
          label: `Choose a pawn to blink (${picks.length + 1}/2)`,
          squares,
        };
      },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square == null) continue;
          const d = k.square + 2 * fwdOf(api.me);
          if (api.board.pieces[k.square]?.type === "p" && !api.board.pieces[d]) {
            api.relocate(k.square, d);
          }
        }
      },
    ),
  ),
  def(
    { id: "grand_recall", requires: ["q"], name: "Grand Recall", description: "Return your queen (if on board) to any empty square in your half, once.", tier: 4, category: "movement" },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose your queen",
            squares: mySquares(api.board, api.me, "q"),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose where she returns",
            squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from != null && to != null && !api.board.pieces[to]) api.relocate(from, to);
      },
    ),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "fault_line", name: "Fault Line", description: "Split the board; enemy pieces cannot cross one file you pick, for 2 turns.", tier: 4, category: "protection", fx: { motif: "blindfold" } },
    barLine("file", 2),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "grace_period", name: "Grace Period", description: "Suspend your nerf entirely for 4 turns.", tier: 3, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 4 });
    }),
  ),
  def(
    { id: "adrenaline", name: "Adrenaline", description: "Whenever your king is in check, your nerf is suspended for your next turn.", tier: 4, category: "nerf" },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.opp) return;
        if (!isInCheck(api.board, api.me)) return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
      },
      status: () => "arms while your king is in check",
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 5 — major power
// ---------------------------------------------------------------------------

const TIER5: Buff[] = [
  def(
    { id: "atomic_captures", name: "Atomic Captures", description: "Whenever one of your pieces captures, every enemy piece on the 8 squares around the captured square is also removed, except kings and pawns. Lasts the whole game.", tier: 5, category: "attack" },
    captureExplosion({ sparePawns: true }),
  ),
  def(
    { id: "extra_move_repeat", name: "Extra Move (Repeat)", description: "Take two moves in a row every turn for 2 full turns. You cannot capture the king on the bonus moves: your opponent replies first.", tier: 5, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.rounds = 2;
        inst.state.armed = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) {
          inst.state.armed = true;
          return;
        }
        if (move.color !== api.me || !inst.state.armed) return;
        inst.state.armed = false;
        api.bs.extraMoves[api.me] += 1;
        const rounds = ((inst.state.rounds as number) ?? 0) - 1;
        inst.state.rounds = rounds;
        if (rounds <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.rounds as number) ?? 0} double turns left`,
    },
  ),
  def(
    { id: "god_knight", requires: ["n"], name: "God Knight", description: "One knight becomes an amazon (queen plus knight), for the game.", tier: 5, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    pieceBound("n", "Choose the knight", (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via)),
  ),
  def(
    { id: "total_freeze", name: "Total Freeze", description: "Freeze every enemy piece except the king that stands on a square next to one of your pieces, for 1 turn.", tier: 5, category: "tempo", boon: true },
    instant((_inst, api) => {
      const mineSqs = mySquares(api.board, api.me);
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        const near = mineSqs.some(
          (m) => Math.abs(FILE(m) - FILE(sq)) <= 1 && Math.abs(RANK(m) - RANK(sq)) <= 1,
        );
        if (near) addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
      }
    }),
  ),
  def(
    { id: "annihilate", name: "Annihilate", description: "Remove one enemy piece below the queen, and freeze every enemy piece orthogonally beside it for their next 2 turns.", tier: 5, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to annihilate",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "p" || t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k" || p.type === "q") return;
        // Freeze splash: every enemy non-king piece orthogonally adjacent.
        for (const [df, dr] of ORTHO_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const adj = SQ(f, r);
          const q = api.board.pieces[adj];
          if (q && q.color === api.opp && q.type !== "k") {
            addEffect(api, { kind: "freeze", sq: adj, owner: api.opp, turns: 2 });
          }
        }
        api.removePiece(sq);
      },
    ),
  ),
  def(
    { id: "buff_thief", name: "Buff Thief", description: "Steal one active buff of any tier from your opponent. Locked-in upgrades stay put.", tier: 5, category: "draft" },
    stealBuffs(1, undefined, notLockedIn),
  ),
  def(
    { id: "promotion_storm", name: "Promotion Storm", description: "All pawns on your 5th rank or beyond promote to knights.", tier: 5, category: "pieces" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (relRank(api.me, sq) >= 5) api.setPieceType(sq, "n");
      }
    }),
  ),
  def(
    { id: "time_stop_short", name: "Time Stop (Short)", description: "Time stops: freeze every enemy piece except the king for 1 turn, then take one extra move right now, once. You cannot capture the king during the bonus move: your opponent replies first.", tier: 6, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    {
      ...activatedSimple((_inst, api) => {
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
        }
        api.bs.extraMoves[api.me] += 1;
      }),
      freeAction: true,
    },
  ),
  def(
    // Tier 6 (owner call). Pools are built by the card's own `tier` field
    // (poolAtTier filters b.tier === t), so it drafts as a tier-6 card even
    // though it's declared in this file's TIER5 block.
    { id: "resurrect_queen", name: "Resurrect Queen", description: "Bring your captured queen back to any empty square on the board, and she cannot be captured for your opponent's next 2 turns.", tier: 6, category: "pieces" },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        return {
          kind: "square",
          label: "Choose where your queen returns",
          squares: revivable(api, "q") > 0 ? emptySquares(api.board) : [],
        };
      },
      (_inst, api, picks) => {
        if (revivable(api, "q") <= 0 || picks[0]?.square == null) return;
        api.place(picks[0].square, "q", api.me);
        markRevived(api, "q");
        addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 2 });
      },
    ),
  ),
  def(
    // Conditional king guard (king_safe has no square paint); ward marks it.
    { id: "checkmate_immunity", name: "Checkmate Immunity", description: "The first time your king is checked, it cannot be captured on the following turn, once.", tier: 5, category: "protection", fx: { motif: "ward", pieces: ["k"], self: true } },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (!isInCheck(api.board, api.me)) return;
        addEffect(api, {
          kind: "king_safe",
          owner: api.me,
          turns: move.color === api.opp ? 2 : 1,
        });
        inst.spent = true;
      },
      status: () => "arms when your king is checked",
    },
  ),
  def(
    { id: "mind_control", name: "Mind Control", description: "Take control of one enemy knight or bishop (turn it to your color) for the rest of the game.", tier: 5, category: "pieces" },
    convertEnemies(1, ["n", "b"]),
  ),
  def(
    { id: "board_lock", name: "Board Lock", description: "The whole board seizes up: no enemy piece may travel more than 3 squares in a single move, for your opponent's next 3 turns.", tier: 3, category: "tempo", fx: { motif: "slow", pieces: "all" }, flavor: "Somebody glued the grid." },
    timedOppFilter(3, (moves) =>
      moves.filter(
        (m) =>
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 3,
      ),
    ),
  ),
  def(
    { id: "twin_queens", requires: ["p"], name: "Twin Queens", description: "Promote two pawns to queens instantly if both are on your 5th rank or beyond.", tier: 5, category: "pieces" },
    promotePawns(2, 5, "q"),
  ),
  def(
    { id: "warp_legion", name: "Warp Legion", description: "The legion rallies to the crown: up to three of your pieces teleport to empty squares beside your king, once.", tier: 5, category: "movement" },
    relocateMany(3, (api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return [];
      const out: Square[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(k) + df, r = RANK(k) + dr;
        if (inBoard(f, r)) out.push(SQ(f, r));
      }
      return out;
    }),
  ),
  def(
    { id: "purge_two", name: "Purge Two", description: "Remove one enemy pawn, and freeze every other enemy pawn for their next turn.", tier: 3, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy pawn to purge",
              squares: mySquares(api.board, api.opp, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]?.type !== "p") return;
        for (const ps of mySquares(api.board, api.opp, "p")) {
          if (ps === sq) continue;
          addEffect(api, { kind: "freeze", sq: ps, owner: api.opp, turns: 1 });
        }
        api.removePiece(sq);
      },
    ),
  ),
  def(
    { id: "nova", requires: ["p"], name: "Nova", description: "Sacrifice one pawn to clear every enemy piece except the king from its file, once.", tier: 5, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to detonate",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]?.type !== "p") return;
        for (let r = 0; r < 8; r++) {
          const t = SQ(FILE(sq), r);
          const p = api.board.pieces[t];
          if (p && p.color === api.opp && p.type !== "k") api.removePiece(t);
        }
        api.removePiece(sq);
      },
    ),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "great_wall", name: "Great Wall", description: "One full rank you pick is impassable to enemies for 3 turns.", tier: 5, category: "protection", fx: { motif: "blindfold" } },
    barLine("rank", 3),
  ),
  def(
    // Board paints the barred lane; blindfold motif marks the sealed ground.
    { id: "siege_rook", requires: ["r"], name: "Siege Rook", description: "One rook captures every enemy piece in a straight line in one move, then the swept rank or file stays barred to your opponent for their next 2 turns.", tier: 5, category: "attack", fx: { motif: "blindfold" } },
    lineSweepThen("r", ORTHO_DIRS, null, (api, _from, to, df) => {
      const squares: Square[] = [];
      // df !== 0: swept along a rank (bar that rank). df === 0: swept along a
      // file (bar that file). The rook now holds the lane it cleared.
      if (df === 0) for (let i = 0; i < 8; i++) squares.push(SQ(FILE(to), i));
      else for (let i = 0; i < 8; i++) squares.push(SQ(i, RANK(to)));
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
    }),
  ),
  def(
    { id: "phase_army", requires: ["b", "r", "q"], name: "Phase Army", description: "Your bishops, rooks, and queen pass through one friendly piece per move for 2 turns.", tier: 5, category: "movement", fx: { motif: "empower", pieces: ["b", "r", "q"], self: true } },
    timedAugment(2, (_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me)) {
        const t = api.board.pieces[sq]!.type;
        const dirs =
          t === "b" ? DIAG_DIRS : t === "r" ? ORTHO_DIRS : t === "q" ? ALL_DIRS : null;
        if (dirs) out.push(...phasingSlideMoves(api.board, sq, dirs, inst.id, 1));
      }
      return out;
    }),
  ),
  def(
    { id: "regenerate", name: "Regenerate", description: "Revive two of your captured pawns to empty squares on your 2nd rank.", tier: 3, category: "pieces" },
    revivePawnsToStart(2),
  ),
  def(
    { id: "sever", name: "Sever", description: "Permanently disable one enemy buff and block its retrigger.", tier: 5, category: "draft" },
    severBuffs(1),
  ),
  def(
    // The augment offers the king-step to every piece, king included.
    { id: "overclock_major", name: "Overclock Major", description: "All your pieces may move like kings as an alternative, for 1 turn.", tier: 5, category: "movement", fx: { motif: "empower", pieces: "all", moveAs: "k", self: true } },
    timedAugment(1, (_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def(
    { id: "tempo_theft", name: "Tempo Theft", description: "Steal your opponent's next turn (you move twice, they wait), once.", tier: 3, category: "tempo", fx: { motif: "slow", pieces: "all" } },
    skipOpponent(1),
  ),
  def(
    // Board already paints no_pawn_advance; fx carried for consistency.
    { id: "blockade", name: "Blockade", description: "Wall the enemy front: their pawns cannot advance or capture for your opponent's next 2 turns.", tier: 4, category: "tempo", fx: { motif: "anchor", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 2 });
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => !(m.piece === "p" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  def(
    // Distinct from Recall (which drops a piece on any empty back-two-ranks
    // square): Warp Home teleports a piece to a vacant STARTING square of its
    // own type, a precise return-to-post rather than a free relocation.
    { id: "warp_home", name: "Warp Home", description: "Teleport one of your pieces back to a vacant starting square of its own type, once. A rook warps to an empty a1 or h1, a knight to b1 or g1, a pawn to any open square on its second rank, and so on.", tier: 3, category: "movement" },
    activated(
      (_inst, api, picks) => {
        const homesFor = (type: PieceType) =>
          homeSquares(api.me)
            .filter(([sq, t]) => t === type && !api.board.pieces[sq])
            .map(([sq]) => sq);
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to warp home",
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && homesFor(t).length > 0;
            }),
          };
        }
        if (picks.length === 1) {
          const from = picks[0].square;
          if (from == null) return null;
          const t = api.board.pieces[from]?.type;
          if (t == null) return null;
          return {
            kind: "square",
            label: "Choose a vacant starting square of that type",
            squares: homesFor(t),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        const home = homeSquares(api.me).some(([sq, t]) => sq === to && t === p?.type);
        if (p && home && !api.board.pieces[to]) api.relocate(from, to);
      },
    ),
  ),
  def(
    // king_safe has no square paint of its own; ward marks the king.
    { id: "iron_reign", name: "Iron Reign", description: "Your king cannot be captured for 2 full turns.", tier: 5, category: "protection", boon: true, fx: { motif: "ward", pieces: ["k"], self: true } },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  def(
    { id: "mass_promote_minor", requires: ["p"], name: "Mass Promote Minor", description: "Two pawns on your 4th rank or beyond become knights instantly.", tier: 5, category: "pieces" },
    promotePawns(2, 4, "n"),
  ),
  def(
    { id: "collapse", name: "Collapse", description: "Pull every enemy piece except the king one square toward their back rank across the whole board, once.", tier: 5, category: "attack" },
    instant((_inst, api) => {
      const back = -fwdOf(api.opp);
      // Every non-king enemy piece is pulled one square toward its own back
      // rank. Pieces only ever move within their file (dest = sq + back), so
      // sorting the whole board by proximity to the back rank makes each file
      // resolve from the back outward with no self-collisions.
      const targets = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      targets.sort((a, b) => (api.opp === "w" ? a - b : b - a));
      for (const sq of targets) {
        const dest = sq + back;
        if (dest >= 0 && dest < 64 && !api.board.pieces[dest]) api.relocate(sq, dest);
      }
    }),
  ),
  def(
    { id: "ghost_legion", requires: ["p"], name: "Ghost Legion", description: "All your pawns may jump over a blocker one square ahead, landing two ahead where empty, for 2 turns.", tier: 5, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    timedAugment(2, (_m, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        if (two < 0 || two > 63) continue;
        if (api.board.pieces[one] && !api.board.pieces[two]) {
          pushPawnMoves(out, api, sq, two, inst.id);
        }
      }
      return out;
    }),
  ),
  def(
    { id: "draft_seize", name: "Draft Seize", description: "Take both cards in your next draft and skip your opponent's next, though they gain a reroll in return.", tier: 6, category: "draft" },
    // Rebalance: the opponent is no longer denied cleanly; they bank a reroll as
    // compensation, softening the tempo swing by roughly a quarter.
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),
  def(
    { id: "rampart", name: "Rampart", description: "Place a pawn on each of three empty squares you choose in your half; those three pawns cannot be captured for your opponent's next 5 turns.", tier: 5, category: "protection" },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Place a rampart pawn (${picks.length + 1}/3)`,
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null && pawnRankOk(s));
        for (const sq of squares) api.place(sq, "p", api.me);
        if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 5 });
      },
    ),
  ),
  def(
    { id: "shatter", name: "Shatter", description: "Shatter one enemy rook, bishop, or knight into a walnut for the rest of the game: it can only shuffle one square at a time.", tier: 5, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook, bishop, or knight to shatter",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "b" || t === "n";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || !(p.type === "r" || p.type === "b" || p.type === "n")) return;
        // turns: 99 is the "rest of the game" convention used by other
        // permanent petrifies (necromancy / divine).
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 99 });
      },
    ),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "rehab", name: "Rehab", description: "Check into rehab: your nerf is suspended permanently for the rest of the game.", tier: 5, category: "nerf" },
    // A permanent (null-turn) suspension, distinct from the flat-removal cards
    // (Nerf Breaker and kin) which set nerfRemoved: this leaves a dispellable
    // effect on the board rather than deleting the handicap outright.
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: null });
    }),
  ),
  def(
    { id: "long_leash", name: "Long Leash", description: "Suspend your nerf for your next 7 turns.", tier: 5, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 7 });
    }),
  ),
  def(
    { id: "parole", name: "Parole", description: "Your nerf is removed for good after your next 10 turns.", tier: 5, category: "nerf" },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 10;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.removeMyNerf();
          inst.spent = true;
        }
      },
      status: (inst) => `${turnsLeft(inst)} of your turns until release`,
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 6 — game-bending
// ---------------------------------------------------------------------------

const TIER6: Buff[] = [
  def(
    // Chess Diff: the card that reaches BOTH sections at once. `boon: true` with
    // a non-nerf, non-hex category seats it in buff-mode drafts (a general card)
    // AND in nerf-mode drafts (nerf mode's pool is boons + hexes + items), so it
    // is the rare card offered as both a nerf and a buff. It PAUSES the running
    // game and spawns a fresh, completely normal game of chess on top of it: the
    // board, board effects, and tempo counters are stashed on bs.diff, both
    // armies snap to the standard opening, and the game server swaps both clocks
    // for a 1+0 sprint (see ChessDiffState in buff.ts and endChessDiff in
    // game.ts). No drafts, nerfs, or buffs run while the diff does — it is
    // decided by plain chess. When it ends, the paused game resumes and ONLY the
    // diff's winner is handed a GUARANTEED apex (tier-9) card; a drawn diff
    // grants nobody anything. Deliberately game-breaking. Given a 2x appearance
    // rate via DOUBLE_CHANCE_IDS in draft.ts.
    {
      id: "chess_diff",
      name: "Chess Diff",
      description:
        "Chess diff! The game is paused and a fresh, completely normal game of 1+0 chess is played on a clean board: no drafts, no cards, no powers of any kind. Whoever WINS the diff seizes an apex (tier 9) buff, then the paused game (board and clocks) resumes.",
      tier: 6,
      category: "pieces",
      boon: true,
      icon: "Swords",
      flavor: "Bet. Let's just diff.",
    },
    instant((_inst, api) => {
      const bs = api.bs;
      // Never nest a diff inside a diff (unreachable through normal play: no
      // drafts run during a diff; this guards god-panel grants and the like).
      if (bs.diff) return;
      // Stash the paused game: a deep, detached board copy plus the live
      // effects/tempo state, restored verbatim when the diff is decided.
      bs.diff = {
        caster: api.me,
        savedBoard: JSON.parse(JSON.stringify(api.board)) as typeof api.board,
        savedEffects: bs.effects,
        savedExtraMoves: bs.extraMoves,
        savedSkips: bs.skips,
        ...(bs.chainKingGuard ? { savedChainKingGuard: bs.chainKingGuard } : {}),
      };
      bs.effects = [];
      bs.extraMoves = { w: 0, b: 0 };
      bs.skips = { w: 0, b: 0 };
      bs.chainKingGuard = undefined;
      // The diff eats any draft still on the table: no drafts during the diff
      // (the shared cadence is also suspended while it runs, see playMove).
      bs.players.w.offer = null;
      bs.players.b.offer = null;
      // Wipe every square (uncounted: a board rewrite loses nothing, so the
      // revive pools must stay untouched).
      for (let sq = 0; sq < 64; sq++) {
        if (api.board.pieces[sq]) api.removePiece(sq, { uncounted: true });
      }
      // Re-seat both armies on their home squares: a fresh 1+0 opening.
      const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
      for (let f = 0; f < 8; f++) {
        api.place(SQ(f, 0), back[f], "w");
        api.place(SQ(f, 1), "p", "w");
        api.place(SQ(f, 6), "p", "b");
        api.place(SQ(f, 7), back[f], "b");
      }
      // A genuinely fresh game: white to move, full castling for both sides,
      // no en passant pending, and the fifty-move clock starts at zero. The
      // board can no longer be reproduced from move history, so repetition
      // checks are switched off. History is deliberately kept: the shared
      // move record keeps counting through the diff, so server and replica
      // ply counters never drift.
      api.board.turn = "w";
      api.board.castling = { wk: true, wq: true, bk: true, bq: true };
      api.board.epTarget = null;
      api.board.halfmove = 0;
      api.bs.historyDiverged = true;
      // The apex prize is granted when the diff is DECIDED, to its winner only
      // (see endChessDiff in game.ts) — never at cast time.
    }),
  ),
  def(
    { id: "atomic_reaction", name: "Atomic Reaction", description: "Whenever one of your pieces captures, every enemy piece except a king on the 8 squares around the captured square is removed, and each removed piece sets off the same blast around itself. Lasts the whole game.", tier: 6, category: "attack" },
    captureExplosion({ chain: true }),
  ),
  def(
    { id: "double_amazon", requires: ["n"], name: "Double Amazon", description: "All your knights move as amazons for your next 3 turns.", tier: 6, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "time_rewind", name: "Time Rewind", description: "Turn back time: restore some of your clock and free all of your own frozen or petrified pieces, once.", tier: 6, category: "tempo" },
    // Rewind reimagined without history replay: give the caster clock time back
    // and lift every freeze/walnut the caster is currently suffering.
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 90 });
      for (let i = api.bs.effects.length - 1; i >= 0; i--) {
        const e = api.bs.effects[i];
        if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me) {
          api.bs.effects.splice(i, 1);
        }
      }
    }),
  ),
  def(
    { id: "mass_resurrect", name: "Mass Resurrect", description: "Revive any four captured pawns to empty squares on your 2nd rank.", tier: 5, category: "pieces", boon: true },
    revivePawnsToStart(4),
  ),
  def(
    { id: "royal_ascension", name: "Royal Ascension", description: "Your king gains queen movement permanently (still loses on capture).", tier: 6, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true } },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "purge_line", name: "Purge Line", description: "Remove every enemy piece below queen rank on one rank you pick.", tier: 6, category: "attack" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick any square on the rank to purge", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const r = RANK(picks[0].square);
        for (let f = 0; f < 8; f++) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "q" && p.type !== "k") api.removePiece(sq);
        }
      },
    ),
  ),
  def(
    { id: "mind_dominion", name: "Mind Dominion", description: "Take control of one enemy rook or bishop for the game.", tier: 6, category: "pieces" },
    convertEnemies(1, ["r", "b"]),
  ),
  def(
    { id: "total_nullify", name: "Total Nullify", description: "Cancel your opponent's unused and temporary buffs. Locked-in piece upgrades resist.", tier: 6, category: "draft" },
    instant((_inst, api) => broadNullify(api)),
  ),
  def(
    { id: "second_king", requires: ["p"], name: "Second King", description: "Turn one of your pawns, on any rank, into a second king. Your opponent must capture both of your kings to win.", tier: 6, category: "pieces" },
    promotePawns(1, 1, "k"),
  ),
  def(
    { id: "warp_storm", name: "Warp Storm", description: "Move up to four of your pieces, your king aside, one square each in any direction onto an empty square, once.", tier: 6, category: "movement" },
    relocateMany(4, stepDest),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "fissure", name: "Fissure", description: "One file becomes impassable to enemies for the rest of the game.", tier: 6, category: "protection", fx: { motif: "blindfold" } },
    barLine("file", null),
  ),
  def(
    { id: "queens_wrath", requires: ["q"], name: "Queen's Wrath", description: "In one move, your queen sweeps along one straight line, removing up to two enemy pieces on it, then freezes every enemy piece beside her landing square for their next turn; a friendly piece or an enemy king ends the line, once.", tier: 6, category: "attack" },
    lineSweepThen("q", ALL_DIRS, 2, (api, _from, to) => {
      // Freeze wake: every enemy non-king piece king-adjacent to the landing.
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(to) + df, r = RANK(to) + dr;
        if (!inBoard(f, r)) continue;
        const adj = SQ(f, r);
        const q = api.board.pieces[adj];
        if (q && q.color === api.opp && q.type !== "k") {
          addEffect(api, { kind: "freeze", sq: adj, owner: api.opp, turns: 1 });
        }
      }
    }),
  ),
  def(
    { id: "army_reversal", requires: ["p"], name: "Army Reversal", description: "For your next 2 turns, each of your pawns may also move one square straight backward onto an empty square (no capture).", tier: 4, category: "movement", fx: { motif: "empower", pieces: ["p"], self: true } },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const back = sq - fwdOf(api.me);
        return back >= 0 && back < 64 && !api.board.pieces[back] && pawnRankOk(back)
          ? [pawnMove(api, sq, back, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "overwhelm", name: "Overwhelm", description: "Take three moves in a row, once. You cannot capture the king during these bonus moves: your opponent replies first.", tier: 6, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    extraMovesNow(2),
  ),
  def(
    { id: "buff_siphon", name: "Buff Siphon", description: "Steal two active buffs from your opponent. Locked-in upgrades stay put.", tier: 6, category: "draft" },
    stealBuffs(2, undefined, notLockedIn),
  ),
  def(
    { id: "detonation_field", name: "Detonation Field", description: "Your next three captures each explode adjacent enemy pieces.", tier: 6, category: "attack" },
    captureExplosion({ charges: 3 }),
  ),
  def(
    { id: "grand_summon", name: "Grand Summon", description: "Add a knight and a bishop to your pocket, then drop them onto empty squares on later turns.", tier: 6, category: "pieces" },
    instant((_inst, api) => {
      grantInventory(api, "n", 1);
      grantInventory(api, "b", 1);
    }),
  ),
  def(
    { id: "time_lock", name: "Time Lock", description: "Lock your opponent's clock and hand: they skip their next turn, and their next draft is skipped, once.", tier: 8, category: "tempo", fx: { motif: "slow", pieces: "all" } },
    // Rebalance: draft denial halved from two skipped drafts to one
    // (blockedDrafts +2 -> +1), keeping the turn skip.
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  def(
    { id: "colossus", name: "Colossus", description: "One piece becomes uncapturable and gains queen movement for 3 turns.", tier: 6, category: "movement", fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "q", self: true } },
    bindPiece("Choose the colossus", bindCandidates(), {
      turns: 3,
      // turns - 1: the +1 activation bump lifts the shield back to 3, so the
      // ward co-terminates with the movement grant instead of outlasting it.
      shieldTurns: 2,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via),
    }),
  ),
  def(
    { id: "cataclysm", name: "Cataclysm", description: "Clear all enemy pawns on the board.", tier: 6, category: "attack" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "p")) api.removePiece(sq);
    }),
  ),
  def(
    { id: "draft_domination", name: "Draft Domination", description: "Force your opponent's next draft down to tier 2, so both cards they are offered come from a weak tier.", tier: 5, category: "draft" },
    // Rebalance: forced tier softened from 1 to 2, leaving the victim slightly
    // less starved (and no longer a strict copy of Dead Letter's floor).
    instant((_inst, api) => {
      api.theirs.flags.forceTier = 2;
    }),
  ),
  def(
    { id: "warp_reign", requires: ["q"], name: "Warp Reign", description: "Swap the positions of your king and queen and shield both for your opponent's next 3 turns.", tier: 4, category: "protection" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Confirm your queen", squares: mySquares(api.board, api.me, "q") },
      (_inst, api, picks) => {
        const qSq = picks[0]?.square;
        const kSq = mySquares(api.board, api.me, "k")[0];
        if (qSq == null || kSq == null || qSq === kSq) return;
        const q = api.board.pieces[qSq];
        api.board.pieces[qSq] = api.board.pieces[kSq];
        api.board.pieces[kSq] = q;
        api.bs.historyDiverged = true;
        // After the swap the king stands on qSq and the queen on kSq. A square
        // shield never protects the king (legalMoves), so ward the king with
        // king_safe and shield the queen's square. Both are made during a
        // turn-costing activation, so the +1 bump lifts each to the promised 3
        // of the opponent's turns.
        addEffect(api, { kind: "shield", owner: api.me, squares: [kSq], turns: 2 });
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      },
    ),
  ),
  def(
    // freezeAllEnemies spares the king; the freezes are painted by the board.
    { id: "mass_freeze", name: "Mass Freeze", description: "Freeze every enemy piece except the king for 1 full turn.", tier: 4, category: "tempo", fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] } },
    freezeAllEnemies(1),
  ),
  def(
    { id: "resurrect_major", name: "Resurrect Major", description: "Revive a captured rook or bishop to any empty square, once.", tier: 4, category: "pieces" },
    reviveOne(["r", "b"], () => () => true),
  ),
  def(
    { id: "phalanx", name: "Phalanx", description: "Your entire pawn line becomes uncapturable for 2 turns.", tier: 3, category: "protection" },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 2),
  ),
  def(
    { id: "rift_walker", name: "Rift Walker", description: "One piece teleports anywhere on the board, once.", tier: 5, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) =>
        // Pawns may teleport, but never onto rank 1 or rank 8.
        teleportMoves(
          api.board,
          sq,
          api.board.pieces[sq]?.type === "p"
            ? emptySquares(api.board).filter(pawnRankOk)
            : emptySquares(api.board),
          inst.id,
        ),
      ),
    ),
  ),
  def(
    { id: "purge_storm", name: "Purge Storm", description: "Remove three enemy pawns and freeze the rest for 1 turn.", tier: 5, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy pawn to remove (${picks.length + 1}/3)`,
              squares: mySquares(api.board, api.opp, "p").filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        for (const k of picks) if (k.square != null) api.removePiece(k.square);
        for (const sq of mySquares(api.board, api.opp, "p")) {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
        }
      },
    ),
  ),
  def(
    { id: "ironclad", name: "Ironclad", description: "Every piece on your back two ranks, your king aside, cannot be captured for 2 turns.", tier: 5, category: "protection" },
    shieldZone((api) => {
      const ranks = api.me === "w" ? [0, 1] : [6, 7];
      return ranks.flatMap((r) => Array.from({ length: 8 }, (_, f) => SQ(f, r)));
    }, 2),
  ),
  def(
    { id: "ascendant_knight", requires: ["n"], name: "Ascendant Knight", description: "One knight moves as an amazon and cannot be captured, for 2 turns.", tier: 6, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    bindPiece("Choose the knight", bindCandidates(["n"]), {
      turns: 2,
      // turns - 1: the +1 activation bump restores the shield to 2, matching
      // the movement grant so it does not outlast the stated duration.
      shieldTurns: 1,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via),
    }),
  ),
  def(
    { id: "void", name: "Void", description: "The void takes one enemy pawn, knight, or bishop, and the square it stood on stays a void that swallows any enemy piece except a king that enters it, for the game.", tier: 6, category: "attack" },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once the void opens, it never moves.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece the void takes",
              squares: mySquares(api.board, api.opp).filter((sq) =>
                ["p", "n", "b"].includes(api.board.pieces[sq]!.type),
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.squares != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.removePiece(sq);
        inst.state.squares = [sq];
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color === api.opp && squares.includes(move.to) && move.piece !== "k") {
          api.removePiece(move.to);
        }
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return "activate to open the void";
        const sq = squares[0];
        return `swallowing at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  def(
    { id: "lightning_strike", name: "Lightning Strike", description: "Call lightning down on up to three enemy knights, bishops, or pawns, removing them from the board.", tier: 6, category: "attack" },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 3) return null;
        const squares = mySquares(api.board, api.opp).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return (t === "n" || t === "b" || t === "p") && !picks.some((k) => k.square === sq);
        });
        if (!squares.length && picks.length > 0) return null;
        return {
          kind: "square",
          label: `Choose a piece to strike (${picks.length + 1}/3)`,
          squares,
        };
      },
      (_inst, api, picks) => {
        const struck: Square[] = [];
        for (const k of picks) {
          if (k.square == null) continue;
          const p = api.board.pieces[k.square];
          if (p && p.color === api.opp && (p.type === "n" || p.type === "b" || p.type === "p")) {
            api.removePiece(k.square);
            struck.push(k.square);
          }
        }
        // Visual only: the struck squares flash until the opponent replies.
        if (struck.length) {
          addEffect(api, { kind: "strike", squares: struck, owner: api.me, turns: 1 });
        }
      },
    ),
  ),
  def(
    { id: "total_recall", name: "Total Recall", description: "Pull each of your pieces past your 4th rank back to your 3rd rank where empty, once.", tier: 4, category: "movement" },
    activatedSimple((_inst, api) => {
      const third = api.me === "w" ? 2 : 5;
      for (const sq of mySquares(api.board, api.me)) {
        if (relRank(api.me, sq) <= 4) continue;
        const dest = SQ(FILE(sq), third);
        if (!api.board.pieces[dest]) api.relocate(sq, dest);
      }
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "nerf_breaker", name: "Nerf Breaker", description: "Remove your nerf entirely for the rest of the game.", tier: 6, category: "nerf" },
    instant((_inst, api) => api.removeMyNerf()),
  ),
  def(
    { id: "wardens_bribe", name: "Warden's Bribe", description: "Free action: suspend your nerf for your next 6 turns, used at the moment you choose.", tier: 5, category: "nerf" },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 6 });
      }),
      freeAction: true,
    },
  ),
  def(
    // Owner call: reactive relief was underwhelming at tier 6, so it now
    // rolls one tier lower (nerf-mode boon pool, tier 5).
    { id: "iron_will", name: "Iron Will", description: "Whenever your opponent captures one of your pieces, your nerf is suspended for your next 2 turns.", tier: 5, category: "nerf" },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
      },
      status: () => "answers every loss with relief",
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 7 — near-decisive
// ---------------------------------------------------------------------------

const TIER7: Buff[] = [
  def(
    { id: "chain_atomic", name: "Chain Atomic", description: "Every capture by or against your pieces sets off an atomic blast that clears enemy pieces around it and chains, for the game. When an enemy captures one of your pieces, the capturing piece is destroyed too.", tier: 7, category: "attack" },
    captureExplosion({ chain: true, onMyLosses: true, includeCenter: true }),
  ),
  def(
    { id: "triple_amazon", requires: ["n"], name: "Triple Amazon", description: "All your knights become amazons for the game, and each may also pass through one friendly piece per move.", tier: 7, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => [
        ...slideMoves(api.board, sq, ALL_DIRS, inst.id),
        ...phasingSlideMoves(api.board, sq, ALL_DIRS, inst.id, 1),
      ]),
    ),
  ),
  def(
    { id: "full_rewind", name: "Full Rewind", description: "Send up to five of your pieces back to their original home squares, once.", tier: 7, category: "tempo" },
    // No history replay: home squares are the fixed opening layout, so each
    // piece can deterministically return to an empty starting square of its
    // type. Finishable after the first, so it never soft-locks on sparse boards.
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 5) return null;
        const chosen = picks.map((k) => k.square);
        const cand = mySquares(api.board, api.me).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          if (t === "k" || chosen.includes(sq)) return false;
          const homes = HOME[api.me][t] ?? [];
          return homes.some((h) => h !== sq && !api.board.pieces[h]);
        });
        if (!cand.length) return null;
        return {
          kind: "square",
          label: `Send a piece home (${picks.length + 1}/5)`,
          squares: cand,
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      (_inst, api, picks) => {
        for (const k of picks) {
          const from = k.square;
          if (from == null) continue;
          const piece = api.board.pieces[from];
          if (!piece) continue;
          const homes = HOME[api.me][piece.type] ?? [];
          const dest = homes.find((h) => h !== from && !api.board.pieces[h]);
          if (dest != null) api.relocate(from, dest);
        }
        api.bs.historyDiverged = true;
      },
    ),
  ),
  def(
    { id: "kings_legion", name: "King's Legion", description: "Add a rook, a knight, and a pawn to your pocket, then drop them onto empty squares on later turns.", tier: 7, category: "pieces" },
    instant((_inst, api) => {
      grantInventory(api, "r", 1);
      grantInventory(api, "n", 1);
      grantInventory(api, "p", 1);
    }),
  ),
  def(
    { id: "mind_empire", name: "Mind Empire", description: "Take control of one enemy piece of any type below queen for the game.", tier: 7, category: "pieces" },
    convertEnemies(1, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "annihilation", name: "Annihilation", description: "Remove any two enemy pieces below the queen from the board.", tier: 7, category: "attack" },
    removeEnemies(2, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "eternal_reign", name: "Eternal Reign", description: "Your king gains permanent queen movement and cannot be captured for 3 turns.", tier: 7, category: "movement", fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true } },
    {
      kind: "passive",
      init: (_inst, api) => addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 }),
      augmentMoves: (moves, inst, api) =>
        addNovel(
          moves,
          mySquares(api.board, api.me, "k").flatMap((sq) =>
            slideMoves(api.board, sq, ALL_DIRS, inst.id),
          ),
        ),
    },
  ),
  def(
    { id: "grand_nullify", name: "Grand Nullify", description: "Cancel your opponent's unused and temporary buffs. Locked-in upgrades resist.", tier: 7, category: "draft" },
    // Rebalance: dropped the forward-reaching rider (their NEXT-drafted buff no
    // longer arrives nullified); it now only clears what they currently hold.
    instant((_inst, api) => {
      broadNullify(api);
    }),
  ),
  def(
    { id: "warp_cataclysm", name: "Warp Cataclysm", description: "Teleport up to four of your pieces, your king aside, each to any empty square, once. Pawns stay off the first and last ranks.", tier: 7, category: "movement" },
    relocateMany(4, anyDestPawnSafe),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "great_divide", name: "Great Divide", description: "One full rank you pick becomes impassable to enemies for the rest of the game.", tier: 7, category: "protection", fx: { motif: "blindfold" } },
    barLine("rank", null),
  ),
  def(
    { id: "queens_rampage", requires: ["q"], name: "Queen's Rampage", description: "In one move, your queen sweeps along one straight line you choose and removes every enemy piece on it; a friendly piece or an enemy king ends the line, once.", tier: 7, category: "attack" },
    lineSweep("q", ALL_DIRS, null),
  ),
  def(
    // Not a second Time Lock (that is the double skip): a literal freeze. The
    // opponent loses their next turn to a skip, then on their following turn
    // every piece but the king is frozen. skips[opp] absorbs the next handover
    // so the freeze (which only ticks on the opponent's completed turns) is
    // still live when they finally get to move.
    { id: "time_freeze", name: "Time Freeze", description: "Your opponent skips their next turn, then on their following turn every enemy piece except the king is frozen.", tier: 7, category: "tempo", fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "ice" });
      }
    }),
  ),
  def(
    { id: "fortress_realm", name: "Fortress Realm", description: "A 3x3 zone you pick makes your pieces there, your king aside, uncapturable for your opponent's next 5 turns.", tier: 7, category: "protection", boon: true },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick the center of the 3x3 zone",
              squares: Array.from({ length: 64 }, (_, i) => i).filter(
                (sq) => FILE(sq) > 0 && FILE(sq) < 7 && RANK(sq) > 0 && RANK(sq) < 7,
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const squares: Square[] = [];
        for (const df of [-1, 0, 1]) for (const dr of [-1, 0, 1]) squares.push(c + df + 8 * dr);
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 4 });
      },
    ),
  ),
  def(
    { id: "onslaught", name: "Onslaught", description: "The whole army surges: for your next 3 turns, every one of your knights, bishops, rooks, and queens can also step one square in any direction.", tier: 7, category: "movement", fx: { motif: "rally", pieces: ["n", "b", "r", "q"], self: true } },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => {
        const t = api.board.pieces[sq]!.type;
        return t === "k" || t === "p" ? [] : slideMoves(api.board, sq, ALL_DIRS, inst.id, 1);
      }),
    ),
  ),
  def(
    { id: "buff_plunder", name: "Buff Plunder", description: "Steal three active buffs from your opponent. Locked-in upgrades stay put.", tier: 8, category: "draft" },
    stealBuffs(3, undefined, notLockedIn),
  ),
  def(
    { id: "meteor", name: "Meteor", description: "Destroy every enemy piece on one rank and one file that cross at a square you pick.", tier: 7, category: "attack" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick the impact square", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (let i = 0; i < 8; i++) {
          for (const sq of [SQ(i, RANK(c)), SQ(FILE(c), i)]) {
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
          }
        }
      },
    ),
  ),
  def(
    { id: "grand_resurrection", name: "Grand Resurrection", description: "Revive your queen and one minor piece to your half.", tier: 7, category: "pieces" },
    autoRevive(["q", ["n", "b"]]),
  ),
  def(
    { id: "world_lock", name: "World Lock", description: "Seal the border: your opponent cannot move any piece into your half of the board for their next 3 turns.", tier: 7, category: "protection", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const squares: Square[] = [];
      for (let sq = 0; sq < 64; sq++) if (inHalf(api.me, sq)) squares.push(sq);
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),
  def(
    { id: "titan", name: "Titan", description: "One piece gains amazon movement for the rest of the game and cannot be captured for your opponent's next 6 turns.", tier: 8, category: "movement", fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "q", self: true } },
    bindPiece("Choose the titan", bindCandidates(), { shieldTurns: 6, gen: amazonGen }),
  ),
  def(
    { id: "ruin", name: "Ruin", description: "Clear all enemy pawns, and destroy one enemy minor piece (or a rook if they have no minor).", tier: 7, category: "attack" },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        // Prefer a minor piece to destroy. If the enemy has none, degrade to a
        // rook so Ruin is never a dead pick. If they have neither (only pawns
        // and the king remain) the step is finishable, so the pawn sweep still
        // fires on its own; when a target does exist the pick stays required.
        const minors = mySquares(api.board, api.opp).filter((sq) =>
          ["n", "b"].includes(api.board.pieces[sq]!.type),
        );
        const squares = minors.length
          ? minors
          : mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type === "r");
        return {
          kind: "square",
          label: squares.length
            ? "Choose the enemy piece to destroy"
            : "Confirm to clear every enemy pawn",
          squares,
          ...(squares.length ? {} : { finishable: true }),
        };
      },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.removePiece(picks[0].square);
        for (const sq of mySquares(api.board, api.opp, "p")) api.removePiece(sq);
      },
    ),
  ),
  def(
    { id: "draft_tyranny", name: "Draft Tyranny", description: "Set both of your own next cards to tier 7, once.", tier: 7, category: "draft" },
    // Rebalance: forced tier lowered from 8 to 7, one band off the apex ceiling.
    instant((_inst, api) => {
      api.mine.flags.forceTier = 7;
    }),
  ),
  def(
    { id: "warp_sovereign", name: "Warp Sovereign", description: "Swap up to three pairs of your pieces, once. Stop after any pair.", tier: 7, category: "movement" },
    swapOwnPieces(undefined, 3),
  ),
  def(
    // freezeAllEnemies spares the king; the freezes are painted by the board.
    { id: "deep_freeze", name: "Deep Freeze", description: "A cold snap rolls over their homeland: every enemy piece except the king still in its own half is frozen for 2 of their turns. Pieces that already crossed the border escape it.", tier: 7, category: "tempo", fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        if (!inHalf(api.opp, sq)) continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),
  def(
    { id: "phoenix_line", name: "Phoenix Line", description: "Revive all your captured pawns to your 2nd rank, once.", tier: 7, category: "pieces" },
    revivePawnsToStart(8),
  ),
  def(
    { id: "rift_storm", name: "Rift Storm", description: "Teleport up to two of your pieces, your king aside, each to any empty square, then swap the squares of two enemy pieces caught in the churn, once.", tier: 7, category: "movement" },
    activated(
      (_inst, api, picks) => {
        const n = picks.length;
        // Phase 1 (picks 0..3): up to two of my pieces teleport (piece, dest).
        if (n < 4) {
          if (n % 2 === 0) {
            const usedFroms = picks.filter((_, i) => i % 2 === 0).map((k) => k.square);
            const squares = mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && !usedFroms.includes(sq),
            );
            return {
              kind: "square",
              label: `Choose a piece to teleport (${n / 2 + 1}/2)`,
              squares,
              ...(n > 0 ? { finishable: true } : {}),
            };
          }
          const from = picks[n - 1].square!;
          const usedDests = picks.filter((_, i) => i % 2 === 1).map((k) => k.square);
          return {
            kind: "square",
            label: "Teleport it to any empty square",
            squares: anyDestPawnSafe(api, from).filter(
              (sq) => !api.board.pieces[sq] && !usedDests.includes(sq),
            ),
          };
        }
        // Phase 2 (picks 4..5): swap two enemy pieces. If the board lacks two
        // swappable enemies, stop here so the teleports still resolve.
        if (n < 6) {
          const first = n === 5 ? picks[4].square : null;
          const squares = mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type !== "k" && sq !== first,
          );
          if (n === 4 && squares.length < 2) return null;
          if (n === 5 && squares.length < 1) return null;
          return {
            kind: "square",
            label: n === 4 ? "Choose the first enemy piece to swap" : "Choose the enemy piece to swap it with",
            squares,
            ...(n === 4 ? { finishable: true } : {}),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        // Resolve the self-teleports first (in order; destinations were checked
        // empty at pick time, so no two land on the same square).
        for (let i = 0; i + 1 < Math.min(picks.length, 4); i += 2) {
          const from = picks[i]?.square, to = picks[i + 1]?.square;
          if (from == null || to == null) continue;
          if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
        }
        // Then swap the two chosen enemy pieces, if both were picked.
        const x = picks[4]?.square, y = picks[5]?.square;
        if (x != null && y != null && x !== y) {
          const px = api.board.pieces[x], py = api.board.pieces[y];
          if (px && py && px.color === api.opp && py.color === api.opp) {
            api.board.pieces[x] = py;
            api.board.pieces[y] = px;
            api.bs.historyDiverged = true;
          }
        }
      },
    ),
  ),
  def(
    { id: "purge_realm", name: "Purge Realm", description: "Remove every enemy minor piece from one half of the board.", tier: 7, category: "attack" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick a square in the half to purge",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const top = RANK(picks[0].square) >= 4;
        for (const sq of mySquares(api.board, api.opp)) {
          if ((RANK(sq) >= 4) !== top) continue;
          const t = api.board.pieces[sq]!.type;
          if (t === "n" || t === "b") api.removePiece(sq);
        }
      },
    ),
  ),
  def(
    { id: "aegis", name: "Aegis", description: "Every one of your pieces except your king cannot be captured for 1 full turn.", tier: 6, category: "protection", boon: true },
    shieldArmy(1),
  ),
  def(
    { id: "godslayer_knight", requires: ["n"], name: "Godslayer Knight", description: "One knight moves as an amazon, is uncapturable, and explodes on capture, for 3 turns.", tier: 7, category: "movement", fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true } },
    bindPiece("Choose the knight", bindCandidates(["n"]), {
      turns: 3,
      // turns - 1: the +1 activation bump restores the shield to 3, so it
      // co-terminates with the movement grant rather than outlasting it.
      shieldTurns: 2,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via),
      explodeOnCapture: true,
    }),
  ),
  def(
    { id: "abyss", name: "Abyss", description: "Two squares you pick swallow any enemy piece except a king that enters, for the game.", tier: 5, category: "attack" },
    voidSquares(2, null),
  ),
  def(
    { id: "grand_retreat", name: "Grand Retreat", description: "Return your army to its free starting squares, once (blocked pieces stay put).", tier: 7, category: "movement" },
    activatedSimple((_inst, api) => reformArmy(api)),
  ),
  def(
    { id: "sovereign_draft", name: "Sovereign Draft", description: "Take both cards in your next draft, and that draft rolls one tier higher.", tier: 7, category: "draft" },
    // Overhaul balance pass: the old text ("take both cards in your next
    // draft") was an exact duplicate of Greed (wa_greed, tier 6) one tier
    // higher, i.e. strictly dominated. The sovereign now also lifts the offer
    // one tier (same lift as a banked skip, capped by the same rollOffer
    // rules), so tier 7 buys a real step over Greed.
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "nerf_reversal", name: "Nerf Reversal", description: "Turn your nerf against itself: remove it for good, and your whole army cannot be captured for your opponent's next 2 turns.", tier: 7, category: "nerf", fx: { motif: "ward", pieces: "all", self: true } },
    // The only nerf-removal card that also flips into an offensive boon: a brief
    // whole-army shield as the "inverse benefit" of shedding the handicap.
    instant((_inst, api) => {
      api.removeMyNerf();
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
    }),
  ),
  def(
    { id: "sabbatical", name: "Sabbatical", description: "Suspend your nerf for your next 10 turns.", tier: 7, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 10 });
    }),
  ),
  def(
    { id: "full_pardon", name: "Full Pardon", description: "Remove your nerf for good and take an extra move on your next turn. You cannot capture the king on the bonus move: your opponent replies first.", tier: 7, category: "nerf" },
    instant((_inst, api) => {
      api.removeMyNerf();
      api.bs.extraMoves[api.me] += 1;
    }),
  ),
];

// ---------------------------------------------------------------------------
// TIER 8 — game-warping, rare
// ---------------------------------------------------------------------------

const TIER8: Buff[] = [
  def(
    { id: "total_atomic", name: "Total Atomic", description: "Every capture by your pieces detonates two squares in every direction and each removed piece chains its own blast, for the game.", tier: 8, category: "attack" },
    captureExplosion({ chain: true, radius: 2 }),
  ),
  def(
    { id: "amazon_army", requires: ["n", "b"], name: "Amazon Army", description: "All your knights and bishops become amazons for the game.", tier: 8, category: "movement", fx: { motif: "empower", pieces: ["n", "b"], moveAs: "q", self: true } },
    permanentAugment((_m, inst, api) =>
      ["n", "b"].flatMap((t) =>
        mySquares(api.board, api.me, t as PieceType).flatMap((sq) => [
          ...slideMoves(api.board, sq, ALL_DIRS, inst.id),
          ...leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id),
        ]),
      ),
    ),
  ),
  def(
    { id: "divine_legion", name: "Divine Legion", description: "Add a queen to your pocket, then spend a later turn to drop it onto any empty square.", tier: 7, category: "pieces" },
    instant((_inst, api) => grantInventory(api, "q", 1)),
  ),
  def(
    { id: "mass_mind_control", name: "Mass Mind Control", description: "Take control of two enemy pieces of any type below queen, for the game.", tier: 8, category: "pieces" },
    convertEnemies(2, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "total_annihilation", name: "Total Annihilation", description: "Choose any square: every enemy piece except a king standing on it or beside it is removed from the board. Shielded pieces resist the blast.", tier: 8, category: "attack" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the blast center",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const p = api.board.pieces[c];
        const shielded = api.bs.effects.some(
          (e) =>
            e.kind === "shield" &&
            e.owner === api.opp &&
            (e.turns == null || e.turns > 0) &&
            (e.squares ? e.squares.includes(c) : true),
        );
        if (p && p.color === api.opp && p.type !== "k" && !shielded) api.removePiece(c);
        explodeAt(api, c);
      },
    ),
  ),
  def(
    { id: "immortal_king", name: "Immortal King", description: "Your king cannot be captured for your opponent's next 8 turns. You can still lose by running out of moves.", tier: 8, category: "protection" },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 8 });
    }),
  ),
  def(
    { id: "absolute_nullify", name: "Absolute Nullify", description: "Cancel your opponent's unused and temporary buffs and block their next draft, but they gain a reroll in return. Locked-in upgrades resist.", tier: 8, category: "draft" },
    // Rebalance: the victim now banks a reroll as compensation, softening the
    // double hit of a wipe plus a blocked draft by roughly a quarter.
    instant((_inst, api) => {
      broadNullify(api);
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),
  def(
    { id: "queen_storm", name: "Queen Storm", description: "Promote all your pawns on your 4th rank or beyond to queens.", tier: 8, category: "pieces" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (relRank(api.me, sq) >= 4) api.setPieceType(sq, "q");
      }
    }),
  ),
  def(
    { id: "reality_warp", name: "Reality Warp", description: "Rewrite the rules of matter: any two of your pieces, king aside, become queens.", tier: 8, category: "pieces" },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose a piece to rewrite into a queen (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t !== "k" && t !== "q" && !picks.some((k) => k.square === sq);
              }),
            },
      (_inst, api, picks) => {
        for (const k of picks) if (k.square != null) api.setPieceType(k.square, "q");
      },
    ),
  ),
  def(
    // Board already paints barred squares; square-scoped, no pieces field.
    { id: "sundering", name: "Sundering", description: "Three files become impassable to enemies for the rest of the game.", tier: 8, category: "protection", fx: { motif: "blindfold" } },
    barLine("file", null, 3),
  ),
  def(
    // Demoted from the tier-9 apex band (owner call): a five-turn royal
    // rampage is huge but earnable in the normal tier-8 pool.
    { id: "divine_right", icon: "Crown", name: "Divine Right", description: "For your next 5 turns your king may move and capture as a queen, and it cannot be captured.", tier: 8, category: "movement", flavor: "By the grace of no one in particular.", fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true } },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst, api) => {
        // One activation only; re-use is a guarded no-op.
        if (inst.state.turns != null) return;
        inst.state.turns = 5;
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 5 });
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
  def(
    // Distinct from Tempo Theft (T3, the clean single skip): three stolen
    // turns, but the prison is FRAGILE. Any capture you make while it holds
    // shatters it and refunds the remaining skips, so you must choose between
    // quiet maneuvering with total tempo or cashing in material and waking
    // your opponent early.
    { id: "time_prison", name: "Time Prison", description: "Your opponent skips their next three turns, but the prison is fragile: if you capture anything while it holds, it shatters and their remaining skipped turns are refunded.", tier: 8, category: "tempo", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst, api) => {
        api.bs.skips[api.opp] += 3;
        inst.state.active = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.active) return;
        if (api.bs.skips[api.opp] <= 0) {
          // Served in full: the prison dissolves on its own.
          inst.spent = true;
          return;
        }
        if (move.color === api.me && move.captured && move.captured !== "k") {
          api.bs.skips[api.opp] = 0;
          inst.spent = true;
        }
      },
      status: (inst) => (inst.state.active ? "holds while you hold your fire" : null),
    },
  ),
  def(
    { id: "divine_fortress", name: "Divine Fortress", description: "Every piece on your half of the board, your king aside, is uncapturable for 3 turns.", tier: 8, category: "protection" },
    shieldZone(
      (api) => Array.from({ length: 64 }, (_, i) => i).filter((sq) => inHalf(api.me, sq)),
      3,
    ),
  ),
  def(
    { id: "blitzkrieg", name: "Blitzkrieg", description: "Take four moves in a row, once. You cannot capture the king during these bonus moves: your opponent replies first.", tier: 8, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    extraMovesNow(3),
  ),
  def(
    { id: "total_plunder", name: "Total Plunder", description: "Steal all your opponent's active buffs except locked-in upgrades.", tier: 8, category: "draft" },
    instant((_inst, api) => {
      const stolen = api.theirs.buffs.filter(
        (b) => !b.spent && !b.nullified && !boundUpgrade(b),
      );
      api.theirs.buffs = api.theirs.buffs.filter(
        (b) => b.spent || b.nullified || boundUpgrade(b),
      );
      api.mine.buffs.push(...stolen);
    }),
  ),
  def(
    { id: "cataclysmic_meteor", name: "Cataclysmic Meteor", description: "Destroy every enemy piece within a 3x3 area you pick except the king.", tier: 8, category: "attack" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick the center of the impact zone", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (const df of [-1, 0, 1]) {
          for (const dr of [-1, 0, 1]) {
            const f = FILE(c) + df, r = RANK(c) + dr;
            if (!inBoard(f, r)) continue;
            const sq = SQ(f, r);
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
          }
        }
      },
    ),
  ),
  def(
    { id: "full_resurrection", name: "Full Resurrection", description: "Revive your queen, both rooks, and one minor piece to your half.", tier: 8, category: "pieces" },
    autoRevive(["q", "r", "r", ["n", "b"]]),
  ),
  def(
    // Board already paints king_only; fx carried for consistency.
    { id: "world_end", name: "World End", description: "The edges of the world crumble away: your opponent can never move onto the outer rim of the board again, for the rest of the game.", tier: 8, category: "tempo", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const squares: Square[] = [];
      for (let sq = 0; sq < 64; sq++) {
        if (FILE(sq) === 0 || FILE(sq) === 7 || RANK(sq) === 0 || RANK(sq) === 7) squares.push(sq);
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
    }),
  ),
  // Living God moved to the tier-9 apex band (owner request): see
  // buffs/tier9.ts. Apex cards never roll in the normal pools, so it now
  // arrives only through the apex grants (banking at the top tier, Jackpot).
  def(
    { id: "void_realm", name: "The Void Realm", description: "Three squares you pick become voids for the game: any enemy piece except a king that enters one, or ends its move beside one, is swallowed.", tier: 8, category: "attack" },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once the voids are placed they never move.
      targets: (inst, api, picks) =>
        picks.length >= 3 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: `Choose a void square (${picks.length + 1}/3)`,
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.squares != null) return;
        inst.state.squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color !== api.opp || move.piece === "k") return;
        const near = squares.some(
          (v) =>
            Math.abs(FILE(v) - FILE(move.to)) <= 1 && Math.abs(RANK(v) - RANK(move.to)) <= 1,
        );
        if (near) api.removePiece(move.to);
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return "activate to place";
        const names = squares.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
        return `swallowing at and beside ${names}`;
      },
    },
  ),
  def(
    { id: "grand_reset", name: "Grand Reset", description: "Add replacements to your pocket until your army would be back to full starting strength, then drop them onto empty squares on later turns.", tier: 8, category: "pieces" },
    instant((_inst, api) => {
      const full: [PieceType, number][] = [["q", 1], ["r", 2], ["b", 2], ["n", 2], ["p", 8]];
      for (const [type, want] of full) {
        const missing = want - mySquares(api.board, api.me, type).length;
        if (missing > 0) grantInventory(api, type, missing);
      }
    }),
  ),
  def(
    { id: "draft_supremacy", name: "Draft Supremacy", description: "Take both cards in each of your next two drafts while your opponent's next draft is skipped.", tier: 8, category: "draft" },
    // Rebalance: the opponent-denial halved from two skipped drafts to one
    // (blockedDrafts +2 -> +1); the self takeBoth+2 stays, trimming ~25%.
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 2;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  def(
    // Mass petrify: walnut is painted by the board, and pawns are left free.
    { id: "eternal_freeze", name: "Eternal Freeze", description: "Turn every enemy knight, bishop, rook, and queen to stone for 3 of their turns: each can only shuffle one square at a time. Enemy pawns are left free.", tier: 8, category: "tempo", fx: { motif: "anchor", pieces: ["n", "b", "r", "q"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "p" || t === "k") continue;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
      }
    }),
  ),
  def(
    { id: "phoenix_rebirth", name: "Phoenix Rebirth", description: "Revive every captured piece you have to your half, once.", tier: 8, category: "pieces" },
    instant((_inst, api) => {
      const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
        (a, b) => relRank(api.me, a) - relRank(api.me, b),
      );
      for (const type of ["q", "r", "b", "n", "p"] as PieceType[]) {
        while (revivable(api, type) > 0) {
          const at = spots.findIndex((sq) => type !== "p" || pawnRankOk(sq));
          if (at < 0) break;
          api.place(spots.splice(at, 1)[0], type, api.me);
          markRevived(api, type);
        }
      }
    }),
  ),
  def(
    { id: "total_warp", name: "Total Warp", description: "Teleport your whole army except the king anywhere you like, once. Pawns stay off the first and last ranks.", tier: 8, category: "movement" },
    relocateMany(15, anyDestPawnSafe),
  ),
  def(
    { id: "extinction", name: "Extinction", description: "Remove every enemy minor and pawn piece from the board.", tier: 8, category: "attack" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (["p", "n", "b"].includes(api.board.pieces[sq]!.type)) api.removePiece(sq);
      }
    }),
  ),
  def(
    // Distinct from Aegis (T6, the clean 1-turn army shield): the absolute
    // version is the only shield that also covers the KING (king_safe), so for
    // two turns literally nothing of yours can be taken. The engine's
    // invulnerable-attacker guard still bars shielded pieces from delivering
    // the king capture, so it defends without ending the game by itself.
    { id: "absolute_aegis", name: "Absolute Aegis", description: "Every one of your pieces cannot be captured for 2 full turns, and this time that includes your king.", tier: 8, category: "protection", boon: true },
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  def(
    { id: "endless_turn", name: "Endless Turn", description: "Take moves until you make a capture, once (minimum one move).", tier: 8, category: "tempo", fx: { motif: "rally", pieces: "all", self: true } },
    {
      kind: "activated",
      freeAction: true,
      spendOnUse: false,
      effect: (inst) => {
        inst.state.active = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.active || move.color !== api.me) return;
        const count = ((inst.state.count as number) ?? 0) + 1;
        inst.state.count = count;
        // End on a capture, or after a bounded run of quiet moves so an
        // unreachable capture (e.g. only a lone enemy king left) cannot grant
        // extra moves forever and hang the turn.
        if (move.captured || count >= 16) inst.spent = true;
        else api.bs.extraMoves[api.me] += 1;
      },
      status: (inst) => (inst.state.active ? "moving until you capture" : null),
    },
  ),
  def(
    { id: "checkmate_denial", name: "Checkmate Denial", description: "Your king cannot be captured for the next 5 turns.", tier: 7, category: "protection", boon: true },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 5 });
    }),
  ),
  def(
    { id: "genesis", name: "Genesis", description: "Reset the entire board to the opening position, once. Every lingering effect is washed away.", tier: 8, category: "pieces" },
    activatedSimple((_inst, api) => {
      const BACK: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
      // Whole-board rewrite: uncounted, or the fresh armies would register
      // as 32 captures and corrupt every revive pool.
      // (Buff-mode purity overhaul: the old "your nerf removed" rider is gone.
      // Genesis is buff-mode only, where there is no nerf to remove; the rider
      // was dead text there and an undocumented legacy-mode kindness.)
      for (let sq = 0; sq < 64; sq++) api.removePiece(sq, { uncounted: true });
      for (let f = 0; f < 8; f++) {
        api.place(SQ(f, 0), BACK[f], "w");
        api.place(SQ(f, 1), "p", "w");
        api.place(SQ(f, 6), "p", "b");
        api.place(SQ(f, 7), BACK[f], "b");
      }
      api.bs.effects = [];
      api.board.castling.wk = api.board.castling.wq = true;
      api.board.castling.bk = api.board.castling.bq = true;
      api.board.epTarget = null;
      api.board.halfmove = 0;
    }),
  ),
  // Nerf-modifiers (cross-cutting)
  def(
    { id: "unshackled_wrath", name: "Unshackled Wrath", description: "Remove your nerf for good. Your opponent skips their next turn.", tier: 7, category: "nerf" },
    instant((_inst, api) => {
      api.removeMyNerf();
      api.bs.skips[api.opp] += 1;
    }),
  ),
  def(
    { id: "transcendence", name: "Transcendence", description: "Remove your nerf for good. Your next draft shows three cards.", tier: 8, category: "nerf" },
    // Rebalance: dropped the extra tier bump; you still shed the nerf and see a
    // wider (three-card) offer, but no longer also roll a tier higher.
    instant((_inst, api) => {
      api.removeMyNerf();
      api.mine.flags.prepThree = true;
    }),
  ),
];

// ---------------------------------------------------------------------------
// HEXES (nerf mode only): curses you cast on your OPPONENT, the mirror image
// of buff mode's self-buffs. Piece hexes bend or lock down their army; the
// drawback intensifiers stack a small extra handicap on top of their nerf.
// Safety rails: kings are never frozen or turned into walnuts, and every
// move filter either keeps a fallback move or leans on the forced-pass rule,
// so a hex can never soft-lock the game.
// ---------------------------------------------------------------------------

/** Instant: every enemy piece of the given types becomes a walnut (an inert
 * shell that cannot move) for `turns` of its owner's turns. Kings never. */
function walnutAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
    }
  });
}

/** One step from `from` toward `toward` (Chebyshev direction), or null. */
function stepToward(from: Square, toward: Square): Square | null {
  const df = Math.sign(FILE(toward) - FILE(from));
  const dr = Math.sign(RANK(toward) - RANK(from));
  if (df === 0 && dr === 0) return null;
  const f = FILE(from) + df, r = RANK(from) + dr;
  return inBoard(f, r) ? SQ(f, r) : null;
}

/** One square back toward `color`'s home rank, or null at the board edge. */
function homeStep(sq: Square, color: Color): Square | null {
  const back = sq - fwdOf(color);
  return back >= 0 && back < 64 ? back : null;
}

const HEXES: Buff[] = [
  def(
    { id: "heavy_boots", name: "Heavy Boots", description: "Your opponent's pawns cannot double-step for their next 4 turns.", tier: 1, category: "hex", fx: { motif: "anchor", pieces: ["p"] } },
    timedOppFilter(4, (moves) =>
      moves.filter((m) => !(m.piece === "p" && Math.abs(RANK(m.to) - RANK(m.from)) === 2)),
    ),
  ),
  def(
    { id: "toll_gate", name: "Toll Gate", description: "Your opponent cannot capture en passant for their next 6 turns.", tier: 1, category: "hex", fx: { motif: "muzzle", pieces: ["p"] } },
    timedOppFilter(6, (moves) =>
      moves.filter(
        (m) => !(m.piece === "p" && m.capturedSquare != null && m.capturedSquare !== m.to),
      ),
    ),
  ),
  def(
    { id: "cold_snap", name: "Cold Snap", description: "Freeze one enemy piece (not the king) for 1 of its owner's turns.", tier: 1, category: "hex" },
    freezeTarget(1),
  ),
  def(
    { id: "butter_bishops", name: "Butter Bishops", description: "Your opponent's bishops slide at most 2 squares for their next 4 turns.", tier: 2, category: "hex", fx: { motif: "anchor", pieces: ["b"] } },
    timedOppFilter(4, (moves) =>
      moves.filter(
        (m) =>
          m.piece !== "b" ||
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 2,
      ),
    ),
  ),
  def(
    { id: "lame_horses", name: "Lame Horses", description: "Your opponent's knights go lame and refuse to turn around: they cannot move backward for their next 4 turns.", tier: 2, category: "hex", fx: { motif: "anchor", pieces: ["n"] } },
    timedOppFilter(4, (moves, _inst, api) =>
      moves.filter(
        (m) => m.piece !== "n" || relRank(api.opp, m.to) >= relRank(api.opp, m.from),
      ),
    ),
  ),
  def(
    // Tempo tax on captures; kings are exempt from the freeze, so no "all".
    { id: "twist_the_knife", name: "Twist the Knife", description: "Their drawback bites back: for your opponent's next 3 captures, the capturing piece is frozen for 1 of their turns.", tier: 3, category: "hex", fx: { motif: "slow", pieces: ["p", "n", "b", "r", "q"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        // Kings never freeze; a royal capture slips the knife.
        if (move.piece === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
        // Two ticks: this effect loses one tick to the capturing move itself
        // (timers tick right after onMovePlayed), leaving the promised one
        // frozen turn. With a single tick the freeze evaporated immediately.
        addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2 });
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} enemy captures left`,
    },
  ),
  def(
    // Trap-family buff (owner call): visible to both players now, so the
    // window grew from 4 to 6 of your turns, and the freeze really delivers
    // the promised 2 turns (the old 2-tick timer lost one tick to the
    // triggering move itself).
    // Square-scoped trap zone, so no pieces field; the freezes it lands are
    // painted by the board.
    { id: "flypaper_file", name: "Flypaper File", description: "Coat one file in flypaper, visible to both players: for your next 6 turns, enemy pieces (kings excepted) that enter that file are stuck and cannot move for 2 of their turns.", tier: 4, category: "hex", fx: { motif: "blindfold" } },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once a file is limed it stays limed.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to lime",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        if (picks[0]?.square != null) {
          inst.state.sq = picks[0].square;
          inst.state.turns = 6;
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && move.piece !== "k" && FILE(move.to) === FILE(sq)) {
          // Three ticks: this effect loses one tick to the triggering move
          // itself (timers tick right after onMovePlayed), leaving the
          // promised 2 stuck turns.
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "glue" });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to choose a file";
        return `file ${"abcdefgh"[FILE(sq)]} is sticky, ${turnsLeft(inst)} of your turns left`;
      },
    },
  ),
  def(
    { id: "dead_letter", name: "Dead Letter", description: "Your opponent's next draft is skipped, but they gain one reroll in return.", tier: 4, category: "hex" },
    // Rebalance: the skip now comes with a consolation reroll for the victim,
    // trimming the raw draft-denial by roughly a quarter.
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),
  def(
    // Board already paints walnuts; fx carried for consistency.
    // The middle rung of the capturer-punishment ladder: Twist the Knife
    // (tier 3) freezes the capturer for 1 turn, this walnuts it for 3, and
    // Molten Heart (tier 7) destroys it outright.
    { id: "walnut_queen", name: "Walnut Curse", description: "Their greed turns to wood: for your opponent's next 2 captures, the capturing piece becomes a walnut for 3 of their turns, able only to shuffle one square at a time. Kings shrug the curse off.", tier: 5, category: "hex", fx: { motif: "jail", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.piece === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
        const p = api.board.pieces[move.to];
        if (p && p.color === api.opp && p.type !== "k") {
          // Added during their own move, so the shared post-move tick eats one
          // turn immediately: 4 here leaves 3 of their turns walnutted.
          addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 4 });
        }
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} captures left`,
    },
  ),
  def(
    // Rest-a-turn tempo tax; the filter can touch any piece, king included.
    { id: "ball_and_chain", name: "Ball and Chain", description: "Their drawback grows teeth: for your opponent's next 5 turns, the piece they just moved must rest a turn before moving again.", tier: 5, category: "hex", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        const last = inst.state.lastTo as Square | undefined;
        if (last == null) return moves;
        const rest = moves.filter((m) => m.from !== last);
        // Never strand them with zero moves purely from this hex.
        return rest.length > 0 ? rest : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        inst.state.lastTo = move.to;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  def(
    // Mechanically king-only while the king can move: the rest of the army
    // is jailed.
    { id: "royal_summons", name: "Royal Summons", description: "For your opponent's next 2 turns, they must move their king if it has a legal move.", tier: 5, category: "hex", fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] } },
    timedOppFilter(2, (moves) => {
      const kingMoves = moves.filter((m) => m.piece === "k");
      // A boxed-in king waives the summons instead of soft-locking the game.
      return kingMoves.length > 0 ? kingMoves : moves;
    }),
  ),
  def(
    { id: "creeping_frost", name: "Creeping Frost", description: "Freeze three enemy pieces (not the king) for 2 of their owner's turns.", tier: 6, category: "hex" },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to freeze (${picks.length + 1}/3)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square != null) {
            addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns: 2 });
          }
        }
      },
    ),
  ),
  def(
    // Board already paints walnuts; fx carried for consistency.
    { id: "walnut_court", name: "Walnut Court", description: "The whole court hardens where it sits: every enemy piece except the king still on its own back rank turns into a walnut for 3 of their turns. A walnut can only shuffle one square at a time.", tier: 7, category: "hex", fx: { motif: "jail", pieces: ["n", "b", "r", "q"] } },
    instant((_inst, api) => {
      const back = api.opp === "w" ? 0 : 7;
      for (const sq of mySquares(api.board, api.opp)) {
        if (RANK(sq) !== back) continue;
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
      }
    }),
  ),
  def(
    // fx covers the turn skip; the draft denial half shows no board motif.
    { id: "grand_malediction", name: "Grand Malediction", description: "Your opponent skips their next turn, and the next card they draft arrives nullified and inert.", tier: 7, category: "hex", fx: { motif: "slow", pieces: "all" } },
    // Rebalance: incoming-nullify halved from their next two drafted cards to
    // one (nullifyIncoming +2 -> +1), keeping the turn skip.
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
];

// ---------------------------------------------------------------------------
// ITEMS: playful consumables drafted in BOTH modes (nerf mode's boon share
// and buff mode's general pool). Light, readable, one clear effect each.
// ---------------------------------------------------------------------------

const ITEMS: Buff[] = [
  def(
    { id: "walnut_shell", name: "Walnut Shell", description: "Crack it open: free one of your pieces from any freeze or walnut hex.", tier: 1, category: "item" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose a piece to crack free",
              squares: mySquares(api.board, api.me).filter((sq) =>
                api.bs.effects.some(
                  (e) =>
                    (e.kind === "freeze" || e.kind === "walnut") &&
                    e.owner === api.me &&
                    e.sq === sq &&
                    e.turns > 0,
                ),
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.bs.effects = api.bs.effects.filter(
          (e) =>
            !((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me && e.sq === sq),
        );
      },
    ),
  ),
  def(
    { id: "apple", name: "Apple", description: "Feed one of your pieces: it cannot be captured for your opponent's next 2 turns and may immediately step one square to an empty square beside it.", tier: 2, category: "item" },
    activated(
      (_inst, api, picks) => {
        const openSteps = (from: Square) =>
          stepDest(api, from).filter(
            (d) => !api.board.pieces[d] && (api.board.pieces[from]?.type !== "p" || pawnRankOk(d)),
          );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose a piece to feed",
            squares: mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]!.type !== "k"),
          };
        }
        if (picks.length === 1 && picks[0].square != null) {
          const steps = openSteps(picks[0].square);
          if (steps.length === 0) return null;
          return {
            kind: "square",
            label: "Step one square to an empty square, or finish to stay put",
            squares: steps,
            finishable: true,
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square;
        if (from == null) return;
        const p = api.board.pieces[from];
        if (!p || p.type === "k") return;
        let at = from;
        const to = picks[1]?.square;
        if (
          to != null &&
          !api.board.pieces[to] &&
          adjacent(from, to) &&
          (p.type !== "p" || pawnRankOk(to))
        ) {
          api.relocate(from, to);
          at = to;
        }
        addEffect(api, { kind: "shield", owner: api.me, squares: [at], turns: 2 });
      },
    ),
  ),
  def(
    // Trap-family buff (owner call): peels are visible to both players now, so
    // the card trades surprise for board control: TWO peels per card, and a
    // slipped piece is also dazed (frozen) for one of its owner's turns.
    { id: "banana_peel", name: "Banana Peel", description: "Toss peels on two empty squares, visible to both players. The first enemy piece other than the king to step on each slips one square back toward its home rank and is too dazed to move on its owner's next turn.", tier: 2, category: "item" },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once tossed, the peels stay where they landed.
      targets: (inst, api, picks) => {
        if (picks.length >= 2 || inst.state.sqs != null || inst.state.sq != null) return null;
        return {
          kind: "square",
          label: `Toss a peel on an empty square (${picks.length + 1}/2)`,
          squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
          // A single peel is already a complete effect; the second is optional.
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      effect: (inst, _api, picks) => {
        if (inst.state.sqs != null || inst.state.sq != null) return;
        const sqs = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (sqs.length) inst.state.sqs = sqs;
      },
      onMovePlayed: (inst, move, api) => {
        // Legacy saved games stored a single peel in state.sq; read both.
        const sqs =
          (inst.state.sqs as Square[] | undefined) ??
          (inst.state.sq != null ? [inst.state.sq as Square] : undefined);
        if (!sqs?.length) return;
        if (move.color !== api.opp || move.piece === "k" || !sqs.includes(move.to)) return;
        const sq = move.to;
        const rest = sqs.filter((s) => s !== sq);
        inst.state.sqs = rest;
        inst.state.sq = undefined;
        if (rest.length === 0) inst.spent = true;
        const back = homeStep(sq, move.color);
        // The slip fizzles when the square behind is occupied or off-board
        // (and the relocate backstop refuses pawns slipping onto rank 1/8).
        const slipped = back != null && !api.board.pieces[back];
        if (slipped) api.relocate(sq, back!);
        // Dazed: the piece skips its owner's next turn. Two ticks, because
        // this effect loses one tick to the triggering move itself (timers
        // tick right after onMovePlayed).
        addEffect(api, { kind: "freeze", sq: slipped ? back! : sq, owner: api.opp, turns: 2, skin: "stun" });
      },
      status: (inst) => {
        const sqs =
          (inst.state.sqs as Square[] | undefined) ??
          (inst.state.sq != null ? [inst.state.sq as Square] : undefined);
        if (!sqs?.length) return "activate to toss the peels";
        const names = sqs.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
        return `peels waiting on ${names}`;
      },
    },
  ),
  def(
    { id: "trampoline", name: "Trampoline", description: "Bounce one of your pieces (not the king) to any empty square within two squares of it.", tier: 3, category: "item" },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to bounce",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        const from = picks[0].square!;
        const isPawn = api.board.pieces[from]?.type === "p";
        return {
          kind: "square",
          label: "Choose where it lands",
          squares: emptySquares(
            api.board,
            (sq) =>
              sq !== from &&
              Math.abs(FILE(sq) - FILE(from)) <= 2 &&
              Math.abs(RANK(sq) - RANK(from)) <= 2 &&
              (!isPawn || pawnRankOk(sq)),
          ),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
      },
    ),
  ),
  def(
    { id: "magnet", name: "Magnet", description: "Drag one enemy piece (not the king) one square toward your king.", tier: 3, category: "item" },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const k = mySquares(api.board, api.me, "k")[0];
        const squares =
          k == null
            ? []
            : mySquares(api.board, api.opp).filter((sq) => {
                if (api.board.pieces[sq]!.type === "k") return false;
                const step = stepToward(sq, k);
                return step != null && !api.board.pieces[step];
              });
        return { kind: "square", label: "Choose the enemy piece to pull", squares };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        const k = mySquares(api.board, api.me, "k")[0];
        if (sq == null || k == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        const step = stepToward(sq, k);
        if (step != null && !api.board.pieces[step]) api.relocate(sq, step);
      },
    ),
  ),
  def(
    { id: "firecracker", name: "Firecracker", description: "Startle one enemy piece (not the king): it retreats one square toward its home rank.", tier: 4, category: "item" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to startle",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const p = api.board.pieces[sq]!;
                if (p.type === "k") return false;
                const back = homeStep(sq, api.opp);
                return (
                  back != null &&
                  !api.board.pieces[back] &&
                  (p.type !== "p" || pawnRankOk(back))
                );
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        const back = homeStep(sq, api.opp);
        if (back != null && !api.board.pieces[back]) api.relocate(sq, back);
      },
    ),
  ),
  def(
    { id: "coffee", name: "Coffee", description: "Knock it back: take two extra moves right now, but the jitters hand your opponent one extra move on their reply.", tier: 4, category: "item", flavor: "Triple shot. No regrets until move three." },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        api.bs.extraMoves[api.opp] += 1;
      }),
      freeAction: true,
    },
  ),
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const ALL_BUFFS: Buff[] = [
  ...TIER1,
  ...TIER2,
  ...TIER3,
  ...TIER4,
  ...TIER5,
  ...TIER6,
  ...TIER7,
  ...TIER8,
  ...HEXES,
  ...NEW_HEXES,
  ...BOON_WAVE2,
  ...BOON_WAVE3,
  ...FUNNY_CARDS,
  ...FANTASY_CARDS,
  ...MYSTIC_CARDS,
  ...WILD_CARDS,
  ...CROSSREF_CARDS,
  ...PT_CARDS,
  ...BRAINROT,
  ...PERSONAL_CARDS,
  ...NEWJEANS_CARDS,
  ...ITEMS,
  ...OVERHAUL_CARDS,
  ...TIER9,
  ...TIER10,
];

export const BUFF_BY_ID: Record<string, Buff> = Object.fromEntries(
  ALL_BUFFS.map((b) => [b.id, b]),
);

// Publish the id->card map into the cycle-free registry so card modules can look
// a card up by id without importing this file (which would cycle). See registry.ts.
buffRegistry.byId = BUFF_BY_ID;

export const IMPLEMENTED_BUFFS: Buff[] = ALL_BUFFS.filter((b) => b.implemented);

/** Draftable pool per tier (index 1..8; index 0 unused). */
export const BUFF_POOL_BY_TIER: Buff[][] = Array.from({ length: 9 }, (_, t) =>
  IMPLEMENTED_BUFFS.filter((b) => b.tier === t),
);
