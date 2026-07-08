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
  slideMoves,
  timedAugment,
  ALL_DIRS,
  DIAG_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./funny/shared";

// --- Local geometry ---------------------------------------------------------

/** A center square plus its (up to) 8 neighbours, clipped to the board. */
function blastAt(center: Square): Square[] {
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      const f = FILE(center) + df, r = RANK(center) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  }
  return out;
}

/** True when the blast around `center` catches at least one enemy non-king. */
function blastHitsEnemy(api: BuffApi, center: Square): boolean {
  return blastAt(center).some((sq) => {
    const p = api.board.pieces[sq];
    return !!p && p.color === api.opp && p.type !== "k";
  });
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
        "The drum-man marches on your opponent's king. On each of your next 3 turns, the enemy piece nearest their king is bonked and cannot move on its next turn. Kings are too stubborn to bonk.",
      tier: 5,
      category: "tempo",
      flavor: "Tung tung tung tung tung tung tung tung tung sahur.",
    },
    // A relentless drumbeat: a passive that fires on the caster's own turns, so
    // the owner:opp stun it lays is not ticked away this cycle and holds through
    // the opponent's very next turn. Deterministic target (nearest to the enemy
    // king, ties broken by lowest square index), so it replays identically.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.beats = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const left = (inst.state.beats as number) ?? 0;
        if (left <= 0) return;
        const prey = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (prey.length) {
          const k = mySquares(api.board, api.opp, "k")[0];
          let best = prey[0];
          if (k != null) {
            let bestD = Infinity;
            for (const sq of prey) {
              const d = dist(sq, k);
              if (d < bestD || (d === bestD && sq < best)) {
                bestD = d;
                best = sq;
              }
            }
          }
          addEffect(api, { kind: "freeze", sq: best, owner: api.opp, turns: 1, skin: "stun" });
          addEffect(api, { kind: "bonk", squares: [best], owner: api.me, turns: 1 });
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
        "The shark in sneakers sprints: choose one of your pieces except the king and dash it to any empty square along its rank, file, or diagonal, blurring straight past anything in the way. Once.",
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
        "The bomber-croc drops its payload on a square: every enemy piece except a king on that square and the eight around it is destroyed.",
      tier: 6,
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
                blastHitsEnemy(api, sq),
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const struck: Square[] = [];
        for (const sq of blastAt(c)) {
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
        "The bomber-goose lobs a stun grenade on a square: every enemy piece except a king on that square and the eight around it is bonked and cannot move on its next turn. Nobody is removed.",
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
                blastHitsEnemy(api, sq),
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const hit: Square[] = [];
        for (const sq of blastAt(c)) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stun" });
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
        "The cactus-elephant checks its clock and stops time: your opponent skips their next turn, and their clock loses 20 seconds.",
      tier: 4,
      category: "tempo",
      flavor: "Is it later already? For you it is.",
    },
    // The skip reuses the same skip counter skipOpponent writes; the clock hit
    // is a no-op in an untimed game (the server clamps it above the floor).
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.adjustClock({ subOppSec: 20 });
    }),
  ),

  card(
    {
      id: "brr_brr_patapim",
      icon: "Snowflake",
      name: "Brr Brr Patapim",
      description:
        "A sudden cold snap: every enemy piece except the king freezes solid and cannot move on its next turn.",
      tier: 6,
      category: "tempo",
      flavor: "Brr brr. Someone left the window open.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(1, "ice"),
  ),

  card(
    {
      id: "chimpanzini_bananini",
      icon: "Banana",
      name: "Chimpanzini Bananini",
      description:
        "The banana-monkey goes ape: for your next 2 turns every one of your knights may also slide like a bishop.",
      tier: 5,
      category: "movement",
      requires: ["n"],
      flavor: "Peel, then unpeel the whole board.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true },
    },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, DIAG_DIRS, inst.id),
      ),
    ),
  ),

  card(
    {
      id: "boneca_ambalabu",
      icon: "LifeBuoy",
      name: "Boneca Ambalabu",
      description:
        "The tire-frog drags your opponent down: for their next 2 turns none of their pieces may move more than 2 squares in a single move.",
      tier: 3,
      category: "hex",
      flavor: "Heavy is the tread that bears the frog.",
      fx: { motif: "anchor", pieces: "all" },
    },
    // curse() keeps the standard non-empty fallback, and king/pawn steps are
    // always within 2 squares, so the opponent can never be stranded.
    curse(2, (moves) => moves.filter((m) => dist(m.from, m.to) <= 2)),
  ),
];
