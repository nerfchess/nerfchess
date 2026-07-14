// Personal / owner card set: a wide run of meme, gym-feat, affection, focus,
// and K-pop themed cards, plus the NewJeans set. Every card is fully
// implemented and reuses ONLY primitives that already ship in the engine
// (helpers.ts) or an existing board-effect kind (shield / king_safe / freeze /
// strike / bonk / barred, timed move augments, targeted removal, relocation,
// placement, skips, extra moves), so nothing here can soft-lock a game or
// freeze a king. All effects are a pure function of the synced board (targets
// are player-driven or a deterministic read, never api.rng), so they replay
// identically on both clients.
//
// Two arrays are exported: PERSONAL_CARDS (the meme/gym/affection/named set)
// and NEWJEANS_CARDS (the K-pop set), so cardCollections can badge each as its
// own codex collection. Both are spread into ALL_BUFFS by library.ts.

import {
  Buff,
  BuffApi,
  BuffCategory,
  BuffInstance,
  CardFx,
} from "../buff";
import { Tier } from "../nerf";
import { BoardState, Color, FILE, inBoard, Move, PieceType, RANK, SQ, Square } from "../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  addEffect,
  addNovel,
  bindCandidates,
  bindPiece,
  captureSquare,
  emptySquares,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  markRevived,
  mySquares,
  pawnRankOk,
  permanentAugment,
  placePieces,
  relocateMany,
  revivable,
  shieldArmy,
  shieldZone,
  slideMoves,
  teleportMoves,
  timedOppFilter,
  trackBoundPiece,
} from "./helpers";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type PMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  icon?: string;
  requires?: PieceType[];
  fx?: CardFx;
  /** Companion-ability cards are special: never offered by any draft roll
   * (see draft.ts inMode); they only enter a hand when their companion is
   * placed. */
  special?: boolean;
};

function card(meta: PMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// --- Local geometry (Chebyshev + neighbour helpers) --------------------------

/** King-step (Chebyshev) distance between two squares. */
const dist = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

/** The in-board squares one king-step around `sq` (up to 8). */
const neighbors8 = (sq: Square): Square[] =>
  ALL_DIRS.flatMap(([df, dr]) => {
    const f = FILE(sq) + df, r = RANK(sq) + dr;
    return inBoard(f, r) ? [SQ(f, r)] : [];
  });

/** Forward RANK step for a color (toward the opponent's back rank). */
const fwd = (color: Color) => (color === "w" ? 1 : -1);

/** One-square adjacent-empty relocation zone (mirrors library.ts stepDest). */
const stepDest = (_api: BuffApi, from: Square): Square[] =>
  neighbors8(from);

/** The enemy non-king nearest a reference square, ties broken by lowest square
 * index, so the pick is a pure function of the synced board. Returns null when
 * there is no eligible target. */
function nearestEnemy(
  api: BuffApi,
  ref: Square,
  types?: PieceType[],
): Square | null {
  let best: Square | null = null, bestD = Infinity;
  for (const sq of mySquares(api.board, api.opp)) {
    const t = api.board.pieces[sq]!.type;
    if (t === "k") continue;
    if (types && !types.includes(t)) continue;
    const d = dist(sq, ref);
    if (d < bestD || (d === bestD && (best == null || sq < best))) {
      bestD = d;
      best = sq;
    }
  }
  return best;
}

// ===========================================================================
// COMPANION MACHINERY (I Love Cami and the NewJeans pocket companions)
// ===========================================================================
// A companion is a bound special piece: on deploy the card places a real
// piece of a standard class (queen / rook / bishop / knight / pawn) whose
// square the instance tracks through trackBoundPiece, exactly like the other
// piece-bound cards. Rendering swaps in bespoke portrait art at that square
// (Board.tsx companionSquares); mechanically everything is built from the
// primitives that already ship (place / relocate / removePiece / augments /
// opponent-move filters / shield / freeze / strike / bonk), so nothing here
// can soft-lock a game, freeze a king, or desync a replica.
//
// Activated companion abilities recharge instead of being one-shots: the
// effect arms `state.cd` (a count of the OWNER's turns) and onMovePlayed
// ticks it down, clearing the engine's `usedActivation` latch once it hits
// zero. Both halves run inside hooks every replica replays (activateBuff /
// playMove), so the cooldown state is identical everywhere.

const sqLabel = (sq: Square) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;

function armCooldown(inst: BuffInstance, turns: number) {
  inst.state.cd = turns;
}

function cooldownLeft(inst: BuffInstance): number {
  return (inst.state.cd as number) ?? 0;
}

/** Tick a recharging ability on the owner's completed moves and re-arm the
 * activation (clear usedActivation) once the cooldown reaches zero. A
 * once-per-game ability sets `state.done` and never re-arms. */
function tickAndRearm(inst: BuffInstance, move: Move, owner: Color) {
  if (move.color === owner) {
    const cd = cooldownLeft(inst);
    if (cd > 0) inst.state.cd = cd - 1;
  }
  if (inst.usedActivation && !inst.state.done && cooldownLeft(inst) <= 0) {
    inst.usedActivation = false;
  }
}

// --- Cami lookups (her ability cards read the parent card's tracked square) --

const CAMI_ID = "i_love_cam";

/** The live, placed I Love Cami instance in MY hand, or null. */
function camiInstance(api: BuffApi): BuffInstance | null {
  const inst = api.mine.buffs.find((b) => b.id === CAMI_ID && !b.spent && !b.nullified);
  return inst && inst.state.sq != null ? inst : null;
}

/** Cami's current square, verified against the board (my queen stands there). */
function camiSquare(api: BuffApi): Square | null {
  const inst = camiInstance(api);
  if (!inst) return null;
  const sq = inst.state.sq as Square;
  const p = api.board.pieces[sq];
  return p && p.color === api.me && p.type === "q" ? sq : null;
}

// --- Pocket companion factory (the five NewJeans members) --------------------

interface CompanionSpec {
  meta: PMeta;
  /** Board class the deploy places (the member's mechanical base). */
  piece: PieceType;
  /** Extra placement filter beyond "empty square in your half". */
  placeOk?: (sq: Square) => boolean;
  /** Extra movement grafted onto the deployed member (her distinctive stat). */
  augment?: (api: BuffApi, sq: Square, via: string) => Move[];
  /** Ability cooldown in the owner's turns; null = once per game. */
  abilityCooldown: number | null;
  abilityLabel: string;
  /** Candidate squares for the ability's single pick. Omit for a no-target
   * ability. Empty list = currently unusable (the blank cast is refused
   * instead of burning the turn and the cooldown). */
  abilityTargets?: (api: BuffApi, sq: Square) => Square[];
  /** No-target abilities: return false when firing now would do nothing. */
  abilityReady?: (api: BuffApi, sq: Square) => boolean;
  ability: (inst: BuffInstance, api: BuffApi, sq: Square, pick?: Square) => void;
}

/** The member's current square, verified against the board. */
function memberSquare(inst: BuffInstance, api: BuffApi): Square | null {
  const sq = inst.state.sq as Square | undefined;
  if (sq == null) return null;
  const p = api.board.pieces[sq];
  return p && p.color === api.me ? sq : null;
}

/**
 * A pocket companion card: the FIRST activation deploys the member onto an
 * empty square in your half (costing the turn, like a crazyhouse drop);
 * every later activation fires her single ability, which then recharges over
 * `abilityCooldown` of your turns. The member is a real piece of her class;
 * if she is captured the card retires (trackBoundPiece marks it spent).
 */
function pocketCompanion(spec: CompanionSpec): Buff {
  const total = spec.abilityCooldown ?? 1;
  return card(spec.meta, {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) => {
      if (picks.length > 0) return null;
      if (inst.state.sq == null) {
        return {
          kind: "square",
          label: `Place ${spec.meta.name} on an empty square in your half`,
          squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
            (sq) => !spec.placeOk || spec.placeOk(sq),
          ),
        };
      }
      const sq = memberSquare(inst, api);
      if (sq == null) {
        return { kind: "square", label: `${spec.meta.name} is off the board`, squares: [] };
      }
      if (spec.abilityTargets) {
        return { kind: "square", label: spec.abilityLabel, squares: spec.abilityTargets(api, sq) };
      }
      if (spec.abilityReady && !spec.abilityReady(api, sq)) {
        return { kind: "square", label: `${spec.abilityLabel}: no valid use right now`, squares: [] };
      }
      return null;
    },
    effect: (inst, api, picks) => {
      if (inst.state.sq == null) {
        // Deploy: place the member. The ability comes online after your next
        // completed move (cd 1 re-arms the activation latch then).
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !inHalf(api.me, sq)) return;
        if (spec.placeOk && !spec.placeOk(sq)) return;
        api.place(sq, spec.piece, api.me);
        inst.state.sq = sq;
        addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
        armCooldown(inst, 1);
        return;
      }
      const sq = memberSquare(inst, api);
      if (sq == null) return;
      spec.ability(inst, api, sq, picks[0]?.square);
      if (spec.abilityCooldown == null) inst.state.done = true;
      else armCooldown(inst, spec.abilityCooldown);
    },
    augmentMoves: spec.augment
      ? (moves, inst, api) => {
          const sq = memberSquare(inst, api);
          if (sq == null) return;
          addNovel(moves, spec.augment!(api, sq, inst.id));
        }
      : undefined,
    onMovePlayed: (inst, move, api) => {
      // If the member is captured the card retires with her; a move-promotion
      // (Hyein walking to the last rank herself) also closes the card out.
      trackBoundPiece(inst, move, { dieOnPromote: true });
      if (!inst.spent) tickAndRearm(inst, move, api.me);
    },
    cooldown: (inst) =>
      inst.state.sq == null || inst.state.done
        ? null
        : { left: cooldownLeft(inst), total },
    status: (inst) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return "activate to deploy";
      if (inst.state.done) return `deployed at ${sqLabel(sq)}, ability spent`;
      const cd = cooldownLeft(inst);
      return cd > 0
        ? `deployed at ${sqLabel(sq)}, ability recharges in ${cd} of your turns`
        : `deployed at ${sqLabel(sq)}, ability ready`;
    },
  });
}

// ===========================================================================
// GYM / FEATS
// ===========================================================================

const GYM: Buff[] = [
  card(
    {
      id: "waist_25",
      name: "25 Inch Waist",
      description:
        "Lean and nimble: each of your pawns may also slip diagonally forward one square onto empty ground, no capture needed, wiggling past the traffic.",
      tier: 2,
      category: "movement",
      requires: ["p"],
      icon: "Wind",
      flavor: "No belt, no problem, no spare inch.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const dr = fwd(api.board.pieces[sq]!.color);
        const tos = [
          [FILE(sq) + 1, RANK(sq) + dr],
          [FILE(sq) - 1, RANK(sq) + dr],
        ]
          .filter(([f, r]) => inBoard(f, r))
          .map(([f, r]) => SQ(f, r))
          .filter((s) => pawnRankOk(s));
        return teleportMoves(api.board, sq, tos, inst.id);
      }),
    ),
  ),

  card(
    {
      id: "handstand_pushup",
      name: "Handstand Pushup",
      description:
        "Flip one pawn upside down. Forever it may also step and capture straight back or diagonally back toward your own side, but never onto its own back rank.",
      tier: 3,
      category: "movement",
      requires: ["p"],
      icon: "FlipVertical",
      flavor: "Blood to the head, board to the knees.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose a pawn to flip",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq == null) inst.state.sq = picks[0]?.square;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        const back = -fwd(p.color);
        const gen = leapMoves(
          api.board,
          sq,
          [
            [0, back],
            [1, back],
            [-1, back],
          ],
          inst.id,
        ).filter((m) => pawnRankOk(m.to));
        addNovel(moves, gen);
      },
      onMovePlayed: (inst, move) => trackBoundPiece(inst, move, { dieOnPromote: true }),
      status: (inst) =>
        inst.state.sq == null ? "activate to flip a pawn" : "flipped",
    },
  ),

  card(
    {
      id: "muscle_up",
      name: "Muscle Up",
      description:
        "Explosive pull-up: take one of your pieces except the king and hurl it straight up its own file to any empty square, blurring past everything in the way. Once.",
      tier: 4,
      category: "movement",
      icon: "ArrowUpFromLine",
      flavor: "Chin over the bar, pawn over the field.",
      fx: { motif: "rally", self: true },
    },
    (() => {
      // Empty squares on `from`'s file, ahead of it toward the opponent, that a
      // pawn may legally land on. Non-capturing (empties only).
      const fileUp = (api: BuffApi, from: Square): Square[] => {
        const p = api.board.pieces[from];
        if (!p) return [];
        const dr = fwd(p.color);
        const out: Square[] = [];
        let r = RANK(from) + dr;
        while (r >= 0 && r < 8) {
          const sq = SQ(FILE(from), r);
          if (!api.board.pieces[sq] && (p.type !== "p" || pawnRankOk(sq))) out.push(sq);
          r += dr;
        }
        return out;
      };
      return activated(
        (_inst, api, picks) =>
          picks.length === 0
            ? {
                kind: "square",
                label: "Choose a piece to launch up its file",
                squares: mySquares(api.board, api.me).filter(
                  (sq) => api.board.pieces[sq]!.type !== "k" && fileUp(api, sq).length > 0,
                ),
              }
            : picks.length === 1
              ? {
                  kind: "square",
                  label: "Choose the empty square up the file",
                  squares: picks[0].square != null ? fileUp(api, picks[0].square) : [],
                }
              : null,
        (_inst, api, picks) => {
          const from = picks[0]?.square, to = picks[1]?.square;
          if (from == null || to == null) return;
          const p = api.board.pieces[from];
          if (!p || api.board.pieces[to] || (p.type === "p" && !pawnRankOk(to))) return;
          api.relocate(from, to);
          addEffect(api, { kind: "strike", squares: [to], owner: api.me, turns: 1 });
        },
      );
    })(),
  ),

  card(
    {
      id: "i_love_abs",
      name: "I Love Abs",
      description:
        "Brace your core. Every one of your pieces standing in the central 16 squares becomes uncapturable for your opponent's next 3 turns.",
      tier: 4,
      category: "protection",
      icon: "ShieldPlus",
      flavor: "Abs of steel, ribs of iron.",
      fx: { motif: "ward", self: true },
    },
    shieldZone(
      (api) =>
        mySquares(api.board, api.me).filter(
          (sq) => FILE(sq) >= 2 && FILE(sq) <= 5 && RANK(sq) >= 2 && RANK(sq) <= 5,
        ),
      3,
    ),
  ),

  card(
    {
      id: "onearmmuscleupismydream",
      name: "One Arm Muscle Up Is My Dream",
      description:
        "One chosen piece reaches for the bar: forever it also slides diagonally like a bishop, extending one long arm across the board on top of its own moves.",
      tier: 5,
      category: "movement",
      icon: "MoveUpRight",
      flavor: "Someday the second arm. Today, this reach.",
      fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "b", self: true },
    },
    bindPiece("Choose the piece reaching for its dream", bindCandidates(), {
      gen: (b, sq, via) => slideMoves(b, sq, DIAG_DIRS, via),
    }),
  ),

  card(
    {
      id: "bench_225",
      name: "225 Bench",
      description:
        "Press 225 and shove up to 3 enemy pieces one square back toward their own home rank. Blocked pieces stay put, nobody is captured.",
      tier: 6,
      category: "tempo",
      icon: "Dumbbell",
      flavor: "Two plates. Everybody moves.",
      fx: { motif: "anchor", self: false },
    },
    (() => {
      // The square an enemy on `sq` is shoved to (one rank toward their home),
      // or null when the shove is blocked or off-board.
      const pushDest = (api: BuffApi, sq: Square): Square | null => {
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return null;
        const d = -fwd(api.opp); // toward the opponent's home rank
        const r = RANK(sq) + d;
        if (!inBoard(FILE(sq), r)) return null;
        const dest = SQ(FILE(sq), r);
        if (api.board.pieces[dest] || (p.type === "p" && !pawnRankOk(dest))) return null;
        return dest;
      };
      return {
        kind: "activated",
        targets: (_inst, api, picks) =>
          picks.length >= 3
            ? null
            : {
                kind: "square",
                label: `Choose an enemy piece to shove back (${picks.length + 1}/3)`,
                squares: mySquares(api.board, api.opp).filter(
                  (sq) => pushDest(api, sq) != null && !picks.some((k) => k.square === sq),
                ),
              },
        effect: (_inst, api, picks) => {
          for (const k of picks) {
            if (k.square == null) continue;
            const dest = pushDest(api, k.square);
            if (dest != null) api.relocate(k.square, dest);
          }
        },
      };
    })(),
  ),

  card(
    {
      id: "full_planche",
      name: "Full Planche",
      description:
        "Lock one of your pieces into a perfect hold. It hovers uncapturable for your opponent's next 5 turns and slides like a rook along every open rank and file for the game.",
      tier: 6,
      category: "protection",
      icon: "StretchHorizontal",
      flavor: "Dead still, arms locked, feet floating.",
      fx: { motif: "ward", moveAs: "r", self: true },
    },
    bindPiece("Choose a piece to hold in a planche", bindCandidates(), {
      shieldTurns: 5,
      gen: (b, sq, via) => slideMoves(b, sq, ORTHO_DIRS, via),
    }),
  ),

  card(
    {
      id: "fingertip_maltese",
      name: "Fingertip Maltese",
      description:
        "Elite fingertip hold on one enemy piece: it freezes for their next 3 turns and the eight squares around it are sealed, so nothing can rescue or relieve it.",
      tier: 7,
      category: "attack",
      icon: "Hand",
      flavor: "The whole body, held on ten fingertips.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to pin",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "stun" });
        addEffect(api, { kind: "barred", squares: neighbors8(sq), against: api.opp, turns: 3 });
      },
    ),
  ),

  // Converted from a nerf (owner request): the clean center part is now a
  // SYMMETRY buff. Reflect one piece across the board's center line.
  card(
    {
      id: "middle_part",
      name: "Middle Part",
      description:
        "Not one hair off the axis: choose one of your pieces except the king or queen, and a perfect mirror copy of it materializes on the file-reflected square (a-file to h-file), if that square is empty. Once.",
      tier: 5,
      category: "pieces",
      icon: "FlipHorizontal2",
      flavor: "Split dead center. Both sides immaculate.",
      fx: { motif: "rally", self: true },
    },
    (() => {
      const mirrorOf = (sq: Square) => SQ(7 - FILE(sq), RANK(sq));
      const canMirror = (api: BuffApi, sq: Square) => {
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k" || p.type === "q") return false;
        const m = mirrorOf(sq);
        if (m === sq || api.board.pieces[m]) return false;
        return p.type !== "p" || pawnRankOk(m);
      };
      return activated(
        (_inst, api, picks) =>
          picks.length > 0
            ? null
            : {
                kind: "square",
                label: "Choose the piece to part down the middle",
                squares: mySquares(api.board, api.me).filter((sq) => canMirror(api, sq)),
              },
        (_inst, api, picks) => {
          const sq = picks[0]?.square;
          if (sq == null || !canMirror(api, sq)) return;
          const m = mirrorOf(sq);
          api.place(m, api.board.pieces[sq]!.type, api.me);
          addEffect(api, { kind: "strike", squares: [m], owner: api.me, turns: 1 });
        },
      );
    })(),
  ),

  // Converted from a nerf (owner request): the veins now run dead straight
  // FORWARD — a pawn-army grip no other card grants.
  card(
    {
      id: "forearm_veins",
      name: "Forearm Veins",
      description:
        "Veins run dead straight up the forearm: for the game, each of your pawns may also capture the enemy piece directly ahead of it, one square straight forward.",
      tier: 4,
      category: "attack",
      requires: ["p"],
      icon: "Activity",
      flavor: "Dead straight, no curve, full grip.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const dr = fwd(api.board.pieces[sq]!.color);
        const f = FILE(sq), r = RANK(sq) + dr;
        if (!inBoard(f, r)) return [];
        const to = SQ(f, r);
        const t = api.board.pieces[to];
        // Only the straight-ahead CAPTURE is new (plain forward pushes are
        // normal pawn moves); back-rank landings stay off the menu so the
        // grant never has to reason about promotion.
        if (!t || t.color !== api.opp || t.type === "k" || !pawnRankOk(to)) return [];
        return leapMoves(api.board, sq, [[0, dr]], inst.id);
      }),
    ),
  ),
];

// ===========================================================================
// FOCUS / GAMES
// ===========================================================================

const FOCUS: Buff[] = [
  card(
    {
      id: "white_monster",
      name: "White Monster",
      description:
        "Crack the can: take 2 extra moves right now for a triple-move turn. Then the sugar crash hits and you skip your next turn. Once.",
      tier: 4,
      category: "tempo",
      icon: "Zap",
      flavor: "Zero sugar. All consequences.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      kind: "activated",
      freeAction: true,
      effect: (_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        api.bs.skips[api.me] += 1;
      },
    },
  ),

  card(
    {
      id: "monkeytype",
      name: "Monkeytype",
      description:
        "Type at full speed: relocate up to 3 of your pieces, each exactly one square, in a rapid burst of keystrokes. Kings sit this test out.",
      tier: 3,
      category: "movement",
      icon: "Keyboard",
      flavor: "Accuracy 100 percent, patience zero.",
      fx: { motif: "rally", self: true },
    },
    relocateMany(3, stepDest),
  ),

  card(
    {
      id: "rubiks_cube",
      name: "Rubik's Cube",
      description:
        "Scramble the cube: make up to 3 twists, each swapping the spots of two of your own pieces standing within 2 squares of each other. Kings never twist.",
      tier: 5,
      category: "movement",
      icon: "Box",
      flavor: "Nobody solves it, they just peel the stickers off.",
      fx: { motif: "rally", self: true },
    },
    (() => {
      const swappable = (api: BuffApi, sq: Square) => {
        const p = api.board.pieces[sq];
        return !!p && p.color === api.me && p.type !== "k";
      };
      return {
        kind: "activated",
        targets: (_inst, api, picks) => {
          if (picks.length >= 6) return null;
          const onFirstOfPair = picks.length % 2 === 0;
          if (onFirstOfPair) {
            // Pick piece A: any of my non-king pieces that has a legal partner.
            const chosen = new Set(picks.map((k) => k.square));
            return {
              kind: "square",
              label: `Choose a piece to twist (pair ${picks.length / 2 + 1}/3)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  swappable(api, sq) &&
                  !chosen.has(sq) &&
                  mySquares(api.board, api.me).some(
                    (o) =>
                      o !== sq &&
                      !chosen.has(o) &&
                      swappable(api, o) &&
                      dist(sq, o) <= 2 &&
                      api.board.pieces[o]!.type !== api.board.pieces[sq]!.type &&
                      (api.board.pieces[sq]!.type !== "p" || pawnRankOk(o)) &&
                      (api.board.pieces[o]!.type !== "p" || pawnRankOk(sq)),
                  ),
              ),
            };
          }
          // Pick piece B: a different-type nearby ally, swap must stay pawn-legal.
          const a = picks[picks.length - 1].square!;
          const ta = api.board.pieces[a]?.type;
          const chosen = new Set(picks.map((k) => k.square));
          return {
            kind: "square",
            label: "Choose the piece to swap it with",
            squares: mySquares(api.board, api.me).filter(
              (o) =>
                o !== a &&
                !chosen.has(o) &&
                swappable(api, o) &&
                dist(a, o) <= 2 &&
                api.board.pieces[o]!.type !== ta &&
                (ta !== "p" || pawnRankOk(o)) &&
                (api.board.pieces[o]!.type !== "p" || pawnRankOk(a)),
            ),
          };
        },
        effect: (_inst, api, picks) => {
          for (let i = 0; i + 1 < picks.length; i += 2) {
            const a = picks[i].square, b = picks[i + 1].square;
            if (a == null || b == null) continue;
            const pa = api.board.pieces[a], pb = api.board.pieces[b];
            if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) continue;
            // Both are mine: swapping their types swaps the pieces in place.
            const ta = pa.type, tb = pb.type;
            api.setPieceType(a, tb);
            api.setPieceType(b, ta);
          }
        },
      };
    })(),
  ),

  card(
    {
      id: "geometry_dash",
      name: "Geometry Dash",
      description:
        "One of your pieces hits the beat: it dashes straight forward, phasing over your own pieces and smashing up to 2 enemies in its lane before landing. Never kings.",
      tier: 6,
      category: "attack",
      icon: "Triangle",
      flavor: "Jump. Jump. Do not miss the beat.",
    },
    (() => {
      // Walk `from`'s file toward the opponent: phase over friendlies, collect
      // up to 2 enemy non-kings to smash, stop at a king or the 3rd blocker or
      // the edge. Returns the smashed squares and the furthest empty landing.
      const run = (api: BuffApi, from: Square) => {
        const p = api.board.pieces[from];
        if (!p) return { smashed: [] as Square[], land: null as Square | null };
        const dr = fwd(p.color);
        const smashed: Square[] = [];
        let land: Square | null = null;
        let r = RANK(from) + dr;
        while (r >= 0 && r < 8) {
          const sq = SQ(FILE(from), r);
          const t = api.board.pieces[sq];
          if (!t) {
            if (p.type !== "p" || pawnRankOk(sq)) land = sq;
          } else if (t.color === api.me) {
            // phase over your own piece, keep going
          } else if (t.type === "k") {
            break; // never smash a king; stop the lane
          } else {
            if (smashed.length >= 2) break;
            smashed.push(sq);
          }
          r += dr;
        }
        return { smashed, land };
      };
      return activated(
        (_inst, api, picks) =>
          picks.length > 0
            ? null
            : {
                kind: "square",
                label: "Choose the piece to dash forward",
                squares: mySquares(api.board, api.me).filter((sq) => {
                  if (api.board.pieces[sq]!.type === "k") return false;
                  const { smashed, land } = run(api, sq);
                  return smashed.length > 0 || land != null;
                }),
              },
        (_inst, api, picks) => {
          const from = picks[0]?.square;
          if (from == null) return;
          const { smashed, land } = run(api, from);
          for (const sq of smashed) api.removePiece(sq);
          if (smashed.length) addEffect(api, { kind: "strike", squares: smashed, owner: api.me, turns: 1 });
          if (land != null && api.board.pieces[from]) api.relocate(from, land);
        },
      );
    })(),
  ),

  card(
    {
      id: "onett",
      name: "Onett",
      description:
        "A townsperson reports for duty: a new pawn takes the nearest open square on your pawn line, or just ahead of it if the line is packed.",
      tier: 2,
      category: "pieces",
      icon: "Home",
      flavor: "Population small, spirit enormous.",
    },
    instant((_inst, api) => {
      const homeRank = api.me === "w" ? 1 : 6;
      const dr = fwd(api.me);
      for (let step = 0; step < 6; step++) {
        const r = homeRank + dr * step;
        if (r < 0 || r > 7) break;
        // Nearest to the center file (3), tie-break toward file 3.
        const spots = [0, 1, 2, 3, 4, 5, 6, 7]
          .map((f) => SQ(f, r))
          .filter((sq) => !api.board.pieces[sq] && pawnRankOk(sq))
          .sort((a, b) => Math.abs(FILE(a) - 3) - Math.abs(FILE(b) - 3) || a - b);
        if (spots.length) {
          api.place(spots[0], "p", api.me);
          addEffect(api, { kind: "strike", squares: [spots[0]], owner: api.me, turns: 1 });
          return;
        }
      }
    }),
  ),

  card(
    {
      id: "bee_swarm_simulator",
      name: "Bee Swarm Simulator",
      description:
        "Release the hive: drop 3 bee pawns on empty squares of the two center ranks, a buzzing swarm that harasses both armies from no-mans-land.",
      tier: 5,
      category: "pieces",
      icon: "Bug",
      flavor: "Everybody buzz in, the hive is hiring.",
    },
    placePieces(["p", "p", "p"], () => (sq: Square) => RANK(sq) === 3 || RANK(sq) === 4),
  ),
];

// ===========================================================================
// AFFECTION / PERSONAL
// ===========================================================================

const AFFECTION: Buff[] = [
  card(
    {
      id: "i_love_my_gf",
      name: "I Love My GF",
      description:
        "Your whole army, king included, cannot be captured for your opponent's next 3 turns, and you take two extra moves right now.",
      tier: 8,
      category: "protection",
      icon: "Heart",
      flavor: "I would put the whole board between her and harm.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    {
      kind: "activated",
      freeAction: true,
      effect: (_inst, api) => {
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 3 });
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
        api.bs.extraMoves[api.me] += 2;
      },
    },
  ),

  // Reworked (owner request): Cami is now a COMPANION. Placing her seats her
  // two ability cards (Sweep the Lines, Guardian Leap) in your hand; while
  // she stands she moves like an amazon and allies beside her are guarded.
  card(
    {
      id: "i_love_cam",
      name: "I Love Cami",
      description:
        "Place Cami on an empty square in your half: a queen who also leaps like a knight. Allies standing beside her cannot be captured, and she arrives with two abilities, Sweep the Lines and Guardian Leap. If she is ever taken, her captor is frozen for 2 turns.",
      tier: 6,
      category: "pieces",
      icon: "Crosshair",
      flavor: "Cami said she had my back. Cami meant it.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once placed, the card is Cami's anchor for the
      // rest of the game (her square rides on state.sq via trackBoundPiece).
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Place Cami on an empty square in your half",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !inHalf(api.me, sq)) return;
        api.place(sq, "q", api.me);
        inst.state.sq = sq;
        addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
        // Her abilities arrive as their own activated cards (same seating as
        // grantRandomTier9: fresh instances pushed into the hand, replayed
        // identically by every replica through this activation).
        api.mine.buffs.push(
          { id: "cami_sweep", tier: 6, state: { cd: 0 } },
          { id: "cami_leap", tier: 6, state: { cd: 0 } },
        );
      },
      // Amazon movement: queen slides and the king-guard step are native to
      // her queen body; the knight leaps are grafted on here.
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "q") return;
        addNovel(moves, leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id));
      },
      // Devotion: allies standing beside Cami cannot be captured. Never the
      // king (the game must stay winnable, matching how shields never cover
      // a king) and never strands the opponent with zero moves.
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        const her = api.board.pieces[sq];
        if (!her || her.color !== api.me || her.type !== "q") return moves;
        const guarded = new Set(
          neighbors8(sq).filter((n) => {
            const p = api.board.pieces[n];
            return !!p && p.color === api.me && p.type !== "k";
          }),
        );
        if (guarded.size === 0) return moves;
        const kept = moves.filter((m) => {
          const cap = captureSquare(m);
          return cap == null || !guarded.has(cap);
        });
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        // Vengeance: the piece that takes Cami is frozen for 2 of its
        // owner's turns. Kings shrug it off (kings are never frozen).
        if (sq != null && move.color === api.opp && move.to === sq && move.from !== sq) {
          const capturer = api.board.pieces[move.to];
          if (capturer && capturer.color === api.opp && capturer.type !== "k") {
            // 3 on the clock, not 2: this hook runs inside the capturer's own
            // move, and playMove ticks their effect timers right after the
            // hooks, so the freeze loses one tick before their next turn even
            // starts. 3 delivers the promised 2 full frozen turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "chains" });
            addEffect(api, { kind: "bonk", squares: [move.to], owner: api.me, turns: 1 });
          }
        }
        trackBoundPiece(inst, move);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "activate to place Cami" : `Cami fights at ${sqLabel(sq)}`;
      },
    },
  ),

  card(
    {
      id: "ilovemysister",
      name: "I Love My Sister",
      description:
        "Bring your strongest fallen piece home to an empty square in your half. She arrives shielded, uncapturable for your opponent's next 2 turns.",
      tier: 7,
      category: "pieces",
      icon: "HandHeart",
      flavor: "She always finds her way home to us.",
      fx: { motif: "ward", self: true },
    },
    (() => {
      const bestType = (api: BuffApi): PieceType | null => {
        for (const t of ["q", "r", "b", "n", "p"] as PieceType[]) {
          if (revivable(api, t) > 0) return t;
        }
        return null;
      };
      return activated(
        (_inst, api, picks) => {
          if (picks.length > 0) return null;
          const type = bestType(api);
          return {
            kind: "square",
            label: "Choose where she returns",
            squares:
              type == null
                ? []
                : emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                    (sq) => type !== "p" || pawnRankOk(sq),
                  ),
          };
        },
        (_inst, api, picks) => {
          const type = bestType(api);
          const sq = picks[0]?.square;
          if (type == null || sq == null || api.board.pieces[sq]) return;
          if (type === "p" && !pawnRankOk(sq)) return;
          api.place(sq, type, api.me);
          markRevived(api, type);
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
        },
      );
    })(),
  ),

  card(
    {
      id: "ilovewhimperingaudios",
      name: "I Love Whimpering Audios",
      description:
        "On each of your next 3 turns, the enemy queen, rook, bishop, or knight nearest your king is charmed and joins your army. Kings never fall for it.",
      tier: 8,
      category: "pieces",
      icon: "AudioLines",
      flavor: "Press play and the fight just leaves them.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst) => {
        if (inst.state.charges == null) inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        const k = mySquares(api.board, api.me, "k")[0];
        const target = k != null ? nearestEnemy(api, k, ["q", "r", "b", "n"]) : null;
        if (target != null) {
          api.setPieceColor(target, api.me);
          addEffect(api, { kind: "bonk", squares: [target], owner: api.me, turns: 1 });
        }
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} charmed left`,
    },
  ),

  card(
    {
      id: "ihatemyex",
      name: "I Hate My Ex",
      description:
        "Freeze one enemy pawn for 2 turns, but you get so worked up you freeze your own nearest pawn for 2 turns too. Mostly self-inflicted.",
      tier: 1,
      category: "tempo",
      icon: "HeartCrack",
      flavor: "Blocked, deleted, and still living rent free in my head.",
    },
    instant((_inst, api) => {
      const ek = mySquares(api.board, api.opp, "k")[0];
      const theirPawns = mySquares(api.board, api.opp, "p");
      if (ek != null && theirPawns.length) {
        const t = theirPawns
          .slice()
          .sort((a, b) => dist(a, ek) - dist(b, ek) || a - b)[0];
        addEffect(api, { kind: "freeze", sq: t, owner: api.opp, turns: 2, skin: "glue" });
      }
      const mk = mySquares(api.board, api.me, "k")[0];
      const myPawns = mySquares(api.board, api.me, "p");
      if (mk != null && myPawns.length) {
        const s = myPawns.slice().sort((a, b) => dist(a, mk) - dist(b, mk) || a - b)[0];
        addEffect(api, { kind: "freeze", sq: s, owner: api.me, turns: 2, skin: "glue" });
      }
    }),
  ),

  card(
    {
      id: "ilovesmellingmygfshoodie",
      name: "I Love Smelling My GF's Hoodie",
      description:
        "Wrap one of your pieces in the hoodie: it cannot be captured for your opponent's next 3 turns. Warm, safe, faintly of her.",
      tier: 3,
      category: "protection",
      icon: "Shirt",
      flavor: "Three days unwashed and I would not trade it for anything.",
      fx: { motif: "ward", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Wrap one of your pieces in the hoodie",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq != null) addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
      },
    ),
  ),

  card(
    {
      id: "ilovemakingout",
      name: "I Love Making Out",
      description:
        "Bond two of your pieces for the game. Each also moves the way the other does, blending a knight with a bishop or a rook with a queen.",
      tier: 6,
      category: "movement",
      icon: "HeartHandshake",
      flavor: "Nobody move. Actually, everybody move, together.",
      fx: { motif: "empower", self: true },
    },
    (() => {
      const genAs = (type: PieceType, b: BoardState, sq: Square, via: string): Move[] => {
        switch (type) {
          case "n":
            return leapMoves(b, sq, KNIGHT_LEAPS, via);
          case "b":
            return slideMoves(b, sq, DIAG_DIRS, via);
          case "r":
            return slideMoves(b, sq, ORTHO_DIRS, via);
          case "q":
            return slideMoves(b, sq, ALL_DIRS, via);
          default:
            return [];
        }
      };
      return {
        kind: "activated",
        spendOnUse: false,
        targets: (inst, api, picks) => {
          if (inst.state.a != null && inst.state.b != null) return null;
          if (picks.length >= 2) return null;
          const chosen = new Set(picks.map((k) => k.square));
          return {
            kind: "square",
            label: picks.length === 0 ? "Bond your first piece" : "Bond your second piece",
            squares: mySquares(api.board, api.me).filter(
              (sq) =>
                ["n", "b", "r", "q"].includes(api.board.pieces[sq]!.type) && !chosen.has(sq),
            ),
          };
        },
        effect: (inst, api, picks) => {
          if (inst.state.a != null) return;
          const a = picks[0]?.square, b = picks[1]?.square;
          if (a == null || b == null) return;
          inst.state.a = a;
          inst.state.b = b;
          inst.state.ta = api.board.pieces[a]?.type;
          inst.state.tb = api.board.pieces[b]?.type;
        },
        augmentMoves: (moves, inst, api) => {
          const a = inst.state.a as Square | undefined;
          const b = inst.state.b as Square | undefined;
          const ta = inst.state.ta as PieceType | undefined;
          const tb = inst.state.tb as PieceType | undefined;
          if (a != null && tb) {
            const p = api.board.pieces[a];
            if (p && p.color === api.me) addNovel(moves, genAs(tb, api.board, a, inst.id));
          }
          if (b != null && ta) {
            const p = api.board.pieces[b];
            if (p && p.color === api.me) addNovel(moves, genAs(ta, api.board, b, inst.id));
          }
        },
        onMovePlayed: (inst, move) => {
          for (const key of ["a", "b"] as const) {
            const sq = inst.state[key] as Square | undefined;
            if (sq == null) continue;
            if (move.capturedSquare === sq && move.from !== sq) inst.state[key] = null;
            else if (move.from === sq) inst.state[key] = move.to;
            else if (move.to === sq && move.from !== sq) inst.state[key] = null;
          }
          if (inst.state.a == null && inst.state.b == null && (inst.state.ta || inst.state.tb)) {
            inst.spent = true;
          }
        },
        status: (inst) =>
          inst.state.a == null ? "activate to bond two pieces" : "bonded",
      };
    })(),
  ),
];

// ===========================================================================
// CAMI'S ABILITIES
// ===========================================================================
// Seated in the hand when I Love Cami is placed (never drafted: special).
// Both read Cami's square off the parent card's state and retire themselves
// the moment she falls, so they can never fire without her.

const CAMI_ABILITIES: Buff[] = [
  card(
    {
      id: "cami_sweep",
      name: "Sweep the Lines",
      description:
        "Cami's signature move: every enemy piece except a king standing on her rank or file is swept off the board. Costs your turn; recharges over 3 of your turns.",
      tier: 6,
      category: "attack",
      icon: "Radar",
      flavor: "Cami keeps your lines clear.",
      special: true,
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const sq = camiSquare(api);
        const hasPrey =
          sq != null &&
          mySquares(api.board, api.opp).some(
            (e) =>
              api.board.pieces[e]!.type !== "k" &&
              (FILE(e) === FILE(sq) || RANK(e) === RANK(sq)),
          );
        // Nothing on her lines (or Cami gone): refuse the blank cast instead
        // of letting it burn the turn and the cooldown.
        return hasPrey
          ? null
          : { kind: "square", label: "No enemies stand on Cami's rank or file", squares: [] };
      },
      effect: (inst, api) => {
        const sq = camiSquare(api);
        if (sq == null) return;
        const hit: Square[] = [];
        for (const e of mySquares(api.board, api.opp)) {
          if (api.board.pieces[e]!.type === "k") continue;
          if (FILE(e) === FILE(sq) || RANK(e) === RANK(sq)) hit.push(e);
        }
        for (const e of hit) api.removePiece(e);
        if (hit.length) addEffect(api, { kind: "strike", squares: hit, owner: api.me, turns: 1 });
        armCooldown(inst, 3);
      },
      onMovePlayed: (inst, move, api) => {
        if (!camiInstance(api)) {
          inst.spent = true;
          return;
        }
        tickAndRearm(inst, move, api.me);
      },
      cooldown: (inst) => ({ left: cooldownLeft(inst), total: 3 }),
      status: (inst) => {
        const cd = cooldownLeft(inst);
        return cd > 0 ? `recharges in ${cd} of your turns` : "ready";
      },
    },
  ),

  card(
    {
      id: "cami_leap",
      name: "Guardian Leap",
      description:
        "Cami teleports to an empty square beside your king. A free action (it does not cost your turn); recharges over 2 of your turns.",
      tier: 6,
      category: "protection",
      icon: "IterationCw",
      flavor: "Wherever the king stands, she is already there.",
      special: true,
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const cami = camiSquare(api);
        const k = mySquares(api.board, api.me, "k")[0];
        const squares =
          cami == null || k == null
            ? []
            : neighbors8(k).filter((sq) => !api.board.pieces[sq]);
        return { kind: "square", label: "Choose where Cami lands beside your king", squares };
      },
      effect: (inst, api, picks) => {
        const cami = camiSquare(api);
        const to = picks[0]?.square;
        if (cami == null || to == null || api.board.pieces[to]) return;
        api.relocate(cami, to);
        // Keep the parent card's tracked square in step (a relocate is not a
        // move, so trackBoundPiece never sees it).
        const parent = camiInstance(api);
        if (parent) parent.state.sq = to;
        addEffect(api, { kind: "strike", squares: [to], owner: api.me, turns: 1 });
        armCooldown(inst, 2);
      },
      onMovePlayed: (inst, move, api) => {
        if (!camiInstance(api)) {
          inst.spent = true;
          return;
        }
        tickAndRearm(inst, move, api.me);
      },
      cooldown: (inst) => ({ left: cooldownLeft(inst), total: 2 }),
      status: (inst) => {
        const cd = cooldownLeft(inst);
        return cd > 0 ? `recharges in ${cd} of your turns` : "ready";
      },
    },
  ),
];

// ===========================================================================
// NEWJEANS / K-POP
// ===========================================================================

export const NEWJEANS_CARDS: Buff[] = [
  card(
    {
      id: "i_love_newjeans",
      name: "I Love NewJeans",
      description:
        "Harmony: for the game, every non-pawn, non-king piece of yours that stands next to a friendly piece may also step one square in any direction.",
      tier: 6,
      category: "movement",
      icon: "Users",
      flavor: "Five voices, one song. Standing together, they move as one.",
      fx: { motif: "empower", pieces: ["n", "b", "r", "q"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => {
        const p = api.board.pieces[sq]!;
        if (p.type === "k" || p.type === "p") return [];
        const grouped = neighbors8(sq).some((n) => {
          const q = api.board.pieces[n];
          return !!q && q.color === api.me;
        });
        return grouped ? slideMoves(api.board, sq, ALL_DIRS, inst.id, 1) : [];
      }),
    ),
  ),

  // The five members are POCKET COMPANIONS now (owner request): the first
  // activation deploys the member onto an empty square in your half as a real
  // piece of her class; later activations fire her single recharging ability.
  pocketCompanion({
    meta: {
      id: "minji",
      name: "Minji",
      description:
        "Deploy the leader on an empty square in your half: a rook-class companion. Her order, Linked Arms (once per 3 of your turns): every ally standing next to her cannot be captured for your opponent's next 2 turns.",
      tier: 5,
      category: "protection",
      icon: "Crown",
      flavor: "The eldest steps forward first. Nobody gets past her line.",
    },
    piece: "r",
    abilityCooldown: 3,
    abilityLabel: "Linked Arms",
    abilityReady: (api, sq) =>
      neighbors8(sq).some((n) => {
        const p = api.board.pieces[n];
        return !!p && p.color === api.me && p.type !== "k";
      }),
    ability: (_inst, api, sq) => {
      const squares = neighbors8(sq).filter((n) => {
        const p = api.board.pieces[n];
        return !!p && p.color === api.me && p.type !== "k";
      });
      if (squares.length) {
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
      }
    },
  }),

  pocketCompanion({
    meta: {
      id: "hyein",
      name: "Hyein",
      description:
        "Deploy the maknae on an empty square in your half: a pawn-class companion with long legs, striding to the first or second empty square straight ahead and springing over anything between. Once per game she may Ascend, promoting herself into a queen-class companion.",
      tier: 5,
      category: "movement",
      icon: "ArrowUp",
      flavor: "The maknae is taller than all of them, and her stride shows it.",
    },
    piece: "p",
    placeOk: pawnRankOk,
    // Her stride, only while she still walks on pawn legs (after Ascend she
    // has the whole queen's reach instead).
    augment: (api, sq, via) => {
      const p = api.board.pieces[sq];
      if (!p || p.type !== "p") return [];
      const dr = fwd(p.color);
      const tos = [
        [FILE(sq), RANK(sq) + dr],
        [FILE(sq), RANK(sq) + dr * 2],
      ]
        .filter(([f, r]) => inBoard(f, r))
        .map(([f, r]) => SQ(f, r))
        .filter((s) => pawnRankOk(s));
      return teleportMoves(api.board, sq, tos, via);
    },
    abilityCooldown: null,
    abilityLabel: "Ascend",
    abilityReady: (api, sq) => api.board.pieces[sq]?.type === "p",
    ability: (_inst, api, sq) => {
      if (api.board.pieces[sq]?.type !== "p") return;
      api.setPieceType(sq, "q");
      addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
    },
  }),

  pocketCompanion({
    meta: {
      id: "haerin",
      name: "Haerin",
      description:
        "Deploy the cat on an empty square in your half: a knight-class companion who may also step one square diagonally. Her strike, Pounce (once per 3 of your turns): snatch an enemy piece except a king a knight's leap away and land on its square.",
      tier: 5,
      category: "attack",
      icon: "Cat",
      flavor: "Silent, then gone. The cat always lands right on the kill.",
    },
    piece: "n",
    augment: (api, sq, via) => leapMoves(api.board, sq, DIAG_DIRS, via),
    abilityCooldown: 3,
    abilityLabel: "Pounce: choose the enemy to snatch",
    abilityTargets: (api, sq) =>
      KNIGHT_LEAPS.flatMap(([df, dr]) => {
        const f = FILE(sq) + df, r = RANK(sq) + dr;
        if (!inBoard(f, r)) return [];
        const prey = SQ(f, r);
        const t = api.board.pieces[prey];
        return t && t.color === api.opp && t.type !== "k" ? [prey] : [];
      }),
    ability: (inst, api, sq, pick) => {
      if (pick == null) return;
      const t = api.board.pieces[pick];
      if (!t || t.color !== api.opp || t.type === "k") return;
      api.removePiece(pick);
      api.relocate(sq, pick);
      inst.state.sq = pick;
      addEffect(api, { kind: "strike", squares: [pick], owner: api.me, turns: 1 });
    },
  }),

  pocketCompanion({
    meta: {
      id: "hanni",
      name: "Hanni",
      description:
        "Deploy the spotlight on an empty square in your half: a bishop-class companion. Her charm, Spotlight (once per 3 of your turns): an enemy piece except a king within 2 squares of her, and every enemy piece touching it, are charmed and cannot move for 1 turn.",
      tier: 5,
      category: "tempo",
      icon: "Sparkles",
      flavor: "One wink and the whole room forgets what it was doing.",
    },
    piece: "b",
    abilityCooldown: 3,
    abilityLabel: "Spotlight: choose an enemy within 2 squares of Hanni",
    abilityTargets: (api, sq) =>
      mySquares(api.board, api.opp).filter(
        (e) => api.board.pieces[e]!.type !== "k" && dist(e, sq) <= 2,
      ),
    ability: (_inst, api, _sq, pick) => {
      if (pick == null) return;
      const hit: Square[] = [];
      for (const t of [pick, ...neighbors8(pick)]) {
        const p = api.board.pieces[t];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq: t, owner: api.opp, turns: 1, skin: "charm" });
          hit.push(t);
        }
      }
      if (hit.length) addEffect(api, { kind: "bonk", squares: hit, owner: api.me, turns: 1 });
    },
  }),

  pocketCompanion({
    meta: {
      id: "danielle",
      name: "Danielle",
      description:
        "Deploy sunshine on an empty square in your half: a knight-class companion. Her gift, Sunshine (once per 3 of your turns): grow a new pawn on an empty square next to her.",
      tier: 5,
      category: "pieces",
      icon: "Sun",
      flavor: "Warm day, good soil. Something always sprouts around her.",
    },
    piece: "n",
    abilityCooldown: 3,
    abilityLabel: "Sunshine: choose an empty square beside Danielle",
    abilityTargets: (api, sq) =>
      neighbors8(sq).filter((n) => !api.board.pieces[n] && pawnRankOk(n)),
    ability: (_inst, api, _sq, pick) => {
      if (pick == null || api.board.pieces[pick] || !pawnRankOk(pick)) return;
      api.place(pick, "p", api.me);
      addEffect(api, { kind: "strike", squares: [pick], owner: api.me, turns: 1 });
    },
  }),

  card(
    {
      id: "ilovechaewon",
      name: "I Love Chaewon",
      description:
        "Fearless choreography: gracefully reposition up to 3 of your pieces, gliding each to any empty square in your own half of the board.",
      tier: 6,
      category: "movement",
      icon: "Feather",
      flavor: "Every step placed on purpose. The whole formation dances into place.",
      fx: { motif: "rally", self: true },
    },
    relocateMany(3, (api) => emptySquares(api.board, (sq) => inHalf(api.me, sq))),
  ),
];

// ===========================================================================
// NAMED / MISC / SOCIALS
// ===========================================================================

const NAMED: Buff[] = [
  card(
    {
      id: "daniel_caesar",
      name: "Daniel Caesar",
      description:
        "Smooth things over. For your opponent's next 3 turns none of their pieces may capture anything, so the board stays calm while you set up.",
      tier: 4,
      category: "hex",
      icon: "Music2",
      flavor: "Best part, right in the blue.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    timedOppFilter(3, (moves) => moves.filter((m) => !m.captured)),
  ),

  card(
    {
      id: "fur_elise",
      name: "Fur Elise",
      description:
        "Run your fingers down the keys. Choose a bishop and glide it along one diagonal, sweeping away up to 3 enemy pieces in its path as it lands.",
      tier: 5,
      category: "attack",
      requires: ["b"],
      icon: "Piano",
      flavor: "Every capture, a falling note.",
    },
    lineSweep("b", DIAG_DIRS, 3),
  ),

  card(
    {
      id: "joseph_leung",
      name: "Joseph Leung",
      description:
        "Sign the board. Bind one of your pieces: for the game it moves as a knight and queen at once, and cannot be captured for your opponent's next 4 turns.",
      tier: 5,
      category: "movement",
      icon: "Fingerprint",
      flavor: "One name, all over it.",
      fx: { motif: "empower", moveAs: "q", self: true },
    },
    bindPiece("Choose your signature piece", bindCandidates(["n", "b", "r", "q"]), {
      shieldTurns: 4,
      gen: (board, sq, via) => [
        ...slideMoves(board, sq, ALL_DIRS, via),
        ...leapMoves(board, sq, KNIGHT_LEAPS, via),
      ],
    }),
  ),

  card(
    {
      id: "rgb_keyboard",
      name: "RGB Keyboard",
      description:
        "Light up every key. For the game your knights add a 1-square step any direction, your bishops slide 2 straight, and your rooks slide 2 diagonally.",
      tier: 4,
      category: "movement",
      icon: "Keyboard",
      flavor: "Red, green, blue, and the whole squad glows.",
      fx: { motif: "empower", pieces: ["n", "b", "r"], self: true },
    },
    permanentAugment((_m, inst, api) => [
      ...mySquares(api.board, api.me, "n").flatMap((sq) =>
        leapMoves(api.board, sq, ALL_DIRS, inst.id),
      ),
      ...mySquares(api.board, api.me, "b").flatMap((sq) =>
        slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 2),
      ),
      ...mySquares(api.board, api.me, "r").flatMap((sq) =>
        slideMoves(api.board, sq, DIAG_DIRS, inst.id, 2),
      ),
    ]),
  ),

  card(
    {
      id: "uniqlo_warrior",
      name: "Uniqlo Warrior",
      description:
        "Suit up in the daily fit. Your entire army cannot be captured for your opponent's next 3 turns.",
      tier: 5,
      category: "protection",
      icon: "Shirt",
      flavor: "Dependable, breathable, bulletproof.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    shieldArmy(3),
  ),

  card(
    {
      id: "bayview_secondary_school",
      name: "Bayview Secondary School",
      description:
        "Detention for the whole class. Choose a square: every enemy piece except the king in the 3 by 3 around it is locked in place for their next 3 turns.",
      tier: 6,
      category: "tempo",
      icon: "School",
      flavor: "Nobody leaves till the bell.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the center of the detention block",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((c) =>
                [c, ...neighbors8(c)].some((sq) => {
                  const p = api.board.pieces[sq];
                  return !!p && p.color === api.opp && p.type !== "k";
                }),
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (const sq of [c, ...neighbors8(c)]) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "stun" });
          }
        }
      },
    ),
  ),

  card(
    {
      id: "check_out_our_socials",
      name: "Check Out Our Socials",
      description:
        "Go live to the whole board. Every enemy piece except the king freezes for their next 2 turns while your hyped-up side takes 2 extra moves right now.",
      tier: 8,
      category: "tempo",
      icon: "Megaphone",
      flavor: "Like, subscribe, and stop moving.",
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type !== "k") {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stun" });
        }
      }
      api.bs.extraMoves[api.me] += 2;
    }),
  ),
];

export const PERSONAL_CARDS: Buff[] = [
  ...GYM,
  ...FOCUS,
  ...AFFECTION,
  ...CAMI_ABILITIES,
  ...NAMED,
];
