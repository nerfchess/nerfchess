// Italian brainrot: a wild, chaotic meme card set (the 2025 AI-brainrot
// characters). Every card is fully implemented and reuses ONLY primitives that
// already exist in the engine (freeze / bonk / strike flashes, targeted
// removal, relocation, skips, clock pressure, timed move augments, the
// non-empty-fallback curse), so nothing here can soft-lock a game or freeze a
// king. All effects are a pure function of the synced board plus the seeded
// api.rng (none of these actually needs randomness), so they replay identically
// on both clients.
//
// The BuffCategory union has no "funny" member (that is a COLLECTION name, not a
// category), so each card carries the real category that best fits its effect;
// the whole array is spread into ALL_BUFFS by library.ts exactly like
// FUNNY_CARDS / PT_CARDS, which is what makes it join the funny pool.
//
// Timing note: game.ts runs onMovePlayed BEFORE it ticks effect timers, and a
// timer only ticks on the mover whose color matches effectTickColor. So an
// owner:opp freeze added on MY move is not ticked that cycle and lasts its full
// count; the drum below deliberately beats on the caster's own turns for that
// reason. Ids here are all fresh (the pre-existing single-bonk "sahur",
// "coconut_bonk", "durian" and "watermelon_rind" in crossref keep their ids).

import { freezeAllEnemies } from "./helpers";
import {
  Buff,
  BuffApi,
  Square,
  card,
  activated,
  instant,
  addEffect,
  curse,
  dist,
  mySquares,
  pawnRankOk,
  permanentAugment,
  slideMoves,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./funny/shared";

// --- Local geometry ---------------------------------------------------------

/** A center square plus every square within Chebyshev `radius` (clipped). At
 * the default radius 1 this is the 3x3 neighbourhood; radius 2 is a 5x5. */
function blastAt(center: Square, radius = 1): Square[] {
  const out: Square[] = [];
  for (let df = -radius; df <= radius; df++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const f = FILE(center) + df, r = RANK(center) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  }
  return out;
}

/** True when the blast around `center` catches at least one enemy non-king. */
function blastHitsEnemy(api: BuffApi, center: Square, radius = 1): boolean {
  return blastAt(center, radius).some((sq) => {
    const p = api.board.pieces[sq];
    return !!p && p.color === api.opp && p.type !== "k";
  });
}

/** The `count` enemy non-kings nearest their own king, ties broken by lowest
 * square index, so the pick is a pure function of the synced board. */
function nearestPreyToKing(api: BuffApi, count: number): Square[] {
  const prey = mySquares(api.board, api.opp).filter(
    (sq) => api.board.pieces[sq]!.type !== "k",
  );
  const k = mySquares(api.board, api.opp, "k")[0];
  return prey
    .map((sq) => ({ sq, d: k != null ? dist(sq, k) : 0 }))
    .sort((a, b) => a.d - b.d || a.sq - b.sq)
    .slice(0, count)
    .map((x) => x.sq);
}

/** Every empty square reachable from `from` along a straight line, sprinting
 * over any pieces in between (non-capturing). Pawns never land on rank 1 or 8. */
function dashDests(api: BuffApi, from: Square): Square[] {
  const out: Square[] = [];
  const isPawn = api.board.pieces[from]?.type === "p";
  for (const [df, dr] of ALL_DIRS) {
    let f = FILE(from) + df, r = RANK(from) + dr;
    while (inBoard(f, r)) {
      const sq = SQ(f, r);
      if (!api.board.pieces[sq] && (!isPawn || pawnRankOk(sq))) out.push(sq);
      f += df; r += dr;
    }
  }
  return out;
}

export const BRAINROT: Buff[] = [
  card(
    {
      id: "tung_tung_sahur",
      icon: "Drum",
      name: "Tung Tung Tung Sahur",
      description:
        "The drum-man marches on your opponent's king. On each of your next 5 turns, the two enemy pieces nearest their king are bonked and cannot move for their next 2 turns. Kings are too stubborn to bonk.",
      tier: 5,
      category: "tempo",
      flavor: "Tung tung tung tung tung tung tung tung tung sahur.",
    },
    // A relentless drumbeat: a passive that fires on the caster's own turns, so
    // the owner:opp stun it lays is not ticked away this cycle and holds through
    // the opponent's next two turns. Deterministic target (the two nearest to
    // the enemy king, ties broken by lowest square index), so it replays
    // identically on both clients.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.beats = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const left = (inst.state.beats as number) ?? 0;
        if (left <= 0) return;
        const hit = nearestPreyToKing(api, 2);
        if (hit.length) {
          for (const sq of hit) {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stun" });
          }
          addEffect(api, { kind: "bonk", squares: hit, owner: api.me, turns: 1 });
        }
        inst.state.beats = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.beats as number) ?? 0} drumbeats left`,
    },
  ),

  card(
    {
      id: "tralalero_dash",
      icon: "Footprints",
      name: "Tralalero Tralala",
      description:
        "The shark in sneakers sprints: choose one of your pieces except the king and dash it to any empty square along its rank, file, or diagonal, blurring straight past anything in the way. It is still moving so fast it cannot be captured for your opponent's next 2 turns. Once.",
      tier: 4,
      category: "movement",
      flavor: "Nike Air, straight through the traffic.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to dash",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && dashDests(api, sq).length > 0,
            ),
          };
        }
        if (picks.length === 1) {
          const from = picks[0].square;
          if (from == null) return null;
          return {
            kind: "square",
            label: "Dash to any empty square in a straight line",
            squares: dashDests(api, from),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        if (p && !api.board.pieces[to] && (p.type !== "p" || pawnRankOk(to))) {
          api.relocate(from, to);
          // The landing square is shielded: the square-shield rides the piece as
          // it moves (game.ts moves shield squares with the piece) and is
          // orphan-pruned if the piece is ever removed, so nothing lingers.
          addEffect(api, { kind: "shield", owner: api.me, squares: [to], turns: 2 });
        }
      },
    ),
  ),

  card(
    {
      id: "bombardiro_croc",
      icon: "Bomb",
      name: "Bombardiro Crocodilo",
      description:
        "The bomber-croc drops its payload on a square: every enemy piece except a king in the 5 by 5 area centred on it (that square and the 24 around it) is destroyed.",
      tier: 8,
      category: "attack",
      flavor: "Cleared for the run, no survivors below.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the square to bomb",
              squares: Array.from({ length: 64 }, (_, i) => i).filter((sq) =>
                blastHitsEnemy(api, sq, 2),
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const struck: Square[] = [];
        for (const sq of blastAt(c, 2)) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            api.removePiece(sq);
            struck.push(sq);
          }
        }
        if (struck.length) {
          addEffect(api, { kind: "strike", squares: struck, owner: api.me, turns: 1 });
        }
      },
    ),
  ),

  card(
    {
      id: "bombombini_gusini",
      icon: "Bird",
      name: "Bombombini Gusini",
      description:
        "The bomber-goose lobs a stun grenade on a square: every enemy piece except a king in the 5 by 5 area centred on it (that square and the 24 around it) is bonked and cannot move for their next 2 turns. Nobody is removed.",
      tier: 5,
      category: "tempo",
      flavor: "HONK. Everyone hits the deck.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the square to concuss",
              squares: Array.from({ length: 64 }, (_, i) => i).filter((sq) =>
                blastHitsEnemy(api, sq, 2),
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const hit: Square[] = [];
        for (const sq of blastAt(c, 2)) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stun" });
            hit.push(sq);
          }
        }
        if (hit.length) {
          addEffect(api, { kind: "bonk", squares: hit, owner: api.me, turns: 1 });
        }
      },
    ),
  ),

  card(
    {
      id: "lirili_larila",
      icon: "Clock",
      name: "Lirili Larila",
      description:
        "The cactus-elephant trades your afternoon for its hourglass: steal 45 seconds from your opponent's clock, but you skip your own next turn.",
      tier: 4,
      category: "tempo",
      flavor: "Is it later already? For you it is.",
    },
    // The self-skip reuses the same skip counter skipOpponent writes (aimed at
    // the owner); the clock steal is a no-op in an untimed game (the server
    // clamps it above the floor).
    instant((_inst, api) => {
      api.bs.skips[api.me] += 1;
      api.adjustClock({ stealFlatSec: 45, stealCapSec: 45 });
    }),
  ),

  card(
    {
      id: "brr_brr_patapim",
      icon: "Snowflake",
      name: "Brr Brr Patapim",
      description:
        "The cold finds whoever wanders alone: every enemy piece except the king with no friendly piece on any square beside it freezes solid for their next 2 turns.",
      tier: 6,
      category: "tempo",
      flavor: "Brr brr. Stay with the group.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      // Read the lonely set first, then freeze, so one freeze never changes
      // another piece's isolation check.
      const lonely: Square[] = [];
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        let hasFriend = false;
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const p = api.board.pieces[SQ(f, r)];
          if (p && p.color === api.opp) {
            hasFriend = true;
            break;
          }
        }
        if (!hasFriend) lonely.push(sq);
      }
      for (const sq of lonely) {
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
      }
    }),
  ),

  card(
    {
      id: "chimpanzini_bananini",
      icon: "Banana",
      name: "Chimpanzini Bananini",
      description:
        "The banana-monkey goes ape: for the game every one of your knights may also slide like a queen, keeping its knight leap on top.",
      // Every knight an amazon, permanently — that is Amazon Army power
      // (tier 8, knights AND bishops) minus the bishops. Tier 7, not the
      // laughable 3 it shipped at.
      tier: 7,
      category: "movement",
      requires: ["n"],
      flavor: "Peel, then unpeel the whole board.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "q", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id),
      ),
    ),
  ),

  card(
    {
      id: "boneca_ambalabu",
      icon: "LifeBuoy",
      name: "Boneca Ambalabu",
      description:
        "The tire-frog drags your opponent down: for their next 4 turns none of their pieces may move more than 1 square in a single move.",
      tier: 3,
      category: "hex",
      flavor: "Heavy is the tread that bears the frog.",
      fx: { motif: "anchor", pieces: "all" },
    },
    // curse() keeps the standard non-empty fallback (if every move is longer
    // than one square it lets them all through), and a king step is always
    // within one square, so the opponent can never be stranded.
    curse(4, (moves) => moves.filter((m) => dist(m.from, m.to) <= 1)),
  ),
];
