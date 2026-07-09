// Funny set: SLAPSTICK ITEMS. The bonk / trap family from the brainstorm doc,
// every one reusing an existing stun primitive (freeze / petrify) or a shield.
// Kings are never eligible targets (the freeze/petrify helpers enforce it), so
// nothing here can ever immobilize a king or soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  freezeTarget,
  freezeTargetTyped,
  activated,
  addEffect,
  mySquares,
  pawnRankOk,
  ORTHO_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

export const FUNNY_SLAPSTICK: Buff[] = [
  card(
    {
      id: "rake",
      icon: "Shovel",
      name: "Rake",
      description: "One enemy piece cannot move for 2 of their turns. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "Sideshow Bob would be proud.",
    },
    freezeTarget(2),
  ),
  card(
    {
      id: "snowball",
      icon: "CloudSnow",
      name: "Snowball",
      description: "One enemy pawn is frozen for 3 of their turns.",
      tier: 2,
      category: "item",
      flavor: "Right in the earmuffs.",
    },
    freezeTargetTyped(3, ["p"], "Choose an enemy pawn to snowball"),
  ),
  card(
    {
      id: "fly_swatter",
      icon: "Bug",
      name: "Fly Swatter",
      description: "One enemy knight is stunned for 2 of their turns. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "That buzzing was getting on your nerves.",
    },
    freezeTargetTyped(2, ["n"], "Choose an enemy knight to swat"),
  ),
  card(
    {
      id: "napping",
      icon: "Moon",
      name: "Napping",
      description: "One enemy knight falls fast asleep for 3 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "item",
      flavor: "Do not wake the horse.",
    },
    freezeTargetTyped(3, ["n"], "Choose an enemy knight to send to sleep"),
  ),
  card(
    {
      id: "anvil_drop",
      icon: "Anvil",
      name: "Anvil Drop",
      description: "Drop an ACME anvil on one enemy piece: it is flattened and cannot move for 3 of their turns, and the impact knocks it one square back toward its home rank. Kings cannot be targeted.",
      tier: 3,
      category: "item",
      flavor: "That whistling sound is never good.",
    },
    // A cartoon flatten: the freeze pile's stun PLUS a one-square knockback
    // toward the target's home rank (the boxing_glove shove, but the anvil
    // still lands and stuns even a piece with nowhere to be pushed).
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to flatten with the anvil",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        const back = api.opp === "w" ? -8 : 8;
        const dest = sq + back;
        const land =
          dest >= 0 &&
          dest < 64 &&
          !api.board.pieces[dest] &&
          (p.type !== "p" || pawnRankOk(dest))
            ? dest
            : sq;
        if (land !== sq) api.relocate(sq, land);
        addEffect(api, { kind: "freeze", sq: land, owner: api.opp, turns: 3, skin: "stun" });
        addEffect(api, { kind: "bonk", squares: [land], owner: api.me, turns: 1 });
      },
    ),
  ),
  card(
    {
      id: "super_glue",
      icon: "Droplet",
      name: "Super Glue",
      description:
        "Empty the tube on one enemy piece: it and every enemy piece orthogonally next to it are stuck fast and cannot move for 2 of their turns. Kings cannot be targeted or stuck.",
      tier: 3,
      category: "item",
      flavor: "Read the label next time.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to glue down",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        // Same freeze primitive as Anvil Drop, but a wider, shorter footprint:
        // the target plus its orthogonal enemy neighbours, each for 2 turns.
        const glue = (sq: number) => {
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.opp || p.type === "k") return;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "glue" });
        };
        glue(c);
        for (const [df, dr] of ORTHO_DIRS) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (inBoard(f, r)) glue(SQ(f, r));
        }
      },
    ),
  ),
  card(
    {
      id: "bear_trap",
      icon: "Scissors",
      name: "Bear Trap",
      description: "Snap a bear trap shut on one enemy piece: it is held in place and cannot move for 4 of their turns. Kings cannot be targeted.",
      tier: 4,
      category: "item",
      flavor: "It hops on one foot now.",
    },
    freezeTargetTyped(4, undefined, "Choose an enemy piece to trap", "chains"),
  ),
  card(
    {
      id: "bubble_wrap",
      icon: "Grip",
      name: "Bubble Wrap",
      description: "Shrink-wrap one of your own pieces: it cannot be captured for 3 turns, but it can only move for the last of them. Your king cannot be chosen.",
      tier: 2,
      category: "protection",
      boon: true,
      flavor: "Pop pop pop pop pop.",
      fx: { motif: "ward", pieces: ["p", "n", "b", "r", "q"], self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose your piece to bubble wrap",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        // A 3-turn shield over a 2-turn wrap. The shield gets the +1 activation
        // bump, so turns:2 becomes 3 of the opponent's turns. The freeze gets
        // no bump and self-ticks once on this activation turn, so turns:3 nets
        // 2 of your own turns wrapped: the piece is free again for the
        // shield's final turn.
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 3 });
      },
    ),
  ),
  card(
    {
      id: "boxing_glove",
      icon: "Hand",
      name: "Boxing Glove",
      description: "A spring-loaded glove punches one enemy piece one square back toward its own side and stuns it for 2 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "item",
      flavor: "SPROING.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const back = api.opp === "w" ? -8 : 8;
        return {
          kind: "square",
          label: "Choose an enemy piece to punch back",
          squares: mySquares(api.board, api.opp).filter((sq) => {
            const p = api.board.pieces[sq]!;
            if (p.type === "k") return false;
            const to = sq + back;
            return (
              to >= 0 &&
              to < 64 &&
              !api.board.pieces[to] &&
              (p.type !== "p" || pawnRankOk(to))
            );
          }),
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const back = api.opp === "w" ? -8 : 8;
        const to = sq + back;
        if (to >= 0 && to < 64 && !api.board.pieces[to]) {
          api.relocate(sq, to);
          addEffect(api, { kind: "freeze", sq: to, owner: api.opp, turns: 2, skin: "stun" });
        }
      },
    ),
  ),
];
