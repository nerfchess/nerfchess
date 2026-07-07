import {
  ActiveEffect,
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
  FreezeSkin,
} from "../buff";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";

// ---------------------------------------------------------------------------
// Move-generation helpers for buff-granted movement. All of these produce
// plain from/to Moves (makeMove applies them without validating shape), tagged
// with `via: buffId` so the owning buff can consume its charge when played.
// ---------------------------------------------------------------------------

export const DIAG_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
export const ORTHO_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
export const ALL_DIRS = [...DIAG_DIRS, ...ORTHO_DIRS] as const;
export const KNIGHT_LEAPS = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
] as const;

export function other(c: Color): Color {
  return c === "w" ? "b" : "w";
}

export function mySquares(board: BoardState, color: Color, type?: PieceType): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (p && p.color === color && (!type || p.type === type)) out.push(sq);
  }
  return out;
}

export function emptySquares(board: BoardState, pred?: (sq: Square) => boolean): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    if (!board.pieces[sq] && (!pred || pred(sq))) out.push(sq);
  }
  return out;
}

/** Ranks 1-4 for white, 5-8 for black ("your half"). */
export function inHalf(color: Color, sq: Square): boolean {
  return color === "w" ? RANK(sq) < 4 : RANK(sq) >= 4;
}

export function backRanks(color: Color, depth = 1): (sq: Square) => boolean {
  return (sq) => (color === "w" ? RANK(sq) < depth : RANK(sq) >= 8 - depth);
}

/** Relative rank 1..8 from `color`'s perspective. */
export function relRank(color: Color, sq: Square): number {
  return color === "w" ? RANK(sq) + 1 : 8 - RANK(sq);
}

/** Pawns may never stand on rank 1 or rank 8, whichever side owns them. */
export function pawnRankOk(sq: Square): boolean {
  return RANK(sq) >= 1 && RANK(sq) <= 6;
}

function moveFor(
  board: BoardState,
  from: Square,
  to: Square,
  via: string,
  extra: Partial<Move> = {},
): Move {
  const p = board.pieces[from]!;
  const target = board.pieces[to];
  return {
    from,
    to,
    piece: p.type,
    color: p.color,
    ...(target ? { captured: target.type, capturedSquare: to } : {}),
    via,
    ...extra,
  };
}

/** Sliding moves from `from` along dirs, stopping at blockers (capture enemy). */
export function slideMoves(
  board: BoardState,
  from: Square,
  dirs: readonly (readonly [number, number])[],
  via: string,
  maxDist = 8,
): Move[] {
  const p = board.pieces[from];
  if (!p) return [];
  const out: Move[] = [];
  for (const [df, dr] of dirs) {
    let f = FILE(from) + df, r = RANK(from) + dr, d = 1;
    while (inBoard(f, r) && d <= maxDist) {
      const to = SQ(f, r);
      const t = board.pieces[to];
      if (!t) out.push(moveFor(board, from, to, via));
      else {
        if (t.color !== p.color) out.push(moveFor(board, from, to, via));
        break;
      }
      f += df; r += dr; d++;
    }
  }
  return out;
}

/** Fixed-offset leaps (knight-like) from `from`. */
export function leapMoves(
  board: BoardState,
  from: Square,
  leaps: readonly (readonly [number, number])[],
  via: string,
): Move[] {
  const p = board.pieces[from];
  if (!p) return [];
  const out: Move[] = [];
  for (const [df, dr] of leaps) {
    const f = FILE(from) + df, r = RANK(from) + dr;
    if (!inBoard(f, r)) continue;
    const to = SQ(f, r);
    const t = board.pieces[to];
    if (!t || t.color !== p.color) out.push(moveFor(board, from, to, via));
  }
  return out;
}

/** Non-capturing relocation to any of the given empty squares. */
export function teleportMoves(board: BoardState, from: Square, tos: Square[], via: string): Move[] {
  return tos.filter((to) => !board.pieces[to]).map((to) => moveFor(board, from, to, via));
}

/** Deduplicate against existing moves (same from/to/promotion). */
export function addNovel(moves: Move[], extras: Move[]) {
  for (const e of extras) {
    if (
      !moves.some(
        (m) => m.from === e.from && m.to === e.to && (m.promotion ?? null) === (e.promotion ?? null),
      )
    ) {
      moves.push(e);
    }
  }
}

// ---------------------------------------------------------------------------
// Instance-state conventions shared by the factories:
//   state.charges — uses left for charge-limited augments
//   state.turns   — own turns left for timed passives
//   state.sq      — bound piece's current square for piece-bound buffs
// ---------------------------------------------------------------------------

export function spendOnVia(inst: BuffInstance, move: Move) {
  if (move.via === inst.id && move.color) {
    const charges = ((inst.state.charges as number) ?? 1) - 1;
    inst.state.charges = charges;
    if (charges <= 0) inst.spent = true;
  }
}

/** Track a bound piece: follow its moves, die when it's captured or promotes. */
export function trackBoundPiece(inst: BuffInstance, move: Move, opts?: { dieOnPromote?: boolean }) {
  const sq = inst.state.sq as Square | undefined;
  if (sq == null) return;
  if (move.capturedSquare === sq && move.from !== sq) {
    inst.spent = true;
    return;
  }
  if (move.from === sq) {
    if (opts?.dieOnPromote && move.promotion) inst.spent = true;
    else inst.state.sq = move.to;
  } else if (move.to === sq && move.from !== sq) {
    // Something else landed on our square (capture of the bound piece).
    inst.spent = true;
  }
}

/** Decrement a timed passive after each of the owner's moves. */
export function tickTurns(inst: BuffInstance, move: Move, owner: Color) {
  if (move.color !== owner) return;
  const t = ((inst.state.turns as number) ?? 0) - 1;
  inst.state.turns = t;
  if (t <= 0) inst.spent = true;
}

export function turnsLeft(inst: BuffInstance): number {
  return (inst.state.turns as number) ?? 0;
}

// ---------------------------------------------------------------------------
// Definition factories. Each returns the mechanical part of a Buff; the
// library merges it with name/description/tier metadata.
// ---------------------------------------------------------------------------

type Mech = Partial<Buff> & Pick<Buff, "kind">;

export function instant(effect: (inst: BuffInstance, api: BuffApi) => void): Mech {
  return { kind: "instant", effect: (inst, api) => effect(inst, api) };
}

export function activated(
  targets: Buff["targets"],
  effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => void,
  extra: Partial<Buff> = {},
): Mech {
  return { kind: "activated", targets: targets ?? undefined, effect, ...extra };
}

/** No-target activation (Extra Move, Time Skip...). */
export function activatedSimple(effect: (inst: BuffInstance, api: BuffApi) => void): Mech {
  return { kind: "activated", effect: (inst, api) => effect(inst, api) };
}

export function squareStep(label: string, squares: (api: BuffApi, picks: BuffPick[]) => Square[]) {
  return (api: BuffApi, picks: BuffPick[]): BuffTarget => ({
    kind: "square",
    label,
    squares: squares(api, picks),
  });
}

/** Build a `targets` function from an ordered list of square steps. */
export function steps(
  ...list: ((api: BuffApi, picks: BuffPick[]) => BuffTarget)[]
): Buff["targets"] {
  return (_inst, api, picks) => (picks.length >= list.length ? null : list[picks.length](api, picks));
}

/** Charge-limited move augment; consumed when a tagged move is played. */
export function augment(
  gen: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[],
  charges = 1,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    augmentMoves: (moves, inst, api) => {
      if (((inst.state.charges as number) ?? 0) <= 0) return;
      addNovel(moves, gen(moves, inst, api));
    },
    onMovePlayed: (inst, move) => spendOnVia(inst, move),
    status: (inst) =>
      charges > 1 ? `${(inst.state.charges as number) ?? charges} uses left` : null,
  };
}

/** Timed move augment: active for the owner's next `turns` moves. */
export function timedAugment(
  turns: number,
  gen: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    augmentMoves: (moves, inst, api) => {
      if (turnsLeft(inst) <= 0) return;
      addNovel(moves, gen(moves, inst, api));
    },
    onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.me),
    status: (inst) => `${turnsLeft(inst)} of your turns left`,
  };
}

/** Permanent move augment (Royal Ascension...). */
export function permanentAugment(
  gen: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    augmentMoves: (moves, inst, api) => addNovel(moves, gen(moves, inst, api)),
  };
}

/**
 * Piece-bound permanent augment: activation designates one of your pieces of
 * `type`; from then on that piece also gets moves from `gen`.
 */
export function pieceBound(
  type: PieceType,
  label: string,
  gen: (board: BoardState, sq: Square, via: string) => Move[],
): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    // One activation only: once bound, the card is a permanent passive on
    // that piece and can never be re-aimed at another one.
    targets: (inst, api, picks) =>
      picks.length > 0 || inst.state.sq != null
        ? null
        : { kind: "square", label, squares: mySquares(api.board, api.me, type) },
    effect: (inst, _api, picks) => {
      if (inst.state.sq != null) return;
      inst.state.sq = picks[0]?.square;
    },
    augmentMoves: (moves, inst, api) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      const p = api.board.pieces[sq];
      if (!p || p.color !== api.me) return;
      addNovel(moves, gen(api.board, sq, inst.id));
    },
    onMovePlayed: (inst, move) => trackBoundPiece(inst, move, { dieOnPromote: true }),
    status: (inst) => {
      const sq = inst.state.sq as Square | undefined;
      return sq == null ? "activate to choose a piece" : `bound to ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
    },
  };
}

// --- Common effect builders --------------------------------------------------

export function addEffect(api: BuffApi, e: ActiveEffect) {
  api.bs.effects.push(e);
}

/** Remove `count` enemy pieces of the allowed types (activated, targeted). */
export function removeEnemies(count: number, types: PieceType[]): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: `Choose an enemy piece to remove (${picks.length + 1}/${count})`,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const p = api.board.pieces[sq]!;
              return types.includes(p.type) && !picks.some((k) => k.square === sq);
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.removePiece(k.square);
    },
  );
}

/** Place new pieces on empty squares matching `zone` (activated, targeted). */
export function placePieces(
  specs: PieceType[],
  zone: (api: BuffApi) => (sq: Square) => boolean,
): Mech {
  const names: Record<PieceType, string> = {
    p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
  };
  return activated(
    (_inst, api, picks) =>
      picks.length >= specs.length
        ? null
        : {
            kind: "square",
            label: `Place your new ${names[specs[picks.length]]}`,
            squares: emptySquares(api.board, zone(api)).filter(
              (sq) =>
                (specs[picks.length] !== "p" || pawnRankOk(sq)) &&
                !picks.some((k) => k.square === sq),
            ),
          },
    (_inst, api, picks) => {
      picks.forEach((k, i) => {
        if (k.square != null && (specs[i] !== "p" || pawnRankOk(k.square))) {
          api.place(k.square, specs[i], api.me);
        }
      });
    },
  );
}

/** How many pieces of `type` are revivable (captured minus already revived). */
export function revivable(api: BuffApi, type: PieceType): number {
  return (api.capturedFromMe[type] ?? 0) - (api.mine.revived[type] ?? 0);
}

export function markRevived(api: BuffApi, type: PieceType, n = 1) {
  api.mine.revived[type] = (api.mine.revived[type] ?? 0) + n;
}

/** Revive one captured piece of the given types onto a targeted empty square. */
export function reviveOne(types: PieceType[], zone: (api: BuffApi) => (sq: Square) => boolean): Mech {
  return activated(
    (_inst, api, picks) => {
      if (picks.length > 0) return null;
      const type = types.find((t) => revivable(api, t) > 0);
      return {
        kind: "square",
        label: "Choose where the revived piece returns",
        squares:
          type == null
            ? []
            : emptySquares(api.board, zone(api)).filter(
                (sq) => type !== "p" || pawnRankOk(sq),
              ),
      };
    },
    (_inst, api, picks) => {
      const type = types.find((t) => revivable(api, t) > 0);
      if (type == null || picks[0]?.square == null) return;
      if (type === "p" && !pawnRankOk(picks[0].square)) return;
      api.place(picks[0].square, type, api.me);
      markRevived(api, type);
    },
  );
}

/** Instant: opponent skips their next `n` turns. */
export function skipOpponent(n: number): Mech {
  return instant((_inst, api) => {
    api.bs.skips[api.opp] += n;
  });
}

/** Activated (no target): take `n` extra moves starting now. Free action:
 * the card grants moves within the activator's turn, so using it does not
 * also cost that turn. */
export function extraMovesNow(n: number): Mech {
  return {
    ...activatedSimple((_inst, api) => {
      api.bs.extraMoves[api.me] += n;
    }),
    freeAction: true,
  };
}

/** Instant: freeze all enemy non-king pieces for `turns` of their turns. */
export function freezeAllEnemies(turns: number, skin?: FreezeSkin): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      if (api.board.pieces[sq]!.type === "k") continue;
      addEffect(api, { kind: "freeze", sq, owner: api.opp, turns, ...(skin ? { skin } : {}) });
    }
  });
}

/** Activated: freeze one targeted enemy non-king piece. */
export function freezeTarget(turns: number, skin?: FreezeSkin): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label: "Choose an enemy piece to freeze",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, {
          kind: "freeze",
          sq: picks[0].square,
          owner: api.opp,
          turns,
          ...(skin ? { skin } : {}),
        });
      }
    },
  );
}

/** Instant: my whole army is uncapturable for `turns` of the opponent's turns. */
export function shieldArmy(turns: number): Mech {
  return instant((_inst, api) => {
    addEffect(api, { kind: "shield", owner: api.me, squares: null, turns });
  });
}

/** Instant: shield fixed squares (they follow the pieces standing on them). */
export function shieldZone(
  squares: (api: BuffApi) => Square[],
  turns: number | null,
): Mech {
  return instant((_inst, api) => {
    addEffect(api, { kind: "shield", owner: api.me, squares: squares(api), turns });
  });
}

/** Activated: pick a square; its whole rank/file becomes impassable to the enemy. */
export function barLine(axis: "rank" | "file", turns: number | null, count = 1): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label:
              axis === "rank"
                ? "Pick any square on the rank to seal"
                : "Pick any square on the file to seal",
            squares: Array.from({ length: 64 }, (_, i) => i),
          },
    (_inst, api, picks) => {
      for (const k of picks) {
        if (k.square == null) continue;
        const squares: Square[] = [];
        for (let i = 0; i < 8; i++) {
          squares.push(axis === "rank" ? SQ(i, RANK(k.square)) : SQ(FILE(k.square), i));
        }
        addEffect(api, { kind: "barred", squares, against: api.opp, turns });
      }
    },
  );
}

/** Capture square of a move, if any (handles en passant). */
export function captureSquare(m: Move): Square | null {
  return m.capturedSquare ?? (m.captured ? m.to : null);
}

/** Permanent passive that filters the opponent's legal moves. */
export function oppFilter(
  filter: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[],
): Mech {
  return { kind: "passive", filterOpponentMoves: filter };
}

/** Timed opponent-move filter: active for the OPPONENT'S next `turns` turns.
 * The timer ticks on the restricted side's moves (matching effectTickColor's
 * convention for barred / no_pawn_advance / king_only), so a card that says
 * "for their next N turns" restricts exactly N of their turns even when
 * skips or extra moves disturb the usual alternation. */
export function timedOppFilter(
  turns: number,
  filter: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if (turnsLeft(inst) <= 0) return moves;
      const filtered = filter(moves, inst, api);
      // Safety net: a timed opponent filter must never strand the opponent
      // with zero moves. Every current caller is a partial filter, but this
      // guard means no future caller can hard-lock a turn either.
      return filtered.length > 0 ? filtered : moves;
    },
    onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

// ---------------------------------------------------------------------------
// Explosions (the atomic-capture family).
// ---------------------------------------------------------------------------

/** Predicate: is this square protected for `owner` by an active shield? */
function shieldedFor(api: BuffApi, owner: Color): (sq: Square) => boolean {
  const zones: (Square[] | null)[] = [];
  for (const e of api.bs.effects) {
    if (e.kind === "shield" && e.owner === owner && (e.turns == null || e.turns > 0)) {
      zones.push(e.squares);
    }
  }
  return (sq) => zones.some((squares) => (squares ? squares.includes(sq) : true));
}

export interface ExplodeOpts {
  /** Only the two squares horizontally beside the center. */
  beside?: boolean;
  /** Pawns survive the blast (classic atomic rule). */
  sparePawns?: boolean;
  /** Removed pieces detonate their own neighborhoods in turn. */
  chain?: boolean;
  /** Blast radius in squares (default 1). */
  radius?: number;
}

/** Clear enemy pieces around `center`. Kings always survive; shielded enemy
 * pieces resist the blast. */
export function explodeAt(api: BuffApi, center: Square, opts: ExplodeOpts = {}) {
  const isShielded = shieldedFor(api, api.opp);
  const radius = opts.radius ?? 1;
  const queue: Square[] = [center];
  const seen = new Set<Square>([center]);
  while (queue.length) {
    const c = queue.shift()!;
    for (let df = -radius; df <= radius; df++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (df === 0 && dr === 0) continue;
        if (opts.beside && !(dr === 0 && Math.abs(df) === 1)) continue;
        const f = FILE(c) + df, r = RANK(c) + dr;
        if (!inBoard(f, r)) continue;
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") continue;
        if (opts.sparePawns && p.type === "p") continue;
        if (isShielded(sq)) continue;
        api.removePiece(sq);
        if (opts.chain && !seen.has(sq)) {
          seen.add(sq);
          queue.push(sq);
        }
      }
    }
  }
}

/** Passive: the owner's captures detonate around the captured square.
 * `onMyLosses` also detonates when the opponent captures the owner's pieces
 * (the blast still only clears enemy pieces). */
export function captureExplosion(
  opts: ExplodeOpts & { charges?: number; onMyLosses?: boolean } = {},
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      if (opts.charges != null) inst.state.charges = opts.charges;
    },
    onMovePlayed: (inst, move, api) => {
      if (!move.captured || move.captured === "k") return;
      if (move.color !== api.me && !(opts.onMyLosses && move.color === api.opp)) return;
      if (opts.charges != null) {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      }
      explodeAt(api, captureSquare(move) ?? move.to, opts);
    },
    status:
      opts.charges != null
        ? (inst) => `${(inst.state.charges as number) ?? opts.charges} captures left`
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Phasing movement and bound-piece upgrades.
// ---------------------------------------------------------------------------

/** Sliding moves that may pass through up to `maxThrough` friendly pieces
 * (never capturing them). Unphased lines are covered by the base rules. */
export function phasingSlideMoves(
  board: BoardState,
  from: Square,
  dirs: readonly (readonly [number, number])[],
  via: string,
  maxThrough = 1,
): Move[] {
  const p = board.pieces[from];
  if (!p) return [];
  const out: Move[] = [];
  for (const [df, dr] of dirs) {
    let f = FILE(from) + df, r = RANK(from) + dr, passed = 0;
    while (inBoard(f, r)) {
      const to = SQ(f, r);
      const t = board.pieces[to];
      if (!t) {
        if (passed > 0) out.push(moveFor(board, from, to, via));
      } else if (t.color === p.color) {
        passed++;
        if (passed > maxThrough) break;
      } else {
        if (passed > 0) out.push(moveFor(board, from, to, via));
        break;
      }
      f += df; r += dr;
    }
  }
  return out;
}

/** Candidate squares for binding: my non-king pieces, optionally by type. */
export function bindCandidates(types?: PieceType[]) {
  return (api: BuffApi) =>
    mySquares(api.board, api.me).filter((sq) => {
      const t = api.board.pieces[sq]!.type;
      return t !== "k" && (!types || types.includes(t));
    });
}

/**
 * Bound-piece upgrade: activation designates one of my pieces; while the buff
 * lives (optionally `turns` of my turns) the piece gets extra moves from
 * `gen`, protection via `filterOpp`, an optional shield effect, and an
 * optional explosion whenever it captures.
 */
export function bindPiece(
  label: string,
  candidates: (api: BuffApi) => Square[],
  opts: {
    turns?: number;
    /** Add a shield effect on the piece (null = permanent). */
    shieldTurns?: number | null;
    gen?: (board: BoardState, sq: Square, via: string) => Move[];
    filterOpp?: (moves: Move[], sq: Square, api: BuffApi) => Move[];
    explodeOnCapture?: boolean;
  },
): Mech {
  const active = (inst: BuffInstance) => opts.turns == null || turnsLeft(inst) > 0;
  return {
    kind: "activated",
    spendOnUse: false,
    // One activation only: once bound, the upgrade can never be re-aimed
    // (re-activating would also stack fresh shield effects and reset timers).
    targets: (inst, api, picks) =>
      picks.length > 0 || inst.state.sq != null
        ? null
        : { kind: "square", label, squares: candidates(api) },
    effect: (inst, api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null || inst.state.sq != null) return;
      inst.state.sq = sq;
      if (opts.turns != null) inst.state.turns = opts.turns;
      if (opts.shieldTurns !== undefined) {
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: opts.shieldTurns });
      }
    },
    augmentMoves: opts.gen
      ? (moves, inst, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null || !active(inst)) return;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) return;
          addNovel(moves, opts.gen!(api.board, sq, inst.id));
        }
      : undefined,
    filterOpponentMoves: opts.filterOpp
      ? (moves, inst, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null || !active(inst)) return moves;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) return moves;
          return opts.filterOpp!(moves, sq, api);
        }
      : undefined,
    onMovePlayed: (inst, move, api) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      if (
        opts.explodeOnCapture &&
        move.from === sq &&
        move.color === api.me &&
        move.captured &&
        move.captured !== "k" &&
        active(inst)
      ) {
        explodeAt(api, captureSquare(move) ?? move.to);
      }
      trackBoundPiece(inst, move);
      if (opts.turns != null) tickTurns(inst, move, api.me);
    },
    status: (inst) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return "activate to choose a piece";
      const name = `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      return opts.turns != null
        ? `bound to ${name}, ${turnsLeft(inst)} of your turns left`
        : `bound to ${name}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Multi-piece relocation, line sweeps, void squares.
// ---------------------------------------------------------------------------

/** Move `count` of my pieces via alternating piece / destination picks.
 * `zone` lists raw candidate destinations for a piece; occupancy is checked
 * here, accounting for earlier planned relocations. */
export function relocateMany(
  count: number,
  zone: (api: BuffApi, from: Square) => Square[],
): Mech {
  // Destinations for one picked piece: inside the zone, unused, empty (or
  // vacated by an earlier pick), and never ranks 1/8 for a pawn.
  const destsFor = (api: BuffApi, from: Square, tos: Square[], vacated: Square[]) =>
    zone(api, from).filter((sq) => {
      if (sq === from || tos.includes(sq)) return false;
      if (api.board.pieces[from]!.type === "p" && !pawnRankOk(sq)) return false;
      if (vacated.includes(sq)) return true;
      return !api.board.pieces[sq];
    });
  return activated(
    (_inst, api, picks) => {
      if (picks.length >= count * 2) return null;
      const froms = picks.filter((_, i) => i % 2 === 0).map((k) => k.square!);
      const tos = picks.filter((_, i) => i % 2 === 1).map((k) => k.square!);
      if (picks.length % 2 === 0) {
        // Only offer pieces that have somewhere legal to go (a pawn has no
        // destinations on a back-rank zone, for example).
        const squares = mySquares(api.board, api.me).filter(
          (sq) =>
            api.board.pieces[sq]!.type !== "k" &&
            !froms.includes(sq) &&
            !tos.includes(sq) &&
            destsFor(api, sq, tos, froms).length > 0,
        );
        if (!squares.length && picks.length > 0) return null;
        return {
          kind: "square",
          label: `Choose a piece to move (${froms.length + 1}/${count})`,
          squares,
          // Every completed piece move is a full effect on its own: after
          // the first one the player may stop instead of moving all `count`.
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      }
      const from = froms[froms.length - 1];
      const priorFroms = froms.slice(0, -1);
      const squares = destsFor(api, from, tos, priorFroms);
      if (!squares.length) return null;
      return { kind: "square", label: "Choose its destination", squares };
    },
    (_inst, api, picks) => {
      for (let i = 0; i + 1 < picks.length; i += 2) {
        const from = picks[i].square, to = picks[i + 1].square;
        if (from == null || to == null) continue;
        if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
      }
    },
  );
}

/** Activated: pick one of my `type` pieces, then a destination along a ray;
 * every enemy piece on the way (destination included) is removed, up to
 * `maxCaptures` (null = unlimited). Friendly pieces and kings block the ray. */
export function lineSweep(
  type: PieceType,
  dirs: readonly (readonly [number, number])[],
  maxCaptures: number | null,
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
      return {
        kind: "square",
        label: "Choose where the sweep ends",
        squares: dests(api, picks[0].square!),
      };
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
    },
  );
}

/** Activated: mark `count` empty squares; any enemy piece except a king that
 * moves onto one is removed. `turns` = owner's turns of lifetime, null =
 * permanent. */
export function voidSquares(count: number, turns: number | null): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    // One activation only: once the voids are placed they never move.
    targets: (inst, api, picks) =>
      picks.length >= count || inst.state.squares != null
        ? null
        : {
            kind: "square",
            label:
              count > 1
                ? `Choose a void square (${picks.length + 1}/${count})`
                : "Choose the void square",
            squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
          },
    effect: (inst, _api, picks) => {
      if (inst.state.squares != null) return;
      inst.state.squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
      if (turns != null) inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return;
      if (move.color === api.opp && squares.includes(move.to) && move.piece !== "k") {
        api.removePiece(move.to);
      }
      if (turns != null) tickTurns(inst, move, api.me);
    },
    status: (inst) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return "activate to place";
      const names = squares
        .map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`)
        .join(", ");
      return turns != null
        ? `swallowing at ${names}, ${turnsLeft(inst)} of your turns left`
        : `swallowing at ${names}`;
    },
  };
}

/** Steal up to `n` of the opponent's unspent buffs (targeted from a list).
 * `canSteal` lets the library exclude cards a transfer cannot carry cleanly
 * (locked-in piece-bound upgrades stay with their owner). */
export function stealBuffs(
  n: number,
  maxTier?: number,
  canSteal?: (b: BuffInstance) => boolean,
): Mech {
  const stealable = (api: BuffApi, taken: number[]) =>
    api.theirs.buffs
      .map((b, index) => ({ b, index }))
      .filter(
        ({ b, index }) =>
          !b.spent &&
          !b.nullified &&
          (!maxTier || b.tier <= maxTier) &&
          (!canSteal || canSteal(b)) &&
          !taken.includes(index),
      );
  return activated(
    (_inst, api, picks) => {
      if (picks.length >= n) return null;
      const taken = picks.map((k) => k.buffIndex!).filter((i) => i != null);
      const options = stealable(api, taken).map(({ b, index }) => ({
        index,
        name: b.id,
        tier: b.tier,
      }));
      if (options.length === 0) return picks.length === 0
        ? { kind: "enemy-buff", label: "No buffs to steal", options: [] }
        : null;
      return {
        kind: "enemy-buff",
        label: n > 1 ? `Choose a buff to steal (${picks.length + 1}/${n})` : "Choose a buff to steal",
        options,
      };
    },
    (_inst, api, picks) => {
      const indexes = picks
        .map((k) => k.buffIndex)
        .filter((i): i is number => i != null)
        .sort((a, b) => b - a);
      for (const i of indexes) {
        const [stolen] = api.theirs.buffs.splice(i, 1);
        if (stolen) api.mine.buffs.push(stolen);
      }
    },
  );
}
