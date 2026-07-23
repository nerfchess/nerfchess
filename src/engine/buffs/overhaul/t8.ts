// Overhaul roster, Tier 8 (cards 176-200 of docs/overhaul-roster.md): the
// exceptional-and-memorable band. Where roster text asked for machinery the
// engine does not have (per-turn command menus, simultaneous submission,
// phantom ranks), the card keeps its SPIRIT through existing primitives and
// the description tells the truth; every such delta carries an
// "// ADAPTED:" note. Randomness: api.rng only, in effect paths only.

import type { BuffInstance, BuffPick } from "../../buff";
import {
  Buff,
  BuffApi,
  FILE,
  KNIGHT_LEAPS,
  Move,
  PieceType,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  advancePawn,
  advanceablePawns,
  attacksSquare,
  buffRegistry,
  card,
  emptySquares,
  emptyHomeRank,
  flashSquares,
  fwdOf,
  inHalf,
  instant,
  kingSquare,
  markRevived,
  mySquares,
  ownRank,
  pinCosmetic,
  relocateMany,
  revivable,
  stunEnemy,
  teleportMoves,
  tickTurns,
  turnsLeft,
} from "./shared";

/** Random element of a possibly-empty array off the effect RNG. */
function pickRng<T>(api: BuffApi, arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[api.rng.int(arr.length)];
}

/** The 2x2 block anchored at `sq` (needs room right and up). */
function block2x2(sq: Square): Square[] {
  return [sq, sq + 1, sq + 8, sq + 9];
}

export const OVERHAUL_T8: Buff[] = [
  // 176. The Elder Wyrm --------------------------------------------------------
  card(
    {
      id: "ov_elder_wyrm",
      name: "The Elder Wyrm",
      description:
        "The great dragon lands on a chosen empty 2x2 area for 6 of your turns: nothing may enter its footprint, and after each of your moves its wingbeat hurls one adjacent enemy piece, never a king, one square away into an empty square. The dragon cannot capture.",
      tier: 8,
      category: "pieces",
      icon: "Flame",
      flavor: "It did not come when called. It came when it felt like it.",
    },
    // ADAPTED: the roster's per-turn command menu (breath/gust/tail) needs a
    // choice UI the engine does not have; the wyrm instead acts automatically
    // each turn. Balance pass: its special action can no longer capture, so the
    // pawn-burn is gone and only the non-capturing gust-push remains.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the wyrm's landing (the lower-left square of an empty 2x2)",
              squares: emptySquares(api.board).filter((sq) => {
                if (FILE(sq) > 6 || RANK(sq) > 6) return false;
                return block2x2(sq).every((s) => !api.board.pieces[s]);
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
        const squares = block2x2(sq);
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
        addEffect(api, { kind: "barred", squares, against: api.me, turns: null });
        flashSquares(api, squares);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.me) return;
        const foot = block2x2(sq);
        // Movement identity only: the wingbeat hurls one adjacent enemy piece
        // one square away into empty space. It can no longer capture (the old
        // pawn-burn is gone), so nothing is ever removed from the board here.
        const adj = mySquares(api.board, api.opp).filter(
          (s) =>
            api.board.pieces[s]!.type !== "k" &&
            foot.some(
              (f) => Math.abs(FILE(f) - FILE(s)) <= 1 && Math.abs(RANK(f) - RANK(s)) <= 1,
            ),
        );
        const target = pickRng(api, adj);
        if (target != null) {
          const cf = FILE(sq) + 0.5, cr = RANK(sq) + 0.5;
          const df = Math.sign(FILE(target) - cf), dr = Math.sign(RANK(target) - cr);
          const f = FILE(target) + df, r = RANK(target) + dr;
          if (f >= 0 && f <= 7 && r >= 0 && r <= 7 && !api.board.pieces[SQ(f, r)]) {
            api.relocate(target, SQ(f, r));
            flashSquares(api, [SQ(f, r)], true);
          }
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.bs.effects = api.bs.effects.filter(
            (e) =>
              !(
                e.kind === "barred" &&
                e.turns == null &&
                e.squares.length === 4 &&
                e.squares[0] === foot[0] &&
                e.squares[3] === foot[3]
              ),
          );
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to call the wyrm down"
          : `the wyrm hunts, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 177. The Rapture of Pawns -----------------------------------------------------
  card(
    {
      id: "ov_rapture_of_pawns",
      name: "The Rapture of Pawns",
      description:
        "Choose up to three of your pawns to uplift permanently: each may also step one square sideways or diagonally forward without capturing. Captures stay diagonal, as the heavens intended.",
      tier: 8,
      category: "movement",
      icon: "Feather",
      flavor: "They looked up. Something looked back. It approved.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    // Balance pass: the uplift no longer touches the whole army. You designate
    // up to three pawns (a free action); those pawns keep the gift permanently,
    // and the card tracks them across the board until they are captured or
    // promote away.
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) => {
        if (inst.state.sqs != null || picks.length >= 3) return null;
        const chosen = picks.map((k) => k.square);
        const squares = mySquares(api.board, api.me, "p").filter((sq) => !chosen.includes(sq));
        if (squares.length === 0) return null;
        return {
          kind: "square",
          label: `Choose pawn ${picks.length + 1} of up to 3 to uplift`,
          squares,
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      effect: (inst, api, picks) => {
        if (inst.state.sqs != null) return;
        const sqs = picks.map((k) => k.square).filter((s): s is Square => s != null);
        inst.state.sqs = sqs;
        for (const sq of sqs) pinCosmetic(api, sq, api.me, "wings", null);
      },
      augmentMoves: (moves, inst, api) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (!sqs) return;
        const out: Move[] = [];
        const fwd = api.me === "w" ? 1 : -1;
        for (const sq of sqs) {
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me || p.type !== "p") continue;
          const tos: Square[] = [];
          const f = FILE(sq), r = RANK(sq);
          if (f > 0) tos.push(SQ(f - 1, r));
          if (f < 7) tos.push(SQ(f + 1, r));
          if (r + fwd >= 0 && r + fwd <= 7) {
            if (f > 0) tos.push(SQ(f - 1, r + fwd));
            if (f < 7) tos.push(SQ(f + 1, r + fwd));
          }
          out.push(
            ...teleportMoves(
              api.board,
              sq,
              tos.filter((t) => RANK(t) !== 0 && RANK(t) !== 7),
              inst.id,
            ),
          );
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (!sqs) return;
        const next: Square[] = [];
        for (const sq of sqs) {
          if (move.capturedSquare === sq && move.from !== sq) continue;
          if (move.from === sq) {
            if (move.promotion) continue;
            next.push(move.to);
          } else if (move.to === sq && move.from !== sq) {
            continue;
          } else {
            next.push(sq);
          }
        }
        inst.state.sqs = next;
      },
      status: (inst) => {
        const sqs = inst.state.sqs as Square[] | undefined;
        if (sqs == null) return "activate to uplift up to three pawns";
        return `${sqs.length} uplifted ${sqs.length === 1 ? "pawn walks" : "pawns walk"} on air`;
      },
    },
  ),
  // 178. Board of Directors ---------------------------------------------------------
  card(
    {
      id: "ov_board_of_directors",
      name: "Board of Directors",
      description:
        "Convene the Board and appoint two of its four departments for 6 of your turns. After each of your moves your chosen departments report: Operations advances one of your pawns every third turn; Intelligence reveals enemy pieces you attack that stand undefended; Treasury adds 12 seconds to your clock; Drafting grants a reroll and lifts your next draft one tier. You pick the two departments, not the Board.",
      tier: 8,
      category: "info",
      icon: "Briefcase",
      flavor: "Synergy. Alignment. A pawn to e4 going forward.",
    },
    // Balance pass: the player now appoints the departments. The engine has no
    // abstract option menu, so the two-of-four choice is collected through the
    // four marker squares a-d on your back rank (the label maps each file to a
    // department); picking a marker appoints that department and moves nothing.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.depts != null || picks.length >= 2) return null;
        const r = ownRank(api.me, 0);
        const chosen = picks.map((k) => k.square);
        const squares = [0, 1, 2, 3]
          .map((f) => SQ(f, r))
          .filter((sq) => !chosen.includes(sq));
        return {
          kind: "square",
          label: `Appoint department ${picks.length + 1} of 2 (pick its back-rank marker): a = Operations (a pawn step every third turn), b = Intelligence (reveal undefended targets), c = Treasury (12 seconds each turn), d = Drafting (a reroll and a tier-up draft).`,
          squares,
        };
      },
      effect: (inst, api, picks) => {
        if (inst.state.depts != null) return;
        const depts = picks
          .map((k) => (k.square != null ? FILE(k.square) : -1))
          .filter((f) => f >= 0 && f <= 3);
        inst.state.depts = depts;
        inst.state.turns = 6;
        inst.state.opsCount = 0;
        const r = ownRank(api.me, 0);
        flashSquares(api, depts.map((f) => SQ(f, r)));
      },
      onMovePlayed: (inst, move, api) => {
        const depts = inst.state.depts as number[] | undefined;
        if (!depts || move.color !== api.me) return;
        if (depts.includes(0)) {
          const c = ((inst.state.opsCount as number) ?? 0) + 1;
          inst.state.opsCount = c;
          if (c % 3 === 0) {
            const pawn = pickRng(api, advanceablePawns(api));
            if (pawn != null) advancePawn(api, pawn);
          }
        }
        if (depts.includes(1)) {
          const hanging = mySquares(api.board, api.opp).filter((sq) => {
            const p = api.board.pieces[sq]!;
            if (p.type === "k") return false;
            const attacked = mySquares(api.board, api.me).some((a) =>
              attacksSquare(api.board, a, sq),
            );
            const defended = mySquares(api.board, api.opp).some(
              (d) => d !== sq && attacksSquare(api.board, d, sq),
            );
            return attacked && !defended;
          });
          flashSquares(api, hanging);
        }
        if (depts.includes(2)) api.adjustClock({ addSelfSec: 12 });
        if (depts.includes(3)) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          api.mine.flags.bankBonus = 1;
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.depts == null
          ? "convene to appoint two departments"
          : `${turnsLeft(inst)} board meetings left`,
    },
  ),
  // 179. Continental Drift --------------------------------------------------------------
  card(
    {
      id: "ov_continental_drift",
      name: "Continental Drift",
      description:
        "A chasm tears the board between the fourth and fifth ranks for your opponent's next 5 turns: their pieces cannot cross it, except knights or through the two bridge squares you choose.",
      tier: 9,
      category: "protection",
      icon: "Mountain",
      flavor: "The tectonic plates have picked a side.",
    },
    // ADAPTED: legal-move filtering only exists against the OPPONENT, so the
    // chasm binds their army; your side keeps its footing (a tier-8 wall).
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, _api, picks) => {
        if (inst.state.bridges != null || picks.length >= 2) return null;
        const mid = (sq: Square) => RANK(sq) === 3 || RANK(sq) === 4;
        return {
          kind: "square",
          label: `Choose bridge square ${picks.length + 1} of 2 (on the fourth or fifth rank)`,
          squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
            (sq) => mid(sq) && !picks.some((k) => k.square === sq),
          ),
        };
      },
      effect: (inst, api, picks) => {
        if (inst.state.bridges != null) return;
        inst.state.bridges = picks.map((k) => k.square).filter((s): s is Square => s != null);
        inst.state.turns = 5;
        flashSquares(api, inst.state.bridges as Square[]);
      },
      filterOpponentMoves: (moves, inst) => {
        const bridges = (inst.state.bridges as Square[] | undefined) ?? [];
        if (inst.state.bridges == null || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        return moves.filter((m) => {
          if (m.piece === "n" || m.drop) return true;
          const a = RANK(m.from) <= 3, b = RANK(m.to) <= 3;
          if (a === b) return true;
          return bridges.includes(m.from) || bridges.includes(m.to);
        });
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.bridges == null) return;
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.bridges == null
          ? "activate to open the chasm"
          : `the chasm holds for ${turnsLeft(inst)} of their turns`,
    },
  ),
  // 180. The Menu -----------------------------------------------------------------------
  card(
    {
      id: "ov_the_menu",
      name: "The Menu",
      description: "Your next draft is dealt three cards, and you keep every one of them.",
      tier: 8,
      category: "draft",
      icon: "ScrollText",
      flavor: "Yes. All of it. And a glass of the house tempo.",
    },
    // ADAPTED: no full-pool picker exists; three-cards-take-all is the
    // strongest honest composition of the existing draft flags.
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
    }),
  ),
  // 181. Let Me Play For You ------------------------------------------------------------------
  card(
    {
      id: "ov_let_me_play_for_you",
      name: "Let Me Play For You",
      description:
        "Three times, at most once per your turn and as a free action, move one of your opponent's pieces yourself: any empty square its normal movement reaches. No captures, kings excluded.",
      tier: 9,
      category: "movement",
      icon: "Hand",
      flavor: "Player two controller connected.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      init: (inst) => {
        inst.state.charges = 3;
      },
      targets: (inst, api, picks) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return null;
        if ((inst.state.lastPly as number | undefined) === api.board.history.length) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose whose hand you are guiding",
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const p = api.board.pieces[sq]!;
              return p.type !== "k" && enemyQuietDests(api, sq).length > 0;
            }),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose where they move it",
            squares: enemyQuietDests(api, picks[0].square!),
          };
        }
        return null;
      },
      effect: (inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        api.relocate(from, to);
        inst.state.charges = ((inst.state.charges as number) ?? 1) - 1;
        inst.state.lastPly = api.board.history.length;
        flashSquares(api, [to], true);
        if (((inst.state.charges as number) ?? 0) <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} controlled moves left`,
    },
  ),
  // 182. Deus Ex Machina -----------------------------------------------------------------------
  card(
    {
      id: "ov_deus_ex_machina",
      name: "Deus Ex Machina",
      description:
        "The machine god intervenes once: if your queen has fallen she is restored to an empty square of your first two ranks. Otherwise every freeze on your army is cleansed and the last two enemy pieces that moved are stunned for 1 turn.",
      tier: 8,
      category: "pieces",
      icon: "Cog",
      flavor: "Act five, on schedule, with hydraulics.",
    },
    activatedSimple((_inst, api) => {
      if (revivable(api, "q") > 0) {
        const home = [...emptyHomeRank(api, 0), ...emptyHomeRank(api, 1)];
        const sq = pickRng(api, home);
        if (sq != null) {
          api.place(sq, "q", api.me);
          markRevived(api, "q");
          flashSquares(api, [sq]);
          return;
        }
      }
      api.bs.effects = api.bs.effects.filter(
        (e) => !((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me),
      );
      const seen = new Set<Square>();
      for (let i = api.board.history.length - 1; i >= 0 && seen.size < 2; i--) {
        const m = api.board.history[i];
        if (m.color !== api.opp) continue;
        const p = api.board.pieces[m.to];
        if (p && p.color === api.opp && p.type !== "k" && !seen.has(m.to)) {
          stunEnemy(api, m.to, 1);
          seen.add(m.to);
        }
      }
    }),
  ),
  // 183. Pandemonium Carnival ----------------------------------------------------------------------
  card(
    {
      id: "ov_pandemonium_carnival",
      name: "Pandemonium Carnival",
      description:
        "The carnival parks beside the board for 4 of your turns. After every move by either side the wheel spins a minor act: a random pawn wanders sideways, a random piece naps for a turn, a random square is roped off for a turn, or confetti falls and nothing happens at all.",
      tier: 8,
      category: "item",
      icon: "FerrisWheel",
      flavor: "The calliope is load-bearing.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        const roll = api.rng.int(8);
        if (roll === 0 || roll === 1) {
          const side = api.rng.int(2) === 0 ? api.me : api.opp;
          const pawns = mySquares(api.board, side, "p").filter((sq) => {
            const l = FILE(sq) > 0 && !api.board.pieces[sq - 1];
            const r = FILE(sq) < 7 && !api.board.pieces[sq + 1];
            return l || r;
          });
          const sq = pickRng(api, pawns);
          if (sq != null) {
            const opts: Square[] = [];
            if (FILE(sq) > 0 && !api.board.pieces[sq - 1]) opts.push(sq - 1);
            if (FILE(sq) < 7 && !api.board.pieces[sq + 1]) opts.push(sq + 1);
            const to = pickRng(api, opts);
            if (to != null) api.relocate(sq, to);
          }
        } else if (roll === 2) {
          const side = api.rng.int(2) === 0 ? api.me : api.opp;
          const targets = mySquares(api.board, side).filter(
            (sq) => api.board.pieces[sq]!.type !== "k",
          );
          const sq = pickRng(api, targets);
          if (sq != null) {
            addEffect(api, { kind: "freeze", sq, owner: side, turns: 1, skin: "charm" });
          }
        } else if (roll === 3) {
          const sq = pickRng(api, emptySquares(api.board));
          if (sq != null) {
            addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 1 });
            addEffect(api, { kind: "barred", squares: [sq], against: api.me, turns: 1 });
          }
        } else {
          flashSquares(api, [move.to], true);
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of carnival left`,
    },
  ),
  // 184. The Ninth Rank ---------------------------------------------------------------------------------
  card(
    {
      id: "ov_ninth_rank",
      name: "The Ninth Rank",
      description:
        "A phantom rank opens behind your first: enemy pieces cannot set foot anywhere on your back rank for your opponent's next 6 turns.",
      tier: 8,
      category: "protection",
      icon: "DoorClosed",
      flavor: "There is another room behind the throne room. There always was.",
    },
    // ADAPTED: true extra squares beyond the board would need renderer
    // surgery; the sanctuary reads as your back rank being unreachable.
    instant((_inst, api) => {
      const r = ownRank(api.me, 0);
      const squares = Array.from({ length: 8 }, (_, f) => SQ(f, r));
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 6 });
    }),
  ),
  // 185. All the King's Men -------------------------------------------------------------------------------
  card(
    {
      id: "ov_all_the_kings_men",
      name: "All the King's Men",
      description:
        "Up to four of your captured pieces return at once, strongest first, on random empty squares in your half.",
      tier: 7,
      category: "pieces",
      icon: "Users",
      flavor: "Humpty was beyond saving. The cavalry was not.",
    },
    activatedSimple((_inst, api) => {
      const order: PieceType[] = ["q", "r", "b", "n", "p"];
      let restored = 0;
      for (const type of order) {
        while (restored < 4 && revivable(api, type) > 0) {
          const zone = emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
            (sq) => type !== "p" || (RANK(sq) !== 0 && RANK(sq) !== 7),
          );
          const sq = pickRng(api, zone);
          if (sq == null) return;
          api.place(sq, type, api.me);
          markRevived(api, type);
          flashSquares(api, [sq]);
          restored++;
        }
        if (restored >= 4) break;
      }
    }),
  ),
  // 186. Anti-Gravity Gala ------------------------------------------------------------------------------------
  card(
    {
      id: "ov_antigravity_gala",
      name: "Anti-Gravity Gala",
      description:
        "For 3 of your turns everything floats: your sliding pieces may pass over the first piece in their path, friend or foe, and continue beyond it. Kings are too dignified to be floated over.",
      tier: 9,
      category: "movement",
      icon: "Sparkles",
      flavor: "Dress code: weightless.",
      requires: ["b", "r", "q"],
      fx: { motif: "empower", pieces: ["b", "r", "q"], self: true },
    },
    // ADAPTED: the roster's both-sides overshoot has no opponent-augment
    // hook; the float becomes your sliders phasing over one blocker.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        for (const type of ["b", "r", "q"] as PieceType[]) {
          for (const sq of mySquares(api.board, api.me, type)) {
            out.push(...phasedSlides(api, sq, type, inst.id));
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.me),
      status: (inst) => `${turnsLeft(inst)} of your turns of float left`,
    },
  ),
  // 187. One Thousand Ducks --------------------------------------------------------------------------------------
  card(
    {
      id: "ov_thousand_ducks",
      name: "One Thousand Ducks",
      description:
        "A tide of rubber ducks floods the board: every enemy pawn standing next to one of your pieces is swept one square back toward its own side, and three ducks stay behind as squares nobody may enter for 4 turns.",
      tier: 8,
      category: "attack",
      icon: "Bird",
      flavor: "Individually adorable. Collectively a war crime.",
    },
    activatedSimple((_inst, api) => {
      const mine = mySquares(api.board, api.me);
      const back = fwdOf(api.opp);
      const swept: Square[] = [];
      for (const sq of mySquares(api.board, api.opp, "p")) {
        const adjacent = mine.some(
          (m) => Math.abs(FILE(m) - FILE(sq)) <= 1 && Math.abs(RANK(m) - RANK(sq)) <= 1,
        );
        if (!adjacent) continue;
        const to = sq + back;
        if (to >= 0 && to <= 63 && !api.board.pieces[to] && RANK(to) !== 0 && RANK(to) !== 7) {
          api.relocate(sq, to);
          swept.push(to);
        }
      }
      const ducks: Square[] = [];
      for (let i = 0; i < 3; i++) {
        const sq = pickRng(
          api,
          emptySquares(api.board).filter((s) => !ducks.includes(s)),
        );
        if (sq == null) break;
        ducks.push(sq);
      }
      if (ducks.length) {
        addEffect(api, { kind: "barred", squares: ducks, against: api.opp, turns: 4 });
        addEffect(api, { kind: "barred", squares: ducks, against: api.me, turns: 4 });
        flashSquares(api, ducks, true);
      }
      flashSquares(api, swept, true);
    }),
  ),
  // 188. Crown of the Undying ---------------------------------------------------------------------------------------
  card(
    {
      id: "ov_crown_of_the_undying",
      name: "Crown of the Undying",
      description:
        "Once, the moment an enemy move leaves your king under attack, the crown answers: every enemy piece standing beside your king is destroyed. Enemy kings survive it.",
      tier: 8,
      category: "protection",
      icon: "Crown",
      flavor: "The crown remembers every head it has outlived.",
    },
    // ADAPTED: true checkmate interception would need resolver surgery; the
    // crown fires on the first CHECK against you, which is strictly earlier.
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const k = kingSquare(api.board, api.me);
        if (k == null) return;
        const inCheck = mySquares(api.board, api.opp).some((sq) =>
          attacksSquare(api.board, sq, k),
        );
        if (!inCheck) return;
        const adj = mySquares(api.board, api.opp).filter((sq) => {
          const p = api.board.pieces[sq]!;
          return (
            p.type !== "k" &&
            Math.abs(FILE(sq) - FILE(k)) <= 1 &&
            Math.abs(RANK(sq) - RANK(k)) <= 1
          );
        });
        for (const sq of adj) api.removePiece(sq);
        flashSquares(api, adj.length ? adj : [k]);
        inst.spent = true;
      },
      status: () => "armed: the first check against you is answered",
    },
  ),
  // 189. Symphony of the Legion ----------------------------------------------------------------------------------------
  card(
    {
      id: "ov_symphony_of_the_legion",
      name: "Symphony of the Legion",
      description:
        "Three movements, each a free action, at most one per your turn, played in order: first every pawn you own advances a square; second each of your knights and bishops drifts one random empty step; third your rooks and queen may pass through friendly pieces until your turn ends.",
      tier: 7,
      category: "tempo",
      icon: "Music2",
      flavor: "The conductor taps the podium. The army inhales.",
    },
    // ADAPTED: "replaces your move" self-restriction has no hook; each
    // movement is a once-per-turn free action instead, conducted in order.
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      init: (inst) => {
        inst.state.movement = 0;
      },
      targets: (inst, api, _picks) => {
        const mv = (inst.state.movement as number) ?? 0;
        if (mv >= 3) return null;
        if ((inst.state.lastPly as number | undefined) === api.board.history.length) return null;
        return null;
      },
      effect: (inst, api) => {
        const mv = (inst.state.movement as number) ?? 0;
        if (mv >= 3) return;
        if ((inst.state.lastPly as number | undefined) === api.board.history.length) return;
        if (mv === 0) {
          const order =
            api.me === "w"
              ? [...advanceablePawns(api)].sort((a, b) => b - a)
              : [...advanceablePawns(api)].sort((a, b) => a - b);
          for (const sq of order) advancePawn(api, sq);
        } else if (mv === 1) {
          for (const type of ["n", "b"] as PieceType[]) {
            for (const sq of mySquares(api.board, api.me, type)) {
              const opts: Square[] = [];
              for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                  if (!df && !dr) continue;
                  const f = FILE(sq) + df, r = RANK(sq) + dr;
                  if (f < 0 || f > 7 || r < 0 || r > 7) continue;
                  if (!api.board.pieces[SQ(f, r)]) opts.push(SQ(f, r));
                }
              }
              const to = pickRng(api, opts);
              if (to != null) api.relocate(sq, to);
            }
          }
        } else {
          inst.state.phasing = api.board.history.length;
        }
        inst.state.movement = mv + 1;
        inst.state.lastPly = api.board.history.length;
        if (mv + 1 >= 3 && inst.state.phasing == null) inst.spent = true;
      },
      augmentMoves: (moves, inst, api) => {
        if ((inst.state.phasing as number | undefined) !== api.board.history.length) return;
        const out: Move[] = [];
        for (const type of ["r", "q"] as PieceType[]) {
          for (const sq of mySquares(api.board, api.me, type)) {
            out.push(...phasedSlides(api, sq, type, inst.id, true));
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if ((inst.state.phasing as number | undefined) != null && move.color === api.me) {
          inst.state.phasing = null;
          if (((inst.state.movement as number) ?? 0) >= 3) inst.spent = true;
        }
      },
      status: (inst) => {
        const mv = (inst.state.movement as number) ?? 0;
        return mv >= 3 ? "the symphony concludes" : `movement ${mv + 1} of 3 awaits`;
      },
    },
  ),
  // 190. The Tutorial ----------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_the_tutorial",
      name: "The Tutorial",
      description:
        "A relentlessly cheerful tutorial haunts your opponent for their next 3 turns: every enemy move is marked and reviewed, and whenever their moved piece ends up hanging you are paid 8 seconds while it congratulates them.",
      tier: 6,
      category: "info",
      icon: "MousePointerClick",
      flavor: "GREAT JOB! That was a blunder.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        flashSquares(api, [move.to], true);
        const hanging =
          !mySquares(api.board, api.opp).some(
            (d) => d !== move.to && attacksSquare(api.board, d, move.to),
          ) && mySquares(api.board, api.me).some((a) => attacksSquare(api.board, a, move.to));
        if (hanging) api.adjustClock({ addSelfSec: 8 });
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${turnsLeft(inst)} of their turns under review`,
    },
  ),
  // 191. Ragnarok Postponed ------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_ragnarok_postponed",
      name: "Ragnarok Postponed",
      description:
        "The doomsday bell begins to toll: in 10 of your turns, every piece on the board except kings and pawns is removed. Both armies. No exceptions, no cancellations.",
      tier: 9,
      category: "attack",
      icon: "Bell",
      flavor: "Rescheduled, not cancelled. The wolves apologize for the delay.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 10;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        for (let sq = 0; sq < 64; sq++) {
          const p = api.board.pieces[sq];
          if (p && p.type !== "k" && p.type !== "p") api.removePiece(sq, { uncounted: true });
        }
        inst.spent = true;
      },
      status: (inst) => `doomsday in ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 192. My Cousin From Out of Town -----------------------------------------------------------------------------------------
  card(
    {
      id: "ov_cousin_from_out_of_town",
      name: "My Cousin From Out of Town",
      description:
        "A giant checkers piece visits for 8 of your turns: its square is impassable to absolutely everyone, and after each of your moves it shuffles one square in a random direction. It does not understand the rules and cannot be captured.",
      tier: 8,
      category: "item",
      icon: "Circle",
      flavor: "He thinks the horses are cheating.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Where does your cousin sit down",
              squares: emptySquares(api.board),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 8;
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: null });
        addEffect(api, { kind: "barred", squares: [sq], against: api.me, turns: null });
        flashSquares(api, [sq], true);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.me) return;
        const dropBarsAt = (at: Square) => {
          api.bs.effects = api.bs.effects.filter(
            (e) =>
              !(e.kind === "barred" && e.turns == null && e.squares.length === 1 && e.squares[0] === at),
          );
        };
        const opts: Square[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (!df && !dr) continue;
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (f < 0 || f > 7 || r < 0 || r > 7) continue;
            if (!api.board.pieces[SQ(f, r)]) opts.push(SQ(f, r));
          }
        }
        const to = pickRng(api, opts);
        if (to != null) {
          dropBarsAt(sq);
          inst.state.sq = to;
          addEffect(api, { kind: "barred", squares: [to], against: api.opp, turns: null });
          addEffect(api, { kind: "barred", squares: [to], against: api.me, turns: null });
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          dropBarsAt(inst.state.sq as Square);
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to welcome him"
          : `visiting for ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 193. Terraform -------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_terraform",
      name: "Terraform",
      description:
        "Claim up to three empty squares as your homeland, permanently: enemy pieces may never enter them again.",
      tier: 8,
      category: "protection",
      icon: "Globe2",
      flavor: "The land remembers who planted the flag.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Claim square ${picks.length + 1} of up to 3`,
              squares: emptySquares(api.board).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length > 0 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (squares.length) {
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: null });
          flashSquares(api, squares);
        }
      },
    ),
  ),
  // 194. Standing Ovation ---------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_standing_ovation",
      name: "Standing Ovation",
      description:
        "An audience gathers for 5 of your turns: each of your moves that leaves the enemy king under attack earns 10 seconds of applause.",
      tier: 6,
      category: "tempo",
      icon: "Theater",
      flavor: "They paid for blood. They will settle for checks.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me) {
          const k = kingSquare(api.board, api.opp);
          if (
            k != null &&
            mySquares(api.board, api.me).some((sq) => attacksSquare(api.board, sq, k))
          ) {
            api.adjustClock({ addSelfSec: 10 });
            flashSquares(api, [k], true);
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns on stage`,
    },
  ),
  // 195. Leviathan Below -------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_leviathan_below",
      name: "Leviathan Below",
      description:
        "Mark three squares; both players see the water darken. The moment your opponent's next move ends, tentacles erupt from all three at once: any piece standing there except a king is dragged below, and the wreckage blocks those squares for 2 turns.",
      tier: 9,
      category: "attack",
      icon: "Waves",
      flavor: "The board is only the surface.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, _api, picks) =>
        inst.state.marks != null || picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Mark tentacle square ${picks.length + 1} of 3`,
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.marks != null) return;
        const marks = picks.map((k) => k.square).filter((s): s is Square => s != null);
        inst.state.marks = marks;
        addEffect(api, { kind: "strike", squares: marks, owner: api.me, turns: 2 });
      },
      onMovePlayed: (inst, move, api) => {
        const marks = inst.state.marks as Square[] | undefined;
        if (!marks || move.color !== api.opp) return;
        for (const sq of marks) {
          const p = api.board.pieces[sq];
          if (p && p.type !== "k") api.removePiece(sq);
        }
        addEffect(api, { kind: "barred", squares: marks, against: api.opp, turns: 2 });
        addEffect(api, { kind: "barred", squares: marks, against: api.me, turns: 2 });
        flashSquares(api, marks);
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.marks == null
          ? "activate to mark the deep"
          : "the water is dark; it strikes after their move",
    },
  ),
  // 196. Dev Console -----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_dev_console",
      name: "Dev Console",
      description:
        "Open the console once and run the whole macro: spawn a pawn on a chosen empty square in your half, add 20 seconds to your clock, and dump your opponent's next draft offer to your screen.",
      tier: 6,
      category: "draft",
      icon: "Terminal",
      flavor: "sudo win. Command not found. The pawn worked though.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "spawn_pawn: choose the square",
              squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                (sq) => RANK(sq) !== 0 && RANK(sq) !== 7,
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq != null) api.place(sq, "p", api.me);
        api.adjustClock({ addSelfSec: 20 });
        api.mine.flags.seeOppCards = true;
      },
    ),
  ),
  // 197. Democracy --------------------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_democracy",
      name: "Democracy",
      description:
        "Parliament sits for 3 of your turns. After each of your moves the house votes: usually applause worth 8 seconds, sometimes a motion that marches a random pawn of yours forward, occasionally a filibuster where nothing happens at all.",
      tier: 6,
      category: "tempo",
      icon: "Landmark",
      flavor: "The rook party demands open files for all.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const r = api.rng.next();
        if (r < 0.6) api.adjustClock({ addSelfSec: 8 });
        else if (r < 0.9) {
          const pawn = pickRng(api, advanceablePawns(api));
          if (pawn != null) advancePawn(api, pawn);
        } else flashSquares(api, [move.to], true);
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} sessions left`,
    },
  ),
  // 198. Monks of the Fifth Bell ----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_monks_of_the_fifth_bell",
      name: "Monks of the Fifth Bell",
      description:
        "Permanent: every fifth of your turns the bell tolls and one random pawn of yours takes a free step forward.",
      tier: 7,
      category: "tempo",
      icon: "Church",
      flavor: "They keep no clock. They ARE the clock.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.count = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const c = (((inst.state.count as number) ?? 0) + 1) % 5;
        inst.state.count = c;
        if (c === 0) {
          const pawn = pickRng(api, advanceablePawns(api));
          if (pawn != null) {
            const to = pawn + fwdOf(api.me);
            advancePawn(api, pawn);
            flashSquares(api, [to], true);
          }
        }
      },
      status: (inst) => `the bell tolls in ${5 - ((inst.state.count as number) ?? 0)} of your turns`,
    },
  ),
  // 199. The Fool ------------------------------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_the_fool",
      name: "The Fool",
      description:
        "The Fool takes an empty square nearest the enemy king for 6 of your turns: nobody may enter his square, and after each of your moves there is a 1 in 4 chance an enemy piece beside him is too embarrassed to move on your opponent's next turn.",
      tier: 8,
      category: "item",
      icon: "Drama",
      flavor: "He cannot be captured. Nobody wants to touch him.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (picks.length > 0 || inst.state.sq != null) return null;
        const k = kingSquare(api.board, api.opp);
        const empties = emptySquares(api.board);
        if (k == null || empties.length === 0) {
          return { kind: "square", label: "No stage for the Fool", squares: [] };
        }
        const dist = (sq: Square) =>
          Math.max(Math.abs(FILE(sq) - FILE(k)), Math.abs(RANK(sq) - RANK(k)));
        const best = Math.min(...empties.map(dist));
        return {
          kind: "square",
          label: "Seat the Fool (nearest the enemy king)",
          squares: empties.filter((sq) => dist(sq) === best),
        };
      },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: null });
        addEffect(api, { kind: "barred", squares: [sq], against: api.me, turns: null });
        flashSquares(api, [sq], true);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.me) return;
        if (api.rng.next() < 0.25) {
          const adj = mySquares(api.board, api.opp).filter((s) => {
            const p = api.board.pieces[s]!;
            return (
              p.type !== "k" &&
              Math.abs(FILE(s) - FILE(sq)) <= 1 &&
              Math.abs(RANK(s) - RANK(sq)) <= 1
            );
          });
          const target = pickRng(api, adj);
          if (target != null) {
            addEffect(api, { kind: "freeze", sq: target, owner: api.opp, turns: 1, skin: "charm" });
          }
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.bs.effects = api.bs.effects.filter(
            (e) =>
              !(e.kind === "barred" && e.turns == null && e.squares.length === 1 && e.squares[0] === sq),
          );
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to seat the Fool"
          : `heckling for ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 200. NerfChess: The Musical ----------------------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_nerfchess_the_musical",
      name: "NerfChess: The Musical",
      description:
        "The whole board takes the stage, once: rearrange up to five of your pieces onto empty squares in your half, then collect 10 seconds for putting on a show.",
      tier: 6,
      category: "movement",
      icon: "Clapperboard",
      flavor: "Tonight only. The pawns learned choreography and one of them cries.",
    },
    (() => {
      const base = relocateMany(5, (api) => emptySquares(api.board, (sq) => inHalf(api.me, sq)));
      const origEffect = base.effect!;
      return {
        ...base,
        effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
          origEffect(inst, api, picks);
          api.adjustClock({ addSelfSec: 10 });
        },
      };
    })(),
  ),
];

/** Non-capture destinations reachable by the enemy piece on `sq` using its
 * normal movement geometry (empty squares only). Powers the controlled-move
 * cards (Let Me Play For You). */
function enemyQuietDests(api: BuffApi, sq: Square): Square[] {
  const p = api.board.pieces[sq];
  if (!p) return [];
  const out: Square[] = [];
  const push = (f: number, r: number): boolean => {
    if (f < 0 || f > 7 || r < 0 || r > 7) return false;
    const to = SQ(f, r);
    if (api.board.pieces[to]) return false;
    out.push(to);
    return true;
  };
  switch (p.type) {
    case "p": {
      const dir = p.color === "w" ? 1 : -1;
      const r = RANK(sq) + dir;
      if (r >= 1 && r <= 6) push(FILE(sq), r);
      break;
    }
    case "n":
      for (const [df, dr] of KNIGHT_LEAPS) push(FILE(sq) + df, RANK(sq) + dr);
      break;
    case "k":
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) if (df || dr) push(FILE(sq) + df, RANK(sq) + dr);
      }
      break;
    default: {
      const dirs =
        p.type === "b"
          ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
          : p.type === "r"
            ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
            : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [df, dr] of dirs) {
        let f = FILE(sq) + df, r = RANK(sq) + dr;
        while (push(f, r)) {
          f += df;
          r += dr;
        }
      }
    }
  }
  return out;
}

/** Slides for `type` from `sq` that pass over exactly one blocker (the
 * float/phase vocabulary). `friendlyOnly` restricts the hop to own pieces
 * (Symphony's third movement). Kings are never phased over. */
function phasedSlides(
  api: BuffApi,
  sq: Square,
  type: PieceType,
  via: string,
  friendlyOnly = false,
): Move[] {
  const dirs =
    type === "b"
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      : type === "r"
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const out: Move[] = [];
  for (const [df, dr] of dirs) {
    let f = FILE(sq) + df, r = RANK(sq) + dr;
    let phased = false;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const to = SQ(f, r);
      const t = api.board.pieces[to];
      if (t) {
        if (phased) break;
        if (friendlyOnly && t.color !== api.me) break;
        if (t.type === "k") break;
        phased = true;
        f += df;
        r += dr;
        continue;
      }
      if (phased) out.push(...teleportMoves(api.board, sq, [to], via));
      f += df;
      r += dr;
    }
  }
  return out;
}
