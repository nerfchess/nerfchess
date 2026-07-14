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
  BuffPick,
  PieceType,
  Square,
  card,
  activated,
  activatedSimple,
  instant,
  addEffect,
  curse,
  dist,
  emptySquares,
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

// --- Meme-pack geometry & lookups (pure reads of the synced board) -----------

/** All 8 squares within a king-step of `sq` (clipped to the board). */
function ringAround(sq: Square): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of ALL_DIRS) {
    const f = FILE(sq) + df, r = RANK(sq) + dr;
    if (inBoard(f, r)) out.push(SQ(f, r));
  }
  return out;
}

/** The board's outer rim: every square on file a/h or rank 1/8. */
function onRim(sq: Square): boolean {
  return FILE(sq) === 0 || FILE(sq) === 7 || RANK(sq) === 0 || RANK(sq) === 7;
}

/** Enemy non-king squares, minus any already picked (multi-pick targeting). */
function enemyPrey(api: BuffApi, picks: BuffPick[]): Square[] {
  return mySquares(api.board, api.opp).filter(
    (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
  );
}

/** Classic-chess home squares for a piece of `type` owned by `color` standing
 * on `from` (a pawn's home is its own file's second rank; a rook/knight/bishop
 * may claim either of its two starting squares). Kings are never flushed. */
function homeSquares(type: PieceType, color: "w" | "b", from: Square): Square[] {
  const back = color === "w" ? 0 : 7;
  if (type === "p") return [SQ(FILE(from), color === "w" ? 1 : 6)];
  const files: Partial<Record<PieceType, number[]>> = {
    r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4],
  };
  return (files[type] ?? []).map((f) => SQ(f, back));
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
        "The shark in sneakers sprints: dash any piece except the king to an empty square along its rank, file, or diagonal, blurring straight past anything between. It moves so fast it cannot be captured for your opponent's next 2 turns. Once.",
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
      // Every knight an amazon, permanently, that is Amazon Army power
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

  // --- Meme pack (batch 2): brainrot legends + general memes -----------------

  card(
    {
      id: "cappuccino_assassino",
      icon: "Coffee",
      name: "Cappuccino Assassino",
      description:
        "The espresso assassin strikes before the foam settles: the enemy piece nearest your king (never their king) is destroyed, and the two enemy pieces nearest the scene of the crime are stunned for their next turn.",
      tier: 6,
      category: "attack",
      flavor: "Decaffeinated. Permanently.",
    },
    // Fully deterministic: nearest-to-my-king pick with lowest-square tiebreak
    // (a pure function of the synced board), then the two enemy non-kings
    // nearest the vacated square. Kings are never removed or stunned; the
    // owner:opp freeze added on my pick is not ticked this cycle, so it holds
    // through the opponent's next full turn (see the timing note up top).
    instant((_inst, api) => {
      const myKing = mySquares(api.board, api.me, "k")[0];
      if (myKing == null) return;
      const prey = enemyPrey(api, []);
      if (prey.length === 0) return;
      const mark = prey
        .map((sq) => ({ sq, d: dist(sq, myKing) }))
        .sort((a, b) => a.d - b.d || a.sq - b.sq)[0].sq;
      api.removePiece(mark);
      addEffect(api, { kind: "strike", squares: [mark], owner: api.me, turns: 1 });
      const witnesses = enemyPrey(api, [])
        .map((sq) => ({ sq, d: dist(sq, mark) }))
        .sort((a, b) => a.d - b.d || a.sq - b.sq)
        .slice(0, 2)
        .map((x) => x.sq);
      for (const sq of witnesses) {
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stun" });
      }
      if (witnesses.length) {
        addEffect(api, { kind: "bonk", squares: witnesses, owner: api.me, turns: 1 });
      }
    }),
  ),

  card(
    {
      id: "ballerina_cappuccina",
      icon: "Ribbon",
      name: "Ballerina Cappuccina",
      description:
        "The coffee-cup ballerina leads a formation twirl: choose one of your pieces (not the king) to step one square, then up to two allies that stood beside it may each step one square too. No captures, just choreography.",
      tier: 4,
      category: "tempo",
      flavor: "Plié, rond de jambe, checkmate threat.",
    },
    // A relocateMany-style alternating pick chain (piece, destination, ...)
    // restricted to king-steps. Allies must have started adjacent to the lead
    // dancer's ORIGINAL square, occupancy accounts for planned vacancies, and
    // pawns never land on ranks 1/8. Every completed pair is a full effect on
    // its own, so the player may stop after the lead's step (finishable).
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 6) return null;
        const froms = picks.filter((_, i) => i % 2 === 0).map((k) => k.square!);
        const tos = picks.filter((_, i) => i % 2 === 1).map((k) => k.square!);
        const destsFor = (from: Square, vacated: Square[]) =>
          ringAround(from).filter((sq) => {
            if (tos.includes(sq)) return false;
            if (api.board.pieces[from]!.type === "p" && !pawnRankOk(sq)) return false;
            if (vacated.includes(sq)) return true;
            return !api.board.pieces[sq];
          });
        if (picks.length % 2 === 0) {
          const anchor = froms[0];
          const squares = mySquares(api.board, api.me).filter((sq) => {
            const p = api.board.pieces[sq]!;
            if (p.type === "k" || froms.includes(sq) || tos.includes(sq)) return false;
            if (anchor != null && dist(sq, anchor) !== 1) return false;
            return destsFor(sq, froms).length > 0;
          });
          if (!squares.length && picks.length > 0) return null;
          return {
            kind: "square",
            label:
              picks.length === 0
                ? "Choose the lead dancer"
                : `Choose an adjacent ally to twirl (${froms.length}/3)`,
            squares,
            ...(picks.length > 0 ? { finishable: true } : {}),
          };
        }
        const from = froms[froms.length - 1];
        const squares = destsFor(from, froms.slice(0, -1));
        if (!squares.length) return null;
        return { kind: "square", label: "Choose its one-square step", squares };
      },
      (_inst, api, picks) => {
        for (let i = 0; i + 1 < picks.length; i += 2) {
          const from = picks[i].square, to = picks[i + 1].square;
          if (from == null || to == null || dist(from, to) !== 1) continue;
          const p = api.board.pieces[from];
          if (p && !api.board.pieces[to] && (p.type !== "p" || pawnRankOk(to))) {
            api.relocate(from, to);
          }
        }
      },
    ),
  ),

  card(
    {
      id: "la_vaca_saturno_saturnita",
      icon: "Satellite",
      name: "La Vaca Saturno Saturnita",
      description:
        "The ringed cow swings into orbit: place a new knight on any empty square along the board's outer rim. While it settles into orbit it cannot be captured for your opponent's next 2 turns.",
      tier: 7,
      category: "pieces",
      flavor: "Moo. (Heard from three planets away.)",
    },
    // Same summon-plus-shield shape as Tralalero's landing: the square shield
    // rides the knight as it moves (game.ts moves shield squares with the
    // piece) and is orphan-pruned if it is ever removed. The turn-consuming
    // activation gets the standard +1 shield bump so "2 turns" survives the
    // opponent's immediate reply.
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an empty rim square for the orbiting knight",
              squares: emptySquares(api.board, onRim),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !onRim(sq)) return;
        api.place(sq, "n", api.me);
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),

  card(
    {
      id: "frigo_camelo",
      icon: "AirVent",
      name: "Frigo Camelo",
      description:
        "The fridge-camel opens both doors: two of your pieces (never the king) are refrigerated — they cannot be captured for your opponent's next 2 turns, but each is frozen solid for 1 of your turns while it defrosts.",
      tier: 5,
      category: "protection",
      flavor: "Crisp. Chilled. Slightly humming.",
    },
    // Shield + self-freeze on the same square: the shield rides the piece and
    // is orphan-pruned; the owner:me freeze ticks after MY next move, so the
    // cold start costs exactly one of my turns per piece. Kings are never
    // refrigerated (never frozen), so my king's step always survives.
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose a piece to refrigerate (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" &&
                  !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const sq = k.square;
          if (sq == null || !api.board.pieces[sq]) continue;
          if (api.board.pieces[sq]!.color !== api.me) continue;
          if (api.board.pieces[sq]!.type === "k") continue;
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
          addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 1, skin: "ice" });
        }
      },
    ),
  ),

  card(
    {
      id: "trippi_troppi",
      // "Cat" is claimed by an earlier card in id order (haerin), so name the
      // fusion icon directly: Merge, for the shrimp+cat abomination splice.
      icon: "Merge",
      name: "Trippi Troppi",
      description:
        "The shrimp-cat scrambles their proprioception: up to 3 enemy pieces (never the king) grow stubby shrimp legs, and for their next 2 turns each can only shuffle one square at a time.",
      tier: 3,
      category: "hex",
      flavor: "Half shrimp. Half cat. Zero object permanence.",
    },
    // Three targeted walnuts (the engine's "heavy nut with 1-square legs"
    // effect): distinct from a freeze, the piece can still crawl a king-step.
    // Kings are never walnutted; finishable after the first leg-swap.
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to shrimp (${picks.length + 1}/3)`,
              squares: enemyPrey(api, picks),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const sq = k.square;
          if (sq == null || !api.board.pieces[sq]) continue;
          if (api.board.pieces[sq]!.color !== api.opp) continue;
          if (api.board.pieces[sq]!.type === "k") continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
        }
      },
    ),
  ),

  card(
    {
      id: "chill_guy",
      icon: "Dog",
      name: "Chill Guy",
      description:
        "He's just a chill guy: every freeze and every walnut currently stuck to YOUR pieces melts off, and you take 1 extra move. A free action — lowkey he doesn't even care.",
      tier: 2,
      category: "tempo",
      boon: true,
      flavor: "My honest reaction:",
    },
    // Cleanup + tempo, both through existing rails: in-place effect pruning of
    // my own freezes/walnuts (exactly what timers do when they expire) plus
    // the extraMoves counter the extra-move family already uses. Free action,
    // mirroring extraMovesNow, so playing it does not spend the turn.
    {
      ...activatedSimple((_inst, api) => {
        const fx = api.bs.effects;
        for (let i = fx.length - 1; i >= 0; i--) {
          const e = fx[i];
          if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me) {
            fx.splice(i, 1);
          }
        }
        api.bs.extraMoves[api.me] += 1;
      }),
      freeAction: true,
    },
  ),

  card(
    {
      id: "moai_head",
      icon: "Cuboid",
      name: "Moai Head",
      description:
        "A stone moai drops onto an empty square of your choice and just... stands there: for the next 4 turns of each side, NO piece from either side may move onto that square. Then it crumbles. It offers no further comment. 🗿",
      tier: 4,
      category: "protection",
      flavor: "🗿",
    },
    // Two mirrored `barred` effects (one per side) on the same square — the
    // exact primitive the wall/seal cards use, so all its rails apply: king
    // captures ignore the bar (winning stays possible), a single square is a
    // landing block (a slider may still slip PAST the monument — it is
    // surprisingly slim), and each side's bar ticks on that side's own moves,
    // so both get exactly 4 turns of stone-faced refusal.
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the moai lands",
              squares: emptySquares(api.board),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        addEffect(api, { kind: "barred", squares: [sq], against: api.me, turns: 4 });
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 4 });
      },
    ),
  ),

  card(
    {
      id: "skibidi_flush",
      icon: "Toilet",
      name: "Skibidi Flush",
      description:
        "The porcelain vortex opens: up to 3 chosen enemy pieces (never the king) are flushed back to their home squares — or, if home is taken, to the nearest empty square toward home. Nothing is captured; everything is humiliated.",
      tier: 5,
      category: "tempo",
      flavor: "Skibidi dop dop dop yes yes.",
    },
    // Pure non-capturing relocation via api.relocate. Deterministic routing:
    // the nearest of the piece's classic home squares (lowest square index on
    // ties), else the empty square minimizing distance-to-home (same
    // tiebreak). Processed in pick order against the live board, so earlier
    // flushes free up squares for later ones. Pawns keep pawnRankOk; a piece
    // already standing on a home square is left alone (no lateral shove).
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to flush (${picks.length + 1}/3)`,
              squares: enemyPrey(api, picks),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const from = k.square;
          if (from == null) continue;
          const p = api.board.pieces[from];
          if (!p || p.color !== api.opp || p.type === "k") continue;
          const homes = homeSquares(p.type, p.color, from);
          if (homes.length === 0 || homes.includes(from)) continue;
          const home = homes
            .map((sq) => ({ sq, d: dist(from, sq) }))
            .sort((a, b) => a.d - b.d || a.sq - b.sq)[0].sq;
          let dest: Square | null = null;
          if (!api.board.pieces[home] && (p.type !== "p" || pawnRankOk(home))) {
            dest = home;
          } else {
            const options = emptySquares(
              api.board,
              (sq) => sq !== from && (p.type !== "p" || pawnRankOk(sq)),
            )
              .map((sq) => ({ sq, d: dist(sq, home) }))
              .sort((a, b) => a.d - b.d || a.sq - b.sq);
            if (options.length && options[0].d < dist(from, home)) dest = options[0].sq;
          }
          if (dest != null && !api.board.pieces[dest]) api.relocate(from, dest);
        }
      },
    ),
  ),
];
