// ---------------------------------------------------------------------------
// TIER 9 (apex) and TIER 10 (mythic) - the two strongest bands in the game.
// Each apex card is nearly game-winning; each mythic card is close to ending
// the game outright (Annihilation wipes the enemy army, Grand Army summons a
// whole fresh force, Apotheosis turns your entire army into queens). Several
// apex cards double as a comeback lifeline for a player who is all but lost
// (they respawn a whole force onto the board).
//
// Neither tier is EVER offered by the normal draft. Every card here is flagged
// `special: true` (tier 9 apex or tier 10 mythic), which draft.ts excludes from
// every roll. The only ways to obtain one are the dedicated grants: the
// gambling "Jackpot" card and banking a draft while already at the top tier
// (see draft.ts / helpers.ts). Those grants roll a tier-9 card most of the
// time and a tier-10 card roughly one time in ten.
//
// Safety and determinism, same rails as the rest of the buff library:
//   - Kings are never frozen, walnutted, removed, or targeted. Annihilation
//     spares the king, so the opponent always keeps a movable lone king.
//   - No opponent-move filter is used, so no card can strand the opponent with
//     zero legal moves (a frozen army can still move its king; wiping enemy
//     pieces only frees up squares around their king, never traps it).
//   - Every random choice runs on the seeded api.rng (never Math.random), and
//     the one over-time hook (Purge) mirrors the proven Voodoo Doll pattern
//     (rng inside onMovePlayed is revealed via lastHookMutations and replays).
// ---------------------------------------------------------------------------

import { Buff, BuffApi, BuffCategory, CardFx } from "../buff";
import { FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";
import {
  ALL_DIRS,
  KNIGHT_LEAPS,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  bindCandidates,
  bindPiece,
  emptySquares,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  markRevived,
  mySquares,
  pawnRankOk,
  relRank,
  revivable,
  slideMoves,
  tickTurns,
  turnsLeft,
} from "./helpers";

/** Chance a single apex draw upgrades from a tier-9 card to a tier-10 mythic.
 * The ONE knob every apex grant shares: each slot of the bank-at-top offer,
 * the Jackpot gamble, and any future grant all roll this same gate, so "a
 * mythic replaces a tier 9 about one time in ten" holds everywhere. Lives here
 * (not draft.ts) so helpers.ts can import it without a dependency cycle. */
export const APEX_MYTHIC_CHANCE = 0.1;

type Meta = {
  id: string;
  name: string;
  description: string;
  category: BuffCategory;
  icon?: string;
  flavor?: string;
  requires?: PieceType[];
  fx?: CardFx;
};

type Mech = Partial<Buff> & Pick<Buff, "kind">;

/** Build a fully implemented apex card: always tier 9 and always special, so it
 * can only ever reach a hand through a dedicated grant. */
function apex(meta: Meta, mech: Mech): Buff {
  return { ...meta, tier: 9, special: true, implemented: true, ...mech };
}

/** Chebyshev (king-step) distance between two squares. */
function cheb(a: Square, b: Square): number {
  return Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));
}

/** Enemy pieces the queen on `from` can see: the first piece along each of the
 * eight queen rays, if it is an enemy non-king (pieces behind a blocker are
 * hidden). */
function queenVisibleEnemies(api: BuffApi, from: Square): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of ALL_DIRS) {
    let f = FILE(from) + df, r = RANK(from) + dr;
    while (inBoard(f, r)) {
      const sq = SQ(f, r);
      const p = api.board.pieces[sq];
      if (p) {
        if (p.color === api.opp && p.type !== "k") out.push(sq);
        break;
      }
      f += df; r += dr;
    }
  }
  return out;
}

/** Empty squares in my half, ordered from my back rank outward, so a respawn
 * fills the safest ranks first. */
function backfillSpots(api: BuffApi): Square[] {
  return emptySquares(api.board, (sq) => inHalf(api.me, sq)).sort(
    (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
  );
}

const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);

export const TIER9: Buff[] = [
  // --- Game-winning boons ---------------------------------------------------

  // Ice Age: the whole enemy army (kings excepted) freezes solid for 3 of the
  // opponent's turns. They can only shuffle their king while it thaws - trimmed
  // from 4 turns in the apex soft-nerf pass; three is still back-breaking.
  apex(
    {
      id: "ice_age",
      icon: "Snowflake",
      name: "Ice Age",
      description:
        "Every enemy piece other than the king freezes solid and cannot move for your opponent's next 3 turns.",
      category: "tempo",
      flavor: "The board holds its breath.",
      fx: { motif: "jail", pieces: "all" },
    },
    activatedSimple((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "ice" });
      }
    }),
  ),

  // Regicide: your queen appears right next to the enemy king, then locks in the
  // execution. She cannot be captured for the opponent's next 2 turns, and every
  // enemy piece touching the king (kings excepted) freezes for the same 2 turns,
  // so nothing can block or trade off the threat. The king itself stays free to
  // run, so the opponent is never stranded.
  apex(
    {
      id: "regicide",
      icon: "Crown",
      name: "Regicide",
      description:
        "Your queen teleports to an empty square next to the enemy king (or the nearest empty square to it) and cannot be captured for your opponent's next 2 turns. Every enemy piece beside the king freezes for those 2 turns.",
      category: "attack",
      requires: ["q"],
      flavor: "The court has reached a verdict.",
      fx: { motif: "empower", pieces: ["q"], self: true },
    },
    activatedSimple((_inst, api) => {
      const queen = mySquares(api.board, api.me, "q")[0];
      const king = mySquares(api.board, api.opp, "k")[0];
      if (queen == null || king == null) return;
      const empties = emptySquares(api.board).filter((sq) => sq !== queen);
      if (empties.length === 0) return;
      const adjacent = empties.filter((sq) => cheb(sq, king) === 1);
      const pool = adjacent.length > 0 ? adjacent : empties;
      // Deterministic: closest to the king, ties broken by lowest square index.
      const dest = pool.sort((a, b) => cheb(a, king) - cheb(b, king) || a - b)[0];
      if (dest == null) return;
      api.relocate(queen, dest);
      // The landed queen is untouchable for two of the opponent's turns.
      addEffect(api, { kind: "shield", owner: api.me, squares: [dest], turns: 2 });
      // Freeze the king's escort (never the king), so it cannot be defended.
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        if (cheb(sq, king) === 1) {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
        }
      }
    }),
  ),

  // Resurrection: your whole graveyard marches back. Every captured piece
  // (queen first, pawns last) returns to the board, filling your half from the
  // back rank outward and then spilling across the rest of the board if the
  // graveyard outgrows your own half. Nothing is left behind. The flagship
  // comeback card.
  apex(
    {
      id: "resurrection",
      icon: "Sparkles",
      name: "Resurrection",
      description:
        "Every piece your opponent has captured returns to the board, filling empty squares in your half from your back rank outward and spilling into the rest of the board if your half runs out of room.",
      category: "pieces",
      flavor: "Rise, and rise again.",
    },
    activatedSimple((_inst, api) => {
      const spots = backfillSpots(api);
      // Overflow: a graveyard larger than my half spills into every remaining
      // empty square, still ordered from my side outward, so a full revive is
      // never capped by how much room my own half happens to have.
      spots.push(
        ...emptySquares(api.board, (sq) => !inHalf(api.me, sq)).sort(
          (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
        ),
      );
      const order: PieceType[] = ["q", "r", "b", "n", "p"];
      for (const type of order) {
        let left = revivable(api, type);
        while (left > 0 && spots.length > 0) {
          const at = spots.findIndex((sq) => type !== "p" || pawnRankOk(sq));
          if (at < 0) break;
          const sq = spots.splice(at, 1)[0];
          api.place(sq, type, api.me);
          markRevived(api, type);
          left--;
        }
      }
    }),
  ),


  // Second Coming: a fresh queen descends onto a square you choose in your half,
  // and your whole army is untouchable for the opponent's next 2 turns - two
  // full turns to attack with total impunity while a brand-new queen joins in.
  apex(
    {
      id: "second_coming",
      icon: "Sparkle",
      name: "Second Coming",
      description:
        "Summon a queen on an empty square in your half, and your whole army cannot be captured for your opponent's next 2 turns.",
      category: "pieces",
      flavor: "Foretold, and right on time.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where your new queen descends",
              squares: emptySquares(api.board, myHalfZone(api)),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq != null && !api.board.pieces[sq]) api.place(sq, "q", api.me);
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      },
    ),
  ),

  // Iron Legion: a whole relief force marches in. Place a queen, a rook and two
  // knights on empty squares in your half - a full striking force, not just a
  // patch. A second comeback lifeline, now heavy enough to swing the game alone.
  apex(
    {
      id: "iron_legion",
      icon: "Castle",
      name: "Iron Legion",
      description:
        "A relief force arrives: place a queen, a rook and a knight on empty squares in your half.",
      category: "pieces",
      flavor: "Reinforcements, at last.",
    },
    placePieces(["q", "r", "n"], myHalfZone),
  ),

  // Living God: promoted from tier 8 into the apex band (owner request). One
  // of your pieces ascends for the game: amazon movement, permanently
  // uncapturable, and it detonates the surrounding ring whenever it captures.
  // Same rails as its tier-8 life: bindPiece never offers the king, the
  // permanent shield is the square-bound kind (it follows the piece), and the
  // engine's invulnerability guard means the god itself may never be the piece
  // that captures the enemy king.
  apex(
    {
      id: "living_god",
      icon: "Sparkles",
      name: "Living God",
      description:
        "One piece gains amazon movement and explosive captures for the game, and cannot be captured for your opponent's next 6 turns. An uncapturable piece may never capture the king itself.",
      category: "movement",
      flavor: "Worship is optional. Survival is not.",
      fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "q", self: true },
    },
    bindPiece("Choose your living god", bindCandidates(), {
      shieldTurns: 6,
      gen: (board, sq, via) => [
        ...slideMoves(board, sq, ALL_DIRS, via),
        ...leapMoves(board, sq, KNIGHT_LEAPS, via),
      ],
      explodeOnCapture: true,
    }),
  ),

  // --- Devastating hexes (cast on the opponent) -----------------------------

  // Blackout: the lights go out on your opponent for four whole turns - four free
  // moves in a row is enough to march a decisive attack home unopposed.
  apex(
    {
      id: "blackout",
      icon: "PowerOff",
      name: "Blackout",
      description: "The lights go out: your opponent's next 3 turns are skipped entirely.",
      category: "hex",
      flavor: "Nobody home.",
      fx: { motif: "slow", pieces: "all" },
    },
    activatedSimple((_inst, api) => {
      api.bs.skips[api.opp] += 3;
    }),
  ),

  // Mass Petrify: every enemy queen, rook, knight and bishop turns to stone (a
  // walnut) for 4 turns; a petrified piece can only shuffle a single square while
  // it lasts. Only the enemy pawns and king can still act, so the opponent's
  // whole heavy army is dead weight for four full turns - but the king stays
  // free, so they are never stranded.
  apex(
    {
      id: "mass_petrify",
      icon: "Gem",
      name: "Mass Petrify",
      description:
        "Every enemy queen, rook, knight and bishop turns to stone for your opponent's next 3 turns. A petrified piece may only shuffle one square.",
      category: "hex",
      flavor: "Do not meet its gaze.",
      fx: { motif: "jail", pieces: ["q", "r", "n", "b"] },
    },
    activatedSimple((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "q" || t === "r" || t === "n" || t === "b") {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
      }
    }),
  ),

  // Purge: at the start of each of your next 2 turns, a random enemy piece
  // (never the king) is dragged off the board. Held (spendOnUse:false) so it
  // can fire twice; it arms on use and retires when all purges are spent.
  // Two guaranteed removals still dismantles most defences.
  apex(
    {
      id: "culling",
      icon: "Skull",
      name: "The Culling",
      description:
        "At the start of each of your next 2 turns, a random enemy piece other than the king is captured.",
      category: "hex",
      flavor: "The list grows shorter.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst) => {
        // Arm the purge on use; onMovePlayed does the work over the next turns.
        if (inst.state.charges == null) inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        // Fire at the boundary before each of my turns (the opponent's move
        // just completed). Mirrors Voodoo Doll's rng-in-hook pattern.
        if (move.color !== api.opp) return;
        const targets = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (targets.length === 0) return;
        const victim = targets[api.rng.int(targets.length)];
        api.removePiece(victim);
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => {
        const c = (inst.state.charges as number) ?? 0;
        return c > 0 ? `${c} purge${c === 1 ? "" : "s"} left` : null;
      },
    },
  ),

  // Promoted from tier 8 (owner call): one queen deleting the entire enemy
  // army is apex-grade, not a normal draft pull.
  apex(
    {
      id: "queens_apocalypse",
      icon: "Siren",
      name: "Queen's Apocalypse",
      description:
        "Your queen wipes every enemy piece off the board except their king and queen, once. Requires a queen.",
      category: "attack",
      requires: ["q"],
      flavor: "She knocks once.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the queen who brings the apocalypse",
              squares: mySquares(api.board, api.me, "q"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t !== "k" && t !== "q") api.removePiece(sq);
        }
      },
    ),
  ),

  // Promoted from tier 8 (owner call): three permanent uncapturable amazons
  // belong in the apex band.
  apex(
    {
      id: "titan_legion",
      icon: "Pyramid",
      name: "Titan Legion",
      description: "Three of your pieces become amazons for the game, uncapturable for your opponent's next 5 turns.",
      category: "movement",
      flavor: "Monuments that march.",
      fx: { motif: "empower", pieces: ["p", "n", "b", "r", "q"], moveAs: "q", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: the titans are chosen once (re-activating would
      // also stack extra permanent shield effects).
      targets: (inst, api, picks) =>
        picks.length >= 3 || inst.state.sqs != null
          ? null
          : {
              kind: "square",
              label: `Choose a titan (${picks.length + 1}/3)`,
              squares: bindCandidates()(api).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sqs != null) return;
        const sqs = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (!sqs.length) return;
        inst.state.sqs = sqs;
        addEffect(api, { kind: "shield", owner: api.me, squares: [...sqs], turns: 5 });
      },
      augmentMoves: (moves, inst, api) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (!sqs?.length) return;
        for (const sq of sqs) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.me)
            addNovel(moves, [
              ...slideMoves(api.board, sq, ALL_DIRS, inst.id),
              ...leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id),
            ]);
        }
      },
      onMovePlayed: (inst, move) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (!sqs?.length) return;
        const next = sqs
          .map((sq) => {
            if (move.capturedSquare === sq && move.from !== sq) return null;
            if (move.from === sq) return move.to;
            if (move.to === sq && move.from !== sq) return null;
            return sq;
          })
          .filter((s): s is Square => s != null);
        inst.state.sqs = next;
        if (!next.length) inst.spent = true;
      },
      status: (inst) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (!sqs?.length) return "activate to choose three pieces";
        return `titans at ${sqs.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ")}`;
      },
    },
  ),
];

// ---------------------------------------------------------------------------
// TIER 10 - the mythic band, the apex above the apex. Each card is close to
// ending the game the moment it resolves. Like tier 9 these are `special` and
// never drafted; they arrive only through the same grants, roughly one time in
// ten in place of a tier-9 card (see grantRandomTier9 / the bank-at-top path).
// ---------------------------------------------------------------------------

/** Build a fully implemented mythic card: always tier 10 and always special, so
 * it can only ever reach a hand through a dedicated grant. */
function mythic(meta: Meta, mech: Mech): Buff {
  return { ...meta, tier: 10, special: true, implemented: true, ...mech };
}

/** Amazon movement (queen slides plus knight leaps) for one of my pieces. A pawn
 * empowered this way still promotes on the last rank -- both its slides and its
 * leaps to rank 8 expand into promotion moves -- so Ascendancy never strands a
 * pawn on the back rank. */
function amazonMoves(api: BuffApi, sq: Square, via: string): Move[] {
  const p = api.board.pieces[sq];
  if (!p) return [];
  const raw = [
    ...slideMoves(api.board, sq, ALL_DIRS, via),
    ...leapMoves(api.board, sq, KNIGHT_LEAPS, via),
  ];
  if (p.type !== "p") return raw;
  const out: Move[] = [
];
  for (const m of raw) {
    if (relRank(api.me, m.to) === 8) {
      for (const promo of ["q", "r", "b", "n"] as PieceType[]) out.push({ ...m, promotion: promo });
    } else {
      out.push(m);
    }
  }
  return out;
}

export const TIER10: Buff[] = [
  // Oblivion: the flagship mythic (the owner's "Annihilation" board-wipe; the
  // name "Annihilation" was already taken by a shipped tier-7 card, so this one
  // is Oblivion). Every enemy piece except the king is wiped from the board in
  // one stroke, leaving a lone king with nothing to hide behind. Removing enemy
  // pieces only opens squares around their king, so it can never strand them -
  // the king always keeps its moves.
  mythic(
    {
      id: "oblivion",
      icon: "Skull",
      name: "Oblivion",
      description:
        "Every one of your opponent's pieces except the king is destroyed, every piece you have ever lost returns to your half, and your whole army cannot be captured for your opponent's next turn. Only their lone king is left standing against your full force.",
      category: "attack",
      flavor: "Nothing left to defend. Everything left to lose.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activatedSimple((_inst, api) => {
      // Wipe the enemy army (never the king: removing pieces only frees squares
      // around their king, so it is never stranded).
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        api.removePiece(sq);
      }
      // Raise your entire graveyard back onto the board, filling your half from
      // the back rank outward and spilling across the board if it overflows.
      const spots = backfillSpots(api);
      spots.push(
        ...emptySquares(api.board, (sq) => !inHalf(api.me, sq)).sort(
          (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
        ),
      );
      const order: PieceType[] = ["q", "r", "b", "n", "p"];
      for (const type of order) {
        let left = revivable(api, type);
        while (left > 0 && spots.length > 0) {
          const at = spots.findIndex((sq) => type !== "p" || pawnRankOk(sq));
          if (at < 0) break;
          const sq = spots.splice(at, 1)[0];
          api.place(sq, type, api.me);
          markRevived(api, type);
          left--;
        }
      }
      // And nothing can touch you while you close it out.
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),

  // Grand Army: a whole fresh force materializes - a new queen, two rooks, two
  // bishops and two knights - filling your half from the back rank outward and
  // spilling onto the rest of the board only if your half runs out of room. An
  // instant, overwhelming reset of material.
  mythic(
    {
      id: "grand_army",
      icon: "Castle",
      name: "Grand Army",
      description:
        "A whole fresh army answers your call: a new queen, two rooks, two bishops and two knights appear on empty squares in your half, and every remaining empty square in your half fills with a new pawn. It spills onto the rest of the board only if your half runs out of room.",
      category: "pieces",
      flavor: "Rank upon rank upon rank, out of nowhere.",
    },
    activatedSimple((_inst, api) => {
      const spots = backfillSpots(api);
      spots.push(
        ...emptySquares(api.board, (sq) => !inHalf(api.me, sq)).sort(
          (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
        ),
      );
      // Seat the heavy force first (no pawn-rank guard needed for these).
      const force: PieceType[] = ["q", "r", "r", "b", "b", "n", "n"];
      for (const type of force) {
        const sq = spots.shift();
        if (sq == null) break;
        api.place(sq, type, api.me);
      }
      // Then flood the remaining legal squares of YOUR HALF with fresh pawns
      // (the heavy force may spill past the river, the pawn tide never does).
      for (const sq of spots) {
        if (pawnRankOk(sq) && inHalf(api.me, sq)) api.place(sq, "p", api.me);
      }
    }),
  ),

  // Ascendancy: your entire army ascends (the owner's "every piece moves as a
  // queen" card; named Ascendancy because "Apotheosis" was already taken). For
  // your next 3 turns every one of your pieces except the king moves and
  // captures as a queen. Held (spendOnUse:false) so the grant persists across
  // the reign; it ticks itself down on your turns and retires when it ends.
  // Kings keep their own moves.
  mythic(
    {
      id: "ascendancy",
      icon: "Crown",
      name: "Ascendancy",
      description:
        "For your next 3 turns every one of your pieces except the king moves and captures as an amazon (a queen that also leaps like a knight), and your king cannot be captured.",
      category: "movement",
      flavor: "Ascend, all of you.",
      fx: { motif: "empower", pieces: "all", moveAs: "q", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      effect: (inst, api) => {
        // One activation only; re-use is a guarded no-op.
        if (inst.state.turns != null) return;
        inst.state.turns = 3;
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
      },
      augmentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0) return;
        for (const sq of mySquares(api.board, api.me)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          addNovel(moves, amazonMoves(api, sq, inst.id));
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.turns == null) return;
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.turns == null
          ? "activate: your whole army moves as amazons"
          : `ascendant: ${turnsLeft(inst)} of your turns left`,
    },
  ),

  // Total War: the single most decisive card in the game. The enemy army is
  // wiped to a lone king, a whole fresh force materializes on your side, and
  // nothing you own can be captured for three turns. Same rails as the rest of
  // the mythic band: the enemy king is never removed (clearing pieces only opens
  // squares around it) and no opponent-move filter is used, so it can never be
  // stranded with zero legal moves.
  mythic(
    {
      id: "total_war",
      icon: "Swords",
      name: "Total War",
      description:
        "Every enemy piece except the king is destroyed, a fresh force of a queen, two rooks, two bishops and two knights lands in your half, and your whole army cannot be captured for your opponent's next turn.",
      category: "attack",
      flavor: "Everything, everywhere, all at once.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activatedSimple((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        api.removePiece(sq);
      }
      const spots = backfillSpots(api);
      spots.push(
        ...emptySquares(api.board, (sq) => !inHalf(api.me, sq)).sort(
          (a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b,
        ),
      );
      const force: PieceType[] = ["q", "r", "r", "b", "b", "n", "n"];
      for (const type of force) {
        const sq = spots.shift();
        if (sq == null) break;
        api.place(sq, type, api.me);
      }
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),
];
