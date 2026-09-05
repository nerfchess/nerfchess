// Fantasy set: THE FEY COURTS. Enchantments from the twilight realm: pixie
// dust that lightens your cavalry (timedAugment), a faerie ring and a thorn
// hedge that seal ground (barNeighbors / barLine), charms that lure or convert
// enemy pieces (freeze / convertEnemies), a changeling swap (transformOwn), a
// seelie ward and a gossamer veil (shield effects), an unseelie bargain paid in
// tempo (extraMoves + skips), a dryad that walks beside you and fades
// (summonTemp), Puck's mischief hobbling the enemy court (curse), a step
// through the hedge (relocateAnywhere), and the Wild Hunt (removeEnemies).
// Every card reuses an existing primitive; kings are never frozen, converted,
// or removed, and every opponent filter is partial so nothing can soft-lock.

import { Buff } from "./shared";
import {
  card,
  curse,
  activated,
  activatedSimple,
  addEffect,
  barLine,
  barNeighbors,
  convertEnemies,
  freezeTarget,
  mySquares,
  relocateMany,
  slideMoves,
  timedAugment,
  DIAG_DIRS,
  FILE,
  RANK,
} from "./shared";

export const FANTASY_FEY: Buff[] = [
  card(
    {
      id: "pixie_dust",
      name: "Pixie Dust",
      description:
        "A handful of glittering dust settles on your stables: for your next 3 turns each of your knights may also step one square diagonally.",
      tier: 3,
      category: "movement",
      requires: ["n"],
      flavor: "Second star to the right, then hard left at the rook.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true },
    },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, DIAG_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "faerie_ring",
      name: "Faerie Ring",
      description:
        "A ring of pale mushrooms springs up around a square you choose: the 8 squares surrounding it are impassable to your opponent for their next 2 turns.",
      tier: 4,
      category: "hex",
      flavor: "Step inside and dance a hundred years.",
      fx: { motif: "blindfold" },
    },
    // Balance pass: the ring's longest (and only) duration is trimmed by one
    // opponent turn, 3 to 2.
    barNeighbors(2, "Choose the center of the faerie ring"),
  ),
  card(
    {
      id: "will_o_wisp",
      name: "Will-o'-Wisp",
      description:
        "A cold flame dances ahead of one enemy piece and it follows: lure one enemy piece except a king one square diagonally forward, toward your side, onto an empty square you choose. Using it consumes your next unused reroll, if you have one.",
      tier: 3,
      category: "tempo",
      flavor: "Follow the light. The light knows a shortcut.",
    },
    activated(
      (_inst, api, picks) => {
        const fwd = api.opp === "w" ? 1 : -1;
        const luredTo = (sq: number) =>
          [-1, 1]
            .map((df) => ({ f: FILE(sq) + df, r: RANK(sq) + fwd }))
            .filter(({ f, r }) => f >= 0 && f <= 7 && r >= 0 && r <= 7)
            .map(({ f, r }) => f + r * 8)
            .filter(
              (to) =>
                !api.board.pieces[to] &&
                // A lured pawn never lands on a promotion rank.
                (api.board.pieces[sq]?.type !== "p" || (RANK(to) >= 1 && RANK(to) <= 6)),
            );
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy piece that follows the light",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && luredTo(sq).length > 0,
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose where the light leads it",
          squares: luredTo(picks[0].square!),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        if (api.board.pieces[from] && !api.board.pieces[to]) api.relocate(from, to);
        // Balance pass: using the lure consumes the next unused reroll, if any.
        api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
      },
    ),
  ),
  card(
    {
      id: "glamour",
      name: "Glamour",
      description:
        "The courts trade changelings: one enemy pawn you choose joins your army, and one of your pawns you choose joins theirs. Using it consumes your next unused reroll, if you have one.",
      tier: 3,
      category: "pieces",
      requires: ["p"],
      flavor: "Both sides swear they got the better of the deal.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy pawn to charm",
            // The trade needs a pawn from each court: without one of your own
            // to give back, the bargain never starts.
            squares:
              mySquares(api.board, api.me, "p").length > 0
                ? mySquares(api.board, api.opp, "p")
                : [],
          };
        }
        return {
          kind: "square",
          label: "Choose your pawn to trade away",
          squares: mySquares(api.board, api.me, "p"),
        };
      },
      (_inst, api, picks) => {
        const theirs = picks[0]?.square, mine = picks[1]?.square;
        if (theirs == null) return;
        api.setPieceColor(theirs, api.me);
        if (mine != null && api.board.pieces[mine]?.color === api.me) {
          api.setPieceColor(mine, api.opp);
        }
        // Balance pass: using the trade consumes the next unused reroll, if any.
        api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
      },
    ),
  ),
  card(
    {
      id: "thorn_hedge",
      name: "Thorn Hedge",
      description:
        "A hedge of black thorns walls off your realm: enemy bishops, rooks, and queens cannot cross into your half of the board for their next 3 turns.",
      tier: 6,
      category: "hex",
      flavor: "A hundred years of briars in a single heartbeat.",
      fx: { motif: "blindfold", pieces: ["b", "r", "q"] },
    },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "b" && m.piece !== "r" && m.piece !== "q") return true;
        return api.opp === "w" ? RANK(m.to) < 4 : RANK(m.to) >= 4;
      }),
    ),
  ),
  card(
    {
      id: "changeling",
      name: "Changeling",
      description:
        "The cradle swap ran the other way: one enemy knight or bishop you choose was a changeling all along. The glamour breaks and it is just a pawn.",
      tier: 6,
      category: "hex",
      flavor: "The cradle was never empty. It was just not yours.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to unmask",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                // A minor on a promotion rank cannot become a stranded pawn.
                return (t === "n" || t === "b") && RANK(sq) >= 1 && RANK(sq) <= 6;
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && (p.type === "n" || p.type === "b")) {
          api.setPieceType(sq, "p");
        }
      },
    ),
  ),
  card(
    {
      id: "seelie_blessing",
      name: "Seelie Blessing",
      description:
        "The bright court smiles on one of your pieces: it cannot be captured for your opponent's next 3 turns, and any freeze or stun on it melts away as the blessing lands.",
      tier: 4,
      category: "protection",
      boon: true,
      flavor: "Their favor is warm, brief, and absolutely conditional.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece the bright court favors",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
          // The blessing also melts any freeze/stun/walnut pinning the piece
          // (the rider that separates this from plain Reinforce, tier 2).
          api.bs.effects = api.bs.effects.filter(
            (e) => !((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me && e.sq === sq),
          );
        }
      },
    ),
  ),
  card(
    {
      id: "unseelie_bargain",
      name: "Unseelie Bargain",
      description:
        "Free action: strike a bargain with the dark court and take two extra moves right now. When the sequence resolves the price comes due and you skip your next draft.",
      tier: 6,
      category: "tempo",
      flavor: "Read the contract. The contract reads you back.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        // Balance pass: the price is now a skipped draft, not a skipped turn.
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      }),
      freeAction: true,
    },
  ),
  card(
    {
      id: "dryad_grove",
      name: "Dryad Grove",
      description:
        "The grove parts for the clergy just once: your bishops may slide through one of your own pawns (never capturing it) to the square beyond. This is a single passage, spent the first turn any such slide is on offer, whether or not you take it.",
      tier: 5,
      category: "movement",
      requires: ["b"],
      flavor: "Her roots go deeper than your war.",
      fx: { motif: "empower", pieces: ["b"], self: true },
    },
    // Balance pass: the phasing slide is a single charge, not a permanent grant.
    // The engine only ever offers the slide when legal, so a "failed attempt"
    // cannot happen; instead the charge is spent the first turn the slide is
    // available, taken (played via this card) or not (any other move that turn).
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
        inst.state.offered = false;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        for (const from of mySquares(api.board, api.me, "b")) {
          for (const [df, dr] of DIAG_DIRS) {
            let f = FILE(from) + df, r = RANK(from) + dr, passedPawn = false;
            while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
              const to = f + r * 8;
              const t = api.board.pieces[to];
              if (!t) {
                if (passedPawn) {
                  moves.push({ from, to, piece: "b", color: api.me, via: inst.id });
                  inst.state.offered = true;
                }
              } else if (t.color === api.me && t.type === "p" && !passedPawn) {
                passedPawn = true;
              } else {
                if (passedPawn && t.color !== api.me) {
                  moves.push({
                    from,
                    to,
                    piece: "b",
                    color: api.me,
                    captured: t.type,
                    capturedSquare: to,
                    via: inst.id,
                  });
                  inst.state.offered = true;
                }
                break;
              }
              f += df;
              r += dr;
            }
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        // Reset the availability flag at the start of each of the caster's
        // turns (after the opponent replies) so it only ever reflects whether
        // the passage was truly on offer on the caster's own move.
        if (move.color === api.opp) {
          inst.state.offered = false;
          return;
        }
        if (move.color !== api.me || ((inst.state.charges as number) ?? 0) <= 0) return;
        if (move.via === inst.id || inst.state.offered) {
          inst.state.charges = 0;
          inst.spent = true;
        }
        inst.state.offered = false;
      },
      status: (inst) =>
        ((inst.state.charges as number) ?? 0) > 0 ? "one passage ready" : "the grove has closed",
    },
  ),
  card(
    {
      id: "pucks_mischief",
      name: "Puck's Mischief",
      description:
        "A hobgoblin ties every royal shoelace together: for their next 3 turns your opponent's queen and rooks may move only one square at a time.",
      tier: 5,
      category: "hex",
      flavor: "Lord, what fools these monarchs be.",
      fx: { motif: "slow", pieces: ["q", "r"] },
    },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "q" && m.piece !== "r") return true;
        return (
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1
        );
      }),
    ),
  ),
  card(
    {
      id: "fey_step",
      name: "Fey Step",
      description:
        "One of your knights or bishops slips into the hedgerow and steps out behind their lines: move it to any empty square on your opponent's back two ranks, once. The step lands on an empty square only and cannot capture.",
      tier: 2,
      category: "movement",
      requires: ["n", "b"],
      flavor: "The shortest path runs through a country that is not there.",
    },
    relocateMany(1, (api, from) => {
      const t = api.board.pieces[from]?.type;
      if (t !== "n" && t !== "b") return [];
      const ranks = api.opp === "w" ? [0, 1] : [6, 7];
      return ranks.flatMap((r) => Array.from({ length: 8 }, (_, f) => f + r * 8));
    }),
  ),
  card(
    {
      id: "gossamer_veil",
      name: "Gossamer Veil",
      description:
        "A shimmering veil of spider-silk tangles every long blade: your pieces cannot be captured by enemy bishops, rooks, or queens for your opponent's next 2 turns. Pawns, knights, and kings still cut through.",
      tier: 5,
      category: "protection",
      flavor: "Softer than moonlight, stronger than mail.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    curse(2, (moves) =>
      moves.filter(
        (m) => !(m.captured && (m.piece === "b" || m.piece === "r" || m.piece === "q")),
      ),
    ),
  ),
  card(
    {
      id: "wild_hunt",
      name: "The Wild Hunt",
      description:
        "The horns of the twilight court sound: pick any square, and the Hunt rides both diagonals through it, carrying off every enemy piece on them. Kings are never taken.",
      tier: 7,
      category: "attack",
      flavor: "Do not look up when the hoofbeats pass overhead.",
    },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the square the Hunt rides through",
              squares: Array.from({ length: 64 }, (_, i) => i),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (const [df, dr] of DIAG_DIRS) {
          let f = FILE(c) + df, r = RANK(c) + dr;
          while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
            const sq = f + r * 8;
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") api.removePiece(sq);
            f += df;
            r += dr;
          }
        }
        const center = api.board.pieces[c];
        if (center && center.color === api.opp && center.type !== "k") api.removePiece(c);
      },
    ),
  ),
];
