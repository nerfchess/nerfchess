// Overhaul roster, Tier 3 (cards 51-75 of docs/overhaul-roster.md): clearly
// stronger than Tier 2 but still nowhere near the top shelf. Every mechanic
// resolves through existing engine primitives; every random draw uses
// api.rng (deterministic, replay-safe) and only inside init/effect/
// onMovePlayed.

import type { BoardState } from "../../types";
import { generateMoves } from "../../board";
import {
  ALL_DIRS,
  Buff,
  BuffApi,
  DIAG_DIRS,
  FILE,
  KNIGHT_LEAPS,
  Move,
  ORTHO_DIRS,
  RANK,
  SQ,
  Square,
  activated,
  addEffect,
  advanceablePawns,
  advancePawn,
  augment,
  bindCandidates,
  bindPiece,
  card,
  captureSquare,
  emptyHomeRank,
  emptySquares,
  flashSquares,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  kingSquare,
  mySquares,
  pawnRankOk,
  pieceBound,
  pinCosmetic,
  slideMoves,
  stunEnemy,
  tickTurns,
  timedAugment,
  timedOppFilter,
  turnsLeft,
} from "./shared";

/** Bare buff-generated move (mirrors helpers' internal moveFor). */
function mv(board: BoardState, from: Square, to: Square, via: string): Move {
  const p = board.pieces[from]!;
  const t = board.pieces[to];
  return {
    from,
    to,
    piece: p.type,
    color: p.color,
    ...(t ? { captured: t.type, capturedSquare: to } : {}),
    via,
  };
}

export const OVERHAUL_T3: Buff[] = [
  // 51. Focus Group -----------------------------------------------------------
  // ADAPTED: no power-score infrastructure exists to star-rate an offer, so
  // the focus group delivers intel that does exist: you see the cards of the
  // OPPONENT'S next draft. The description says exactly that.
  card(
    {
      id: "ov_focus_group",
      name: "Focus Group",
      description:
        "The focus group files its report: you see the cards of your opponent's next draft.",
      tier: 3,
      category: "draft",
      icon: "Users",
      flavor: "Eight strangers behind one-way glass agree: take the shiny one.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
    }),
  ),
  // 52. Frog Prince -----------------------------------------------------------
  // ADAPTED: opponent moves can only be filtered, never invented, so the frog
  // keeps whatever diagonal single steps its old body allows: a bishop-frog
  // hops one square diagonally (no captures), a knight-frog has no diagonal
  // step at all and simply sits and ribbits. The description says so.
  card(
    {
      id: "ov_frog_prince",
      name: "Frog Prince",
      description:
        "Turn one enemy knight or bishop into a frog for your opponent's next 3 turns: it may only hop one square diagonally and cannot capture. Knights cannot hop at all and just ribbit.",
      tier: 3,
      category: "attack",
      icon: "Crown",
      flavor: "No amount of kissing is fixing this before move forty.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the minor piece to enfrog",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        pinCosmetic(api, sq, api.opp, "plush", 3, "ribbit");
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => {
          if (m.from !== sq) return true;
          const df = Math.abs(FILE(m.to) - FILE(m.from));
          const dr = Math.abs(RANK(m.to) - RANK(m.from));
          return df === 1 && dr === 1 && !m.captured;
        });
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.me && captureSquare(move) === sq) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && move.from === sq) inst.state.sq = move.to;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null ? "pick a victim" : `${turnsLeft(inst)} of their turns of ribbit left`,
    },
  ),
  // 53. Milkman's Round -------------------------------------------------------
  card(
    {
      id: "ov_milkmans_round",
      name: "Milkman's Round",
      description:
        "Spawn a pawn on an empty square of your second rank now, and reserve a second square: in 3 of your turns another pawn is delivered there (or to any free second-rank square if yours got taken).",
      tier: 3,
      category: "pieces",
      icon: "Milk",
      flavor: "Rain, shine, or double check, the bottles arrive.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.reserved != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Place the first pawn" : "Reserve the second delivery square",
              squares: emptyHomeRank(api).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      effect: (inst, api, picks) => {
        const first = picks[0]?.square, second = picks[1]?.square;
        if (first == null || second == null || inst.state.reserved != null) return;
        api.place(first, "p", api.me);
        inst.state.reserved = second;
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.reserved == null || move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        const reserved = inst.state.reserved as Square;
        let dest: Square | null = !api.board.pieces[reserved] ? reserved : null;
        if (dest == null) {
          const open = emptyHomeRank(api);
          dest = open.length ? open[api.rng.int(open.length)] : null;
        }
        // No open square on the whole rank: the milkman waits and retries
        // after each of your turns until one frees up.
        if (dest != null) {
          api.place(dest, "p", api.me);
          inst.spent = true;
        }
      },
      status: (inst) => {
        if (inst.state.reserved == null) return "activate to start the round";
        const t = turnsLeft(inst);
        return t > 0 ? `second bottle in ${t} of your turns` : "waiting for an open square";
      },
    },
  ),
  // 54. Lightning Rod ---------------------------------------------------------
  card(
    {
      id: "ov_lightning_rod",
      name: "Lightning Rod",
      description:
        "Bolt a rod onto one of your pieces (not the king). If it is captured within 6 of your turns, the storm answers: the capturer is destroyed too.",
      tier: 4,
      category: "protection",
      icon: "Zap",
      flavor: "Grounding recommended. For your opponent.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Bolt the rod onto a piece",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && move.captured && captureSquare(move) === sq) {
          const capturer = api.board.pieces[move.to];
          if (capturer && capturer.color === api.opp && capturer.type !== "k") {
            flashSquares(api, [move.to]);
            api.removePiece(move.to);
          }
          inst.spent = true;
          return;
        }
        if (move.color === api.me && move.from === sq) inst.state.sq = move.to;
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.sq == null ? "pick a piece" : `storm brews for ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 55. Portal Pair -----------------------------------------------------------
  card(
    {
      id: "ov_portal_pair",
      name: "Portal Pair",
      description:
        "Open two portals on empty squares for 5 of your turns: whenever one of your pieces ends a move on a portal, it exits from the other one (if that square is empty).",
      tier: 2,
      category: "movement",
      icon: "Orbit",
      flavor: "Now you are thinking with two extra squares.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.a != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Open the first portal" : "Open the second portal",
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      effect: (inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null || inst.state.a != null) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.turns = 5;
        flashSquares(api, [a, b]);
      },
      onMovePlayed: (inst, move, api) => {
        const a = inst.state.a as Square | undefined;
        const b = inst.state.b as Square | undefined;
        if (a == null || b == null || turnsLeft(inst) <= 0) return;
        if (move.color === api.me) {
          const exit = move.to === a ? b : move.to === b ? a : null;
          if (exit != null && !api.board.pieces[exit]) {
            const p = api.board.pieces[move.to];
            if (p && p.color === api.me && (p.type !== "p" || pawnRankOk(exit))) {
              api.relocate(move.to, exit);
            }
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.a == null ? "activate to place portals" : `humming for ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 56. Backseat Gamer ----------------------------------------------------------
  // ADAPTED: the giant red arrow renders as a flash on the suggested move's
  // two squares (the strike visual that persists until the opponent replies),
  // since there is no arrow overlay primitive. The wager itself is exact.
  card(
    {
      id: "ov_backseat_gamer",
      name: "Backseat Gamer",
      description: "A suggested move flashes on your opponent's board. If their next move is anything else, you gain 13 seconds, one of your pawns advances one square for free, and you gain a draft reroll. In untimed games only the free pawn step and the reroll apply.",
      tip: "They almost never play the suggestion, so treat the payout as the default.",
      tier: 3,
      category: "info",
      icon: "Gamepad2",
      flavor: "JUST TAKE THE ROOK.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        const options = generateMoves({ ...api.board, turn: api.opp });
        if (options.length > 0) {
          const m = options[api.rng.int(options.length)];
          inst.state.from = m.from;
          inst.state.to = m.to;
          flashSquares(api, [m.from, m.to]);
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const f = inst.state.from as Square | undefined;
        const t = inst.state.to as Square | undefined;
        if (!(f === move.from && t === move.to)) {
          api.adjustClock({ addSelfSec: 13 });
          // The clock gain is a no-op in an untimed game, so always land two
          // effects that need no clock: a free non-capturing pawn step and a
          // draft reroll.
          const cands = advanceablePawns(api);
          if (cands.length > 0) advancePawn(api, cands[api.rng.int(cands.length)]);
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        }
        inst.spent = true;
      },
      status: () => "advice posted, judging their next move",
    },
  ),
  // 57. Ventriloquist -----------------------------------------------------------
  card(
    {
      id: "ov_ventriloquist",
      name: "Ventriloquist",
      description:
        "Once, throw your voice: pick an enemy knight and make it perform a legal knight move of your choice to an empty square. No captures.",
      tier: 4,
      category: "tempo",
      icon: "Mic",
      flavor: "The knight swears it never said that.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const dests = (from: Square) => {
          const out: Square[] = [];
          for (const [df, dr] of KNIGHT_LEAPS) {
            const f = FILE(from) + df, r = RANK(from) + dr;
            if (inBoard(f, r) && !api.board.pieces[SQ(f, r)]) out.push(SQ(f, r));
          }
          return out;
        };
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy knight to puppet",
            squares: mySquares(api.board, api.opp, "n").filter((sq) => dests(sq).length > 0),
          };
        }
        return { kind: "square", label: "Choose where it hops", squares: dests(picks[0].square!) };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from]?.color === api.opp && !api.board.pieces[to]) {
          api.relocate(from, to);
        }
      },
    ),
  ),
  // 58. Fire Drill ----------------------------------------------------------------
  // ADAPTED: "freely rearrange" resolves as a chain of pairwise swaps along
  // the chosen rank (up to three), which reaches most permutations of that
  // rank's pieces. The description says swaps.
  card(
    {
      id: "ov_fire_drill",
      name: "Fire Drill",
      description:
        "Sound the alarm on one rank of your half: swap pairs of your pieces standing on it, up to 3 swaps, then everyone pretends this was orderly.",
      tier: 3,
      category: "movement",
      icon: "Siren",
      flavor: "Single file. SINGLE FILE. Fine, any file.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 6) return null;
        if (picks.length === 0) {
          const own = mySquares(api.board, api.me);
          return {
            kind: "square",
            label: "Choose the first piece to swap",
            squares: own.filter(
              (sq) => inHalf(api.me, sq) && own.some((o) => o !== sq && RANK(o) === RANK(sq)),
            ),
          };
        }
        const rank = RANK(picks[0].square!);
        const own = mySquares(api.board, api.me).filter((sq) => RANK(sq) === rank);
        if (picks.length % 2 === 0) {
          return {
            kind: "square",
            label: "Choose another piece to swap, or finish the drill",
            squares: own,
            finishable: true,
          };
        }
        const prev = picks[picks.length - 1].square!;
        return {
          kind: "square",
          label: "Choose its swap partner",
          squares: own.filter((sq) => sq !== prev),
        };
      },
      (_inst, api, picks) => {
        for (let i = 0; i + 1 < picks.length; i += 2) {
          const a = picks[i].square, b = picks[i + 1].square;
          if (a == null || b == null || a === b) continue;
          const pa = api.board.pieces[a], pb = api.board.pieces[b];
          if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) continue;
          const at = pa.type, bt = pb.type;
          api.removePiece(a, { uncounted: true });
          api.removePiece(b, { uncounted: true });
          api.place(a, bt, api.me);
          api.place(b, at, api.me);
        }
      },
    ),
  ),
  // 59. Counterfeit Crown -----------------------------------------------------------
  // ADAPTED: the client cannot literally swap two piece models, so the swap
  // is sold with pinned hat cosmetics and lying labels on both royals for 5
  // turns. Pure cosmetic mischief, exactly as the roster intends: logic,
  // legality and hitboxes are untouched.
  card(
    {
      id: "ov_counterfeit_crown",
      name: "Counterfeit Crown",
      description:
        "For 5 turns your king and queen wear each other's crowns and lying labels. Purely cosmetic: rules, legality and hitboxes are completely unaffected.",
      tier: 3,
      category: "item",
      icon: "VenetianMask",
      flavor: "Genuine royal headwear, says the man selling it from a coat.",
      requires: ["q"],
    },
    instant((_inst, api) => {
      const k = kingSquare(api.board, api.me);
      const q = mySquares(api.board, api.me, "q")[0];
      if (k != null) pinCosmetic(api, k, api.me, "hat", 5, "definitely the queen");
      if (q != null) pinCosmetic(api, q, api.me, "hat", 5, "definitely the king");
    }),
  ),
  // 60. Draft Dodger -----------------------------------------------------------------
  // ADAPTED per DraftFlags semantics: blockedDrafts (normally inflicted by
  // the opponent) is applied to yourself here to skip your own next draft
  // outright, prepThree fattens the draft after it, and the 25 seconds land
  // now.
  card(
    {
      id: "ov_draft_dodger",
      name: "Draft Dodger",
      description:
        "Dodge your next draft entirely: gain 30 seconds now, and the draft after that offers 3 cards instead of 2. One of your pawns also advances one square for free and you gain one draft reroll. In untimed games only the free pawn step and the reroll apply.",
      tier: 3,
      category: "draft",
      icon: "DoorOpen",
      flavor: "He left a polite note and a cloud of dust.",
    },
    instant((_inst, api) => {
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      api.mine.flags.prepThree = true;
      api.adjustClock({ addSelfSec: 30 });
      // The clock gain is a no-op in an untimed game, so always land two
      // effects that need no clock: a free non-capturing pawn step and a
      // draft reroll.
      const cands = advanceablePawns(api);
      if (cands.length > 0) advancePawn(api, cands[api.rng.int(cands.length)]);
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  // 61. Tax Audit ----------------------------------------------------------------------
  card(
    {
      id: "ov_tax_audit",
      name: "Tax Audit",
      description: "Audit both armies: your opponent loses 15 seconds for every piece they hold beyond your count, up to 50. If they are not ahead in material the audit finds nothing. Either way you gain a reroll and see their next draft's tier. Untimed: reroll and reveal only.",
      tip: "A comeback card in timed games: the further behind you are, the more it takes.",
      tier: 3,
      category: "tempo",
      icon: "Calculator",
      flavor: "The abacus clicks. Somewhere, a rook sweats.",
    },
    instant((_inst, api) => {
      const surplus = mySquares(api.board, api.opp).length - mySquares(api.board, api.me).length;
      const k = kingSquare(api.board, api.opp);
      if (k != null) flashSquares(api, [k]);
      if (surplus > 0) api.adjustClock({ subOppSec: Math.min(50, surplus * 15) });
      // The clock steal is a no-op in an untimed game, so always land two
      // effects that need no clock: a draft reroll and a peek at the tier of
      // the opponent's next draft.
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  // 62. Knight Court ---------------------------------------------------------------------
  card(
    {
      id: "ov_knight_court",
      name: "Knight Court",
      description: "For your next 3 turns, your knights may also step one square straight up, down, or sideways. The court frowns on diagonals.",
      tier: 3,
      category: "movement",
      icon: "Gavel",
      flavor: "Court is in session. All rise, then step one square.",
      requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    // Overhaul duplicate-resolution: all-direction king-steps duplicated
    // Pixie Dust (same tier); the court grants orthogonal steps for longer.
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "n")) {
        out.push(...slideMoves(api.board, sq, ORTHO_DIRS, inst.id, 1));
      }
      return out;
    }),
  ),
  // 63. Quicksilver -------------------------------------------------------------------------
  card(
    {
      id: "ov_quicksilver",
      name: "Quicksilver",
      description:
        "Your queen's next move may bend once at 90 degrees: up to 7 squares in total, the whole path must be clear, the corner square must be empty, and the destination must be empty (it cannot capture).",
      tier: 3,
      category: "movement",
      icon: "Droplets",
      flavor: "Liquid metal takes corners better than solid royalty.",
      requires: ["q"],
      fx: { motif: "empower", pieces: ["q"], self: true },
    },
    augment((_moves, inst, api) => quicksilverMoves(inst.id, api)),
  ),
  // 64. Poltergeist ---------------------------------------------------------------------------
  card(
    {
      id: "ov_poltergeist",
      name: "Poltergeist",
      description:
        "For your opponent's next 3 turns, a poltergeist shoves one random enemy pawn one square sideways at the start of each (when a side square is empty).",
      tier: 2,
      category: "attack",
      icon: "Ghost",
      flavor: "The rattling is free. The giggling costs extra.",
      fx: { motif: "slow", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || turnsLeft(inst) <= 0) return;
        const shovable: [Square, Square][] = [];
        for (const sq of mySquares(api.board, api.opp, "p")) {
          if (FILE(sq) > 0 && !api.board.pieces[sq - 1]) shovable.push([sq, sq - 1]);
          if (FILE(sq) < 7 && !api.board.pieces[sq + 1]) shovable.push([sq, sq + 1]);
        }
        if (shovable.length > 0) {
          const [from, to] = shovable[api.rng.int(shovable.length)];
          api.relocate(from, to);
          flashSquares(api, [to], true);
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} hauntings left`,
    },
  ),
  // 65. Bake Sale ------------------------------------------------------------------------------
  card(
    {
      id: "ov_bake_sale",
      name: "Bake Sale",
      description:
        "Gain 15 seconds now. For your next 5 turns, every pawn move you make sells another cookie for 5 more seconds. You also gain one draft reroll and see the tier of your opponent's next draft. In untimed games only the reroll and the reveal apply.",
      tier: 3,
      category: "tempo",
      icon: "Cookie",
      flavor: "Proceeds go toward the war effort. And sprinkles.",
      requires: ["p"],
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 5;
        api.adjustClock({ addSelfSec: 15 });
        // The clock gain is a no-op in an untimed game, so always land two
        // effects that need no clock: a draft reroll and a peek at the tier
        // of the opponent's next draft.
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        api.mine.flags.seeOppTier = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.piece === "p") {
          api.adjustClock({ addSelfSec: 5 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of sales left`,
    },
  ),
  // 66. Siege Ladder ------------------------------------------------------------------------------
  card(
    {
      id: "ov_siege_ladder",
      name: "Siege Ladder",
      description:
        "Slap ladders on one file: for 3 of your turns, your rooks, bishops and queen may slide straight through enemy pawns standing on that file.",
      tier: 4,
      category: "movement",
      icon: "Castle",
      flavor: "Pawns make excellent rungs. Do not tell them.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.file != null
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to ladder",
              squares: Array.from({ length: 64 }, (_, i) => i as Square),
            },
      effect: (inst, api, picks) => {
        if (picks[0]?.square == null || inst.state.file != null) return;
        inst.state.file = FILE(picks[0].square);
        inst.state.turns = 3;
        flashSquares(api, [picks[0].square]);
      },
      augmentMoves: (moves, inst, api) => {
        const file = inst.state.file as number | undefined;
        if (file == null || turnsLeft(inst) <= 0) return;
        const dirsOf = { r: ORTHO_DIRS, b: DIAG_DIRS, q: ALL_DIRS } as const;
        for (const type of ["r", "b", "q"] as const) {
          for (const from of mySquares(api.board, api.me, type)) {
            for (const [df, dr] of dirsOf[type]) {
              let f = FILE(from) + df, r = RANK(from) + dr, passed = 0;
              while (inBoard(f, r)) {
                const to = SQ(f, r);
                const t = api.board.pieces[to];
                if (!t) {
                  if (passed > 0) moves.push(mv(api.board, from, to, inst.id));
                } else if (t.color === api.opp && t.type === "p" && FILE(to) === file) {
                  passed++;
                } else {
                  if (passed > 0 && t.color === api.opp) {
                    moves.push(mv(api.board, from, to, inst.id));
                  }
                  break;
                }
                f += df;
                r += dr;
              }
            }
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.file != null) tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.file == null
          ? "pick a file"
          : `ladders up for ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 67. Emote Wheel ---------------------------------------------------------------------------------
  card(
    {
      id: "ov_emote_wheel",
      name: "Emote Wheel",
      description:
        "Hold the emote wheel for 6 of your turns. Once, drop a devastating GG on one enemy piece adjacent to any of your pieces: it is stunned for 1 turn.",
      tier: 3,
      category: "tempo",
      icon: "SmilePlus",
      flavor: "Well played. Emotionally, a war crime.",
    },
    {
      kind: "activated",
      freeAction: true,
      init: (inst) => {
        inst.state.turns = 6;
      },
      targets: (inst, api, picks) => {
        if (picks.length > 0 || turnsLeft(inst) <= 0) return null;
        const adj = new Set<Square>();
        for (const sq of mySquares(api.board, api.me)) {
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(sq) + df, r = RANK(sq) + dr;
              if (inBoard(f, r)) adj.add(SQ(f, r));
            }
          }
        }
        return {
          kind: "square",
          label: "Drop the GG on an adjacent enemy piece",
          squares: mySquares(api.board, api.opp).filter(
            (sq) => adj.has(sq) && api.board.pieces[sq]!.type !== "k",
          ),
        };
      },
      effect: (_inst, api, picks) => {
        if (picks[0]?.square != null) stunEnemy(api, picks[0].square, 1);
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.me),
      status: (inst) => `GG loaded, ${turnsLeft(inst)} of your turns to use it`,
    },
  ),
  // 68. Masterclass -----------------------------------------------------------------------------------
  card(
    {
      id: "ov_masterclass",
      name: "Masterclass",
      description: "One pawn graduates: it permanently gains the ability to capture straight ahead.",
      tier: 2,
      category: "movement",
      icon: "Award",
      flavor: "Top of a class of one.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    pieceBound("p", "Choose the pawn attending the masterclass", (board, sq, via) => {
      const p = board.pieces[sq]!;
      const dir: readonly [number, number] = p.color === "w" ? [0, 1] : [0, -1];
      return slideMoves(board, sq, [dir], via, 1).filter((m) => m.captured);
    }),
  ),
  // 69. Tasting Flight ----------------------------------------------------------------------------------
  card(
    {
      id: "ov_tasting_flight",
      name: "Tasting Flight",
      description: "Your next draft offers 3 cards instead of 2.",
      tier: 4,
      category: "draft",
      icon: "Wine",
      flavor: "Notes of tempo, a long finish, hints of pawn.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
    }),
  ),
  // 70. Boomerang ----------------------------------------------------------------------------------------
  card(
    {
      id: "ov_boomerang",
      name: "Boomerang",
      description:
        "One of your pieces throws: remove the first enemy pawn up to 3 squares away in a straight line with a clear flight path. On the return, if a friendly piece stands directly in front of the thrower, the catch stuns it for 1 turn.",
      tier: 4,
      category: "attack",
      icon: "IterationCw",
      flavor: "It always comes back. That is the problem.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const targetsFrom = (from: Square): Square[] => {
          const out: Square[] = [];
          for (const [df, dr] of ALL_DIRS) {
            let f = FILE(from) + df, r = RANK(from) + dr, d = 1;
            while (inBoard(f, r) && d <= 3) {
              const sq = SQ(f, r);
              const p = api.board.pieces[sq];
              if (p) {
                if (p.color === api.opp && p.type === "p") out.push(sq);
                break;
              }
              f += df;
              r += dr;
              d++;
            }
          }
          return out;
        };
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the thrower",
            squares: mySquares(api.board, api.me).filter((sq) => targetsFrom(sq).length > 0),
          };
        }
        return {
          kind: "square",
          label: "Choose the enemy pawn to clip",
          squares: targetsFrom(picks[0].square!),
        };
      },
      (_inst, api, picks) => {
        const thrower = picks[0]?.square, target = picks[1]?.square;
        if (thrower == null || target == null) return;
        if (api.board.pieces[target]?.color === api.opp) {
          flashSquares(api, [target], true);
          api.removePiece(target);
        }
        const front = thrower + fwdOf(api.me);
        if (front >= 0 && front <= 63 && api.board.pieces[front]?.color === api.me) {
          addEffect(api, { kind: "freeze", sq: front, owner: api.me, turns: 1, skin: "stun" });
        }
      },
    ),
  ),
  // 71. Growth Ring ---------------------------------------------------------------------------------------
  card(
    {
      id: "ov_growth_ring",
      name: "Growth Ring",
      description:
        "Bless one square and its neighbors: for your opponent's next 4 turns, your pieces standing in that area cannot be captured by enemy pawns.",
      tier: 4,
      category: "protection",
      icon: "TreePine",
      flavor: "The moss remembers. The pawns cannot get through the moss.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: "Choose the heart of the ring",
              squares: Array.from({ length: 64 }, (_, i) => i as Square),
            },
      effect: (inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null || inst.state.squares != null) return;
        const zone: Square[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            const f = FILE(c) + df, r = RANK(c) + dr;
            if (inBoard(f, r)) zone.push(SQ(f, r));
          }
        }
        inst.state.squares = zone;
        inst.state.turns = 4;
        flashSquares(api, zone);
      },
      filterOpponentMoves: (moves, inst) => {
        const zone = inst.state.squares as Square[] | undefined;
        if (!zone || turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => {
          if (m.piece !== "p" || !m.captured || m.captured === "k") return true;
          const cap = captureSquare(m);
          return cap == null || !zone.includes(cap);
        });
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.squares != null) tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.squares == null
          ? "pick the center"
          : `${turnsLeft(inst)} of their turns of shelter left`,
    },
  ),
  // 72. Night Shift ------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_night_shift",
      name: "Night Shift",
      description: "For your next 3 turns, your rooks may move straight through your own pawns, but these moves cannot capture.",
      tier: 3,
      category: "movement",
      icon: "Moon",
      flavor: "The pawns are asleep. The rooks clock in.",
      requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], self: true },
    },
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const from of mySquares(api.board, api.me, "r")) {
        for (const [df, dr] of ORTHO_DIRS) {
          let f = FILE(from) + df, r = RANK(from) + dr, passed = 0;
          while (inBoard(f, r)) {
            const to = SQ(f, r);
            const t = api.board.pieces[to];
            if (!t) {
              if (passed > 0) out.push(mv(api.board, from, to, inst.id));
            } else if (t.color === api.me) {
              if (t.type !== "p") break;
              passed++;
            } else {
              // Cannot capture: an enemy piece just blocks the ray.
              break;
            }
            f += df;
            r += dr;
          }
        }
      }
      return out;
    }),
  ),
  // 73. Pillow Fort -------------------------------------------------------------------------------------------
  // ADAPTED: "sliders cannot give check" is enforced on the moved piece: an
  // enemy bishop, rook or queen may not move to a square from which it would
  // itself attack your king. Discovered attacks by a piece that did not move
  // are not blocked (no primitive sees them); knights and pawns are free.
  card(
    {
      id: "ov_pillow_fort",
      name: "Pillow Fort",
      description:
        "For your opponent's next turn, their bishops, rooks and queen cannot move to any square from which they would attack your king. Knights and pawns may still menace.",
      tier: 3,
      category: "protection",
      icon: "Bed",
      flavor: "Structurally unsound. Emotionally impenetrable.",
      fx: { motif: "blindfold", pieces: ["b", "r", "q"] },
    },
    timedOppFilter(1, (moves, _inst, api) => {
      const k = kingSquare(api.board, api.me);
      if (k == null) return moves;
      const wouldAttackKing = (m: Move): boolean => {
        if (m.to === k) return false;
        const df = FILE(k) - FILE(m.to), dr = RANK(k) - RANK(m.to);
        const adf = Math.abs(df), adr = Math.abs(dr);
        const diag = adf === adr && adf > 0;
        const ortho = (df === 0) !== (dr === 0);
        if (m.piece === "b" && !diag) return false;
        if (m.piece === "r" && !ortho) return false;
        if (m.piece === "q" && !diag && !ortho) return false;
        const sf = Math.sign(df), sr = Math.sign(dr);
        let f = FILE(m.to) + sf, r = RANK(m.to) + sr;
        while (SQ(f, r) !== k) {
          const sq = SQ(f, r);
          if (sq !== m.from && api.board.pieces[sq]) return false;
          f += sf;
          r += sr;
        }
        return true;
      };
      return moves.filter(
        (m) => (m.piece !== "b" && m.piece !== "r" && m.piece !== "q") || !wouldAttackKing(m),
      );
    }),
  ),
  // 74. Gold Rush ---------------------------------------------------------------------------------------------
  // ADAPTED: no clock primitive can credit the opponent, so an enemy piece
  // landing on a nugget spoils it instead of cashing it. Your own landings
  // pay the full 10 seconds. The description matches.
  card(
    {
      id: "ov_gold_rush",
      name: "Gold Rush",
      description:
        "Gold is buried under 3 random empty squares for 6 of your turns. Land one of your pieces on a nugget to gain 10 seconds; an enemy piece landing there first tramples that nugget into worthless dust.",
      tier: 3,
      category: "item",
      icon: "Pickaxe",
      flavor: "There is gold in them there files.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        const pool = emptySquares(api.board);
        const chosen: Square[] = [];
        for (let i = 0; i < 3 && pool.length > 0; i++) {
          chosen.push(pool.splice(api.rng.int(pool.length), 1)[0]);
        }
        inst.state.squares = chosen;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        const squares = (inst.state.squares as Square[]) ?? [];
        const idx = squares.indexOf(move.to);
        if (idx >= 0) {
          squares.splice(idx, 1);
          flashSquares(api, [move.to], move.color !== api.me);
          if (move.color === api.me) api.adjustClock({ addSelfSec: 10 });
        }
        tickTurns(inst, move, api.me);
        if (squares.length === 0) inst.spent = true;
      },
      status: (inst) => {
        const n = ((inst.state.squares as Square[]) ?? []).length;
        return `${n} nugget${n === 1 ? "" : "s"} buried, ${turnsLeft(inst)} of your turns left`;
      },
    },
  ),
  // 75. Chariot Lessons ---------------------------------------------------------------------------------------
  card(
    {
      id: "ov_chariot_lessons",
      name: "Chariot Lessons",
      description:
        "Hitch up one rook: for 5 of your turns it is a chariot, keeping its rook moves and adding one-square diagonal steps.",
      tier: 2,
      category: "pieces",
      icon: "CarFront",
      flavor: "Week one: reins. Week two: cornering.",
      requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], moveAs: "b", self: true },
    },
    bindPiece("Choose the rook taking lessons", bindCandidates(["r"]), {
      turns: 5,
      gen: (board, sq, via) => slideMoves(board, sq, DIAG_DIRS, via, 1),
    }),
  ),
];

/** Quicksilver's bent-queen moves: the elbow square must be empty, every
 * square before the destination must be empty, and the destination must be
 * empty too (the bent move cannot capture). Total length capped at 7 squares. */
function quicksilverMoves(via: string, api: BuffApi): Move[] {
  const out: Move[] = [];
  for (const from of mySquares(api.board, api.me, "q")) {
    for (const d1 of ALL_DIRS) {
      let f = FILE(from) + d1[0], r = RANK(from) + d1[1], a = 1;
      while (inBoard(f, r) && a <= 6 && !api.board.pieces[SQ(f, r)]) {
        const perps = [
          [d1[1], -d1[0]],
          [-d1[1], d1[0]],
        ] as const;
        for (const d2 of perps) {
          let f2 = f + d2[0], r2 = r + d2[1], b = 1;
          while (inBoard(f2, r2) && a + b <= 7) {
            const to = SQ(f2, r2);
            const t = api.board.pieces[to];
            if (!t) {
              out.push(mv(api.board, from, to, via));
            } else {
              // Cannot capture: an occupied destination just blocks the ray.
              break;
            }
            f2 += d2[0];
            r2 += d2[1];
            b++;
          }
        }
        f += d1[0];
        r += d1[1];
        a++;
      }
    }
  }
  return out;
}
