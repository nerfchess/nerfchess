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
      description: "One wide swing: every enemy pawn standing beside a piece you choose is raked one square back toward its home rank, wherever that square is free.",
      tier: 2,
      category: "item",
      flavor: "Sideshow Bob would be proud.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece that swings the rake",
              squares: mySquares(api.board, api.me),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const back = api.opp === "w" ? -8 : 8;
        for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (!inBoard(f, r)) continue;
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.opp || p.type !== "p") continue;
          const to = sq + back;
          if (to < 0 || to > 63) continue;
          if (!api.board.pieces[to] && pawnRankOk(to)) api.relocate(sq, to);
        }
      },
    ),
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
      description: "The enemy piece farthest from its own king sneaks a nap while nobody is watching: it is frozen for 3 of their turns. Kings never nap; ties pick the square nearest a1.",
      tier: 3,
      category: "item",
      flavor: "Do not wake the horse.",
    },
    {
      kind: "instant",
      effect: (_inst, api) => {
        const k = mySquares(api.board, api.opp, "k")[0];
        let best: number | null = null, bestD = -1;
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          const d =
            k == null
              ? 0
              : Math.max(Math.abs(FILE(sq) - FILE(k)), Math.abs(RANK(sq) - RANK(k)));
          if (d > bestD) {
            bestD = d;
            best = sq;
          }
        }
        if (best != null) {
          addEffect(api, { kind: "freeze", sq: best, owner: api.opp, turns: 3, skin: "sleep" });
        }
      },
    },
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
      description: "Hide a bear trap on an empty square, visible only in your nightmares: the first enemy piece except a king to step onto it is snapped up and cannot move for 4 of their turns.",
      tier: 4,
      category: "item",
      flavor: "It will hop on one foot from now on.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: once set, the trap never moves.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the empty square to hide the trap on",
              squares: (() => {
                const out: number[] = [];
                for (let sq = 0; sq < 64; sq++) if (!api.board.pieces[sq]) out.push(sq);
                return out;
              })(),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        if (move.color === api.opp && move.to === sq && move.piece !== "k") {
          // Added during their own move, so the shared post-move tick eats one
          // turn immediately: 5 here leaves exactly 4 of their turns trapped.
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 5, skin: "beartrap" });
          inst.spent = true;
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as number | undefined;
        return sq == null
          ? "activate to hide the trap"
          : `trap set at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
  card(
    {
      id: "bubble_wrap",
      icon: "Grip",
      name: "Bubble Wrap",
      description: "Shrink-wrap one of your own pieces: it cannot be captured for 3 turns, but it can only move for the last of them. Your king cannot be chosen.",
      tier: 3,
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
