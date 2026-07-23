// Boon wave 4, second half (tiers 5-8). Imported ONLY by boons4.ts, which
// concatenates BOON_WAVE4B after its own tiers 1-4 to form BOON_WAVE4; see
// boons4.ts for the wave's full design notes. Same rules apply here: category
// "nerf" relief cards may talk about your nerf, boon-flagged cards are
// mode-agnostic and never mention nerfs, all randomness draws from api.rng in
// effect paths only, clock effects stay small and rare, and kings are never
// removed, frozen or transformed.
//
// Import paths are relative (not the "@/" alias): tsconfig.server.json does
// not resolve the alias, and the engine must build for the server tests.

import { isInCheck } from "../board";
import { Buff, BuffApi, BuffInstance, BuffPick, CardFx } from "../buff";
import { Tier } from "../nerf";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../types";
import {
  ALL_DIRS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  augment,
  bindCandidates,
  bindPiece,
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
  permanentAugment,
  phasingSlideMoves,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  reviveOne,
  revivable,
  shieldZone,
  slideMoves,
  teleportMoves,
  timedAugment,
  timedOppFilter,
  trackBoundPiece,
} from "./helpers";
import {
  attackersOf,
  flashSquares,
  kingSquare,
  pinCosmetic,
  undefendedPieces,
} from "./overhaul/shared";

// --- Local plumbing (mirrors boons4.ts; boons4b cannot import boons4) --------

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

function card(meta: Meta, mech: Mech): Buff {
  return {
    ...meta,
    ...(meta.category === "nerf" ? {} : { boon: true }),
    implemented: true,
    ...mech,
  };
}

function susp(api: BuffApi, turns: number, owner?: Color) {
  addEffect(api, { kind: "nerf_suspended", owner: owner ?? api.me, turns });
}

function suspendNow(n: number, rider?: (api: BuffApi) => void): Mech {
  return instant((_inst, api) => {
    susp(api, n);
    rider?.(api);
  });
}

function suspendFree(n: number, rider?: (api: BuffApi) => void): Mech {
  return {
    ...activatedSimple((_inst, api) => {
      susp(api, n);
      rider?.(api);
    }),
    freeAction: true,
  };
}

// "Keep the suspension; its final turn applies only to movement restrictions":
// the nerf stays suspended for all `n` of your turns, but on the last of those
// turns you are put under a one-square (king-step) leash, so a movement
// restriction is the only thing still holding you back that turn. Pairs with
// `leashRider` below, which arms the leash after n-1 of your turns.
function armMoveOnlyFinal(api: BuffApi, inst: BuffInstance, n: number) {
  susp(api, n);
  inst.state.leashAt = Math.max(1, n) - 1;
}

function leashRider(inst: BuffInstance, move: Move, api: BuffApi) {
  if (inst.spent || move.color !== api.me) return;
  const left = (inst.state.leashAt as number) ?? 0;
  if (left <= 0) return;
  const next = left - 1;
  inst.state.leashAt = next;
  if (next <= 0) {
    // Added inside this move's hook, so the immediate same-turn tick eats one:
    // ask for 2 to leave 1 (mirrors the short_leash timing in funny/tradeoffs).
    addEffect(api, { kind: "short_leash", owner: api.me, turns: 2 });
    inst.spent = true;
  }
}

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

function armySize(board: BoardState, color: Color): number {
  let n = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (p && p.color === color && p.type !== "k") n++;
  }
  return n;
}

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

function thawMine(api: BuffApi, sq?: Square) {
  const fx = api.bs.effects;
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i];
    if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me) {
      if (sq == null || e.sq === sq) fx.splice(i, 1);
    }
  }
}

function isCastle(m: Move): boolean {
  return m.piece === "k" && Math.abs(FILE(m.to) - FILE(m.from)) === 2;
}

function nonEmpty(kept: Move[], all: Move[]): Move[] {
  return kept.length > 0 ? kept : all;
}

function ownRank(color: Color, n: number): number {
  return color === "w" ? n : 7 - n;
}

const myHalf = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);

/** Empty squares on my home rank. */
function homeRankEmpty(api: BuffApi): Square[] {
  const r = ownRank(api.me, 0);
  const out: Square[] = [];
  for (let f = 0; f < 8; f++) {
    const s = SQ(f, r);
    if (!api.board.pieces[s]) out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tiers 5-8 (148 cards).
// ---------------------------------------------------------------------------

export const BOON_WAVE4B: Buff[] = [
  // ===== TIER 5 ==============================================================
  // --- relief (13) ---

  card(
    { id: "bn4_scapegoat", name: "Scapegoat", tier: 5, category: "nerf", icon: "Rat",
      description: "Send one of your knights or bishops into the wilderness (it is removed and truly lost): your nerf is suspended for your next 12 turns. On the last of those turns you may only step one square (a king step).",
      flavor: "It carries everything you could not." },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.used
          ? null
          : {
              kind: "square",
              label: "Choose the piece that carries the burden",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, api, picks) => {
        if (inst.state.used) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || (p.type !== "n" && p.type !== "b")) return;
        api.removePiece(sq);
        inst.state.used = true;
        armMoveOnlyFinal(api, inst, 12);
      },
      onMovePlayed: leashRider,
      status: (inst) =>
        inst.state.used ? "the final turn tightens the leash" : "activate to send one away",
    },
  ),
  card(
    { id: "bn4_pillars_of_home", name: "Pillars of Home", tier: 6, category: "nerf", icon: "Columns3",
      description: "While at least two of your rooks stand on the board, your nerf is suspended.",
      flavor: "The roof holds as long as both towers do.", requires: ["r"] },
    reliefWhile((api) => mySquares(api.board, api.me, "r").length >= 2, "leaning on the towers"),
  ),
  card(
    { id: "bn4_veterans_pension", name: "Veteran's Pension", tier: 5, category: "nerf", icon: "PiggyBank",
      description: "After your next 6 turns, your nerf is suspended for the 10 turns that follow. On the last of those turns you may only step one square (a king step).",
      flavor: "Deferred, compounded, and finally owed." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        if (inst.state.armed) {
          leashRider(inst, move, api);
          return;
        }
        const t = ((inst.state.turns as number) ?? 6) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          armMoveOnlyFinal(api, inst, 10);
          inst.state.armed = true;
        }
      },
      status: (inst) =>
        inst.state.armed
          ? "the final turn tightens the leash"
          : `${(inst.state.turns as number) ?? 6} of your turns until relief`,
    },
  ),
  card(
    { id: "bn4_smoke_break_union", name: "Smoke Break Union", tier: 5, category: "nerf", icon: "Cigarette",
      description: "Suspend your nerf for your next 18 turns. When it returns, gain 1 draft reroll.",
      flavor: "Any excuse counts, per the collective agreement." },
    {
      kind: "passive",
      init: (inst, api) => {
        susp(api, 18);
        inst.state.turns = 18;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 18) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 18} turns of suspension left`,
    },
  ),
  card(
    { id: "bn4_diplomatic_pouch", name: "Diplomatic Pouch", tier: 6, category: "nerf", icon: "Briefcase",
      description: "Suspend your nerf for your next 5 turns, and see the cards in your opponent's next draft offer.",
      flavor: "Sealed, immune, and full of other people's secrets." },
    suspendNow(5, (api) => {
      api.mine.flags.seeOppCards = true;
    }),
  ),
  card(
    { id: "bn4_holy_water", name: "Holy Water", tier: 5, category: "nerf", icon: "Droplets",
      description: "Suspend your nerf for your next 4 turns, and choose up to four of your pieces (your king counts): each chosen piece cannot be captured for your opponent's next 2 turns.",
      flavor: "Blessed, bottled, and extremely refreshing." },
    {
      kind: "activated",
      targets: (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Choose a piece to bless (${picks.length + 1}/4)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      effect: (_inst, api, picks) => {
        susp(api, 4);
        // Turn-consuming activation: the engine ticks owner effects once for
        // the activation turn (and compensates shield / king_safe with +1 but
        // not nerf_suspended), so add 1 here to keep the full 4 of your turns.
        const last = api.bs.effects[api.bs.effects.length - 1];
        if (last && last.kind === "nerf_suspended" && last.turns != null) last.turns += 1;
        const zone: Square[] = [];
        let kingChosen = false;
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) continue;
          if (p.type === "k") kingChosen = true;
          else zone.push(sq);
        }
        if (zone.length) addEffect(api, { kind: "shield", owner: api.me, squares: zone, turns: 2 });
        if (kingChosen) addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      },
    },
  ),
  card(
    { id: "bn4_royal_household", name: "Royal Household", tier: 5, category: "nerf", icon: "Castle",
      description: "After your opponent's next move, the next 5 times you move your queen your nerf is suspended for your next turn.",
      flavor: "When she works, the whole house breathes easier.", requires: ["q"] },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 5;
        inst.state.armed = false;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed) {
          if (move.color === api.opp) inst.state.armed = true;
          return;
        }
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.me || move.piece !== "q") return;
        susp(api, 1);
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.armed
          ? `${(inst.state.charges as number) ?? 5} errands left`
          : "waiting on their reply",
    },
  ),
  card(
    { id: "bn4_coronation_rest", name: "Coronation Rest", tier: 4, category: "nerf", icon: "Crown",
      description: "The first time one of your pawns promotes, your nerf is suspended for your next 10 turns.",
      flavor: "A new crown outshines every old chain.", requires: ["p"] },
    reliefOn(1, 10, (m, api) => m.color === api.me && !!m.promotion, "crownings"),
  ),
  card(
    { id: "bn4_prison_break", name: "Prison Break", tier: 5, category: "nerf", icon: "Unlock",
      description: "Suspend your nerf for your next 3 turns, and every one of your frozen or stuck pieces thaws at once.",
      flavor: "One spoon. Years of patience. Worth it." },
    suspendNow(3, (api) => thawMine(api)),
  ),
  card(
    { id: "bn4_out_on_bail", name: "Out on Bail", tier: 6, category: "nerf", icon: "Banknote",
      description: "Suspend your nerf for your next 9 turns. The bail costs you your next draft, which is skipped.",
      flavor: "Freedom now, invoices later." },
    suspendNow(9, (api) => {
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_salt_in_the_wound", name: "Salt in the Wound", tier: 5, category: "nerf", icon: "CloudLightning",
      description: "Suspend your nerf for your next 18 turns. When it returns, gain 1 draft reroll.",
      flavor: "Their parade, your permission slip." },
    {
      kind: "passive",
      init: (inst, api) => {
        susp(api, 18);
        inst.state.turns = 18;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 18) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 18} turns of suspension left`,
    },
  ),
  card(
    { id: "bn4_rule_of_three", name: "Rule of Three", tier: 6, category: "nerf", icon: "Dices",
      description: "Every 3rd capture you make suspends your nerf for your next 4 turns. Lasts the rest of the game.",
      flavor: "The third one always lands different." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.count = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        const c = (((inst.state.count as number) ?? 0) + 1) % 3;
        inst.state.count = c;
        if (c === 0) susp(api, 4);
      },
      status: (inst) => `${3 - ((inst.state.count as number) ?? 0)} captures to the charm`,
    },
  ),
  card(
    { id: "bn4_leave_of_absence", name: "Leave of Absence", tier: 5, category: "nerf", icon: "CalendarOff",
      description: "Free action: suspend your nerf for your next 5 turns and gain 1 draft reroll, used at the moment you choose. On the last of those turns you may only step one square (a king step).",
      flavor: "The form has two boxes. Tick both." },
    {
      ...activatedSimple((inst, api) => {
        armMoveOnlyFinal(api, inst, 5);
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      }),
      freeAction: true,
      spendOnUse: false,
      onMovePlayed: leashRider,
    },
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_falconers_glove", name: "Falconer's Glove", tier: 5, category: "movement", icon: "Bird",
      description: "Choose one of your knights: for the rest of the game it may also step one square in any direction (capturing allowed). Each time it takes that step, it cannot move again on your next turn.",
      flavor: "It comes back to the fist. Usually with something.", requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the knight that wears the glove",
              squares: mySquares(api.board, api.me, "n"),
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
        addNovel(moves, leapMoves(api.board, sq, ALL_DIRS, inst.id));
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq != null && move.via === inst.id && move.from === sq && move.color === api.me) {
          // The glove-step arrival is grounded next turn. Added inside this
          // move's hook, so the immediate same-turn tick eats one: ask for 2
          // to leave 1 (see leashRider / funny/tradeoffs short_leash timing).
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.me, turns: 2, skin: "stun" });
        }
        trackBoundPiece(inst, move, { dieOnPromote: true });
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to choose a knight"
          : `bound to ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    { id: "bn4_ghost_walk", name: "Ghost Walk", tier: 4, category: "movement", icon: "Ghost",
      description: "Once, teleport one of your pieces (your king excepted) to any empty square in your half. Pawns cannot land on a first or last rank.",
      flavor: "Politely declined to use the hallway." },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece that walks",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        const isPawn = api.board.pieces[picks[0].square!]?.type === "p";
        return {
          kind: "square",
          label: "Choose where it reappears",
          squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && (!isPawn || pawnRankOk(sq))),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || from === to) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.me || p.type === "k") return;
        if (api.board.pieces[to] || !inHalf(api.me, to)) return;
        if (p.type === "p" && !pawnRankOk(to)) return;
        api.relocate(from, to);
      },
    ),
  ),
  card(
    { id: "bn4_ratlines", name: "Ratlines", tier: 5, category: "movement", icon: "Anchor",
      description: "Choose one of your rooks standing directly beside your king. After your opponent's next move, the king and that rook swap squares.",
      flavor: "Up the rigging, down the other side, crown intact.", requires: ["r"] },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (picks.length > 0 || inst.state.rook != null) return null;
        const ks = kingSquare(api.board, api.me);
        return {
          kind: "square",
          label: "Choose the rook to swap with",
          squares:
            ks == null
              ? []
              : adjSquares(ks).filter((s) => {
                  const p = api.board.pieces[s];
                  return !!p && p.color === api.me && p.type === "r";
                }),
        };
      },
      effect: (inst, _api, picks) => {
        if (inst.state.rook != null) return;
        const rsq = picks[0]?.square;
        if (rsq != null) inst.state.rook = rsq;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || inst.state.rook == null || move.color !== api.opp) return;
        // Delayed payoff: the swap resolves only after the opponent replies.
        const rsq = inst.state.rook as Square;
        const ks = kingSquare(api.board, api.me);
        const rp = api.board.pieces[rsq];
        if (
          ks != null &&
          rp &&
          rp.color === api.me &&
          rp.type === "r" &&
          adjSquares(ks).includes(rsq)
        ) {
          api.setPieceType(ks, "r");
          api.setPieceType(rsq, "k");
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.rook == null ? "activate to choose the rook" : "swapping after their reply",
    },
  ),
  card(
    { id: "bn4_pathfinders", name: "Pathfinders", tier: 5, category: "movement", icon: "Compass",
      description: "For your next 3 turns, your knights may also make a long leap to an empty square: three squares one way and one square the other. The leap cannot capture.",
      flavor: "The map said no road. The horses said watch this.", requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "n", self: true } },
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      const leaps = [
        [3, 1], [1, 3], [-3, 1], [-1, 3], [3, -1], [1, -3], [-3, -1], [-1, -3],
      ] as const;
      for (const from of mySquares(api.board, api.me, "n")) {
        out.push(...leapMoves(api.board, from, leaps, inst.id).filter((m) => !m.captured));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_queens_gambol", name: "Queen's Gambol", tier: 5, category: "movement", icon: "Sparkle",
      description: "Once, your queen may leap like a knight (capturing allowed). Her landing square is revealed and stays marked until your opponent replies.",
      flavor: "She learned it watching. She learns everything watching.", requires: ["q"],
      fx: { motif: "empower", pieces: ["q"], moveAs: "n", self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        const leaps = [
          [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
        ] as const;
        for (const from of mySquares(api.board, api.me, "q")) {
          out.push(...leapMoves(api.board, from, leaps, inst.id));
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.via !== inst.id || !move.color) return;
        // Reveal the landing square: the strike flash lingers until the
        // opponent replies (it ticks on their turns).
        flashSquares(api, [move.to]);
        const charges = ((inst.state.charges as number) ?? 1) - 1;
        inst.state.charges = charges;
        if (charges <= 0) inst.spent = true;
      },
    },
  ),

  // --- pieces (5) ---

  card(
    { id: "bn4_reserve_officer", name: "Reserve Officer", tier: 5, category: "pieces", icon: "Award",
      description: "A knight joins your pocket, ready to be dropped onto an empty square on a later turn (the drop spends that turn).",
      flavor: "Retired, technically. Bored, definitely." },
    instant((_inst, api) => grantInventory(api, "n", 1)),
  ),
  card(
    { id: "bn4_dowry", name: "Dowry", tier: 6, category: "pieces", icon: "Gem",
      description: "Return one of your captured rooks to an empty square on your home rank.",
      flavor: "The family insisted. The family always insists." },
    reviveOne(["r"], (api) => (sq) => RANK(sq) === ownRank(api.me, 0)),
  ),
  card(
    { id: "bn4_retraining", name: "Retraining", tier: 5, category: "pieces", icon: "RefreshCw",
      description: "One of your knights becomes a bishop, or one of your bishops becomes a knight, where it stands. Your next draft is then skipped.",
      flavor: "Six weeks of night classes and a new walk." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the minor piece to retrain",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || (p.type !== "n" && p.type !== "b")) return;
        if (p.type === "n") api.setPieceType(sq, "b");
        else api.setPieceType(sq, "n");
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      },
    ),
  ),
  card(
    { id: "bn4_stray_cat", name: "Stray Cat", tier: 5, category: "pieces", icon: "Cat",
      description: "A pawn wanders in: place it on any empty square in your half. Then choose up to four of your pieces: each cannot be captured on your opponent's next turn while things settle.",
      flavor: "You did not adopt it. It adopted the b-file." },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose where it curls up",
            squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)),
          };
        }
        if (picks.length >= 5) return null;
        return {
          kind: "square",
          label: `Choose a piece to protect (${picks.length}/4)`,
          squares: mySquares(api.board, api.me).filter((sq) => !picks.some((k) => k.square === sq)),
          finishable: true,
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) return;
        api.place(sq, "p", api.me);
        const zone: Square[] = [];
        for (let i = 1; i < picks.length; i++) {
          const s = picks[i]?.square;
          if (s == null) continue;
          const p = api.board.pieces[s];
          if (p && p.color === api.me) zone.push(s);
        }
        if (zone.length) addEffect(api, { kind: "shield", owner: api.me, squares: zone, turns: 1 });
      },
    ),
  ),
  card(
    { id: "bn4_life_insurance", name: "Life Insurance", tier: 6, category: "pieces", icon: "FileHeart",
      description: "Choose one of your pieces (your king excepted). When it is captured, a piece of the same kind pays out into your pocket, ready to drop on a later turn.",
      flavor: "Premiums waived. Payout guaranteed. Grief optional." },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the insured piece",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        inst.state.sq = sq;
        inst.state.type = p.type;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        const died =
          (move.capturedSquare === sq && move.from !== sq) ||
          (move.to === sq && move.from !== sq);
        if (died) {
          grantInventory(api, (inst.state.type as PieceType) ?? "p", 1);
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
          if (move.promotion) inst.state.type = move.promotion;
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to write the policy"
          : `policy on ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_stone_cloak", name: "Stone Cloak", tier: 5, category: "protection", icon: "Mountain",
      description: "One of your pieces (your king excepted) can never be captured, for the rest of the game. Your next draft is then skipped.",
      flavor: "Heavy to wear. Heavier to argue with." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece that turns to stone",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: null });
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      },
    ),
  ),
  card(
    { id: "bn4_shepherds_watch", name: "Shepherd's Watch", tier: 6, category: "protection", icon: "Moon",
      description: "None of your pawns can be captured for your opponent's next 3 turns.",
      flavor: "Count them all you like. None go missing tonight.", requires: ["p"],
      fx: { motif: "ward", pieces: ["p"], self: true } },
    shieldZone((api) => mySquares(api.board, api.me, "p"), 3),
  ),
  card(
    { id: "bn4_keep_gate", name: "Keep Gate", tier: 5, category: "protection", icon: "Landmark",
      description: "The three squares directly ahead of your king are barred to enemy pieces for 4 turns.",
      flavor: "Oak, iron, and a very rude porter." },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return;
      const fwd = api.me === "w" ? 1 : -1;
      const squares: Square[] = [];
      for (const df of [-1, 0, 1]) {
        const f = FILE(ks) + df, r = RANK(ks) + fwd;
        if (inBoard(f, r)) squares.push(SQ(f, r));
      }
      if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),
  card(
    { id: "bn4_heralds_truce", name: "Herald's Truce", tier: 5, category: "protection", icon: "Scroll",
      description: "Choose one of your pieces (your king excepted): for your opponent's next turn it cannot be captured and your king cannot be taken.",
      flavor: "One trumpet note buys one quiet morning." },
    {
      kind: "activated",
      targets: (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece the truce shields",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (_inst, api, picks) => {
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (p && p.color === api.me && p.type !== "k") {
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 1 });
        }
      },
    },
  ),
  card(
    { id: "bn4_quartermasters_lock", name: "Quartermaster's Lock", tier: 5, category: "protection", icon: "Lock",
      description: "Choose up to four of your rooks or your queen: each chosen piece cannot be captured for your opponent's next 2 turns.",
      flavor: "Heavy equipment signs out through ME.",
      fx: { motif: "ward", pieces: ["r", "q"], self: true } },
    {
      kind: "activated",
      targets: (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Choose a rook or queen to lock down (${picks.length + 1}/4)`,
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return (t === "r" || t === "q") && !picks.some((k) => k.square === sq);
              }),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      effect: (_inst, api, picks) => {
        const zone: Square[] = [];
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (p && p.color === api.me && (p.type === "r" || p.type === "q")) zone.push(sq);
        }
        if (zone.length) addEffect(api, { kind: "shield", owner: api.me, squares: zone, turns: 2 });
      },
    },
  ),

  // --- tempo (3) ---

  card(
    { id: "bn4_overtime_claim", name: "Overtime Claim", tier: 3, category: "tempo", icon: "AlarmClock",
      description: "Add 45 seconds to your clock. In untimed games it adds nothing.",
      flavor: "Filed in triplicate. Paid in seconds." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 45 })),
  ),
  card(
    { id: "bn4_winter_orders", name: "Winter Orders", tier: 6, category: "tempo", icon: "CloudSnow",
      description: "Up to two enemy pieces of your choice (their king excepted) are frozen for your opponent's next 2 turns.",
      flavor: "By decree: everyone named here stays exactly where winter found them." },
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
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
        }
      },
    ),
  ),
  card(
    { id: "bn4_logjam", name: "Logjam", tier: 5, category: "tempo", icon: "TreePine",
      description: "The river clogs after your opponent's next move: they skip the turn that follows.",
      flavor: "Somewhere upstream, one very smug beaver." },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp) return;
        // Delayed payoff: the jam sets only after the opponent's next move, so
        // the turn it skips is the one after that.
        api.bs.skips[api.opp] += 1;
        inst.spent = true;
      },
      status: () => "the jam is building",
    },
  ),

  // --- info (2) ---

  card(
    { id: "bn4_augurs_flight", name: "Augur's Flight", tier: 4, category: "info", icon: "Bird",
      description: "Every one of your pieces that is both under enemy attack and undefended by your own side lights up until your opponent replies.",
      flavor: "The birds circle only where the ground is soft." },
    instant((_inst, api) => {
      const soft = undefendedPieces(api.board, api.me).filter(
        (sq) => attackersOf(api.board, api.opp, sq).length > 0,
      );
      flashSquares(api, soft);
    }),
  ),
  card(
    { id: "bn4_border_survey", name: "Border Survey", tier: 4, category: "info", icon: "MapPin",
      description: "Every square in your half currently reachable by an enemy attack lights up until your opponent replies.",
      flavor: "The surveyors bill by the incursion." },
    instant((_inst, api) => {
      const hot: Square[] = [];
      for (let sq = 0; sq < 64; sq++) {
        if (!inHalf(api.me, sq)) continue;
        if (attackersOf(api.board, api.opp, sq).length > 0) hot.push(sq);
      }
      flashSquares(api, hot);
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_harvest_and_fallow", name: "Harvest and Fallow", tier: 5, category: "draft", icon: "Wheat",
      description: "You keep both cards of your next draft offer. The draft after it is skipped while the field rests.",
      flavor: "Reap twice, sow nothing, repeat never." },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_velvet_queue", name: "Velvet Queue", tier: 5, category: "draft", icon: "Ribbon",
      description: "Your next draft offer is fated to deal tier 6 cards.",
      flavor: "The rope lifts for you. The rope remembers." },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 6;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_grandmas_cookies", name: "Grandma's Cookies", tier: 5, category: "item", icon: "Cookie",
      description: "Every one of your frozen or stuck pieces thaws at once, and each of them cannot be captured on your opponent's next turn.",
      flavor: "Still warm. Strategically warm." },
    activatedSimple((_inst, api) => {
      const stuck: Square[] = [];
      for (const e of api.bs.effects) {
        if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me && e.turns > 0) {
          if (!stuck.includes(e.sq)) stuck.push(e.sq);
        }
      }
      thawMine(api);
      if (stuck.length) addEffect(api, { kind: "shield", owner: api.me, squares: stuck, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_royal_incognito", name: "Royal Incognito", tier: 5, category: "item", icon: "Glasses",
      description: "Your king puts on sunglasses for the rest of the game (purely decorative) and cannot be captured for your opponent's next 2 turns. Nobody recognizes him. Everybody recognizes him.",
      flavor: "Just a regular citizen, out for a stroll, worth the entire game." },
    instant((_inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks != null) pinCosmetic(api, ks, api.me, "sunglasses", null, "Incognito");
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),

  // ===== TIER 6 ==============================================================
  // --- relief (12) ---

  card(
    { id: "bn4_long_holiday", name: "Long Holiday", tier: 6, category: "nerf", icon: "Palmtree",
      description: "After your opponent's next move, your nerf is suspended for your next 8 turns.",
      flavor: "Out of office. Out of reach. Out of excuses to return." },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp) return;
        // Delayed start: the holiday begins only after the opponent replies.
        // nerf_suspended ticks on MY turns, so this opponent move does not
        // consume one of the 8 (no compensation needed).
        susp(api, 8);
        inst.spent = true;
      },
      status: () => "the holiday begins after their reply",
    },
  ),
  card(
    { id: "bn4_guards_change", name: "Changing of the Guard", tier: 6, category: "nerf", icon: "Shield",
      description: "Suspend your nerf for your next 5 turns, and none of your pieces can be captured on your opponent's next turn.",
      flavor: "For one ceremony, everything stands still and safe." },
    suspendNow(5, (api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_spymasters_leave", name: "Spymaster's Leave", tier: 6, category: "nerf", icon: "VenetianMask",
      description: "Suspend your nerf for your next 5 turns, learn the tier of your opponent's next draft offer, and gain 2 draft rerolls. On the last of those turns you may only step one square (a king step).",
      flavor: "Even on vacation, the letters keep arriving." },
    {
      kind: "passive",
      init: (inst, api) => {
        armMoveOnlyFinal(api, inst, 5);
        api.mine.flags.seeOppTier = true;
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
      },
      onMovePlayed: leashRider,
      status: () => "the final turn tightens the leash",
    },
  ),
  card(
    { id: "bn4_ministers_seal", name: "Minister's Seal", tier: 6, category: "nerf", icon: "Stamp",
      description: "Free action, used at the moment you choose: your nerf is suspended for your next 7 turns, beginning after your opponent's next reply.",
      flavor: "Wax, ribbon, and the full weight of the cabinet." },
    {
      ...activatedSimple((inst, _api) => {
        inst.state.armed = true;
      }),
      freeAction: true,
      spendOnUse: false,
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed || inst.spent || move.color !== api.opp) return;
        // Delayed start: the seal takes hold only after the opponent replies.
        susp(api, 7);
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.armed ? "the seal takes hold after their reply" : "free action: use when you choose",
    },
  ),
  card(
    { id: "bn4_hollow_crown", name: "Hollow Crown", tier: 6, category: "nerf", icon: "Crown",
      description: "Beginning after your opponent's next move, your nerf is suspended while their queen is off the board.",
      flavor: "Their court is quieter now. Yours is lighter." },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.opp) return;
        if (mySquares(api.board, api.opp, "q").length === 0) susp(api, 1);
      },
      status: () => "watching their empty throne",
    },
  ),
  card(
    { id: "bn4_tower_toll", name: "Tower Toll", tier: 6, category: "nerf", icon: "TowerControl",
      description: "Tear down one of your rooks (it is removed and truly lost): your nerf is suspended for your next 14 turns.",
      flavor: "Stone by stone, the debt comes down.", requires: ["r"] },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the rook paid in toll",
              squares: mySquares(api.board, api.me, "r"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "r") return;
        api.removePiece(sq);
        susp(api, 14);
      },
    ),
  ),
  card(
    { id: "bn4_moonlit_reprieve", name: "Moonlit Reprieve", tier: 7, category: "nerf", icon: "MoonStar",
      description: "For the rest of the game the moon keeps your schedule: your nerf is suspended for 2 of your turns, returns for 2, and so on.",
      flavor: "Wax, wane, wax, wane. You can plan a life around it." },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.phase = 0;
        susp(api, 1);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const phase = (((inst.state.phase as number) ?? 0) + 1) % 4;
        inst.state.phase = phase;
        if (phase < 2) susp(api, 1);
      },
      status: (inst) =>
        (((inst.state.phase as number) ?? 0) < 2 ? "moonlit" : "waiting on the moon"),
    },
  ),
  card(
    { id: "bn4_champions_rest", name: "Champion's Rest", tier: 7, category: "nerf", icon: "Trophy",
      description: "For the rest of the game, every rook or queen you capture suspends your nerf for your next 4 turns.",
      flavor: "Fell a giant, sleep like one." },
    reliefEvery(
      4,
      (m, api) => m.color === api.me && (m.captured === "r" || m.captured === "q"),
      "hunting giants",
    ),
  ),
  card(
    { id: "bn4_hidden_clause", name: "Hidden Clause", tier: 6, category: "nerf", icon: "FileSearch",
      description: "After your next 8 turns, a buried clause activates: your nerf is suspended for the 12 turns that follow.",
      flavor: "Page forty. Footnote nine. Read by nobody, binding on everybody." },
    reliefAfter(8, 12),
  ),
  card(
    { id: "bn4_double_pardon", name: "Double Pardon", tier: 6, category: "nerf", icon: "HeartHandshake",
      description: "Both players' nerfs are suspended for their next 6 turns. On the last of your 6 turns you may only step one square (a king step).",
      flavor: "Mercy is cheaper wholesale." },
    {
      kind: "passive",
      init: (inst, api) => {
        armMoveOnlyFinal(api, inst, 6);
        susp(api, 6, api.opp);
      },
      onMovePlayed: leashRider,
      status: () => "mercy on the clock",
    },
  ),
  card(
    { id: "bn4_escape_artist", name: "Escape Artist", tier: 7, category: "nerf", icon: "Link2Off",
      description: "For the rest of the game, whenever your king steps out of check, your nerf is suspended for your next 2 turns.",
      flavor: "Every lock is a puzzle. Every puzzle is a doorway." },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) {
          inst.state.wasChecked = isInCheck(api.board, api.me);
          return;
        }
        if (move.color !== api.me) return;
        if ((inst.state.wasChecked as boolean) && !isInCheck(api.board, api.me)) {
          susp(api, 2);
        }
        inst.state.wasChecked = false;
      },
      status: () => "slipping every knot",
    },
  ),
  card(
    { id: "bn4_quiet_coup", name: "Quiet Coup", tier: 6, category: "nerf", icon: "Feather",
      description: "Suspend your nerf for your next 6 turns, and your next draft offer rolls one tier higher. On the last of those turns you may only step one square (a king step).",
      flavor: "No shots fired. Several chairs reassigned." },
    {
      kind: "passive",
      init: (inst, api) => {
        armMoveOnlyFinal(api, inst, 6);
        api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
      },
      onMovePlayed: leashRider,
      status: () => "the final turn tightens the leash",
    },
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_gryphon_rider", name: "Gryphon Rider", tier: 6, category: "movement", icon: "Feather",
      description: "Choose one of your knights: for your opponent's next 4 turns it may also glide up to two squares diagonally (capturing allowed). The gift ends early the moment your king crosses the midline.",
      flavor: "Half horse, half hawk, all appetite.", requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the knight that takes wing",
              squares: mySquares(api.board, api.me, "n"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
        inst.state.turns = 4;
      },
      augmentMoves: (moves, inst, api) => {
        if (inst.spent) return;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me) return;
        addNovel(moves, slideMoves(api.board, sq, [[1, 1], [1, -1], [-1, 1], [-1, -1]], inst.id, 2));
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent) return;
        trackBoundPiece(inst, move, { dieOnPromote: true });
        if (inst.spent) return;
        const ks = kingSquare(api.board, api.me);
        if (ks != null && !inHalf(api.me, ks)) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 4) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to choose a knight"
          : `bound to ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    { id: "bn4_faerie_door", name: "Faerie Door", tier: 5, category: "movement", icon: "DoorOpen",
      description: "Once, teleport one of your pieces (your king excepted) to any empty square on the board. Pawns cannot land on a first or last rank.",
      flavor: "Knock twice. Mind the toll. Do not eat anything." },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the piece that steps through",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        const isPawn = api.board.pieces[picks[0].square!]?.type === "p";
        return {
          kind: "square",
          label: "Choose where the door opens",
          squares: emptySquares(api.board, (sq) => !isPawn || pawnRankOk(sq)),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || from === to) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.me || p.type === "k" || api.board.pieces[to]) return;
        if (p.type === "p" && !pawnRankOk(to)) return;
        api.relocate(from, to);
      },
    ),
  ),
  card(
    { id: "bn4_crowned_strider", name: "Crowned Strider", tier: 6, category: "movement", icon: "Footprints",
      description: "For your next 4 turns, your king may move two squares in a straight line, if both squares are empty.",
      flavor: "A king's pace is whatever the king says it is.",
      fx: { motif: "empower", pieces: ["k"], self: true } },
    timedAugment(4, (_moves, inst, api) => {
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
    { id: "bn4_fisherman_king", name: "Fisherman King", tier: 6, category: "movement", icon: "Fish",
      description: "Once, your king may slip away to any empty square directly beside one of your rooks. On arrival it cannot be captured for your opponent's next turn.",
      flavor: "Gone fishing. The tower knows where.", requires: ["r"],
      fx: { motif: "empower", pieces: ["k"], self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        const ks = kingSquare(api.board, api.me);
        if (ks == null) return;
        const dests: Square[] = [];
        for (const rsq of mySquares(api.board, api.me, "r")) {
          for (const s of adjSquares(rsq)) {
            if (s !== ks && !api.board.pieces[s] && !dests.includes(s)) dests.push(s);
          }
        }
        addNovel(moves, teleportMoves(api.board, ks, dests, inst.id));
      },
      onMovePlayed: (inst, move, api) => {
        if (move.via !== inst.id || !move.color) return;
        // The king just fished its way beside a rook: guard it for the
        // opponent's next turn. king_safe ticks on their moves, so adding it
        // here (during my move) leaves the full one opponent turn of cover.
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
        const charges = ((inst.state.charges as number) ?? 1) - 1;
        inst.state.charges = charges;
        if (charges <= 0) inst.spent = true;
      },
    },
  ),
  card(
    { id: "bn4_court_procession", name: "Court Procession", tier: 6, category: "movement", icon: "Gem",
      description: "For your next 3 turns, your queen may slide straight through your own pieces (never capturing them) to squares beyond. Each such move reveals her landing square until your opponent replies.",
      flavor: "The court parts. The court always parts.", requires: ["q"],
      fx: { motif: "empower", pieces: ["q"], moveAs: "q", self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        for (const from of mySquares(api.board, api.me, "q")) {
          out.push(...phasingSlideMoves(api.board, from, ALL_DIRS, inst.id, 8));
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.via === inst.id && move.color === api.me) flashSquares(api, [move.to]);
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of your turns left`,
    },
  ),

  // --- pieces (6) ---

  card(
    { id: "bn4_summer_levy", name: "Summer Levy", tier: 6, category: "pieces", icon: "Sun",
      description: "Place a new knight on an empty square on your home rank.",
      flavor: "The harvest can wait. The muster cannot." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Muster the levied knight", squares: homeRankEmpty(api) },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        api.place(sq, "n", api.me);
      },
    ),
  ),
  card(
    { id: "bn4_old_guard", name: "The Old Guard", tier: 5, category: "pieces", icon: "Users",
      description: "One of your captured knights and one of your captured bishops both return at once, each to the empty square nearest your home rank.",
      flavor: "They heard the bells. They were already dressed." },
    instant((_inst, api) => {
      for (const t of ["n", "b"] as PieceType[]) {
        if (revivable(api, t) <= 0) continue;
        const sq = autoPlace(api, api.me, t);
        if (sq == null) continue;
        api.place(sq, t, api.me);
        markRevived(api, t);
      }
    }),
  ),
  card(
    { id: "bn4_pocket_cavalry", name: "Pocket Cavalry", tier: 7, category: "pieces", icon: "Backpack",
      description: "A knight and a pawn join your pocket, ready to be dropped onto empty squares on later turns (each drop spends that turn).",
      flavor: "A very small army in a very large coat." },
    instant((_inst, api) => {
      grantInventory(api, "n", 1);
      grantInventory(api, "p", 1);
    }),
  ),
  card(
    { id: "bn4_changeling_child", name: "Changeling Child", tier: 7, category: "pieces", icon: "Baby",
      description: "Choose one of your pawns standing beside one of your knights or bishops: it grows into that same kind of piece where it stands.",
      flavor: "Raised by the cavalry. It shows.", requires: ["p"] },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const minorBeside = (sq: Square) =>
          adjSquares(sq).some((s) => {
            const p = api.board.pieces[s];
            return !!p && p.color === api.me && (p.type === "n" || p.type === "b");
          });
        return {
          kind: "square",
          label: "Choose the changeling pawn",
          squares: mySquares(api.board, api.me, "p").filter(minorBeside),
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        for (const s of adjSquares(sq)) {
          const q = api.board.pieces[s];
          if (q && q.color === api.me && (q.type === "n" || q.type === "b")) {
            api.setPieceType(sq, q.type);
            return;
          }
        }
      },
    ),
  ),
  card(
    { id: "bn4_drawbridge_crew", name: "Drawbridge Crew", tier: 7, category: "pieces", icon: "Cog",
      description: "Place three new pawns on empty squares on your second rank.",
      flavor: "Three shifts, one bridge, zero complaints on record." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Post a crew member (${picks.length + 1}/3)`,
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
    { id: "bn4_masons_lodge", name: "Mason's Lodge", tier: 6, category: "pieces", icon: "Pickaxe",
      description: "A rook joins your pocket, ready to be dropped onto an empty square on a later turn (the drop spends that turn). Your next draft is then skipped.",
      flavor: "They build towers. It is the whole guild charter." },
    instant((_inst, api) => {
      grantInventory(api, "r", 1);
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_ancestral_shield", name: "Ancestral Shield", tier: 6, category: "protection", icon: "Shield",
      description: "After your opponent's next move, none of your pieces can be captured for your opponent's next 2 turns.",
      flavor: "Dented by every war. Pierced by none.",
      fx: { motif: "ward", pieces: "all", self: true } },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.opp) return;
        // Delayed payoff: the shield rises only after the opponent's next move.
        // It ticks on their moves, and this very move ticks the fresh effect
        // once, so ask for 3 to leave the full 2 of their following turns.
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 3 });
        inst.spent = true;
      },
      status: () => "the shield is rising",
    },
  ),
  card(
    { id: "bn4_harbor_queen", name: "Harbor Queen", tier: 7, category: "protection", icon: "Sailboat",
      description: "For the rest of the game, your queen cannot be captured while she stands in your half of the board. Across the middle line she sails at her own risk.",
      flavor: "In home waters, nothing touches her.", requires: ["q"],
      fx: { motif: "ward", pieces: ["q"], self: true } },
    oppFilter((moves, _inst, api) =>
      nonEmpty(
        moves.filter((m) => {
          const cs = captureSquare(m);
          if (cs == null) return true;
          const p = api.board.pieces[cs];
          if (!p || p.color !== api.me || p.type !== "q") return true;
          return !inHalf(api.me, cs);
        }),
        moves,
      ),
    ),
  ),
  card(
    { id: "bn4_castle_ditch", name: "Castle Ditch", tier: 6, category: "protection", icon: "Waves",
      description: "Every empty square around your king becomes a moat for your opponent's next 5 turns: no enemy piece may advance onto them, though the moat cannot stop a capture that lands there.",
      flavor: "Dig first. Gloat later." },
    {
      kind: "passive",
      init: (inst, api) => {
        const ks = kingSquare(api.board, api.me);
        inst.state.squares = ks == null ? [] : adjSquares(ks).filter((s) => !api.board.pieces[s]);
        inst.state.turns = 5;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        const squares = (inst.state.squares as Square[] | undefined) ?? [];
        if (squares.length === 0) return moves;
        // The moat halts advances, but its walls cannot stop a blade: an enemy
        // may still capture a piece standing on a moat square, only never move
        // there quietly.
        const kept = moves.filter((m) => m.captured != null || !squares.includes(m.to));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns of moat left`,
    },
  ),
  card(
    { id: "bn4_shieldmaidens", name: "Shieldmaidens", tier: 6, category: "protection", icon: "Swords",
      description: "Every one of your pieces standing beside your queen cannot be captured for your opponent's next 3 turns. The protection ends the moment one of those pieces makes a capture.",
      flavor: "Her circle holds. Ask anyone who tested it.", requires: ["q"],
      fx: { motif: "ward", pieces: "all", self: true } },
    {
      kind: "passive",
      init: (inst, api) => {
        const qs = mySquares(api.board, api.me, "q")[0];
        if (qs == null) return;
        const squares = adjSquares(qs).filter((s) => {
          const p = api.board.pieces[s];
          return !!p && p.color === api.me;
        });
        if (squares.length) {
          addEffect(api, { kind: "shield", owner: api.me, squares, turns: 3 });
          // Keep the effect's own squares array (it follows the pieces): the
          // rider reads it to spot a protected piece striking.
          inst.state.squares = squares;
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me || !move.captured) return;
        const squares = inst.state.squares as Square[] | undefined;
        // onMovePlayed runs before shield squares follow the piece, so
        // move.from is still a guarded square here.
        if (!squares || !squares.includes(move.from)) return;
        const fx = api.bs.effects;
        for (let i = fx.length - 1; i >= 0; i--) {
          const e = fx[i];
          if (e.kind === "shield" && e.owner === api.me && e.squares === squares) fx.splice(i, 1);
        }
        inst.spent = true;
      },
      status: (inst) => (inst.spent ? "the circle is broken" : "the circle holds"),
    },
  ),
  card(
    { id: "bn4_winter_palace", name: "Winter Palace", tier: 6, category: "protection", icon: "Snowflake",
      description: "Your king cannot be captured for your opponent's next 3 turns, and up to four pieces of your choice on your home rank cannot be captured on their next turn.",
      flavor: "Cold rooms, colder welcome for visitors." },
    {
      kind: "activated",
      targets: (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Choose a piece to shelter (${picks.length + 1}/4)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  RANK(sq) === ownRank(api.me, 0) &&
                  api.board.pieces[sq]!.type !== "k" &&
                  !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      effect: (_inst, api, picks) => {
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
        const zone: Square[] = [];
        for (const k of picks) {
          const sq = k.square;
          if (sq == null) continue;
          const p = api.board.pieces[sq];
          if (p && p.color === api.me && p.type !== "k") zone.push(sq);
        }
        if (zone.length) addEffect(api, { kind: "shield", owner: api.me, squares: zone, turns: 1 });
      },
    },
  ),

  // --- tempo (3) ---

  card(
    { id: "bn4_relay_baton", name: "Relay Baton", tier: 6, category: "tempo", icon: "Zap",
      description: "The first time you castle or one of your pawns promotes, you immediately take an extra move. You cannot capture the king on the bonus move: your opponent replies first. Each later castle or promotion instead adds 8 seconds to your clock and grants 1 draft reroll.",
      flavor: "Pass the baton. Keep running anyway." },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        if (!isCastle(move) && !move.promotion) return;
        if (!inst.state.first) {
          // First handoff: the full extra move.
          inst.state.first = true;
          api.bs.extraMoves[api.me] += 1;
          return;
        }
        // Later handoffs pay a smaller reward. The engine cannot tell a timed
        // game from an untimed one, so grant both: the seconds (a no-op in
        // untimed play) and a reroll (the untimed substitute, useful in both).
        api.adjustClock({ addSelfSec: 8 });
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      },
      status: (inst) =>
        inst.state.first ? "later handoffs pay time and a reroll" : "waiting on the handoff",
    },
  ),
  card(
    { id: "bn4_glacier_calving", name: "Glacier Calving", tier: 6, category: "tempo", icon: "MountainSnow",
      description: "Up to three enemy pieces of your choice (their king excepted) are frozen for your opponent's next turn. Your next draft is then skipped.",
      flavor: "The ice decides when. The ice decided now." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to ice over (${picks.length + 1}/3)`,
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
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      },
    ),
  ),
  card(
    { id: "bn4_grandfather_clock", name: "Grandfather Clock", tier: 4, category: "tempo", icon: "Clock",
      description: "Add 60 seconds to your clock. In untimed games it adds nothing.",
      flavor: "It has stood in the hall for two hundred years, saving up." },
    instant((_inst, api) => api.adjustClock({ addSelfSec: 60 })),
  ),

  // --- info (2) ---

  card(
    { id: "bn4_ravens_court", name: "Raven's Court", tier: 6, category: "info", icon: "Bird",
      description: "See both the cards and the tier of your opponent's next draft offer, and gain 2 draft rerolls.",
      flavor: "The birds report to you now. They demand shiny payment." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
    }),
  ),
  card(
    { id: "bn4_lighthouse_beam", name: "Lighthouse Beam", tier: 5, category: "info", icon: "Lightbulb",
      description: "Every enemy piece standing in your half, and every enemy piece currently attacking a square in your half, lights up until your opponent replies.",
      flavor: "The beam does not judge. The keeper does." },
    instant((_inst, api) => {
      const hot: Square[] = [];
      for (const sq of mySquares(api.board, api.opp)) {
        if (inHalf(api.me, sq) && !hot.includes(sq)) hot.push(sq);
      }
      for (let sq = 0; sq < 64; sq++) {
        if (!inHalf(api.me, sq)) continue;
        for (const a of attackersOf(api.board, api.opp, sq)) {
          if (!hot.includes(a)) hot.push(a);
        }
      }
      flashSquares(api, hot);
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_royal_banquet", name: "Royal Banquet", tier: 6, category: "draft", icon: "UtensilsCrossed",
      description: "Your next draft shows three cards, and you keep all three.",
      flavor: "Course after course, and you own the kitchen." },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_patrons_favor", name: "Patron's Favor", tier: 7, category: "draft", icon: "Handshake",
      description: "Your next draft offer is fated to deal tier 7 cards. The favor costs the draft after it, which is skipped.",
      flavor: "Generosity with a ledger behind it." },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 7;
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_wind_up_knight", name: "Wind-Up Knight", tier: 6, category: "item", icon: "Cog",
      description: "Place a clockwork knight on an empty square on your home rank. It fights like the real thing, then winds down and leaves the board after 6 of your turns.",
      flavor: "Fully articulated. Batteries never included." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Wind it up and set it down", squares: homeRankEmpty(api) },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        api.place(sq, "n", api.me);
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 6, then: "remove" });
      },
    ),
  ),
  card(
    { id: "bn4_bottled_courage", name: "Bottled Courage", tier: 6, category: "item", icon: "FlaskConical",
      description: "Uncork it: your king cannot be captured for your opponent's next 2 turns, and every piece of yours standing beside him cannot be captured for those 2 turns either.",
      flavor: "Label says courage. Chemically, it is mostly stubbornness." },
    activatedSimple((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return;
      const squares = adjSquares(ks).filter((s) => {
        const p = api.board.pieces[s];
        return !!p && p.color === api.me;
      });
      if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 2 });
    }),
  ),

  // ===== TIER 7 ==============================================================
  // --- relief (12) ---

  card(
    { id: "bn4_hundred_days", name: "The Hundred Days", tier: 7, category: "nerf", icon: "CalendarDays",
      description: "Suspend your nerf for your next 12 turns.",
      flavor: "History gave the comeback a name before it gave it an ending." },
    suspendNow(12),
  ),
  card(
    { id: "bn4_jubilee", name: "Jubilee", tier: 7, category: "nerf", icon: "PartyPopper",
      description: "Suspend your nerf for your next 8 turns, and your next draft offer rolls one tier higher.",
      flavor: "Debts forgiven, streets full, rooks garlanded." },
    suspendNow(8, (api) => {
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    { id: "bn4_keys_to_the_city", name: "Keys to the City", tier: 7, category: "nerf", icon: "Key",
      description: "Free action: suspend your nerf for your next 8 turns, used at the moment you choose. While suspended, your pieces ignore the boundaries your nerf would impose.",
      flavor: "Every gate, every hour, no questions." },
    suspendFree(8),
  ),
  card(
    { id: "bn4_debtors_holiday", name: "Debtor's Holiday", tier: 7, category: "nerf", icon: "Banknote",
      description: "Suspend your nerf for your next 8 turns; your next draft offer rolls one tier higher.",
      flavor: "The ledgers closed for the season. The season is you." },
    suspendNow(8, (api) => {
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    { id: "bn4_siege_mentality", name: "Siege Mentality", tier: 8, category: "nerf", icon: "Castle",
      description: "For the rest of the game, whenever your opponent puts your king in check, your nerf is suspended for your next 3 turns.",
      flavor: "Every alarm bell rings a little freer." },
    reliefEvery(
      3,
      (m, api) => m.color === api.opp && isInCheck(api.board, api.me),
      "the walls remember every knock",
    ),
  ),
  card(
    { id: "bn4_grand_bargain", name: "The Grand Bargain", tier: 7, category: "nerf", icon: "Scale",
      description: "Suspend your nerf for your next 14 turns. In exchange, your next 3 drafts are skipped.",
      flavor: "Everything has a price. This one is merely enormous." },
    suspendNow(14, (api) => {
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 3;
    }),
  ),
  card(
    { id: "bn4_wardens_retirement", name: "Warden's Retirement", tier: 7, category: "nerf", icon: "DoorOpen",
      description: "Suspend your nerf for your next 4 turns. For the rest of the game, every capture you make suspends it for 2 more of your turns.",
      flavor: "Nobody replaced him. The cell door just swings." },
    {
      kind: "passive",
      init: (_inst, api) => susp(api, 4),
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        susp(api, 2);
      },
      status: () => "the watch is unmanned",
    },
  ),
  card(
    { id: "bn4_masked_ball", name: "Masked Ball", tier: 8, category: "nerf", icon: "VenetianMask",
      description: "Suspend your nerf for your next 6 turns, and your knights and bishops cannot be captured for your opponent's next 2 turns.",
      flavor: "Behind the masks, nobody owes anybody anything." },
    suspendNow(6, (api) => {
      const minors = mySquares(api.board, api.me).filter((sq) => {
        const t = api.board.pieces[sq]!.type;
        return t === "n" || t === "b";
      });
      if (minors.length) addEffect(api, { kind: "shield", owner: api.me, squares: minors, turns: 2 });
    }),
  ),
  card(
    { id: "bn4_written_in_stone", name: "Written in Stone", tier: 8, category: "nerf", icon: "Landmark",
      description: "After your next 10 turns, the inscription takes effect: your nerf is suspended for the 20 turns that follow.",
      flavor: "Slow to carve. Impossible to argue with." },
    reliefAfter(10, 20),
  ),
  card(
    { id: "bn4_half_moon_charter", name: "Half-Moon Charter", tier: 7, category: "nerf", icon: "Moon",
      description: "For the rest of the game, your nerf is suspended on every other one of your turns, starting with your next. The charter costs you your next two drafts, which are skipped.",
      flavor: "Half the nights are yours. It is in writing." },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.phase = 0;
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 2;
        susp(api, 1);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const phase = (((inst.state.phase as number) ?? 0) + 1) % 2;
        inst.state.phase = phase;
        if (phase === 0) susp(api, 1);
      },
      status: (inst) => ((((inst.state.phase as number) ?? 0) === 0) ? "moon up" : "moon down"),
    },
  ),
  card(
    { id: "bn4_royal_we", name: "The Royal We", tier: 8, category: "nerf", icon: "Crown",
      description: "Suspend your nerf for your next 7 turns, and your king cannot be captured for your opponent's next 2 turns.",
      flavor: "We are unbothered. We are, in fact, thriving." },
    suspendNow(7, (api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  card(
    { id: "bn4_uphill_battle", name: "Uphill Battle", tier: 7, category: "nerf", icon: "TrendingUp",
      description: "While your opponent has more pieces than you (kings aside), your nerf stays suspended, with enough slack to carry you two turns past the deficit.",
      flavor: "The slope teaches what the flat never could." },
    reliefWhile(
      (api) => armySize(api.board, api.me) < armySize(api.board, api.opp),
      "reading the slope",
      2,
    ),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_stormcrossing", name: "Stormcrossing", tier: 7, category: "movement", icon: "CloudLightning",
      description: "For your next 3 turns, your bishops, rooks and queen may slide straight through your own pieces (never capturing them) to squares beyond.",
      flavor: "When the sky opens, the army stops being in its own way.",
      fx: { motif: "empower", pieces: ["b", "r", "q"], self: true } },
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
      for (const from of mySquares(api.board, api.me, "b")) {
        out.push(...phasingSlideMoves(api.board, from, DIAG, inst.id, 8));
      }
      for (const from of mySquares(api.board, api.me, "r")) {
        out.push(...phasingSlideMoves(api.board, from, ORTHO_DIRS, inst.id, 8));
      }
      for (const from of mySquares(api.board, api.me, "q")) {
        out.push(...phasingSlideMoves(api.board, from, ALL_DIRS, inst.id, 8));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_kings_leap_year", name: "King's Leap Year", tier: 7, category: "movement", icon: "Rabbit",
      description: "For your next 3 turns, your king may leap like a knight (capturing allowed). Each leap's landing square is revealed and stays marked until your opponent replies.",
      flavor: "Once every so often, the calendar lets him.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "n", self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        const ks = kingSquare(api.board, api.me);
        if (ks == null) return;
        const leaps = [
          [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
        ] as const;
        addNovel(moves, leapMoves(api.board, ks, leaps, inst.id));
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        // Reveal the landing square: the strike flash lingers until the
        // opponent replies (it ticks on their turns).
        if (move.via === inst.id) flashSquares(api, [move.to]);
        const t = ((inst.state.turns as number) ?? 3) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 3} of your turns left`,
    },
  ),
  card(
    { id: "bn4_marshals_baton", name: "Marshal's Baton", tier: 7, category: "movement", icon: "Wand",
      description: "Redraw the whole line: move up to 3 of your pieces (your king excepted) to empty squares anywhere on the board. The first piece you move cannot be captured on your opponent's next turn.",
      flavor: "One sweep of the baton and the map apologizes." },
    ((base) => ({
      ...base,
      // Keep the original relocation, then shield the first arrival for one
      // opponent turn (turns: 1 is auto-compensated for the activation turn).
      effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
        base.effect!(inst, api, picks);
        for (let i = 0; i + 1 < picks.length; i += 2) {
          const to = picks[i + 1].square;
          if (to == null) continue;
          const p = api.board.pieces[to];
          if (p && p.color === api.me) {
            addEffect(api, { kind: "shield", owner: api.me, squares: [to], turns: 1 });
            break;
          }
        }
      },
    }))(relocateMany(3, (api) => emptySquares(api.board))),
  ),
  card(
    { id: "bn4_royal_barge", name: "Royal Barge", tier: 6, category: "movement", icon: "Sailboat",
      description: "Once, your queen may be carried to any empty square in your half.",
      flavor: "She does not travel. She arrives.", requires: ["q"] },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose your queen",
            squares: mySquares(api.board, api.me, "q"),
          };
        }
        return {
          kind: "square",
          label: "Choose her mooring",
          squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || from === to) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.me || p.type !== "q") return;
        if (api.board.pieces[to] || !inHalf(api.me, to)) return;
        api.relocate(from, to);
      },
    ),
  ),
  card(
    { id: "bn4_dancing_master", name: "Dancing Master", tier: 7, category: "movement", icon: "Music",
      description: "For your next 2 turns, your knights may also move like bishops and your bishops may also leap like knights.",
      flavor: "Switch partners on the count of two.", requires: ["n", "b"],
      fx: { motif: "empower", pieces: ["n", "b"], self: true } },
    timedAugment(2, (_moves, inst, api) => {
      const out: Move[] = [];
      const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
      const leaps = [
        [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
      ] as const;
      for (const from of mySquares(api.board, api.me, "n")) {
        out.push(...slideMoves(api.board, from, DIAG, inst.id));
      }
      for (const from of mySquares(api.board, api.me, "b")) {
        out.push(...leapMoves(api.board, from, leaps, inst.id));
      }
      return out;
    }),
  ),

  // --- pieces (6) ---

  card(
    { id: "bn4_cathedral_choir", name: "Cathedral Choir", tier: 7, category: "pieces", icon: "Church",
      description: "Place a new bishop on any empty square in your half.",
      flavor: "One more voice and the roof lifts." },
    placePieces(["b"], myHalf),
  ),
  card(
    { id: "bn4_relief_column", name: "Relief Column", tier: 6, category: "pieces", icon: "Truck",
      description: "Your best captured rook and your best captured minor (a bishop, or else a knight) both return to empty squares nearest your home rank. The muster costs your next draft, which is skipped.",
      flavor: "Dust on the road. Cheering on the walls." },
    instant((_inst, api) => {
      if (revivable(api, "r") > 0) {
        const sq = autoPlace(api, api.me, "r");
        if (sq != null) {
          api.place(sq, "r", api.me);
          markRevived(api, "r");
        }
      }
      for (const t of ["b", "n"] as PieceType[]) {
        if (revivable(api, t) > 0) {
          const sq = autoPlace(api, api.me, t);
          if (sq != null) {
            api.place(sq, t, api.me);
            markRevived(api, t);
          }
          break;
        }
      }
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_clay_colossus", name: "Clay Colossus", tier: 7, category: "pieces", icon: "Landmark",
      description: "Raise a rook of fired clay on an empty square on your home rank. It serves like the real thing, then crumbles after 8 of your turns.",
      flavor: "The kiln asked no questions. The wall asks fewer." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Raise the colossus", squares: homeRankEmpty(api) },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        api.place(sq, "r", api.me);
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 8, then: "remove" });
      },
    ),
  ),
  card(
    { id: "bn4_house_of_banners", name: "House of Banners", tier: 7, category: "pieces", icon: "Flag",
      description: "Choose up to two of your pawns that have reached the fifth rank or beyond. After your opponent's next move, each chosen pawn still standing is knighted where it stands.",
      flavor: "Two fields, two banners, one very loud herald.", requires: ["p"] },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.pawns != null
          ? null
          : {
              kind: "square",
              label: `Choose a pawn to knight (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.me, "p").filter(
                (sq) => relRank(api.me, sq) >= 5 && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.pawns != null) return;
        inst.state.pawns = picks.map((k) => k.square).filter((s): s is Square => s != null);
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || inst.state.pawns == null || move.color !== api.opp) return;
        // Delayed payoff: the banners rise only after the opponent replies.
        for (const sq of inst.state.pawns as Square[]) {
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me || p.type !== "p") continue;
          if (relRank(api.me, sq) < 5) continue;
          api.setPieceType(sq, "n");
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.pawns == null ? "activate to choose pawns" : "knighting after their reply",
    },
  ),
  card(
    { id: "bn4_second_spring", name: "Second Spring", tier: 7, category: "pieces", icon: "Sprout",
      description: "Every one of your captured pawns returns at once, each to the empty square nearest your home rank. Your next draft is then skipped.",
      flavor: "The field remembered every seed.", },
    instant((_inst, api) => {
      while (revivable(api, "p") > 0) {
        const sq = autoPlace(api, api.me, "p");
        if (sq == null) break;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
      }
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_promotion_charter", name: "Promotion Charter", tier: 7, category: "pieces", icon: "ScrollText",
      description: "For your opponent's next 4 turns, any pawn move of yours that reaches your opponent's second rank may promote to a queen on the spot, one rank early. The charter ends early the moment one such move captures.",
      flavor: "The law moved the border. The border moved the law.", requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      augmentMoves: (moves, inst, api) => {
        if (inst.spent || ((inst.state.turns as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        const fwd = api.me === "w" ? 1 : -1;
        for (const from of mySquares(api.board, api.me, "p")) {
          const tr = RANK(from) + fwd;
          if (tr < 0 || tr > 7) continue;
          for (const df of [-1, 0, 1]) {
            const f = FILE(from) + df;
            if (!inBoard(f, tr)) continue;
            const to = SQ(f, tr);
            if (relRank(api.me, to) !== 7) continue;
            const t = api.board.pieces[to];
            if (df === 0 ? t != null : !t || t.color !== api.opp || t.type === "k") continue;
            out.push({
              from,
              to,
              piece: "p",
              color: api.me,
              ...(t ? { captured: t.type, capturedSquare: to } : {}),
              promotion: "q",
              via: inst.id,
            } as Move);
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent) return;
        // The charter ends early once an early-promotion move captures.
        if (move.via === inst.id && move.color === api.me && move.captured) {
          inst.spent = true;
          return;
        }
        // Duration is measured in the opponent's turns.
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 4) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.turns as number) ?? 4} of their turns left`,
    },
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_sting_of_the_wasp", name: "Sting of the Wasp", tier: 7, category: "protection", icon: "Bug",
      description: "Choose one of your pieces (your king excepted); its square is marked until your opponent replies. When it is captured, the piece that took it is removed too (enemy kings survive the sting).",
      flavor: "One sting. Worth it. Every wasp agrees." },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the piece that stings back",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type === "k") return;
        inst.state.sq = sq;
        // Reveal the armed piece: the mark lingers until the opponent replies.
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        const died =
          (move.capturedSquare === sq && move.from !== sq) ||
          (move.to === sq && move.from !== sq);
        if (died && move.color === api.opp) {
          const avenger = api.board.pieces[move.to];
          if (avenger && avenger.color === api.opp && avenger.type !== "k") {
            api.removePiece(move.to);
          }
          inst.spent = true;
          return;
        }
        trackBoundPiece(inst, move);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to arm the sting"
          : `sting armed on ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    { id: "bn4_palace_walls", name: "Palace Walls", tier: 7, category: "protection", icon: "Castle",
      description: "No enemy piece may move onto your second rank for your opponent's next 2 turns. Any enemy piece already standing there may still leave.",
      flavor: "The first rank keeps the crown. The second keeps the promise." },
    instant((_inst, api) => {
      const r = ownRank(api.me, 1);
      const squares: Square[] = [];
      for (let f = 0; f < 8; f++) squares.push(SQ(f, r));
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
    }),
  ),
  card(
    { id: "bn4_griffins_brood", name: "Griffin's Brood", tier: 7, category: "protection", icon: "Egg",
      description: "Your knights and bishops cannot be captured for your opponent's next 3 turns.",
      flavor: "Touch the nest. See what hatches.",
      fx: { motif: "ward", pieces: ["n", "b"], self: true } },
    shieldZone(
      (api) =>
        mySquares(api.board, api.me).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return t === "n" || t === "b";
        }),
      3,
    ),
  ),
  card(
    { id: "bn4_saints_procession", name: "Saint's Procession", tier: 7, category: "protection", icon: "Sparkles",
      description: "For your opponent's next 2 turns, none of your pieces can be captured and your king cannot be taken. The blessing ends the moment one of your pieces makes a capture.",
      flavor: "The relics pass. Every blade waits its turn to kneel." },
    {
      kind: "passive",
      init: (_inst, api) => {
        addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || move.color !== api.me || !move.captured || move.captured === "k") return;
        // A protected piece drew blood: the whole procession's protection lifts.
        for (let i = api.bs.effects.length - 1; i >= 0; i--) {
          const e = api.bs.effects[i];
          if (
            (e.kind === "shield" && e.owner === api.me && e.squares == null) ||
            (e.kind === "king_safe" && e.owner === api.me)
          ) {
            api.bs.effects.splice(i, 1);
          }
        }
        inst.spent = true;
      },
      status: () => "the procession passes",
    },
  ),
  card(
    { id: "bn4_warding_circle", name: "Warding Circle", tier: 7, category: "protection", icon: "CircleDashed",
      description: "Chalk 4 empty squares of your choice: no enemy piece may ever move onto them, for the rest of the game.",
      flavor: "The chalk is cheap. The geometry is not." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Chalk a ward (${picks.length + 1}/4)`,
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null && !api.board.pieces[s]);
        if (squares.length) {
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
        }
      },
    ),
  ),

  // --- tempo (3) ---

  card(
    { id: "bn4_stolen_hour", name: "Stolen Hour", tier: 5, category: "tempo", icon: "Watch",
      description: "Steal 30 seconds from your opponent's clock and add them to yours. In untimed games nothing changes hands.",
      flavor: "Time is property. Property is theft. Ergo." },
    instant((_inst, api) => api.adjustClock({ stealFlatSec: 30, stealCapSec: 30 })),
  ),
  card(
    { id: "bn4_frozen_moat", name: "Frozen Moat", tier: 7, category: "tempo", icon: "Snowflake",
      description: "Every enemy piece standing in your half of the board (their king excepted) is frozen for your opponent's next turn.",
      flavor: "The invaders are welcome to stay. Indefinitely. Rigidly." },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (!inHalf(api.me, sq)) continue;
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "ice" });
      }
    }),
  ),
  card(
    { id: "bn4_lightning_rod", name: "Lightning Rod", tier: 7, category: "tempo", icon: "Zap",
      description: "The next time your opponent puts your king in check, you immediately gain an extra move. You cannot capture the king on a bonus move: your opponent replies first.",
      flavor: "Every strike grounds itself through you, and you keep the charge." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.opp || !isInCheck(api.board, api.me)) return;
        api.bs.extraMoves[api.me] += 1;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 1} charges left`,
    },
  ),

  // --- info (2) ---

  card(
    { id: "bn4_all_seeing_spire", name: "All-Seeing Spire", tier: 6, category: "info", icon: "TowerControl",
      description: "See both the cards and the tier of your opponent's next draft offer, and every enemy piece that no other enemy piece defends lights up until your opponent replies.",
      flavor: "From high enough, every secret is just scenery." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
      flashSquares(api, undefendedPieces(api.board, api.opp));
    }),
  ),
  card(
    { id: "bn4_auditors_ledger", name: "Auditor's Ledger", tier: 6, category: "info", icon: "BookOpen",
      description: "Every undefended piece on the board, yours and your opponent's alike, lights up until your opponent replies.",
      flavor: "The ledger flatters nobody. That is its entire charm." },
    instant((_inst, api) => {
      flashSquares(api, [
        ...undefendedPieces(api.board, api.me),
        ...undefendedPieces(api.board, api.opp),
      ]);
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_crown_commission", name: "Crown Commission", tier: 7, category: "draft", icon: "Award",
      description: "You keep both cards of your next draft offer, at its usual tier.",
      flavor: "Signed by the crown. Countersigned by your patience." },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_feast_of_fools", name: "Feast of Fools", tier: 7, category: "draft", icon: "Drumstick",
      description: "You keep both cards of your next draft offer, and gain 2 draft rerolls.",
      flavor: "Eat like a king. Fast like a monk. In that order." },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_genie_lamp", name: "Genie Lamp", tier: 7, category: "item", icon: "Lamp",
      description: "Rub the lamp for one random gift, equal odds each: a knight, a bishop or a rook into your pocket, 3 draft rerolls, or 30 seconds on your clock.",
      flavor: "No wish list. The genie has already decided." },
    activatedSimple((_inst, api) => {
      const roll = api.rng.int(5);
      if (roll === 0) grantInventory(api, "n", 1);
      else if (roll === 1) grantInventory(api, "b", 1);
      else if (roll === 2) grantInventory(api, "r", 1);
      else if (roll === 3) api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 3;
      else api.adjustClock({ addSelfSec: 30 });
    }),
  ),
  card(
    { id: "bn4_costume_trunk", name: "Costume Trunk", tier: 7, category: "item", icon: "Luggage",
      description: "Dress up to three of your pieces (your king excepted) from the trunk, forever (purely decorative). Costumed pieces cannot be captured on your opponent's next turn: nobody hits an actor mid-scene.",
      flavor: "The moths took the tragedy costumes. Comedy it is." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose a piece to costume (${picks.length + 1}/3)`,
              squares: mySquares(api.board, api.me).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const skins = ["hat", "sunglasses", "plush"] as const;
        const dressed: Square[] = [];
        picks.forEach((k, i) => {
          const sq = k.square;
          if (sq == null) return;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me || p.type === "k") return;
          pinCosmetic(api, sq, api.me, skins[i % skins.length]);
          dressed.push(sq);
        });
        if (dressed.length) {
          addEffect(api, { kind: "shield", owner: api.me, squares: dressed, turns: 1 });
        }
      },
    ),
  ),

  // ===== TIER 8 ==============================================================
  // --- relief (13) ---
  // Permanent nerf REMOVAL belongs to the existing top-end cards (Nerf
  // Breaker, Transcendence and kin); wave 4's tier-8 relief works the space
  // beside it: huge finite suspensions, permanent CONDITIONS, and bundles.

  card(
    { id: "bn4_queens_aegis", name: "Queen's Aegis", tier: 8, category: "nerf", icon: "Shield",
      description: "While your queen stands on the board, your nerf is suspended. Lose her, and it returns.",
      flavor: "Her shadow is wide enough to live in.", requires: ["q"] },
    reliefWhile((api) => mySquares(api.board, api.me, "q").length > 0, "sheltering under the aegis"),
  ),
  card(
    { id: "bn4_crown_jubilee", name: "Crown Jubilee", tier: 8, category: "nerf", icon: "Crown",
      description: "Suspend your nerf for your next 15 turns, your next draft shows three cards, and you gain 2 draft rerolls.",
      flavor: "Fifty years of reign, one afternoon of paperwork." },
    suspendNow(15, (api) => {
      api.mine.flags.prepThree = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
    }),
  ),
  card(
    { id: "bn4_pact_of_the_dawn", name: "Pact of the Dawn", tier: 8, category: "nerf", icon: "Sunrise",
      description: "Suspend your nerf for your next 12 turns, and every one of your captured pawns returns at once to squares nearest your home rank.",
      flavor: "The sun signed first." },
    suspendNow(12, (api) => {
      while (revivable(api, "p") > 0) {
        const sq = autoPlace(api, api.me, "p");
        if (sq == null) break;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
      }
    }),
  ),
  card(
    { id: "bn4_great_armistice", name: "The Great Armistice", tier: 8, category: "nerf", icon: "HeartHandshake",
      description: "Both players' nerfs are suspended for their next 10 turns, and neither side's pieces can be captured on the opponent's next turn.",
      flavor: "For ten turns, the war is only chess." },
    instant((_inst, api) => {
      susp(api, 10);
      susp(api, 10, api.opp);
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
      addEffect(api, { kind: "shield", owner: api.opp, squares: null, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_flag_on_their_wall", name: "Flag on Their Wall", tier: 8, category: "nerf", icon: "Flag",
      description: "While any piece of yours stands on your opponent's back rank, your nerf is suspended.",
      flavor: "Keep one boot on their battlements and breathe easy." },
    reliefWhile(
      (api) => mySquares(api.board, api.me).some((sq) => relRank(api.me, sq) === 8),
      "holding the far wall",
    ),
  ),
  card(
    { id: "bn4_hundred_year_lease", name: "Hundred-Year Lease", tier: 8, category: "nerf", icon: "ScrollText",
      description: "After your next 5 turns, the lease begins: your nerf is suspended for the 30 turns that follow.",
      flavor: "Practically forever, notarized." },
    reliefAfter(5, 30),
  ),
  card(
    { id: "bn4_royal_privilege", name: "Royal Privilege", tier: 8, category: "nerf", icon: "Gem",
      description: "For the rest of the game, every time you move your queen, your nerf is suspended for your next 2 turns.",
      flavor: "When she is working, the law looks away.", requires: ["q"] },
    reliefEvery(2, (m, api) => m.color === api.me && m.piece === "q", "the court defers to her"),
  ),
  card(
    { id: "bn4_tithe_of_time", name: "Tithe of Time", tier: 6, category: "nerf", icon: "Hourglass",
      description: "Suspend your nerf for your next 9 turns, and steal 20 seconds from your opponent's clock. In untimed games only the suspension applies.",
      flavor: "One tenth of their hours, owed and collected." },
    suspendNow(9, (api) => api.adjustClock({ stealFlatSec: 20, stealCapSec: 20 })),
  ),
  card(
    { id: "bn4_liberators_march", name: "Liberator's March", tier: 8, category: "nerf", icon: "Footprints",
      description: "For the rest of the game, every capture you make suspends your nerf for your next turn AND shields the capturing piece from capture on your opponent's next turn.",
      flavor: "Each blow rings twice: once for you, once for the ones still chained." },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        susp(api, 1);
        const p = api.board.pieces[move.to];
        if (p && p.color === api.me) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [move.to], turns: 1 });
        }
      },
      status: () => "the march never stops",
    },
  ),
  card(
    { id: "bn4_council_of_peace", name: "Council of Peace", tier: 8, category: "nerf", icon: "Landmark",
      description: "Suspend your nerf for your next 8 turns; for your opponent's next 2 turns none of your pieces can be captured and your king cannot be taken.",
      flavor: "The delegates argued for years. The treaty took a minute." },
    suspendNow(8, (api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  card(
    { id: "bn4_year_of_jubilee", name: "Year of Jubilee", tier: 8, category: "nerf", icon: "Sun",
      description: "Suspend your nerf for your next 25 turns.",
      flavor: "Not forever. Just longer than most games dare to last." },
    suspendNow(25),
  ),
  card(
    { id: "bn4_unequal_treaty", name: "The Unequal Treaty", tier: 8, category: "nerf", icon: "Scale",
      description: "Your nerf is suspended for your next 10 turns; your opponent's is suspended for their next 3. Diplomacy, as practiced.",
      flavor: "Both signatures are real. Only one of the pens was." },
    instant((_inst, api) => {
      susp(api, 10);
      susp(api, 3, api.opp);
    }),
  ),
  card(
    { id: "bn4_meek_inherit", name: "The Meek Inherit", tier: 8, category: "nerf", icon: "Bird",
      description: "While your opponent has at least as many pieces as you (kings aside), your nerf is suspended. Pull ahead in material, and it wakes.",
      flavor: "Blessed are the down-a-piece, for the rules shall carry them." },
    reliefWhile(
      (api) => armySize(api.board, api.me) <= armySize(api.board, api.opp),
      "counting both camps",
    ),
  ),

  // --- movement (5) ---

  card(
    { id: "bn4_kings_own_wings", name: "The King's Own Wings", tier: 8, category: "movement", icon: "Feather",
      description: "For the rest of the game, your king may leap like a knight (capturing allowed).",
      flavor: "Thrones are for sitting. Skies are for kings.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "n", self: true } },
    permanentAugment((_moves, inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return [];
      const leaps = [
        [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
      ] as const;
      return leapMoves(api.board, ks, leaps, inst.id);
    }),
  ),
  card(
    { id: "bn4_worldgate", name: "Worldgate", tier: 8, category: "movement", icon: "Orbit",
      description: "Open the great door: move up to 2 of your pieces (your king excepted) to empty squares anywhere on the board, all at once.",
      flavor: "Distance is a rumor." },
    relocateMany(2, (api) => emptySquares(api.board)),
  ),
  card(
    { id: "bn4_tide_of_pawns", name: "Tide of Pawns", tier: 8, category: "movement", icon: "Waves",
      description: "For the rest of the game, any of your pawns may advance two squares in one move from wherever it stands (both squares ahead must be empty, never onto the final rank).",
      flavor: "The sea does not ask which rank it started on.", requires: ["p"],
      fx: { motif: "rally", pieces: ["p"], self: true } },
    permanentAugment((_moves, inst, api) => {
      const out: Move[] = [];
      const fwd = api.me === "w" ? 1 : -1;
      for (const from of mySquares(api.board, api.me, "p")) {
        const midr = RANK(from) + fwd, tr = RANK(from) + 2 * fwd;
        if (tr < 0 || tr > 7) continue;
        const to = SQ(FILE(from), tr);
        if (relRank(api.me, to) > 7) continue;
        if (api.board.pieces[SQ(FILE(from), midr)] || api.board.pieces[to]) continue;
        out.push({ from, to, piece: "p", color: api.me, via: inst.id } as Move);
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_dukes_patent", name: "The Duke's Patent", tier: 8, category: "movement", icon: "Stamp",
      description: "For the rest of the game, your rooks may also step one square diagonally (capturing allowed).",
      flavor: "A single signature, and every tower learns to lean.", requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], moveAs: "b", self: true } },
    permanentAugment((_moves, inst, api) => {
      const out: Move[] = [];
      const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
      for (const from of mySquares(api.board, api.me, "r")) {
        out.push(...leapMoves(api.board, from, DIAG, inst.id));
      }
      return out;
    }),
  ),
  card(
    { id: "bn4_hall_of_doors", name: "Hall of Doors", tier: 8, category: "movement", icon: "DoorOpen",
      description: "For your next 5 turns, your king may step through any door: he may move to any empty square in your half of the board.",
      flavor: "Every room is the throne room if he is in it.",
      fx: { motif: "empower", pieces: ["k"], self: true } },
    timedAugment(5, (_moves, inst, api) => {
      const ks = kingSquare(api.board, api.me);
      if (ks == null) return [];
      const dests = emptySquares(api.board, (sq) => inHalf(api.me, sq) && sq !== ks);
      return teleportMoves(api.board, ks, dests, inst.id);
    }),
  ),

  // --- pieces (6) ---

  card(
    { id: "bn4_return_of_the_queen", name: "Return of the Queen", tier: 8, category: "pieces", icon: "Crown",
      description: "Your captured queen returns to an empty square on your home rank.",
      flavor: "The court kept her chair empty. The court knew." },
    reviveOne(["q"], (api) => (sq) => RANK(sq) === ownRank(api.me, 0)),
  ),
  card(
    { id: "bn4_founding_of_the_city", name: "Founding of the City", tier: 8, category: "pieces", icon: "Building2",
      description: "Place a new knight and a new bishop on empty squares on your home rank.",
      flavor: "First the walls, then the stables, then the cathedral. One turn total." },
    placePieces(["n", "b"], (api) => (sq) => RANK(sq) === ownRank(api.me, 0)),
  ),
  card(
    { id: "bn4_winter_garrison", name: "Winter Garrison", tier: 8, category: "pieces", icon: "Tent",
      description: "Place four new pawns on empty squares in your half. Each cannot be captured on your opponent's next turn while the camp is raised.",
      flavor: "Four tents, one stove, zero complaints worth writing down." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Pitch a tent (${picks.length + 1}/4)`,
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const placed: Square[] = [];
        for (const k of picks) {
          const sq = k.square;
          if (sq == null || api.board.pieces[sq] || !pawnRankOk(sq)) continue;
          api.place(sq, "p", api.me);
          placed.push(sq);
        }
        if (placed.length) {
          addEffect(api, { kind: "shield", owner: api.me, squares: placed, turns: 1 });
        }
      },
    ),
  ),
  card(
    { id: "bn4_endless_militia", name: "Endless Militia", tier: 8, category: "pieces", icon: "Users",
      description: "For the rest of the game, every one of your pawns that is captured returns at once to the empty square nearest your home rank (while there is room for it).",
      flavor: "The village signs up faster than the war can spend them.", requires: ["p"] },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.opp || move.captured !== "p") return;
        const sq = autoPlace(api, api.me, "p");
        if (sq == null) return;
        api.place(sq, "p", api.me);
        markRevived(api, "p");
      },
      status: () => "the muster roll never closes",
    },
  ),
  card(
    { id: "bn4_ascension_small", name: "Ascension of the Small", tier: 8, category: "pieces", icon: "Sparkles",
      description: "One of your knights or bishops ascends: it becomes a queen where it stands.",
      flavor: "Nobody saw it coming. It saw everything coming. That is why." },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece that ascends",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || (p.type !== "n" && p.type !== "b")) return;
        api.setPieceType(sq, "q");
      },
    ),
  ),
  card(
    { id: "bn4_menagerie_gates", name: "Menagerie Gates", tier: 8, category: "pieces", icon: "Gift",
      description: "The gates open: a knight, a bishop and two pawns all join your pocket, ready to be dropped onto empty squares on later turns (each drop spends that turn).",
      flavor: "Please do not feed the reserves. They feed themselves." },
    instant((_inst, api) => {
      grantInventory(api, "n", 1);
      grantInventory(api, "b", 1);
      grantInventory(api, "p", 2);
    }),
  ),

  // --- protection (5) ---

  card(
    { id: "bn4_age_of_peace", name: "Age of Peace", tier: 8, category: "protection", icon: "Dove",
      description: "For your opponent's next 3 turns, none of your pieces can be captured and your king cannot be taken.",
      flavor: "Three turns is an age, if you spend it right.",
      fx: { motif: "ward", pieces: "all", self: true } },
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 3 });
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
    }),
  ),
  card(
    { id: "bn4_haven_law", name: "Haven Law", tier: 8, category: "protection", icon: "Home",
      description: "For your opponent's next 3 turns, nothing of yours standing in your own half of the board can be captured.",
      flavor: "Within these borders, the old law holds: guests do not bite hosts.",
      fx: { motif: "ward", pieces: "all", self: true } },
    timedOppFilter(3, (moves, _inst, api) =>
      moves.filter((m) => {
        const cs = captureSquare(m);
        if (cs == null) return true;
        const p = api.board.pieces[cs];
        if (!p || p.color !== api.me) return true;
        return !inHalf(api.me, cs);
      }),
    ),
  ),
  card(
    { id: "bn4_guardian_of_the_line", name: "Guardian of the Line", tier: 8, category: "protection", icon: "ShieldCheck",
      description: "For the rest of the game, your queen cannot be captured while she stands beside your king.",
      flavor: "Two crowns, one shadow between them, no way through it.", requires: ["q"],
      fx: { motif: "ward", pieces: ["q"], self: true } },
    oppFilter((moves, _inst, api) =>
      nonEmpty(
        moves.filter((m) => {
          const cs = captureSquare(m);
          if (cs == null) return true;
          const p = api.board.pieces[cs];
          if (!p || p.color !== api.me || p.type !== "q") return true;
          const ks = kingSquare(api.board, api.me);
          if (ks == null) return true;
          return !adjSquares(ks).includes(cs);
        }),
        moves,
      ),
    ),
  ),
  card(
    { id: "bn4_wall_of_faith", name: "Wall of Faith", tier: 8, category: "protection", icon: "BrickWall",
      description: "Consecrate 6 empty squares of your choice: no enemy piece may ever move onto them, for the rest of the game.",
      flavor: "Stone believes nothing. This wall is not stone." },
    activated(
      (_inst, api, picks) =>
        picks.length >= 6
          ? null
          : {
              kind: "square",
              label: `Raise a wall segment (${picks.length + 1}/6)`,
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks
          .map((k) => k.square)
          .filter((s): s is Square => s != null && !api.board.pieces[s]);
        if (squares.length) {
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
        }
      },
    ),
  ),
  card(
    { id: "bn4_kings_champion", name: "The King's Champion", tier: 8, category: "protection", icon: "Swords",
      description: "Name one of your pieces (your king excepted) champion: for the rest of the game it can never be captured, and it may also step one square in any direction (capturing allowed).",
      flavor: "The title comes with a sword, a salary, and functional immortality." },
    bindPiece("Name your champion", bindCandidates(), {
      shieldTurns: null,
      gen: (board, sq, via) => leapMoves(board, sq, ALL_DIRS, via),
    }),
  ),

  // --- tempo (3) ---

  card(
    { id: "bn4_long_winter", name: "The Long Winter", tier: 8, category: "tempo", icon: "Snowflake",
      description: "Every enemy piece (their king excepted) is frozen for your opponent's next 2 turns, and your king cannot be captured on their next turn.",
      flavor: "The whole country holds its breath under the snow." },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
      }
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 1 });
    }),
  ),
  card(
    { id: "bn4_hourglass_throne", name: "Hourglass Throne", tier: 6, category: "tempo", icon: "Hourglass",
      description: "Add 60 seconds to your clock and steal 30 more from your opponent's. In untimed games nothing changes hands.",
      flavor: "Whoever sits the throne decides what late means." },
    instant((_inst, api) =>
      api.adjustClock({ addSelfSec: 60, stealFlatSec: 30, stealCapSec: 30 }),
    ),
  ),
  card(
    { id: "bn4_triumphal_arch", name: "Triumphal Arch", tier: 8, category: "tempo", icon: "Landmark",
      description: "Your next 3 captures each grant you an immediate extra move. You cannot capture the king on a bonus move: your opponent replies first.",
      flavor: "March through, wheel around, march through again." },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0 || move.color !== api.me) return;
        if (!move.captured || move.captured === "k") return;
        api.bs.extraMoves[api.me] += 1;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} triumphs left`,
    },
  ),

  // --- info (1) ---

  card(
    { id: "bn4_eye_of_ages", name: "Eye of Ages", tier: 7, category: "info", icon: "Eye",
      description: "See both the cards and the tier of your opponent's next draft offer, gain 3 draft rerolls, and every enemy piece that no other enemy piece defends lights up until your opponent replies.",
      flavor: "It has watched every game ever played. It is mildly impressed by yours." },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 3;
      flashSquares(api, undefendedPieces(api.board, api.opp));
    }),
  ),

  // --- draft (2) ---

  card(
    { id: "bn4_midas_charter", name: "Midas Charter", tier: 8, category: "draft", icon: "Coins",
      description: "Every one of your future drafts rolls one tier higher, for the rest of the game. The gold rush costs your next 2 drafts, which are skipped.",
      flavor: "Everything you touch turns to tier." },
    instant((_inst, api) => {
      api.mine.flags.stackBoost = Math.min(3, (api.mine.flags.stackBoost ?? 0) + 1);
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 2;
    }),
  ),
  card(
    { id: "bn4_deck_of_kings", name: "Deck of Kings", tier: 8, category: "draft", icon: "Layers",
      description: "Your next draft shows three cards, all fated to tier 8. In exchange you forfeit all of your draft rerolls, now and forever.",
      flavor: "Three crowns on the table. Pick the one that fits." },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.forceTier = 8;
      api.mine.rerollsLeft = 0;
    }),
  ),

  // --- item (2) ---

  card(
    { id: "bn4_cornucopia", name: "Cornucopia", tier: 8, category: "item", icon: "Apple",
      description: "The horn tips over: two pawns join your pocket, a knight or a bishop (at random, even odds) joins them, and you gain 1 draft reroll.",
      flavor: "It never runs out. It does judge your appetite." },
    activatedSimple((_inst, api) => {
      grantInventory(api, "p", 2);
      grantInventory(api, api.rng.int(2) === 0 ? "n" : "b", 1);
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    { id: "bn4_crown_of_masks", name: "Crown of Masks", tier: 8, category: "item", icon: "VenetianMask",
      description: "The grand carnival: every one of your pieces (your king excepted) is dressed from the trunk, forever (purely decorative), and none of your pieces can be captured on your opponent's next turn.",
      flavor: "An army nobody recognizes is an army nobody expected." },
    activatedSimple((_inst, api) => {
      const skins = ["hat", "sunglasses", "plush", "wooden", "gilded"] as const;
      const squares = mySquares(api.board, api.me).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      squares.forEach((sq, i) => pinCosmetic(api, sq, api.me, skins[i % skins.length]));
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
    }),
  ),
];
