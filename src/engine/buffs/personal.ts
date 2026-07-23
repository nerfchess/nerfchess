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
  BuffPick,
  CardFx,
} from "../buff";
import { isInCheck } from "../board";
import { Tier } from "../nerf";
import { BoardState, Color, FILE, inBoard, Move, PieceType, RANK, SQ, Square } from "../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
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

/** The in-board squares within two king-steps of `sq` (up to 24). */
const neighbors24 = (sq: Square): Square[] => {
  const out: Square[] = [];
  for (let df = -2; df <= 2; df++)
    for (let dr = -2; dr <= 2; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = FILE(sq) + df, r = RANK(sq) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  return out;
};

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
// COMPANION MACHINERY (I Love Cami)
// ===========================================================================
// Cami is the one companion piece: on deploy her card places a real queen
// whose square the instance tracks through trackBoundPiece, exactly like the
// other piece-bound cards. Rendering swaps in bespoke portrait art at that
// square (Board.tsx companionSquares); mechanically everything is built from
// the primitives that already ship (place / augments / opponent-move filters
// / freeze / strike / bonk), so nothing here can soft-lock a game, freeze a
// king, or desync a replica.

const sqLabel = (sq: Square) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;

// ===========================================================================
// GYM / FEATS
// ===========================================================================

const GYM: Buff[] = [
  card(
    {
      id: "waist_25",
      name: "25 Inch Waist",
      description:
        "Lean and nimble: after your opponent's next move, each of your pawns may also slip diagonally forward one square onto empty ground, no capture needed, wiggling past the traffic.",
      tier: 2,
      category: "movement",
      requires: ["p"],
      icon: "Wind",
      flavor: "No belt, no problem, no spare inch.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      // Delayed grant: the diagonal slip only wakes after your opponent's next
      // move, so the augment stays inert until then.
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.active && move.color === api.opp) inst.state.active = true;
      },
      augmentMoves: (moves, inst, api) => {
        if (!inst.state.active) return;
        addNovel(
          moves,
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
        );
      },
      status: (inst) => (inst.state.active ? null : "wakes after your opponent replies"),
    },
  ),

  card(
    {
      id: "handstand_pushup",
      name: "Handstand Pushup",
      description:
        "Flip one pawn upside down. Forever it may also step and capture straight back or diagonally back toward your own side, but never onto its own back rank.",
      tier: 2,
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
        "Explosive pull-up: take one of your pieces except the king and hurl it straight up its own file to any empty square, phasing past your own pieces but stopping short of the first enemy in its lane. Once.",
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
          const occ = api.board.pieces[sq];
          if (!occ) {
            if (p.type !== "p" || pawnRankOk(sq)) out.push(sq);
          } else if (occ.color === api.opp) {
            break; // the launch phases past friendlies but cannot pass an enemy
          }
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
        "Brace your core. Every one of your pieces standing in the central 16 squares becomes uncapturable for your opponent's next 2 turns.",
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
      2,
    ),
  ),

  card(
    {
      id: "onearmmuscleupismydream",
      name: "One Arm Muscle Up Is My Dream",
      description:
        "One chosen piece reaches for the bar: once, it may slide diagonally like a bishop, one long arm across the board. That reach is a single grasp, taking it spends it, and so does the first of your turns where the reach is available but you move without using it.",
      tier: 5,
      category: "movement",
      icon: "MoveUpRight",
      flavor: "Someday the second arm. Today, this reach.",
      fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "b", self: true },
    },
    (() => {
      // Nerf: the reach is a one-charge grasp, not a permanent grant. Using it
      // spends the charge (normal), and because the engine only ever offers a
      // legal reach, a "failed/illegal attempt" is modeled as the fallback in
      // the directive glossary: the charge also expires the first turn the
      // reach was available but the owner moved without taking it.
      const reachOf = (b: BoardState, sq: Square, via: string) =>
        slideMoves(b, sq, DIAG_DIRS, via);
      return {
        kind: "activated",
        spendOnUse: false,
        targets: (inst, api, picks) =>
          picks.length > 0 || inst.state.sq != null
            ? null
            : {
                kind: "square",
                label: "Choose the piece reaching for its dream",
                squares: bindCandidates()(api),
              },
        effect: (inst, _api, picks) => {
          if (inst.state.sq != null) return;
          inst.state.sq = picks[0]?.square;
        },
        augmentMoves: (moves, inst, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) return;
          addNovel(moves, reachOf(api.board, sq, inst.id));
        },
        onMovePlayed: (inst, move, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq != null && move.color === api.me) {
            if (move.from === sq && move.via === inst.id) {
              inst.spent = true; // the reach was taken
              return;
            }
            // A move was made without the reach: if the arm could have reached
            // this turn (the bound piece itself moved, so it clearly could, or
            // it still stands and has a diagonal open), the charge is spent.
            const available =
              move.from === sq || reachOf(api.board, sq, inst.id).length > 0;
            if (available) {
              inst.spent = true;
              return;
            }
          }
          trackBoundPiece(inst, move);
        },
        status: (inst) => {
          const sq = inst.state.sq as Square | undefined;
          return sq == null ? "activate to choose a piece" : `reaching from ${sqLabel(sq)}`;
        },
      };
    })(),
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
        // Nerf: capacity reduced from 4 to 3 shoved pieces (kings stay immune,
        // no captures, per pushDest above).
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
        "Lock one of your pieces into a perfect hold. It slides like a rook along every open rank and file for the game, and hovers uncapturable for your opponent's next 5 turns, until the moment it makes a capture, which ends the immunity early.",
      tier: 6,
      category: "protection",
      icon: "StretchHorizontal",
      flavor: "Dead still, arms locked, feet floating.",
      fx: { motif: "ward", moveAs: "r", self: true },
    },
    (() => {
      // Like bindPiece(shieldTurns:5) but the immunity ends the instant the
      // held piece captures. The rook-slide movement stays for the game.
      const gen = (b: BoardState, sq: Square, via: string) =>
        slideMoves(b, sq, ORTHO_DIRS, via);
      return {
        kind: "activated",
        spendOnUse: false,
        targets: (inst, api, picks) =>
          picks.length > 0 || inst.state.sq != null
            ? null
            : {
                kind: "square",
                label: "Choose a piece to hold in a planche",
                squares: bindCandidates()(api),
              },
        effect: (inst, api, picks) => {
          const sq = picks[0]?.square;
          if (sq == null || inst.state.sq != null) return;
          inst.state.sq = sq;
          inst.state.shielded = true;
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 5 });
        },
        augmentMoves: (moves, inst, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) return;
          addNovel(moves, gen(api.board, sq, inst.id));
        },
        onMovePlayed: (inst, move, api) => {
          const sq = inst.state.sq as Square | undefined;
          // The hold breaks the moment the planche piece captures: drop its
          // shield early (the shield square still reads move.from here, since
          // shields follow the piece only after these hooks run).
          if (
            sq != null &&
            inst.state.shielded &&
            move.color === api.me &&
            move.from === sq &&
            move.captured
          ) {
            for (let i = api.bs.effects.length - 1; i >= 0; i--) {
              const e = api.bs.effects[i];
              if (
                e.kind === "shield" &&
                e.owner === api.me &&
                e.squares &&
                e.squares.length === 1 &&
                e.squares[0] === sq
              ) {
                api.bs.effects.splice(i, 1);
              }
            }
            inst.state.shielded = false;
          }
          trackBoundPiece(inst, move);
        },
        status: (inst) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return "activate to choose a piece";
          return inst.state.shielded
            ? `held at ${sqLabel(sq)}, immune`
            : `sliding at ${sqLabel(sq)}`;
        },
      };
    })(),
  ),

  card(
    {
      id: "fingertip_maltese",
      name: "Fingertip Maltese",
      description:
        "Elite fingertip hold on one enemy piece: it freezes for their next 3 turns and the empty squares around it are sealed, so no fresh piece can move in to rescue it, though pieces already beside it may leave normally.",
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
        // Nerf: only the EMPTY surrounding squares are sealed, so a piece
        // already standing beside the pinned one is never trapped in and may
        // leave normally; the seal still blocks any fresh piece moving in.
        addEffect(api, {
          kind: "barred",
          squares: neighbors8(sq).filter((n) => !api.board.pieces[n]),
          against: api.opp,
          turns: 3,
        });
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
      tier: 4,
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
        "Veins run dead straight up the forearm: after your opponent's next move, each of your pawns may also capture the enemy piece directly ahead of it, one square straight forward, for the rest of the game.",
      tier: 4,
      category: "attack",
      requires: ["p"],
      icon: "Activity",
      flavor: "Dead straight, no curve, full grip.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      // Delayed grant: the forward grip only comes online after your opponent's
      // next move.
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.active && move.color === api.opp) inst.state.active = true;
      },
      augmentMoves: (moves, inst, api) => {
        if (!inst.state.active) return;
        addNovel(
          moves,
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
        );
      },
      status: (inst) => (inst.state.active ? null : "grip sets in after your opponent replies"),
    },
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
        "Crack the can: take 2 extra moves right now for a triple-move turn. Zero sugar means zero crash. Once.",
      tier: 5,
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
      },
    },
  ),

  card(
    {
      id: "monkeytype",
      name: "Monkeytype",
      description:
        "Type at full speed: relocate up to 2 of your pieces, each exactly one square, in a rapid burst of keystrokes. Kings sit this test out.",
      tier: 3,
      category: "movement",
      icon: "Keyboard",
      flavor: "Accuracy 100 percent, patience zero.",
      fx: { motif: "rally", self: true },
    },
    relocateMany(2, stepDest),
  ),

  card(
    {
      id: "rubiks_cube",
      name: "Rubik's Cube",
      description:
        "Scramble the cube: choose up to 3 twists, each swapping the spots of two of your own pieces standing within 2 squares of each other. Kings never twist. The twists only resolve after your opponent's next move.",
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
        spendOnUse: false,
        targets: (inst, api, picks) => {
          if (inst.state.pending != null || picks.length >= 6) return null;
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
        // Nerf: the twists no longer resolve on activation. Bank the chosen
        // pairs and apply them only after the opponent's next move.
        effect: (inst, _api, picks) => {
          if (inst.state.pending != null) return;
          inst.state.pending = picks
            .map((k) => k.square)
            .filter((s): s is Square => s != null);
        },
        onMovePlayed: (inst, move, api) => {
          const pending = inst.state.pending as Square[] | undefined;
          if (pending == null || inst.spent || move.color !== api.opp) return;
          for (let i = 0; i + 1 < pending.length; i += 2) {
            const a = pending[i], b = pending[i + 1];
            if (a == null || b == null) continue;
            const pa = api.board.pieces[a], pb = api.board.pieces[b];
            if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) continue;
            // Both are mine: swapping their types swaps the pieces in place.
            const ta = pa.type, tb = pb.type;
            api.setPieceType(a, tb);
            api.setPieceType(b, ta);
          }
          inst.spent = true;
        },
        status: (inst) =>
          inst.state.pending == null
            ? "activate to scramble the cube"
            : "the twists resolve after your opponent moves",
      };
    })(),
  ),

  card(
    {
      id: "geometry_dash",
      name: "Geometry Dash",
      description:
        "One of your pieces hits the beat: it dashes straight forward, phasing over your own pieces and smashing up to 2 enemies in its lane before landing. Never kings.",
      tier: 7,
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
        "After your opponent's next move, a townsperson reports for duty: a new pawn takes the nearest open square on your pawn line, or just ahead of it if the line is packed.",
      tier: 2,
      category: "pieces",
      icon: "Home",
      flavor: "Population small, spirit enormous.",
    },
    {
      kind: "passive",
      // Delayed arrival: the townsperson reports only after your opponent's
      // next move, not the instant the card is drafted.
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp) return;
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
            break;
          }
        }
        inst.spent = true;
      },
    },
  ),

  card(
    {
      id: "bee_swarm_simulator",
      name: "Bee Swarm Simulator",
      description:
        "Release the hive: choose 3 empty squares on the two center ranks, and after your opponent's next move a buzzing swarm of 3 bee pawns lands there, harassing both armies from no-mans-land.",
      tier: 5,
      category: "pieces",
      icon: "Bug",
      flavor: "Everybody buzz in, the hive is hiring.",
    },
    (() => {
      const inZone = (sq: Square) => RANK(sq) === 3 || RANK(sq) === 4;
      return {
        kind: "activated",
        spendOnUse: false,
        // Pick the three landing squares now; the bees only materialize after
        // your opponent's next move (any square taken by then is skipped).
        targets: (inst, api, picks) => {
          if (inst.state.pending != null || picks.length >= 3) return null;
          return {
            kind: "square",
            label: `Choose where a bee will land (${picks.length + 1}/3)`,
            squares: emptySquares(api.board, inZone).filter(
              (sq) => !picks.some((k) => k.square === sq),
            ),
          };
        },
        effect: (inst, _api, picks) => {
          if (inst.state.pending != null) return;
          inst.state.pending = picks
            .map((k) => k.square)
            .filter((s): s is Square => s != null);
        },
        onMovePlayed: (inst, move, api) => {
          const pending = inst.state.pending as Square[] | undefined;
          if (pending == null || inst.spent || move.color !== api.opp) return;
          for (const sq of pending) {
            if (!api.board.pieces[sq]) api.place(sq, "p", api.me);
          }
          inst.spent = true;
        },
        status: (inst) =>
          inst.state.pending == null
            ? "activate to ready the swarm"
            : "the swarm arrives after your opponent moves",
      };
    })(),
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
        "Your pieces standing in your own half cannot be captured for your opponent's next turn, and you take one bonus move right now. Your king shares the shield only if it is currently in check.",
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
        // Nerf: shield only the pieces in your own half, for a single opponent
        // turn, plus one bonus move. The king is covered only when in check.
        const squares = mySquares(api.board, api.me).filter(
          (sq) => inHalf(api.me, sq) && api.board.pieces[sq]!.type !== "k",
        );
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 1 });
        if (isInCheck(api.board, api.me)) {
          addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
        }
        api.bs.extraMoves[api.me] += 1;
      },
    },
  ),

  // Cami, the companion piece (owner request, SIMPLIFIED: no ability kit).
  // Place her and she fights as an amazon; allies beside her are guarded
  // (Devotion) and whoever takes her is frozen (vengeance). Nothing else.
  card(
    {
      id: "i_love_cam",
      name: "I Love Cami",
      description:
        "Place Cami on an empty square in your half: a queen who also leaps like a knight. Devotion: allies standing beside her cannot be captured for your opponent's next 3 turns. If she is ever taken, her captor is frozen for 2 turns.",
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
        // Nerf: Devotion is no longer permanent. The group immunity runs for
        // the opponent's next 3 turns (counted down in onMovePlayed).
        inst.state.devote = 3;
        addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
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
        // Devotion only guards while the timed window is open.
        if (((inst.state.devote as number) ?? 0) <= 0) return moves;
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
        // Count down the Devotion window on the opponent's own turns.
        if (sq != null && move.color === api.opp) {
          const left = (inst.state.devote as number) ?? 0;
          if (left > 0) inst.state.devote = left - 1;
        }
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
        "Bring your strongest fallen piece home to an empty square in your half. She arrives shielded, uncapturable for your opponent's next 2 turns, but the shield ends once she has made two captures.",
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
      // Nerf: the shield still runs for 2 opponent turns, but it also ends
      // after the protected piece captures twice. Only the one revived piece
      // is protected, so "two protected pieces capture" is delivered as the
      // revived piece capturing twice.
      return {
        kind: "activated",
        spendOnUse: false,
        targets: (inst, api, picks) => {
          if (inst.state.sq != null || picks.length > 0) return null;
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
        effect: (inst, api, picks) => {
          if (inst.state.sq != null) return;
          const type = bestType(api);
          const sq = picks[0]?.square;
          if (type == null || sq == null || api.board.pieces[sq]) return;
          if (type === "p" && !pawnRankOk(sq)) return;
          api.place(sq, type, api.me);
          markRevived(api, type);
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
          inst.state.sq = sq;
          inst.state.caps = 0;
        },
        onMovePlayed: (inst, move, api) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          if (
            move.color === api.me &&
            move.from === sq &&
            move.captured &&
            move.captured !== "k"
          ) {
            const caps = ((inst.state.caps as number) ?? 0) + 1;
            inst.state.caps = caps;
            if (caps >= 2) {
              // Drop her shield early (it still reads move.from here, before
              // shields follow the piece).
              for (let i = api.bs.effects.length - 1; i >= 0; i--) {
                const e = api.bs.effects[i];
                if (
                  e.kind === "shield" &&
                  e.owner === api.me &&
                  e.squares &&
                  e.squares.length === 1 &&
                  e.squares[0] === sq
                ) {
                  api.bs.effects.splice(i, 1);
                }
              }
              inst.state.sq = move.to;
              inst.spent = true;
              return;
            }
          }
          trackBoundPiece(inst, move);
        },
        status: (inst) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return "activate to bring her home";
          return `shielded at ${sqLabel(sq)}, ${(inst.state.caps as number) ?? 0}/2 captures`;
        },
      };
    })(),
  ),

  card(
    {
      id: "ilovewhimperingaudios",
      name: "I Love Whimpering Audios",
      description:
        "After your opponent's next move, the charm sets in: on each of their following 3 moves, the enemy queen, rook, bishop, or knight nearest your king is charmed and joins your army. Kings never fall for it.",
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
        // Nerf: delay the first trigger until after the opponent's next move.
        if (!inst.state.armed) {
          inst.state.armed = true;
          return;
        }
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
        "After your opponent's next move, freeze one enemy pawn for 2 turns, but you get so worked up you freeze your own nearest pawn for 2 turns too. Mostly self-inflicted.",
      tier: 1,
      category: "tempo",
      icon: "HeartCrack",
      flavor: "Blocked, deleted, and still living rent free in my head.",
    },
    {
      kind: "passive",
      // Delayed payoff: the freezes only bite after your opponent's next move.
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp) return;
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
        inst.spent = true;
      },
    },
  ),

  card(
    {
      id: "ilovesmellingmygfshoodie",
      name: "I Love Smelling My GF's Hoodie",
      description:
        "Wrap one of your pieces in the hoodie: it and the friendly piece directly behind it cannot be captured for your opponent's next 3 turns. Warm, safe, faintly of her.",
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
        if (sq == null) return;
        // The hoodie is big enough for two: the friendly piece directly
        // behind (toward your own back rank) shares it. The rider that
        // separates this from plain Reinforce (tier 2).
        const behind = sq + (api.me === "w" ? -8 : 8);
        const squares = [sq];
        if (behind >= 0 && behind <= 63) {
          const p2 = api.board.pieces[behind];
          if (p2 && p2.color === api.me) squares.push(behind);
        }
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 3 });
      },
    ),
  ),

  card(
    {
      id: "ilovemakingout",
      name: "I Love Making Out",
      description:
        "Bond two of your pieces for the game. Each also moves the way the other does, blending a knight with a bishop or a rook with a queen, but these borrowed moves cannot capture.",
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
          // Nerf: the borrowed moves cannot capture, so drop any that would.
          if (a != null && tb) {
            const p = api.board.pieces[a];
            if (p && p.color === api.me)
              addNovel(moves, genAs(tb, api.board, a, inst.id).filter((m) => !m.captured));
          }
          if (b != null && ta) {
            const p = api.board.pieces[b];
            if (p && p.color === api.me)
              addNovel(moves, genAs(ta, api.board, b, inst.id).filter((m) => !m.captured));
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
// NEWJEANS / K-POP
// ===========================================================================

export const NEWJEANS_CARDS: Buff[] = [
  card(
    {
      id: "i_love_newjeans",
      name: "I Love NewJeans",
      description:
        "Harmony: for the game, every non-king piece of yours that stands next to a friendly piece may also step one square in any direction onto an empty square, but this step cannot capture.",
      tier: 6,
      category: "movement",
      icon: "Users",
      flavor: "Five voices, one song. Standing together, they move as one.",
      fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me)
        .flatMap((sq) => {
          const p = api.board.pieces[sq]!;
          // buffed: pawns now share the harmony step too (only the king is barred).
          if (p.type === "k") return [];
          const grouped = neighbors8(sq).some((n) => {
            const q = api.board.pieces[n];
            return !!q && q.color === api.me;
          });
          return grouped ? slideMoves(api.board, sq, ALL_DIRS, inst.id, 1) : [];
        })
        // Nerf: the harmony step cannot capture, only slide onto empty ground.
        .filter((m) => !m.captured),
    ),
  ),

  // The five members are back to simple, strong one-shot / passive cards
  // (owner request: placing companions was too confusing). Their board-wide
  // portrait play animations stay (personalPlays.tsx).
  card(
    {
      id: "minji",
      name: "Minji",
      description:
        "Leader's guard: every one of your pieces standing within two squares of your king links arms and cannot be captured for your opponent's next 5 turns, but the guard drops the instant two of the protected pieces have captured.",
      tier: 5,
      category: "protection",
      icon: "Crown",
      flavor: "The eldest steps forward first. Nobody gets past her line.",
      fx: { motif: "ward", self: true },
    },
    // Activated (not instant) on purpose: an activated card can sit in a hand,
    // so the god panel may summon it and the player picks the moment the
    // guard snaps in. The guard is a card-owned move filter (not a board
    // shield effect) so the card can end it early after two protected captures.
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst, api) => {
        if (inst.state.squares != null) return;
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null) {
          inst.spent = true;
          return;
        }
        // The guard reaches allies within two squares of the king, while still
        // never covering the king's own square.
        const squares = neighbors24(k).filter((sq) => {
          const p = api.board.pieces[sq];
          return !!p && p.color === api.me;
        });
        inst.state.squares = squares;
        inst.state.turns = 5; // opponent turns
        inst.state.caps = 0;
        if (squares.length === 0) inst.spent = true;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares || squares.length === 0 || ((inst.state.turns as number) ?? 0) <= 0) {
          return moves;
        }
        const guarded = new Set(squares);
        const kept = moves.filter((m) => {
          const cap = captureSquare(m);
          return cap == null || !guarded.has(cap);
        });
        // Never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (squares == null || squares.length === 0) return;
        if (move.color === api.me) {
          const idx = squares.indexOf(move.from);
          if (idx >= 0) {
            // A protected piece moved: count its capture and let the guard
            // follow it to its new square.
            if (move.captured && move.captured !== "k") {
              inst.state.caps = ((inst.state.caps as number) ?? 0) + 1;
            }
            squares[idx] = move.to;
            if (((inst.state.caps as number) ?? 0) >= 2) {
              inst.state.squares = [];
              inst.spent = true;
              return;
            }
          }
        }
        if (move.color === api.opp) {
          inst.state.turns = ((inst.state.turns as number) ?? 0) - 1;
          if (((inst.state.turns as number) ?? 0) <= 0) inst.spent = true;
        }
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (squares == null) return "activate to raise the guard";
        return `guard up, ${(inst.state.caps as number) ?? 0}/2 captures spent`;
      },
    },
  ),

  card(
    {
      id: "hyein",
      name: "Hyein",
      description:
        "Long legs: for the game each of your pawns may also stride straight forward to the first or second empty square ahead, springing over anything in between.",
      tier: 5,
      category: "movement",
      requires: ["p"],
      icon: "ArrowUp",
      flavor: "The maknae is taller than all of them, and her stride shows it.",
      fx: { motif: "rally", pieces: ["p"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "p").flatMap((sq) => {
        const dr = fwd(api.board.pieces[sq]!.color);
        // The stride reaches up to the second empty square ahead.
        const tos = [
          [FILE(sq), RANK(sq) + dr],
          [FILE(sq), RANK(sq) + dr * 2],
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
      id: "haerin",
      name: "Haerin",
      description:
        "Cat's pounce: choose one of your pieces, then an enemy a knight's leap away. Snatch that piece off the board, land yours on its square, and it stands shielded, uncapturable for your opponent's next turn, unless landing there gives check.",
      tier: 5,
      category: "attack",
      icon: "Cat",
      flavor: "Silent, then gone. The cat always lands right on the kill.",
    },
    (() => {
      const preyFrom = (api: BuffApi, from: Square): Square[] => {
        const isPawn = api.board.pieces[from]?.type === "p";
        return KNIGHT_LEAPS.flatMap(([df, dr]) => {
          const f = FILE(from) + df, r = RANK(from) + dr;
          if (!inBoard(f, r)) return [];
          const sq = SQ(f, r);
          const t = api.board.pieces[sq];
          if (!t || t.color !== api.opp || t.type === "k") return [];
          if (isPawn && !pawnRankOk(sq)) return [];
          return [sq];
        });
      };
      // A shielded piece must not also be giving check: the guard and a check
      // are mutually exclusive. Does a `type` piece standing on `from` attack
      // the enemy king from there?
      const givesCheck = (api: BuffApi, from: Square, type: PieceType): boolean => {
        const ek = mySquares(api.board, api.opp, "k")[0];
        if (ek == null) return false;
        switch (type) {
          case "p": {
            const dr = fwd(api.me);
            return [
              [1, dr],
              [-1, dr],
            ].some(([df, d]) => {
              const f = FILE(from) + df, r = RANK(from) + d;
              return inBoard(f, r) && SQ(f, r) === ek;
            });
          }
          case "n":
            return leapMoves(api.board, from, KNIGHT_LEAPS, "").some((m) => m.to === ek);
          case "b":
            return slideMoves(api.board, from, DIAG_DIRS, "").some((m) => m.to === ek);
          case "r":
            return slideMoves(api.board, from, ORTHO_DIRS, "").some((m) => m.to === ek);
          case "q":
            return slideMoves(api.board, from, ALL_DIRS, "").some((m) => m.to === ek);
          default:
            return false;
        }
      };
      return activated(
        (_inst, api, picks) =>
          picks.length === 0
            ? {
                kind: "square",
                label: "Choose the piece that pounces",
                squares: mySquares(api.board, api.me).filter(
                  (sq) => api.board.pieces[sq]!.type !== "k" && preyFrom(api, sq).length > 0,
                ),
              }
            : picks.length === 1
              ? {
                  kind: "square",
                  label: "Choose the enemy to pounce on",
                  squares: picks[0].square != null ? preyFrom(api, picks[0].square) : [],
                }
              : null,
        (_inst, api, picks) => {
          const from = picks[0]?.square, prey = picks[1]?.square;
          if (from == null || prey == null) return;
          const mover = api.board.pieces[from];
          if (!mover || mover.color !== api.me) return;
          api.removePiece(prey);
          const landed = mover.type !== "p" || pawnRankOk(prey);
          if (landed) api.relocate(from, prey);
          addEffect(api, { kind: "strike", squares: [prey], owner: api.me, turns: 1 });
          // The pouncer lands shielded for the opponent's next turn, UNLESS the
          // pounce gives check: a checker never gets the shield (it cannot both
          // be uncapturable and be delivering check).
          if (landed && !givesCheck(api, prey, mover.type)) {
            addEffect(api, { kind: "shield", owner: api.me, squares: [prey], turns: 1 });
          }
        },
      );
    })(),
  ),

  card(
    {
      id: "hanni",
      name: "Hanni",
      description:
        "Spotlight: choose an enemy piece. It and every enemy piece within two squares of it are charmed and cannot move for their next 2 turns. Kings shrug it off.",
      tier: 5,
      category: "tempo",
      icon: "Sparkles",
      flavor: "One wink and the whole room forgets what it was doing.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to spotlight",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const hit: Square[] = [];
        // buffed: the charm now spreads to enemies within two squares (was one).
        for (const t of [sq, ...neighbors24(sq)]) {
          const p = api.board.pieces[t];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: t, owner: api.opp, turns: 2, skin: "charm" });
            hit.push(t);
          }
        }
        if (hit.length) addEffect(api, { kind: "bonk", squares: hit, owner: api.me, turns: 1 });
      },
    ),
  ),

  card(
    {
      id: "danielle",
      name: "Danielle",
      description:
        "Sunshine: grow three new pawns on any empty squares in your own half, basking in a warmth that keeps each of them uncapturable for your opponent's next 2 turns.",
      tier: 5,
      category: "pieces",
      icon: "Sun",
      flavor: "Warm day, good soil. Something always sprouts around her.",
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    (() => {
      // buffed: grows three pawns now (was two), each shielded for 2 turns.
      const base = placePieces(["p", "p", "p"], (api: BuffApi) => (sq: Square) => inHalf(api.me, sq));
      return {
        ...base,
        effect: (inst: BuffInstance, api: BuffApi, picks: { square?: Square }[]) => {
          base.effect?.(inst, api, picks as never);
          const squares = picks
            .map((k) => k.square)
            .filter((sq): sq is Square => sq != null && api.board.pieces[sq]?.color === api.me);
          if (squares.length) {
            addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
          }
        },
      };
    })(),
  ),

  card(
    {
      id: "ilovechaewon",
      name: "I Love Chaewon",
      description:
        "Fearless choreography: gracefully reposition up to 3 of your pieces, gliding each to any empty square in your own half of the board.",
      tier: 7,
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
        "Smooth things over. For your opponent's next 2 turns none of their pieces may capture anything, so the board stays calm while you set up.",
      tier: 4,
      category: "hex",
      icon: "Music2",
      flavor: "Best part, right in the blue.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    timedOppFilter(2, (moves) => moves.filter((m) => !m.captured)),
  ),

  card(
    {
      id: "fur_elise",
      name: "Fur Elise",
      description:
        "Run your fingers down the keys. Choose a bishop and glide it along one diagonal, sweeping away up to 3 enemy pieces in its path as it lands. Using it spends your next unused draft reroll, if you have one.",
      tier: 5,
      category: "attack",
      requires: ["b"],
      icon: "Piano",
      flavor: "Every capture, a falling note.",
    },
    (() => {
      const base = lineSweep("b", DIAG_DIRS, 3);
      return {
        ...base,
        // Preserve the sweep, but using it spends your next unused reroll.
        effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
          base.effect?.(inst, api, picks);
          if (api.mine.rerollsLeft > 0) api.mine.rerollsLeft -= 1;
        },
      };
    })(),
  ),

  card(
    {
      id: "joseph_leung",
      name: "Joseph Leung",
      description:
        "Sign the board. Bind one of your pieces: for the game it moves as a knight and queen at once, and cannot be captured for your opponent's next 4 turns.",
      tier: 6,
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
        "Light up every key. For the game your knights add a 1-square step any direction, your bishops slide 2 straight, and your rooks slide 2 diagonally, but these added moves cannot capture.",
      tier: 4,
      category: "movement",
      icon: "Keyboard",
      flavor: "Red, green, blue, and the whole squad glows.",
      fx: { motif: "empower", pieces: ["n", "b", "r"], self: true },
    },
    permanentAugment((_m, inst, api) =>
      [
        ...mySquares(api.board, api.me, "n").flatMap((sq) =>
          leapMoves(api.board, sq, ALL_DIRS, inst.id),
        ),
        ...mySquares(api.board, api.me, "b").flatMap((sq) =>
          slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 2),
        ),
        ...mySquares(api.board, api.me, "r").flatMap((sq) =>
          slideMoves(api.board, sq, DIAG_DIRS, inst.id, 2),
        ),
        // The added moves are non-capturing: drop any that would capture.
      ].filter((m) => !m.captured),
    ),
  ),

  card(
    {
      id: "uniqlo_warrior",
      name: "Uniqlo Warrior",
      description:
        "Suit up in the daily fit. Choose up to four of your pieces: they cannot be captured for your opponent's next 3 turns.",
      tier: 5,
      category: "protection",
      icon: "Shirt",
      flavor: "Dependable, breathable, bulletproof.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    // Nerf: protection limited to four chosen pieces (was the whole army),
    // duration preserved at the opponent's next 3 turns.
    activated(
      (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Choose a piece to suit up (${picks.length + 1}/4)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null);
        if (squares.length) {
          addEffect(api, { kind: "shield", owner: api.me, squares, turns: 3 });
        }
      },
    ),
  ),

  card(
    {
      id: "bayview_secondary_school",
      name: "Bayview Secondary School",
      description:
        "Detention for the whole class. Choose a square: after your opponent's next move, every enemy piece except the king in the 3 by 3 around it is locked in place for their next 3 turns.",
      tier: 6,
      category: "tempo",
      icon: "School",
      flavor: "Nobody leaves till the bell.",
      fx: { motif: "jail" },
    },
    // Nerf: the lockdown no longer bites on activation. Bank the chosen center
    // and apply the freezes only after the opponent's next move.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        inst.state.center != null || picks.length > 0
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
      effect: (inst, _api, picks) => {
        if (inst.state.center != null) return;
        if (picks[0]?.square != null) inst.state.center = picks[0].square;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.center == null || inst.spent || move.color !== api.opp) return;
        const c = inst.state.center as Square;
        for (const sq of [c, ...neighbors8(c)]) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "stun" });
          }
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.center == null
          ? "activate to set detention"
          : "detention starts after your opponent moves",
    },
  ),

  card(
    {
      id: "check_out_our_socials",
      name: "Check Out Our Socials",
      description:
        "Go live to the squad. Freeze up to 3 enemy pieces except the king for their next turn, then take one bonus move.",
      tier: 8,
      category: "tempo",
      icon: "Megaphone",
      flavor: "Like, subscribe, and stop moving.",
      fx: { motif: "slow", pieces: "all" },
    },
    // Nerf: no more board-wide freeze or second bonus move. Freeze up to three
    // chosen non-king enemies for one turn, then take a single bonus move.
    {
      kind: "activated",
      freeAction: true,
      targets: (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to freeze (${picks.length + 1}/3)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      effect: (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square == null) continue;
          const p = api.board.pieces[k.square];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns: 1, skin: "stun" });
          }
        }
        api.bs.extraMoves[api.me] += 1;
      },
    },
  ),
];

export const PERSONAL_CARDS: Buff[] = [
  ...GYM,
  ...FOCUS,
  ...AFFECTION,
  ...NAMED,
];
