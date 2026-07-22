// PT batch: CURSES, CHAOS, and SUMMONS drawn from the brainstorm doc
// (Documents/pt.txt) via the NEW_FEASIBLE triage. Every card reuses primitives
// that already exist in the engine and follows the same safety rails as the
// rest of the funny set:
//   - Kings are never frozen, removed, targeted, or forced into a soft-lock.
//   - Every opponent-move filter is PARTIAL: if it would leave the opponent
//     with zero moves it falls back to the full move list (an explicit
//     `kept.length > 0 ? kept : moves` guard on top of game.ts's own relaxers).
//   - All randomness runs on the deterministic seeded api.rng, never Math.random.
//   - Board changes go exclusively through api.place / removePiece / setPieceType
//     and the engine's own timed effects (freeze / short_leash / timed_loss).
//
// This file only defines and exports PT_CURSE_CARDS. It is intentionally not
// wired into library.ts here.

import {
  card,
  instant,
  activated,
  addEffect,
  mySquares,
  emptySquares,
  pawnRankOk,
  inHalf,
  relRank,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
  ALL_DIRS,
} from "../funny/shared";
import type { Buff, BuffApi, Move, PieceType, Square } from "../funny/shared";
import { addNovel, freezeAllEnemies, revivable, markRevived } from "../helpers";

// ---------------------------------------------------------------------------
// Local geometry helpers.
// ---------------------------------------------------------------------------

/** The up-to-8 on-board squares surrounding `sq` (its king-step ring). */
function ringOf(sq: Square): Square[] {
  const out: Square[] = [];
  const f = FILE(sq),
    r = RANK(sq);
  for (const [df, dr] of ALL_DIRS) {
    const nf = f + df,
      nr = r + dr;
    if (inBoard(nf, nr)) out.push(SQ(nf, nr));
  }
  return out;
}

/** Pinocchio's nose: at most one straight-ahead capture, reaching `1 + nose`
 * squares forward, spearing the first enemy piece (never a king) in the file.
 * The nose stops at the first piece it meets, friend or foe. */
function noseCaptures(api: BuffApi, sq: Square, nose: number, via: string): Move[] {
  const p = api.board.pieces[sq];
  if (!p || p.type !== "p") return [];
  const dir = p.color === "w" ? 1 : -1;
  const reach = 1 + Math.min(4, Math.max(0, nose));
  const out: Move[] = [];
  const f = FILE(sq);
  let r = RANK(sq) + dir;
  for (let d = 1; d <= reach; d++, r += dir) {
    if (!inBoard(f, r)) break;
    const to = SQ(f, r);
    const t = api.board.pieces[to];
    if (!t) continue; // the nose extends over empty squares
    if (t.color !== p.color && t.type !== "k") {
      if (relRank(p.color, to) === 8) {
        for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
          out.push({ from: sq, to, piece: "p", color: p.color, captured: t.type, capturedSquare: to, via, promotion: promo });
        }
      } else {
        out.push({ from: sq, to, piece: "p", color: p.color, captured: t.type, capturedSquare: to, via });
      }
    }
    break; // stop at the first piece (friend, foe, or king)
  }
  return out;
}

/** Greenhouse: my pawns may promote one rank early, at relative rank 7, when
 * the move touches the domed file: a forward advance on the file, a diagonal
 * capture out of the file, or a diagonal capture into it. */
function greenhouseGen(api: BuffApi, file: number, via: string): Move[] {
  const out: Move[] = [];
  const dir = api.me === "w" ? 1 : -1;
  for (const sq of mySquares(api.board, api.me, "p")) {
    const f = FILE(sq),
      r = RANK(sq);
    const nr = r + dir;
    if (!inBoard(f, nr)) continue;
    if (f === file) {
      const fwd = SQ(f, nr);
      if (!api.board.pieces[fwd] && relRank(api.me, fwd) === 7) {
        for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
          out.push({ from: sq, to: fwd, piece: "p", color: api.me, via, promotion: promo });
        }
      }
    }
    for (const dfl of [-1, 1]) {
      const nf = f + dfl;
      if (!inBoard(nf, nr)) continue;
      // The capture qualifies when it starts on the domed file or lands on it.
      if (f !== file && nf !== file) continue;
      const to = SQ(nf, nr);
      const t = api.board.pieces[to];
      if (t && t.color !== api.me && t.type !== "k" && relRank(api.me, to) === 7) {
        for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
          out.push({ from: sq, to, piece: "p", color: api.me, via, captured: t.type, capturedSquare: to, promotion: promo });
        }
      }
    }
  }
  return out;
}

/** Best captured piece to raise (strongest first), or null if none is owed. */
const REVIVE_ORDER: PieceType[] = ["q", "r", "b", "n", "p"];
function bestRevivable(api: BuffApi): PieceType | null {
  for (const t of REVIVE_ORDER) if (revivable(api, t) > 0) return t;
  return null;
}

export const PT_CURSE_CARDS: Buff[] = [
  // #14 Snooze Button ------------------------------------------------------
  // Freeze every enemy piece (never the king) for one of their turns, wearing
  // the "sleep" skin so it never reads like the icy Flash Freeze family.
  card(
    {
      id: "snooze_button",
      icon: "AlarmClockOff",
      name: "Snooze Button",
      description:
        "Pump sleeping gas down one file you pick: every enemy piece except the king standing on that file falls asleep and cannot move for their next turn.",
      tier: 4,
      category: "tempo",
      flavor: "Five more minutes.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to gas",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const f = FILE(c);
        for (let r = 0; r < 8; r++) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "sleep" });
          }
        }
      },
    ),
  ),

  // #20 Groundhog Day ------------------------------------------------------
  // A VHS rewind: whichever piece the opponent moves next, they must move that
  // same piece again on the two turns after. A passive that records their
  // choice then echoes it; the filter always keeps a non-empty fallback.
  card(
    {
      id: "groundhog_day",
      icon: "Repeat",
      name: "Groundhog Day",
      description:
        "The board hits a VHS rewind on your opponent: whichever piece they move on their next turn, they must move that same piece again on the two turns after. If that piece can no longer move, the loop is skipped.",
      tier: 6,
      category: "hex",
      flavor: "Didn't we just do this?",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3; // the recording turn plus two echoes
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves; // the recording turn: free choice
        const kept = moves.filter((m) => m.from === sq);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (inst.state.sq == null) inst.state.sq = move.to; // record the piece
        else if (move.from === inst.state.sq) inst.state.sq = move.to; // follow the echo
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "waiting for their move"
          : `deja vu: ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // #60 Whoopee Cushion ----------------------------------------------------
  // Hide a cushion on an empty square. The first non-king enemy piece to land
  // on it is embarrassed and must keep moving for their next 2 turns, then the
  // cushion is spent.
  card(
    {
      id: "whoopee_cushion",
      name: "Whoopee Cushion",
      description:
        "Hide a whoopee cushion on an empty square. The first enemy piece other than the king to land on it makes a rude noise and must move that same piece again on their next 2 turns. Then the cushion is done.",
      tier: 2,
      category: "item",
      flavor: "PFFFFT.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.cushion != null
          ? null
          : {
              kind: "square",
              label: "Choose the empty square to hide the cushion",
              squares: emptySquares(api.board),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.cushion != null) return;
        const sq = picks[0]?.square;
        if (sq != null) {
          inst.state.cushion = sq;
          // Mark the placed cushion as an "online" running card so the bot's
          // reusable-card guard (state.active) stops re-activating it every
          // turn (it stored its square only in state.cushion before, which the
          // guard does not recognize, so the bot wasted its activations).
          inst.state.active = true;
        }
      },
      filterOpponentMoves: (moves, inst, api) => {
        const armed = inst.state.armed as Square | undefined;
        if (armed == null || moves.length === 0) return moves;
        const p = api.board.pieces[armed];
        if (!p || p.color !== api.opp) return moves; // the sitter left or was taken
        const kept = moves.filter((m) => m.from === armed);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const cushion = inst.state.cushion as Square | undefined;
        if (cushion == null) return;
        const armed = inst.state.armed as Square | undefined;
        if (armed != null) {
          // The embarrassed piece was captured or overrun: the gag ends early.
          if (move.to === armed && move.from !== armed && move.color === api.me) {
            inst.state.armed = undefined;
            inst.spent = true;
            return;
          }
          if (move.color !== api.opp) return;
          // Follow the sitter through each forced move; the echo runs for the
          // opponent's next 2 turns, then the cushion is spent.
          if (move.from === armed) inst.state.armed = move.to;
          const left = ((inst.state.echo as number) ?? 1) - 1;
          inst.state.echo = left;
          if (left <= 0) {
            inst.state.armed = undefined;
            inst.spent = true;
          }
          return;
        }
        // Arm the cushion when a non-king enemy piece lands on it. The strike
        // is an OBSERVABLE board effect on purpose: arming was previously a
        // state-only change, so the reveal machinery (which only flags hooks
        // that add an effect or mutate the board) never revealed the hidden
        // cushion, and a replica that never learns the card cannot replay the
        // forced move, risking a desync. Emitting the strike reveals the trap
        // (the PFFFT) at the moment it triggers and keeps both clients in sync.
        if (move.color === api.opp && move.to === cushion && move.piece !== "k") {
          inst.state.armed = cushion;
          inst.state.echo = 2;
          addEffect(api, { kind: "strike", squares: [cushion], owner: api.me, turns: 1 });
        }
      },
      status: (inst) =>
        inst.state.cushion == null
          ? "activate to place the cushion"
          : inst.state.armed != null
            ? `PFFFT: they must move that piece again (${(inst.state.echo as number) ?? 0} turns)`
            : "cushion set and waiting",
    },
  ),

  // #70 Werewolf -----------------------------------------------------------
  // Curse one of your own pawns: every 5 of your turns it transforms between a
  // pawn and a knight. Only ever toggles between p and n, ends on promotion or
  // capture, and never leaves a pawn stranded on the back rank.
  card(
    {
      id: "werewolf",
      icon: "Dog",
      name: "Werewolf",
      description:
        "Curse one of your pawns with lycanthropy: every 5 of your turns it transforms into a knight, and 5 turns later back into a pawn, for the game. The first transformation holds until your opponent replies. If it promotes or is captured the curse lifts.",
      tier: 6,
      category: "pieces",
      requires: ["p"],
      flavor: "Beware the full moon.",
      fx: { motif: "empower", pieces: ["p"], moveAs: "n", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the pawn to curse with lycanthropy",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.form = "p";
        inst.state.turns = 5; // countdown to the next transformation
      },
      onMovePlayed: (inst, move, api) => {
        let sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the werewolf; end the curse if it is captured or promotes.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) {
          if (move.promotion) {
            inst.spent = true;
            inst.state.sq = undefined;
            return;
          }
          inst.state.sq = move.to;
          sq = move.to;
        } else if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        // Flip the werewolf between pawn and knight forms, guarding sync and the
        // back rank exactly as before.
        const doTransform = () => {
          const form = inst.state.form as PieceType;
          const next: PieceType = form === "p" ? "n" : "p";
          const p = api.board.pieces[sq!];
          if (!p || p.color !== api.me || p.type !== form) return; // out of sync
          if (next === "p" && !pawnRankOk(sq!)) return; // never a pawn on the back rank
          api.setPieceType(sq!, next);
          inst.state.form = next;
        };
        // The very first transformation is delayed until the opponent replies:
        // when the countdown first reaches zero we arm `pending` instead of
        // flipping, then the opponent's next move resolves it. Every later
        // transformation fires immediately on the turn its countdown ends.
        if (inst.state.pending && move.color === api.opp) {
          inst.state.pending = false;
          doTransform();
          return;
        }
        if (move.color !== api.me) return;
        const left = ((inst.state.turns as number) ?? 5) - 1;
        if (left > 0) {
          inst.state.turns = left;
          return;
        }
        inst.state.turns = 5;
        if (!inst.state.firstDone) {
          inst.state.firstDone = true;
          inst.state.pending = true;
          return;
        }
        doTransform();
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to choose a pawn"
          : `${inst.state.form === "n" ? "wolf" : "pawn"} form, changes in ${(inst.state.turns as number) ?? 5} of your turns`,
    },
  ),

  // #72 Slowpoke -----------------------------------------------------------
  // A gag "bad card": for your next turn your whole army can only step one
  // square. Uses the owner-scoped short_leash effect, which game.ts relaxes
  // rather than ever stranding you, so it cannot soft-lock.
  card(
    {
      id: "slowpoke",
      icon: "Snail",
      name: "Slowpoke",
      description:
        "A famously bad card. Your whole army goes sluggish: for your next turn every piece can move only one square. It shrugs, apologetically.",
      tier: 2,
      category: "movement",
      flavor: "Sorry. Sorry. Coming through. Sorry.",
      fx: { motif: "anchor", pieces: "all", self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "short_leash", owner: api.me, turns: 1 });
    }),
  ),

  // #75 Pinocchio ----------------------------------------------------------
  // Bind one pawn; each of your turns it does not capture its nose grows by 1
  // (up to +4), letting it spear the first enemy piece straight ahead within
  // 1 + nose squares. Pure augment: it only ever widens your own move list.
  card(
    {
      id: "pinocchio",
      icon: "Ruler",
      name: "Pinocchio",
      description:
        "One pawn's nose grows: each of your turns it does not capture, its reach grows by one square, up to plus four. It may capture the first enemy piece other than a king directly ahead of it within that reach. Capturing shrinks the nose back to zero.",
      tier: 3,
      category: "movement",
      requires: ["p"],
      flavor: "It wasn't lying, exactly.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the pawn whose nose will grow",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.nose = 0;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        addNovel(moves, noseCaptures(api, sq, (inst.state.nose as number) ?? 0, inst.id));
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) {
          if (move.promotion) {
            inst.spent = true;
            inst.state.sq = undefined;
            return;
          }
          inst.state.sq = move.to;
        } else if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.color !== api.me) return;
        if (move.from === sq && move.captured) inst.state.nose = 0;
        else inst.state.nose = Math.min(4, ((inst.state.nose as number) ?? 0) + 1);
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to choose a pawn" : `nose +${(inst.state.nose as number) ?? 0}`,
    },
  ),

  // #93 Hot Potato ---------------------------------------------------------
  // Target one enemy piece (never a king): for their next 4 turns they must
  // move that exact piece, if it can move. The filter follows the potato and
  // always keeps a non-empty fallback.
  card(
    {
      id: "hot_potato",
      name: "Hot Potato",
      description:
        "Curse one enemy piece other than the king into a hot potato: after your opponent's next move, for their following 4 turns they must move that piece if it has any legal move.",
      tier: 4,
      category: "hex",
      flavor: "Hot hot hot, pass it on.",
      fx: { motif: "slow" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece that becomes the hot potato",
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
        inst.state.pending = true; // delay the forced-move rule one opponent reply
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (inst.state.pending) return moves; // not active until after their next move
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return moves;
        const kept = moves.filter((m) => m.from === sq);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        // Their next move is the free delay turn: consume `pending` and do not
        // start the timer until the move after it.
        if (move.color === api.opp && inst.state.pending) {
          inst.state.pending = false;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to choose the potato"
          : inst.state.pending
            ? "hot potato: takes hold after their next move"
            : `hot potato: ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // #94 Stinky -------------------------------------------------------------
  // Mark one enemy piece: for their next 3 turns their OTHER pieces cannot step
  // into the ring of squares around it (the marked piece may move freely).
  // Follows the stinker; always keeps a non-empty fallback.
  card(
    {
      id: "stinky",
      name: "Stinky",
      description:
        "One enemy piece other than the king reeks: after your opponent's next move, for their following 3 turns their other pieces cannot move onto any square adjacent to it. The smelly piece itself may still move anywhere.",
      tier: 3,
      category: "hex",
      flavor: "Somebody skipped bath day.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece nobody wants to stand near",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        inst.state.pending = true; // delay the stink cloud one opponent reply
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (inst.state.pending) return moves; // not active until after their next move
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return moves;
        const ring = ringOf(sq);
        const kept = moves.filter((m) => m.from === sq || !ring.includes(m.to));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        // Their next move is the free delay turn; the cloud starts after it.
        if (move.color === api.opp && inst.state.pending) {
          inst.state.pending = false;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to choose the stinker"
          : inst.state.pending
            ? "stink cloud: settles after their next move"
            : `stink cloud: ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // #101 Allergies ---------------------------------------------------------
  // Target one enemy piece: the sneeze schedule for its next 3 turns is rolled
  // once, deterministically, at cast time. On a scheduled turn that piece is
  // "achoo"-stuck (they must move something else). Never touches other pieces,
  // so the opponent always has moves.
  card(
    {
      id: "allergies",
      name: "Allergies",
      description:
        "One enemy piece other than the king comes down with the sniffles. On each of your opponent's next 2 turns there is a chance it sneezes and cannot move that turn. Their other pieces are unaffected.",
      tier: 3,
      category: "hex",
      flavor: "Bless you.",
      fx: { motif: "slow" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece with a bad case of the sniffles",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 2;
        // Roll the sneeze schedule once, deterministically, at cast time.
        inst.state.schedule = [
          api.rng.next() < 0.6,
          api.rng.next() < 0.6,
        ];
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return moves;
        const schedule = (inst.state.schedule as boolean[]) ?? [];
        const idx = 2 - turnsLeft(inst); // 0 on the first restricted turn, then 1
        if (!schedule[idx]) return moves; // no sneeze this turn
        const kept = moves.filter((m) => m.from !== sq); // the sneezing piece is stuck
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to choose the sneezer" : `allergies: ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // #82 Necromancer --------------------------------------------------------
  // Raise your strongest captured piece as a spooky temporary version in your
  // half; a timed_loss removes it after 6 of your turns. No king is ever
  // revived (kings are not in the revive pool).
  card(
    {
      id: "necromancer",
      name: "Necromancer",
      description:
        "Raise your strongest fallen piece as a spectre on an empty square in your half. It fights for you, then crumbles to dust after 5 of your turns. If nothing of yours has been captured, nothing rises.",
      tier: 7,
      category: "pieces",
      flavor: "The grave was more of a suggestion.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const type = bestRevivable(api);
        return {
          kind: "square",
          label: "Choose where the spectre rises",
          squares:
            type == null
              ? []
              : emptySquares(api.board, (sq) => inHalf(api.me, sq) && (type !== "p" || pawnRankOk(sq))),
        };
      },
      (_inst, api, picks) => {
        const type = bestRevivable(api);
        const sq = picks[0]?.square;
        if (type == null || sq == null) return;
        if (type === "p" && !pawnRankOk(sq)) return;
        api.place(sq, type, api.me);
        markRevived(api, type);
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 5, then: "remove" });
      },
    ),
  ),

  // #88 Sea Monkeys --------------------------------------------------------
  // Four tiny pawns hatch on random empty squares in your half. Distinct from
  // Clone Army (which you place by hand): these sprout wherever there is room,
  // chosen by the deterministic rng.
  card(
    {
      id: "sea_monkeys",
      icon: "FishSymbol",
      name: "Sea Monkeys",
      description:
        "Just add water: four tiny pawns hatch on random empty squares in your half and grow into real pawns.",
      tier: 3,
      category: "pieces",
      flavor: "The instructions promised a castle.",
    },
    instant((_inst, api) => {
      const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq) && pawnRankOk(sq));
      for (let i = 0; i < 4 && spots.length > 0; i++) {
        const idx = api.rng.int(spots.length);
        const sq = spots.splice(idx, 1)[0];
        api.place(sq, "p", api.me);
      }
    }),
  ),

  // #90 Understaffed -------------------------------------------------------
  // Reinterpreted as a spawn/draft delay: your opponent's next drafted card
  // "does not show up for work" and arrives nullified (inert).
  card(
    {
      id: "understaffed",
      name: "Understaffed",
      description:
        "Half the office calls in sick. The first piece your opponent moves gets out freely; then for their next 2 turns they cannot move any piece standing on files a through d.",
      tier: 3,
      category: "hex",
      flavor: "Gone to break, back never.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
      },
      filterOpponentMoves: (moves, inst) => {
        // The first affected piece gets one legal escape move: their opening
        // move under the sickout is unrestricted, then the lockdown bites for
        // its full duration.
        if (!inst.state.escaped) return moves;
        if (turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => FILE(m.from) >= 4);
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && !inst.state.escaped) {
          inst.state.escaped = true; // the escape move; the timer has not started
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.escaped ? `${turnsLeft(inst)} of their turns left` : "one free escape, then lockdown",
    },
  ),

  // #113 Greenhouse --------------------------------------------------------
  // Pick a file; for the game your pawns on that file may promote one rank
  // early (at relative rank 7), by advance or by capture. Pure augment.
  card(
    {
      id: "greenhouse",
      icon: "Flower",
      name: "Greenhouse",
      description:
        "Raise a glass dome over one file. For the game, your pawns may promote one rank early, on your 7th rank instead of your 8th, when they advance along that file, capture out of it, or capture into it.",
      tier: 5,
      category: "pieces",
      requires: ["p"],
      flavor: "Everything grows faster under glass.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, _api, picks) =>
        picks.length > 0 || inst.state.file != null
          ? null
          : {
              kind: "square",
              label: "Choose the file for your greenhouse",
              squares: Array.from({ length: 64 }, (_v, i) => i),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.file != null) return;
        const sq = picks[0]?.square;
        if (sq != null) inst.state.file = FILE(sq);
      },
      augmentMoves: (moves, inst, api) => {
        const file = inst.state.file as number | undefined;
        if (file == null) return;
        addNovel(moves, greenhouseGen(api, file, inst.id));
      },
      status: (inst) =>
        inst.state.file == null
          ? "activate to choose a file"
          : `greenhouse on the ${"abcdefgh"[inst.state.file as number]}-file`,
    },
  ),

  // #119 Chaos Theory ------------------------------------------------------
  // Shuffle the colours of every pawn on the board once, deterministically via
  // the rng. Every pawn stays on a legal pawn square (they already are), so no
  // pawn ever lands on a back rank; kings are untouched.
  card(
    {
      id: "chaos_theory",
      icon: "Shuffle",
      name: "Chaos Theory",
      description:
        "A tornado sweeps the board: every pawn, yours and your opponent's, is randomly reshuffled among the squares pawns currently stand on. Happens once.",
      tier: 6,
      category: "pieces",
      flavor: "A butterfly flapped somewhere.",
    },
    instant((_inst, api) => {
      const squares: Square[] = [];
      for (let sq = 0; sq < 64; sq++) {
        const p = api.board.pieces[sq];
        if (p && p.type === "p") squares.push(sq);
      }
      if (squares.length < 2) return;
      const colors = squares.map((sq) => api.board.pieces[sq]!.color);
      // Fisher-Yates shuffle of the pawn colours (piece type is always pawn).
      for (let i = colors.length - 1; i > 0; i--) {
        const j = api.rng.int(i + 1);
        const tmp = colors[i];
        colors[i] = colors[j];
        colors[j] = tmp;
      }
      for (const sq of squares) api.removePiece(sq, { uncounted: true });
      squares.forEach((sq, i) => api.place(sq, "p", colors[i]));
    }),
  ),

  // #121 Wheel of Fortune --------------------------------------------------
  // Spin for one of six small, self-resolving, safe effects, chosen by the rng.
  // Every branch touches only clocks, your own army, or non-king enemy pieces.
  card(
    {
      id: "wheel_of_fortune",
      icon: "Ticket",
      name: "Wheel of Fortune",
      description:
        "Spin the wheel for one of six random effects: plus 55 seconds to your clock, minus 55 seconds off your opponent's, your army uncapturable for their next 2 turns, a new knight in your half, every enemy piece asleep for their next 2 turns, or two random enemy pieces other than the king removed.",
      tier: 4,
      category: "tempo",
      flavor: "Big money, big money, no whammies.",
    },
    // Every wedge pays out bigger (owner request: the gambling cards paid out
    // too little for their tier): the clocks swing 55s, the shield and sleep
    // hold two turns, the summon is a knight, and the removal takes two.
    instant((inst, api) => {
      const roll = api.rng.int(6);
      switch (roll) {
        case 0:
          api.adjustClock({ addSelfSec: 55 });
          // outcome: the wedge that came up, shown on the board after the
          // wheel lands (see the cast announcement banner). Synced with state.
          inst.state.outcome = "+55 seconds on your clock!";
          break;
        case 1:
          api.adjustClock({ subOppSec: 55 });
          inst.state.outcome = "-55 seconds off your opponent's clock!";
          break;
        case 2:
          addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
          inst.state.outcome = "Your whole army is uncapturable for 2 turns!";
          break;
        case 3: {
          const spots = emptySquares(api.board, (sq) => inHalf(api.me, sq));
          if (spots.length) api.place(spots[api.rng.int(spots.length)], "n", api.me);
          inst.state.outcome = "A fresh knight joins your ranks!";
          break;
        }
        case 4:
          for (const sq of mySquares(api.board, api.opp)) {
            if (api.board.pieces[sq]!.type === "k") continue;
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "sleep" });
          }
          inst.state.outcome = "The enemy army falls asleep for 2 turns!";
          break;
        default: {
          for (let spin = 0; spin < 2; spin++) {
            const targets = mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            );
            if (!targets.length) break;
            api.removePiece(targets[api.rng.int(targets.length)]);
          }
          inst.state.outcome = "Two enemy pieces vanish!";
          break;
        }
      }
    }),
  ),
];
