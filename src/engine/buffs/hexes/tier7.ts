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
  hex,
  curse,
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
  inBoard,
} from "./shared";
import type { Mech, Move, BuffApi, Square, PieceType } from "./shared";

const H = tierHexes(7);

// A walnut/freeze added inside onMovePlayed on one of the OPPONENT's moves is
// immediately ticked down once by the central effect clock at the end of that
// same move (walnut/freeze tick on the owner's turns). Adding one extra turn
// keeps a deferred effect's real lifetime equal to the number the card names.
const DEFER_BUMP = 1;

// Classic piece values, only for deterministic "the defender's most valuable
// piece" stand-ins where the cast flow cannot prompt the opponent to choose.
const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The opponent's most valuable non-king piece (by value, then lowest square).
 * A deterministic, desync-safe read of the synced board used wherever a card
 * says "the defender chooses one piece": we cannot pop a UI on the opponent
 * mid-cast, so we pick their strongest piece and say so in the description. */
function mostValuableOppSquare(api: BuffApi): Square | undefined {
  let best: Square | undefined;
  let bestVal = -1;
  for (const sq of mySquares(api.board, api.opp)) {
    const t = api.board.pieces[sq]!.type;
    if (t === "k") continue;
    if (PIECE_VALUE[t] > bestVal) {
      bestVal = PIECE_VALUE[t];
      best = sq;
    }
  }
  return best;
}

/** A timed opponent-move curse whose clock only starts AFTER the opponent has
 * played `delay` of their own moves: the filter lies dormant (pieces move
 * freely) until then, so the curse "activates after their next move" while
 * still running for its full `turns` afterwards. */
function delayedCurse(
  delay: number,
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.delay = delay;
      inst.state.turns = turns;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if ((inst.state.delay as number) > 0) return moves;
      if (turnsLeft(inst) <= 0) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.opp) return;
      if ((inst.state.delay as number) > 0) {
        inst.state.delay = (inst.state.delay as number) - 1;
        return;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      (inst.state.delay as number) > 0
        ? "waiting for their next move"
        : `${turnsLeft(inst)} of their turns left`,
  };
}

type EscapeSpec = { sq: Square; kind: "walnut" | "freeze"; turns: number };

/** Apply a set of walnut/freeze effects to the opponent, but let the FIRST
 * piece in `gather`'s order make one legal move first: its effect is deferred
 * until after the opponent's next move, and it escapes entirely if they move it
 * off its square in the meantime. Every other affected piece is hit at once. */
function withEscape(gather: (api: BuffApi) => EscapeSpec[]): Mech {
  return {
    kind: "passive",
    init: (inst, api) => {
      const specs = gather(api);
      const [first, ...rest] = specs;
      for (const s of rest) {
        addEffect(api, { kind: s.kind, sq: s.sq, owner: api.opp, turns: s.turns });
      }
      if (first) inst.state.pending = first;
      else inst.spent = true;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.opp) return;
      const pending = inst.state.pending as EscapeSpec | undefined;
      if (pending == null) return;
      // The one escape move has now been played. The effect bites only if the
      // piece is still standing on its square (they did not move it to safety).
      const p = api.board.pieces[pending.sq];
      if (p && p.color === api.opp && p.type !== "k") {
        addEffect(api, {
          kind: pending.kind,
          sq: pending.sq,
          owner: api.opp,
          turns: pending.turns + DEFER_BUMP,
        });
      }
      inst.state.pending = undefined;
      inst.spent = true;
    },
    status: (inst) => (inst.state.pending != null ? "one escape move remains" : null),
  };
}

// Permanent walnut: the effect ticks on the victim's turns, so a large count
// outlasts any real game. Obsidian Bastions also re-applies it after every
// NON-capturing shuffle, so a walnutted rook stays petrified until it captures.
const PERMA_WALNUT = 999;

export const HEXES_T7: Buff[] = [
  // --- petrify all: both rooks are permanent walnuts until one captures ------
  // Retiered to 8: the walnut is now permanent (was 4 turns) instead of pairing
  // with a forever no-capture rider. A rook can only shuffle one square, and it
  // breaks its own curse the instant it uses that shuffle to capture.
  hex(
    {
      id: "obsidian_bastions",
      name: "Obsidian Bastions",
      description: "Your opponent's rooks turn to walnuts for the rest of the game, able only to shuffle one square at a time. A rook breaks free the instant it makes a capture.",
      flavor: "The towers cool into black glass; only blood on the stone wakes them.",
      tier: 8,
      fx: { motif: "jail", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        const rooks: Square[] = [];
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "r") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: PERMA_WALNUT });
            rooks.push(sq);
          }
        }
        inst.state.rooks = rooks;
      },
      onMovePlayed: (inst, move, api) => {
        const rooks = (inst.state.rooks as Square[]) ?? [];
        if (move.color === api.opp && rooks.includes(move.from)) {
          const i = rooks.indexOf(move.from);
          rooks.splice(i, 1);
          // A non-capturing shuffle keeps the curse: re-petrify on the new
          // square so the walnut is never pruned off the vacated one. A
          // capturing shuffle breaks it: leave the old walnut to be pruned and
          // do not re-apply, so the rook walks free.
          if (!move.captured) {
            addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: PERMA_WALNUT });
            rooks.push(move.to);
          }
        }
        // A cursed rook captured off the board: stop tracking it.
        if (move.capturedSquare != null) {
          const j = rooks.indexOf(move.capturedSquare);
          if (j >= 0) rooks.splice(j, 1);
        }
        inst.state.rooks = rooks;
      },
      status: (inst) => `${((inst.state.rooks as Square[]) ?? []).length} rooks petrified`,
    },
  ),

  // --- petrify all: the entire minor line (knights and bishops) 3 turns ---
  H(
    {
      id: "statue_garden",
      name: "Statue Garden",
      description: "Your opponent's knights and bishops turn to walnuts for 3 of their turns, shuffling one square at a time. The first one struck petrifies only after your opponent's next move, and escapes if they move it away.",
      tip: "That one grace move is the whole defence: move the first piece the gaze touches.",
      flavor: "Every horse and prelate set among the topiary.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    withEscape((api) =>
      mySquares(api.board, api.opp)
        .filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return t === "n" || t === "b";
        })
        .map((sq) => ({ sq, kind: "walnut", turns: 3 })),
    ),
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
      description: "Every enemy knight and bishop in your half turns to a walnut for 4 of their turns. Minors still in their own half only catch the reflection and are frozen for 1 turn. The first piece the gaze lands on petrifies only after their next move, and escapes if moved.",
      tip: "Keeping their minors at home turns four turns of stone into one turn of ice.",
      flavor: "The ones who crossed the fence met its eyes first.",
      // Board already paints walnuts and freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    withEscape((api) => {
      const specs: EscapeSpec[] = [];
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t !== "n" && t !== "b") continue;
        if (relRank(api.opp, sq) >= 5) specs.push({ sq, kind: "walnut", turns: 4 });
        else specs.push({ sq, kind: "freeze", turns: 1 });
      }
      return specs;
    }),
  ),

  // --- petrify one targeted piece 4 turns AND its two flankers 2 turns -----
  // Preserves the durations but delays the whole activation: the walnuts land
  // only after the opponent's next move, so the target gets one move to react.
  H(
    {
      id: "chisel_curse",
      name: "Chisel Curse",
      description: "After your opponent's next move, turn the enemy piece you targeted into a walnut for 4 of their turns, and the enemy pieces then directly to its left and right into walnuts for 2 of their turns each. Kings are never affected.",
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
      (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.pendingSq = sq;
        inst.state.delay = 1;
      },
      {
        // Lingers after use so the delayed petrify can fire one opponent move
        // later; it never re-activates (targets() returns null once picked).
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (move.color !== api.opp) return;
          if ((inst.state.delay as number) > 0) {
            inst.state.delay = (inst.state.delay as number) - 1;
            if ((inst.state.delay as number) > 0) return;
          } else {
            return;
          }
          const sq = inst.state.pendingSq as Square | undefined;
          if (sq != null) {
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 + DEFER_BUMP });
            }
            for (const df of [-1, 1]) {
              const f = FILE(sq) + df;
              const r = RANK(sq);
              if (!inBoard(f, r)) continue;
              const nsq = SQ(f, r);
              const np = api.board.pieces[nsq];
              if (np && np.color === api.opp && np.type !== "k") {
                addEffect(api, { kind: "walnut", sq: nsq, owner: api.opp, turns: 2 + DEFER_BUMP });
              }
            }
          }
          inst.spent = true;
        },
        status: (inst) =>
          (inst.state.delay as number) > 0 ? "petrifies after their next move" : null,
      },
    ),
  ),

  // --- freeze the whole army 1 turn, then the heavy pieces are walnuts 1 more
  H(
    {
      id: "glacial_tomb",
      name: "Glacial Tomb",
      description: "Freeze all of your opponent's pieces except their king for 1 of their turns. As the ice lifts, only their queen and rooks stay behind as walnuts for 1 more turn, able to shuffle only one square at a time.",
      flavor: "The army sealed in blue ice that hardens to stone as it cracks.",
      // Board already paints freezes and walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "k") continue;
        // Freeze runs first (1 turn); on the queen and rooks a walnut (2) keeps
        // ticking under it, so when the ice lifts exactly 1 turn of walnut
        // shuffle remains for the heavy pieces only.
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
        if (t === "q" || t === "r") {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
        }
      }
    }),
  ),

  // --- freeze one targeted piece AND one enemy piece next to it, 3 each ----
  H(
    {
      id: "frozen_solid",
      name: "Frozen Solid",
      description: "Freeze one enemy piece and one enemy piece next to it for 3 of their turns each. Kings cannot be chosen. The piece you target freezes only after your opponent's next move, and escapes if they move it away.",
      tip: "Target something they cannot afford to move, or the freeze slips off.",
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
      (inst, api, picks) => {
        // The adjacent piece is frozen at once; the targeted piece gets one
        // legal escape move, so its freeze is deferred one opponent move.
        const adj = picks[1]?.square;
        if (adj != null) {
          addEffect(api, { kind: "freeze", sq: adj, owner: api.opp, turns: 3 });
        }
        const target = picks[0]?.square;
        if (target != null) inst.state.pending = { sq: target, kind: "freeze", turns: 3 };
      },
      {
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (move.color !== api.opp) return;
          const pending = inst.state.pending as EscapeSpec | undefined;
          if (pending == null) return;
          const p = api.board.pieces[pending.sq];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, {
              kind: pending.kind,
              sq: pending.sq,
              owner: api.opp,
              turns: pending.turns + DEFER_BUMP,
            });
          }
          inst.state.pending = undefined;
          inst.spent = true;
        },
        status: (inst) => (inst.state.pending != null ? "one escape move remains" : null),
      },
    ),
  ),

  // --- king_only 1 turn (plus one chosen piece) AND block their next draft --
  H(
    {
      id: "throne_and_silence",
      name: "Throne and Silence",
      description: "For your opponent's next turn they may move only their king or their single most valuable piece, and their next draft is skipped entirely.",
      flavor: "The whole court scatters and the messengers with it.",
      // fx covers the movement lock (board paints it too); the draft denial
      // half shows no board motif.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
        inst.state.turns = 1;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0) return moves;
        // The defender's one non-king mover is their strongest piece (a
        // deterministic stand-in for their choice, since no UI can prompt them).
        const champ = mostValuableOppSquare(api);
        const kept = moves.filter((m) => m.piece === "k" || m.from === champ);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- pawn advance lock for four turns, then it lifts ----------------------
  // Retuned off the old permanent lock: the pawns can never advance FOR FOUR
  // TURNS (they may still capture diagonally), then the salt lifts and pawns
  // march normally again. The old bar on their own 4th rank is dropped.
  H(
    {
      id: "salted_earth",
      name: "Salted Earth",
      description: "For your opponent's next 4 turns their pawns cannot advance; they may still capture diagonally. After that the salt lifts and their pawns advance normally again.",
      flavor: "Salt in the furrows: nothing marches forward until the season turns.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    curse(4, (moves) =>
      // A straight pawn advance keeps the same file; a diagonal capture changes
      // it, so captures (including en passant) are untouched.
      moves.filter((m) => !(m.piece === "p" && FILE(m.from) === FILE(m.to))),
    ),
  ),

  // --- deterrent: their next two capturing pieces burn up with their prey ---
  H(
    {
      // Not a second Scorched Middle (that BARS ranks 4-5): a capture
      // deterrent. Removal inside onMovePlayed mirrors the proven hook
      // patterns (Voodoo Doll / The Culling) and uses no rng at all.
      id: "molten_heart",
      name: "Molten Heart",
      description: "Their blades run molten: for your opponent's next 2 captures, the capturing piece is destroyed along with its victim. Their single most valuable piece is exempt and captures freely, and kings burn nothing and are never destroyed.",
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
        // The defender's most valuable piece (their champion) captures freely:
        // if it is the piece that just captured, it survives and no charge is
        // spent. This is the deterministic stand-in for "one chosen piece".
        if (move.to === mostValuableOppSquare(api)) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
        const p = api.board.pieces[move.to];
        if (p && p.color === api.opp && p.type !== "k") api.removePiece(move.to);
      },
      status: (inst) => `${(inst.state.charges as number) ?? 2} captures left`,
    },
  ),

  // --- draft denial: the next draft is sealed away outright -----------------
  // Retiered to 8 and shortened by one: the archive still seals the very next
  // draft, but no longer degrades the draft after it to tier 1.
  hex(
    {
      id: "sealed_archive",
      name: "Sealed Archive",
      description: "Your opponent's next draft is skipped entirely.",
      flavor: "The vault is bricked over, and the next draft is lost to the dark.",
      tier: 8,
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // --- combo: skip one turn and burn their clock ---------------------------
  // Retiered to 8, and the draft-denial rider is removed: the lock (a lost
  // turn) and the clock strike remain.
  hex(
    {
      id: "lost_fortnight",
      name: "Lost Fortnight",
      description: "Your opponent skips their next turn, and 20 seconds are struck off their clock.",
      flavor: "Two weeks torn from the ledger: a move and time both gone at once.",
      tier: 8,
      // fx covers the turn skip; the clock half shows no board motif.
      fx: { motif: "slow", pieces: "all" },
    },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      api.adjustClock({ subOppSec: 20 });
    }),
  ),

  // --- direction lock: the nobles are ROUTED and may only flee homeward -----
  // Preserves the 3-turn rout but delays it one opponent move: the rout only
  // sets in after their next move.
  H(
    {
      id: "noble_rout",
      name: "Noble Rout",
      description: "After your opponent's next move, the nobles break and run: for their following 3 turns their knights, bishops, rooks and queen cannot move toward your side of the board. Only their pawns and king may still advance.",
      flavor: "An army can survive a defeat. A rout it must simply outrun.",
      fx: { motif: "anchor", pieces: ["n", "b", "r", "q"] },
    },
    delayedCurse(1, 3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "p" ||
          m.piece === "k" ||
          relRank(api.opp, m.to) <= relRank(api.opp, m.from),
      ),
    ),
  ),

  // --- timed filter: no captures with any piece for 3 turns ---------------
  // Preserves the 3-turn no-capture window but delays it one opponent move.
  H(
    {
      id: "withered_hands",
      name: "Withered Hands",
      description: "After your opponent's next move, they cannot capture with any piece for their following 3 turns.",
      flavor: "Every grip in the army has gone to rot.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    delayedCurse(1, 3, (moves) => moves.filter((m) => !m.captured)),
  ),
];
