// Tier 7 (Punishing) hexes: near-decisive curses on the opponent. Each card
// disables multiple pieces or an entire class for a long stretch, freezes the
// whole army, strips turns, or locks the position for so long it feels
// permanent. Spread across every piece target (queen, rook, bishop, knight,
// pawn, king) and every mechanic type (timed filter, petrify one or many,
// freeze one or all, barred squares, king-only, no-pawn-advance, draft denial,
// and a skip). Safety rails (kings never frozen or petrified, filters never
// soft-lock) come from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  instant,
  activated,
  addEffect,
  mySquares,
  relRank,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H = tierHexes(7);

export const HEXES_T7: Buff[] = [
  // --- petrify all: both rooks walnutted 4 turns AND barred from capturing
  // for the rest of the game (tier-7 capstone rider over stone_bastions) ----
  H(
    {
      id: "obsidian_bastions",
      name: "Obsidian Bastions",
      description: "Your opponent's rooks turn to walnuts for 4 of their turns, and from then on those rooks can never capture again for the rest of the game.",
      flavor: "The towers cool into black glass and forget how to strike.",
      // Board paints the walnuts; the permanent no-capture rider has no motif.
      fx: { motif: "jail", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (_inst, api) => {
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "r") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
          }
        }
      },
      filterOpponentMoves: (moves) => {
        if (moves.length === 0) return moves;
        const kept = moves.filter((m) => !(m.piece === "r" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
    },
  ),

  // --- petrify all: the entire minor line (knights and bishops) 3 turns ---
  H(
    {
      id: "statue_garden",
      name: "Statue Garden",
      description: "Your opponent's knights and bishops turn to walnuts for 3 of their turns: a walnut is so heavy it can only shuffle one square at a time.",
      flavor: "Every horse and prelate set among the topiary.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 3),
  ),

  // --- zone petrify: the gaze catches whatever minors crossed the middle ----
  // Not a second Statue Garden (the clean all-minors rung right below): the
  // cockatrice roosts on YOUR side, so only the minors that invaded your half
  // meet the full gaze (4 turns of stone). The ones still at home just catch
  // its reflection and flinch, frozen for a single turn.
  H(
    {
      id: "cockatrice_gaze",
      name: "Cockatrice Gaze",
      description: "Every enemy knight and bishop standing in your half of the board turns to a walnut for 4 of their turns. The minors still in their own half only catch the reflection: they are frozen for 1 turn.",
      flavor: "The ones who crossed the fence met its eyes first.",
      // Board already paints walnuts and freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t !== "n" && t !== "b") continue;
        if (relRank(api.opp, sq) >= 5) {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
        } else {
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
        }
      }
    }),
  ),

  // --- petrify one targeted piece 4 turns AND its two flankers 2 turns -----
  H(
    {
      id: "chisel_curse",
      name: "Chisel Curse",
      description: "Turn one enemy piece you target into a walnut for 4 of their turns, and the enemy pieces directly to its left and right into walnuts for 2 of their turns each. Kings are never affected.",
      flavor: "The chisel bites, and the stone spreads to its neighbours.",
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
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
        for (const df of [-1, 1]) {
          const f = FILE(sq) + df;
          const r = RANK(sq);
          if (!inBoard(f, r)) continue;
          const nsq = SQ(f, r);
          const p = api.board.pieces[nsq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "walnut", sq: nsq, owner: api.opp, turns: 2 });
          }
        }
      },
    ),
  ),

  // --- freeze the whole army 2 turns, then each thawed piece is a walnut 2 -
  H(
    {
      id: "glacial_tomb",
      name: "Glacial Tomb",
      description: "Freeze all of your opponent's pieces except their king for 2 of their turns. As the ice melts each one becomes a walnut for 2 more turns, able to shuffle only one square at a time.",
      flavor: "The army sealed in blue ice that hardens to stone as it cracks.",
      // Board already paints freezes and walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        // Freeze runs first (2 turns); the walnut (4) keeps ticking under it,
        // so when the freeze lifts exactly 2 turns of walnut shuffle remain.
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
      }
    }),
  ),

  // --- freeze one targeted piece AND one enemy piece next to it, 3 each ----
  H(
    {
      id: "frozen_solid",
      name: "Frozen Solid",
      description: "Freeze one enemy piece you target and one enemy piece standing next to it for 3 of their turns each. Kings cannot be chosen.",
      flavor: "The frost jumps from one body to the next.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose an enemy piece to freeze",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        const first = picks[0].square!;
        const adjacent = mySquares(api.board, api.opp).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return (
            t !== "k" &&
            sq !== first &&
            Math.max(Math.abs(FILE(sq) - FILE(first)), Math.abs(RANK(sq) - RANK(first))) === 1
          );
        });
        if (adjacent.length === 0) return null;
        return {
          kind: "square",
          label: "Choose an adjacent enemy piece to freeze too",
          squares: adjacent,
        };
      },
      (_inst, api, picks) => {
        for (const pick of picks) {
          if (pick.square != null) {
            addEffect(api, { kind: "freeze", sq: pick.square, owner: api.opp, turns: 3 });
          }
        }
      },
    ),
  ),

  // --- king_only 1 turn AND block their next draft -------------------------
  H(
    {
      id: "throne_and_silence",
      name: "Throne and Silence",
      description: "For your opponent's next turn they may move only their king, and their next draft is skipped entirely.",
      flavor: "The whole court scatters and the messengers with it.",
      // fx covers the king_only half (board paints it too); the draft
      // denial half shows no board motif.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // --- perma pawn lock for the rest of the game AND bar their own 4th rank -
  H(
    {
      id: "salted_earth",
      name: "Salted Earth",
      description: "Your opponent's pawns can never advance again for the rest of the game; they may still capture diagonally. On top of that, for their next 3 turns they cannot move any piece onto their own 4th rank.",
      flavor: "Ground sown with salt: nothing marches forward on it ever again.",
      // Board paints the barred rank; the permanent pawn lock has no motif.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (_inst, api) => {
        const squares: number[] = [];
        for (let sq = 0; sq < 64; sq++) {
          if (relRank(api.opp, sq) === 4) squares.push(sq);
        }
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
      },
      filterOpponentMoves: (moves) => {
        if (moves.length === 0) return moves;
        // A straight pawn advance keeps the same file; a diagonal capture
        // changes it, so captures (including en passant) are untouched.
        const kept = moves.filter((m) => !(m.piece === "p" && FILE(m.from) === FILE(m.to)));
        return kept.length > 0 ? kept : moves;
      },
    },
  ),

  // --- deterrent: their next two capturing pieces burn up with their prey ---
  H(
    {
      // Not a second Scorched Middle (that BARS ranks 4-5): a capture
      // deterrent. Removal inside onMovePlayed mirrors the proven hook
      // patterns (Voodoo Doll / The Culling) and uses no rng at all.
      id: "molten_heart",
      name: "Molten Heart",
      description: "Their blades run molten: for your opponent's next 2 captures, the capturing piece is destroyed along with its victim. Kings burn nothing and are never destroyed.",
      flavor: "Whatever the fire takes, it keeps.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.piece === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
        const p = api.board.pieces[move.to];
        if (p && p.color === api.opp && p.type !== "k") api.removePiece(move.to);
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} captures left`,
    },
  ),

  // --- draft denial that DEGRADES the pool: the next offer rolls at tier 1 --
  // Not Burned Dispatches one tier louder (T5's block-then-nullify combo, and
  // Hexed Satchel owns clean nullifies): the archive seals one draft away
  // outright, and what leaks out afterwards is the DREGS: their next offer
  // after that is forced down to tier 1.
  H(
    {
      id: "sealed_archive",
      name: "Sealed Archive",
      description: "Your opponent's next draft is skipped entirely, and the draft after that is forced to roll at tier 1: only the dregs seep out of a sealed vault.",
      flavor: "The vault is bricked over, and what little seeps out afterwards is worthless.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.flags.forceTier = 1;
    }),
  ),

  // --- combo: skip one turn, skip their next draft, and burn their clock --
  // Retuned off the old plain skip-2 (that is lost_days in tier 6) to tier
  // 7's draft/tempo theme: one turn, one draft, and 20 seconds all gone.
  H(
    {
      id: "lost_fortnight",
      name: "Lost Fortnight",
      description: "Your opponent skips their next turn, their next draft is skipped, and 20 seconds are struck off their clock.",
      flavor: "Two weeks torn from the ledger: a move, a draft, and time all gone at once.",
      // fx covers the turn skip; the draft and clock halves show no board motif.
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.adjustClock({ subOppSec: 20 });
    }),
  ),

  // --- direction lock: the nobles are ROUTED and may only flee homeward -----
  // Not a longer Wasted Hour / pawn-and-king turn: the nobles still move, but
  // a rout runs one way. For 3 of their turns every knight, bishop, rook and
  // queen may only move sideways or back toward its own side, never toward
  // you. Pawns and the king are unaffected.
  H(
    {
      id: "noble_rout",
      name: "Noble Rout",
      description: "The nobles break and run: for your opponent's next 3 turns their knights, bishops, rooks and queen cannot move toward your side of the board. Only their pawns and king may still advance.",
      flavor: "An army can survive a defeat. A rout it must simply outrun.",
      fx: { motif: "anchor", pieces: ["n", "b", "r", "q"] },
    },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "p" ||
          m.piece === "k" ||
          relRank(api.opp, m.to) <= relRank(api.opp, m.from),
      ),
    ),
  ),

  // --- timed filter: no captures with any piece for 3 turns ---------------
  H(
    {
      id: "withered_hands",
      name: "Withered Hands",
      description: "Your opponent cannot capture with any piece for their next 3 turns.",
      flavor: "Every grip in the army has gone to rot.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(3, (moves) => moves.filter((m) => !m.captured)),
  ),
];
