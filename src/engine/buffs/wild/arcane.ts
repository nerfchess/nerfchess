// Wild set: ARCANE, TIME & META. Spellcasters bending the board and the draft
// itself: blinks and teleports, transmutation and conjuring, time-stops and
// stolen clock, plus the meta layer (buff theft, reveals, draft manipulation).
// Every card reuses a primitive that already ships in the engine (helpers.ts)
// or an existing board-effect kind (freeze / walnut / shield / barred / void),
// draft flag, or clock request. No card invents an engine primitive.
//
// Like wild/elemental.ts this is a single self-contained file: it imports the
// shared primitives straight from ../helpers and keeps LOCAL copies of the few
// composite helpers that live in a sibling shared.ts there (curse, walnutAll,
// petrifyTarget, summonTemp, convertEnemies, transformOwn, swapOwnPieces,
// shieldTarget) so it needs no barrel of its own. Safety rails come from the
// wrapped helpers: kings are never frozen, petrified, converted, or targeted,
// and every opponent-move filter keeps a non-empty fallback (via `curse`) so no
// card can ever soft-lock a turn.

import { Buff, BuffApi, BuffCategory, CardFx } from "../../buff";
import { Tier } from "../../nerf";
import { FILE, inBoard, Move, PieceType, RANK, SQ, Square } from "../../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  ORTHO_DIRS,
  activated,
  addEffect,
  emptySquares,
  extraMovesNow,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  markRevived,
  mySquares,
  permanentAugment,
  pieceBound,
  relocateMany,
  removeEnemies,
  slideMoves,
  stealBuffs,
  timedOppFilter,
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

// --- Placement / summon zones ( (api) => (sq) => boolean ) -------------------
const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
const backRankZone = (api: BuffApi) => (sq: Square) =>
  RANK(sq) === (api.me === "w" ? 0 : 7);

// --- Teleport destination candidates ( (api, from) => Square[] ) -------------
// relocateMany filters occupancy and the pawn never-on-rank-1/8 rule itself, so
// these need only list the raw squares the current piece may consider.
const anyEmptyDest = (_api: BuffApi, _from: Square): Square[] =>
  Array.from({ length: 64 }, (_, i) => i);
const myHalfDest = (api: BuffApi, _from: Square): Square[] =>
  Array.from({ length: 64 }, (_, i) => i).filter((sq) => inHalf(api.me, sq));

// A 3-1 "camel" leap set, reused by Camel Rider.
const CAMEL_LEAPS = [
  [1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1],
] as const;

// A bound upgrade that has already latched onto its owner's square(s) cannot be
// carried cleanly by a steal (its effects are keyed to the victim's board), so
// buff-theft only offers cards that have never been activated / bound.
const unboundOnly = (b: { state: Record<string, unknown> }): boolean =>
  b.state.sq == null && b.state.sqs == null && b.state.squares == null;

// ---------------------------------------------------------------------------
// Local composite helpers (copies of the sibling shared.ts surfaces).
// ---------------------------------------------------------------------------

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

/** Activated: one targeted enemy piece (never a king) is petrified for `turns`
 * of their turns. */
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

/** Activated: pick one of your pieces; its square is shielded (uncapturable)
 * for `turns` of the opponent's turns. Optionally restricted to piece types. */
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

/** A temporary summon: place a fresh piece, then remove it after `turns` of the
 * owner's own turns. Copied from wild/elemental.ts's summonTemp: it ticks its
 * own timer, follows the piece, and retires it via an uncounted removePiece so
 * nothing enters the revive pool. Non-pawns only, so there is never a promotion
 * edge to track. */
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

/** Activated: transmute `count` of your own pieces of `fromTypes` into `to`
 * (never a king). Copied from fantasy/shared.ts; uses setPieceType. */
function transformOwn(
  count: number,
  fromTypes: PieceType[],
  to: Exclude<PieceType, "k">,
  label: string,
): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: count > 1 ? `${label} (${picks.length + 1}/${count})` : label,
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return fromTypes.includes(t) && !picks.some((k) => k.square === sq);
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.setPieceType(k.square, to);
    },
  );
}

/** Activated: swap up to `pairs` pairs of your own pieces. Copied from
 * library.ts's swapOwnPieces: every completed pair is a full effect, so after
 * the first the next pair's opening pick is finishable. */
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

// ---------------------------------------------------------------------------

export const WILD_ARCANE: Buff[] = [
  // ===================== TELEPORTATION =====================
  card(
    {
      id: "wa_blink",
      name: "Blink",
      description:
        "Your king blinks: it trades places with one of your knights, bishops, or rooks, once.",
      tier: 3,
      category: "movement",
      requires: ["n", "b", "r"],
      flavor: "Here, then not. There, then crowned.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece your king trades places with",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const other = picks[0]?.square;
        const kingSq = mySquares(api.board, api.me, "k")[0];
        if (other == null || kingSq == null || other === kingSq) return;
        const t = api.board.pieces[other]?.type;
        if (!t || t === "k" || t === "p" || t === "q") return;
        api.removePiece(other, { uncounted: true });
        api.relocate(kingSq, other);
        api.place(kingSq, t, api.me);
      },
    ),
  ),
  card(
    {
      id: "wa_far_step",
      icon: "Compass",
      name: "Far Step",
      description:
        "Teleport one of your pieces (not the king) to any empty square on the board, once.",
      tier: 4,
      category: "movement",
      flavor: "Distance is a suggestion.",
    },
    relocateMany(1, anyEmptyDest),
  ),
  card(
    {
      id: "wa_twin_blink",
      name: "Twin Blink",
      description:
        "Two knots in the world come undone at once: choose one of your pieces and one enemy piece (kings aside); each blinks away to a random empty square.",
      tier: 5,
      category: "movement",
      flavor: "Nobody lands where they meant to.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose your piece to blink",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose the enemy piece to blink",
          squares: mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type !== "k",
          ),
        };
      },
      (_inst, api, picks) => {
        // Both blinks draw from the seeded api.rng, so every replica lands the
        // pieces on the identical squares (desync-safe).
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (!p || p.type === "k") continue;
          const spots = emptySquares(api.board).filter(
            (to) => p.type !== "p" || (RANK(to) >= 1 && RANK(to) <= 6),
          );
          if (!spots.length) continue;
          api.relocate(sq, spots[api.rng.int(spots.length)]);
        }
      },
    ),
  ),
  card(
    {
      id: "wa_swap_flanks",
      name: "Fold Space",
      description:
        "Swap the squares of up to two pairs of your own pieces, once.",
      tier: 4,
      category: "movement",
      flavor: "Two folds and the map is redrawn.",
    },
    swapOwnPieces(undefined, 2),
  ),

  // ===================== PHASE / MOVEMENT GRANTS =====================
  card(
    {
      id: "wa_ghostwalk_bishop",
      name: "Ghostwalk",
      description:
        "One of your bishops may also step one square straight, like a rook, for the rest of the game.",
      tier: 3,
      category: "movement",
      requires: ["b"],
      flavor: "It slips off its color.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "r", self: true },
    },
    pieceBound("b", "Choose the bishop to teach the ghostwalk", (board, sq, via) =>
      slideMoves(board, sq, ORTHO_DIRS, via, 1),
    ),
  ),
  card(
    {
      id: "wa_camel_rider",
      name: "Camel Rider",
      description:
        "One of your knights may also make a longer 3-by-1 leap for the rest of the game.",
      tier: 4,
      category: "movement",
      requires: ["n"],
      flavor: "A wider gait across the sand.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "n", self: true },
    },
    pieceBound("n", "Choose the knight to mount the camel", (board, sq, via) =>
      leapMoves(board, sq, CAMEL_LEAPS, via),
    ),
  ),
  card(
    {
      id: "wa_arcane_conduit",
      name: "Arcane Conduit",
      description:
        "One of your rooks may also move up to two squares diagonally for the rest of the game.",
      tier: 4,
      category: "movement",
      requires: ["r"],
      flavor: "Power leaks out at the corners.",
      fx: { motif: "empower", pieces: ["r"], moveAs: "b", self: true },
    },
    pieceBound("r", "Choose the rook to channel the conduit", (board, sq, via) =>
      slideMoves(board, sq, DIAG_DIRS, via, 2),
    ),
  ),

  // ===================== CONJURATION =====================
  card(
    {
      id: "wa_conjure_scout",
      name: "Conjured Scout",
      description:
        "Conjure a knight on an empty square on your back rank. It fights for 2 of your turns, then fades.",
      tier: 3,
      category: "pieces",
      flavor: "Borrowed from somewhere quieter.",
    },
    summonTemp("n", 2, backRankZone),
  ),
  card(
    {
      id: "wa_conjure_bishop",
      name: "Conjured Bishop",
      description:
        "Conjure your bishop's reflection: choose one of your bishops whose mirror square (same rank, file flipped left-to-right) is empty, and a new bishop appears there.",
      tier: 4,
      category: "pieces",
      requires: ["b"],
      flavor: "Faith, made solid, in the looking glass.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the bishop to reflect",
              squares: mySquares(api.board, api.me, "b").filter(
                (sq) => !api.board.pieces[SQ(7 - FILE(sq), RANK(sq))],
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const mirror = SQ(7 - FILE(sq), RANK(sq));
        if (mirror !== sq && !api.board.pieces[mirror]) api.place(mirror, "b", api.me);
      },
    ),
  ),
  card(
    {
      id: "wa_conjure_rook",
      name: "Conjured Rook",
      description:
        "Conjure a spectral rook into your pocket, then spend a later turn to drop it onto any empty square. It stays as long as you do.",
      tier: 5,
      category: "pieces",
      flavor: "A tower that was never built, delivered flat-packed.",
    },
    instant((_inst, api) => grantInventory(api, "r", 1)),
  ),
  card(
    {
      id: "wa_spectral_minors",
      name: "Spectral Retinue",
      description:
        "Your retinue turns spectral and re-forms: every one of your knights becomes a bishop, and every one of your bishops becomes a knight, where they stand.",
      tier: 3,
      category: "pieces",
      flavor: "Same souls, new silhouettes.",
    },
    instant((_inst, api) => {
      const knights = mySquares(api.board, api.me, "n");
      const bishops = mySquares(api.board, api.me, "b");
      for (const sq of knights) api.setPieceType(sq, "b");
      for (const sq of bishops) api.setPieceType(sq, "n");
    }),
  ),
  card(
    {
      id: "wa_twin_familiars",
      name: "Twin Familiars",
      description:
        "A familiar perches on each of your bishops: for the rest of the game your bishops may also step one square straight (up, down, or sideways), finally changing their color.",
      tier: 5,
      category: "movement",
      requires: ["b"],
      flavor: "One for each shoulder.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "k", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "b").flatMap((sq) =>
        slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1),
      ),
    ),
  ),

  // ===================== TRANSMUTATION =====================
  card(
    {
      id: "wa_transmute",
      icon: "TestTube",
      name: "Transmute",
      description: "Turn one of your pawns into a knight, once.",
      tier: 3,
      category: "pieces",
      requires: ["p"],
      flavor: "A little more shape to it now.",
    },
    transformOwn(1, ["p"], "n", "Choose a pawn to transmute into a knight"),
  ),
  card(
    {
      id: "wa_leaden_crown",
      name: "Leaden Crown",
      description:
        "Turn one of your pawns into a queen, and the leaden crown guards it: that new queen cannot be captured for your opponent's next 2 turns.",
      tier: 6,
      category: "pieces",
      requires: ["p"],
      flavor: "Base metal, crowned early, heavy enough to turn a blade.",
      fx: { motif: "ward", pieces: ["q"], self: true },
    },
    // Distinct from library's double_queen (a plain pawn-to-queen promotion): the
    // crown is leaden, so the fresh queen is also shielded from capture for the
    // opponent's next 2 turns. Reuses setPieceType + the shield board-effect that
    // Royal Aegis already lays on a queen's square.
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose a pawn to crown",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.setPieceType(sq, "q");
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "wa_dominate_minor",
      name: "Dominate",
      description: "Take control of one enemy knight or bishop for your next 3 turns. When the time is up it reverts to your opponent.",
      tier: 4,
      category: "pieces",
      flavor: "Its allegiance was always negotiable, and only ever a loan.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight or bishop to dominate",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.setPieceColor(sq, api.me);
        inst.state.sq = sq;
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) { inst.spent = true; inst.state.sq = undefined; return; }
        if (move.from === sq) { inst.state.sq = move.to; sq = move.to; }
        else if (move.to === sq && move.from !== sq) { inst.spent = true; inst.state.sq = undefined; return; }
        if (move.color !== api.me) return;
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          const cur = inst.state.sq as Square | undefined;
          if (cur != null && api.board.pieces[cur]?.color === api.me) api.setPieceColor(cur, api.opp);
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to dominate a minor"
          : `dominated, ${(inst.state.turns as number) ?? 0} of your turns left`,
    },
  ),
  card(
    {
      id: "wa_dominate_major",
      name: "Grand Dominion",
      description: "Take control of one enemy rook or queen: it becomes yours, once.",
      tier: 7,
      category: "pieces",
      flavor: "The bigger the will, the sweeter the break.",
    },
    convertEnemies(1, ["r", "q"], "Choose an enemy rook or queen to dominate"),
  ),

  // ===================== TIME: FREEZE & STOP =====================
  card(
    {
      id: "wa_stasis_field",
      name: "Phase Field",
      description: "One of your bishops slips half out of the world: each move it may pass through a single piece of either color, for the game. It still cannot capture its own side.",
      tier: 3,
      category: "movement",
      requires: ["b"],
      flavor: "Held between one second and the next.",
      fx: { motif: "empower", pieces: ["b"], self: true },
    },
    pieceBound("b", "Choose the bishop that phases", (board, sq, via) => {
      const out: Move[] = [];
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let f = FILE(sq) + df, r = RANK(sq) + dr, passed = 0;
        while (inBoard(f, r)) {
          const to = SQ(f, r);
          const t = board.pieces[to];
          if (!t) {
            if (passed > 0) {
              out.push({ from: sq, to, piece: "b", color: board.pieces[sq]!.color, via });
            }
          } else if (passed === 0) {
            passed = 1;
          } else {
            if (t.color !== board.pieces[sq]!.color) {
              out.push({
                from: sq,
                to,
                piece: "b",
                color: board.pieces[sq]!.color,
                captured: t.type,
                capturedSquare: to,
                via,
              });
            }
            break;
          }
          f += df;
          r += dr;
        }
      }
      return out;
    }),
  ),
  card(
    {
      id: "wa_time_stop",
      name: "Time Stop",
      description:
        "Stop one piece in time, yours or theirs (never a king): for 2 of its owner's turns it cannot move, and it cannot be captured. It is simply not here right now.",
      tier: 4,
      category: "tempo",
      flavor: "For it, the clock simply stopped.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to stop in time",
              squares: [...mySquares(api.board, api.me), ...mySquares(api.board, api.opp)].filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: p.color, turns: 2, skin: "bubble" });
        addEffect(api, { kind: "shield", owner: p.color, squares: [sq], turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "wa_arrest_time",
      name: "Arrest the Hour",
      description:
        "Freeze one enemy rook or queen for 3 of their turns.",
      tier: 5,
      category: "tempo",
      flavor: "The heavy hand of the clock, stayed.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to freeze",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "q";
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "freeze", sq: picks[0].square, owner: api.opp, turns: 3 });
        }
      },
    ),
  ),
  card(
    {
      id: "wa_frozen_moment",
      name: "Frozen Moment",
      description:
        "Seal this moment in glass: choose one enemy piece except a king. After 3 of their turns, wherever it has run to, it is snapped back to the square it stands on right now (if that square is free again).",
      tier: 5,
      category: "tempo",
      flavor: "The board remembers exactly where you were.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: one moment sealed per card.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the piece to seal in the moment",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.home = sq;
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the sealed piece; the moment shatters if it is captured.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        const cur = inst.state.sq as Square | undefined;
        const home = inst.state.home as Square | undefined;
        if (cur != null && home != null && cur !== home && !api.board.pieces[home]) {
          const p = api.board.pieces[cur];
          if (p && p.color === api.opp) api.relocate(cur, home);
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to seal the moment"
          : `snaps back in ${(inst.state.turns as number) ?? 0} of their turns`,
    },
  ),
  card(
    {
      id: "wa_stone_pawns",
      name: "Stone the Pawns",
      description:
        "Turn every one of your opponent's pawns to stone for their next 3 turns: each may only shuffle one square at a time and cannot break into a full stride.",
      tier: 4,
      category: "tempo",
      flavor: "The whole front row, set in grey, for a good long while.",
      fx: { motif: "jail", pieces: ["p"] },
    },
    walnutAll(["p"], 3),
  ),

  // ===================== TIME: TEMPO & CLOCK =====================
  card(
    {
      id: "wa_quicken",
      name: "Quicken",
      description: "Time reasserts itself around your army: every freeze, stasis, and walnut afflicting YOUR pieces is dispelled on the spot.",
      tier: 4,
      category: "protection",
      flavor: "Two heartbeats in one, and both of them yours.",
    },
    instant((_inst, api) => {
      api.bs.effects = api.bs.effects.filter(
        (e) => !((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me),
      );
    }),
  ),
  card(
    {
      id: "wa_stolen_hours",
      name: "Stolen Hours",
      description:
        "Steal 20 seconds from your opponent's clock and take one extra move this turn. You cannot capture the king on the bonus move.",
      tier: 5,
      category: "tempo",
      flavor: "Turn their spent minutes into one more of your moves.",
      fx: { motif: "rally", self: true },
    },
    instant((_inst, api) => {
      api.adjustClock({ stealFlatSec: 20, stealCapSec: 20 });
      api.bs.extraMoves[api.me] += 1;
    }),
  ),
  card(
    {
      id: "wa_borrowed_minute",
      name: "Borrowed Minute",
      description:
        "Borrow one enemy knight for a minute: it fights for you for your next 2 turns, then walks back to their side. If it dies meanwhile, the loan is settled.",
      tier: 4,
      category: "pieces",
      flavor: "A knight here, a knight there. Receipts available.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: one loan per card.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy knight to borrow",
              squares: mySquares(api.board, api.opp, "n"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        if (api.board.pieces[sq]?.type !== "n") return;
        api.setPieceColor(sq, api.me);
        inst.state.sq = sq;
        inst.state.turns = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the borrowed knight; the loan settles if it is captured.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          const cur = inst.state.sq as Square | undefined;
          if (cur != null) {
            const p = api.board.pieces[cur];
            if (p && p.color === api.me && p.type === "n") api.setPieceColor(cur, api.opp);
          }
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to borrow a knight"
          : `loan due in ${(inst.state.turns as number) ?? 0} of your turns`,
    },
  ),
  card(
    {
      id: "wa_chrono_siphon",
      name: "Chrono Siphon",
      description:
        "Steal up to 20 seconds from your opponent's clock and freeze one enemy piece for its next 2 turns.",
      tier: 4,
      category: "tempo",
      flavor: "Draw the time off a single piece, slowly, like heat.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to siphon and freeze",
              squares: mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "freeze", sq: picks[0].square, owner: api.opp, turns: 2 });
        }
        api.adjustClock({ stealFlatSec: 20, stealCapSec: 20 });
      },
    ),
  ),

  // ===================== ARCANE WARDS & RIFTS =====================
  card(
    {
      id: "wa_sigil_ward",
      name: "Sigil Ward",
      description:
        "Choose one of your pieces: it cannot be captured for your opponent's next 3 turns, and the first enemy piece to move up next to it in that time is frozen for its next 2 turns.",
      tier: 3,
      category: "protection",
      flavor: "A drawn circle it may not cross, and it stings the first hand that reaches in.",
      fx: { motif: "ward", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose a piece to ward",
              squares: mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]!.type !== "k"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        inst.state.retaliated = false;
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.from === sq) inst.state.sq = move.to;
        const cur = inst.state.sq as Square;
        if (move.color !== api.opp || ((inst.state.turns as number) ?? 0) <= 0) return;
        if (
          inst.state.retaliated !== true &&
          move.piece !== "k" &&
          api.board.pieces[move.to]?.color === api.opp &&
          Math.max(Math.abs(FILE(move.to) - FILE(cur)), Math.abs(RANK(move.to) - RANK(cur))) === 1
        ) {
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2, skin: "shock" });
          inst.state.retaliated = true;
        }
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to ward a piece"
          : `warded, ${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "wa_royal_aegis",
      name: "Royal Aegis",
      description:
        "Your king and your queen cannot be captured for your opponent's next 2 turns.",
      tier: 5,
      category: "protection",
      flavor: "The crown and the sword, both under glass.",
      fx: { motif: "ward", pieces: ["k", "q"], self: true },
    },
    instant((_inst, api) => {
      // A square shield never protects the king (engine rule that keeps the
      // game winnable), so protect the king with king_safe and shield the queen.
      // Together the card's "king and queen" promise is actually true.
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      const q = mySquares(api.board, api.me).filter(
        (sq) => api.board.pieces[sq]!.type === "q",
      );
      if (q.length) {
        addEffect(api, { kind: "shield", owner: api.me, squares: q, turns: 2 });
      }
    }),
  ),
  card(
    {
      id: "wa_glyph_seal",
      name: "Glyph Seal",
      description:
        "Seal one file: pick any square and its whole file becomes impassable to your opponent for their next 2 turns, and every enemy piece already standing on it is bound in place for its next 2 turns.",
      tier: 4,
      category: "protection",
      flavor: "A line of warding runes down the board, and nothing crosses it or leaves it.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: true,
      targets: (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to seal",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      effect: (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const file = FILE(c);
        const squares: Square[] = [];
        for (let r = 0; r < 8; r++) squares.push(SQ(file, r));
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
        for (const sq of squares) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "chains" });
          }
        }
      },
    },
  ),
  card(
    {
      id: "wa_void_rift",
      name: "Void Rift",
      description:
        "Tear a permanent rift on an empty square: any enemy piece that steps onto it (never a king) is pulled out of the game, and any enemy piece that ends its move on a square next to the rift is frozen for its next turn.",
      tier: 4,
      category: "attack",
      flavor: "It does not close on its own, and it pulls at whatever passes.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : { kind: "square", label: "Choose the square the rift opens on", squares: emptySquares(api.board) },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq != null) inst.state.sq = sq;
      },
      onMovePlayed: (inst, move, api) => {
        const rift = inst.state.sq as Square | undefined;
        if (rift == null || move.color !== api.opp) return;
        if (move.to === rift && move.piece !== "k") {
          api.removePiece(move.to);
          return;
        }
        const p = api.board.pieces[move.to];
        if (
          p && p.color === api.opp && p.type !== "k" &&
          Math.max(Math.abs(FILE(move.to) - FILE(rift)), Math.abs(RANK(move.to) - RANK(rift))) === 1
        ) {
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 1 });
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "activate to open the rift" : `rift open at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    {
      id: "wa_border_ward",
      name: "Border Ward",
      description:
        "A warded frontier: your opponent may not move any piece into your half of the board for their next 2 turns.",
      tier: 5,
      category: "protection",
      flavor: "The far side of the board is closed for repairs.",
      fx: { motif: "blindfold" },
    },
    curse(2, (moves, api) => moves.filter((m) => !inHalf(api.me, m.to))),
  ),
  card(
    {
      id: "wa_bind_the_queen",
      name: "Bind the Queen",
      description:
        "Arcane chains seize the enemy queen and every piece standing next to her: they cannot move for their next 2 turns.",
      tier: 4,
      category: "protection",
      flavor: "The strongest piece, and the stillest, and her whole guard with her.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    instant((_inst, api) => {
      const q = mySquares(api.board, api.opp, "q")[0];
      if (q == null) return;
      addEffect(api, { kind: "freeze", sq: q, owner: api.opp, turns: 2, skin: "chains" });
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(q) + df, r = RANK(q) + dr;
        if (!inBoard(f, r)) continue;
        const asq = SQ(f, r);
        const p = api.board.pieces[asq];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq: asq, owner: api.opp, turns: 2, skin: "chains" });
        }
      }
    }),
  ),

  // ===================== ARCANE DISINTEGRATION =====================
  card(
    {
      id: "wa_banish",
      icon: "Ban",
      name: "Banish",
      description:
        "Banish one enemy pawn, knight, or bishop from the board, once.",
      tier: 3,
      category: "attack",
      flavor: "Sent somewhere with no squares at all.",
    },
    removeEnemies(1, ["p", "n", "b"]),
  ),
  card(
    {
      id: "wa_unmake",
      name: "Unmake",
      description:
        "The next capture your opponent makes is unmade: their piece snaps back to the square it came from, and your captured piece is restored where it stood. Kings cannot be unmade.",
      tier: 5,
      category: "protection",
      flavor: "A moment of the game, uncreated.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        if (move.piece === "k") return;
        const capSq = move.capturedSquare ?? move.to;
        // The capturer stands on move.to; its old square is empty again.
        if (api.board.pieces[move.from]) return;
        api.relocate(move.to, move.from);
        if (!api.board.pieces[capSq]) {
          api.place(capSq, move.captured, api.me);
          markRevived(api, move.captured);
        }
        inst.spent = true;
      },
      status: () => "waiting to unmake their next capture",
    },
  ),

  // ===================== META: BUFF THEFT =====================
  card(
    {
      id: "wa_spelltheft",
      icon: "WandSparkles",
      name: "Spelltheft",
      description: "A trade, technically: steal any one of your opponent's unused buffs, but the spell demands payment: your own lowest-tier unused card goes to them in exchange.",
      tier: 5,
      category: "draft",
      flavor: "Nice card. Mine now. Here, have this one.",
    },
    {
      ...stealBuffs(1, undefined, unboundOnly),
      effect: (inst, api, picks) => {
        const indexes = picks
          .map((k) => k.buffIndex)
          .filter((i): i is number => i != null)
          .sort((a, b) => b - a);
        for (const i of indexes) {
          const [stolen] = api.theirs.buffs.splice(i, 1);
          if (stolen) api.mine.buffs.push(stolen);
        }
        // Payment: my lowest-tier unspent, unbound card (never this one, and
        // never the card just stolen) crosses over to them. Deterministic:
        // lowest tier first, then hand order.
        let payIdx = -1;
        for (let i = 0; i < api.mine.buffs.length; i++) {
          const b = api.mine.buffs[i];
          if (b === inst || b.spent || b.nullified) continue;
          if (b.state.sq != null || b.state.squares != null) continue;
          if (payIdx === -1 || b.tier < api.mine.buffs[payIdx].tier) payIdx = i;
        }
        if (payIdx >= 0) {
          const paid = api.mine.buffs[payIdx];
          if (!(indexes.length > 0 && api.mine.buffs[api.mine.buffs.length - 1] === paid)) {
            api.mine.buffs.splice(payIdx, 1);
            api.theirs.buffs.push(paid);
          }
        }
      },
    },
  ),
  card(
    {
      id: "wa_disjunction",
      name: "Disjunction",
      description:
        "The conjuration is disjoined: up to two pieces waiting in your opponent's pocket wink out of existence, strongest first.",
      tier: 4,
      category: "draft",
      flavor: "Whatever they were saving it for, they are not.",
    },
    instant((_inst, api) => {
      const pocket = api.theirs.inventory;
      if (!pocket) return;
      let left = 2;
      for (const t of ["q", "r", "b", "n", "p"] as const) {
        while (left > 0 && (pocket[t] ?? 0) > 0) {
          pocket[t] = (pocket[t] ?? 0) - 1;
          left--;
        }
      }
    }),
  ),

  // ===================== META: DRAFT MANIPULATION =====================
  card(
    {
      id: "wa_arcane_reroll",
      icon: "Dice5",
      name: "Arcane Reroll",
      description: "Gain two draft rerolls.",
      tier: 3,
      category: "draft",
      flavor: "Do not like these? Ask again.",
    },
    instant((_inst, api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
    }),
  ),
  card(
    {
      id: "wa_suppress_magic",
      name: "Suppress Magic",
      description:
        "Your opponent's next two draft offers contain no draft-manipulation cards, and the next buff they draft arrives nullified.",
      tier: 3,
      category: "draft",
      flavor: "No meta for you, and the next trick fizzles too.",
    },
    instant((_inst, api) => {
      api.theirs.flags.noDraftCards = (api.theirs.flags.noDraftCards ?? 0) + 2;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "wa_disrupt_ritual",
      name: "Disrupt Ritual",
      description:
        "Your opponent's next draft is skipped, and your next draft offer shows three cards instead of two.",
      tier: 4,
      category: "draft",
      flavor: "You break their circle and widen yours.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.mine.flags.prepThree = true;
    }),
  ),
  card(
    {
      id: "wa_greed",
      name: "Greed",
      description:
        "Your next draft offer shows three cards, and you take all of them instead of one.",
      tier: 5,
      category: "draft",
      flavor: "Why choose?",
    },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.flags.prepThree = true;
    }),
  ),
  card(
    {
      id: "wa_high_roll",
      icon: "Dice6",
      name: "High Roll",
      description: "Force your next draft offer to roll at tier 5.",
      tier: 4,
      category: "draft",
      flavor: "Load the dice, then roll them.",
    },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 5;
    }),
  ),
  card(
    {
      id: "wa_jinx",
      name: "Jinx",
      description: "The jinx sours every friendship: for their next 2 turns, your opponent's pieces cannot end a move on a square beside another of their own pieces.",
      tier: 4,
      category: "hex",
      flavor: "Suddenly nobody wants to stand together.",
      fx: { motif: "slow", pieces: "all" },
    },
    timedOppFilter(2, (moves, _inst, api) => {
      const kept = moves.filter((m) => {
        for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const f = FILE(m.to) + df, r = RANK(m.to) + dr;
          if (!inBoard(f, r)) continue;
          const sq = SQ(f, r);
          if (sq === m.from) continue;
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp) return false;
        }
        return true;
      });
      return kept;
    }),
  ),
  card(
    {
      id: "wa_sabotage",
      name: "Sabotage",
      description:
        "Saboteurs in their war room: your opponent's next draft is skipped, and their reroll token is stolen away if they still hold one.",
      tier: 5,
      category: "draft",
      flavor: "Trip them going in and coming out.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.rerollsLeft = Math.max(0, (api.theirs.rerollsLeft ?? 0) - 1);
    }),
  ),

  // ===================== META: REVEALS (real effects attached) =====================
  card(
    {
      id: "wa_foresight",
      name: "Foresight",
      description:
        "See the tier of your opponent's next draft, and reveal their nerf for the rest of the game.",
      tier: 3,
      category: "info",
      boon: true,
      flavor: "You read the next page before they turn it.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppTier = true;
      api.mine.oppNerfRevealed = true;
    }),
  ),
  card(
    {
      id: "wa_mind_read",
      name: "Mind Read",
      description:
        "See your opponent's next buff options, and their next drafted buff arrives nullified.",
      tier: 4,
      category: "info",
      flavor: "You know what they want, so you spoil it.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "wa_omniscience",
      icon: "Telescope",
      name: "Omniscience",
      description:
        "See your opponent's next buff options and its tier, and reveal their nerf for the rest of the game.",
      tier: 4,
      category: "info",
      boon: true,
      flavor: "Nothing about them is hidden now.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
      api.mine.oppNerfRevealed = true;
    }),
  ),
];
