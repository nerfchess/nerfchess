// Fantasy set: SUMMONING. A dragon (queen), a warband from a summoning circle
// (knight + bishop + pawn), and a humble imp familiar (pawn) are banked into
// your crazyhouse-style pocket (grantInventory, a free instant): you draft them
// now and spend a later turn to DROP each onto an empty square, so the summon
// costs no move. A phantom guardian and a stone golem instead serve for a while
// and then fade (summonTemp), and a wall of living thorns seals the squares
// around a point (barred neighbors). The engine's drop generator refuses to
// drop a pawn on rank 1 or 8, and the barred wall is partial, so nothing here
// can soft-lock a turn.

import { Buff, Square, PieceType, BuffApi, Mech } from "./shared";
import {
  card,
  summonTemp,
  myHalfZone,
  backRankZone,
  emptySquares,
  explodeAt,
  captureSquare,
  addEffect,
  leapMoves,
  mySquares,
  ALL_DIRS,
  SQ,
  inBoard,
  KNIGHT_LEAPS,
  FILE,
  RANK,
} from "./shared";

// Balance pass: wrap an activated mechanic so resolving it also consumes the
// caster's next unused reroll, if they have one. The base effect is preserved.
function consumesReroll(base: Mech): Mech {
  const inner = base.effect;
  return {
    ...base,
    effect: (inst, api, picks) => {
      inner?.(inst, api, picks);
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    },
  };
}

// Balance pass: a temporary summon (summonTemp) whose piece does not arrive at
// once, but only AFTER the opponent's next move. You pick the square now; the
// piece materializes on the opponent's reply (or on a deterministic empty
// square of the zone if the chosen one filled), then serves and fades as usual.
function delayedSummonTemp(
  type: Exclude<PieceType, "p" | "k">,
  turns: number,
  zone: (api: BuffApi) => (sq: Square) => boolean,
): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) =>
      picks.length > 0 || inst.state.sq != null || inst.state.pending != null
        ? null
        : {
            kind: "square",
            label: "Choose where your conjured piece will appear",
            squares: emptySquares(api.board, zone(api)),
          },
    effect: (inst, _api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null || inst.state.sq != null || inst.state.pending != null) return;
      inst.state.pending = sq;
    },
    onMovePlayed: (inst, move, api) => {
      // Delayed arrival: hold until the opponent has replied, then materialize.
      if (inst.state.pending != null && inst.state.sq == null) {
        if (move.color !== api.opp) return;
        let sq = inst.state.pending as Square;
        if (api.board.pieces[sq]) {
          const alt = emptySquares(api.board, zone(api))[0];
          if (alt == null) {
            inst.state.pending = undefined;
            inst.spent = true;
            return;
          }
          sq = alt;
        }
        api.place(sq, type, api.me);
        inst.state.sq = sq;
        inst.state.turns = turns;
        inst.state.pending = undefined;
        return;
      }
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      // Follow the conjured piece; retire it if captured or overrun.
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
      inst.state.pending != null && inst.state.sq == null
        ? "arrives after your opponent's next move"
        : inst.state.sq == null
          ? "activate to summon"
          : `conjured piece fades in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

export const FANTASY_SUMMONS: Buff[] = [
  card(
    {
      id: "imp_familiar",
      icon: "Cat",
      name: "Imp Familiar",
      description:
        "A smug little imp perches on an empty square of your back rank and fights as a bishop for 3 of your turns, then scampers back through the veil. Using it consumes your next unused reroll, if you have one.",
      tier: 2,
      category: "pieces",
      flavor: "Mostly loyal and entirely smug.",
    },
    consumesReroll(summonTemp("b", 3, backRankZone)),
  ),
  card(
    {
      id: "phantom_guardian",
      icon: "ShieldHalf",
      name: "Phantom Guardian",
      description:
        "Call up a phantom guardian: after your opponent's next move it appears and fights beside you as a bishop for 5 of your turns, then dissolves back into the aether.",
      tier: 4,
      category: "pieces",
      flavor: "Half here, half somewhere colder.",
    },
    delayedSummonTemp("b", 5, myHalfZone),
  ),
  card(
    {
      id: "wall_of_thorns",
      icon: "Fence",
      name: "Wall of Thorns",
      description:
        "A thicket of undying thorns bursts up around an empty square: your opponent can never enter any of the 8 squares around it, for the rest of the game.",
      tier: 6,
      category: "hex",
      flavor: "Every branch is a spear, and none of them wither.",
      fx: { motif: "blindfold" },
    },
    // 999 turns: outlasts any realistic game, so the card reads "for the game".
    barNeighbors(999, "Choose the empty square the thorns burst from"),
  ),
  card(
    {
      id: "stone_golem",
      icon: "Blocks",
      name: "Stone Golem",
      description:
        "Bind a spirit into rock and stone: a lumbering golem serves as a rook for 5 of your turns, then crumbles back to rubble.",
      tier: 5,
      category: "pieces",
      flavor: "Slow, patient, and extremely heavy.",
    },
    summonTemp("r", 5, myHalfZone),
  ),
  card(
    {
      id: "summoning_circle",
      icon: "Hexagon",
      name: "Summoning Circle",
      description:
        "Chalk the circle and speak a greater name: an Amazon steps through onto an empty square in your half and serves for four of your turns, moving as queen and knight both, then fades back through the circle. Whoever fells her is frozen in place for one of their turns instead of destroyed. Kings are too large to freeze in the circle.",
      tier: 8,
      category: "pieces",
      flavor: "One name spoken, and the candles all lean away.",
    },
    // Balance pass: the Amazon now serves only four of your turns (in your half)
    // and her revenge clause freezes her captor for one of their turns rather
    // than destroying it (kings exempt, so she creates no mate immunity).
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the Amazon steps through",
              squares: emptySquares(api.board, myHalfZone(api)),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.place(sq, "q", api.me);
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      // She also leaps like a knight (the amazon movement grant).
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "q") return;
        moves.push(...leapMoves(api.board, sq, KNIGHT_LEAPS, api.me));
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.to === sq && move.from !== sq) {
          // She was slain: the circle freezes her killer in place for one of
          // their turns (turns:2 nets one after the immediate tick a freeze
          // added on the frozen side's own move receives). Kings are exempt.
          const killer = api.board.pieces[move.to];
          if (killer && killer.color !== api.me && killer.type !== "k") {
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2 });
          }
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        // She serves for four of your turns, then fades back through the circle.
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
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to open the circle"
          : `Amazon at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}, ${(inst.state.turns as number) ?? 0} of your turns left`;
      },
    },
  ),
  card(
    {
      id: "summon_dragon",
      icon: "Sparkle",
      name: "Summon Dragon",
      description:
        "An actual dragon answers, but takes a beat to descend: choose an empty square in your half now, and after your opponent's next move a new queen lands there, so she cannot capture until they have replied. Whenever she captures, she breathes fire: every enemy piece except a king on the 8 squares around her kill is also removed. Shielded pieces resist the flame.",
      tier: 7,
      category: "pieces",
      flavor: "The oldest thing on the board, and the hungriest.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: one dragon per horn call.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null || inst.state.pending != null
          ? null
          : {
              kind: "square",
              label: "Choose where the dragon will land",
              squares: emptySquares(api.board, myHalfZone(api)),
            },
      // Balance pass: the dragon (the sole, highest-value spawn) cannot capture
      // until the opponent replies. Since there is no own-move filter, this is
      // enforced by delaying her arrival: you pick the square now and she is not
      // placed until after the opponent's next move.
      effect: (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null || inst.state.pending != null) return;
        inst.state.pending = sq;
      },
      onMovePlayed: (inst, move, api) => {
        // Delayed descent: hold until the opponent has replied, then materialize
        // (on a deterministic empty half-square if the chosen one has filled).
        if (inst.state.pending != null && inst.state.sq == null) {
          if (move.color !== api.opp) return;
          let sq = inst.state.pending as Square;
          if (api.board.pieces[sq]) {
            const alt = emptySquares(api.board, myHalfZone(api))[0];
            if (alt == null) {
              inst.state.pending = undefined;
              inst.spent = true;
              return;
            }
            sq = alt;
          }
          api.place(sq, "q", api.me);
          inst.state.sq = sq;
          inst.state.pending = undefined;
          return;
        }
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the dragon; the buff retires when she is slain.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
          if (move.color === api.me && move.captured && move.captured !== "k") {
            explodeAt(api, captureSquare(move) ?? move.to);
          }
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return inst.state.pending != null && sq == null
          ? "the dragon descends after your opponent's reply"
          : sq == null
            ? "activate to summon the dragon"
            : `dragon at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
];
