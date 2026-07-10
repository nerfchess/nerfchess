// Tier 5 (Brutal) hexes: heavy, multi-turn control curses on the opponent.
// Each card either petrifies a major piece for several turns, locks whole
// classes of pieces, freezes the entire enemy army briefly, strips a turn, or
// otherwise seizes real control. Spread across every piece target and every
// mechanic type (timed filters, petrify, freeze-all, barred squares, king-only,
// no-pawn-advance, draft denial, and a skip). Safety rails (kings never frozen
// or petrified, filters never soft-lock) come from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutTarget,
  freezeAllEnemies,
  nullifyDrafts,
  instant,
  activated,
  addEffect,
  mySquares,
  relRank,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(5);

export const HEXES_T5: Buff[] = [
  // --- draft denial: block one draft and nullify the next -------------------
  // Moved up from tier 4: a plain single draft skip already prices at tier 4
  // (Dead Letter), so the skip-plus-nullify combo sits one clean tier above it.
  H(
    {
      id: "burned_dispatches",
      name: "Burned Dispatches",
      description: "Your opponent's next draft is skipped outright, and the draft after that arrives nullified and inert.",
      flavor: "Two orders lost: one to the fire, one to the smudge.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),

  // --- petrify the queen 4 turns AND freeze whatever stands beside her -----
  H(
    {
      id: "medusas_verdict",
      name: "Medusa's Verdict",
      description: "Your opponent's queen turns to a walnut for 4 of their turns, and every enemy piece standing next to her is frozen for 1 of their turns.",
      flavor: "The lady meets a colder gaze than her own, and it spills onto her guard.",
      // Board already paints the walnut and freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type !== "q") continue;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
        for (const asq of mySquares(api.board, api.opp)) {
          if (asq === sq) continue;
          const t = api.board.pieces[asq]!.type;
          if (t === "k") continue;
          if (Math.max(Math.abs(FILE(asq) - FILE(sq)), Math.abs(RANK(asq) - RANK(sq))) === 1) {
            addEffect(api, { kind: "freeze", sq: asq, owner: api.opp, turns: 1 });
          }
        }
      }
    }),
  ),

  // --- petrify both rooks 3 turns AND seal their own back two ranks 2 turns -
  H(
    {
      id: "granite_ramparts",
      name: "Granite Ramparts",
      description: "Your opponent's rooks turn to walnuts for 3 of their turns, and for their next 2 turns they cannot move any piece onto their own back two ranks.",
      flavor: "The towers set into bedrock and the ground behind them seals shut.",
      // Board paints the walnuts and barred ranks; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "r") {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
      }
      const squares: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        if (relRank(api.opp, sq) <= 2) squares.push(sq);
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
    }),
  ),

  // --- petrify both minors (knights and bishops) --------------------------
  H(
    {
      id: "stone_menagerie",
      name: "Stone Menagerie",
      description: "Petrify two enemy minor pieces you target (knights or bishops) for 3 of their turns.",
      flavor: "A gallery of statues where the cavalry stood.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const chosen = picks.map((p) => p.square);
        return {
          kind: "square",
          label: "Choose an enemy minor to petrify",
          squares: mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return (t === "n" || t === "b") && !chosen.includes(sq);
          }),
        };
      },
      (_inst, api, picks) => {
        for (const pick of picks) {
          if (pick.square != null) {
            addEffect(api, { kind: "walnut", sq: pick.square, owner: api.opp, turns: 3 });
          }
        }
      },
    ),
  ),

  // --- petrify one targeted piece (any non-king, long) --------------------
  H(
    {
      id: "stone_curse",
      name: "Stone Curse",
      description: "Turn one enemy piece you target into a walnut for 4 of their turns: it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Chosen, cursed, and set in stone.",
    },
    walnutTarget(4),
  ),

  // --- partial lockdown: only king and knights may move for 2 turns -------
  H(
    {
      id: "lone_sovereign",
      name: "Lone Sovereign",
      description: "For your opponent's next 2 turns they may move only their king and their knights. Every other piece is stuck fast.",
      flavor: "The court abandons the crown; only the cavalry stays to guard it.",
      // Board already paints the locked pieces; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "b", "r", "q"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece === "k" || m.piece === "n")),
  ),

  // --- delayed snap-freeze: the next piece they move ices over ------------
  H(
    {
      id: "frozen_moment",
      name: "Frozen Moment",
      description: "The next piece your opponent moves freezes solid the instant it lands and cannot move again for 3 of their turns.",
      flavor: "One step too many, and time closes around them.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.state.done) return;
        if (move.color !== api.opp) return;
        const p = api.board.pieces[move.to];
        if (p && p.color === api.opp && p.type !== "k") {
          // Added during their own move, so the shared post-move tick eats one
          // turn immediately: 4 here leaves exactly 3 of their turns frozen.
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 4 });
          inst.state.done = true;
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.done ? "snap freeze sprung" : "snap freeze: waiting for their move",
    },
  ),

  // --- no_pawn_advance: pawns nailed down for five turns ------------------
  H(
    {
      id: "iron_furrow",
      name: "Iron Furrow",
      description: "Your opponent's pawns cannot advance for their next 5 turns. They may still capture diagonally.",
      flavor: "The whole front rank is spiked into the earth.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 5 });
    }),
  ),

  // --- timed filter: queen tethered to her king -----------------------------
  H(
    {
      id: "throne_bound",
      name: "Throne Bound",
      description: "The queen may not stray from her king: for your opponent's next 4 turns, her every move must end within 2 squares of their king.",
      flavor: "The queen is chained to her own throne.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "q") return true;
        const k = mySquares(api.board, api.opp, "k")[0];
        if (k == null) return true;
        return (
          Math.max(Math.abs(FILE(m.to) - FILE(k)), Math.abs(RANK(m.to) - RANK(k))) <= 2
        );
      }),
    ),
  ),

  // --- stateful filter: no two captures in a row -----------------------------
  H(
    {
      id: "palsied_hands",
      name: "Palsied Hands",
      description: "Their hands shake after every kill: for your opponent's next 6 turns, they cannot capture on two turns in a row.",
      flavor: "Every hand in the army has gone numb.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        if (!inst.state.lastWasCapture) return moves;
        const kept = moves.filter((m) => !m.captured);
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        inst.state.lastWasCapture = !!move.captured;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- timed filter: only pawns and the king may move ---------------------
  H(
    {
      id: "peasant_levy",
      name: "Peasant Levy",
      description: "Your opponent may move only their pawns and their king for their next 2 turns.",
      flavor: "The nobles have all fled; only the levy remains.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- barred: seal the two center ranks ----------------------------------
  H(
    {
      id: "scorched_middle",
      name: "Scorched Middle",
      description: "Your opponent cannot enter any square on the 4th or 5th ranks for their next 3 turns.",
      flavor: "The heart of the board is a wall of fire.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let f = 0; f < 8; f++) {
        squares.push(SQ(f, 3), SQ(f, 4));
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: nullify the next two drafts --------------------------
  H(
    {
      id: "hexed_satchel",
      name: "Hexed Satchel",
      description: "Your opponent's next 2 drafted cards arrive nullified and do nothing.",
      flavor: "Every card they draw is already dead in the hand.",
    },
    nullifyDrafts(2),
  ),
];
