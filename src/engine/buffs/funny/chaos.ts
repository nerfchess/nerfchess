// Funny set: CHAOS & BOARD EFFECTS that map onto existing removal / zoning
// primitives. Roulette reuses the seeded RNG + removePiece (like Scout's init).
// Minefield and Trapdoor reuse voidSquares (remove an enemy that steps onto a
// marked square; kings are spared by the helper). Lava Floor reuses barred
// squares (barLine), the same mechanic the sealed-file hexes already ship, so
// the opening can never be barred into a soft-lock. Kraken is a living hazard:
// it bars only its own square, then each of the opponent's next 2 turns reuses
// Magnet's one-step pull (relocate) and the freeze grip on adjacent pieces.

import { Buff, Square } from "./shared";
import {
  card,
  instant,
  voidSquares,
  barLine,
  activated,
  addEffect,
  emptySquares,
  mySquares,
  dist,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

/** One king-step from `from` toward `toward`, or null at the board edge. A
 * local copy of the library's private pull step (Magnet / Gravity Well). */
const stepToward = (from: number, toward: number): number | null => {
  const df = Math.sign(FILE(toward) - FILE(from));
  const dr = Math.sign(RANK(toward) - RANK(from));
  if (df === 0 && dr === 0) return null;
  const f = FILE(from) + df, r = RANK(from) + dr;
  return inBoard(f, r) ? SQ(f, r) : null;
};

export const FUNNY_CHAOS: Buff[] = [
  card(
    {
      id: "roulette",
      icon: "Dices",
      name: "Roulette",
      description: "Spin the wheel: one random enemy piece other than the king is removed from the board.",
      tier: 5,
      category: "attack",
      flavor: "Round and round she goes.",
    },
    instant((_inst, api) => {
      const targets = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      if (targets.length) api.removePiece(targets[api.rng.int(targets.length)]);
    }),
  ),
  card(
    {
      id: "trapdoor",
      icon: "DoorOpen",
      name: "Trapdoor",
      description: "Open a trapdoor on an empty square. For your next 3 turns, any enemy piece except a king that moves onto that square is removed from the game.",
      tier: 4,
      category: "attack",
      flavor: "Mind the gap.",
    },
    voidSquares(1, 3),
  ),
  card(
    {
      id: "minefield",
      icon: "Bomb",
      name: "Minefield",
      description: "Seed three mines on empty squares. The first enemy piece, never the king, to step on a mine is destroyed.",
      tier: 6,
      category: "attack",
      flavor: "Click... uh oh.",
    },
    voidSquares(3, null),
  ),
  card(
    {
      id: "kraken",
      icon: "Fish",
      name: "Kraken",
      description:
        "A kraken surfaces on an empty square. For your opponent's next 2 turns, at the end of each of their turns it drags the nearest enemy piece one square toward it whenever the square between is empty, then seizes any enemy piece left next to it so that piece cannot move on its next turn. Kings are never dragged or seized, and the kraken's square cannot be entered.",
      tier: 6,
      category: "hex",
      flavor: "Release the tentacles.",
      fx: { motif: "anchor" },
    },
    // A living hazard, not static zoning: it borrows Magnet's one-step pull and
    // the freeze grip, run on each of the opponent's next 2 turns.
    activated(
      (inst, api, picks) =>
        picks.length > 0 || inst.state.kraken != null
          ? null
          : {
              kind: "square",
              label: "Choose the empty square the kraken rises on",
              squares: emptySquares(api.board),
            },
      (inst, api, picks) => {
        if (inst.state.kraken != null) return;
        const c = picks[0]?.square;
        if (c == null) return;
        inst.state.kraken = c;
        inst.state.turns = 2;
        // Bar only the kraken's own square: it is visible to both sides and
        // cannot be entered. A single square is never a board-splitting wall.
        addEffect(api, { kind: "barred", squares: [c], against: api.opp, turns: 2 });
      },
      {
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          const k = inst.state.kraken as Square | undefined;
          if (k == null || move.color !== api.opp) return;
          let left = (inst.state.turns as number) ?? 0;
          if (left <= 0) return;
          // Drag: pull the nearest enemy piece (never a king) one king-step
          // toward the kraken when the square between them is empty.
          const prey = mySquares(api.board, api.opp).filter(
            (sq) => sq !== k && api.board.pieces[sq]!.type !== "k",
          );
          let best: Square | null = null;
          let bestD = Infinity;
          for (const sq of prey) {
            const d = dist(sq, k);
            if (d < bestD) {
              bestD = d;
              best = sq;
            }
          }
          if (best != null) {
            const step = stepToward(best, k);
            if (step != null && step !== k && !api.board.pieces[step]) {
              api.relocate(best, step);
            }
          }
          // Grip: any enemy piece now next to the kraken is seized for its next
          // turn. Reuses the freeze primitive, so a king is never held.
          for (const [df, dr] of ALL_DIRS) {
            const f = FILE(k) + df, r = RANK(k) + dr;
            if (!inBoard(f, r)) continue;
            const sq = SQ(f, r);
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "vines" });
            }
          }
          left -= 1;
          inst.state.turns = left;
          if (left <= 0) inst.spent = true;
        },
        status: (inst) =>
          inst.state.kraken == null
            ? "activate to raise the kraken"
            : `kraken hunting: ${(inst.state.turns as number) ?? 0} of their turns left`,
      },
    ),
  ),
  card(
    {
      id: "lava_floor",
      icon: "Flame",
      name: "Lava Floor",
      description: "A whole rank erupts into lava: pick any square and its entire rank becomes impassable to your opponent for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "The floor is, in fact, lava.",
      fx: { motif: "blindfold" },
    },
    barLine("rank", 3),
  ),
];
