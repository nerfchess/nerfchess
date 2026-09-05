// Overhaul roster, Tier 5 (cards 101-125 of docs/overhaul-roster.md): strong
// swings. Every mechanic resolves through existing engine primitives; every
// random draw uses api.rng (deterministic, replay-safe) and only inside
// init / effect / onMovePlayed.

import {
  ALL_DIRS,
  Buff,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  advancePawn,
  attacksSquare,
  card,
  flashSquares,
  fwdOf,
  inBoard,
  instant,
  kingSquare,
  lastMoveBy,
  mySquares,
  ownRank,
  pawnRankOk,
  pinCosmetic,
  relRank,
  tickTurns,
  timedAugment,
  teleportMoves,
  turnsLeft,
  undefendedPieces,
} from "./shared";
import { minorQuietDests } from "./t4";

/** All 8 neighbours of a square that are on the board, ascending. */
function neighbors(sq: Square): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of ALL_DIRS) {
    const f = FILE(sq) + df, r = RANK(sq) + dr;
    if (inBoard(f, r)) out.push(SQ(f, r));
  }
  return out.sort((a, b) => a - b);
}

/** Chebyshev adjacency (distinct squares within a king step). */
function adjacent(a: Square, b: Square): boolean {
  return a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;
}

const ALL_SQUARES = (): Square[] => Array.from({ length: 64 }, (_, i) => i as Square);

export const OVERHAUL_T5: Buff[] = [
  // 101. Cloud Serpent ---------------------------------------------------------
  card(
    {
      id: "ov_cloud_serpent",
      name: "Cloud Serpent",
      description:
        "A serpent coils a chosen rank: enemy pieces cannot enter or cross it for your opponent's next 5 turns (yours can). As it lands it may crush one enemy pawn on an adjacent rank.",
      tier: 6,
      category: "protection",
      icon: "Wind",
      flavor: "It flows in like weather with opinions.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the rank the serpent coils",
            squares: ALL_SQUARES(),
          };
        }
        if (picks.length === 1) {
          const rank = RANK(picks[0].square!);
          const prey = mySquares(api.board, api.opp, "p").filter(
            (sq) => Math.abs(RANK(sq) - rank) === 1,
          );
          if (prey.length === 0) return null;
          return {
            kind: "square",
            label: "Optionally crush one adjacent enemy pawn",
            squares: prey,
            finishable: true,
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const anchor = picks[0]?.square;
        if (anchor == null) return;
        const rank = RANK(anchor);
        const squares = Array.from({ length: 8 }, (_, f) => SQ(f, rank));
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 5 });
        const prey = picks[1]?.square;
        if (prey != null) {
          const p = api.board.pieces[prey];
          if (p && p.color === api.opp && p.type === "p" && Math.abs(RANK(prey) - rank) === 1) {
            api.removePiece(prey);
            flashSquares(api, [prey]);
          }
        }
      },
    ),
  ),
  // 102. Wizard Duel -----------------------------------------------------------
  // ADAPTED: when the enemy bishop wins it gains nothing (move augments are
  // owner-only); the loser's removal is the whole downside on a loss.
  card(
    {
      id: "ov_wizard_duel",
      name: "Wizard Duel",
      description:
        "One of your bishops duels an enemy bishop: 50% either way, the loser is removed. If your bishop wins, it also gains single king steps for 3 of your turns.",
      tier: 6,
      category: "attack",
      icon: "Wand2",
      flavor: "Two beams meet, spark, and one hat goes home empty.",
      requires: ["b"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.done) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose your dueling bishop",
            squares:
              mySquares(api.board, api.opp, "b").length > 0
                ? mySquares(api.board, api.me, "b")
                : [],
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose the enemy bishop it challenges",
            squares: mySquares(api.board, api.opp, "b"),
          };
        }
        return null;
      },
      effect: (inst, api, picks) => {
        const mine = picks[0]?.square, theirs = picks[1]?.square;
        if (mine == null || theirs == null || inst.state.done) return;
        const a = api.board.pieces[mine], b = api.board.pieces[theirs];
        if (!a || a.color !== api.me || a.type !== "b") return;
        if (!b || b.color !== api.opp || b.type !== "b") return;
        inst.state.done = true;
        if (api.rng.next() < 0.5) {
          api.removePiece(theirs);
          flashSquares(api, [theirs]);
          inst.state.sq = mine;
          inst.state.turns = 3;
        } else {
          api.removePiece(mine);
          flashSquares(api, [mine]);
          inst.spent = true;
        }
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me) return;
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          const t = api.board.pieces[to];
          if (!t) moves.push({ from: sq, to, piece: "b", color: api.me, via: inst.id });
          else if (t.color !== api.me) {
            moves.push({
              from: sq,
              to,
              piece: "b",
              color: api.me,
              captured: t.type,
              capturedSquare: to,
              via: inst.id,
            });
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        !inst.state.done
          ? "challenge a bishop"
          : inst.state.sq != null
            ? `victor empowered, ${turnsLeft(inst)} of your turns left`
            : null,
    },
  ),
  // 103. Royal Wedding ---------------------------------------------------------
  card(
    {
      id: "ov_royal_wedding",
      name: "Royal Wedding",
      description:
        "Usable while your king and queen stand adjacent: place up to 2 pawns on empty squares beside either of them, and gain 20 seconds.",
      tier: 3,
      category: "pieces",
      icon: "Church",
      flavor: "Bells, rice, and a suspicious amount of new infantry.",
      requires: ["q"],
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const k = kingSquare(api.board, api.me);
        const queens = mySquares(api.board, api.me, "q");
        const married = k != null && queens.some((q) => adjacent(k, q));
        const spots = !married
          ? []
          : ALL_SQUARES().filter(
              (sq) =>
                !api.board.pieces[sq] &&
                pawnRankOk(sq) &&
                !picks.some((p) => p.square === sq) &&
                (adjacent(sq, k!) || queens.some((q) => adjacent(sq, q))),
            );
        if (picks.length === 1 && spots.length === 0) return null;
        return {
          kind: "square",
          label: `Place a wedding pawn (${picks.length + 1}/2)`,
          squares: spots,
          ...(picks.length === 1 ? { finishable: true } : {}),
        };
      },
      (_inst, api, picks) => {
        for (const p of picks) {
          if (p.square != null && !api.board.pieces[p.square] && pawnRankOk(p.square)) {
            api.place(p.square, "p", api.me);
          }
        }
        api.adjustClock({ addSelfSec: 20 });
      },
    ),
  ),
  // 104. Chat Vote -------------------------------------------------------------
  card(
    {
      id: "ov_chat_vote",
      name: "Chat Vote",
      description:
        "Chat votes on your prize, winner random: gain 25 seconds, every one of your pawns with an open square ahead advances one, or a random enemy minor is stunned for 1 turn.",
      tier: 3,
      category: "tempo",
      icon: "MessageSquare",
      flavor: "The poll bars race. Democracy has never been this loud.",
    },
    instant((_inst, api) => {
      const roll = api.rng.int(3);
      if (roll === 0) {
        api.adjustClock({ addSelfSec: 25 });
        return;
      }
      if (roll === 1) {
        const pawns = mySquares(api.board, api.me, "p").sort(
          (a, b) => relRank(api.me, b) - relRank(api.me, a) || a - b,
        );
        for (const sq of pawns) advancePawn(api, sq);
        return;
      }
      const minors = mySquares(api.board, api.opp).filter((sq) => {
        const t = api.board.pieces[sq]!.type;
        return t === "n" || t === "b";
      });
      const pool =
        minors.length > 0
          ? minors
          : mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      if (pool.length === 0) return;
      const sq = pool[api.rng.int(pool.length)];
      addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stun" });
      flashSquares(api, [sq], true);
    }),
  ),
  // 105. Manager's Challenge ---------------------------------------------------
  // ADAPTED: a true undo-and-replay of the opponent's move is not expressible;
  // on a won challenge their last-moved piece is marched back to its origin
  // (captures stay captured) and stunned. The lost-challenge penalty of "you
  // lose 10 seconds" is unsupported (no self-charge in ClockRequest), so the
  // fine is board-based: your own last-moved piece is stunned instead.
  card(
    {
      id: "ov_managers_challenge",
      name: "Manager's Challenge",
      description:
        "Challenge your opponent's last move: 50% their piece is marched back to the square it came from (if free) and stunned for 1 turn; 50% the call goes against you and your own last-moved piece is stunned for 1 turn.",
      tier: 5,
      category: "tempo",
      icon: "Flag",
      flavor: "The red flag flies. The replay hood descends.",
    },
    instant((_inst, api) => {
      const last = lastMoveBy(api.board, api.opp);
      if (!last) return;
      if (api.rng.next() < 0.5) {
        const p = api.board.pieces[last.to];
        if (p && p.color === api.opp) {
          let stunAt = last.to;
          if (!api.board.pieces[last.from] && (p.type !== "p" || pawnRankOk(last.from))) {
            api.relocate(last.to, last.from);
            stunAt = last.from;
          }
          if (p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: stunAt, owner: api.opp, turns: 1, skin: "stun" });
          }
          flashSquares(api, [stunAt], true);
        }
      } else {
        const mine = lastMoveBy(api.board, api.me);
        if (!mine) return;
        const p = api.board.pieces[mine.to];
        if (p && p.color === api.me && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq: mine.to, owner: api.me, turns: 1, skin: "stun" });
          flashSquares(api, [mine.to], true);
        }
      }
    }),
  ),
  // 106. Trojan Pawn -----------------------------------------------------------
  card(
    {
      id: "ov_trojan_pawn",
      name: "Trojan Pawn",
      description:
        "Choose one of your pawns: if it is captured within 8 of your turns, two fresh pawns leap out onto empty squares adjacent to where it fell.",
      tier: 5,
      category: "pieces",
      icon: "Box",
      flavor: "It is exactly as hollow as it looks.",
      requires: ["p"],
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
              label: "Choose the pawn hiding the surprise",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 8;
        pinCosmetic(api, sq, api.me, "wooden", 8, "Trojan Pawn");
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && (move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          let placed = 0;
          for (const n of neighbors(sq)) {
            if (placed >= 2) break;
            if (!api.board.pieces[n] && pawnRankOk(n)) {
              api.place(n, "p", api.me);
              placed++;
            }
          }
          flashSquares(api, [sq], true);
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          if (move.promotion) {
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "pick the trojan"
          : `armed for ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 107. Checkmate Rehearsal ---------------------------------------------------
  // ADAPTED: the roster's 15-second ghost-piece sandbox is client
  // infrastructure the engine cannot host; implemented as the rehearsal's
  // takeaway: an info burst marking every enemy piece currently attacking any
  // of your pieces, plus a free draft reroll (the rehearsal notes).
  card(
    {
      id: "ov_checkmate_rehearsal",
      name: "Checkmate Rehearsal",
      description:
        "Run the rehearsal, once: every enemy piece currently attacking one of your pieces is spotlighted, and the director's notes include one free draft reroll.",
      tier: 5,
      category: "info",
      icon: "Clapperboard",
      flavor: "Places, everyone. The blunder is in act two.",
    },
    {
      ...activatedSimple((_inst, api) => {
        const mine = mySquares(api.board, api.me);
        const threats = mySquares(api.board, api.opp).filter((sq) =>
          mine.some((t) => attacksSquare(api.board, sq, t)),
        );
        flashSquares(api, threats);
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      }),
      freeAction: true,
    },
  ),
  // 108. Volcanic Vent ---------------------------------------------------------
  card(
    {
      id: "ov_volcanic_vent",
      name: "Volcanic Vent",
      description:
        "Open a vent on an empty square for 9 of your turns. Every 3rd of your turns it erupts: pawns of both sides adjacent to it are destroyed, and other adjacent pieces except kings are pushed one square outward if the square is free.",
      tier: 6,
      category: "attack",
      icon: "Flame",
      flavor: "The crack glows. The neighborhood reconsiders.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the ground splits",
              squares: ALL_SQUARES().filter((sq) => !api.board.pieces[sq]),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.life = 9;
        inst.state.fuse = 3;
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        const vent = inst.state.sq as Square | undefined;
        if (vent == null || move.color !== api.me) return;
        inst.state.life = ((inst.state.life as number) ?? 0) - 1;
        inst.state.fuse = ((inst.state.fuse as number) ?? 3) - 1;
        if ((inst.state.fuse as number) <= 0) {
          inst.state.fuse = 3;
          for (const sq of neighbors(vent)) {
            const p = api.board.pieces[sq];
            if (!p) continue;
            if (p.type === "p") {
              api.removePiece(sq);
              continue;
            }
            if (p.type === "k") continue;
            const df = Math.sign(FILE(sq) - FILE(vent)), dr = Math.sign(RANK(sq) - RANK(vent));
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (!inBoard(f, r)) continue;
            const to = SQ(f, r);
            if (!api.board.pieces[to]) api.relocate(sq, to);
          }
          flashSquares(api, [vent, ...neighbors(vent)]);
        }
        if ((inst.state.life as number) <= 0) inst.spent = true;
      },
      status: (inst) =>
        inst.state.sq == null
          ? "place the vent"
          : `erupts in ${(inst.state.fuse as number) ?? 0}, sleeps in ${(inst.state.life as number) ?? 0} of your turns`,
    },
  ),
  // 109. Pied Piper ------------------------------------------------------------
  card(
    {
      id: "ov_pied_piper",
      name: "Pied Piper",
      description:
        "Choose a file: up to two enemy pawns on it are lured one square toward you, onto empty squares, most advanced first.",
      tier: 5,
      category: "movement",
      icon: "Music2",
      flavor: "The tune is catchy. The consequences are structural.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const files = new Set(mySquares(api.board, api.opp, "p").map((sq) => FILE(sq)));
        return {
          kind: "square",
          label: "Choose the file to serenade",
          squares: ALL_SQUARES().filter((sq) => files.has(FILE(sq))),
        };
      },
      (_inst, api, picks) => {
        const anchor = picks[0]?.square;
        if (anchor == null) return;
        const file = FILE(anchor);
        const pawns = mySquares(api.board, api.opp, "p")
          .filter((sq) => FILE(sq) === file)
          .sort((a, b) => relRank(api.opp, b) - relRank(api.opp, a));
        let lured = 0;
        for (const sq of pawns) {
          if (lured >= 2) break;
          const to = sq + fwdOf(api.opp);
          if (to >= 0 && to <= 63 && !api.board.pieces[to] && pawnRankOk(to)) {
            api.relocate(sq, to);
            flashSquares(api, [to], true);
            lured++;
          }
        }
      },
    ),
  ),
  // 110. Off-Broadway Queen ----------------------------------------------------
  card(
    {
      id: "ov_off_broadway_queen",
      name: "Off-Broadway Queen",
      description:
        "Choose one of your pawns: it promotes to a queen the moment it stands on your 6th rank. Using it consumes your next unused reroll, if any.",
      tier: 5,
      category: "pieces",
      icon: "Theater",
      flavor: "The venue is smaller. The coronation is real.",
      requires: ["p"],
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
              label: "Cast the understudy",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        if ((api.mine.rerollsLeft ?? 0) > 0) api.mine.rerollsLeft -= 1;
        if (relRank(api.me, sq) >= 6) {
          api.setPieceType(sq, "q");
          flashSquares(api, [sq], true);
          inst.spent = true;
          return;
        }
        pinCosmetic(api, sq, api.me, "hat", null, "Understudy");
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          if (move.promotion) {
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
          if (move.color === api.me && relRank(api.me, move.to) >= 6) {
            api.setPieceType(move.to, "q");
            flashSquares(api, [move.to], true);
            inst.spent = true;
          }
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "cast a pawn" : "the understudy waits for the 6th rank",
    },
  ),
  // 111. Blood Moon ------------------------------------------------------------
  // ADAPTED: "that piece may move one extra square" cannot be restricted to
  // the capturing piece (extra moves are player-wide); implemented as an
  // immediate extra move after each capture, with the 3-move window counting
  // those extra moves too, which keeps the total burst bounded.
  card(
    {
      id: "ov_blood_moon",
      name: "Blood Moon",
      description:
        "For your next 3 moves, any capture you make lets you immediately move again.",
      tier: 5,
      category: "tempo",
      icon: "Moon",
      flavor: "The moon turns red and patience goes out of style.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && turnsLeft(inst) > 0 && move.captured && move.captured !== "k") {
          api.bs.extraMoves[api.me] += 1;
          flashSquares(api, [move.to]);
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your moves under the moon`,
    },
  ),
  // 112. Locust Swarm ----------------------------------------------------------
  card(
    {
      id: "ov_locust_swarm",
      name: "Locust Swarm",
      description: "Choose a rank: every pawn on it, yours and theirs, is devoured.",
      tier: 6,
      category: "attack",
      icon: "Bug",
      flavor: "The cloud arrives hungry and leaves punctual.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const ranks = new Set<number>();
        for (const c of [api.me, api.opp]) {
          for (const sq of mySquares(api.board, c, "p")) ranks.add(RANK(sq));
        }
        return {
          kind: "square",
          label: "Choose the rank the swarm strips",
          squares: ALL_SQUARES().filter((sq) => ranks.has(RANK(sq))),
        };
      },
      (_inst, api, picks) => {
        const anchor = picks[0]?.square;
        if (anchor == null) return;
        const rank = RANK(anchor);
        const eaten: Square[] = [];
        for (let f = 0; f < 8; f++) {
          const sq = SQ(f, rank);
          const p = api.board.pieces[sq];
          if (p && p.type === "p") {
            api.removePiece(sq);
            eaten.push(sq);
          }
        }
        flashSquares(api, eaten.length ? eaten : [anchor]);
      },
    ),
  ),
  // 113. Compound Interest -----------------------------------------------------
  // ADAPTED: the roster's "lock 45 seconds, returned doubled" is time-heavy
  // and needs an escrow the clocks do not support; repriced board-side: no
  // stake, and the payout is a 3-card draft plus 20 seconds if your queen
  // survives the term.
  card(
    {
      id: "ov_compound_interest",
      name: "Compound Interest",
      description:
        "The vault locks for 6 of your turns. When it opens, if your queen is still on the board: your next draft offers three cards and you gain 20 seconds. If she is gone, the investment is lost.",
      tier: 3,
      category: "draft",
      icon: "TrendingUp",
      flavor: "The dial spins. The queen is the collateral.",
      requires: ["q"],
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        if (mySquares(api.board, api.me, "q").length > 0) {
          api.mine.flags.prepThree = true;
          api.adjustClock({ addSelfSec: 20 });
          const q = mySquares(api.board, api.me, "q")[0];
          flashSquares(api, [q], true);
        }
        inst.spent = true;
      },
      status: (inst) => `matures in ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 114. Nesting Doll ----------------------------------------------------------
  // ADAPTED: the shell cannot appear on the capture square (the capturer
  // stands there); it appears on the lowest empty square adjacent to the fall.
  card(
    {
      id: "ov_nesting_doll",
      name: "Nesting Doll",
      description:
        "For 10 of your turns your royal line nests: when your queen is captured, a rook appears on an empty square beside her fall; when that rook falls, a bishop; when that bishop falls, a pawn. The first nested piece to appear skips your next draft.",
      tier: 5,
      category: "pieces",
      icon: "Layers",
      flavor: "Matryoshka paint, applied one funeral at a time.",
      requires: ["q"],
      fx: { motif: "ward", pieces: ["q", "r", "b"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 10;
        inst.state.stage = "q";
      },
      onMovePlayed: (inst, move, api) => {
        const stage = inst.state.stage as "q" | "r" | "b";
        const shellSq = inst.state.sq as Square | undefined;
        // Follow the current shell when we move it.
        if (shellSq != null && move.from === shellSq && move.color === api.me) {
          inst.state.sq = move.to;
        }
        if (move.color === api.opp && move.captured) {
          const capSq = move.capturedSquare ?? move.to;
          const hit =
            stage === "q" ? move.captured === "q" : inst.state.sq != null && capSq === inst.state.sq;
          if (hit) {
            const next = stage === "q" ? "r" : stage === "r" ? "b" : "p";
            const spot = neighbors(capSq).find(
              (n) => !api.board.pieces[n] && (next !== "p" || pawnRankOk(n)),
            );
            if (spot == null) {
              inst.spent = true;
              return;
            }
            api.place(spot, next, api.me);
            pinCosmetic(api, spot, api.me, "matryoshka", null, "Nesting Doll");
            flashSquares(api, [spot], true);
            if (!inst.state.skipped) {
              api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
              inst.state.skipped = true;
            }
            if (next === "p") {
              inst.spent = true;
              return;
            }
            inst.state.stage = next;
            inst.state.sq = spot;
          }
        }
        if (move.color === api.me) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        `watching the ${inst.state.stage === "q" ? "queen" : inst.state.stage === "r" ? "shell rook" : "shell bishop"}, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 115. Ghost Ship ------------------------------------------------------------
  card(
    {
      id: "ov_ghost_ship",
      name: "Ghost Ship",
      description: "A ghost ship sails a chosen file from your back rank, one square per your turn for 6 turns, passing through everything: any enemy piece except a king on the square it crosses is frozen for 1 turn. One of your pieces may take a free step as it sails.",
      tip: "Pick a file their pieces have to use; the ship cannot be blocked or captured.",
      tier: 5,
      category: "tempo",
      icon: "Ship",
      flavor: "Fog first, then rigging, then regret.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.file != null) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the ship's file",
            squares: ALL_SQUARES(),
          };
        }
        if (picks.length === 1) {
          const steppers = mySquares(api.board, api.me).filter((sq) =>
            neighbors(sq).some(
              (n) =>
                !api.board.pieces[n] &&
                (api.board.pieces[sq]!.type !== "p" || pawnRankOk(n)),
            ),
          );
          if (steppers.length === 0) return null;
          return {
            kind: "square",
            label: "Optionally step one piece to an empty adjacent square",
            squares: steppers,
            finishable: true,
          };
        }
        if (picks.length === 2) {
          const from = picks[1].square!;
          return {
            kind: "square",
            label: "Step it to an empty adjacent square",
            squares: neighbors(from).filter(
              (n) =>
                !api.board.pieces[n] &&
                (api.board.pieces[from]!.type !== "p" || pawnRankOk(n)),
            ),
          };
        }
        return null;
      },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.file != null) return;
        inst.state.file = FILE(sq);
        inst.state.step = 0;
        flashSquares(api, [SQ(FILE(sq), ownRank(api.me, 0))]);
        const from = picks[1]?.square, to = picks[2]?.square;
        if (from != null && to != null && adjacent(from, to) && !api.board.pieces[to]) {
          const p = api.board.pieces[from];
          if (p && p.color === api.me && (p.type !== "p" || pawnRankOk(to))) {
            api.relocate(from, to);
            flashSquares(api, [to], true);
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        const file = inst.state.file as number | undefined;
        if (file == null || move.color !== api.me) return;
        const step = ((inst.state.step as number) ?? 0) + 1;
        inst.state.step = step;
        const sq = SQ(file, ownRank(api.me, step));
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "bubble" });
        }
        flashSquares(api, [sq]);
        if (step >= 6) inst.spent = true;
      },
      status: (inst) =>
        inst.state.file == null
          ? "chart the course"
          : `sailing, ${6 - ((inst.state.step as number) ?? 0)} squares to go`,
    },
  ),
  // 116. Upper Shelf -----------------------------------------------------------
  card(
    {
      id: "ov_upper_shelf",
      name: "Upper Shelf",
      description: "Your next draft is dealt from one tier higher. If it goes unused, the lift expires after two of your drafts.",
      tier: 5,
      category: "draft",
      icon: "ArrowBigUp",
      flavor: "The ladder slides over. The good stuff glints.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
        inst.state.start = api.mine.draftsTaken;
      },
      onMovePlayed: (inst, _move, api) => {
        if (api.mine.draftsTaken - ((inst.state.start as number) ?? 0) >= 2) {
          if ((api.mine.flags.bankBonus ?? 0) > 0) api.mine.flags.bankBonus = undefined;
          inst.spent = true;
        }
      },
      status: () => "next draft dealt one tier higher",
    },
  ),
  // 117. Algorithm Boost -------------------------------------------------------
  // ADAPTED: the 4-card offer and the 8-second pick timer are client UX the
  // engine cannot enforce; implemented with the widest offer flag that exists,
  // a 3-card next draft (prepThree).
  card(
    {
      id: "ov_algorithm_boost",
      name: "Algorithm Boost",
      description: "The algorithm optimizes your feed: your next draft offers three cards, you gain a draft reroll, and you gain 15 seconds.",
      tier: 5,
      category: "draft",
      icon: "Cpu",
      flavor: "You will love card three. The engagement data insists.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      api.adjustClock({ addSelfSec: 15 });
    }),
  ),
  // 118. Winter Palace ---------------------------------------------------------
  card(
    {
      id: "ov_winter_palace",
      name: "Winter Palace",
      description:
        "For your opponent's next 4 turns, any enemy piece except the king that ends its move on your back two ranks is frozen in ice for 1 turn.",
      tier: 5,
      category: "protection",
      icon: "Snowflake",
      flavor: "The frost crawls out from the corners to greet visitors.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (turnsLeft(inst) > 0 && relRank(api.me, move.to) <= 2) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 1, skin: "ice" });
            flashSquares(api, [move.to]);
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns of frost left`,
    },
  ),
  // 119. Puppeteer's Gala ------------------------------------------------------
  // ADAPTED: the engine allows one activation per card, so the two control
  // turns are folded into a single gala night: both marionette moves resolve
  // now, on two DIFFERENT enemy minors, each along its own non-capture moves.
  card(
    {
      id: "ov_puppeteers_gala",
      name: "Puppeteer's Gala",
      description:
        "Pull the strings: move up to two different enemy minor pieces yourself, each along its own normal non-capture moves, onto empty squares.",
      tier: 6,
      category: "movement",
      icon: "Grab",
      flavor: "Gloved hands, taut strings, a jerky little waltz.",
    },
    activated(
      (_inst, api, picks) => {
        const marionettes = (taken: (Square | undefined)[]) =>
          mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return (
              (t === "n" || t === "b") &&
              !taken.includes(sq) &&
              minorQuietDests(api, sq).length > 0
            );
          });
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the first marionette (enemy minor)",
            squares: marionettes([]),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Walk it to an empty square",
            squares: minorQuietDests(api, picks[0].square!),
          };
        }
        if (picks.length === 2) {
          const options = marionettes([picks[0].square]);
          if (options.length === 0) return null;
          return {
            kind: "square",
            label: "Optionally choose a second marionette",
            squares: options,
            finishable: true,
          };
        }
        if (picks.length === 3) {
          return {
            kind: "square",
            label: "Walk it to an empty square",
            squares: minorQuietDests(api, picks[2].square!).filter(
              (sq) => sq !== picks[1].square,
            ),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        for (const [i, j] of [
          [0, 1],
          [2, 3],
        ] as const) {
          const from = picks[i]?.square, to = picks[j]?.square;
          if (from == null || to == null) continue;
          const p = api.board.pieces[from];
          if (!p || p.color !== api.opp || (p.type !== "n" && p.type !== "b")) continue;
          if (api.board.pieces[to]) continue;
          api.relocate(from, to);
          flashSquares(api, [to], true);
        }
      },
    ),
  ),
  // 120. Demolition Derby ------------------------------------------------------
  card(
    {
      id: "ov_demolition_derby",
      name: "Demolition Derby",
      description:
        "Choose a 3x3 arena: every piece inside except kings lurches one random square (blocked pieces stay put), and any two that crash into the same square are both wrecked.",
      tier: 4,
      category: "attack",
      icon: "Car",
      flavor: "Engines rev. Nobody signed a waiver.",
    },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the derby arena's center",
              squares: ALL_SQUARES(),
            },
      (_inst, api, picks) => {
        const center = picks[0]?.square;
        if (center == null) return;
        const area = [center, ...neighbors(center)].sort((a, b) => a - b);
        const movers: { sq: Square; dest: Square; type: string; color: string }[] = [];
        for (const sq of area) {
          const p = api.board.pieces[sq];
          if (!p || p.type === "k") continue;
          const [df, dr] = ALL_DIRS[api.rng.int(ALL_DIRS.length)];
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          let dest = inBoard(f, r) ? SQ(f, r) : sq;
          if (p.type === "p" && !pawnRankOk(dest)) dest = sq;
          movers.push({ sq, dest, type: p.type, color: p.color });
        }
        const moverSquares = new Set(movers.map((m) => m.sq));
        // A destination held by a non-mover (a king, or anything outside the
        // arena) is a parked car: the driver bounces off and stays home.
        for (const m of movers) {
          if (m.dest !== m.sq && api.board.pieces[m.dest] && !moverSquares.has(m.dest)) {
            m.dest = m.sq;
          }
        }
        const claims = new Map<Square, number>();
        for (const m of movers) claims.set(m.dest, (claims.get(m.dest) ?? 0) + 1);
        // Wrecks are counted losses; survivors are lifted and re-seated so a
        // full ring of cars can rotate without stomping each other.
        for (const m of movers) {
          if ((claims.get(m.dest) ?? 0) >= 2) api.removePiece(m.sq);
        }
        const survivors = movers.filter((m) => (claims.get(m.dest) ?? 0) < 2);
        for (const m of survivors) api.removePiece(m.sq, { uncounted: true });
        for (const m of survivors) {
          api.place(m.dest, m.type as "p" | "n" | "b" | "r" | "q", m.color as "w" | "b");
        }
        flashSquares(api, area, true);
      },
    ),
  ),
  // 121. Raven Parliament ------------------------------------------------------
  card(
    {
      id: "ov_raven_parliament",
      name: "Raven Parliament",
      description:
        "For 5 of your turns, at the start of each: every undefended enemy piece is marked by a perching raven.",
      tier: 2,
      category: "info",
      icon: "Feather",
      flavor: "They confer, they caw, they name names.",
      fx: { motif: "blindfold", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          flashSquares(api, undefendedPieces(api.board, api.opp));
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns in session`,
    },
  ),
  // 122. Squire's Ascension ----------------------------------------------------
  card(
    {
      id: "ov_squires_ascension",
      name: "Squire's Ascension",
      description:
        "After your opponent's next move, one of your pawns is knighted, permanently becoming a knight. If it ever captures a queen, it is crowned a queen.",
      tier: 5,
      category: "pieces",
      icon: "Sword",
      flavor: "Sword taps shoulder. Career trajectory goes vertical.",
      requires: ["p"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the squire",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        inst.state.sq = sq;
        inst.state.pending = true;
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          if (inst.state.pending && move.promotion) {
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
          if (!inst.state.pending && move.color === api.me && move.captured === "q") {
            api.setPieceType(move.to, "q");
            flashSquares(api, [move.to], true);
            inst.spent = true;
            return;
          }
        }
        if (inst.state.pending && move.color === api.opp) {
          const cur = inst.state.sq as Square;
          const p = api.board.pieces[cur];
          if (p && p.color === api.me && p.type === "p") {
            api.setPieceType(cur, "n");
            flashSquares(api, [cur], true);
          }
          inst.state.pending = false;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "knight a pawn"
          : inst.state.pending
            ? "the squire is knighted after the opponent replies"
            : "the squire dreams of a crown",
    },
  ),
  // 123. Flash Mob -------------------------------------------------------------
  card(
    {
      id: "ov_flash_mob",
      name: "Flash Mob",
      description:
        "Four pawns appear on random empty squares of your third rank. They hold the final pose (cannot move) for 1 turn.",
      tier: 4,
      category: "pieces",
      icon: "Speaker",
      flavor: "The boombox clicks on and infantry materializes.",
    },
    instant((_inst, api) => {
      const rank = ownRank(api.me, 2);
      const spots = ALL_SQUARES().filter((sq) => RANK(sq) === rank && !api.board.pieces[sq]);
      const placed: Square[] = [];
      for (let i = 0; i < 4 && spots.length > 0; i++) {
        const sq = spots.splice(api.rng.int(spots.length), 1)[0];
        api.place(sq, "p", api.me);
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 1, skin: "charm" });
        placed.push(sq);
      }
      flashSquares(api, placed, true);
    }),
  ),
  // 124. Gravity Flip ----------------------------------------------------------
  // ADAPTED: the roster flips gravity for BOTH sides' pawns, but move augments
  // are owner-only; implemented for your pawns only, priced accordingly.
  card(
    {
      id: "ov_gravity_flip",
      name: "Gravity Flip",
      description:
        "For 2 of your turns, your pawns may also step one square straight backward onto an empty square. No backward captures.",
      tier: 6,
      category: "movement",
      icon: "ArrowDownUp",
      flavor: "The board tilts and the infantry discovers reverse.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    timedAugment(2, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const to = sq - fwdOf(api.me);
        if (to >= 0 && to <= 63 && pawnRankOk(to) && !api.board.pieces[to]) {
          out.push(...teleportMoves(api.board, sq, [to], inst.id));
        }
      }
      return out;
    }),
  ),
  // 125. Player Trade ----------------------------------------------------------
  // ADAPTED: the roster's rider (the opponent may then swap two of theirs) has
  // no opponent-choice hook to hang on; dropped, and the card is priced as a
  // clean self swap.
  card(
    {
      id: "ov_player_trade",
      name: "Player Trade",
      description:
        "After your opponent replies, swap the squares of two of your chosen pieces. Kings sit out, and a pawn may not land on the first or last rank.",
      tier: 5,
      category: "movement",
      icon: "Repeat",
      flavor: "The whistle blows. Two jersey numbers flash.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.armed) return null;
        const canPair = (a: Square, b: Square) => {
          const ta = api.board.pieces[a]!.type, tb = api.board.pieces[b]!.type;
          if (ta === tb) return false;
          if (ta === "p" && !pawnRankOk(b)) return false;
          if (tb === "p" && !pawnRankOk(a)) return false;
          return true;
        };
        const own = mySquares(api.board, api.me).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the first piece to trade",
            squares: own.filter((a) => own.some((b) => b !== a && canPair(a, b))),
          };
        }
        if (picks.length === 1) {
          const a = picks[0].square!;
          return {
            kind: "square",
            label: "Choose the piece it trades places with",
            squares: own.filter((b) => b !== a && canPair(a, b)),
          };
        }
        return null;
      },
      effect: (inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null || a === b || inst.state.armed) return;
        const pa = api.board.pieces[a], pb = api.board.pieces[b];
        if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) return;
        if (pa.type === "k" || pb.type === "k") return;
        if (pa.type === "p" && !pawnRankOk(b)) return;
        if (pb.type === "p" && !pawnRankOk(a)) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.armed = true;
        flashSquares(api, [a, b]);
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed || move.color !== api.opp) return;
        inst.spent = true;
        const a = inst.state.a as Square, b = inst.state.b as Square;
        const pa = api.board.pieces[a], pb = api.board.pieces[b];
        if (!pa || !pb || pa.color !== api.me || pb.color !== api.me) return;
        if (pa.type === "k" || pb.type === "k") return;
        if (pa.type === "p" && !pawnRankOk(b)) return;
        if (pb.type === "p" && !pawnRankOk(a)) return;
        const ta = pa.type;
        api.setPieceType(a, pb.type);
        api.setPieceType(b, ta);
        flashSquares(api, [a, b], true);
      },
      status: (inst) =>
        inst.state.armed
          ? "the trade resolves after your opponent replies"
          : "choose two pieces to trade",
    },
  ),
];
