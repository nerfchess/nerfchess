// Funny set: SLAPSTICK ITEMS. The bonk / trap family from the brainstorm doc,
// every one reusing an existing stun primitive (freeze / petrify) or a shield.
// Kings are never eligible targets (the freeze/petrify helpers enforce it), so
// nothing here can ever immobilize a king or soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  freezeTarget,
  freezeTargetTyped,
  petrifyTarget,
  activated,
  addEffect,
  mySquares,
  pawnRankOk,
} from "./shared";

export const FUNNY_SLAPSTICK: Buff[] = [
  card(
    {
      id: "rake",
      name: "Rake",
      description: "Bonk one enemy piece with a rake handle: it is stunned and cannot move for 1 of their turns. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "Sideshow Bob would be proud.",
    },
    freezeTarget(1),
  ),
  card(
    {
      id: "snowball",
      name: "Snowball",
      description: "Pack a snowball and peg one enemy pawn: it freezes solid for 2 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "item",
      flavor: "Right in the earmuffs.",
    },
    freezeTargetTyped(2, ["p"], "Choose an enemy pawn to snowball"),
  ),
  card(
    {
      id: "fly_swatter",
      name: "Fly Swatter",
      description: "Swat one enemy knight, the little horsefly: it is stunned for 1 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "item",
      flavor: "That buzzing was getting on your nerves.",
    },
    freezeTargetTyped(1, ["n"], "Choose an enemy knight to swat"),
  ),
  card(
    {
      id: "napping",
      name: "Napping",
      description: "One enemy knight falls fast asleep for 2 of their turns. Kings cannot be targeted.",
      tier: 4,
      category: "item",
      flavor: "Do not wake the horse.",
    },
    freezeTargetTyped(2, ["n"], "Choose an enemy knight to send to sleep"),
  ),
  card(
    {
      id: "anvil_drop",
      name: "Anvil Drop",
      description: "Drop an ACME anvil on one enemy piece: it is flattened and cannot move for 2 of their turns. Kings cannot be targeted.",
      tier: 5,
      category: "item",
      flavor: "That whistling sound is never good.",
    },
    freezeTarget(2),
  ),
  card(
    {
      id: "super_glue",
      name: "Super Glue",
      description: "Glue one enemy piece to its square: it is stuck fast and cannot move for 2 of their turns. Kings cannot be targeted.",
      tier: 4,
      category: "item",
      flavor: "Read the label next time.",
    },
    petrifyTarget(2, "Choose an enemy piece to glue down"),
  ),
  card(
    {
      id: "bear_trap",
      name: "Bear Trap",
      description: "Snap a bear trap shut on one enemy piece: it is held in place and cannot move for 3 of their turns. Kings cannot be targeted.",
      tier: 5,
      category: "item",
      flavor: "It hops on one foot now.",
    },
    petrifyTarget(3, "Choose an enemy piece to trap"),
  ),
  card(
    {
      id: "bubble_wrap",
      name: "Bubble Wrap",
      description: "Shrink-wrap one of your own pieces: it cannot be captured for 2 turns, but it also cannot move while wrapped. Your king cannot be chosen.",
      tier: 4,
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
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "boxing_glove",
      name: "Boxing Glove",
      description: "A spring-loaded glove punches one enemy piece one square back toward its own side and stuns it for 1 of their turns. Kings cannot be targeted.",
      tier: 6,
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
          addEffect(api, { kind: "freeze", sq: to, owner: api.opp, turns: 1 });
        }
      },
    ),
  ),
];
