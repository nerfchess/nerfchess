// Boon wave 4 (overhaul): 300 new boons for nerf mode's self-relief and
// light-support pool, tiers 38/38/38/38/37/37/37/37. Ids bn4_*.
//
// Composition: roughly a third are category "nerf" relief cards (soften,
// suspend or interact with YOUR OWN nerf via nerf_suspended effects with
// varied durations, triggers and conditions, the boons2/boons3 idiom), and
// two thirds are `boon: true` light general-support cards (small summons,
// tiny revives, one-shot movement gifts, modest shields, scouting, draft
// perks, delayed gifts, gentle cosmetic jokes). Boon-flagged cards also
// appear in buff mode, so their text is mode-agnostic and never mentions
// nerfs; ONLY the category "nerf" cards may talk about your nerf.
//
// Every mechanic rides EXISTING engine rails: ActiveEffect kinds, DraftFlags,
// the BuffApi mutators, augmentMoves / filterOpponentMoves / onMovePlayed,
// the revive pools, the crazyhouse pocket and the clock intent (clock effects
// are deliberately small and rare: time is garnish, never the prize). All
// randomness draws from api.rng inside effect paths only. Kings are never
// removed, frozen or transformed. Tiers 5-8 live in boons4b.ts (imported
// here); library.ts spreads BOON_WAVE4 into ALL_BUFFS.
//
// Import paths are relative (not the "@/" alias): tsconfig.server.json does
// not resolve the alias, and the engine must build for the server tests.

import { isInCheck } from "../board";
import { Buff, BuffApi, BuffInstance, CardFx } from "../buff";
import { Tier } from "../nerf";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";
import {
  ALL_DIRS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  augment,
  emptySquares,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  markRevived,
  mySquares,
  oppFilter,
  pawnRankOk,
  captureSquare,
  phasingSlideMoves,
  relRank,
  reviveOne,
  revivable,
  relocateMany,
  shieldZone,
  teleportMoves,
  timedAugment,
  timedOppFilter,
} from "./helpers";
import {
  advanceablePawns,
  advancePawn,
  attackersOf,
  flashSquares,
  kingSquare,
  pinCosmetic,
  undefendedPieces,
} from "./overhaul/shared";
import { BOON_WAVE4B } from "./boons4b";

// --- Local plumbing ----------------------------------------------------------

type Meta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: Buff["category"];
  icon?: string;
  flavor?: string;
  fx?: CardFx;
  requires?: PieceType[];
};

type Mech = Partial<Buff> & Pick<Buff, "kind">;

/** Build a wave-4 card. Category "nerf" cards are boons implicitly (isBoon);
 * everything else is stamped `boon: true` so it joins nerf mode's boon pool
 * (and, being mode-agnostic, buff mode's general pool too). */
function card(meta: Meta, mech: Mech): Buff {
  return {
    ...meta,
    ...(meta.category === "nerf" ? {} : { boon: true }),
    implemented: true,
    ...mech,
  };
}

/** Add a nerf_suspended effect for `turns` of `owner`'s turns. */
function susp(api: BuffApi, turns: number, owner?: Color) {
  addEffect(api, { kind: "nerf_suspended", owner: owner ?? api.me, turns });
}

/** Instant: suspend my nerf for `n` turns, with an optional rider. */
function suspendNow(n: number, rider?: (api: BuffApi) => void): Mech {
  return instant((_inst, api) => {
    susp(api, n);
    rider?.(api);
  });
}

/** Free action: suspend my nerf for `n` turns at the moment of my choosing. */
function suspendFree(n: number, rider?: (api: BuffApi) => void): Mech {
  return {
    ...activatedSimple((_inst, api) => {
      susp(api, n);
      rider?.(api);
    }),
    freeAction: true,
  };
}

/** Charge-limited triggered relief: when `when` fires, suspend for `turns`. */
function reliefOn(
  charges: number,
  turns: number,
  when: (move: Move, api: BuffApi) => boolean,
  noun: string,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    onMovePlayed: (inst, move, api) => {
      const left = (inst.state.charges as number) ?? 0;
      if (left <= 0 || !when(move, api)) return;
      susp(api, turns);
      inst.state.charges = left - 1;
      if (left - 1 <= 0) inst.spent = true;
    },
    status: (inst) => `${(inst.state.charges as number) ?? charges} ${noun} left`,
  };
}

/** Unlimited triggered relief: every time `when` fires, suspend for `turns`. */
function reliefEvery(
  turns: number,
  when: (move: Move, api: BuffApi) => boolean,
  note: string,
): Mech {
  return {
    kind: "passive",
    onMovePlayed: (_inst, move, api) => {
      if (when(move, api)) susp(api, turns);
    },
    status: () => note,
  };
}

/** Conditional continuous relief: after each opponent move, if `cond` holds,
 * refresh a `turns`-turn suspension (the underdogs_grit idiom). */
function reliefWhile(cond: (api: BuffApi) => boolean, note: string, turns = 1): Mech {
  return {
    kind: "passive",
    init: (_inst, api) => {
      if (cond(api)) susp(api, turns);
    },
    onMovePlayed: (_inst, move, api) => {
      if (move.color !== api.opp || !cond(api)) return;
      susp(api, turns);
    },
    status: () => note,
  };
}

/** Delayed relief: after `delay` of my turns, suspend for `grant` turns. */
function reliefAfter(delay: number, grant: number): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = delay;
    },
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me) return;
      const t = ((inst.state.turns as number) ?? delay) - 1;
      inst.state.turns = t;
      if (t <= 0) {
        susp(api, grant);
        inst.spent = true;
      }
    },
    status: (inst) => `${(inst.state.turns as number) ?? delay} of your turns until relief`,
  };
}

/** Activated: shield one of my non-king pieces for `turns` (null = forever). */
function shieldOne(turns: number | null, label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          },
    (_inst, api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null) return;
      const p = api.board.pieces[sq];
      if (!p || p.color !== api.me || p.type === "k") return;
      addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns });
    },
  );
}

/** Squares adjacent to `sq` (chebyshev distance 1). */
function adjSquares(sq: Square): Square[] {
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = FILE(sq) + df, r = RANK(sq) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  }
  return out;
}

/** Non-king piece count for `color`. */
function armySize(board: BoardState, color: Color): number {
  let n = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (p && p.color === color && p.type !== "k") n++;
  }
  return n;
}

/** First empty square scanning outward from `color`'s home rank (the shared
 * boons2/boons3 auto-placement scan; deterministic pure board read). */
function autoPlace(api: BuffApi, color: Color, type: PieceType): Square | null {
  for (let i = 0; i < 8; i++) {
    const r = color === "w" ? i : 7 - i;
    for (let f = 0; f < 8; f++) {
      const sq = SQ(f, r);
      if (api.board.pieces[sq]) continue;
      if (type === "p" && !pawnRankOk(sq)) continue;
      return sq;
    }
  }
  return null;
}

/** Remove every freeze/walnut binding MY pieces (optionally one square). */
function thawMine(api: BuffApi, sq?: Square) {
  const fx = api.bs.effects;
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i];
    if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me) {
      if (sq == null || e.sq === sq) fx.splice(i, 1);
    }
  }
}

/** My currently frozen (or walnutted) squares. */
function frozenMine(api: BuffApi): Square[] {
  const out: Square[] = [];
  for (const e of api.bs.effects) {
    if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me && e.turns > 0) {
      if (!out.includes(e.sq)) out.push(e.sq);
    }
  }
  return out;
}

/** A castling move (the king's two-file slide). */
function isCastle(m: Move): boolean {
  return m.piece === "k" && Math.abs(FILE(m.to) - FILE(m.from)) === 2;
}

/** The last move the opponent completed (pure history read). */
function lastOppMove(api: BuffApi): Move | null {
  const hist = api.board.history;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].color === api.opp) return hist[i];
  }
  return null;
}

/** Never strand the opponent with zero legal moves. */
function nonEmpty(kept: Move[], all: Move[]): Move[] {
  return kept.length > 0 ? kept : all;
}

/** Rank index of `color`'s Nth rank from its own side (0 = back rank). */
function ownRank(color: Color, n: number): number {
  return color === "w" ? n : 7 - n;
}

const myHalf = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);

// ---------------------------------------------------------------------------
// Tiers 1-4 (152 cards). Tiers 5-8 live in boons4b.ts.
// ---------------------------------------------------------------------------

const BOON_WAVE4A: Buff[] = [
  // ===== TIER 1 ==============================================================
  // --- relief (13) ---

  card(
    { id: "bn4_morning_stretch", name: "Morning Stretch", tier: 1, category: "nerf", icon: "Sunrise",
      description: "Suspend your nerf for your next turn, and gain 1 draft reroll.",
      flavor: "Crack the knuckles. Reconsider everything." },
    suspendNow(1, (api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_first_light", name: "First Light", tier: 1, category: "nerf", icon: "Sun",
      description: "The first capture you make suspends your nerf for your next 2 turns.",
      flavor: "One clean cut and the morning opens." },
    reliefOn(1, 2, (m, api) => m.color === api.me && !!m.captured && m.captured !== "k", "dawn"),
  ),
  card(
    { id: "bn4_kind_omen", name: "Kind Omen", tier: 1, category: "nerf", icon: "Bird",
      description: "The first time your opponent captures one of your pieces, your nerf is suspended for your next 2 turns.",
      flavor: "The sparrow watched the whole thing and disagreed." },
    reliefOn(1, 2, (m, api) => m.color === api.opp && !!m.captured && m.captured !== "k", "omens"),
  ),
  card(
    { id: "bn4_pawns_lullaby", name: "Pawn's Lullaby", tier: 1, category: "nerf", icon: "Music",
      description: "The next 2 times you move a pawn, your nerf is suspended for your next turn.",
      flavor: "Small steps, soft song.", requires: ["p"] },
    reliefOn(2, 1, (m, api) => m.color === api.me && m.piece === "p", "verses"),
  ),
  card(
    { id: "bn4_castle_quiet", name: "Castle Quiet", tier: 1, category: "nerf", icon: "Castle",
      description: "When you castle, your nerf is suspended for your next 3 turns.",
      flavor: "Thick walls. Thicker silence." },
    reliefOn(1, 3, (m, api) => m.color === api.me && isCastle(m), "castlings"),
  ),
  card(
    { id: "bn4_two_breaths", name: "Two Breaths", tier: 1, category: "nerf", icon: "Wind",
      description: "Suspend your nerf for your next turn, and again for one more turn after your next 3 turns.",
      flavor: "In. Out. Later: in again." },
    {
      kind: "passive",
      init: (inst, api) => {
        susp(api, 1);
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 3) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          susp(api, 1);
          inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 3} turns to the second breath`,
    },
  ),
  card(
    { id: "bn4_quiet_after", name: "The Quiet After", tier: 1, category: "nerf", icon: "CloudRain",
      description: "While your queen is off the board, your nerf is suspended.",
      flavor: "Grief keeps its own kind of order." },
    reliefWhile((api) => mySquares(api.board, api.me, "q").length === 0, "waiting on the quiet"),
  ),
  card(
    { id: "bn4_third_wind", name: "Third Wind", tier: 1, category: "nerf", icon: "Hourglass",
      description: "After your next 6 turns, your nerf is suspended for the 3 turns that follow.",
      flavor: "Not the second wind. The one after, that nobody trains for." },
    reliefAfter(6, 3),
  ),
  card(
    { id: "bn4_small_ritual", name: "Small Ritual", tier: 1, category: "nerf", icon: "Flame",
      description: "The next 3 times you move your king, your nerf is suspended for your next turn.",
      flavor: "One step, one candle." },
    reliefOn(3, 1, (m, api) => m.color === api.me && m.piece === "k", "rites"),
  ),
  card(
    { id: "bn4_grace_note", name: "Grace Note", tier: 1, category: "nerf", icon: "Feather",
      description: "Free action: suspend your nerf for your next turn and gain 5 seconds on your clock, used at the moment you choose.",
      flavor: "A tiny ornament, played exactly on time." },
    suspendFree(1, (api) => api.adjustClock({ addSelfSec: 5 })),
  ),
  card(
    { id: "bn4_shared_silence", name: "Shared Silence", tier: 1, category: "nerf", icon: "Handshake",
      description: "Both players' nerfs are suspended for their next turn.",
      flavor: "Neither of you mentions it. It is nicer that way." },
    instant((_inst, api) => {
      susp(api, 1);
      susp(api, 1, api.opp);
    }),
  ),
  card(
    { id: "bn4_check_valve", name: "Check Valve", tier: 1, category: "nerf", icon: "ShieldAlert",
      description: "The next 2 times your king is put in check, your nerf is suspended for your next turn.",
      flavor: "Pressure goes in. Pressure comes right back out." },
    reliefOn(2, 1, (m, api) => m.color === api.opp && isInCheck(api.board, api.me), "valves"),
  ),
  card(
    { id: "bn4_promise_of_rest", name: "Promise of Rest", tier: 1, category: "nerf", icon: "Tent",
      description: "The first time one of your pieces crosses into your opponent's half, your nerf is suspended for your next 2 turns.",
      flavor: "March far enough and the load lightens." },
    reliefOn(
      1, 2,
      (m, api) => m.color === api.me && inHalf(api.me, m.from) && !inHalf(api.me, m.to),
      "promises",
    ),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_side_shuffle", name: "Side Shuffle", tier: 1, category: "movement", icon: "MoveHorizontal",
      description: "Once, one of your pawns may step one square sideways onto an empty square.",
      flavor: "Technically forward, spiritually.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        for (const df of [-1, 1]) {
          const f = FILE(from) + df;
          if (!inBoard(f, RANK(from))) continue;
          const to = SQ(f, RANK(from));
          if (!api.board.pieces[to]) out.push(...teleportMoves(api.board, from, [to], inst.id));
        }
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_tiptoe", name: "Tiptoe", tier: 1, category: "movement", icon: "Footprints",
      description: "Once, your king may move two squares in a straight line, if both squares are empty.",
      flavor: "Shh. He is being stealthy. Everyone can see him.",
      fx: { motif: "empower", pieces: ["k"], self: true } },
    augment((_moves, inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return [];
      const out: Move[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f1 = FILE(ks) + df, r1 = RANK(ks) + dr;
        const f2 = FILE(ks) + 2 * df, r2 = RANK(ks) + 2 * dr;
        if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
        if (api.board.pieces[SQ(f1, r1)] || api.board.pieces[SQ(f2, r2)]) continue;
        out.push(...teleportMoves(api.board, ks, [SQ(f2, r2)], inst.id));
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_half_step_back", name: "Half Step Back", tier: 1, category: "movement", icon: "Undo2",
      description: "Once, one of your pawns may retreat one square straight back onto an empty square (never onto your back rank).",
      flavor: "Retreat is just an advance that respects itself.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const back = api.me === "w" ? -1 : 1;
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        const r = RANK(from) + back;
        if (!inBoard(FILE(from), r)) continue;
        const to = SQ(FILE(from), r);
        if (!api.board.pieces[to] && pawnRankOk(to)) {
          out.push(...teleportMoves(api.board, from, [to], inst.id));
        }
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_knights_errand", name: "Knight's Errand", tier: 1, category: "movement", icon: "Compass",
      description: "Once, one of your knights may move a single square in any direction (capturing allowed).",
      flavor: "Even the cavalry runs small errands.", requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true } },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "n")) {
        out.push(...leapMoves(api.board, from, ALL_DIRS, inst.id));
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_bishops_stroll", name: "Bishop's Stroll", tier: 1, category: "movement", icon: "Church",
      description: "Once, one of your bishops may step a single square straight up, down, left or right (capturing allowed), changing the color of its world forever.",
      flavor: "The other diagonal, at last.", requires: ["b"],
      fx: { motif: "empower", pieces: ["b"], moveAs: "k", self: true } },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "b")) {
        out.push(...leapMoves(api.board, from, ORTHO_DIRS, inst.id));
      }
      return out;
    }, 1),
  ),

  // --- pieces (5) ---

  card(
    { id: "bn4_spare_button", name: "Spare Button", tier: 1, category: "pieces", icon: "CircleDot",
      description: "A pawn slips into your pocket, ready to be dropped onto an empty square on a later turn (the drop spends that turn).",
      flavor: "Every good coat keeps one." },
    instant((_inst, api) => grantInventory(api, "p", 1)),
  ),
  card(
    { id: "bn4_field_stitches", name: "Field Stitches", tier: 1, category: "pieces", icon: "Slice",
      description: "Return one of your captured pawns to an empty square on your second rank.",
      flavor: "Not pretty. Holds." },
    reviveOne(["p"], (api) => (sq) => RANK(sq) === ownRank(api.me, 1)),
  ),
  card(
    { id: "bn4_day_laborer", name: "Day Laborer", tier: 1, category: "pieces", icon: "Hammer",
      description: "Place a pawn on an empty square in your half. It works 5 of your turns, then leaves the board.",
      flavor: "Paid by the hour, gone by dusk." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the laborer stands",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 5, then: "remove" });
      },
    ),
  ),
  card(
    { id: "bn4_understudy", name: "Understudy", tier: 1, category: "pieces", icon: "Drama",
      description: "The first time one of your pawns is captured, a fresh pawn joins your pocket, ready to drop on a later turn.",
      flavor: "Someone always knows the lines.", requires: ["p"] },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp || move.captured !== "p") return;
        grantInventory(api, "p", 1);
        inst.spent = true;
      },
      status: () => "waiting in the wings",
    },
  ),
  card(
    { id: "bn4_parade_polish", name: "Parade Polish", tier: 1, category: "pieces", icon: "Sparkles",
      description: "Gild one of your pieces (your king excepted): it wears the shine for the rest of the game and cannot be captured on your opponent's next turn.",
      flavor: "Morale is 90 percent lacquer." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to polish",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        pinCosmetic(api, sq, api.me, "gilded");
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 1 });
      },
    ),
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_pocket_shield", name: "Pocket Shield", tier: 1, category: "protection", icon: "Shield",
      description: "One of your pieces (your king excepted) cannot be captured for your opponent's next 2 turns.",
      flavor: "Fits in one hand. Stops one disaster." },
    shieldOne(2, "Choose the piece to shield"),
  ),
  card(
    { id: "bn4_pawn_umbrella", name: "Pawn Umbrella", tier: 1, category: "protection", icon: "Umbrella",
      description: "None of your pawns can be captured on your opponent's next turn.",
      flavor: "Light drizzle of bishops expected.", requires: ["p"],
      fx: { motif: "ward", pieces: ["p"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 1),
  ),
  card(
    { id: "bn4_doorstop", name: "Doorstop", tier: 1, category: "protection", icon: "DoorClosed",
      description: "Choose an empty square beside your king: no enemy piece may move onto it for 3 turns.",
      flavor: "The humblest guard in the castle." },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const ks = kingSquare(api.board, api.me);
        return {
          kind: "square",
          label: "Choose the doorway to block",
          squares: ks == null ? [] : adjSquares(ks).filter((s) => !api.board.pieces[s]),
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 3 });
      },
    ),
  ),
  card(
    { id: "bn4_night_watch", name: "Night Watch", tier: 1, category: "protection", icon: "Moon",
      description: "Your king cannot be captured on your opponent's next turn.",
      flavor: "One lantern, one spear, one very long night.",
      fx: { motif: "ward", pieces: ["k"], self: true } },
    instant((_inst, api) => addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 })),
  ),
  card(
    { id: "bn4_garden_fence", name: "Garden Fence", tier: 1, category: "protection", icon: "Fence",
      description: "For your opponent's next 2 turns, they cannot capture your pawns standing in your half of the board.",
      flavor: "Keep off the cabbages.", requires: ["p"],
      fx: { motif: "ward", pieces: ["p"], self: true } },
    timedOppFilter(2, (moves, _inst, api) =>
      moves.filter((m) => {
        const cs = captureSquare(m);
        if (cs == null) return true;
        const p = api.board.pieces[cs];
        return !(p && p.color === api.me && p.type === "p" && inHalf(api.me, cs));
      }),
    ),
  ),

  // --- tempo (4) ---

  card(
    { id: "bn4_pinch_of_sand", name: "Pinch of Sand", tier: 1, category: "tempo", icon: "Timer",
      description: "Add 10 seconds to your clock. In untimed games it adds nothing.",
      flavor: "Borrowed from the top half of the hourglass." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 10 })),
  ),
  card(
    { id: "bn4_muddy_boots", name: "Muddy Boots", tier: 1, category: "tempo", icon: "CloudDrizzle",
      description: "Your opponent's pawns cannot advance on their next turn.",
      flavor: "It rained on exactly half the board.",
      fx: { motif: "slow", pieces: ["p"] } },
    instant((_inst, api) => addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 1 })),
  ),
  card(
    { id: "bn4_shoelace_knot", name: "Shoelace Knot", tier: 1, category: "tempo", icon: "Link",
      description: "Tie one enemy pawn's laces together: it cannot move on your opponent's next turn.",
      flavor: "The oldest trick, still undefeated." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy pawn to hobble",
              squares: mySquares(api.board, api.opp, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type !== "p") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "glue" });
      },
    ),
  ),
  card(
    { id: "bn4_stutter_step", name: "Stutter Step", tier: 1, category: "tempo", icon: "Repeat",
      description: "On your opponent's next turn, they cannot move the piece they just moved.",
      flavor: "Lost the rhythm. Never had it, arguably.",
      fx: { motif: "slow", pieces: "all" } },
    timedOppFilter(1, (moves, _inst, api) => {
      const last = lastOppMove(api);
      if (!last) return moves;
      return moves.filter((m) => m.from !== last.to);
    }),
  ),

  // --- info (2) ---

  card(
    { id: "bn4_hairline_crack", name: "Hairline Crack", tier: 1, category: "info", icon: "SearchCheck",
      description: "Every one of your pieces that no other piece of yours defends lights up until your opponent replies.",
      flavor: "Know where you are thin before someone else does." },
    instant((_inst, api) => flashSquares(api, undefendedPieces(api.board, api.me))),
  ),
  card(
    { id: "bn4_watchmans_lantern", name: "Watchman's Lantern", tier: 1, category: "info", icon: "Lamp",
      description: "Every enemy piece currently aiming at your king lights up until your opponent replies.",
      flavor: "The light does not stop them. It does spoil the surprise." },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks != null) flashSquares(api, attackersOf(api.board, api.opp, ks));
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_lucky_coin", name: "Lucky Coin", tier: 1, category: "draft", icon: "Coins",
      description: "Gain 1 draft reroll.",
      flavor: "Heads you reroll, tails you reroll." },
    instant((_inst, api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_window_shopping", name: "Window Shopping", tier: 1, category: "draft", icon: "Store",
      description: "See the cards in your opponent's next draft offer.",
      flavor: "Looking is free. Judging is also free." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_gum_drop", name: "Gum Drop", tier: 1, category: "item", icon: "Candy",
      description: "Drop chewing gum under one enemy knight, bishop, rook or queen: it is stuck fast on your opponent's next turn.",
      flavor: "Five-second rule does not apply to cavalry." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece that steps in it",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t !== "k" && t !== "p";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k" || p.type === "p") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "gum" });
      },
    ),
  ),
  card(
    { id: "bn4_paper_crown", name: "Paper Crown", tier: 1, category: "item", icon: "Crown",
      description: "Your king wears a splendid paper crown for the rest of the game (purely decorative), and you gain 1 draft reroll.",
      flavor: "From the finest cereal box in the kingdom." },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks != null) pinCosmetic(api, ks, api.me, "hat", null, "Paper Crown");
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),

  // ===== TIER 2 ==============================================================
  // --- relief (13) ---

  card(
    { id: "bn4_steady_hands", name: "Steady Hands", tier: 2, category: "nerf", icon: "Hand",
      description: "Suspend your nerf for your next 2 turns, and none of your pawns can be captured on your opponent's next turn.",
      flavor: "Breathe out before the stitch, not during." },
    suspendNow(2, (api) => {
      const pawns = mySquares(api.board, api.me, "p");
      if (pawns.length) addEffect(api, { kind: "shield", owner: api.me, squares: pawns, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_trophy_rest", name: "Trophy Rest", tier: 2, category: "nerf", icon: "Trophy",
      description: "The next 2 times you capture a knight, bishop, rook or queen, your nerf is suspended for your next 2 turns.",
      flavor: "Big game earns a long sit by the fire." },
    reliefOn(
      2, 2,
      (m, api) => m.color === api.me && !!m.captured && m.captured !== "k" && m.captured !== "p",
      "trophies",
    ),
  ),
  card(
    { id: "bn4_dowagers_patience", name: "Dowager's Patience", tier: 2, category: "nerf", icon: "Armchair",
      description: "While your opponent has a queen on the board and you do not, your nerf is suspended.",
      flavor: "She has outlasted worse than this." },
    reliefWhile(
      (api) =>
        mySquares(api.board, api.me, "q").length === 0 &&
        mySquares(api.board, api.opp, "q").length > 0,
      "watching the thrones",
    ),
  ),
  card(
    { id: "bn4_measured_breath", name: "Measured Breath", tier: 2, category: "nerf", icon: "Waves",
      description: "Free action: suspend your nerf for your next 2 turns and gain 1 draft reroll, used at the moment you choose.",
      flavor: "Four counts in, four counts out, one better card." },
    suspendFree(2, (api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_saints_day", name: "Saint's Day", tier: 2, category: "nerf", icon: "CalendarHeart",
      description: "After your next 4 turns, your nerf is suspended for the 4 turns that follow.",
      flavor: "The feast is marked on the calendar. The calendar is law." },
    reliefAfter(4, 4),
  ),
  card(
    { id: "bn4_barter_calm", name: "Bartered Calm", tier: 2, category: "nerf", icon: "Scale",
      description: "Suspend your nerf for your next 4 turns. In exchange, your next draft is skipped.",
      flavor: "Peace, sold by the pound." },
    suspendNow(4, (api) => {
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_knights_vigil", name: "Knight's Vigil", tier: 2, category: "nerf", icon: "Sword",
      description: "The next 3 times you move a knight, your nerf is suspended for your next turn.",
      flavor: "The horse keeps watch so you can rest.", requires: ["n"] },
    reliefOn(3, 1, (m, api) => m.color === api.me && m.piece === "n", "vigils"),
  ),
  card(
    { id: "bn4_over_the_wall", name: "Over the Wall", tier: 2, category: "nerf", icon: "BrickWall",
      description: "The next 2 times one of your pieces reaches your opponent's back two ranks, your nerf is suspended for your next 2 turns.",
      flavor: "The air is better on their side. Less regulation." },
    reliefOn(2, 2, (m, api) => m.color === api.me && relRank(api.me, m.to) >= 7, "climbs"),
  ),
  card(
    { id: "bn4_crowned_calm", name: "Crowned Calm", tier: 2, category: "nerf", icon: "Gem",
      description: "The first time one of your pawns promotes, your nerf is suspended for your next 4 turns.",
      flavor: "Coronations put everything else on hold.", requires: ["p"] },
    reliefOn(1, 4, (m, api) => m.color === api.me && !!m.promotion, "coronations"),
  ),
  card(
    { id: "bn4_angelus_bell", name: "Angelus Bell", tier: 2, category: "nerf", icon: "Bell",
      description: "Every 5th move you make, the bell tolls: your nerf is suspended for your next turn. Lasts the rest of the game.",
      flavor: "You can set your suffering by it." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.count = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const c = (((inst.state.count as number) ?? 0) + 1) % 5;
        inst.state.count = c;
        if (c === 0) susp(api, 1);
      },
      status: (inst) => `${5 - ((inst.state.count as number) ?? 0)} moves to the bell`,
    },
  ),
  card(
    { id: "bn4_spring_in_the_step", name: "Spring in the Step", tier: 2, category: "nerf", icon: "Rabbit",
      description: "Suspend your nerf for your next 2 turns, and your most advanced pawn immediately steps one square forward if the way is clear.",
      flavor: "Lighter load, longer stride." },
    suspendNow(2, (api) => {
      const fwd = api.me === "w" ? 1 : -1;
      const pawns = mySquares(api.board, api.me, "p")
        .sort((a, b) => relRank(api.me, b) - relRank(api.me, a) || a - b);
      for (const from of pawns) {
        const r = RANK(from) + fwd;
        if (!inBoard(FILE(from), r)) continue;
        const to = SQ(FILE(from), r);
        if (api.board.pieces[to] || !pawnRankOk(to)) continue;
        api.relocate(from, to);
        break;
      }
    }),
  ),
  card(
    { id: "bn4_cold_compress", name: "Cold Compress", tier: 2, category: "nerf", icon: "Snowflake",
      description: "The next 2 times your opponent captures one of your pieces, your nerf is suspended for your next 2 turns.",
      flavor: "For the swelling. There is always swelling." },
    reliefOn(2, 2, (m, api) => m.color === api.opp && !!m.captured && m.captured !== "k", "compresses"),
  ),
  card(
    { id: "bn4_hermits_hour", name: "Hermit's Hour", tier: 2, category: "nerf", icon: "Mountain",
      description: "Spend your turn in retreat: your nerf is suspended for your next 4 turns.",
      flavor: "The cave charges by the hour. Worth it." },
    activatedSimple((_inst, api) => susp(api, 4)),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_ferry_ticket", name: "Ferry Ticket", tier: 2, category: "movement", icon: "Ship",
      description: "Once, one of your pawns may cross to any empty square on the rank it stands on.",
      flavor: "One passenger. No horses. Horses tip the boat.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        const dests: Square[] = [];
        for (let f = 0; f < 8; f++) {
          const to = SQ(f, RANK(from));
          if (to !== from && !api.board.pieces[to]) dests.push(to);
        }
        out.push(...teleportMoves(api.board, from, dests, inst.id));
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_gate_key", name: "Gate Key", tier: 2, category: "movement", icon: "Key",
      description: "Once, one of your rooks may step a single square diagonally (capturing allowed).",
      flavor: "Every tower keeps a key to the door it pretends not to have.", requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], moveAs: "b", self: true } },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "r")) {
        out.push(...leapMoves(api.board, from, [[1, 1], [1, -1], [-1, 1], [-1, -1]], inst.id));
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_vaulting_pole", name: "Vaulting Pole", tier: 2, category: "movement", icon: "Wand",
      description: "Once, one of your pawns may vault straight over a piece directly ahead of it, landing on the empty square beyond (never onto the final rank).",
      flavor: "Regulation height. Unregulated courage.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const fwd = api.me === "w" ? 1 : -1;
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        const midR = RANK(from) + fwd, toR = RANK(from) + 2 * fwd;
        if (!inBoard(FILE(from), toR)) continue;
        const mid = SQ(FILE(from), midR), to = SQ(FILE(from), toR);
        if (!api.board.pieces[mid] || api.board.pieces[to] || !pawnRankOk(to)) continue;
        out.push(...teleportMoves(api.board, from, [to], inst.id));
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_royal_stroll", name: "Royal Stroll", tier: 2, category: "movement", icon: "PersonStanding",
      description: "For your next 2 turns, your king may move two squares in a straight line, if both squares are empty.",
      flavor: "Constitutionals are constitutional.",
      fx: { motif: "empower", pieces: ["k"], self: true } },
    timedAugment(2, (_moves, inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return [];
      const out: Move[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f1 = FILE(ks) + df, r1 = RANK(ks) + dr;
        const f2 = FILE(ks) + 2 * df, r2 = RANK(ks) + 2 * dr;
        if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
        if (api.board.pieces[SQ(f1, r1)] || api.board.pieces[SQ(f2, r2)]) continue;
        out.push(...teleportMoves(api.board, ks, [SQ(f2, r2)], inst.id));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_wheelbarrow", name: "Wheelbarrow", tier: 2, category: "movement", icon: "ShoppingCart",
      description: "Two of your pieces standing side by side (kings excepted) swap squares. Pawns cannot be wheeled onto a first or last rank.",
      flavor: "Load, lift, deposit. Do not ask who pushes." },
    activated(
      (_inst, api, picks) => {
        const mine = (sq: Square) => {
          const p = api.board.pieces[sq];
          return !!p && p.color === api.me && p.type !== "k";
        };
        const canStand = (sq: Square, t: PieceType) => t !== "p" || pawnRankOk(sq);
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the first piece",
            squares: mySquares(api.board, api.me).filter(
              (sq) =>
                mine(sq) &&
                adjSquares(sq).some(
                  (o) =>
                    mine(o) &&
                    canStand(o, api.board.pieces[sq]!.type) &&
                    canStand(sq, api.board.pieces[o]!.type),
                ),
            ),
          };
        }
        const first = picks[0].square!;
        return {
          kind: "square",
          label: "Choose its neighbor to swap with",
          squares: adjSquares(first).filter(
            (o) =>
              mine(o) &&
              canStand(o, api.board.pieces[first]!.type) &&
              canStand(first, api.board.pieces[o]!.type),
          ),
        };
      },
      (_inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null || a === b) return;
        const pa = api.board.pieces[a], pb = api.board.pieces[b];
        if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) return;
        if (pa.type === "k" || pb.type === "k") return;
        if (pa.type === "p" && !pawnRankOk(b)) return;
        if (pb.type === "p" && !pawnRankOk(a)) return;
        const ta = pa.type;
        api.setPieceType(a, pb.type);
        api.setPieceType(b, ta);
      },
    ),
  ),

  // --- pieces (5) ---

  card(
    { id: "bn4_stowaway", name: "Stowaway", tier: 2, category: "pieces", icon: "Package",
      description: "After your next 5 turns, a pawn is discovered aboard and joins your pocket, ready to drop on a later turn.",
      flavor: "Been in the flour barrel since move two." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 5) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          grantInventory(api, "p", 1);
          inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 5} turns until discovery`,
    },
  ),
  card(
    { id: "bn4_militia_call", name: "Militia Call", tier: 2, category: "pieces", icon: "Megaphone",
      description: "Place a new pawn on an empty square on your second rank.",
      flavor: "Bring your own pitchfork. Helmet provided." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Muster the militia pawn",
              squares: emptySquares(api.board, (sq) => RANK(sq) === ownRank(api.me, 1)),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
      },
    ),
  ),
  card(
    { id: "bn4_cobblers_bench", name: "Cobbler's Bench", tier: 2, category: "pieces", icon: "Wrench",
      description: "Return one of your captured pawns to any empty square in your half.",
      flavor: "Resoled, restitched, back on the road." },
    reviveOne(["p"], myHalf),
  ),
  card(
    { id: "bn4_green_recruit", name: "Green Recruit", tier: 2, category: "pieces", icon: "Sprout",
      description: "Place a new pawn on an empty square in your half. It spends its first 2 of your turns rooted in place learning the drills, then serves normally.",
      flavor: "Knows three formations. Two are 'stand still'." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the training ground",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 2, skin: "roots" });
      },
    ),
  ),
  card(
    { id: "bn4_promotion_paperwork", name: "Promotion Paperwork", tier: 2, category: "pieces", icon: "FileText",
      description: "The next 2 times one of your pawns reaches your opponent's back two ranks, it cannot be captured on your opponent's next turn while the papers are stamped.",
      flavor: "The bureaucracy protects its own applicants.", requires: ["p"],
      fx: { motif: "ward", pieces: ["p"], self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.me || move.piece !== "p") return;
        if (relRank(api.me, move.to) < 7) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [move.to], turns: 1 });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} stamps left`,
    },
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_quilted_armor", name: "Quilted Armor", tier: 2, category: "protection", icon: "Shirt",
      description: "One of your pieces (your king excepted) cannot be captured for your opponent's next 3 turns.",
      flavor: "Grandmother-grade protection." },
    shieldOne(3, "Choose the piece to quilt"),
  ),
  card(
    { id: "bn4_hearth_ring", name: "Hearth Ring", tier: 2, category: "protection", icon: "Flame",
      description: "Every one of your pieces standing beside your king cannot be captured for your opponent's next 2 turns.",
      flavor: "Nobody fights well with cold hands.",
      fx: { motif: "ward", pieces: "all", self: true } },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return;
      const squares = adjSquares(ks).filter((s) => {
        const p = api.board.pieces[s];
        return !!p && p.color === api.me;
      });
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
    }),
  ),
  card(
    { id: "bn4_boundary_stones", name: "Boundary Stones", tier: 2, category: "protection", icon: "Landmark",
      description: "Mark 2 empty squares in your half: no enemy piece may move onto them for 4 turns.",
      flavor: "Older than the kingdom. Grumpier, too." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Place a boundary stone (${picks.length + 1}/2)`,
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null && !api.board.pieces[s]);
        if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
      },
    ),
  ),
  card(
    { id: "bn4_rook_nest", name: "Rook's Nest", tier: 2, category: "protection", icon: "Home",
      description: "Your rooks cannot be captured for your opponent's next 2 turns.",
      flavor: "Do not disturb. Sticks everywhere.", requires: ["r"],
      fx: { motif: "ward", pieces: ["r"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "r"), 2),
  ),
  card(
    { id: "bn4_thorn_hedge", name: "Thorn Hedge", tier: 2, category: "protection", icon: "Flower2",
      description: "For your opponent's next 4 turns, their knights cannot move into your half of the board.",
      flavor: "Horses have strong opinions about brambles.",
      fx: { motif: "blindfold", pieces: ["n"] } },
    timedOppFilter(4, (moves, _inst, api) =>
      moves.filter((m) => !(m.piece === "n" && inHalf(api.me, m.to))),
    ),
  ),

  // --- tempo (4) ---

  card(
    { id: "bn4_egg_timer", name: "Egg Timer", tier: 2, category: "tempo", icon: "Timer",
      description: "Add 15 seconds to your clock. In untimed games it adds nothing.",
      flavor: "Soft-boiled decisions take three minutes. You get fifteen seconds." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 15 })),
  ),
  card(
    { id: "bn4_slow_doors", name: "Slow Doors", tier: 2, category: "tempo", icon: "DoorOpen",
      description: "Your opponent's pawns cannot advance for their next 2 turns.",
      flavor: "After you. No, after you. No, after you.",
      fx: { motif: "slow", pieces: ["p"] } },
    instant((_inst, api) => addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 2 })),
  ),
  card(
    { id: "bn4_sleepy_dust", name: "Sleepy Dust", tier: 2, category: "tempo", icon: "MoonStar",
      description: "Sprinkle sleep over one enemy piece (their king excepted): it dozes through your opponent's next turn.",
      flavor: "Straight from the sandman's coat pocket." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to lull",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "sleep" });
      },
    ),
  ),
  card(
    { id: "bn4_puddle_freeze", name: "Puddle Freeze", tier: 2, category: "tempo", icon: "CloudSnow",
      description: "Two enemy pawns of your choice are frozen in place for your opponent's next turn.",
      flavor: "Winter came for exactly two squares." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose an enemy pawn to ice (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.opp, "p").filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.opp || p.type !== "p") continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "ice" });
        }
      },
    ),
  ),

  // --- info (2) ---

  card(
    { id: "bn4_field_glasses", name: "Field Glasses", tier: 2, category: "info", icon: "Binoculars",
      description: "Every enemy piece currently standing in your half of the board lights up until your opponent replies.",
      flavor: "Count them twice. They multiply when unobserved." },
    instant((_inst, api) =>
      flashSquares(api, mySquares(api.board, api.opp).filter((sq) => inHalf(api.me, sq))),
    ),
  ),
  card(
    { id: "bn4_ear_to_the_ground", name: "Ear to the Ground", tier: 2, category: "info", icon: "Ear",
      description: "Learn the tier of your opponent's next draft offer, and gain 1 draft reroll.",
      flavor: "The floorboards gossip terribly." },
    instant((_inst, api) => {
      api.mine.flags.seeOppTier = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_coupon_book", name: "Coupon Book", tier: 2, category: "draft", icon: "Ticket",
      description: "Your next draft offer rolls one tier higher. The redemption fee is one of your rerolls, if you have any.",
      flavor: "Some restrictions apply. All restrictions apply." },
    instant((_inst, api) => {
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    }),
  ),
  card(
    { id: "bn4_punch_card", name: "Punch Card", tier: 2, category: "draft", icon: "CreditCard",
      description: "Gain 2 draft rerolls.",
      flavor: "Buy nine rerolls, the tenth regret is free." },
    instant((_inst, api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_warm_soup", name: "Warm Soup", tier: 2, category: "item", icon: "Soup",
      description: "Thaw one of your pieces that is frozen or stuck: it can move again on your next turn.",
      flavor: "Cures frostbite, glue, webs and most opinions." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the piece to warm up", squares: frozenMine(api) },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        thawMine(api, sq);
      },
    ),
  ),
  card(
    { id: "bn4_rubber_duck", name: "Rubber Duck", tier: 2, category: "item", icon: "Bath",
      description: "One of your pieces (your king excepted) becomes delightfully plush for the rest of the game (purely decorative) and cannot be captured for your opponent's next 2 turns.",
      flavor: "Explain your plan to it. It already knows the refutation." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to squeak",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        pinCosmetic(api, sq, api.me, "plush");
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),

  // ===== TIER 3 ==============================================================
  // --- relief (13) ---

  card(
    { id: "bn4_clerical_error", name: "Clerical Error", tier: 3, category: "nerf", icon: "FileX",
      description: "Your handicap's paperwork is misfiled: your nerf is suspended for your next 3 turns, and your next draft shows three cards.",
      flavor: "Stamped, filed, and mercifully lost." },
    suspendNow(3, (api) => {
      api.mine.flags.prepThree = true;
    }),
  ),
  card(
    { id: "bn4_sparring_rhythm", name: "Sparring Rhythm", tier: 3, category: "nerf", icon: "Zap",
      description: "The next 2 times you put your opponent's king in check, your nerf is suspended for your next 2 turns.",
      flavor: "Jab, jab, breathe." },
    reliefOn(2, 2, (m, api) => m.color === api.me && isInCheck(api.board, api.opp), "flurries"),
  ),
  card(
    { id: "bn4_lone_crown", name: "Lone Crown", tier: 3, category: "nerf", icon: "Crown",
      description: "While no piece of yours stands beside your king, your nerf is suspended.",
      flavor: "Solitude has its privileges." },
    reliefWhile((api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return false;
      return !adjSquares(ks).some((s) => {
        const p = api.board.pieces[s];
        return !!p && p.color === api.me;
      });
    }, "watching the king's company"),
  ),
  card(
    { id: "bn4_forty_winks", name: "Forty Winks", tier: 3, category: "nerf", icon: "BedDouble",
      description: "After your next 3 turns, your nerf is suspended for the 5 turns that follow.",
      flavor: "Do not wake it. It wakes itself, ravenous." },
    reliefAfter(3, 5),
  ),
  card(
    { id: "bn4_bribe_the_clerk", name: "Bribe the Clerk", tier: 3, category: "nerf", icon: "Wallet",
      description: "Suspend your nerf for your next 5 turns. The clerk pockets one of your draft rerolls, if you have any.",
      flavor: "Everything is negotiable before lunch." },
    suspendNow(5, (api) => {
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    }),
  ),
  card(
    { id: "bn4_pawns_ransom", name: "Pawn's Ransom", tier: 3, category: "nerf", icon: "HandCoins",
      description: "Give up one of your pawns (it is removed and truly lost): your nerf is suspended for your next 7 turns.",
      flavor: "Somebody always pays. Today it is the little one.", requires: ["p"] },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn paid in ransom",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        api.removePiece(sq);
        susp(api, 7);
      },
    ),
  ),
  card(
    { id: "bn4_bread_and_salt", name: "Bread and Salt", tier: 3, category: "nerf", icon: "Wheat",
      description: "The next 3 times your opponent captures one of your pawns, your nerf is suspended for your next 2 turns.",
      flavor: "Hospitality for the grieving, by ancient custom.", requires: ["p"] },
    reliefOn(3, 2, (m, api) => m.color === api.opp && m.captured === "p", "loaves"),
  ),
  card(
    { id: "bn4_second_skin", name: "Second Skin", tier: 3, category: "nerf", icon: "Layers",
      description: "The next 4 times your opponent captures one of your knights or bishops, your nerf is suspended for your next 2 turns.",
      flavor: "It grows back tougher. That is the whole trick." },
    reliefOn(
      4, 2,
      (m, api) => m.color === api.opp && (m.captured === "n" || m.captured === "b"),
      "moltings",
    ),
  ),
  card(
    { id: "bn4_glass_of_water", name: "Glass of Water", tier: 3, category: "nerf", icon: "GlassWater",
      description: "Free action: suspend your nerf for your next 3 turns, used at the moment you choose.",
      flavor: "The oldest medicine. Still on the formulary." },
    suspendFree(3),
  ),
  card(
    { id: "bn4_bottom_of_the_well", name: "Bottom of the Well", tier: 3, category: "nerf", icon: "ArrowDownCircle",
      description: "While your opponent has at least two more pieces than you (kings aside), your nerf is suspended.",
      flavor: "From down here, the only direction is generous." },
    reliefWhile(
      (api) => armySize(api.board, api.opp) - armySize(api.board, api.me) >= 2,
      "measuring the deficit",
    ),
  ),
  card(
    { id: "bn4_hush_money", name: "Hush Money", tier: 3, category: "nerf", icon: "BadgeDollarSign",
      description: "Your next 2 captures each suspend your nerf for your next 2 turns.",
      flavor: "Paid in full, in silence." },
    reliefOn(2, 2, (m, api) => m.color === api.me && !!m.captured && m.captured !== "k", "payments"),
  ),
  card(
    { id: "bn4_rest_stop", name: "Rest Stop", tier: 3, category: "nerf", icon: "ParkingCircle",
      description: "Suspend your nerf for your next 2 turns, and none of your pieces can be captured on your opponent's next turn.",
      flavor: "Stretch the legs. Count the rooks. All present." },
    suspendNow(2, (api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_slipped_collar", name: "Slipped Collar", tier: 3, category: "nerf", icon: "Unlink",
      description: "The first time your opponent captures your queen, your nerf is suspended for your next 8 turns.",
      flavor: "Grief loosens every knot.", requires: ["q"] },
    reliefOn(1, 8, (m, api) => m.color === api.opp && m.captured === "q", "collars"),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_dressage", name: "Dressage", tier: 3, category: "movement", icon: "Medal",
      description: "For your next 2 turns, your knights may also step one square diagonally (capturing allowed).",
      flavor: "Elegance is a weapon with better posture.", requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true } },
    timedAugment(2, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "n")) {
        out.push(...leapMoves(api.board, from, [[1, 1], [1, -1], [-1, 1], [-1, -1]], inst.id));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_over_the_hedge", name: "Over the Hedge", tier: 3, category: "movement", icon: "Shrub",
      description: "Lift one of your pieces (your king excepted) over whatever stands in the way, to any empty square within two squares of it. Pawns cannot land on a first or last rank.",
      flavor: "The hedge has opinions. Overrule them." },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const dests = (from: Square) =>
          adjSquares(from)
            .flatMap((s) => [s, ...adjSquares(s)])
            .filter(
              (s, i, arr) =>
                arr.indexOf(s) === i &&
                s !== from &&
                !api.board.pieces[s] &&
                (api.board.pieces[from]!.type !== "p" || pawnRankOk(s)),
            );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece to lift",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && dests(sq).length > 0,
            ),
          };
        }
        return { kind: "square", label: "Choose where it lands", squares: dests(picks[0].square!) };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || from === to) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.me || p.type === "k" || api.board.pieces[to]) return;
        const d = Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));
        if (d > 2) return;
        if (p.type === "p" && !pawnRankOk(to)) return;
        api.relocate(from, to);
      },
    ),
  ),
  card(
    { id: "bn4_leapfrog", name: "Leapfrog", tier: 3, category: "movement", icon: "Squirrel",
      description: "Once, one of your pawns may hop diagonally forward over an adjacent piece, landing on the empty square beyond (never onto the final rank).",
      flavor: "A dignified military maneuver, honest.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const fwd = api.me === "w" ? 1 : -1;
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        for (const df of [-1, 1]) {
          const mf = FILE(from) + df, mr = RANK(from) + fwd;
          const tf = FILE(from) + 2 * df, tr = RANK(from) + 2 * fwd;
          if (!inBoard(mf, mr) || !inBoard(tf, tr)) continue;
          const mid = SQ(mf, mr), to = SQ(tf, tr);
          if (!api.board.pieces[mid] || api.board.pieces[to] || !pawnRankOk(to)) continue;
          out.push(...teleportMoves(api.board, from, [to], inst.id));
        }
      }
      return out;
    }, 1),
  ),
  card(
    { id: "bn4_forward_banners", name: "Forward Banners", tier: 3, category: "movement", icon: "Flag",
      description: "Up to three of your pawns each immediately advance one square, wherever the square ahead is empty.",
      flavor: "Three flags up. The whole field notices.", requires: ["p"],
      fx: { motif: "rally", pieces: ["p"], self: true } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose a pawn to advance (${picks.length + 1}/3)`,
              squares: advanceablePawns(api).filter((sq) => !picks.some((k) => k.square === sq)),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square != null) advancePawn(api, k.square);
        }
      },
    ),
  ),
  card(
    { id: "bn4_causeway", name: "Causeway", tier: 3, category: "movement", icon: "Route",
      description: "For your next 2 turns, your rooks may slide straight through your own pieces (never capturing them) to any empty square beyond.",
      flavor: "The engineers raised the road right over the camp.", requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], moveAs: "r", self: true } },
    timedAugment(2, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "r")) {
        out.push(...phasingSlideMoves(api.board, from, ORTHO_DIRS, inst.id, 8));
      }
      return out;
    }),
  ),

  // --- pieces (5) ---

  card(
    { id: "bn4_twin_buttons", name: "Twin Buttons", tier: 3, category: "pieces", icon: "CircleDashed",
      description: "Two pawns slip into your pocket, ready to be dropped onto empty squares on later turns (each drop spends that turn).",
      flavor: "They came off the same coat. They stay together." },
    instant((_inst, api) => grantInventory(api, "p", 2)),
  ),
  card(
    { id: "bn4_florists_trick", name: "Florist's Trick", tier: 3, category: "pieces", icon: "Flower",
      description: "Return one of your captured pawns to an empty square on your fourth rank, already halfway down the road.",
      flavor: "Cut stems root faster than anyone admits." },
    reviveOne(["p"], (api) => (sq) => RANK(sq) === ownRank(api.me, 3)),
  ),
  card(
    { id: "bn4_night_gardener", name: "Night Gardener", tier: 3, category: "pieces", icon: "Leaf",
      description: "The next 2 of your pawns that are captured each return at once to the empty square nearest your home rank.",
      flavor: "What is buried in the evening is up by morning.", requires: ["p"] },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.opp || move.captured !== "p") return;
        const sq = autoPlace(api, api.me, "p");
        if (sq == null) return;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} replantings left`,
    },
  ),
  card(
    { id: "bn4_pawnbrokers_deal", name: "Pawnbroker's Deal", tier: 3, category: "pieces", icon: "Store",
      description: "Hand one of your pawns over the counter (it is removed and truly lost): a knight joins your pocket, ready to drop on a later turn.",
      flavor: "Terrible rates. Wonderful merchandise.", requires: ["p"] },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to trade in",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        api.removePiece(sq);
        grantInventory(api, "n", 1);
      },
    ),
  ),
  card(
    { id: "bn4_matryoshka_surprise", name: "Matryoshka Surprise", tier: 3, category: "pieces", icon: "Egg",
      description: "Paint one of your pawns as a nesting doll. When it is captured, two smaller pawns pop out into your pocket, ready to drop on later turns.",
      flavor: "There is always one more inside. That is the law of dolls.", requires: ["p"] },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the doll pawn",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        inst.state.sq = sq;
        pinCosmetic(api, sq, api.me, "matryoshka");
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        const died =
          (move.capturedSquare === sq && move.from !== sq) ||
          (move.to === sq && move.from !== sq);
        if (died) {
          grantInventory(api, "p", 2);
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to choose the doll"
          : `doll at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_visor_down", name: "Visor Down", tier: 3, category: "protection", icon: "HardHat",
      description: "The two squares diagonally ahead of your king are barred to enemy pieces for 4 turns.",
      flavor: "Vision narrows. Confidence soars." },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return;
      const fwd = api.me === "w" ? 1 : -1;
      const squares: Square[] = [];
      for (const df of [-1, 1]) {
        const f = FILE(ks) + df, r = RANK(ks) + fwd;
        if (inBoard(f, r)) squares.push(SQ(f, r));
      }
      if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),
  card(
    { id: "bn4_rampart_watch", name: "Rampart Watch", tier: 3, category: "protection", icon: "TowerControl",
      description: "None of your pieces standing on your second rank can be captured for your opponent's next 2 turns.",
      flavor: "The wall walk is staffed and grumbling.",
      fx: { motif: "ward", pieces: "all", self: true } },
    shieldZone(
      (api) => mySquares(api.board, api.me).filter((sq) => RANK(sq) === ownRank(api.me, 1)),
      2,
    ),
  ),
  card(
    { id: "bn4_royal_taster", name: "Royal Taster", tier: 3, category: "protection", icon: "Utensils",
      description: "Your queen cannot be captured for your opponent's next 2 turns.",
      flavor: "Somebody checks every square before she stands on it.", requires: ["q"],
      fx: { motif: "ward", pieces: ["q"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "q"), 2),
  ),
  card(
    { id: "bn4_charm_bracelet", name: "Charm Bracelet", tier: 3, category: "protection", icon: "Link2",
      description: "Two of your pieces of your choice (your king excepted) cannot be captured for your opponent's next 2 turns.",
      flavor: "One charm per catastrophe. Choose the catastrophes." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose a piece to charm (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => {
            if (s == null) return false;
            const p = api.board.pieces[s];
            return !!p && p.color === api.me && p.type !== "k";
          });
        if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
      },
    ),
  ),
  card(
    { id: "bn4_beetle_shell", name: "Beetle Shell", tier: 3, category: "protection", icon: "Bug",
      description: "Your knights and bishops cannot be captured on your opponent's next turn.",
      flavor: "Chitin: nature's answer to tactics." },
    shieldZone(
      (api) =>
        mySquares(api.board, api.me).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return t === "n" || t === "b";
        }),
      1,
    ),
  ),

  // --- tempo (4) ---

  card(
    { id: "bn4_pocket_metronome", name: "Pocket Metronome", tier: 3, category: "tempo", icon: "Music2",
      description: "Add 20 seconds to your clock. In untimed games it adds nothing.",
      flavor: "Tick. Tock. Yours now." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 20 })),
  ),
  card(
    { id: "bn4_cold_snap", name: "Cold Snap", tier: 3, category: "tempo", icon: "ThermometerSnowflake",
      description: "Two enemy pieces of your choice (their king excepted) are frozen for your opponent's next turn.",
      flavor: "Weather report: brief, personal, vindictive." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to freeze (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.opp || p.type === "k") continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "ice" });
        }
      },
    ),
  ),
  card(
    { id: "bn4_slow_procession", name: "Slow Procession", tier: 3, category: "tempo", icon: "Snail",
      description: "For your opponent's next 2 turns, their queen cannot move.",
      flavor: "Protocol demands she walk behind the banners. All of them.",
      fx: { motif: "jail", pieces: ["q"] } },
    timedOppFilter(2, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  card(
    { id: "bn4_coffee_break", name: "Coffee Break", tier: 3, category: "tempo", icon: "Coffee",
      description: "Your opponent's pawns cannot advance for their next 3 turns.",
      flavor: "The union was very clear about this.",
      fx: { motif: "slow", pieces: ["p"] } },
    instant((_inst, api) => addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 })),
  ),

  // --- info (2) ---

  card(
    { id: "bn4_scouts_report", name: "Scout's Report", tier: 3, category: "info", icon: "Map",
      description: "Every enemy piece currently aiming at any of your pieces lights up until your opponent replies.",
      flavor: "Bad news, thoroughly footnoted." },
    instant((_inst, api) => {
      const hot: Square[] = [];
      for (const mineSq of mySquares(api.board, api.me)) {
        for (const a of attackersOf(api.board, api.opp, mineSq)) {
          if (!hot.includes(a)) hot.push(a);
        }
      }
      flashSquares(api, hot);
    }),
  ),
  card(
    { id: "bn4_over_the_shoulder", name: "Over the Shoulder", tier: 3, category: "info", icon: "Eye",
      description: "See the cards in your opponent's next draft offer, and gain 1 draft reroll.",
      flavor: "Rude, effective, traditional." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_bakers_dozen", name: "Baker's Dozen", tier: 3, category: "draft", icon: "Croissant",
      description: "Your next draft shows three cards, and you gain 1 draft reroll.",
      flavor: "The thirteenth roll is always the good one." },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_trade_secret", name: "Trade Secret", tier: 3, category: "draft", icon: "Lock",
      description: "Your next draft offer is fated to deal tier 4 cards.",
      flavor: "Ask no questions about the supplier." },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 4;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_kettle_on", name: "Kettle On", tier: 3, category: "item", icon: "CupSoda",
      description: "Put the kettle on: every one of your frozen or stuck pieces thaws at once.",
      flavor: "Steam solves what strategy cannot." },
    activatedSimple((_inst, api) => thawMine(api)),
  ),
  card(
    { id: "bn4_party_hat", name: "Party Hat", tier: 3, category: "item", icon: "PartyPopper",
      description: "Put a party hat on any piece on the board, forever (purely decorative). If it is one of yours, it cannot be captured for your opponent's next 2 turns: nobody ruins a party.",
      flavor: "Mandatory fun has entered the square." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose who celebrates",
              squares: [...mySquares(api.board, api.me), ...mySquares(api.board, api.opp)],
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p) return;
        pinCosmetic(api, sq, p.color, "hat", null, "Party Hat");
        if (p.color === api.me && p.type !== "k") {
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
        }
      },
    ),
  ),

  // ===== TIER 4 ==============================================================
  // --- relief (12) ---

  card(
    { id: "bn4_open_season", name: "Open Season", tier: 4, category: "nerf", icon: "Crosshair",
      description: "For the rest of the game, every capture you make suspends your nerf for your next turn.",
      flavor: "The license never expires. The geese know." },
    reliefEvery(
      1,
      (m, api) => m.color === api.me && !!m.captured && m.captured !== "k",
      "hunting keeps you free",
    ),
  ),
  card(
    { id: "bn4_paid_leave", name: "Paid Leave", tier: 4, category: "nerf", icon: "Plane",
      description: "Suspend your nerf for your next 6 turns.",
      flavor: "Approved, stamped, and already at the beach." },
    suspendNow(6),
  ),
  card(
    { id: "bn4_kings_indulgence", name: "King's Indulgence", tier: 4, category: "nerf", icon: "ScrollText",
      description: "Free action: suspend your nerf for your next 4 turns, used at the moment you choose.",
      flavor: "Signed in a generous mood. Cash it in a desperate one." },
    suspendFree(4),
  ),
  card(
    { id: "bn4_heavy_price", name: "Heavy Price", tier: 4, category: "nerf", icon: "Anchor",
      description: "For the rest of the game, whenever your opponent captures one of your rooks or queens, your nerf is suspended for your next 4 turns.",
      flavor: "Take something that heavy and the whole board tilts back." },
    reliefEvery(
      4,
      (m, api) => m.color === api.opp && (m.captured === "r" || m.captured === "q"),
      "the scales are watching",
    ),
  ),
  card(
    { id: "bn4_royal_writ", name: "Royal Writ", tier: 4, category: "nerf", icon: "Stamp",
      description: "Suspend your nerf for your next 4 turns, and your king cannot be captured on your opponent's next turn.",
      flavor: "The seal is heavy enough to hide behind." },
    suspendNow(4, (api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_harvest_rest", name: "Harvest Rest", tier: 4, category: "nerf", icon: "Tractor",
      description: "After your next 5 turns, your nerf is suspended for the 6 turns that follow.",
      flavor: "First the field, then the feast." },
    reliefAfter(5, 6),
  ),
  card(
    { id: "bn4_furlough", name: "Furlough", tier: 4, category: "nerf", icon: "Backpack",
      description: "Spend your turn signing out: your nerf is suspended for your next 7 turns.",
      flavor: "Leave the shackles at the front desk." },
    activatedSimple((_inst, api) => susp(api, 7)),
  ),
  card(
    { id: "bn4_dragonslayer", name: "Dragonslayer", tier: 4, category: "nerf", icon: "Flame",
      description: "The first time you capture your opponent's queen, your nerf is suspended for your next 8 turns.",
      flavor: "After the dragon, everything else is paperwork." },
    reliefOn(1, 8, (m, api) => m.color === api.me && m.captured === "q", "dragons"),
  ),
  card(
    { id: "bn4_worry_beads", name: "Worry Beads", tier: 4, category: "nerf", icon: "Grip",
      description: "Every 3rd move you make, a bead drops: your nerf is suspended for your next turn. Lasts the rest of the game.",
      flavor: "Click. Click. Peace." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.count = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const c = (((inst.state.count as number) ?? 0) + 1) % 3;
        inst.state.count = c;
        if (c === 0) susp(api, 1);
      },
      status: (inst) => `${3 - ((inst.state.count as number) ?? 0)} moves to the next bead`,
    },
  ),
  card(
    { id: "bn4_gentlemens_agreement", name: "Gentlemen's Agreement", tier: 4, category: "nerf", icon: "Handshake",
      description: "Suspend your nerf for your next 5 turns. As a courtesy, your opponent gains 1 draft reroll.",
      flavor: "Scandalously civilized." },
    suspendNow(5, (api) => {
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_home_square", name: "Home Square", tier: 4, category: "nerf", icon: "House",
      description: "While your king stands on its starting square, your nerf is suspended. Castle or step away, and the comfort ends until he returns.",
      flavor: "There is exactly one chair in the world that fits." },
    reliefWhile((api) => {
      const home = api.me === "w" ? SQ(4, 0) : SQ(4, 7);
      const p = api.board.pieces[home];
      return !!p && p.color === api.me && p.type === "k";
    }, "the throne remembers"),
  ),
  card(
    { id: "bn4_hold_the_door", name: "Hold the Door", tier: 4, category: "nerf", icon: "DoorClosed",
      description: "The next 2 times an enemy piece reaches your back rank, your nerf is suspended for your next 4 turns.",
      flavor: "They are in the hall. You are suddenly wide awake." },
    reliefOn(2, 4, (m, api) => m.color === api.opp && relRank(api.opp, m.to) === 8, "alarms"),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_hidden_stair", name: "Hidden Stair", tier: 4, category: "movement", icon: "ArrowDownToLine",
      description: "Once, your king may descend to any empty square on your home rank.",
      flavor: "Behind the tapestry. Mind the third step.",
      fx: { motif: "empower", pieces: ["k"], self: true } },
    augment((_moves, inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return [];
      const r = api.me === "w" ? 0 : 7;
      const dests: Square[] = [];
      for (let f = 0; f < 8; f++) {
        const s = SQ(f, r);
        if (s !== ks && !api.board.pieces[s]) dests.push(s);
      }
      return teleportMoves(api.board, ks, dests, inst.id);
    }, 1),
  ),
  card(
    { id: "bn4_mountain_pass", name: "Mountain Pass", tier: 4, category: "movement", icon: "MountainSnow",
      description: "For your next 3 turns, your bishops may slide diagonally through one of your own pieces (never capturing it) to squares beyond.",
      flavor: "The goat path is open. Bishops are surprisingly goat-like.", requires: ["b"],
      fx: { motif: "empower", pieces: ["b"], moveAs: "b", self: true } },
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "b")) {
        out.push(...phasingSlideMoves(api.board, from, [[1, 1], [1, -1], [-1, 1], [-1, -1]], inst.id, 1));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_processional", name: "Processional", tier: 4, category: "movement", icon: "Footprints",
      description: "Rearrange the court: move up to 2 of your pieces (your king excepted) to empty squares within your half.",
      flavor: "Everyone one step to the left of destiny, please." },
    relocateMany(2, (api) => emptySquares(api.board, (sq) => inHalf(api.me, sq))),
  ),
  card(
    { id: "bn4_scaffold_crane", name: "Scaffold Crane", tier: 4, category: "movement", icon: "Construction",
      description: "Hoist one of your rooks to any empty square on your home rank.",
      flavor: "The classic rook lift, with an actual lift.", requires: ["r"] },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const homeEmpty = () => {
          const r = api.me === "w" ? 0 : 7;
          const out: Square[] = [];
          for (let f = 0; f < 8; f++) {
            const s = SQ(f, r);
            if (!api.board.pieces[s]) out.push(s);
          }
          return out;
        };
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the rook to hoist",
            squares: homeEmpty().length ? mySquares(api.board, api.me, "r") : [],
          };
        }
        return { kind: "square", label: "Choose where it lands", squares: homeEmpty() };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || from === to) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.me || p.type !== "r" || api.board.pieces[to]) return;
        api.relocate(from, to);
      },
    ),
  ),
  card(
    { id: "bn4_seven_league_boots", name: "Seven League Boots", tier: 4, category: "movement", icon: "Footprints",
      description: "Once, one of your pawns may stride up to three squares straight forward across empty squares (never onto the final rank).",
      flavor: "Sized for giants. Laced for optimists.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    augment((_moves, inst, api) => {
      const fwd = api.me === "w" ? 1 : -1;
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "p")) {
        for (let d = 1; d <= 3; d++) {
          const r = RANK(from) + d * fwd;
          if (!inBoard(FILE(from), r)) break;
          const to = SQ(FILE(from), r);
          if (api.board.pieces[to]) break;
          if (!pawnRankOk(to)) break;
          if (d > 1) out.push(...teleportMoves(api.board, from, [to], inst.id));
        }
      }
      return out;
    }, 1),
  ),

  // --- pieces (5) ---

  card(
    { id: "bn4_letters_home", name: "Letters Home", tier: 4, category: "pieces", icon: "Mail",
      description: "After your next 4 turns, the letters arrive: two pawns join your pocket, ready to drop on later turns.",
      flavor: "P.S. We are coming to help. P.P.S. Both of us." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 4) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          grantInventory(api, "p", 2);
          inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 4} turns until the post`,
    },
  ),
  card(
    { id: "bn4_field_hospital", name: "Field Hospital", tier: 4, category: "pieces", icon: "Cross",
      description: "Return one of your captured pawns to an empty square in your half. It comes back bandaged: it cannot be captured for your opponent's next 2 turns.",
      flavor: "Discharged with a limp and a grudge." },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const can = revivable(api, "p") > 0;
        return {
          kind: "square",
          label: can ? "Choose where the patient returns" : "No captured pawn to treat",
          squares: can
            ? emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq))
            : [],
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || revivable(api, "p") <= 0) return;
        if (api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),
  card(
    { id: "bn4_small_consolation", name: "Small Consolation", tier: 4, category: "pieces", icon: "Gift",
      description: "The next 2 times your opponent captures one of your rooks or queens, a pawn joins your pocket.",
      flavor: "It is not a rook. It is trying its best." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.opp) return;
        if (move.captured !== "r" && move.captured !== "q") return;
        grantInventory(api, "p", 1);
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} consolations left`,
    },
  ),
  card(
    { id: "bn4_color_guard", name: "Color Guard", tier: 4, category: "pieces", icon: "Flag",
      description: "Place two new pawns on empty squares on your second rank.",
      flavor: "They carry the flag. The flag carries the mood." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Post a guard (${picks.length + 1}/2)`,
              squares: emptySquares(api.board, (sq) => RANK(sq) === ownRank(api.me, 1)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          const sq = k.square;
          if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) continue;
          api.place(sq, "p", api.me);
        }
      },
    ),
  ),
  card(
    { id: "bn4_veterans_return", name: "Veteran's Return", tier: 4, category: "pieces", icon: "Medal",
      description: "Return one of your captured knights or bishops to any empty square in your half.",
      flavor: "The armor still fits. The temper never left." },
    reviveOne(["n", "b"], myHalf),
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_wagon_circle", name: "Wagon Circle", tier: 4, category: "protection", icon: "CircleDot",
      description: "None of your pieces standing on your home rank can be captured for your opponent's next 3 turns.",
      flavor: "Round up whatever rolls.",
      fx: { motif: "ward", pieces: "all", self: true } },
    shieldZone(
      (api) => mySquares(api.board, api.me).filter((sq) => RANK(sq) === ownRank(api.me, 0)),
      3,
    ),
  ),
  card(
    { id: "bn4_pawn_bulwark", name: "Pawn Bulwark", tier: 4, category: "protection", icon: "BrickWall",
      description: "None of your pawns can be captured for your opponent's next 2 turns.",
      flavor: "The little wall holds. The little wall always holds.", requires: ["p"],
      fx: { motif: "ward", pieces: ["p"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 2),
  ),
  card(
    { id: "bn4_glass_case", name: "Glass Case", tier: 4, category: "protection", icon: "Frame",
      description: "Your queen cannot be captured for your opponent's next 3 turns.",
      flavor: "Museum grade. Do not tap. They always tap.", requires: ["q"],
      fx: { motif: "ward", pieces: ["q"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "q"), 3),
  ),
  card(
    { id: "bn4_town_walls", name: "Town Walls", tier: 4, category: "protection", icon: "Castle",
      description: "No enemy piece may move onto your second rank for 3 turns.",
      flavor: "Built in a day, oddly enough." },
    instant((_inst, api) => {
      const r = ownRank(api.me, 1);
      const squares: Square[] = [];
      for (let f = 0; f < 8; f++) squares.push(SQ(f, r));
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),
  card(
    { id: "bn4_bodyguard_detail", name: "Bodyguard Detail", tier: 4, category: "protection", icon: "Users",
      description: "Your king cannot be captured for your opponent's next 2 turns, and every piece of yours standing beside him cannot be captured on their next turn.",
      flavor: "Sunglasses, earpieces, unshakable loyalty.",
      fx: { motif: "ward", pieces: ["k"], self: true } },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return;
      const squares = adjSquares(ks).filter((s) => {
        const p = api.board.pieces[s];
        return !!p && p.color === api.me;
      });
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 1 });
    }),
  ),

  // --- tempo (4) ---

  card(
    { id: "bn4_hourglass_flip", name: "Hourglass Flip", tier: 4, category: "tempo", icon: "Hourglass",
      description: "Add 30 seconds to your clock. In untimed games it adds nothing.",
      flavor: "Gravity works for whoever turns the glass." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 30 })),
  ),
  card(
    { id: "bn4_flash_frost", name: "Flash Frost", tier: 4, category: "tempo", icon: "Snowflake",
      description: "One enemy piece of your choice (their king excepted) is frozen solid for your opponent's next 2 turns.",
      flavor: "Personal winter, express delivery." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to freeze",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
      },
    ),
  ),
  card(
    { id: "bn4_general_strike", name: "General Strike", tier: 4, category: "tempo", icon: "Megaphone",
      description: "For your opponent's next turn, only their king will move: every other piece is off the job.",
      flavor: "The pawns have demands. The rooks have a drum.",
      fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => addEffect(api, { kind: "king_only", against: api.opp, turns: 1 })),
  ),
  card(
    { id: "bn4_tangled_reins", name: "Tangled Reins", tier: 4, category: "tempo", icon: "Cable",
      description: "For your opponent's next 2 turns, their knights cannot move.",
      flavor: "Somebody braided the cavalry together.",
      fx: { motif: "jail", pieces: ["n"] } },
    timedOppFilter(2, (moves) => moves.filter((m) => m.piece !== "n")),
  ),

  // --- info (3) ---

  card(
    { id: "bn4_war_room_map", name: "War Room Map", tier: 4, category: "info", icon: "Map",
      description: "Every enemy piece that no other enemy piece defends lights up until your opponent replies.",
      flavor: "The pins are red. The mood is optimistic." },
    instant((_inst, api) => flashSquares(api, undefendedPieces(api.board, api.opp))),
  ),
  card(
    { id: "bn4_listening_post", name: "Listening Post", tier: 4, category: "info", icon: "RadioTower",
      description: "See both the cards and the tier of your opponent's next draft offer.",
      flavor: "The wire crackles. The news is specific." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  card(
    { id: "bn4_danger_sense", name: "Danger Sense", tier: 4, category: "info", icon: "AlertTriangle",
      description: "Every enemy piece currently aiming at your king or your queen lights up until your opponent replies.",
      flavor: "The hair on the back of the castle stands up." },
    instant((_inst, api) => {
      const hot: Square[] = [];
      const royal = [
        ...mySquares(api.board, api.me, "k"),
        ...mySquares(api.board, api.me, "q"),
      ];
      for (const sq of royal) {
        for (const a of attackersOf(api.board, api.opp, sq)) {
          if (!hot.includes(a)) hot.push(a);
        }
      }
      flashSquares(api, hot);
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_season_ticket", name: "Season Ticket", tier: 4, category: "draft", icon: "Ticket",
      description: "Gain 3 draft rerolls.",
      flavor: "Front row for every bad deal, with the right to boo." },
    instant((_inst, api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 3;
    }),
  ),
  card(
    { id: "bn4_private_auction", name: "Private Auction", tier: 4, category: "draft", icon: "Gavel",
      description: "Your next draft offer is fated to deal tier 5 cards.",
      flavor: "Invitation only. You are the invitation." },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 5;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_care_package", name: "Care Package", tier: 4, category: "item", icon: "Package",
      description: "Open the parcel: at random, either a pawn (half the time), a knight (a quarter), or a bishop (a quarter) joins your pocket, ready to drop on a later turn.",
      flavor: "No return address. Smells faintly of oats." },
    activatedSimple((_inst, api) => {
      const roll = api.rng.int(4);
      grantInventory(api, roll < 2 ? "p" : roll === 2 ? "n" : "b", 1);
    }),
  ),
  card(
    { id: "bn4_confetti_cannon", name: "Confetti Cannon", tier: 4, category: "item", icon: "PartyPopper",
      description: "One of your pieces (your king excepted) puts on sunglasses for the rest of the game (purely decorative) and struts uncapturable through your opponent's next 2 turns.",
      flavor: "Morale is a weapon system." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the guest of honor",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        pinCosmetic(api, sq, api.me, "sunglasses");
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),
];

/** Boon wave 4, all 300 cards: tiers 1-4 here, tiers 5-8 from boons4b.ts. */
export const BOON_WAVE4: Buff[] = [...BOON_WAVE4A, ...BOON_WAVE4B];
