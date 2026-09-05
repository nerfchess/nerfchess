// Fantasy nerfs: one handicap per tier from 1 to 8, each a bargain struck with
// something out of a story. Same contract as every nerf: a filter narrows your
// own moves and always keeps a fallback so you are never left without a legal
// move; loss conditions carry a progress bar so the count is never a surprise.

import { Nerf } from "./expanded/shared";
import {
  tierNerf,
  adj,
  onRim,
  relRank,
  FILE,
  RANK,
  PIECE_VALUE,
} from "./expanded/shared";

const N1 = tierNerf(1);
const N2 = tierNerf(2);
const N3 = tierNerf(3);
const N4 = tierNerf(4);
const N5 = tierNerf(5);
const N6 = tierNerf(6);
const N7 = tierNerf(7);
const N8 = tierNerf(8);

export const FANTASY_NERFS: Nerf[] = [
  N1(
    {
      id: "fn_pixie_curse",
      name: "Pixie Curse",
      description:
        "Your knights cannot move onto an edge square of the board, unless that is your only legal move.",
      flavor: "They pinch anything that strays to the fence.",
      icon: "sparkles",
    },
    {
      filterMoves: (moves) => {
        const kept = moves.filter((m) => m.piece !== "n" || !onRim(m.to));
        return kept.length ? kept : moves;
      },
    },
  ),
  N2(
    {
      id: "fn_gnomes_bargain",
      name: "Gnome's Bargain",
      description:
        "From your fourth move on, you cannot capture with the same type of piece that made your previous capture.",
      flavor: "Pay in a different coin every time.",
      icon: "coins",
    },
    {
      filterMoves: (moves, _s, ctx) => {
        if (ctx.moveNumber < 3) return moves;
        const mine = ctx.board.history.filter((m) => m.color === ctx.me && m.captured);
        const last = mine[mine.length - 1];
        if (!last) return moves;
        const kept = moves.filter((m) => !m.captured || m.piece !== last.piece);
        return kept.length ? kept : moves;
      },
    },
  ),
  N3(
    {
      id: "fn_selkie_skin",
      name: "Selkie Skin",
      description: "Your rooks cannot move more than 3 squares along a file. Moves along a rank are free.",
      flavor: "On land they walk short, remembering the sea.",
      icon: "waves",
    },
    {
      filterMoves: (moves) =>
        moves.filter(
          (m) => m.piece !== "r" || FILE(m.to) !== FILE(m.from) || Math.abs(RANK(m.to) - RANK(m.from)) <= 3,
        ),
    },
  ),
  N4(
    {
      id: "fn_trolls_toll",
      name: "Troll's Toll",
      description:
        "After you capture a pawn, your next move must be a pawn move, if you have one.",
      flavor: "Every crossing costs a foot soldier's step.",
      icon: "footprints",
    },
    {
      filterMoves: (moves, _s, ctx) => {
        if (ctx.myLastMove?.captured !== "p") return moves;
        const pawns = moves.filter((m) => m.piece === "p");
        return pawns.length ? pawns : moves;
      },
      hint: (_s, ctx, legal) =>
        ctx.myLastMove?.captured === "p" && legal.some((m) => m.piece === "p")
          ? { text: "Troll's Toll: a pawn must move this turn.", tone: "warn" }
          : null,
    },
  ),
  N5(
    {
      id: "fn_banshee_bond",
      name: "Banshee Bond",
      description:
        "Your queen may only move to a square next to one of your other pieces. If she has no such move, she stays put.",
      flavor: "She will not wander far from the ones she mourns.",
      icon: "ghost",
    },
    {
      filterMoves: (moves, _s, ctx) => {
        const kept = moves.filter((m) => {
          if (m.piece !== "q") return true;
          for (let sq = 0; sq < 64; sq++) {
            const p = ctx.board.pieces[sq];
            if (p && p.color === ctx.me && sq !== m.from && adj(sq, m.to)) return true;
          }
          return false;
        });
        return kept.length ? kept : moves;
      },
    },
  ),
  N6(
    {
      id: "fn_wyrm_hoard",
      name: "Wyrm Hoard",
      description:
        "You cannot capture a piece worth more than the piece you capture it with. Capturing the king is always allowed.",
      flavor: "A dragon takes only what it can carry.",
      icon: "gem",
    },
    {
      filterMoves: (moves) => {
        const kept = moves.filter(
          (m) => !m.captured || m.captured === "k" || PIECE_VALUE[m.captured] <= PIECE_VALUE[m.piece],
        );
        return kept.length ? kept : moves;
      },
    },
  ),
  N7(
    {
      id: "fn_lich_pact",
      name: "Lich Pact",
      description:
        "From your sixth move on, you lose if 6 of your turns pass in a row without one of your pieces ending its move in the enemy half of the board.",
      flavor: "Feed it ground, or it feeds on you.",
      icon: "skull",
    },
    {
      init: () => ({ idle: 0 }),
      onTurnStart: (_state, ctx) => {
        // How many of my most recent turns stayed in my own half, counting
        // back from the latest move until one crossed over.
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        let idle = 0;
        for (let i = mine.length - 1; i >= 0; i--) {
          if (relRank(ctx.me, mine[i].to) >= 5) break;
          idle++;
        }
        return { idle };
      },
      filterMoves: (moves, state, ctx) => {
        // On the last quiet turn the pact allows, only crossings are legal if
        // any exist, so it can still be honoured at the final moment.
        if (ctx.moveNumber < 5 || (state.idle as number) < 5) return moves;
        const feeding = moves.filter((m) => relRank(ctx.me, m.to) >= 5);
        return feeding.length ? feeding : moves;
      },
      checkLoss: (state, ctx) =>
        ctx.moveNumber >= 5 && (state.idle as number) >= 6 ? { reason: "the pact went unfed" } : null,
      progress: (state) => ({
        value: Math.min(6, state.idle as number),
        max: 6,
        label: `${Math.min(6, state.idle as number)}/6 turns without crossing`,
      }),
    },
  ),
  N8(
    {
      id: "fn_titans_yoke",
      name: "Titan's Yoke",
      description:
        "On every second turn of yours, you must move your king if it has a legal move.",
      flavor: "The chain is short and the giant is patient.",
      icon: "anchor",
    },
    {
      filterMoves: (moves, _s, ctx) => {
        if (ctx.moveNumber % 2 === 0) return moves;
        const king = moves.filter((m) => m.piece === "k");
        return king.length ? king : moves;
      },
      hint: (_s, ctx, legal) =>
        ctx.moveNumber % 2 === 1 && legal.some((m) => m.piece === "k")
          ? { text: "Titan's Yoke: the king must move this turn.", tone: "warn" }
          : null,
    },
  ),
];
