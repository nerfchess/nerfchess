// Tier 8 (Unhinged) hexes: game-defining curses that swing the whole match if
// the opponent has no answer. Each card strips multiple turns, petrifies the
// royal battery, ices the entire army, seals huge regions of the board, or
// stands as a permanent standing curse. Spread across every piece target
// (queen, rook, bishop, knight, pawn, king) and every mechanic type (timed
// filter, permanent filter, petrify one or many, freeze one or all, barred
// squares, king-only, no-pawn-advance, draft denial, and skips). Safety rails
// (kings never frozen or petrified, filters never soft-lock) come from the
// shared helpers, so nothing here can hard-lock the game.

import { Buff } from "./shared";
import {
  tierHexes,
  hex,
  curse,
  walnutAll,
  instant,
  activated,
  addEffect,
  mySquares,
  turnsLeft,
  tickTurns,
  relRank,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H = tierHexes(8);

// Basilisk's Stare petrifies for the rest of the game. Walnut effects tick on
// the victim's turns, so a large count outlasts any real game; the effect is
// also re-applied whenever the statue shuffles (see below), so it never lapses.
const STATUE_TURNS = 999;

export const HEXES_T8: Buff[] = [
  // --- skip 1 turn, then a delayed targeted freeze the moment they return --
  // The skip and the freezes are queued together, but a freeze only ticks on
  // the owner's OWN completed moves. The opponent completes none during the
  // skip, so the 1-turn freezes survive untouched and bite on exactly the turn
  // they finally move again: up to four pieces the caster chose stay locked
  // that turn while everything else is free.
  H(
    {
      id: "endless_night",
      name: "Endless Night",
      description: "Your opponent skips their next turn. On the turn they return, up to four non-king enemy pieces you choose are frozen for that one turn.",
      flavor: "The sun forgets to rise, and the whole court is still asleep when the dark lifts.",
      fx: { motif: "slow", pieces: "all" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length >= 4
          ? null
          : {
              kind: "square",
              label: `Choose an enemy piece to freeze (${picks.length + 1}/4)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) =>
                  api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        api.bs.skips[api.opp] += 1;
        for (const k of picks) {
          if (k.square != null) {
            addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns: 1, skin: "sleep" });
          }
        }
      },
    ),
  ),

  // --- petrify all: the whole royal battery, queen AND both rooks ----------
  hex(
    {
      id: "crown_and_castle",
      name: "Crown and Castle",
      description: "Your opponent's queen and rooks turn to walnuts for 2 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "The heaviest pieces set like mortar overnight.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q", "r"] },
      // Retiered 8 -> 6: a narrow queen-and-rooks petrify does not fill an
      // Unhinged slot without a second board impact.
      tier: 6,
    },
    walnutAll(["q", "r"], 2),
  ),

  // --- king_only: only the king may move, for 3 long turns ----------------
  H(
    {
      id: "abdication_edict",
      name: "Abdication Edict",
      description: "For your opponent's next turn they may move only their king. For the two turns after that, they may also move their single most valuable non-king piece, chosen fresh each turn; every other piece stays stuck fast.",
      flavor: "The crown rules alone, and the court simply stops answering.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        const left = turnsLeft(inst);
        if (left <= 0 || moves.length === 0) return moves;
        // First of their three turns: only the king may move.
        if (left >= 3) {
          const kept = moves.filter((m) => m.piece === "k");
          return kept.length > 0 ? kept : moves;
        }
        // Turns two and three: the king plus one non-king piece, picked
        // deterministically as the most valuable non-king piece with a legal
        // move (ties broken by lowest square) and re-picked every turn.
        const VAL: Record<string, number> = { q: 5, r: 4, b: 3, n: 3, p: 1, k: 0 };
        let bestFrom: number | null = null;
        let bestVal = -1;
        for (const m of moves) {
          if (m.piece === "k") continue;
          const v = VAL[m.piece] ?? 0;
          if (bestFrom === null || v > bestVal || (v === bestVal && m.from < bestFrom)) {
            bestVal = v;
            bestFrom = m.from;
          }
        }
        const kept = moves.filter((m) => m.piece === "k" || m.from === bestFrom);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- freeze all, and the cold LINGERS in their limbs after the thaw ------
  // Not a longer Big Chill (T6, which leaks a random piece per turn) or Mass
  // Freeze (T4, the clean 1-turn rung): the deep freeze holds 2 turns, then
  // the whole army comes back numb, hobbled to single-square steps for 2 more
  // turns while the blood returns.
  H(
    {
      id: "absolute_zero",
      name: "Absolute Zero",
      description: "Freeze all of your opponent's pieces except their king and pawns for 2 of their turns. The cold outlives the ice: for their next 2 turns after the thaw, each of those pieces can only step a single square. Kings and pawns move freely throughout.",
      flavor: "The ice lets go long before the cold does.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t === "k" || t === "p") continue;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        }
        // 4 of their turns total: the one-square leash is moot for the 2 frozen
        // turns, then bites for 2 more. Kings and pawns are always exempt.
        inst.state.turns = 4;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) =>
            m.piece === "k" ||
            m.piece === "p" ||
            Math.max(
              Math.abs(FILE(m.to) - FILE(m.from)),
              Math.abs(RANK(m.to) - RANK(m.from)),
            ) <= 1,
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- petrify all minors, and the forest GRABS whoever walks among them ----
  // Not a longer Statue Garden (T7's clean all-minors rung): the stone trees
  // have roots. For the 4 turns the forest stands, any enemy piece that ends a
  // move beside a petrified minor is seized by the roots and frozen for a
  // turn, so their army cannot even maneuver around its own statues.
  H(
    {
      id: "petrified_forest",
      name: "Petrified Forest",
      description: "Your opponent's knights and bishops turn to walnuts for 4 of their turns, except the first, which may make one move before it too petrifies. The forest has roots: any enemy piece that ends a move beside one of the stone trees is entangled and frozen for 1 turn.",
      flavor: "The trees were cavalry once. They still take prisoners.",
      // Board already paints walnuts and freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 4;
        const minors = mySquares(api.board, api.opp).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return t === "n" || t === "b";
        });
        // The first affected minor (lowest square) is spared for now: it may
        // make one move before it too petrifies. Every other minor stones over
        // at once.
        const escapee = minors.length > 0 ? minors[0] : null;
        inst.state.escapeSq = escapee;
        for (const sq of minors) {
          if (sq === escapee) continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
        }
      },
      onMovePlayed: (inst, move, api) => {
        const escapeSq = inst.state.escapeSq as number | null | undefined;
        if (escapeSq != null && move.color === api.opp) {
          if (move.from === escapeSq) {
            // The spared minor used its one escape move: it petrifies now on its
            // new square, for the rest of the forest's duration.
            inst.state.escapeSq = null;
            addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: turnsLeft(inst) });
          } else if (move.capturedSquare === escapeSq || move.to === escapeSq) {
            inst.state.escapeSq = null;
          }
        }
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          // Stone trees: active walnuts standing on enemy minors (they shuffle
          // at most a king-step, so the live effect list tracks them exactly).
          const trees = api.bs.effects
            .filter((e) => {
              if (e.kind !== "walnut" || e.owner !== api.opp || e.turns <= 0) return false;
              const p = api.board.pieces[e.sq];
              return !!p && p.color === api.opp && (p.type === "n" || p.type === "b");
            })
            .map((e) => (e.kind === "walnut" ? e.sq : -1));
          const landed = api.board.pieces[move.to];
          const besideTree = trees.some(
            (t) =>
              t !== move.to &&
              Math.max(Math.abs(FILE(move.to) - FILE(t)), Math.abs(RANK(move.to) - RANK(t))) === 1,
          );
          if (landed && landed.color === api.opp && landed.type !== "k" && besideTree) {
            // Added during their own move, so the shared post-move tick eats
            // one turn immediately: 2 here leaves exactly 1 of their turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2, skin: "roots" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- MARQUEE: petrify one piece for the rest of the game, and its gaze
  // freezes any enemy piece that ends a move next to the statue -------------
  H(
    {
      id: "medusa_stare",
      name: "Basilisk's Stare",
      description: "Turn one enemy piece you target into a walnut for the rest of the game: it can only ever shuffle one square at a time. Its gaze lingers, so any enemy piece that ends a move next to the statue is frozen for 3 of their turns. Kings cannot be targeted.",
      flavor: "Meet its eyes once and you are a garden ornament, and so is anyone who comes to help.",
    },
    activated(
      (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to petrify forever",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: STATUE_TURNS });
      },
      {
        // One activation, then it lives on as a permanent passive watching the
        // board; it only ends if the statue is captured.
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          const sq = inst.state.sq as number | undefined;
          if (sq == null) return;
          // The statue was captured (only I can take it): the gaze dies too.
          if (move.capturedSquare === sq) {
            inst.spent = true;
            inst.state.sq = undefined;
            return;
          }
          // The statue shuffled its one square: follow it and re-petrify, so
          // the walnut is never pruned off the vacated square and stays for good.
          if (move.from === sq && move.color === api.opp) {
            inst.state.sq = move.to;
            addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: STATUE_TURNS });
            return;
          }
          // One of their pieces ended its move beside the statue: the gaze
          // freezes it. Added on their move, so 4 leaves 3 of their turns.
          if (move.color === api.opp && move.to !== sq) {
            const step = Math.max(
              Math.abs(FILE(move.to) - FILE(sq)),
              Math.abs(RANK(move.to) - RANK(sq)),
            );
            const p = api.board.pieces[move.to];
            if (step === 1 && p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 4 });
            }
          }
        },
        status: (inst) => {
          const sq = inst.state.sq as number | undefined;
          return sq == null
            ? "activate to choose the statue"
            : `statue at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
        },
      },
    ),
  ),

  // --- the blight takes the crop: advanced pawns DIE, the rest are locked ---
  // Not a longer Trench Line / Iron Furrow, and no longer dominated by Salted
  // Earth (T7's permanent advance lock): the blight consumes outright. Every
  // enemy pawn that crossed the middle of the board rots off the board, and
  // the pawns still at home cannot advance for 4 turns.
  H(
    {
      id: "blighted_furrows",
      name: "Blighted Furrows",
      description: "The blight takes whatever ripened first: every enemy pawn standing in your half of the board rots away and is removed, and their remaining pawns cannot advance for their next 4 turns, though the first pawn to try may make one advance before the lock takes hold.",
      flavor: "The fields are poisoned; the tallest stalks fall first.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        for (const sq of mySquares(api.board, api.opp, "p")) {
          if (relRank(api.opp, sq) >= 5) api.removePiece(sq);
        }
        inst.state.turns = 4;
        inst.state.escapeUsed = false;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        // A pawn advance is a non-capturing forward push (file unchanged).
        const isAdvance = (m: (typeof moves)[number]) =>
          m.piece === "p" && FILE(m.from) === FILE(m.to);
        if (inst.state.escapeUsed) {
          const kept = moves.filter((m) => !isAdvance(m));
          return kept.length > 0 ? kept : moves;
        }
        // Escape unused: the first affected pawn (lowest square with an advance)
        // keeps its advance; every other pawn's advance is blocked.
        let escapeFrom: number | null = null;
        for (const m of moves) {
          if (isAdvance(m) && (escapeFrom === null || m.from < escapeFrom)) escapeFrom = m.from;
        }
        const kept = moves.filter((m) => !isAdvance(m) || m.from === escapeFrom);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (
          !inst.state.escapeUsed &&
          move.color === api.opp &&
          move.piece === "p" &&
          FILE(move.from) === FILE(move.to)
        ) {
          inst.state.escapeUsed = true;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- combo: skip a whole turn AND block the next 2 drafts ----------------
  H(
    {
      id: "sacked_capital",
      name: "Sacked Capital",
      description: "Your opponent skips their next turn and their next draft. On the turn they return, they may move only pawns or their king.",
      flavor: "The capital burns, the messengers scatter, and no orders reach the field.",
      // fx covers the turn skip; the draft denial half shows no board motif.
      fx: { motif: "slow", pieces: "all" },
    },
    // Rebalance: the old double skip plus a draft skip was denial on every axis.
    // Now a single skipped turn and a single skipped draft, and the return turn
    // is hobbled to pawn or king moves only. The 1-turn filter cannot tick
    // during the skip (no completed opponent move), so it bites on the turn
    // they finally return.
    {
      kind: "passive",
      init: (inst, api) => {
        api.bs.skips[api.opp] += 1;
        api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
        inst.state.turns = 1;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- barred: seal the victim's 4th, 5th and 6th ranks for 3 turns --------
  // Side-relative fix: the old version barred absolute ranks 4-6, which cut
  // three ranks out of a black victim's own half but only one of white's.
  // Now the sealed band is always the victim's OWN 4th to 6th ranks.
  H(
    {
      id: "scorched_earth",
      name: "Scorched Earth",
      description: "Your opponent cannot move any piece onto their own 4th, 5th, or 6th ranks for their next 3 turns, except the first piece to try, which may step there once before the ban takes hold.",
      flavor: "A cratered killing field where no army dares set foot.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.escapeUsed = false;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const barred = (to: number) => {
          const r = relRank(api.opp, to);
          return r >= 4 && r <= 6;
        };
        if (inst.state.escapeUsed) {
          const kept = moves.filter((m) => !barred(m.to));
          return kept.length > 0 ? kept : moves;
        }
        // Escape unused: the first affected piece (lowest square with a barred
        // destination) may still step into the band; all others are blocked.
        let escapeFrom: number | null = null;
        for (const m of moves) {
          if (barred(m.to) && (escapeFrom === null || m.from < escapeFrom)) escapeFrom = m.from;
        }
        const kept = moves.filter((m) => !barred(m.to) || m.from === escapeFrom);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.escapeUsed && move.color === api.opp) {
          const r = relRank(api.opp, move.to);
          if (r >= 4 && r <= 6) inst.state.escapeUsed = true;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- freeze the rooks briefly, then cap them at three squares forever -----
  H(
    {
      id: "sealed_ramparts",
      name: "Sealed Ramparts",
      description: "Your opponent's rooks are frozen for their next 2 turns, then for the rest of the game each rook may move at most three squares in a single move. They are never fully disabled.",
      flavor: "The gates are bricked shut, then cracked open just a sliver for good.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (_inst, api) => {
        for (const sq of mySquares(api.board, api.opp, "r")) {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        }
      },
      filterOpponentMoves: (moves) => {
        if (moves.length === 0) return moves;
        const kept = moves.filter((m) => {
          if (m.piece !== "r") return true;
          const dist = Math.max(
            Math.abs(FILE(m.to) - FILE(m.from)),
            Math.abs(RANK(m.to) - RANK(m.from)),
          );
          return dist <= 3;
        });
        return kept.length > 0 ? kept : moves;
      },
    },
  ),

  // --- timed filter: every piece hobbled to one square for 3 turns ---------
  H(
    {
      id: "leaden_limbs",
      name: "Leaden Limbs",
      description: "Your opponent may move each piece at most one square in any direction for their next 2 turns.",
      flavor: "Every limb turns to lead; a single shuffling step is all anyone manages.",
      // "all" is right: the filter also strips castling off the king.
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(2, (moves) =>
      moves.filter(
        (m) =>
          Math.max(
            Math.abs(FILE(m.to) - FILE(m.from)),
            Math.abs(RANK(m.to) - RANK(m.from)),
          ) <= 1,
      ),
    ),
  ),

  // --- freeze one piece, and the shard radiates cold nobody dares approach --
  // Not a longer Frostbite (T3's clean targeted freeze): the shard is a
  // WEATHER SYSTEM. The pierced piece is iced for 4 of their turns, and for
  // those turns your opponent cannot move anything onto the squares around
  // it, so the frozen piece cannot be defended or huddled behind.
  hex(
    {
      id: "everfrost_shard",
      name: "Everfrost Shard",
      description: "Freeze one enemy piece you target for 4 of their turns. The shard radiates: for those 4 turns your opponent cannot move any piece onto a square beside it. Kings cannot be targeted.",
      flavor: "Nothing grows near it. Nothing stands near it. Nothing helps it.",
      // Retiered 8 -> 6: a single-target freeze plus a small barred ring does
      // not fill an Unhinged slot without a second board impact.
      tier: 6,
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to pierce with the shard",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 4 });
        const ring: number[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (inBoard(f, r)) ring.push(SQ(f, r));
          }
        }
        if (ring.length) {
          addEffect(api, { kind: "barred", squares: ring, against: api.opp, turns: 4 });
        }
      },
    ),
  ),

  // --- draft denial that FEEDS you: their cards curdle, yours ripen ---------
  // Not a bigger Hexed Satchel (T5's clean nullify-2 rung): the poison is
  // drawn OFF their counsel and distilled into yours. Their next 2 drafted
  // cards arrive dead, and your own next draft rolls one tier higher.
  H(
    {
      id: "poisoned_counsel",
      name: "Poisoned Counsel",
      description: "Your opponent's next drafted card arrives nullified and does nothing.",
      flavor: "Every advisor whispers rot, and the next order they hand down comes to nothing.",
    },
    // Rebalance: affect one draft only. The card no longer lifts your own next
    // draft; it just nullifies the opponent's next drafted card. It carries no
    // board-control rider, so the opponent is owed no protected offer.
    instant((_inst, api) => {
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),

  // --- no captures for 3 turns AND a sealed ring around your own king ------
  hex(
    {
      id: "peace_of_the_grave",
      name: "Peace of the Grave",
      description: "Your opponent cannot capture with any piece for their next 3 turns, and for those turns they cannot move any piece onto a square next to your king.",
      flavor: "A forced truce enforced by the dead, with a cordon drawn around the crown.",
      fx: { motif: "muzzle", pieces: "all" },
      // Retiered 8 -> 9 (apex): the full three-turn duration is unchanged.
      tier: 9, special: true,
    },
    {
      kind: "passive",
      init: (inst, api) => {
        const ksq = mySquares(api.board, api.me, "k")[0];
        if (ksq != null) {
          const squares: number[] = [];
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(ksq) + df;
              const r = RANK(ksq) + dr;
              if (inBoard(f, r)) squares.push(SQ(f, r));
            }
          }
          if (squares.length > 0) {
            addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
          }
        }
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];
