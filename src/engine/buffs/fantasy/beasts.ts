// Fantasy set: DRAGONS & BEASTS. Great monsters that either tear a line through
// the enemy (lineSweep, the same primitive as Cavalry Charge), turn a foe to
// stone (petrify/walnut), carry your own pieces across the board (relocate), or
// arrive as reinforcements (placePieces / summonTemp). Nothing here touches a
// king's move legality in a way that could soft-lock; the petrify helpers never
// target a king.

import { Buff } from "./shared";
import {
  card,
  activated,
  emptySquares,
  lineSweep,
  placePieces,
  relocateMany,
  myHalfZone,
  mySquares,
  addEffect,
  turnsLeft,
  ORTHO_DIRS,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
  type Square,
  type BuffApi,
  type Mech,
} from "./shared";

// Balance pass (Dragon's Breath): a rook sweeps down a straight orthogonal
// line, removing every enemy piece in its path and landing beyond, once. Unlike
// the base lineSweep it may also be aimed down a line with nothing to burn: a
// failed or illegal attempt (an empty-line whiff) still spends the one-shot
// charge (glossary directive). Friendly pieces and kings block the ray.
function dragonsBreathSweep(): Mech {
  const dests = (api: BuffApi, from: Square): Square[] => {
    const out: Square[] = [];
    for (const [df, dr] of ORTHO_DIRS) {
      let f = FILE(from) + df, r = RANK(from) + dr;
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p && (p.color === api.me || p.type === "k")) break;
        out.push(sq);
        f += df;
        r += dr;
      }
    }
    return out;
  };
  return activated(
    (_inst, api, picks) => {
      if (picks.length >= 2) return null;
      if (picks.length === 0) {
        return {
          kind: "square",
          label: "Choose the rook that breathes fire",
          squares: mySquares(api.board, api.me, "r").filter((sq) => dests(api, sq).length > 0),
        };
      }
      return {
        kind: "square",
        label: "Choose where the fire ends",
        squares: dests(api, picks[0].square!),
      };
    },
    (_inst, api, picks) => {
      const from = picks[0]?.square, to = picks[1]?.square;
      if (from == null || to == null || from === to) return;
      const df = Math.sign(FILE(to) - FILE(from)), dr = Math.sign(RANK(to) - RANK(from));
      let f = FILE(from) + df, r = RANK(from) + dr;
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
        if (sq === to) break;
        f += df;
        r += dr;
      }
      if (!api.board.pieces[to]) api.relocate(from, to);
    },
  );
}

export const FANTASY_BEASTS: Buff[] = [
  card(
    {
      id: "dragons_breath",
      icon: "FlameKindling",
      name: "Dragon's Breath",
      description:
        "One rook captures every enemy piece in a straight line in a single move, once. Loosing the breath spends the card even if the line is empty and nothing burns.",
      tier: 7,
      category: "attack",
      requires: ["r"],
      flavor: "Everything in the corridor turns to ash.",
    },
    dragonsBreathSweep(),
  ),
  card(
    {
      id: "wyverns_dive",
      icon: "Feather",
      name: "Wyvern's Dive",
      description:
        "A wyvern folds its wings and dives: one of your knights streaks in a straight line, snatches the first enemy piece it reaches, and lands just beyond, once.",
      tier: 4,
      category: "attack",
      requires: ["n"],
      flavor: "The shriek comes a heartbeat before the talons.",
    },
    lineSweep("n", ALL_DIRS, 1),
  ),
  card(
    {
      id: "basilisk_stare",
      icon: "Eye",
      name: "Basilisk's Gaze",
      description:
        "Turn one enemy piece to stone. It may make one last legal move to escape; then it becomes a walnut that can only shuffle one square at a time for 4 of their turns, and while petrified it cannot capture. Kings cannot be targeted.",
      tier: 3,
      category: "hex",
      flavor: "Do not, under any circumstance, look back.",
      fx: { motif: "jail" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to turn to stone",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      // Balance pass: the first affected piece gets one legal escape move. The
      // gaze marks the target now but does not petrify it until it has taken one
      // move; the walnut then bites where it lands for the full 4 of their turns.
      effect: (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        inst.state.escaped = false;
      },
      // While petrified the stone piece may still take its one-square shuffle,
      // but never as a capture: strip its captures from the cursed side's moves.
      // No restriction until the escape move has been spent.
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || !inst.state.escaped || turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => !(m.from === sq && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // The marked piece was captured or overrun: the gaze ends.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
          if (!inst.state.escaped && move.color === api.opp) {
            // That was the one legal escape: the stone takes hold where it
            // lands. turns:5 nets 4 of their turns after the immediate tick a
            // walnut added on the petrified side's own move receives.
            inst.state.escaped = true;
            addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 5 });
            return;
          }
        }
        // Tick on the petrified side's own turns, in step with the walnut, only
        // once the escape has been spent.
        if (move.color !== api.opp || !inst.state.escaped) return;
        const left = turnsLeft(inst) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to petrify"
          : inst.state.escaped
            ? `petrified, ${turnsLeft(inst)} of their turns left`
            : "the gaze waits: one escape move remains",
    },
  ),
  card(
    {
      id: "serpent_brood",
      icon: "Worm",
      name: "Serpent Brood",
      description:
        "Venomous stone serpents coil around the enemy clergy: every one of your opponent's bishops turns to a walnut for 4 of their turns, and the venom lingers so no enemy bishop may capture for the rest of the game.",
      tier: 6,
      category: "hex",
      flavor: "Marble scales, and not a single blink.",
      fx: { motif: "muzzle", pieces: ["b"] },
    },
    {
      kind: "passive",
      // Petrify every enemy bishop for 4 turns, once, on the draft.
      init: (_inst, api) => {
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "b") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
          }
        }
      },
      // The lingering venom: enemy bishops can never capture again.
      filterOpponentMoves: (moves) => {
        const kept = moves.filter((m) => !(m.piece === "b" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      status: () => "enemy bishops cannot capture",
    },
  ),
  card(
    {
      id: "griffon_rider",
      icon: "Bird",
      name: "Griffon Rider",
      description:
        "Move up to two of your pieces to any empty squares, once.",
      tier: 6,
      category: "movement",
      flavor: "Hold on tight and mind the updraft.",
    },
    relocateMany(2, () => Array.from({ length: 64 }, (_v, i) => i as Square)),
  ),
  card(
    {
      id: "direwolf_pack",
      icon: "PawPrint",
      name: "Direwolf Pack",
      description:
        "Two spectral direwolves answer your howl: place two knights on empty squares in your half. The pack melts back into the mist after 5 of your turns. Using it consumes your next unused reroll, if you have one.",
      tier: 4,
      category: "pieces",
      flavor: "The pack always returns to the wild.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose where a direwolf appears (${picks.length + 1}/2)`,
              squares: emptySquares(api.board, myHalfZone(api)).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square == null || api.board.pieces[k.square]) continue;
          api.place(k.square, "n", api.me);
          // The pack departs on its own: a timed_loss removes each wolf after
          // 5 of your turns (pruned early if it is captured first).
          addEffect(api, { kind: "timed_loss", owner: api.me, sq: k.square, turns: 5, then: "remove" });
        }
        // Balance pass: the howl consumes the next unused reroll, if any.
        api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
      },
    ),
  ),
  card(
    {
      id: "roost_of_rocs",
      icon: "Egg",
      name: "Roost of Rocs",
      description:
        "Three titanic rocs descend and perch along the board's edge: place three knights on empty squares of the outer rim, then skip your next draft.",
      tier: 7,
      category: "pieces",
      flavor: "Their shadows blot out the board.",
    },
    // Balance pass: preserve all three spawns and their placement, but placing
    // them costs you your next draft.
    (() => {
      const base = placePieces(["n", "n", "n"], () => (sq: Square) => {
        const f = sq % 8, r = Math.floor(sq / 8);
        return f === 0 || f === 7 || r === 0 || r === 7;
      });
      return {
        ...base,
        effect: (inst, api, picks) => {
          base.effect?.(inst, api, picks);
          api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
        },
      };
    })(),
  ),
];
