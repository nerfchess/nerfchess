import {
  ActiveEffect,
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
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
    targets: (_inst, api, picks) =>
      picks.length > 0
        ? null
        : { kind: "square", label, squares: mySquares(api.board, api.me, type) },
    effect: (inst, _api, picks) => {
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
              (sq) => !picks.some((k) => k.square === sq),
            ),
          },
    (_inst, api, picks) => {
      picks.forEach((k, i) => {
        if (k.square != null) api.place(k.square, specs[i], api.me);
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
      const available = types.some((t) => revivable(api, t) > 0);
      return {
        kind: "square",
        label: "Choose where the revived piece returns",
        squares: available ? emptySquares(api.board, zone(api)) : [],
      };
    },
    (_inst, api, picks) => {
      const type = types.find((t) => revivable(api, t) > 0);
      if (type == null || picks[0]?.square == null) return;
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

/** Activated (no target): take `n` extra moves starting now. */
export function extraMovesNow(n: number): Mech {
  return activatedSimple((_inst, api) => {
    api.bs.extraMoves[api.me] += n;
  });
}

/** Instant: freeze all enemy non-king pieces for `turns` of their turns. */
export function freezeAllEnemies(turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      if (api.board.pieces[sq]!.type === "k") continue;
      addEffect(api, { kind: "freeze", sq, owner: api.opp, turns });
    }
  });
}

/** Activated: freeze one targeted enemy non-king piece. */
export function freezeTarget(turns: number): Mech {
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
        addEffect(api, { kind: "freeze", sq: picks[0].square, owner: api.opp, turns });
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

/** Steal up to `n` of the opponent's unspent buffs (targeted from a list). */
export function stealBuffs(n: number, maxTier?: number): Mech {
  const stealable = (api: BuffApi, taken: number[]) =>
    api.theirs.buffs
      .map((b, index) => ({ b, index }))
      .filter(
        ({ b, index }) =>
          !b.spent && !b.nullified && (!maxTier || b.tier <= maxTier) && !taken.includes(index),
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

/** Instant: cancel all of the opponent's unspent buffs. */
export function nullifyAll(): Mech {
  return instant((_inst, api) => {
    for (const b of api.theirs.buffs) {
      if (!b.spent) b.nullified = true;
    }
  });
}
