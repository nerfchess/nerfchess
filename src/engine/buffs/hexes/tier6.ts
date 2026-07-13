// Tier 6 (Cruel) hexes: board-wide or repeated control that denies a whole
// plan at once. Each card petrifies or freezes entire classes of enemy pieces
// for multiple turns, locks the army down to the king, bars whole files, strips
// two turns, or blocks two drafts. Spread across every piece target and every
// mechanic type (timed filters, petrify via walnutAll/walnutTarget, freeze,
// freeze-all, barred squares, king-only, no-pawn-advance, draft denial, skip).
// Safety rails (kings never frozen or petrified, filters never soft-lock) come
// from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutTarget,
  skipOpponent,
  blockDrafts,
  instant,
  addEffect,
  mySquares,
  relRank,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(6);

export const HEXES_T6: Buff[] = [
  // --- king_only 2 turns, and the queen straggles back 2 turns later --------
  // Not a doubled Royal Duty (T3's clean one-turn king-only rung): the court
  // does not return all at once. The queen is the last home, locked for two
  // extra turns after the rest of the army resumes.
  H(
    {
      id: "court_in_exile",
      name: "Court in Exile",
      description: "On your opponent's next 2 turns they may move only their king, and their queen is the last to return from exile: she cannot move for 2 further turns after the court comes back.",
      flavor: "The court walks out on the crown, and her majesty takes the long road home.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        // 4 of their turns total: 2 under king_only (queen locked anyway),
        // then 2 more where only the queen is still away.
        inst.state.turns = 4;
        addEffect(api, { kind: "king_only", against: api.opp, turns: 2 });
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "q");
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- petrify all knights, and the stone SPREADS --------------------------
  // Not a longer Hobbled Cavalry (T3's clean all-knights rung): this curse is
  // contagious. Each of their turns, one random enemy piece standing beside a
  // stone rider catches the petrification for a turn.
  H(
    {
      id: "stone_riders",
      name: "Stone Riders",
      description: "Your opponent's knights turn to walnuts for 3 of their turns, and the stone is catching: on each of those turns one random enemy piece standing beside a stone rider is petrified for 1 turn too.",
      flavor: "Do not touch the statues. Do not stand near the statues.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        for (const sq of mySquares(api.board, api.opp, "n")) {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          // Squares currently petrified by this curse: active walnuts sitting
          // on enemy knights (the riders shuffle at most a step, so reading
          // the live effect list keeps tracking exact).
          const riders = api.bs.effects
            .filter(
              (e) =>
                e.kind === "walnut" &&
                e.owner === api.opp &&
                e.turns > 0 &&
                api.board.pieces[e.sq]?.type === "n" &&
                api.board.pieces[e.sq]?.color === api.opp,
            )
            .map((e) => (e.kind === "walnut" ? e.sq : -1));
          const touching = mySquares(api.board, api.opp).filter((sq) => {
            const p = api.board.pieces[sq]!;
            if (p.type === "k" || riders.includes(sq)) return false;
            return riders.some(
              (r) =>
                Math.max(Math.abs(FILE(sq) - FILE(r)), Math.abs(RANK(sq) - RANK(r))) === 1,
            );
          });
          if (touching.length) {
            const sq = touching[api.rng.int(touching.length)];
            // Added during their own move, so the shared post-move tick eats
            // one turn immediately: 2 here leaves exactly 1 of their turns.
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- conditional petrify: bishops are stone only while they stay home -----
  // Not a longer Stone Clergy (T4's clean all-bishops rung): this one is a
  // standing curse tied to GROUND. A bishop in its own half is carved into the
  // pews and can only shuffle; a bishop that escapes across the middle of the
  // board moves freely. Forces their clergy out into the open, where you want
  // them.
  H(
    {
      id: "stone_prelates",
      name: "Stone Prelates",
      description: "The pews claim whoever lingers: for your opponent's next 6 turns, any of their bishops standing in their own half may only shuffle one square at a time. Bishops that cross into your half move freely.",
      flavor: "The transept wall lets go of the ones who leave the church.",
      fx: { motif: "anchor", pieces: ["b"] },
    },
    curse(6, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece !== "b" ||
          relRank(api.opp, m.from) >= 5 ||
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1,
      ),
    ),
  ),

  // --- petrify all rooks, and each stone tower seals its own file ----------
  // Not a longer Granite Towers (T4's clean all-rooks rung): each petrified
  // tower drags its whole FILE down with it. For 3 turns your opponent cannot
  // move anything onto a file where one of their rooks stands as stone, so
  // their own bastions wall their army in.
  H(
    {
      id: "stone_bastions",
      name: "Stone Bastions",
      description: "Your opponent's rooks turn to walnuts for 3 of their turns, and each stone bastion seals its ground: for their next 3 turns your opponent cannot move any piece onto the files their petrified rooks stand on.",
      flavor: "A wall is only ever a wall from both sides.",
      // Board already paints walnuts and barred squares; fx for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    instant((_inst, api) => {
      const files = new Set<number>();
      for (const sq of mySquares(api.board, api.opp, "r")) {
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        files.add(FILE(sq));
      }
      if (files.size) {
        const squares: number[] = [];
        for (const f of files) for (let r = 0; r < 8; r++) squares.push(SQ(f, r));
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
      }
    }),
  ),

  // --- DELAYED petrify: the queen turns to stone the moment she next moves --
  // Not a longer Medusa's Stare (T4's clean targeted-queen rung): the curse is
  // laid on her NEXT step, so your opponent must choose between never moving
  // the queen (a self-imposed freeze) or spending her and losing her for 4
  // turns wherever she lands.
  H(
    {
      id: "queen_of_stone",
      name: "Queen of Stone",
      description: "The curse waits in her shoes: the next time your opponent moves their queen, she turns to a walnut for 4 of their turns the moment she lands.",
      flavor: "Her majesty may hold court forever, so long as she never rises from the throne.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (inst.state.done) return;
        if (move.color !== api.opp || move.piece !== "q") return;
        const p = api.board.pieces[move.to];
        if (p && p.color === api.opp && p.type === "q") {
          // Added during their own move, so the shared post-move tick eats one
          // turn immediately: 5 here leaves exactly 4 of their turns.
          addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 5 });
          inst.state.done = true;
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.done ? "the queen is stone" : "waiting for their queen to move",
    },
  ),

  // --- freeze every minor piece (knights and bishops) ---------------------
  H(
    {
      id: "glacial_flanks",
      name: "Glacial Flanks",
      description: "Freeze your opponent's knights and bishops for 2 of their turns.",
      flavor: "Both wings of the army seize in the cold.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t !== "n" && t !== "b") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),

  // --- freeze the whole enemy army but pawns and king for two turns -------
  H(
    {
      id: "total_whiteout",
      name: "Total Whiteout",
      description: "A blizzard buries every sightline: for their next 3 turns, your opponent's pieces can only capture at arm's length, exactly one square away.",
      flavor: "A blizzard buries the whole board.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(3, (moves) =>
      moves.filter(
        (m) =>
          !m.captured ||
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1,
      ),
    ),
  ),

  // --- freeze the whole army, but the thaw is UNEVEN ------------------------
  // Not a middle rung between Mass Freeze (T4, the clean 1-turn army freeze)
  // and Absolute Zero (T8): the chill holds a turn longer but leaks. At the
  // end of each of their turns one random piece shakes free of the ice early,
  // so their army trickles back to life piece by piece.
  H(
    {
      id: "the_big_chill",
      name: "The Big Chill",
      description: "Freeze all of your opponent's pieces except their king for 3 of their turns, but the thaw is uneven: at the end of each of their turns, one random frozen piece shakes free of the ice early.",
      flavor: "The board glazes over in a night and cracks apart in pieces.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        const squares: number[] = [];
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3 });
          squares.push(sq);
        }
        inst.state.squares = squares;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          // Thaw one random piece this card froze: pick among the squares
          // whose freeze is still running, then drop that effect entirely.
          const squares = (inst.state.squares as number[] | undefined) ?? [];
          const still = squares.filter((sq) =>
            api.bs.effects.some(
              (e) => e.kind === "freeze" && e.owner === api.opp && e.sq === sq && e.turns > 0,
            ),
          );
          if (still.length) {
            const sq = still[api.rng.int(still.length)];
            const idx = api.bs.effects.findIndex(
              (e) => e.kind === "freeze" && e.owner === api.opp && e.sq === sq && e.turns > 0,
            );
            if (idx >= 0) api.bs.effects.splice(idx, 1);
            inst.state.squares = squares.filter((s) => s !== sq);
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- pawn lock with WEIGHT: advanced pawns first sink a square back home --
  // Not a longer Sown Salt (T3's clean full pawn lock): the lead is HEAVY.
  // Before the lock takes hold, every advanced enemy pawn sinks one square
  // back toward its home rank (where the square behind it is free), undoing
  // real progress, and only then does the infantry seize up.
  H(
    {
      id: "leaden_fields",
      name: "Leaden Fields",
      description: "Their pawns are cast in lead: every advanced enemy pawn first sinks one square back toward home (if that square is free), and then their pawns cannot move at all, not even to capture, for their next 3 turns.",
      flavor: "Lead does not march. Lead settles.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        const back = api.opp === "w" ? -8 : 8;
        // Sink the pawns closest to home first, so a pawn never blocks the
        // one sinking in behind it. Only pawns that actually advanced (their
        // relative rank 3+) sink; the home rank never underflows.
        const pawns = mySquares(api.board, api.opp, "p")
          .filter((sq) => relRank(api.opp, sq) >= 3)
          .sort((a, b) => relRank(api.opp, a) - relRank(api.opp, b) || a - b);
        for (const sq of pawns) {
          const to = sq + back;
          if (to >= 0 && to <= 63 && !api.board.pieces[to]) api.relocate(sq, to);
        }
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "p");
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- confinement: the heavy pieces may move, but never leave home ---------
  // Not a longer Heavy Shackles (T4's clean queen-and-rooks full lock): the
  // majors stay mobile inside their own half but are grounded there. A heavy
  // piece already in your half must come home; none may cross back over.
  H(
    {
      id: "grounded_command",
      name: "Grounded Command",
      description: "The heavy pieces are grounded: for your opponent's next 4 turns their queen and rooks cannot move onto any square in your half of the board. They move freely within their own.",
      flavor: "You may pace the keep all you like. The gate stays shut.",
      fx: { motif: "anchor", pieces: ["q", "r"] },
    },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => (m.piece !== "q" && m.piece !== "r") || relRank(api.opp, m.to) <= 4,
      ),
    ),
  ),

  // --- petrify one targeted piece for the rest of the game ------------------
  H(
    {
      id: "eternal_statue",
      name: "Eternal Statue",
      description: "Turn one enemy piece you target into a walnut for the rest of the game: it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Chosen once, still for an age.",
    },
    // 999 turns: outlasts any realistic game, so the card reads "for the game".
    walnutTarget(999),
  ),

  // --- barred: seal the two central files for four turns ------------------
  H(
    {
      id: "sealed_avenues",
      name: "Sealed Avenues",
      description: "Your opponent cannot enter any square on the d or e files for their next 4 turns.",
      flavor: "The two great avenues are walled off end to end.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let r = 0; r < 8; r++) {
        squares.push(SQ(3, r), SQ(4, r));
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),

  // --- draft denial plus a mugging: their rerolls become YOURS --------------
  // Not a doubled Dead Letter (T4's clean single draft block): one draft is
  // blocked AND every draft reroll they are still holding is snatched out of
  // their hand and added to yours.
  H(
    {
      id: "empty_handed",
      name: "Empty Handed",
      description: "Your opponent's next draft is blocked and skipped, and every draft reroll they still hold is stolen and added to yours.",
      flavor: "The deck is pulled away, and so is everything in their sleeves.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      const stolen = api.theirs.rerollsLeft ?? 0;
      if (stolen > 0) {
        api.theirs.rerollsLeft = 0;
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + stolen;
      }
    }),
  ),

  // --- skip: strip two whole turns ----------------------------------------
  H(
    {
      id: "lost_days",
      name: "Lost Days",
      description: "Your opponent skips their next 2 turns entirely.",
      flavor: "Two days fall out of their calendar.",
      fx: { motif: "slow", pieces: "all" },
    },
    skipOpponent(2),
  ),
];
