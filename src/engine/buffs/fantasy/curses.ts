// Fantasy set: CURSES & DARK MAGIC. Malevolent enchantments laid on the enemy.
// Most are timed opponent-move filters built on the shared `curse` helper,
// which guarantees the filter is partial (if a curse would leave the opponent
// with zero moves it falls back to the full move list), plus a couple of mass
// petrifications (walnutAll) and a single freeze. Nothing here can soft-lock a
// turn, and the petrify helpers never touch a king.

import { Buff, Square } from "./shared";
import {
  card,
  curse,
  inHalf,
  mySquares,
  addEffect,
  turnsLeft,
  tickTurns,
  FILE,
  RANK,
} from "./shared";

export const FANTASY_CURSES: Buff[] = [
  card(
    {
      id: "evil_eye",
      icon: "EyeOff",
      name: "Evil Eye",
      description:
        "One enemy piece you choose cannot capture anything for 4 of their turns. It may still move. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "It feels the stare and dares not strike.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: the eye fixes on a single piece.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece the eye fixes on",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => m.from !== sq || !m.captured);
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the watched piece; the eye closes when it is captured.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color === api.opp) tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to fix the eye"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  card(
    {
      id: "shackle_the_queen",
      icon: "Lock",
      name: "Shackle the Queen",
      description:
        "Bind the enemy queen in cursed iron: your opponent cannot move their queen for their next 4 turns.",
      tier: 4,
      category: "hex",
      flavor: "Even a crown answers to a good enough chain.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    curse(4, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  card(
    {
      id: "curse_of_frailty",
      icon: "HeartPulse",
      name: "Curse of Frailty",
      description:
        "A wasting curse saps the enemy's strength: for their next 3 turns your opponent cannot capture, and no piece of theirs may slide more than two squares.",
      tier: 5,
      category: "hex",
      flavor: "Every sword arm goes soft as wax.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.captured) return false;
        const dist = Math.max(
          Math.abs(FILE(m.to) - FILE(m.from)),
          Math.abs(RANK(m.to) - RANK(m.from)),
        );
        return dist <= 2;
      }),
    ),
  ),
  card(
    {
      id: "doom_march",
      icon: "Footprints",
      name: "Doom March",
      description:
        "The march ends where it stands: enemy pieces that have crossed into your half of the board are gripped by dread and cannot move, for your opponent's next 4 turns.",
      tier: 5,
      category: "hex",
      flavor: "Every step forward was one step too many.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(4, (moves, api) => moves.filter((m) => !inHalf(api.me, m.from))),
  ),
  card(
    {
      id: "chains_of_binding",
      icon: "Anchor",
      name: "Chains of Binding",
      description:
        "A spectral chain shackles the enemy's rooks to each other: while both live, neither rook may end a move more than 3 squares from the other, for your opponent's next 5 turns. A lone rook drags its broken chain and moves freely.",
      tier: 5,
      category: "hex",
      flavor: "The clank of iron, wherever the other tower goes.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(5, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "r") return true;
        const other = mySquares(api.board, api.opp, "r").find((sq) => sq !== m.from);
        if (other == null) return true;
        return (
          Math.max(Math.abs(FILE(m.to) - FILE(other)), Math.abs(RANK(m.to) - RANK(other))) <= 3
        );
      }),
    ),
  ),
  card(
    {
      id: "hex_of_stone",
      icon: "Mountain",
      name: "Hex of Stone",
      description:
        "A creeping grey hex hardens the enemy's flanks: every one of your opponent's knights and bishops turns to a walnut for 4 of their turns, and for those 4 turns their rooks and queen may slide no more than two squares.",
      tier: 7,
      category: "hex",
      flavor: "The cavalry and the clergy, all one quarry now.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    {
      kind: "passive",
      // Petrify the minors for 4 turns, once, and open a 4-turn clamp window.
      init: (inst, api) => {
        inst.state.turns = 4;
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t === "n" || t === "b") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
          }
        }
      },
      // While the window runs, heavy pieces move like leaden things: a rook or
      // queen may cover at most two squares. Never empties the move list.
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => {
          if (m.piece !== "r" && m.piece !== "q") return true;
          const dist = Math.max(
            Math.abs(FILE(m.to) - FILE(m.from)),
            Math.abs(RANK(m.to) - RANK(m.from)),
          );
          return dist <= 2;
        });
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];
