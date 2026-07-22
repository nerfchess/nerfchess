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
  hex,
  curse,
  walnutTarget,
  freezeAllEnemies,
  nullifyDrafts,
  instant,
  activated,
  addEffect,
  mySquares,
  relRank,
  tickTurns,
  turnsLeft,
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
      description: "Your opponent's next draft is skipped outright, and in return they gain one draft reroll for a later offer.",
      flavor: "Two orders lost: one to the fire, one to the smudge.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      // One denied draft now, not two: the victim banks a reroll in return,
      // spent on a later offer (the skipped one never rolls, so a reroll on
      // it would be wasted anyway).
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),

  // --- petrify the queen 4 turns AND freeze whatever stands beside her -----
  H(
    {
      id: "medusas_verdict",
      name: "Medusa's Verdict",
      description: "After your opponent's next move, their queen turns to a walnut for 4 of their turns, and every enemy piece then standing next to her is frozen for 1 of their turns.",
      flavor: "The lady meets a colder gaze than her own, and it spills onto her guard.",
      // Board already paints the walnut and freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q"] },
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.state.done) return;
        if (move.color !== api.opp) return;
        // Delayed one opponent move. Applied during their move, so the shared
        // post-move tick eats one turn immediately: 5 leaves exactly 4 of
        // their turns for the queen and 2 leaves exactly 1 for her guard
        // (both durations preserved).
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type !== "q") continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 5 });
          for (const asq of mySquares(api.board, api.opp)) {
            if (asq === sq) continue;
            const t = api.board.pieces[asq]!.type;
            if (t === "k") continue;
            if (Math.max(Math.abs(FILE(asq) - FILE(sq)), Math.abs(RANK(asq) - RANK(sq))) === 1) {
              addEffect(api, { kind: "freeze", sq: asq, owner: api.opp, turns: 2 });
            }
          }
        }
        inst.state.done = true;
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.done ? "verdict passed" : "verdict: after their next move",
    },
  ),

  // --- petrify both rooks 3 turns AND seal their own back two ranks 2 turns -
  H(
    {
      id: "granite_ramparts",
      name: "Granite Ramparts",
      description: "Your opponent's rooks turn to walnuts for 2 of their turns, and for their next 2 turns they cannot move any piece onto their own back two ranks.",
      flavor: "The towers set into bedrock and the ground behind them seals shut.",
      // Board paints the walnuts and barred ranks; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "r") {
          // Longest duration trimmed by one: the rook petrify was 3, now 2.
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
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
      description: "Target two enemy minor pieces (knights or bishops). After your opponent's next move, both are petrified for 3 of their turns.",
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
      (inst, _api, picks) => {
        // Record the targets; the petrify lands after the opponent's next move.
        inst.state.targets = picks
          .map((p) => p.square)
          .filter((s): s is number => s != null);
      },
      {
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (inst.state.applied) return;
          if (move.color !== api.opp) return;
          // If the opponent just moved a targeted minor, the curse follows it
          // to its new square. Applied during their move, so the post-move tick
          // eats one turn: 4 leaves exactly 3 of their turns (duration kept).
          const targets = ((inst.state.targets as number[]) ?? []).map((sq) =>
            sq === move.from ? move.to : sq,
          );
          for (const sq of targets) {
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
            }
          }
          inst.state.applied = true;
          inst.spent = true;
        },
        status: (inst) =>
          inst.state.applied
            ? "petrified"
            : inst.state.targets != null
            ? "petrify pending: after their next move"
            : "activate to choose two minors",
      },
    ),
  ),

  // --- petrify one targeted piece (any non-king, long) --------------------
  H(
    {
      id: "stone_curse",
      name: "Stone Curse",
      description: "Target one enemy piece, not a king. It gets one unaffected move; then it turns to a walnut for 4 of their turns, able only to shuffle one square at a time.",
      flavor: "Chosen, cursed, and set in stone.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to petrify",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (inst, _api, picks) => {
        // Record the target; the walnut sets after the opponent's next move,
        // so the piece gets exactly one legal escape move first.
        inst.state.target = picks[0]?.square ?? null;
      },
      {
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (inst.state.applied) return;
          if (inst.state.target == null) {
            inst.spent = true;
            return;
          }
          if (move.color !== api.opp) return;
          // The escape move is the opponent's next move: if they spend it on the
          // targeted piece, the curse follows it to where it lands. Applied
          // during their move, so the post-move tick eats one turn: 5 leaves
          // exactly 4 of their turns (duration preserved).
          let sq = inst.state.target as number;
          if (move.from === sq) sq = move.to;
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 5 });
          }
          inst.state.applied = true;
          inst.spent = true;
        },
        status: (inst) =>
          inst.state.applied
            ? "petrified"
            : inst.state.target != null
            ? "petrify pending: one escape move, then it sets"
            : "activate to choose a piece",
      },
    ),
  ),

  // --- partial lockdown: only king and knights may move for 2 turns -------
  H(
    {
      id: "lone_sovereign",
      name: "Lone Sovereign",
      description: "For your opponent's next turn they may move only their king and their knights. Every other piece is stuck fast.",
      flavor: "The court abandons the crown; only the cavalry stays to guard it.",
      // Board already paints the locked pieces; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "b", "r", "q"] },
    },
    // Longest (only) duration trimmed by one: the lockdown was 2 turns, now 1.
    curse(1, (moves) => moves.filter((m) => m.piece === "k" || m.piece === "n")),
  ),

  // --- delayed snap-freeze: the next piece they move ices over ------------
  H(
    {
      id: "frozen_moment",
      name: "Frozen Moment",
      description: "The next piece your opponent moves freezes solid the instant it lands and cannot move again for 2 of their turns.",
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
          // turn immediately: 3 here leaves exactly 2 of their turns frozen
          // (longest duration trimmed by one, from 3 to 2).
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3 });
          inst.state.done = true;
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.done ? "snap freeze sprung" : "snap freeze: waiting for their move",
    },
  ),

  // --- pawn advance lock with a spike trap on captures ----------------------
  // Not a longer Trench Line (T2 is the clean advance lock): the furrow is
  // SEEDED with iron. Pawns cannot advance, and the diagonal capture they are
  // still allowed lands them on the spikes: the capturing pawn is caught fast
  // (frozen) for 2 turns where it lands.
  // Retiered 5 to 6 in place: the full duration is unchanged, so this card
  // just carries an explicit tier one above the file's H(5) default.
  hex(
    {
      id: "iron_furrow",
      name: "Iron Furrow",
      description: "The field is sown with iron spikes: your opponent's pawns cannot advance for their next 4 turns, and any enemy pawn that captures during that time is caught on the spikes, unable to move for 2 of their turns.",
      flavor: "The harvest bites back.",
      tier: 6,
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 4;
        addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 4 });
      },
      onMovePlayed: (inst, move, api) => {
        if (
          move.color === api.opp &&
          move.piece === "p" &&
          move.captured &&
          ((inst.state.turns as number) ?? 0) > 0
        ) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type === "p") {
            // Added during their own move, so the shared post-move tick eats
            // one turn immediately: 3 here leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "beartrap" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- timed filter: queen tethered to her king -----------------------------
  H(
    {
      id: "throne_bound",
      name: "Throne Bound",
      description: "The queen may not stray from her king: for your opponent's next 3 turns, her every move must end within 2 squares of their king.",
      flavor: "The queen is chained to her own throne.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    // Longest (only) duration trimmed by one: the tether was 4 turns, now 3.
    curse(3, (moves, api) =>
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
      description: "Their hands shake after every kill: for your opponent's next 5 turns, they cannot capture on two turns in a row.",
      flavor: "Every hand in the army has gone numb.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        // Longest duration trimmed by one: the shakes lasted 6 turns, now 5.
        inst.state.turns = 5;
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

  // --- zone lock: only pieces standing at home may move --------------------
  // Not a longer Wasted Hour (T3's pawn-or-king turn): the levy is a HOME
  // GUARD. Whatever stands in their own half may fight; every piece already
  // across the frontier is abandoned mid-campaign and cannot move.
  H(
    {
      id: "peasant_levy",
      name: "Peasant Levy",
      description: "The levy defends only the homeland: for your opponent's next 2 turns they may move only pieces standing in their own half of the board. Anything already across the middle is stranded.",
      flavor: "The expedition looks back and finds no relief column coming.",
      fx: { motif: "jail", pieces: "all" },
    },
    // Longest (only) duration trimmed by one: the levy held 3 turns, now 2.
    curse(2, (moves, api) => moves.filter((m) => relRank(api.opp, m.from) <= 4)),
  ),

  // --- barred: seal the two center ranks ----------------------------------
  H(
    {
      id: "scorched_middle",
      name: "Scorched Middle",
      description: "Your opponent cannot enter the 4th or 5th ranks for their next 3 turns, save one bridge: the square on their king's file, on whichever of the two ranks sits nearer their own side, stays passable.",
      flavor: "The heart of the board is a wall of fire.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let f = 0; f < 8; f++) {
        squares.push(SQ(f, 3), SQ(f, 4));
      }
      // The defender keeps one bridge across the wall. A live picker is not
      // practical here (the caster resolves the hex), so the bridge is chosen
      // deterministically: the barred square on their king's file, on whichever
      // of the two ranks sits nearer the defender's home, is left passable.
      const k = mySquares(api.board, api.opp, "k")[0];
      let bridge: number | null = null;
      if (k != null) {
        const kf = FILE(k);
        const near = SQ(kf, 3), far = SQ(kf, 4);
        bridge = relRank(api.opp, near) <= relRank(api.opp, far) ? near : far;
      }
      const barred = bridge == null ? squares : squares.filter((sq) => sq !== bridge);
      addEffect(api, { kind: "barred", squares: barred, against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: nullify the next two drafts --------------------------
  H(
    {
      id: "hexed_satchel",
      name: "Hexed Satchel",
      description: "Your opponent's next drafted card arrives nullified and does nothing, and in return they gain one draft reroll for a later offer.",
      flavor: "Every card they draw is already dead in the hand.",
    },
    instant((_inst, api) => {
      // One nullified draft now, not two: the victim banks a reroll in return.
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
      api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
    }),
  ),
];
