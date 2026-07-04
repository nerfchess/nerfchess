import { Buff, BuffApi, BuffCategory, BuffInstance, BuffPick } from "../buff";
import { Tier } from "../nerf";
import { Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  addEffect,
  addNovel,
  augment,
  barLine,
  emptySquares,
  extraMovesNow,
  freezeAllEnemies,
  freezeTarget,
  inHalf,
  instant,
  leapMoves,
  markRevived,
  mySquares,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
  shieldZone,
  skipOpponent,
  slideMoves,
  stealBuffs,
  teleportMoves,
  timedAugment,
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
      out.push({ ...pawnMove(api, sq, two, inst.id), isDoublePawn: true });
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

/** Instant: auto-revive the given piece types (as many as revivable) onto
 * empty squares in my half, filling from my back rank outward. */
function autoRevive(specs: PieceType[]): Mech {
  return instant((_inst, api) => {
    const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
      (a, b) => relRank(api.me, a) - relRank(api.me, b),
    );
    for (const type of specs) {
      if (revivable(api, type) <= 0) continue;
      const sq = spots.shift();
      if (sq == null) return;
      api.place(sq, type, api.me);
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

/** Activated: pick two of my pieces and swap their positions. */
function swapOwnPieces(types?: PieceType[]): Mech {
  const candidates = (api: BuffApi) =>
    mySquares(api.board, api.me).filter(
      (sq) => !types || types.includes(api.board.pieces[sq]!.type),
    );
  return activated(
    (_inst, api, picks) =>
      picks.length >= 2
        ? null
        : {
            kind: "square",
            label: picks.length === 0 ? "Choose the first piece" : "Choose the piece to swap with",
            squares: candidates(api).filter((sq) => !picks.some((k) => k.square === sq)),
          },
    (_inst, api, picks) => {
      const a = picks[0]?.square, b = picks[1]?.square;
      if (a == null || b == null) return;
      const pa = api.board.pieces[a];
      api.board.pieces[a] = api.board.pieces[b];
      api.board.pieces[b] = pa;
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
        if (k.buffIndex != null && api.theirs.buffs[k.buffIndex]) {
          api.theirs.buffs[k.buffIndex].nullified = true;
        }
      }
    },
  );
}

/** True when a held buff is an already-online permanent: a piece-bound
 * upgrade that has been attached (God Knight and friends) or a permanent
 * passive engine with no charges or timer. These are build-arounds the
 * opponent invested in; broad nullify effects leave them alone. */
function onlinePermanent(b: BuffInstance): boolean {
  const d = BUFF_BY_ID[b.id];
  if (!d) return false;
  if (d.kind === "activated") return d.spendOnUse === false && b.state.sq != null;
  if (d.kind === "passive") return b.state.turns == null && b.state.charges == null;
  return false;
}

/** Broad nullify: cancels unused activated cards and temporary passives.
 * Online permanents resist; only targeted counters like Sever remove those. */
function broadNullify(api: BuffApi) {
  for (const b of api.theirs.buffs) {
    if (!b.spent && !b.nullified && !onlinePermanent(b)) b.nullified = true;
  }
}

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
    { id: "pawn_push", name: "Pawn Push", description: "One pawn can move two squares forward on any turn.", tier: 1, category: "movement" },
    permanentAugment(doubleStepGen),
  ),
  def(
    { id: "wazir_rook", name: "Wazir Rook", description: "One rook may also step one square diagonally.", tier: 1, category: "movement" },
    pieceBound("r", "Choose the rook", (board, sq, via) => slideMoves(board, sq, DIAG_DIRS, via, 1)),
  ),
  def(
    { id: "ferz_king", name: "Ferz King", description: "Your king may move two squares diagonally, once per game.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) =>
        leapMoves(api.board, sq, [[2, 2], [2, -2], [-2, 2], [-2, -2]], inst.id),
      ),
    ),
  ),
  def(
    { id: "extra_glance", name: "Extra Glance", description: "See your opponent's nerf for the rest of the game.", tier: 1, category: "info" },
    instant((_inst, api) => { api.mine.oppNerfRevealed = true; }),
  ),
  def(
    { id: "castle_early", name: "Castle Early", description: "Castle even if your king has already moved once.", tier: 1, category: "movement" },
    instant((_inst, api) => api.restoreCastling()),
  ),
  def(
    { id: "pawn_shield", name: "Pawn Shield", description: "One pawn cannot be captured for 3 turns.", tier: 1, category: "protection" },
    shieldTarget(3, ["p"]),
  ),
  def({ id: "free_retreat", name: "Free Retreat", description: "Undo your last move once, before your opponent replies.", tier: 1, category: "tempo" }),
  def(
    { id: "peek", name: "Peek", description: "See your opponent's next buff options.", tier: 1, category: "info" },
    instant((_inst, api) => { api.mine.flags.seeOppCards = true; }),
  ),
  def(
    { id: "loyal_pawn", name: "Loyal Pawn", description: "One pawn promotes on the 7th rank instead of the 8th.", tier: 1, category: "pieces" },
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
    { id: "quiet_march", name: "Quiet March", description: "One pawn can move backward one square, once.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const back = sq - fwdOf(api.me);
        return back >= 0 && back < 64 && !api.board.pieces[back]
          ? [pawnMove(api, sq, back, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "pawn_swap", name: "Pawn Swap", description: "Swap two of your own adjacent pawns, once.", tier: 1, category: "movement" },
    swapOwnPieces(["p"]),
  ),
  def(
    { id: "little_leap", name: "Little Leap", description: "One pawn jumps a single blocking piece directly ahead, once.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        return two >= 0 && two < 64 && api.board.pieces[one] && !api.board.pieces[two]
          ? [pawnMove(api, sq, two, inst.id)]
          : [];
      }),
    ),
  ),
  def({ id: "scout", name: "Scout", description: "Reveal one random buff your opponent holds.", tier: 1, category: "info" }),
  def({ id: "steady_hand", name: "Steady Hand", description: "Cannot be checked by a knight for 3 turns.", tier: 1, category: "protection" }),
  def(
    { id: "escape_hatch", name: "Escape Hatch", description: "Your king swaps places with one of its own pawns, once.", tier: 1, category: "movement" },
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
      },
    ),
  ),
  def(
    { id: "second_wind", name: "Second Wind", description: "One captured pawn returns to its start square, once.", tier: 1, category: "pieces" },
    reviveOne(["p"], (api) => (sq) => RANK(sq) === (api.me === "w" ? 1 : 6)),
  ),
  def(
    { id: "diagonal_step", name: "Diagonal Step", description: "Your king moves like a bishop for one move.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "sidestep", name: "Sidestep", description: "One of your pieces cannot be captured this turn.", tier: 1, category: "protection" },
    shieldTarget(1),
  ),
  def(
    { id: "tempo_shuffle", name: "Tempo Shuffle", description: "Move one pawn sideways one square, once.", tier: 1, category: "movement" },
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
    { id: "bishop_polish", name: "Bishop Polish", description: "One bishop can jump exactly one piece, once.", tier: 1, category: "movement" },
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
    { id: "rook_slide", name: "Rook Slide", description: "One rook moves one square diagonally, once.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id, 1)),
    ),
  ),
  def({ id: "sentinel_pawn", name: "Sentinel Pawn", description: "One pawn gives check diagonally at two squares' range, once.", tier: 1, category: "attack" }),
  def(
    { id: "quick_glance", name: "Quick Glance", description: "See the tier of your opponent's next draft.", tier: 1, category: "info" },
    instant((_inst, api) => { api.mine.flags.seeOppTier = true; }),
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
                return back >= 0 && back < 64 && !api.board.pieces[back];
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const back = sq + fwdOf(api.me);
        if (!api.board.pieces[back]) api.relocate(sq, back);
      },
    ),
  ),
  def({ id: "firm_footing", name: "Firm Footing", description: "One piece cannot be forced to move by a fork this turn.", tier: 1, category: "protection" }),
  def({ id: "cornerstone", name: "Cornerstone", description: "One rook cannot be captured while on its starting square.", tier: 1, category: "protection" }),
  def(
    { id: "half_step", name: "Half Step", description: "One pawn moves diagonally forward without capturing, once.", tier: 1, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) =>
        [-1, 1].flatMap((df) => {
          const f = FILE(sq) + df, r = RANK(sq) + (api.me === "w" ? 1 : -1);
          if (!inBoard(f, r)) return [];
          const to = SQ(f, r);
          return api.board.pieces[to] ? [] : [pawnMove(api, sq, to, inst.id)];
        }),
      ),
    ),
  ),
  def(
    { id: "prep", name: "Prep", description: "Your next buff draft shows three cards to pick from instead of two, once.", tier: 1, category: "draft" },
    instant((_inst, api) => { api.mine.flags.prepThree = true; }),
  ),
  def({ id: "loose_pawn", name: "Loose Pawn", description: "One pawn ignores en passant for the rest of the game.", tier: 1, category: "protection" }),
  def(
    { id: "watchtower", name: "Watchtower", description: "Reveal your opponent's nerf choice if it was hidden.", tier: 1, category: "info" },
    instant((_inst, api) => { api.mine.oppNerfRevealed = true; }),
  ),
  def(
    { id: "steady_march", name: "Steady March", description: "Two pawns each advance one square immediately.", tier: 1, category: "movement" },
    advancePawns(2),
  ),
  def({ id: "guarded_king", name: "Guarded King", description: "Your king cannot be checked from an adjacent diagonal for 2 turns.", tier: 1, category: "protection" }),
];

// ---------------------------------------------------------------------------
// TIER 2 — real advantages
// ---------------------------------------------------------------------------

const TIER2: Buff[] = [
  def(
    { id: "ghost_pawn", name: "Ghost Pawn", description: "One pawn passes through enemy pieces without capturing, once.", tier: 2, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        const blocker = one >= 0 && one < 64 ? api.board.pieces[one] : null;
        return blocker && blocker.color !== api.me && two >= 0 && two < 64 && !api.board.pieces[two]
          ? [pawnMove(api, sq, two, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "double_step_army", name: "Double Step Army", description: "All pawns can move two squares forward for 2 turns.", tier: 2, category: "movement" },
    timedAugment(2, doubleStepGen),
  ),
  def(
    { id: "kings_guard", name: "King's Guard", description: "Place a pawn on any empty square adjacent to your king, once.", tier: 2, category: "pieces" },
    placePieces(["p"], kingAdjacentZone),
  ),
  def({ id: "phase_rook", name: "Phase Rook", description: "One rook passes through exactly one friendly piece per move.", tier: 2, category: "movement" }),
  def(
    { id: "wall", name: "Wall", description: "Freeze one enemy piece for 2 of their turns.", tier: 2, category: "tempo" },
    freezeTarget(2),
  ),
  def(
    { id: "long_knight", name: "Long Knight", description: "One knight makes two knight-leaps in a single move, once.", tier: 2, category: "movement" },
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
    { id: "camel_knight", name: "Camel Knight", description: "One knight also moves as a camel (3-1 leap), for the game.", tier: 2, category: "movement" },
    pieceBound("n", "Choose the knight", (board, sq, via) => leapMoves(board, sq, CAMEL_LEAPS, via)),
  ),
  def(
    { id: "teleport_knight", name: "Teleport Knight", description: "Move one knight anywhere within a 3x3 box around it, once.", tier: 2, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1).filter((m) => !m.captured),
      ),
    ),
  ),
  def({ id: "shielded_advance", name: "Shielded Advance", description: "One pawn is uncapturable on the enemy half for 3 turns.", tier: 2, category: "protection" }),
  def(
    { id: "reinforce", name: "Reinforce", description: "One of your pieces cannot be captured this turn and next.", tier: 2, category: "protection" },
    shieldTarget(2),
  ),
  def(
    { id: "pawn_storm", name: "Pawn Storm", description: "Three pawns of your choice each advance one square.", tier: 2, category: "movement" },
    advancePawns(3),
  ),
  def(
    { id: "bodyguard", name: "Bodyguard", description: "Spawn a knight adjacent to your king, once.", tier: 2, category: "pieces" },
    placePieces(["n"], kingAdjacentZone),
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
  def({ id: "trade_up", name: "Trade Up", description: "When you lose a minor piece, place a pawn on any empty square.", tier: 2, category: "pieces" }),
  def({ id: "decoy", name: "Decoy", description: "A fake king must be checked before your real king can, for 3 turns.", tier: 2, category: "protection" }),
  def({ id: "berolina_pawns", name: "Berolina Pawns", description: "Your pawns capture straight and move diagonally, for the game.", tier: 2, category: "movement" }),
  def({ id: "fork_guard", name: "Fork Guard", description: "One knight is uncapturable the turn after it gives check.", tier: 2, category: "protection" }),
  def({ id: "long_castle_anywhere", name: "Long Castle Anywhere", description: "Castle toward either rook regardless of what sits between.", tier: 2, category: "movement" }),
  def({ id: "sidestep_king", name: "Sidestep King", description: "Your king ignores check from one enemy piece for 1 turn.", tier: 2, category: "protection" }),
  def(
    { id: "piece_swap", name: "Piece Swap", description: "Swap positions of any two of your own pieces, once.", tier: 2, category: "movement" },
    swapOwnPieces(),
  ),
  def(
    { id: "wazir_bishop", name: "Wazir Bishop", description: "One bishop may also step one square straight.", tier: 2, category: "movement" },
    pieceBound("b", "Choose the bishop", (board, sq, via) => slideMoves(board, sq, ORTHO_DIRS, via, 1)),
  ),
  def(
    { id: "spring_pawn", name: "Spring Pawn", description: "One pawn can leap two squares even when blocked one ahead, once.", tier: 2, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const one = sq + fwdOf(api.me), two = sq + 2 * fwdOf(api.me);
        return two >= 0 && two < 64 && api.board.pieces[one] && !api.board.pieces[two]
          ? [pawnMove(api, sq, two, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "rally", name: "Rally", description: "Two of your knights can each move like kings for 1 turn.", tier: 2, category: "movement" },
    timedAugment(1, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def({ id: "anchor", name: "Anchor", description: "One piece cannot be pushed or swapped by enemy buffs, for the game.", tier: 2, category: "protection" }),
  def({ id: "shadow_step", name: "Shadow Step", description: "One piece moves without revealing its destination until next turn.", tier: 2, category: "movement" }),
  def(
    { id: "vault", name: "Vault", description: "One rook jumps its own pawn to the far side, once.", tier: 2, category: "movement" },
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
    { id: "reposition", name: "Reposition", description: "Slide one piece one square in any direction ignoring normal rules, once.", tier: 2, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1).filter((m) => !m.captured),
      ),
    ),
  ),
  def(
    { id: "draft_insight", name: "Draft Insight", description: "See both of your opponent's next draft cards and their tiers.", tier: 2, category: "info" },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  def({ id: "screen", name: "Screen", description: "One bishop cannot be captured while defending your king, for 3 turns.", tier: 2, category: "protection" }),
  def({ id: "counterstep", name: "Counterstep", description: "After your opponent captures, move the threatened piece for free, once.", tier: 2, category: "tempo" }),
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
  // Nerf-modifier (cross-cutting)
  def({ id: "loosen_the_leash", name: "Loosen the Leash", description: "If your nerf caps you at a rank, raise the cap by one rank.", tier: 2, category: "nerf" }),
];

// ---------------------------------------------------------------------------
// TIER 3 — strong swings
// ---------------------------------------------------------------------------

const TIER3: Buff[] = [
  def(
    { id: "knight_nightrook", name: "Knight to Nightrook", description: "One knight also moves like a rook, for the game.", tier: 3, category: "movement" },
    pieceBound("n", "Choose the knight", (board, sq, via) => slideMoves(board, sq, ORTHO_DIRS, via)),
  ),
  def(
    { id: "bishop_archbishop", name: "Bishop to Archbishop", description: "One bishop also moves like a knight, for the game.", tier: 3, category: "movement" },
    pieceBound("b", "Choose the bishop", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def(
    { id: "rook_chancellor", name: "Rook to Chancellor", description: "One rook also moves like a knight, for the game.", tier: 3, category: "movement" },
    pieceBound("r", "Choose the rook", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def(
    { id: "extra_move", name: "Extra Move", description: "Take two moves in a row, once.", tier: 3, category: "tempo" },
    extraMovesNow(1),
  ),
  def(
    { id: "promote_now", name: "Promote Now", description: "Instantly promote one pawn on the 6th rank or beyond.", tier: 3, category: "pieces" },
    promotePawns(1, 6, "q"),
  ),
  def(
    { id: "summon_knight", name: "Summon Knight", description: "Place a new knight on any empty square in your half, once.", tier: 3, category: "pieces" },
    placePieces(["n"], anyHalfZone),
  ),
  def(
    { id: "queens_echo", name: "Queen's Echo", description: "One rook moves like a queen for your next 2 turns.", tier: 3, category: "movement" },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "time_skip", name: "Time Skip", description: "Force your opponent to skip their next turn, once.", tier: 3, category: "tempo" },
    skipOpponent(1),
  ),
  def({ id: "fortress", name: "Fortress", description: "Your king and one adjacent piece are uncapturable for 3 turns.", tier: 3, category: "protection" }),
  def({ id: "grasshopper", name: "Grasshopper", description: "One piece lands just past a hopped piece, for the game.", tier: 3, category: "movement" }),
  def({ id: "cannon", name: "Cannon", description: "One rook captures cannon-style (jump one screen), plus normal moves.", tier: 3, category: "movement" }),
  def(
    { id: "sliding_king", name: "Sliding King", description: "Your king moves like a king or bishop for 3 turns.", tier: 3, category: "movement" },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, DIAG_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "dragon_pawn", name: "Dragon Pawn", description: "One pawn moves as a pawn or knight until it promotes.", tier: 3, category: "movement" },
    pieceBound("p", "Choose the pawn", (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via)),
  ),
  def({ id: "pin_breaker", name: "Pin Breaker", description: "One pinned piece moves freely this turn, ignoring the pin.", tier: 3, category: "movement" }),
  def(
    { id: "rank_runner", name: "Rank Runner", description: "One pawn advances to any empty square on its file up to rank 5, once.", tier: 3, category: "movement" },
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
    { id: "resurrect", name: "Resurrect", description: "Bring back your most recently captured piece to your half, once.", tier: 3, category: "pieces" },
    reviveOne(["q", "r", "b", "n", "p"], anyHalfZone),
  ),
  def({ id: "deflect", name: "Deflect", description: "The next capture against your queen fails and stuns the attacker 1 turn.", tier: 3, category: "protection" }),
  def(
    { id: "bunker", name: "Bunker", description: "Three squares in front of your king are barred to enemies for 4 turns.", tier: 3, category: "protection" },
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
    { id: "overclock", name: "Overclock", description: "Your knights move like knights or kings for 3 turns.", tier: 3, category: "movement" },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def({ id: "hunter_knight", name: "Hunter Knight", description: "One knight can capture from either of its landing squares in one move, pick one.", tier: 3, category: "attack" }),
  def(
    { id: "chain_mail", name: "Chain Mail", description: "All your minor pieces are uncapturable for 1 full turn.", tier: 3, category: "protection" },
    instant((_inst, api) => {
      const squares = mySquares(api.board, api.me).filter((sq) =>
        ["n", "b"].includes(api.board.pieces[sq]!.type),
      );
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 1 });
    }),
  ),
  def(
    { id: "warp_step", name: "Warp Step", description: "One piece teleports up to three squares in a straight line, once.", tier: 3, category: "movement" },
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
  def({ id: "tidal_push", name: "Tidal Push", description: "Shove one enemy piece two squares away if the path is empty, once.", tier: 3, category: "attack" }),
  def(
    { id: "second_wind_major", name: "Second Wind Major", description: "Return a captured rook to any empty back-rank square, once.", tier: 3, category: "pieces" },
    reviveOne(["r"], backRankZone),
  ),
  def(
    { id: "split_march", name: "Split March", description: "Four pawns each advance one square immediately.", tier: 3, category: "movement" },
    advancePawns(4),
  ),
  def(
    { id: "guard_rotation", name: "Guard Rotation", description: "Swap your king with a rook anywhere on the board, once.", tier: 3, category: "movement" },
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
      },
    ),
  ),
  def({ id: "iron_bishop", name: "Iron Bishop", description: "One bishop cannot be captured by pawns, for the game.", tier: 3, category: "protection" }),
  def({ id: "momentum", name: "Momentum", description: "After any capture, take a free non-capturing move, once.", tier: 3, category: "tempo" }),
  def({ id: "frost", name: "Frost", description: "Freeze two adjacent enemy pieces for 1 turn each.", tier: 3, category: "tempo" }),
  def(
    { id: "vanguard", name: "Vanguard", description: "One pawn promotes to a knight on the 6th rank, once.", tier: 3, category: "pieces" },
    promotePawns(1, 6, "n"),
  ),
  def({ id: "rewind_one", name: "Rewind One", description: "Undo the last two half-moves of the game, once.", tier: 3, category: "tempo" }),
  // Nerf-modifiers (cross-cutting)
  def({ id: "piece_parole", name: "Piece Parole", description: "If your nerf disables a piece type, re-enable one piece of that type.", tier: 3, category: "nerf" }),
  def({ id: "half_measure", name: "Half Measure", description: "Cut any \"every turn\" nerf penalty to \"every other turn\".", tier: 3, category: "nerf" }),
];

// ---------------------------------------------------------------------------
// TIER 4 — heavy hitters
// ---------------------------------------------------------------------------

const TIER4: Buff[] = [
  def({ id: "atomic_captures_small", name: "Atomic Captures (Small)", description: "Captures clear enemy pieces on the two squares beside the captured piece.", tier: 4, category: "attack" }),
  def(
    { id: "double_queen", name: "Double Queen", description: "Promote any pawn to a queen instantly, even mid-board.", tier: 4, category: "pieces" },
    promotePawns(1, 1, "q"),
  ),
  def(
    { id: "piece_steal", name: "Piece Steal", description: "Convert one enemy pawn to your color, once.", tier: 4, category: "pieces" },
    convertEnemies(1, ["p"]),
  ),
  def({ id: "split_bishop", name: "Split Bishop", description: "Spawn a second bishop on the opposite color, once.", tier: 4, category: "pieces" }),
  def(
    { id: "twin_knights", name: "Twin Knights", description: "Both knights become nightrooks, for the game.", tier: 4, category: "movement" },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ORTHO_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "warp_rook", name: "Warp Rook", description: "One rook teleports to any empty square on the board, once.", tier: 4, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) =>
        teleportMoves(api.board, sq, emptySquares(api.board), inst.id),
      ),
    ),
  ),
  def({ id: "mass_recall", name: "Mass Recall", description: "Return any two pieces to your back rank, once.", tier: 4, category: "movement" }),
  def({ id: "immobilizer", name: "Immobilizer", description: "One piece freezes all enemy pieces adjacent to it while there.", tier: 4, category: "tempo" }),
  def(
    { id: "royal_decree", name: "Royal Decree", description: "Your king gains queen movement for 2 turns (still loses on capture).", tier: 4, category: "movement" },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def(
    { id: "purge", name: "Purge", description: "Remove one enemy piece below queen rank from the board.", tier: 4, category: "attack" },
    removeEnemies(1, ["p", "n", "b", "r"]),
  ),
  def({ id: "mind_nudge", name: "Mind Nudge", description: "Control one enemy pawn's next move, once.", tier: 4, category: "attack" }),
  def(
    { id: "second_army", name: "Second Army", description: "Place two pawns on any empty squares in your half, once.", tier: 4, category: "pieces" },
    placePieces(["p", "p"], anyHalfZone),
  ),
  def({ id: "cascade_freeze", name: "Cascade Freeze", description: "For 3 turns, each capture you make freezes the nearest enemy piece 1 turn.", tier: 4, category: "tempo" }),
  def(
    { id: "sanctuary", name: "Sanctuary", description: "Designate one square; your pieces there are uncapturable, for the game.", tier: 4, category: "protection" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the sanctuary square", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: null });
        }
      },
    ),
  ),
  def({ id: "amazon_knight", name: "Amazon Knight", description: "One knight becomes a knight plus queen for 2 turns.", tier: 4, category: "movement" }),
  def(
    { id: "buff_thief_minor", name: "Buff Thief (Minor)", description: "Steal one tier 1 or 2 buff from your opponent.", tier: 4, category: "draft" },
    stealBuffs(1, 2),
  ),
  def(
    { id: "chain_nullify", name: "Chain Nullify", description: "Cancel the next buff your opponent drafts before use.", tier: 4, category: "draft" },
    instant((_inst, api) => {
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  def(
    { id: "mirror", name: "Mirror", description: "Copy one buff your opponent currently holds.", tier: 4, category: "draft" },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const options = api.theirs.buffs
          .map((b, index) => ({ b, index }))
          .filter(({ b }) => !b.spent && !b.nullified)
          .map(({ b, index }) => ({ index, name: b.id, tier: b.tier }));
        return { kind: "enemy-buff", label: "Choose a buff to copy", options };
      },
      (_inst, api, picks) => {
        const i = picks[0]?.buffIndex;
        if (i == null || !api.theirs.buffs[i]) return;
        const src = api.theirs.buffs[i];
        api.mine.buffs.push({ id: src.id, tier: src.tier, state: JSON.parse(JSON.stringify(src.state)) });
      },
    ),
  ),
  def({ id: "warp_field", name: "Warp Field", description: "Move any two of your pieces one square each ignoring rules, once.", tier: 4, category: "movement" }),
  def({ id: "detonate", name: "Detonate", description: "Sacrifice one pawn to clear all pieces on its adjacent squares except kings.", tier: 4, category: "attack" }),
  def({ id: "regroup", name: "Regroup", description: "Return all your pawns behind rank 3 to rank 2, once.", tier: 4, category: "movement" }),
  def(
    { id: "iron_wall", name: "Iron Wall", description: "Your entire back rank is uncapturable for 2 turns.", tier: 4, category: "protection" },
    shieldZone((api) => {
      const r = api.me === "w" ? 0 : 7;
      return Array.from({ length: 8 }, (_, f) => SQ(f, r));
    }, 2),
  ),
  def(
    { id: "snap_freeze", name: "Snap Freeze", description: "Freeze the piece that last moved for 2 of its turns.", tier: 4, category: "tempo" },
    instant((_inst, api) => {
      const last = [...api.board.history].reverse().find((m) => m.color === api.opp);
      if (!last) return;
      const p = api.board.pieces[last.to];
      if (p && p.color === api.opp && p.type !== "k") {
        addEffect(api, { kind: "freeze", sq: last.to, owner: api.opp, turns: 2 });
      }
    }),
  ),
  def({ id: "duelist", name: "Duelist", description: "One piece wins any trade on its square, surviving the first capture, once.", tier: 4, category: "protection" }),
  def({ id: "overrun", name: "Overrun", description: "Three pawns can each capture forward (not just diagonally) this turn.", tier: 4, category: "attack" }),
  def(
    { id: "recast", name: "Recast", description: "Reroll your entire current draft into the next tier up, once.", tier: 4, category: "draft" },
    instant((_inst, api) => {
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  def({ id: "phantom_rook", name: "Phantom Rook", description: "Spawn a rook that vanishes after 4 turns, on any empty square in your half.", tier: 4, category: "pieces" }),
  def(
    { id: "kingslide", name: "Kingslide", description: "Your king moves any distance in a straight line, once.", tier: 4, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def({ id: "suppress", name: "Suppress", description: "Your opponent cannot draft manipulation buffs next draft.", tier: 4, category: "draft" }),
  def({ id: "blink_army", name: "Blink Army", description: "Teleport two pawns forward two squares each if empty, once.", tier: 4, category: "movement" }),
  def({ id: "grand_recall", name: "Grand Recall", description: "Return your queen (if on board) to any empty square in your half, once.", tier: 4, category: "movement" }),
  def(
    { id: "fault_line", name: "Fault Line", description: "Split the board; enemy pieces cannot cross one file you pick, for 2 turns.", tier: 4, category: "protection" },
    barLine("file", 2),
  ),
  // Nerf-modifier (cross-cutting)
  def(
    { id: "grace_period", name: "Grace Period", description: "Suspend your nerf entirely for 4 turns.", tier: 4, category: "nerf" },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 4 });
    }),
  ),
];

// ---------------------------------------------------------------------------
// TIER 5 — major power
// ---------------------------------------------------------------------------

const TIER5: Buff[] = [
  def({ id: "atomic_captures", name: "Atomic Captures", description: "Captures explode across all 8 adjacent squares except kings and pawns.", tier: 5, category: "attack" }),
  def({ id: "extra_move_repeat", name: "Extra Move (Repeat)", description: "Take two moves in a row every turn for 2 full turns.", tier: 5, category: "tempo" }),
  def(
    { id: "god_knight", name: "God Knight", description: "One knight becomes an amazon (queen plus knight), for the game.", tier: 5, category: "movement" },
    pieceBound("n", "Choose the knight", (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via)),
  ),
  def(
    { id: "total_freeze", name: "Total Freeze", description: "Freeze every enemy piece adjacent to your pieces for 1 turn.", tier: 5, category: "tempo" },
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
    { id: "annihilate", name: "Annihilate", description: "Remove any one enemy piece below the queen from the board.", tier: 5, category: "attack" },
    removeEnemies(1, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "buff_thief", name: "Buff Thief", description: "Steal one active buff of any tier from your opponent.", tier: 5, category: "draft" },
    stealBuffs(1),
  ),
  def(
    { id: "promotion_storm", name: "Promotion Storm", description: "All pawns on rank 5 or beyond promote to knights.", tier: 5, category: "pieces" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (relRank(api.me, sq) >= 5) api.setPieceType(sq, "n");
      }
    }),
  ),
  def(
    { id: "time_stop_short", name: "Time Stop (Short)", description: "Take three consecutive moves right now, once.", tier: 5, category: "tempo" },
    extraMovesNow(2),
  ),
  def(
    { id: "resurrect_queen", name: "Resurrect Queen", description: "Bring your captured queen back to any empty square in your half.", tier: 5, category: "pieces" },
    reviveOne(["q"], anyHalfZone),
  ),
  def({ id: "checkmate_immunity", name: "Checkmate Immunity", description: "The first checkmate against you becomes check, escape once.", tier: 5, category: "protection" }),
  def(
    { id: "mind_control", name: "Mind Control", description: "Take one enemy minor piece for the rest of the game.", tier: 5, category: "pieces" },
    convertEnemies(1, ["n", "b"]),
  ),
  def({ id: "board_lock", name: "Board Lock", description: "Your opponent cannot castle or use king buffs for 3 turns.", tier: 5, category: "tempo" }),
  def(
    { id: "twin_queens", name: "Twin Queens", description: "Promote two pawns to queens instantly if both are on rank 5+.", tier: 5, category: "pieces" },
    promotePawns(2, 5, "q"),
  ),
  def({ id: "warp_legion", name: "Warp Legion", description: "Teleport any three of your pieces one square each, once.", tier: 5, category: "movement" }),
  def(
    { id: "purge_two", name: "Purge Two", description: "Remove two enemy pawns anywhere on the board.", tier: 5, category: "attack" },
    removeEnemies(2, ["p"]),
  ),
  def({ id: "nova", name: "Nova", description: "One piece detonates its whole file, clearing enemy pieces except kings, once.", tier: 5, category: "attack" }),
  def(
    { id: "great_wall", name: "Great Wall", description: "One full rank you pick is impassable to enemies for 3 turns.", tier: 5, category: "protection" },
    barLine("rank", 3),
  ),
  def({ id: "siege_rook", name: "Siege Rook", description: "One rook captures every enemy piece in a straight line in one move, once.", tier: 5, category: "attack" }),
  def({ id: "phase_army", name: "Phase Army", description: "All your knights pass through pieces for 2 turns.", tier: 5, category: "movement" }),
  def(
    { id: "regenerate", name: "Regenerate", description: "Revive your last two captured pawns to their start squares.", tier: 5, category: "pieces" },
    revivePawnsToStart(2),
  ),
  def(
    { id: "sever", name: "Sever", description: "Permanently disable one enemy buff and block its retrigger.", tier: 5, category: "draft" },
    severBuffs(1),
  ),
  def(
    { id: "overclock_major", name: "Overclock Major", description: "All your pieces may move like kings as an alternative, for 1 turn.", tier: 5, category: "movement" },
    timedAugment(1, (_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)),
    ),
  ),
  def(
    { id: "tempo_theft", name: "Tempo Theft", description: "Steal your opponent's next turn (you move twice, they wait), once.", tier: 5, category: "tempo" },
    skipOpponent(1),
  ),
  def(
    { id: "blockade", name: "Blockade", description: "Enemy pawns cannot advance for 3 turns.", tier: 5, category: "tempo" },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
    }),
  ),
  def(
    { id: "warp_home", name: "Warp Home", description: "Swap any of your pieces with any other of your pieces, once.", tier: 5, category: "movement" },
    swapOwnPieces(),
  ),
  def(
    { id: "iron_reign", name: "Iron Reign", description: "Your king cannot be checked for 2 full turns.", tier: 5, category: "protection" },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  def(
    { id: "mass_promote_minor", name: "Mass Promote Minor", description: "Two pawns on rank 4+ become knights instantly.", tier: 5, category: "pieces" },
    promotePawns(2, 4, "n"),
  ),
  def({ id: "collapse", name: "Collapse", description: "Pull every enemy piece on one file one square toward their back rank, once.", tier: 5, category: "attack" }),
  def({ id: "ghost_legion", name: "Ghost Legion", description: "Three of your pawns pass through pieces for 2 turns.", tier: 5, category: "movement" }),
  def(
    { id: "draft_seize", name: "Draft Seize", description: "Take both cards in your next draft and deny your opponent theirs.", tier: 5, category: "draft" },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  def(
    { id: "rampart", name: "Rampart", description: "Build an uncapturable pawn wall on three chosen empty squares in your half, once.", tier: 5, category: "protection" },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Place a rampart pawn (${picks.length + 1}/3)`,
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
        for (const sq of squares) api.place(sq, "p", api.me);
        if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: null });
      },
    ),
  ),
  def(
    { id: "shatter", name: "Shatter", description: "Destroy one enemy rook, bishop, or knight of your choice.", tier: 5, category: "attack" },
    removeEnemies(1, ["r", "b", "n"]),
  ),
  // Nerf-modifier (cross-cutting)
  def({ id: "rehab", name: "Rehab", description: "Permanently downgrade your nerf to its weakest version.", tier: 5, category: "nerf" }),
];

// ---------------------------------------------------------------------------
// TIER 6 — game-bending
// ---------------------------------------------------------------------------

const TIER6: Buff[] = [
  def({ id: "atomic_reaction", name: "Atomic Reaction", description: "Captures explode adjacent squares, and those explosions chain to other pieces.", tier: 6, category: "attack" }),
  def(
    { id: "double_amazon", name: "Double Amazon", description: "Two of your knights become amazons for the game.", tier: 6, category: "movement" },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) => slideMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),
  def({ id: "time_rewind", name: "Time Rewind", description: "Undo the last three full moves, resetting to that position, once.", tier: 6, category: "tempo" }),
  def(
    { id: "mass_resurrect", name: "Mass Resurrect", description: "Revive any three captured pawns to your half.", tier: 6, category: "pieces" },
    revivePawnsToStart(3),
  ),
  def(
    { id: "royal_ascension", name: "Royal Ascension", description: "Your king gains queen movement permanently (still loses on capture).", tier: 6, category: "movement" },
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
    { id: "second_king", name: "Second King", description: "Promote a pawn to a real second king; opponent must mate both.", tier: 6, category: "pieces" },
    promotePawns(1, 1, "k"),
  ),
  def({ id: "warp_storm", name: "Warp Storm", description: "Teleport any four of your pieces one square each, once.", tier: 6, category: "movement" }),
  def(
    { id: "fissure", name: "Fissure", description: "One file becomes impassable to enemies for the rest of the game.", tier: 6, category: "protection" },
    barLine("file", null),
  ),
  def({ id: "queens_wrath", name: "Queen's Wrath", description: "Your queen captures two pieces in a straight line in one move, once.", tier: 6, category: "attack" }),
  def(
    { id: "army_reversal", name: "Army Reversal", description: "All your pawns may move backward freely for 2 turns.", tier: 6, category: "movement" },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const back = sq - fwdOf(api.me);
        return back >= 0 && back < 64 && !api.board.pieces[back]
          ? [pawnMove(api, sq, back, inst.id)]
          : [];
      }),
    ),
  ),
  def(
    { id: "sanctuary_zone", name: "Sanctuary Zone", description: "A 2x2 area you pick makes your pieces uncapturable for 4 turns.", tier: 6, category: "protection" },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick the bottom-left corner of the 2x2 zone",
              squares: Array.from({ length: 64 }, (_, i) => i).filter(
                (sq) => FILE(sq) < 7 && RANK(sq) < 7,
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, {
          kind: "shield",
          owner: api.me,
          squares: [sq, sq + 1, sq + 8, sq + 9],
          turns: 4,
        });
      },
    ),
  ),
  def(
    { id: "overwhelm", name: "Overwhelm", description: "Take three consecutive moves, once.", tier: 6, category: "tempo" },
    extraMovesNow(2),
  ),
  def(
    { id: "buff_siphon", name: "Buff Siphon", description: "Steal two active buffs from your opponent.", tier: 6, category: "draft" },
    stealBuffs(2),
  ),
  def({ id: "detonation_field", name: "Detonation Field", description: "Your next three captures each explode adjacent squares.", tier: 6, category: "attack" }),
  def(
    { id: "grand_summon", name: "Grand Summon", description: "Place a knight and a bishop on empty squares in your half, once.", tier: 6, category: "pieces" },
    placePieces(["n", "b"], anyHalfZone),
  ),
  def(
    { id: "time_lock", name: "Time Lock", description: "Your opponent skips their next two turns, once.", tier: 6, category: "tempo" },
    skipOpponent(2),
  ),
  def({ id: "colossus", name: "Colossus", description: "One piece becomes uncapturable and gains queen movement for 3 turns.", tier: 6, category: "movement" }),
  def(
    { id: "cataclysm", name: "Cataclysm", description: "Clear all enemy pawns on the board.", tier: 6, category: "attack" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "p")) api.removePiece(sq);
    }),
  ),
  def(
    { id: "draft_domination", name: "Draft Domination", description: "Choose both of your opponent's next draft cards from tier 1.", tier: 6, category: "draft" },
    instant((_inst, api) => {
      api.theirs.flags.forceTier = 1;
    }),
  ),
  def({ id: "warp_reign", name: "Warp Reign", description: "Swap the positions of your king and queen and shield both for 2 turns.", tier: 6, category: "protection" }),
  def(
    { id: "mass_freeze", name: "Mass Freeze", description: "Freeze all enemy pieces for 1 full turn.", tier: 6, category: "tempo" },
    freezeAllEnemies(1),
  ),
  def(
    { id: "resurrect_major", name: "Resurrect Major", description: "Revive a captured rook or bishop to any empty square, once.", tier: 6, category: "pieces" },
    reviveOne(["r", "b"], () => () => true),
  ),
  def(
    { id: "phalanx", name: "Phalanx", description: "Your entire pawn line becomes uncapturable for 2 turns.", tier: 6, category: "protection" },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 2),
  ),
  def(
    { id: "rift_walker", name: "Rift Walker", description: "One piece teleports anywhere on the board, once.", tier: 6, category: "movement" },
    augment((_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) =>
        teleportMoves(api.board, sq, emptySquares(api.board), inst.id),
      ),
    ),
  ),
  def(
    { id: "purge_storm", name: "Purge Storm", description: "Remove three enemy pawns and freeze the rest for 1 turn.", tier: 6, category: "attack" },
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
    { id: "ironclad", name: "Ironclad", description: "Your back two ranks are uncapturable for 2 turns.", tier: 6, category: "protection" },
    shieldZone((api) => {
      const ranks = api.me === "w" ? [0, 1] : [6, 7];
      return ranks.flatMap((r) => Array.from({ length: 8 }, (_, f) => SQ(f, r)));
    }, 2),
  ),
  def({ id: "ascendant_knight", name: "Ascendant Knight", description: "One knight moves as an amazon and cannot be captured, for 2 turns.", tier: 6, category: "movement" }),
  def({ id: "void", name: "Void", description: "One square you pick swallows any enemy piece that enters it, for 3 turns.", tier: 6, category: "attack" }),
  def({ id: "total_recall", name: "Total Recall", description: "Return every one of your pieces past rank 4 back to rank 3, once.", tier: 6, category: "movement" }),
  // Nerf-modifier (cross-cutting)
  def(
    { id: "nerf_breaker", name: "Nerf Breaker", description: "Remove your nerf entirely for the rest of the game.", tier: 6, category: "nerf" },
    instant((_inst, api) => api.removeMyNerf()),
  ),
];

// ---------------------------------------------------------------------------
// TIER 7 — near-decisive
// ---------------------------------------------------------------------------

const TIER7: Buff[] = [
  def({ id: "chain_atomic", name: "Chain Atomic", description: "All your captures explode adjacent squares for the rest of the game.", tier: 7, category: "attack" }),
  def({ id: "triple_amazon", name: "Triple Amazon", description: "Three of your knights become amazons for the game.", tier: 7, category: "movement" }),
  def({ id: "full_rewind", name: "Full Rewind", description: "Undo the last five full moves, once.", tier: 7, category: "tempo" }),
  def(
    { id: "kings_legion", name: "King's Legion", description: "Place a knight, bishop, and pawn on empty squares in your half, once.", tier: 7, category: "pieces" },
    placePieces(["n", "b", "p"], anyHalfZone),
  ),
  def(
    { id: "mind_empire", name: "Mind Empire", description: "Take control of one enemy piece of any type below queen for the game.", tier: 7, category: "pieces" },
    convertEnemies(1, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "annihilation", name: "Annihilation", description: "Remove any two enemy pieces below the queen from the board.", tier: 7, category: "attack" },
    removeEnemies(2, ["p", "n", "b", "r"]),
  ),
  def({ id: "eternal_reign", name: "Eternal Reign", description: "Your king gains permanent queen movement and cannot be forked.", tier: 7, category: "movement" }),
  def(
    { id: "grand_nullify", name: "Grand Nullify", description: "Cancel your opponent's unused and temporary buffs, plus their next-drafted buff. Locked-in upgrades resist.", tier: 7, category: "draft" },
    instant((_inst, api) => {
      broadNullify(api);
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  def(
    { id: "twin_queens_permanent", name: "Twin Queens Permanent", description: "Promote two pawns to queens anywhere on the board.", tier: 7, category: "pieces" },
    promotePawns(2, 1, "q"),
  ),
  def({ id: "warp_cataclysm", name: "Warp Cataclysm", description: "Teleport any five of your pieces one square each, once.", tier: 7, category: "movement" }),
  def(
    { id: "great_divide", name: "Great Divide", description: "Two files become impassable to enemies for the rest of the game.", tier: 7, category: "protection" },
    barLine("file", null, 2),
  ),
  def({ id: "queens_rampage", name: "Queen's Rampage", description: "Your queen captures every piece in a straight line in one move, once.", tier: 7, category: "attack" }),
  def(
    { id: "time_freeze", name: "Time Freeze", description: "Your opponent skips their next three turns, once.", tier: 7, category: "tempo" },
    skipOpponent(3),
  ),
  def(
    { id: "fortress_realm", name: "Fortress Realm", description: "A 3x3 zone you pick makes your pieces uncapturable for 4 turns.", tier: 7, category: "protection" },
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
    { id: "onslaught", name: "Onslaught", description: "Take four consecutive moves, once.", tier: 7, category: "tempo" },
    extraMovesNow(3),
  ),
  def(
    { id: "buff_plunder", name: "Buff Plunder", description: "Steal three active buffs from your opponent.", tier: 7, category: "draft" },
    stealBuffs(3),
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
    autoRevive(["q", "n", "b"]),
  ),
  def(
    { id: "world_lock", name: "World Lock", description: "Your opponent cannot draft or use buffs for 3 turns.", tier: 7, category: "draft" },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  def({ id: "titan", name: "Titan", description: "One piece becomes uncapturable with amazon movement for the rest of the game.", tier: 7, category: "movement" }),
  def(
    { id: "ruin", name: "Ruin", description: "Clear all enemy pawns and one minor piece.", tier: 7, category: "attack" },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy minor piece to destroy",
              squares: mySquares(api.board, api.opp).filter((sq) =>
                ["n", "b"].includes(api.board.pieces[sq]!.type),
              ),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.removePiece(picks[0].square);
        for (const sq of mySquares(api.board, api.opp, "p")) api.removePiece(sq);
      },
    ),
  ),
  def(
    { id: "draft_tyranny", name: "Draft Tyranny", description: "Set both of your own next cards to tier 8, once.", tier: 7, category: "draft" },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 8;
    }),
  ),
  def({ id: "warp_sovereign", name: "Warp Sovereign", description: "Swap any three pairs of your pieces, once.", tier: 7, category: "movement" }),
  def(
    { id: "deep_freeze", name: "Deep Freeze", description: "Freeze all enemy pieces for 2 full turns.", tier: 7, category: "tempo" },
    freezeAllEnemies(2),
  ),
  def(
    { id: "phoenix_line", name: "Phoenix Line", description: "Revive all your captured pawns to rank 2, once.", tier: 7, category: "pieces" },
    revivePawnsToStart(8),
  ),
  def({ id: "rift_storm", name: "Rift Storm", description: "Teleport two of your pieces anywhere on the board, once.", tier: 7, category: "movement" }),
  def({ id: "purge_realm", name: "Purge Realm", description: "Remove every enemy minor piece from one half of the board.", tier: 7, category: "attack" }),
  def(
    { id: "aegis", name: "Aegis", description: "Your entire army is uncapturable for 1 full turn.", tier: 7, category: "protection" },
    shieldArmy(1),
  ),
  def({ id: "godslayer_knight", name: "Godslayer Knight", description: "One knight moves as an amazon, is uncapturable, and explodes on capture, for 3 turns.", tier: 7, category: "movement" }),
  def({ id: "abyss", name: "Abyss", description: "Two squares you pick swallow any enemy piece that enters, for the game.", tier: 7, category: "attack" }),
  def({ id: "grand_retreat", name: "Grand Retreat", description: "Reset your whole army to its starting position, once.", tier: 7, category: "movement" }),
  def(
    { id: "sovereign_draft", name: "Sovereign Draft", description: "Take both cards in your next two drafts.", tier: 7, category: "draft" },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 2;
    }),
  ),
  // Nerf-modifier (cross-cutting)
  def({ id: "nerf_reversal", name: "Nerf Reversal", description: "Flip your nerf into its inverse benefit where one exists.", tier: 7, category: "nerf" }),
];

// ---------------------------------------------------------------------------
// TIER 8 — game-warping, rare
// ---------------------------------------------------------------------------

const TIER8: Buff[] = [
  def({ id: "total_atomic", name: "Total Atomic", description: "Every capture by either of your pieces explodes and chains, for the game.", tier: 8, category: "attack" }),
  def(
    { id: "amazon_army", name: "Amazon Army", description: "All your knights and bishops become amazons for the game.", tier: 8, category: "movement" },
    permanentAugment((_m, inst, api) =>
      ["n", "b"].flatMap((t) =>
        mySquares(api.board, api.me, t as PieceType).flatMap((sq) => [
          ...slideMoves(api.board, sq, ALL_DIRS, inst.id),
          ...leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id),
        ]),
      ),
    ),
  ),
  def({ id: "perfect_rewind", name: "Perfect Rewind", description: "Reset the board to any position from the last eight moves, once.", tier: 8, category: "tempo" }),
  def(
    { id: "divine_legion", name: "Divine Legion", description: "Place a queen on any empty square in your half, once.", tier: 8, category: "pieces" },
    placePieces(["q"], anyHalfZone),
  ),
  def(
    { id: "mass_mind_control", name: "Mass Mind Control", description: "Take control of two enemy pieces of any type below queen, for the game.", tier: 8, category: "pieces" },
    convertEnemies(2, ["p", "n", "b", "r"]),
  ),
  def(
    { id: "total_annihilation", name: "Total Annihilation", description: "Remove any three enemy pieces below the queen from the board.", tier: 8, category: "attack" },
    removeEnemies(3, ["p", "n", "b", "r"]),
  ),
  def({ id: "immortal_king", name: "Immortal King", description: "Your king cannot be checkmated for the rest of the game (only stalemate or resignation ends it).", tier: 8, category: "protection" }),
  def(
    { id: "absolute_nullify", name: "Absolute Nullify", description: "Cancel your opponent's unused and temporary buffs and block their next draft. Locked-in upgrades resist.", tier: 8, category: "draft" },
    instant((_inst, api) => {
      broadNullify(api);
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  def(
    { id: "queen_storm", name: "Queen Storm", description: "Promote all your pawns on rank 4 or beyond to queens.", tier: 8, category: "pieces" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.me, "p")) {
        if (relRank(api.me, sq) >= 4) api.setPieceType(sq, "q");
      }
    }),
  ),
  def({ id: "reality_warp", name: "Reality Warp", description: "Teleport any six of your pieces anywhere you like, once.", tier: 8, category: "movement" }),
  def(
    { id: "sundering", name: "Sundering", description: "Three files become impassable to enemies for the rest of the game.", tier: 8, category: "protection" },
    barLine("file", null, 3),
  ),
  def({ id: "queens_apocalypse", name: "Queen's Apocalypse", description: "Your queen captures every enemy piece on the board in one move, once (excluding the king).", tier: 8, category: "attack" }),
  def(
    { id: "time_prison", name: "Time Prison", description: "Your opponent skips their next four turns, once.", tier: 8, category: "tempo" },
    skipOpponent(4),
  ),
  def(
    { id: "divine_fortress", name: "Divine Fortress", description: "Your entire half of the board makes your pieces uncapturable for 3 turns.", tier: 8, category: "protection" },
    shieldZone(
      (api) => Array.from({ length: 64 }, (_, i) => i).filter((sq) => inHalf(api.me, sq)),
      3,
    ),
  ),
  def(
    { id: "blitzkrieg", name: "Blitzkrieg", description: "Take five consecutive moves, once.", tier: 8, category: "tempo" },
    extraMovesNow(4),
  ),
  def(
    { id: "total_plunder", name: "Total Plunder", description: "Steal all your opponent's active buffs except locked-in upgrades.", tier: 8, category: "draft" },
    instant((_inst, api) => {
      const stolen = api.theirs.buffs.filter(
        (b) => !b.spent && !b.nullified && !onlinePermanent(b),
      );
      api.theirs.buffs = api.theirs.buffs.filter(
        (b) => b.spent || b.nullified || onlinePermanent(b),
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
    autoRevive(["q", "r", "r", "n", "b"]),
  ),
  def(
    { id: "world_end", name: "World End", description: "Your opponent cannot move any piece except the king for 2 turns.", tier: 8, category: "tempo" },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 2 });
    }),
  ),
  def({ id: "living_god", name: "Living God", description: "One piece gains amazon movement, is uncapturable, and explodes on capture, for the game.", tier: 8, category: "movement" }),
  def({ id: "void_realm", name: "The Void Realm", description: "Three squares you pick swallow any enemy piece that enters, for the game.", tier: 8, category: "attack" }),
  def({ id: "grand_reset", name: "Grand Reset", description: "Restore your entire army to full starting strength, once.", tier: 8, category: "pieces" }),
  def({ id: "draft_supremacy", name: "Draft Supremacy", description: "Choose every card in both players' next drafts.", tier: 8, category: "draft" }),
  def(
    { id: "eternal_freeze", name: "Eternal Freeze", description: "Freeze all enemy pieces for 3 full turns.", tier: 8, category: "tempo" },
    freezeAllEnemies(3),
  ),
  def(
    { id: "phoenix_rebirth", name: "Phoenix Rebirth", description: "Revive every captured piece you have to your half, once.", tier: 8, category: "pieces" },
    instant((_inst, api) => {
      const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
        (a, b) => relRank(api.me, a) - relRank(api.me, b),
      );
      for (const type of ["q", "r", "b", "n", "p"] as PieceType[]) {
        while (revivable(api, type) > 0 && spots.length > 0) {
          api.place(spots.shift()!, type, api.me);
          markRevived(api, type);
        }
      }
    }),
  ),
  def({ id: "total_warp", name: "Total Warp", description: "Teleport your whole army anywhere legal, once.", tier: 8, category: "movement" }),
  def(
    { id: "extinction", name: "Extinction", description: "Remove every enemy minor and pawn piece from the board.", tier: 8, category: "attack" },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (["p", "n", "b"].includes(api.board.pieces[sq]!.type)) api.removePiece(sq);
      }
    }),
  ),
  def(
    { id: "absolute_aegis", name: "Absolute Aegis", description: "Your entire army is uncapturable for 2 full turns.", tier: 8, category: "protection" },
    shieldArmy(2),
  ),
  def({ id: "titan_legion", name: "Titan Legion", description: "Three of your pieces become uncapturable amazons for the game.", tier: 8, category: "movement" }),
  def({ id: "endless_turn", name: "Endless Turn", description: "Take moves until you make a capture, once (minimum one move).", tier: 8, category: "tempo" }),
  def({ id: "checkmate_denial", name: "Checkmate Denial", description: "You cannot lose for the next 5 turns by any means short of resignation.", tier: 8, category: "protection" }),
  def({ id: "genesis", name: "Genesis", description: "Reset the entire board to the opening position with your nerf removed, once.", tier: 8, category: "pieces" }),
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
];

export const BUFF_BY_ID: Record<string, Buff> = Object.fromEntries(
  ALL_BUFFS.map((b) => [b.id, b]),
);

export const IMPLEMENTED_BUFFS: Buff[] = ALL_BUFFS.filter((b) => b.implemented);

/** Draftable pool per tier (index 1..8; index 0 unused). */
export const BUFF_POOL_BY_TIER: Buff[][] = Array.from({ length: 9 }, (_, t) =>
  IMPLEMENTED_BUFFS.filter((b) => b.tier === t),
);
