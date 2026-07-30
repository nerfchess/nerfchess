// Creator card set: one signature rule per chess creator, plus the format card.
//
// WHY THESE MECHANICS. A card named after somebody that plays like a generic
// freeze is worth nothing to them, so each one is built to be recognisably that
// person: Rosen's card is a bishop that will not die and will not kill, Levy's is
// a queen disaster that turns out fine, Anna's is total openness, Danya's is
// forced forward pressure that pays you clock, and the chat card hands your
// handicap to your opponent. The research behind the picks is in
// docs/creator-outreach-research-2026-07.md.
//
// ART. The portraits at public/creators/<slug>.svg are ORIGINAL, drawn in the
// game's own visual language. No channel logo or likeness is copied in: a logo is
// a third-party trademark and shipping one exposes the site. That path is a
// drop-in slot — when a creator sends artwork (or grants use of their logo),
// replacing the one file is the whole change, no code edit. Same pattern as the
// named-person set (personalPlays.tsx renders public/newjeans/*.svg).
//
// REMOVABILITY. Each card must be retractable in one commit: delete its entry
// here and its key from creatorPlays and the card is gone. If a creator objects,
// that is the entire conversation.
//
// SAFETY. Every mechanic reuses primitives that already ship (shield, clock
// adjust, timed opponent filters, reveal flags), so none of them can soft-lock a
// game or freeze a king, and all of them are a pure function of the synced board.

import { Buff, BuffApi, BuffCategory, BuffInstance, CardFx } from "../buff";
import { Tier } from "../nerf";
import { Move, PieceType, Square } from "../types";
import {
  activated,
  activatedSimple,
  addEffect,
  mySquares,
  squareStep,
  steps,
  timedOppFilter,
  turnsLeft,
} from "./helpers";
import { attackersOf, kingSquare } from "./overhaul/shared";
import { makeMove } from "../board";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type CreatorMeta = {
  id: string;
  name: string;
  description: string;
  tip?: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  icon?: string;
  requires?: PieceType[];
  fx?: CardFx;
};

function card(meta: CreatorMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

/** Every enemy piece that is not a king. Kings are excluded everywhere in this
 * file: no creator card may freeze, petrify or immobilise one. */
function enemyNonKingSquares(api: BuffApi): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = api.board.pieces[sq];
    if (p && p.color === api.opp && p.type !== "k") out.push(sq);
  }
  return out;
}

export const CREATOR_CARDS: Buff[] = [
  // Eric Rosen. The bishop-sac-then-stall identity: a piece that should not
  // survive, does, and is a problem precisely because it does nothing.
  card(
    {
      id: "cr_stalling_bishop",
      name: "The Stalling Bishop",
      description:
        "Choose one of your bishops. For your opponent's next 3 turns it cannot be captured, and it cannot capture either. It just sits there being a problem.",
      tip: "A protection can never deliver the king-capture, so this bishop is for blocking and annoying, not finishing.",
      tier: 7,
      category: "protection",
      requires: ["b"],
      icon: "Church",
      flavor: "And the bishop... stays.",
      fx: { motif: "blindfold", pieces: ["b"], self: true },
    },
    activated(
      steps(squareStep("Choose a bishop to plant", (api) => mySquares(api.board, api.me, "b"))),
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        // The shield is what makes it uncapturable; the no-capture half is the
        // filter below, which reads inst.state.sq every turn so the restriction
        // follows the bishop as it moves.
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
      },
      {
        // The bishop may not capture while planted: strip its capture moves in
        // place (augmentMoves owns the array). Only its captures go, so it can
        // always still move somewhere and can never strand its owner.
        augmentMoves: (moves: Move[], inst: BuffInstance) => {
          if (turnsLeft(inst) <= 0) return;
          const sq = inst.state.sq as number | undefined;
          if (sq == null) return;
          for (let i = moves.length - 1; i >= 0; i--) {
            if (moves[i].from === sq && moves[i].captured) moves.splice(i, 1);
          }
        },
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          // Track the plant as it moves so the capture ban stays on the same
          // piece, and tick the timer on our own turns.
          if (move.color === api.me) {
            if (move.from === inst.state.sq) inst.state.sq = move.to;
            if (turnsLeft(inst) > 0) inst.state.turns = (inst.state.turns as number) - 1;
          }
        },
      },
    ),
  ),

  // GothamChess. The catchphrase-shaped disaster that turns out fine, out loud.
  card(
    {
      id: "cr_oh_no_my_queen",
      name: "Oh No My Queen",
      description:
        "Your queen is snatched back to her starting square. Every enemy piece that was attacking her is frozen for 2 of their turns, and you gain 30 seconds.",
      tip: "Best played when she is trapped: it is a rescue that punishes whoever cornered her.",
      tier: 8,
      category: "pieces",
      requires: ["q"],
      icon: "Crown",
      flavor: "Oh no. Oh no my queen. ...Oh, actually that is fine.",
      fx: { motif: "anchor", pieces: ["q"], self: true },
    },
    activatedSimple((_inst, api) => {
      const q = mySquares(api.board, api.me, "q")[0];
      if (q == null) return;
      // Her home square: d1 for White, d8 for Black.
      const home: Square = api.me === "w" ? 3 : 59;
      // Freeze the attackers BEFORE she moves, or the attack set changes
      // underneath us and the punishment lands on the wrong pieces. Kings are
      // never frozen, which attackersOf does not filter, so exclude them here.
      for (const sq of attackersOf(api.board, api.opp, q)) {
        if (api.board.pieces[sq]?.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stun" });
      }
      // Only teleport her home when home is free. A blocked home square means she
      // stays put and the freeze plus the clock are the whole effect, rather than
      // the card silently doing nothing.
      if (!api.board.pieces[home]) api.relocate(q, home);
      api.adjustClock({ addSelfSec: 30 });
    }),
  ),

  // Anna Cramling. Playing on camera with people who are not trying to beat you,
  // and nothing hidden from anyone.
  card(
    {
      id: "cr_family_game_night",
      name: "Family Game Night",
      description:
        "Choose one enemy piece. For the next 4 turns neither player may capture it, and both players can see every card the other is holding.",
      tip: "The reveal cuts both ways, so play it when knowing their hand helps you more than hiding yours.",
      tier: 7,
      category: "info",
      icon: "Users",
      flavor: "Nobody is out to get anybody. We are just playing.",
      fx: { motif: "blindfold", pieces: "all" },
    },
    activated(
      steps(squareStep("Choose the piece nobody may take", (api) => enemyNonKingSquares(api))),
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        // Uncapturable for BOTH sides: a shield owned by the piece's own colour
        // stops us taking it, and the filter below stops them trading it off.
        addEffect(api, { kind: "shield", owner: api.opp, squares: [sq], turns: 4 });
        // Mutual openness. Both flags, deliberately: the card's whole character
        // is that it is not an advantage, it is a truce.
        api.mine.flags.seeOppCards = true;
        api.theirs.flags.seeOppCards = true;
      },
      {
        filterOpponentMoves: (moves, inst) =>
          turnsLeft(inst) <= 0
            ? moves
            : moves.filter((m) => m.to !== (inst.state.sq as number | undefined)),
      },
    ),
  ),

  // Daniel Naroditsky. The speedrun identity: relentless forward pressure, and
  // the clock rewards it rather than punishing it.
  card(
    {
      id: "cr_speedrun_protocol",
      name: "Speedrun Protocol",
      description:
        "For your opponent's next 6 turns they may only play a capture, a check, or a pawn move. Every turn the protocol holds, you gain 3 seconds.",
      tip: "It forces them forward, which is exactly wrong for a defensive setup and nearly free against an attacking one.",
      tier: 8,
      category: "tempo",
      icon: "Gauge",
      flavor: "We are not calculating. We are moving.",
      fx: { motif: "slow", pieces: "all" },
    },
    (() => {
      const base = timedOppFilter(6, (moves, _inst, api) =>
        moves.filter((m) => {
          if (m.captured || m.piece === "p") return true;
          // Does it give check? Play it on a copy and look at my own king. This
          // runs on the opponent's whole move list, so it is deliberately the
          // last test, after the two cheap ones above.
          const k = kingSquare(api.board, api.me);
          if (k == null) return false;
          try {
            const after = makeMove(api.board, m);
            const myKing = kingSquare(after, api.me);
            return myKing != null && attackersOf(after, api.opp, myKing).length > 0;
          } catch {
            return false;
          }
        }),
      );
      return {
        ...base,
        // The clock tick rides on the same turn counter as the filter, so the
        // payment stops exactly when the restriction does.
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          base.onMovePlayed?.(inst, move, api);
          if (move.color === api.opp && turnsLeft(inst) > 0) api.adjustClock({ addSelfSec: 3 });
        },
      } as Mech;
    })(),
  ),

  // The format card: creator versus chat, which docs/marketing-plan.md names as
  // the specific hook to sell. Its whole point is that YOU do not choose.
  card(
    {
      id: "cr_chat_picks",
      name: "Chat Picks",
      description:
        "You do not get an effect. Instead your opponent picks one of your pieces, and for your next 5 turns you may not move it at all.",
      tip: "A card you play TO your opponent: it hands them the decision, which is the whole joke.",
      tier: 7,
      category: "draft",
      icon: "MessageSquare",
      flavor: "Chat, what do we do here. ...No. No, not that.",
      fx: { motif: "jail", pieces: "all", self: true },
    },
    activated(
      // The opponent's choice is expressed as a pick over OUR pieces. The king is
      // excluded so this can never combine with a check into a position with no
      // legal move.
      steps(
        squareStep("Your opponent picks the piece you may not move", (api) =>
          mySquares(api.board, api.me).filter((sq) => api.board.pieces[sq]?.type !== "k"),
        ),
      ),
      (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
      },
      {
        augmentMoves: (moves: Move[], inst: BuffInstance) => {
          if (turnsLeft(inst) <= 0) return;
          const locked = inst.state.sq as number | undefined;
          if (locked == null) return;
          // Remove in place: augmentMoves owns the array. The forced-pass rule
          // catches the (rare) case where this leaves nothing, so it can never
          // lose the game on its own.
          for (let i = moves.length - 1; i >= 0; i--) {
            if (moves[i].from === locked) moves.splice(i, 1);
          }
        },
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          if (move.color === api.me && turnsLeft(inst) > 0) {
            inst.state.turns = (inst.state.turns as number) - 1;
          }
        },
      },
    ),
  ),
];
