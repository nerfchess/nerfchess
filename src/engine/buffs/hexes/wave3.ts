// Hex wave 3 - the 2026-07 content expansion's hex batch (~40 new curses).
// Every id is prefixed hw3_. Hexes here are curse-structured, biased hard
// toward the families the 207-hex pool still lacks (piece possession/turncoat,
// summoned roaming hazards, mirrored/sympathetic effects, marked-piece
// contracts, capture-conditioned triggers, check/king-movement contracts,
// stacking/chained curses, contagion, temporary rule distortion, promotion/
// tempo taxes) and AWAY from the saturated piles (petrify/stone 25, freeze/ice
// 17 as an IDENTITY, static barred zones 23, queen leashes 19, draft denial 9).
// Freeze/walnut appear only as PUNISHMENT COMPONENTS inside novel structures
// (exactly as wave2's Witching Hour / Queen's Ransom / Twinned Torment do),
// never as a new "freeze the army" identity card.
//
// Authoring rules observed throughout (same as tier1-8 and wave2):
//   - every opponent-move filter keeps a non-empty fallback (never soft-locks);
//   - kings are never frozen, walnutted, removed, possessed, or transformed;
//   - api.rng is drawn ONLY inside init / effect / onMovePlayed (replayed
//     paths), never in targets() or status();
//   - effects added DURING the victim's own move are ticked once by the shared
//     post-move pass, so they are written with turns = N + 1 to bite for N;
//   - each card's mechanic is unique against the full pool; the closest
//     neighbors are named in a "vs:" comment above every card.
//
// Concatenated into NEW_HEXES by ./index.ts. Animation flagships (one flourish
// per T1-T6 card, bespoke scenes for T7-T8) live in cursePlays.tsx; the
// per-card suggestions are in docs/2026-07-17-hex-wave3-design.md.

import type { Buff, BuffApi, BuffInstance, Move, PieceType, Square } from "./shared";
import {
  addEffect,
  curse,
  emptySquares,
  hex,
  isInCheck,
  mySquares,
  relRank,
  tickTurns,
  tierHexes,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H1 = tierHexes(1);
const H2 = tierHexes(2);
const H3 = tierHexes(3);
const H4 = tierHexes(4);
const H5 = tierHexes(5);
const H6 = tierHexes(6);
const H7 = tierHexes(7);
const H8 = tierHexes(8);

// ---------------------------------------------------------------------------
// Local helpers (mirrors of wave2's; hexes/shared does not re-export them).
// ---------------------------------------------------------------------------

/** Chebyshev (king-step) distance. */
const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

const sqName = (sq: Square) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;

/** Square color parity (light vs dark). */
const sqColor = (sq: Square) => (FILE(sq) + RANK(sq)) & 1;

/** Follow a single tracked square across a move; null when its piece is gone. */
function followSq(sq: Square | null, move: Move): Square | null {
  if (sq == null) return null;
  if (move.capturedSquare === sq && move.from !== sq) return null;
  if (move.from === sq && move.to !== sq) return move.to;
  if (move.to === sq && move.from !== sq) return null;
  return sq;
}

/** Nearest victim (api.opp) non-king piece to `from`, deterministic tie-break
 * by lowest square index. `exclude` skips one square. */
function nearestVictimPiece(api: BuffApi, from: Square, exclude?: Square): Square | null {
  let best: Square | null = null;
  let bd = Infinity;
  for (const sq of mySquares(api.board, api.opp)) {
    if (sq === exclude || api.board.pieces[sq]!.type === "k") continue;
    const d = cheb(from, sq);
    if (d < bd || (d === bd && best != null && sq < best)) {
      bd = d;
      best = sq;
    }
  }
  return best;
}

/** One king-step from `from` toward `to`. */
function stepToward(from: Square, to: Square): Square {
  const df = Math.sign(FILE(to) - FILE(from));
  const dr = Math.sign(RANK(to) - RANK(from));
  return SQ(FILE(from) + df, RANK(from) + dr);
}

/** Piece rough value, for "strongest piece" picks. */
const VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 4, q: 5, k: 100 };
/** Aging ladder: a captured piece slides one rung down, floor at knight. */
const DEMOTE: Partial<Record<PieceType, PieceType>> = { q: "r", r: "b", b: "n" };

/** The victim's king square, or null. */
function victimKing(api: BuffApi): Square | null {
  for (const sq of mySquares(api.board, api.opp)) {
    if (api.board.pieces[sq]!.type === "k") return sq;
  }
  return null;
}

// A possessed piece is one the caster has flipped to their own color for a set
// number of the CASTER'S turns. tickDefect follows it and reverts it when the
// loan runs out; returns "ended" the moment the piece is captured or reverts.
function tickDefect(inst: BuffInstance, move: Move, api: BuffApi): "active" | "ended" {
  const sq = inst.state.sq as Square | undefined;
  if (sq == null) return "ended";
  const next = followSq(sq, move);
  if (next == null) return "ended"; // the loaned piece was captured
  inst.state.sq = next;
  if (move.color === api.me) {
    const left = ((inst.state.myTurns as number) ?? 0) - 1;
    inst.state.myTurns = left;
    if (left <= 0) {
      const cur = inst.state.sq as Square;
      const p = api.board.pieces[cur];
      if (p && p.color === api.me && p.type !== "k") api.setPieceColor(cur, api.opp);
      return "ended";
    }
  }
  return "active";
}

/** Count the curse-effects already weighing on the victim (mirrors Compounding
 * Misery's synced read; deterministic). */
function activeCurseCount(api: BuffApi): number {
  let count = 0;
  for (const e of api.bs.effects) {
    if (!(e.turns == null || e.turns > 0)) continue;
    if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.opp) count++;
    else if (e.kind === "short_leash" && e.owner === api.opp) count++;
    else if (
      (e.kind === "barred" || e.kind === "king_only" || e.kind === "no_pawn_advance") &&
      e.against === api.opp
    )
      count++;
  }
  return count;
}

// ===========================================================================
// BATCH 1 (T1-T4): the readable band - rule distortions, small taxes, marks,
// contracts, the first turncoats and hazards.
// ===========================================================================

// ------------------------------- TIER 1 ------------------------------------

const T1: Buff[] = [
  // vs: No Reins (slider momentum), Tolling Bell (alternating slider lock).
  // Neither constrains the SQUARE COLOR of destinations. A geometry distortion.
  hex(
    {
      tier: 2,
      id: "hw3_wrong_foot",
      name: "Wrong Foot",
      description:
        "Their dance is thrown off: for your opponent's next 4 turns, each piece they move must land on a square of the opposite color to wherever they landed last turn (light, then dark, then light). Their king is exempt, and if no legal move fits the pattern they may move freely that turn. Plan the sequence and it costs nothing.",
      flavor: "Left foot, right foot, and never the two in a row.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      let lastTo: Square | null = null;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          lastTo = hist[i].to;
          break;
        }
      }
      if (lastTo == null) return moves; // their first step is free
      const want = 1 - sqColor(lastTo);
      return moves.filter((m) => m.piece === "k" || sqColor(m.to) === want);
    }),
  ),

  // vs: The Long Road Home (one MARKED piece must retreat). This forbids the
  // WHOLE army from retreating - an army-wide forward-only rule, no mark.
  H1(
    {
      id: "hw3_no_retreat",
      name: "No Retreat",
      description:
        "A banner of no surrender is nailed up: for your opponent's next 4 turns, none of their pieces may move toward their own back rank (no retreating or sidestepping backward). They may advance or move straight across; the king is exempt, and a piece with no forward move is freed for that turn. Wait it out, or press forward on the curse's own terms.",
      flavor: "The bridge behind them is already burning.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece === "k" || relRank(api.opp, m.to) >= relRank(api.opp, m.from),
      ),
    ),
  ),

  // vs: Weight of Toil (3rd MOVE of a piece across a window collapses it). This
  // punishes moving the SAME piece on two CONSECUTIVE turns, and only stuns 1.
  H1(
    {
      id: "hw3_overexertion",
      name: "Overexertion",
      description:
        "The curse hates a workhorse, but bides its time: it takes hold only after your opponent's next move, and then for their next 5 turns, whenever they move the same piece they moved on their previous turn, it seizes up and is frozen for 1 of their turns. Simply alternating which piece they develop avoids it completely. Kings never seize.",
      flavor: "One more errand, it sighed, and sat straight down.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
        inst.state.last = null;
        inst.state.started = false;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && !inst.state.started) {
          inst.state.started = true; // activation waits until after their next move
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.from !== move.to) {
          const last = inst.state.last as Square | null | undefined;
          if (last != null && move.from === last && move.piece !== "k") {
            // Added during their own move: 2 leaves exactly 1 of their turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2, skin: "glue" });
            inst.state.last = null;
          } else {
            inst.state.last = move.to;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: The Hollow Crown (king-move taxes the NEXT turn to pawn/king). This
  // taxes CROSSING the midline into your half - a toll on invasion, timed.
  hex(
    {
      tier: 2,
      id: "hw3_toll_road",
      name: "Toll Road",
      description:
        "A toll is set on the border: for your opponent's next 6 turns, any turn they move a piece out of their own half and into yours, their following turn is taxed - they may move only a pawn or their king. Developing at home is free; invading costs a beat of tempo. Kings crossing pay the same toll.",
      flavor: "Cross the river and the ferryman wants his coin.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.tax = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.tax as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const crossed = relRank(api.opp, move.from) <= 4 && relRank(api.opp, move.to) >= 5;
          if (crossed) inst.state.tax = 1;
          else if (((inst.state.tax as number) ?? 0) > 0) inst.state.tax = 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        ((inst.state.tax as number) ?? 0) > 0
          ? "the border toll falls due next turn"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

// ------------------------------- TIER 2 ------------------------------------

const T2: Buff[] = [
  // vs: wa_dominate_minor "Dominate" (instant control of a MINOR). This loans a
  // single PAWN, at a low tier, and reverts on its own - a spy in the ranks.
  H2(
    {
      id: "hw3_fifth_column",
      name: "Fifth Column",
      description:
        "Turn one enemy pawn to your cause: it fights under your banner for your next 3 turns, then its conscience returns and it goes back to your opponent. You move it on your turns; if it is captured while it serves you, the plot simply ends. Kings and other pieces are beyond the recruiter's reach.",
      flavor: "Every camp has one soul already halfway out the gate.",
      fx: { motif: "jail", pieces: ["p"] },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy pawn to recruit",
              squares: mySquares(api.board, api.opp, "p"),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.setPieceColor(sq, api.me);
        inst.state.sq = sq;
        inst.state.myTurns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.sq == null) return;
        if (tickDefect(inst, move, api) === "ended") inst.spent = true;
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to recruit a pawn"
          : `serving from ${sqName(sq)}, ${(inst.state.myTurns as number) ?? 0} of your turns left`;
      },
    },
  ),

  // vs: Twinned Torment (moving one twin freezes the other). This is a mutual
  // MUZZLE: while both live neither may capture; trading one frees the other.
  H2(
    {
      id: "hw3_binding_oath",
      name: "Binding Oath",
      description:
        "Swear two enemy pieces to a pact of restraint: for your opponent's next 6 turns, so long as both still stand, neither of the pair may capture anything, save that the first of the two to strike is allowed one capture before the pact takes hold. The oath breaks the instant one of them leaves the board, freeing the survivor. They can trade one away to release the other, or simply attack with their other pieces. Kings cannot be sworn.",
      flavor: "Two blades crossed and bound: draw one and both must still.",
      fx: { motif: "muzzle" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.a != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Choose the first piece to bind" : "Choose its partner",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.a != null) return;
        const a = picks[0]?.square;
        const b = picks[1]?.square;
        if (a == null || b == null) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.turns = 6;
        inst.state.escaped = false;
      },
      filterOpponentMoves: (moves, inst) => {
        const a = inst.state.a as Square | undefined;
        const b = inst.state.b as Square | undefined;
        if (a == null || b == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        if (!inst.state.escaped) return moves; // the first of the pair keeps one free capture
        const kept = moves.filter((m) => !m.captured || (m.from !== a && m.from !== b));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const a0 = (inst.state.a as Square | null | undefined) ?? null;
        const b0 = (inst.state.b as Square | null | undefined) ?? null;
        if (
          !inst.state.escaped &&
          move.color === api.opp &&
          move.captured &&
          (move.from === a0 || move.from === b0)
        ) {
          inst.state.escaped = true; // the first affected piece spent its one escape capture
        }
        const a = followSq(a0, move);
        const b = followSq(b0, move);
        inst.state.a = a;
        inst.state.b = b;
        if (a == null || b == null) {
          inst.spent = true; // one left the board: the oath is broken
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const a = inst.state.a as Square | undefined;
        const b = inst.state.b as Square | undefined;
        return a == null || b == null
          ? "activate to bind two pieces"
          : `${sqName(a)} & ${sqName(b)} sworn, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Death Knell (doomed piece REMOVED unless it captures) and Pauper's
  // Crown (queen->rook). This POISONS a Q/R/B to wither one rung DOWN on a
  // 4-turn fuse unless it draws blood - a demote timer with a capture cure.
  hex(
    {
      tier: 3,
      id: "hw3_slow_poison",
      name: "Slow Poison",
      description:
        "Slip poison into one enemy queen, rook or bishop. In 4 of their turns it withers a full rank: a queen sinks to a rook, a rook to a bishop, a bishop to a knight. One dose of blood is the antidote: if the poisoned piece captures anything before then, the poison is purged. They see the fuse the whole time - feed it a capture, trade the piece off, or let it wither.",
      flavor: "It felt fine at first. That is the whole trick of it.",
      fx: { motif: "slow", pieces: ["q", "r", "b"] },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy queen, rook or bishop to poison",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "q" || t === "r" || t === "b";
              }),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return;
        const into = DEMOTE[p.type];
        if (!into) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 4, then: "demote", into });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true; // traded off: the engine prunes the timer for us
          return;
        }
        if (move.color === api.opp && move.from === sq) {
          if (move.captured) {
            const idx = api.bs.effects.findIndex(
              (e) =>
                e.kind === "timed_loss" &&
                e.then === "demote" &&
                e.owner === api.opp &&
                (e.sq === move.from || e.sq === move.to),
            );
            if (idx >= 0) api.bs.effects.splice(idx, 1);
            inst.spent = true; // blood purges the poison
            return;
          }
          inst.state.sq = move.to;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to poison a piece"
          : `${sqName(sq)} withers in ${turnsLeft(inst)} of their turns - a capture cures it`;
      },
    },
  ),

  // vs: Palsied Hands (no two captures in a row) and War Rations (a 2-capture
  // budget). This is a COMPULSION: a piece that captures must strike AGAIN next
  // turn if it can, punishing greedy overreach rather than limiting it.
  H2(
    {
      id: "hw3_bloodlust",
      name: "Bloodlust",
      description:
        "A taste for blood takes hold: for your opponent's next 3 turns, any piece that captures is seized by frenzy and, on their very next turn, must capture again if any capture is open to it. If that piece has no capture available, the frenzy passes and they move freely. Capturing with a piece that cannot follow up, or not capturing at all, keeps them in control.",
      flavor: "The first kill is a choice. The second is an appetite.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.rage = null;
      },
      filterOpponentMoves: (moves, inst) => {
        const rage = inst.state.rage as Square | null | undefined;
        if (rage == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const caps = moves.filter((m) => m.from === rage && m.captured);
        return caps.length > 0 ? caps : moves; // no follow-up: frenzy lifts
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) {
          inst.state.rage = turnsLeft(inst) > 0 && move.captured ? move.to : null;
          tickTurns(inst, move, api.opp);
        }
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Hot Potato (compulsion to move a fixed piece) and Cursed Coin (coin
  // DESTROYED when you capture the holder). This mark SURVIVES trading: capture
  // the bearer and the curse HOPS to its nearest comrade. Isolate, then trade.
  H2(
    {
      id: "hw3_curse_hop",
      name: "Handed Down",
      description:
        "A clinging curse settles on one enemy piece: for your opponent's next 5 turns the bearer is hobbled and may move at most 2 squares at a time. Trading it away does not end the curse - the moment you capture the bearer, the curse leaps to whichever of their pieces is nearest. To be rid of it they must strand the bearer far from the rest of the army, then let it die alone. Kings never take it.",
      flavor: "Nobody wanted it. Everybody passed it along.",
      fx: { motif: "anchor" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece cursed to carry it",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.from !== sq || cheb(m.from, m.to) <= 2);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        // Captured by me? The curse hops rather than dying.
        if (move.capturedSquare === sq && move.from !== sq) {
          const next = nearestVictimPiece(api, sq);
          if (next == null) {
            inst.spent = true; // died alone: nowhere to jump
            return;
          }
          inst.state.sq = next;
          return;
        }
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to lay the curse"
          : `carried at ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),
];

// ------------------------------- TIER 3 ------------------------------------

const T3: Buff[] = [
  // vs: Creeping Blight (a zone that GROWS) and Tide of Ash (an advancing wall).
  // This summons a single roaming picket that PATROLS one rank, sliding one
  // file per turn and bouncing at the edges - a moving obstacle, not a spread.
  H3(
    {
      id: "hw3_wandering_sentry",
      name: "Wandering Sentry",
      description:
        "Conjure a spectral sentry that paces a rank in your opponent's half: the square it stands on is barred to their pieces, and every turn it steps one file across, turning back when it reaches the edge. It patrols for 4 of their turns, then dissolves. Its beat is fixed and fully visible - time your moves through the gap behind it.",
      flavor: "Back and forth, back and forth, and it never once blinks.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "instant",
      init: (inst, api) => {
        // Pick a starting square on a rank inside the victim's half.
        const cands = emptySquares(api.board, (sq) => relRank(api.opp, sq) === 3);
        if (cands.length === 0) {
          inst.spent = true;
          return;
        }
        const sq = cands[0];
        inst.state.sq = sq;
        inst.state.dir = 1;
        inst.state.turns = 4;
        // Added on my turn: 1 covers exactly the victim's next turn. Only the
        // current square is ever barred, so the sentry stays a single tile.
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 1 });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          let dir = (inst.state.dir as number) ?? 1;
          let f = FILE(sq) + dir;
          if (f < 0 || f > 7) {
            dir = -dir;
            f = FILE(sq) + dir;
          }
          const next = SQ(f, RANK(sq));
          inst.state.sq = next;
          inst.state.dir = dir;
          // Added during their move (ticked once immediately): 2 bars the new
          // square for their next turn only, so no trail is left behind.
          addEffect(api, { kind: "barred", squares: [next], against: api.opp, turns: 2 });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "dissolved" : `patrolling ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Twinned Torment (move one, freeze the twin). Here the trigger is a
  // CAPTURE, not a move: the pair may shuffle freely, but the instant one draws
  // blood the other seizes. Sympathetic backlash keyed on fighting.
  H3(
    {
      id: "hw3_bloodbond",
      name: "Blood Bond",
      description:
        "Bind two enemy pieces in a bond of shared pain: for your opponent's next 6 turns, whenever one of the pair captures anything, the other is frozen for 2 of their turns, though the very first capture by either is free and spares its partner. They may march the pair around all they like; only fighting with one punishes the other. Trade either away and the bond is cut. Kings cannot be bound.",
      flavor: "Strike with the left hand and the right hand bleeds.",
      fx: { motif: "slow" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.a != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Choose the first piece" : "Choose its blood-partner",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.a != null) return;
        const a = picks[0]?.square;
        const b = picks[1]?.square;
        if (a == null || b == null) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.turns = 6;
        inst.state.escaped = false;
      },
      onMovePlayed: (inst, move, api) => {
        let a = (inst.state.a as Square | null | undefined) ?? null;
        let b = (inst.state.b as Square | null | undefined) ?? null;
        if (a == null || b == null) return;
        const capA = move.from === a && move.captured;
        const capB = move.from === b && move.captured;
        a = followSq(a, move);
        b = followSq(b, move);
        inst.state.a = a;
        inst.state.b = b;
        if (a == null || b == null) {
          inst.spent = true; // one traded off: the bond breaks
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) > 0 && (capA || capB)) {
          if (!inst.state.escaped) {
            inst.state.escaped = true; // the first strike by either is free
          } else {
            const twin = capA ? b : a;
            const p = api.board.pieces[twin];
            if (p && p.color === api.opp && p.type !== "k") {
              // Added during their own move: 3 leaves exactly 2 of their turns.
              addEffect(api, { kind: "freeze", sq: twin, owner: api.opp, turns: 3, skin: "web" });
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const a = inst.state.a as Square | undefined;
        const b = inst.state.b as Square | undefined;
        return a == null || b == null
          ? "activate to bind two pieces"
          : `bonded ${sqName(a)} & ${sqName(b)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: The Long Road Home (a piece must retreat to its OWN back rank). This is
  // the mirror: the marked piece is EXILED and must press into YOUR half, which
  // is dangerous obedience; standing in your half lifts it, else it crumbles.
  H3(
    {
      id: "hw3_exiles_mark",
      name: "Exile's Mark",
      description:
        "Brand one enemy knight, bishop or rook as an exile: every move it makes must carry it closer to your side of the board, and if it has not set foot in your half within 5 of their turns, it crumbles to dust. The mark lifts the instant it stands in your half. They can march it forward into danger, trade it away, or spend the other pieces while it withers. Kings are never exiled.",
      flavor: "Cross the line or be scattered to the wind. Those are the terms.",
      fx: { motif: "anchor" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to exile",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 5, then: "remove" });
      },
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) => m.from !== sq || relRank(api.opp, m.to) > relRank(api.opp, m.from),
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true; // traded off; engine prunes the timer
          return;
        }
        if (move.color === api.opp && move.from === sq) {
          if (relRank(api.opp, move.to) >= 5) {
            // Reached your half: the exile is served, cancel the doom.
            const idx = api.bs.effects.findIndex(
              (e) =>
                e.kind === "timed_loss" &&
                e.then === "remove" &&
                e.owner === api.opp &&
                (e.sq === move.from || e.sq === move.to),
            );
            if (idx >= 0) api.bs.effects.splice(idx, 1);
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to exile a piece"
          : `${sqName(sq)} exiled, crumbles in ${turnsLeft(inst)} of their turns`;
      },
    },
  ),

  // vs: Weight of Toil / Gilded Rot (punish USING pieces). This punishes
  // NEGLECT: a marked piece runs up a "debt" every turn it is left idle, and
  // collects it as a freeze the moment it finally moves. Move it often (cheap)
  // or bench it forever (a dead piece).
  hex(
    {
      tier: 4,
      id: "hw3_debtors_mark",
      name: "Debtor's Mark",
      description:
        "Mark one enemy piece as a debtor: for your opponent's next 6 turns, every turn they leave it standing idle it runs up one turn of debt (up to 4). The instant they finally move it, the debt comes due and it is frozen for that many of their turns, then the slate is cleared. Moving it every turn keeps the debt at zero; leaving it parked forever costs nothing but a dead piece. Kings keep no debts.",
      flavor: "Interest never sleeps, even when the debtor does.",
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
              label: "Choose the enemy piece to indebt",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
        inst.state.debt = 0;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const debt = (inst.state.debt as number) ?? 0;
          if (move.from === sq && move.to !== sq) {
            if (debt > 0 && move.piece !== "k") {
              // Added during their own move: debt + 1 leaves exactly `debt`.
              addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: debt + 1, skin: "cement" });
            }
            inst.state.debt = 0;
          } else {
            inst.state.debt = Math.min(4, debt + 1);
          }
        }
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to mark a debtor"
          : `${sqName(sq)} owes ${(inst.state.debt as number) ?? 0}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: The Hollow Crown (king MOVE tax) and Crown of Thorns (check root). This
  // punishes CASTLING specifically, on a delayed fuse: the tower jams two turns
  // after the castle. Attack elsewhere and it never fires.
  H3(
    {
      id: "hw3_jammed_castle",
      name: "Jammed Portcullis",
      description:
        "A hex sits over their castle gate for the next 10 of their turns: if your opponent castles, the portcullis jams behind them. Two of their turns later the portcullis begins to fall: the rook that castled may make one last move to relocate, then it grinds to a halt and is frozen for 3 of their turns. It is a delayed, fully visible price on castling; if they never castle, or accept a stranded rook, the curse simply idles. Kings are never frozen.",
      flavor: "The gate came down a heartbeat after the king was through.",
      fx: { motif: "slow", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 10;
        inst.state.rook = null;
        inst.state.delay = 0;
        inst.state.escape = false;
      },
      onMovePlayed: (inst, move, api) => {
        // Arm on a castle.
        if (move.color === api.opp && move.castle && (inst.state.rook as Square | null) == null) {
          const rank = RANK(move.to);
          const rookSq = FILE(move.to) === 6 ? SQ(5, rank) : SQ(3, rank);
          inst.state.rook = rookSq;
          inst.state.delay = 2;
        }
        // Follow the pending rook and count the fuse down.
        let rook = (inst.state.rook as Square | null | undefined) ?? null;
        if (rook != null) {
          if (!(move.color === api.opp && move.castle && move.to !== rook)) {
            rook = followSq(rook, move);
          }
          inst.state.rook = rook;
          if (rook == null) {
            inst.state.delay = 0;
          } else if (move.color === api.opp && (inst.state.delay as number) > 0) {
            const d = (inst.state.delay as number) - 1;
            inst.state.delay = d;
            if (d <= 0) {
              const p = api.board.pieces[rook];
              if (p && p.color === api.opp && p.type === "r") {
                addEffect(api, { kind: "freeze", sq: rook, owner: api.opp, turns: 3, skin: "rust" });
              }
              inst.spent = true;
              return;
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        (inst.state.rook as Square | null) != null
          ? `portcullis jams in ${(inst.state.delay as number) ?? 0} of their turns`
          : `watching the gate, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Tarnished Crown (freezes the PROMOTED piece itself). This taxes the
  // COURT instead: a coronation freezes a DIFFERENT one of their pieces.
  hex(
    {
      tier: 4,
      id: "hw3_coronation_tax",
      name: "Coronation Tax",
      description:
        "Their crownings come with a hidden levy: for your opponent's next 6 turns, each time they promote a pawn, one of their other pieces (chosen by the curse) is called to the ceremony and frozen for 2 of their turns. The new-crowned piece is untouched; the cost is paid elsewhere in the army. Delay the promotion, or pay the levy knowingly. Kings never attend.",
      flavor: "Every coronation is funded by a tax nobody voted for.",
      fx: { motif: "slow", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.promotion) {
          const pool = mySquares(api.board, api.opp).filter(
            (sq) => sq !== move.to && api.board.pieces[sq]!.type !== "k",
          );
          if (pool.length > 0) {
            const sq = pool[api.rng.int(pool.length)];
            // Added during their own move: 3 leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "petal" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

// ------------------------------- TIER 4 ------------------------------------

const T4: Buff[] = [
  // vs: wa_dominate_minor "Dominate" (you CHOOSE and instantly seize a minor).
  // This is a CURSE that lies in wait: the next enemy KNIGHT to capture defects
  // on the spot. Their own aggression triggers it; keep knights home to avoid.
  H4(
    {
      id: "hw3_mutiny",
      name: "Mutiny",
      description:
        "Sow mutiny in the cavalry: it takes hold only after your opponent's next move, and then for their next 6 turns, the first time one of their knights captures a piece, it turns its coat on the spot and fights for you for your next 3 turns, then rides back to them. They can deny it by capturing with anything but a knight, or by keeping their knights out of the fray. If it is captured while it serves you, the mutiny simply ends.",
      flavor: "A knight that will kill for pay will kill for a better offer.",
      fx: { motif: "jail", pieces: ["n"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.armed = false;
        inst.state.started = false;
        inst.state.sq = null;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.armed) {
          if (tickDefect(inst, move, api) === "ended") inst.spent = true;
          return;
        }
        if (move.color === api.opp && !inst.state.started) {
          inst.state.started = true; // the mutiny takes hold only after their next move
          return;
        }
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.piece === "n" &&
          move.captured
        ) {
          api.setPieceColor(move.to, api.me);
          inst.state.armed = true;
          inst.state.sq = move.to;
          inst.state.myTurns = 3;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.armed
          ? `mutineer serving, ${(inst.state.myTurns as number) ?? 0} of your turns left`
          : `waiting for a knight to strike, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Creeping Blight (a zone that GROWS). This summoned hazard is the inverse
  // and is placed as a plus-shaped mire that SHRINKS one square a turn until it
  // dries up - a fading obstacle, not a spreading one.
  H4(
    {
      id: "hw3_sinking_mire",
      name: "Sinking Mire",
      description:
        "Conjure a sucking mire in your opponent's half: a cross of five squares no enemy piece may step onto (pieces caught inside may still climb out). Unlike a spreading rot the mire drains away, losing one arm of the cross on each of their turns until nothing is left, over 5 of their turns. Route around the puddle and wait it out, or fight past its edge.",
      flavor: "Give it a week and it is just a damp patch and a smell.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "instant",
      init: (inst, api) => {
        const centers = emptySquares(api.board, (sq) => relRank(api.opp, sq) === 3 && FILE(sq) >= 1 && FILE(sq) <= 6);
        if (centers.length === 0) {
          inst.spent = true;
          return;
        }
        const c = centers[Math.floor(centers.length / 2)];
        const ring: Square[] = [c];
        for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const f = FILE(c) + df;
          const r = RANK(c) + dr;
          if (inBoard(f, r) && relRank(api.opp, SQ(f, r)) <= 4) ring.push(SQ(f, r));
        }
        inst.state.squares = ring;
        inst.state.turns = 5;
        // Added on my turn: 1 covers the victim's next turn; re-added each turn
        // from the SHRUNK list so the mire genuinely drains rather than lingering.
        addEffect(api, { kind: "barred", squares: ring.slice(), against: api.opp, turns: 1 });
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          squares.pop(); // drain one arm of the cross
          inst.state.squares = squares;
          if (squares.length > 0) {
            addEffect(api, { kind: "barred", squares: squares.slice(), against: api.opp, turns: 2 });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        return !squares?.length ? "dried up" : `${squares.length} squares of mire, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Beacon of Woe (freeze fuse on YOUR piece) and Death Knell (remove one
  // marked piece). This plants a fused BOMB on an empty square that detonates a
  // small blast of REMOVAL; clear the neighborhood before the count runs out.
  H4(
    {
      id: "hw3_time_bomb",
      name: "Powder Keg",
      description:
        "Roll a powder keg onto an empty square in your opponent's half with a lit 4-turn fuse, in full view. When the fuse burns out, it detonates: every enemy piece (except the king) standing on or next to that square is blown off the board. The count is on the card the whole time - clear their pieces out of the blast before it goes, or lose whatever lingers.",
      flavor: "Plenty of time to move. That is what everyone says.",
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
              label: "Choose where the keg rests",
              squares: emptySquares(api.board, (sq) => relRank(api.opp, sq) <= 4),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        if (move.color === api.opp) {
          if (turnsLeft(inst) === 1) {
            // Detonation: clear enemy non-kings on and around the keg.
            for (let df = -1; df <= 1; df++) {
              for (let dr = -1; dr <= 1; dr++) {
                const f = FILE(sq) + df;
                const r = RANK(sq) + dr;
                if (!inBoard(f, r)) continue;
                const t = SQ(f, r);
                const p = api.board.pieces[t];
                if (p && p.color === api.opp && p.type !== "k") api.removePiece(t);
              }
            }
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "activate to place the keg" : `${sqName(sq)} blows in ${turnsLeft(inst)} of their turns`;
      },
    },
  ),

  // vs: The Long Road Home (must reach OWN back rank, any square). This is a
  // PILGRIMAGE to one SPECIFIC square: reach it to cure, or the piece freezes.
  H4(
    {
      id: "hw3_pilgrimage",
      name: "Forced Pilgrimage",
      description:
        "Lay a geas on one enemy piece and name a shrine square it must reach: if that piece stands on the shrine within 6 of their turns, the geas lifts. If the deadline passes and it has not, the piece collapses in exhaustion and is frozen for 3 of their turns. Its other pieces are free; the victim can walk the pilgrim to the shrine, trade it, or let it fall. Kings take no geas.",
      flavor: "Reach the shrine or sleep where you stand. Choose.",
      fx: { motif: "anchor" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (picks.length >= 2 || inst.state.sq != null) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy piece to send on pilgrimage",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k",
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose the shrine square it must reach",
          squares: emptySquares(api.board, (sq) => relRank(api.opp, sq) <= 4 && sq !== picks[0].square),
        };
      },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        const target = picks[1]?.square;
        if (sq == null || target == null) return;
        inst.state.sq = sq;
        inst.state.target = target;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        const target = inst.state.target as Square | undefined;
        if (sq == null || target == null) return;
        const arrived = move.color === api.opp && move.from === sq && move.to === target;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true; // captured: geas dies with it
          return;
        }
        if (arrived) {
          inst.spent = true; // reached the shrine
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) === 1) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            // Added during their own move: 4 leaves exactly 3 of their turns.
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 4, skin: "roots" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        const target = inst.state.target as Square | undefined;
        return sq == null || target == null
          ? "activate to set a pilgrimage"
          : `${sqName(sq)} must reach ${sqName(target)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Pauper's Crown (queen->rook, one piece) and Curse of Recoil (fling the
  // capturer back). This AGES the capturing piece one rank DOWN on every kill -
  // a queen that trades becomes a rook, a rook a bishop. Fight with pawns/knights.
  H4(
    {
      id: "hw3_aging_blade",
      name: "Aging Blade",
      description:
        "Every kill costs them a little youth: for your opponent's next 6 turns, whenever a queen, rook or bishop captures, it ages one rank on the spot - a queen becomes a rook, a rook a bishop, a bishop a knight. Knights and pawns are already too humble to age, so trading with them is safe. Capturing with their heavy pieces slowly grinds the army down.",
      flavor: "The sword drinks, and the hand that holds it withers.",
      fx: { motif: "muzzle", pieces: ["q", "r", "b"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured && !move.promotion) {
          const into = DEMOTE[move.piece];
          const p = api.board.pieces[move.to];
          if (into && p && p.color === api.opp && p.type === move.piece) {
            api.setPieceType(move.to, into);
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Cursed Coin (a single mark that TRANSFERS) and Creeping Blight (tiles).
  // This is AMBIENT contagion with no carrier: any piece that ends its turn
  // huddled beside a comrade grows "sick", and a third dose freezes it. Spread out.
  H4(
    {
      id: "hw3_miasma",
      name: "Miasma",
      description:
        "A sickly fog settles over their ranks: for your opponent's next 6 turns, each time they move a piece so it ends adjacent to another of their pieces, that piece breathes in the miasma and grows more sick. On its third breath it succumbs and is frozen for 2 of their turns, and its lungs clear again. Keeping their pieces spread apart is the whole cure. Kings do not sicken.",
      flavor: "Crowd together for safety and share the same bad air.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.sick = {} as Record<number, number>;
      },
      onMovePlayed: (inst, move, api) => {
        let sick = (inst.state.sick as Record<number, number> | undefined) ?? {};
        // Carry sick counts across the move (drop captured/moved-from squares).
        const remapped: Record<number, number> = {};
        for (const key of Object.keys(sick)) {
          const s = Number(key);
          const next = followSq(s, move);
          if (next != null) remapped[next] = sick[s];
        }
        sick = remapped;
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.from !== move.to &&
          move.piece !== "k"
        ) {
          const adjacent = mySquares(api.board, api.opp).some(
            (s) => s !== move.to && cheb(s, move.to) === 1,
          );
          if (adjacent) {
            const c = (sick[move.to] ?? 0) + 1;
            if (c >= 3) {
              addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "slime" });
              sick[move.to] = 0;
            } else {
              sick[move.to] = c;
            }
          }
        }
        inst.state.sick = sick;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

// ===========================================================================
// BATCH 2 (T5-T8): the heavier band - delayed defections, roaming eaters,
// sympathetic death, board-reshaping fuses, escalating and chained curses.
// ===========================================================================

// ------------------------------- TIER 5 ------------------------------------

const T5: Buff[] = [
  // vs: wa_dominate_minor "Dominate" (instant seizure, no cure). This is a
  // TELEGRAPHED sleeper: a marked minor defects only on a 4-turn fuse, and the
  // victim can root it out by capturing or trading it before it turns.
  H5(
    {
      id: "hw3_defectors_mark",
      name: "Sleeper Cell",
      description:
        "Plant a sleeper in one enemy knight or bishop. On their 4th turn from now it wakes and defects: it becomes yours to command for your next 3 turns, then slips back to your opponent. Until it turns, it is still theirs - they can root out the plot by capturing or trading the marked piece before the fuse ends. Kings are never turned.",
      flavor: "It smiled and saluted for three days. On the fourth it did not.",
      fx: { motif: "jail" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight or bishop to turn",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.armed = false;
        inst.state.fuse = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.armed) {
          if (tickDefect(inst, move, api) === "ended") inst.spent = true;
          return;
        }
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true; // rooted out before it turned
          return;
        }
        if (move.color === api.opp) {
          const fuse = ((inst.state.fuse as number) ?? 0) - 1;
          inst.state.fuse = fuse;
          if (fuse <= 0) {
            api.setPieceColor(sq, api.me);
            inst.state.armed = true;
            inst.state.myTurns = 3;
          }
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to plant a sleeper";
        return inst.state.armed
          ? `defected, ${(inst.state.myTurns as number) ?? 0} of your turns left`
          : `${sqName(sq)} turns in ${(inst.state.fuse as number) ?? 0} of their turns`;
      },
    },
  ),

  // vs: voidSquares/Sinkhole (STATIC traps) and Creeping Blight (a GROWING
  // zone). This summons a single ROAMING void that hunts the nearest enemy
  // piece, one step a turn, and devours whatever it catches. Predictable; flee.
  H5(
    {
      id: "hw3_roaming_void",
      name: "Roaming Maw",
      description:
        "Tear open a hungry void in your opponent's half. Each of their turns it drifts one square toward their nearest piece, and no enemy piece may move onto the square it occupies. If it reaches a piece (never the king), that piece is swallowed off the board. It hunts for 6 of their turns, then closes. Its next step is always plain to see - keep pieces clear of its path.",
      flavor: "It does not chase so much as insist.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "instant",
      init: (inst, api) => {
        const cands = emptySquares(api.board, (sq) => relRank(api.opp, sq) === 2);
        if (cands.length === 0) {
          inst.spent = true;
          return;
        }
        const sq = cands[Math.floor(cands.length / 2)];
        inst.state.sq = sq;
        inst.state.turns = 6;
        // Only ever bar the maw's current square (turns=1 on my turn, refreshed
        // as 2 during their move) so it stays a single roaming tile.
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 1 });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const prey = nearestVictimPiece(api, sq);
          if (prey != null && sq !== prey) {
            const next = stepToward(sq, prey);
            const p = api.board.pieces[next];
            if (p && p.color === api.opp && p.type !== "k") api.removePiece(next);
            if (!api.board.pieces[next] || next === prey) {
              inst.state.sq = next;
              addEffect(api, { kind: "barred", squares: [next], against: api.opp, turns: 2 });
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "closed" : `maw at ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Twinned Torment (motion->stun) and Binding Oath (mutual muzzle). This
  // is SHARED DEATH: bind two pieces, and capturing either one takes the other
  // with it. Trade or bench one of the pair before you can strike.
  H5(
    {
      id: "hw3_shared_fate",
      name: "Shared Fate",
      description:
        "Stitch the fates of two enemy pieces together for the next 8 of their turns: if you capture one of the pair, the other drops dead in the same instant, wherever it stands. They can break the link by trading one of the two away themselves, or by keeping the pair well guarded so you never take either. A king can never be fate-bound.",
      flavor: "Cut one thread and the whole tapestry unravels.",
      fx: { motif: "slow" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.a != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Choose the first piece" : "Choose its fate-partner",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.a != null) return;
        const a = picks[0]?.square;
        const b = picks[1]?.square;
        if (a == null || b == null) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.turns = 8;
      },
      onMovePlayed: (inst, move, api) => {
        const a = (inst.state.a as Square | null | undefined) ?? null;
        const b = (inst.state.b as Square | null | undefined) ?? null;
        if (a == null || b == null) return;
        // Did I capture one of the pair? The other shares its fate.
        if (move.capturedSquare === a || move.capturedSquare === b) {
          const twin = move.capturedSquare === a ? b : a;
          const p = api.board.pieces[twin];
          if (p && p.color === api.opp && p.type !== "k") api.removePiece(twin);
          inst.spent = true;
          return;
        }
        inst.state.a = followSq(a, move);
        inst.state.b = followSq(b, move);
        if (inst.state.a == null || inst.state.b == null) {
          inst.spent = true; // one traded off: the link is cut
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const a = inst.state.a as Square | undefined;
        const b = inst.state.b as Square | undefined;
        return a == null || b == null
          ? "activate to bind two fates"
          : `${sqName(a)} & ${sqName(b)} share a fate, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Tide of Ash (an ADVANCING wall of home ranks) and The Witching Hour
  // (freeze pieces they MOVED). This is a CHOSEN rank on a fuse: whoever is
  // standing on it when it caves in is frozen. Evacuate the marked rank.
  H5(
    {
      id: "hw3_collapsing_floor",
      name: "Collapsing Floor",
      description:
        "Curse one rank in your opponent's half with a slow crack: after 3 of their turns the floor gives way, and every piece of theirs still standing on that rank is caught in the rubble and frozen for 2 of their turns. Their king is never trapped. The rank and the count are both plain to read - march their pieces off it before it caves in.",
      flavor: "You could hear it groaning for three days before it went.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.rank != null
          ? null
          : {
              kind: "square",
              label: "Choose any square on the rank to crack",
              squares: Array.from({ length: 64 }, (_, i) => i).filter(
                (sq) => relRank(api.opp, sq) <= 4,
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.rank != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.rank = RANK(sq);
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        const rank = inst.state.rank as number | undefined;
        if (rank == null) return;
        if (move.color === api.opp && turnsLeft(inst) === 1) {
          for (let f = 0; f < 8; f++) {
            const sq = SQ(f, rank);
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "quicksand" });
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const rank = inst.state.rank as number | undefined;
        return rank == null
          ? "activate to crack a rank"
          : `rank ${rank + 1} caves in ${turnsLeft(inst)} of their turns`;
      },
    },
  ),

  // vs: Queen's Ransom (queen-MOVE tax on the court). This taxes ONE marked
  // piece only, and only when it FIGHTS: a bounty piece freezes itself for two
  // turns each time it captures. Bench it or trade it.
  H5(
    {
      id: "hw3_bounty_mark",
      name: "Bounty Mark",
      description:
        "Paint a bounty on one enemy piece for the next 6 of their turns: whenever the marked piece captures anything, it is swarmed by bounty hunters and frozen for 2 of their turns afterward. Marching it around is free; only using it to fight is punished. They can keep it out of combat, or trade it away to shed the mark. Kings carry no bounty.",
      flavor: "Dead or alive, but preferably exhausted first.",
      fx: { motif: "muzzle" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to mark",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        const fought = move.color === api.opp && move.from === sq && move.captured;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        if (fought && turnsLeft(inst) > 0) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") {
            // Added during their own move: 3 leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "beartrap" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "activate to mark a bounty" : `bounty on ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Cursed Coin (a single mark that TRANSFERS between pieces). This is
  // MULTIPLYING contagion: a rot that spreads to one neighbor a turn and mutes
  // every carrier's capturing. Quarantine the sick, trade them off.
  H5(
    {
      id: "hw3_wildfire",
      name: "Wildfire Rot",
      description:
        "Set a rot on one enemy piece: for your opponent's next 6 turns, no rotten piece may capture, and on each of their turns the rot spreads to one more of their pieces standing beside an infected one. Left in a huddle it consumes the whole cluster; kept apart it cannot jump the gap. Capturing a rotten piece burns that infection away. Kings never rot.",
      flavor: "One spark in dry grass and the whole field is gone by noon.",
      fx: { motif: "muzzle" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.rotten != null
          ? null
          : {
              kind: "square",
              label: "Choose the first enemy piece to rot",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.rotten != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.rotten = [sq] as Square[];
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst) => {
        const rotten = (inst.state.rotten as Square[] | undefined) ?? [];
        if (rotten.length === 0 || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.captured || !rotten.includes(m.from));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let rotten = (inst.state.rotten as Square[] | undefined) ?? [];
        rotten = rotten.map((sq) => followSq(sq, move)).filter((sq): sq is Square => sq != null);
        if (move.color === api.opp && turnsLeft(inst) > 0 && rotten.length > 0) {
          // Spread to ONE new neighbor (lowest index) for a readable pace.
          let next: Square | null = null;
          for (const sq of mySquares(api.board, api.opp)) {
            if (rotten.includes(sq) || api.board.pieces[sq]!.type === "k") continue;
            if (rotten.some((r) => cheb(r, sq) === 1)) {
              next = sq;
              break;
            }
          }
          if (next != null) rotten.push(next);
        }
        inst.state.rotten = rotten;
        if (rotten.length === 0) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const rotten = (inst.state.rotten as Square[] | undefined) ?? [];
        return rotten.length === 0
          ? "activate to set the rot"
          : `${rotten.length} pieces rotting, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),
];

// ------------------------------- TIER 6 ------------------------------------

const T6: Buff[] = [
  // vs: Kraken / Serpent Brood (caster hazard summons). This summons a
  // caster-owned effigy the victim CAN smash: it stands in their half, bars the
  // ring around it, and only capturing it (its one weakness) ends the curse.
  H6(
    {
      id: "hw3_effigy_of_dread",
      name: "Effigy of Dread",
      description:
        "Raise a leering effigy on an empty square in your opponent's half. While it stands, every square around it is barred to their pieces, and the dread lingers for 6 of their turns before it topples. It is not invincible: the effigy is a piece they can capture, and smashing it ends the curse at once. Route around its shadow, or send a piece to break it.",
      flavor: "Knock it down. It would like to see you try.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "instant",
      init: (inst, api) => {
        const king = victimKing(api);
        const cands = emptySquares(api.board, (sq) => {
          if (relRank(api.opp, sq) < 2 || relRank(api.opp, sq) > 4) return false;
          // Do not raise it giving check (a knight-effigy forking the king).
          if (king != null) {
            for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] as const) {
              if (SQ(FILE(sq) + df, RANK(sq) + dr) === king && inBoard(FILE(sq) + df, RANK(sq) + dr)) return false;
            }
          }
          return true;
        });
        if (cands.length === 0) {
          inst.spent = true;
          return;
        }
        const sq = cands[Math.floor(cands.length / 2)];
        api.place(sq, "n", api.me);
        inst.state.sq = sq;
        inst.state.turns = 6;
        // Seed the aura for the victim's first turn (added on my turn: 1 turn).
        const ring0: Square[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(sq) + df;
            const r = RANK(sq) + dr;
            if (inBoard(f, r) && !api.board.pieces[SQ(f, r)]) ring0.push(SQ(f, r));
          }
        }
        if (ring0.length) addEffect(api, { kind: "barred", squares: ring0, against: api.opp, turns: 1 });
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true; // effigy smashed
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const ring: Square[] = [];
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(sq) + df;
              const r = RANK(sq) + dr;
              if (inBoard(f, r) && !api.board.pieces[SQ(f, r)]) ring.push(SQ(f, r));
            }
          }
          if (ring.length) addEffect(api, { kind: "barred", squares: ring, against: api.opp, turns: 2 });
        }
        // On expiry, topple the effigy (it was never really theirs to keep).
        if (turnsLeft(inst) === 1 && move.color === api.opp) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.me && p.type === "n") api.removePiece(sq, { uncounted: true });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "toppled" : `effigy at ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Gathering Storm (a filter that ESCALATES from turn 1). This lies DORMANT
  // on a fuse, then buries all open ground: after the fuse, moving onto an empty
  // square in their half is forbidden for 3 turns. Occupy ground before it falls.
  H6(
    {
      id: "hw3_avalanche",
      name: "Avalanche",
      description:
        "Snow gathers silently over their half for 3 of their turns, then comes down all at once. For the 3 turns after it falls, their pieces may not move onto any empty square in their own half - only captures and moves into your half remain. Whatever ground they already hold is safe footing, so spreading out before it drops is the counter. If it ever leaves them no move, they play freely that turn.",
      flavor: "Quiet, quiet, quiet, and then the whole mountainside.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.fuse = 3;
        inst.state.win = 0;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (((inst.state.win as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.captured || relRank(api.opp, m.to) >= 5);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (((inst.state.win as number) ?? 0) > 0) {
          const w = (inst.state.win as number) - 1;
          inst.state.win = w;
          if (w <= 0) inst.spent = true;
        } else {
          const f = ((inst.state.fuse as number) ?? 0) - 1;
          inst.state.fuse = f;
          if (f <= 0) inst.state.win = 3; // the slope lets go
        }
      },
      status: (inst) =>
        ((inst.state.win as number) ?? 0) > 0
          ? `buried, ${(inst.state.win as number)} of their turns left`
          : `snow gathering, falls in ${(inst.state.fuse as number) ?? 0} of their turns`,
    },
  ),

  // vs: The Hollow Crown (king move taxes the NEXT turn's piece class). This
  // makes every king move cost a GUARD: the piece nearest the king is frozen.
  H6(
    {
      id: "hw3_kings_guard",
      name: "Standing Guard",
      description:
        "A cruel duty binds their bodyguard: for your opponent's next 6 turns, every time their king moves, whichever of their pieces stands nearest the king is frozen in place for 1 of their turns, rooted to watch over the empty throne. Keeping the king still keeps the guard free. The king itself is never frozen.",
      flavor: "The king may wander. Someone must always mind the chair.",
      fx: { motif: "slow", pieces: ["k"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.piece === "k") {
          const guard = nearestVictimPiece(api, move.to);
          if (guard != null) {
            // Added during their own move: 2 leaves exactly 1 of their turns.
            addEffect(api, { kind: "freeze", sq: guard, owner: api.opp, turns: 2, skin: "chains" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Compounding Misery (a ONE-SHOT freeze that scales with active curses).
  // This is a STANDING filter that scales live: the more curses already bite
  // the victim, the tighter their sliders are reined. Cleanse to loosen it.
  H6(
    {
      id: "hw3_feeding_frenzy",
      name: "Feeding Frenzy",
      description:
        "A parasite curse that feeds on other curses: for your opponent's next 6 turns, their bishops, rooks and queen have their reach capped, and the cap tightens for every other curse-effect already afflicting them (each frozen or petrified piece, sealed square, or royal edict). On a clean board it barely bites; on a board buried in hexes it clamps their long pieces to a crawl. Cleansing the other curses loosens this one.",
      flavor: "It grows fat on the misery of its neighbors.",
      fx: { motif: "anchor", pieces: ["b", "r", "q"] },
    },
    curse(6, (moves, api) => {
      const cap = Math.max(2, 7 - activeCurseCount(api));
      return moves.filter(
        (m) => (m.piece !== "b" && m.piece !== "r" && m.piece !== "q") || cheb(m.from, m.to) <= cap,
      );
    }),
  ),

  // vs: Death Knell (cure = the doomed piece CAPTURES). This doom's cure is the
  // KING coming to the rescue: the marked piece dies unless the king stands
  // beside it in time. A contract that drags the king into the open.
  H6(
    {
      id: "hw3_doomed_vow",
      name: "Doomed Vow",
      description:
        "Condemn one enemy piece with a vow only their king can answer: in 5 of their turns it is dragged off the board, unless their own king comes to stand on a square next to it before then, which breaks the vow at once. Their king must leave shelter to save it - or they abandon the piece and keep the king safe. The count is on the card throughout. Kings themselves cannot be condemned.",
      flavor: "It will die on the fifth toll unless the crown itself kneels beside it.",
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
              label: "Choose the enemy piece to condemn",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 5, then: "remove" });
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null || inst.spent) return;
        // King rescue: their king steps adjacent to the condemned piece.
        if (move.color === api.opp && move.piece === "k" && cheb(move.to, sq) === 1) {
          const idx = api.bs.effects.findIndex(
            (e) =>
              e.kind === "timed_loss" && e.then === "remove" && e.owner === api.opp && e.sq === sq,
          );
          if (idx >= 0) api.bs.effects.splice(idx, 1);
          inst.spent = true;
          return;
        }
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true; // captured; engine prunes the timer
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to condemn a piece"
          : `${sqName(sq)} is lost in ${turnsLeft(inst)} of their turns unless the king comes`;
      },
    },
  ),
];

// ------------------------------- TIER 7 ------------------------------------

const T7: Buff[] = [
  // vs: wa_dominate_major "Grand Dominion" (instant seizure of a R/Q). This is
  // an ACTIVITY-triggered betrayal: a marked major defects only if the victim
  // OVERUSES it (moves it three times). Bench it or trade it to keep it loyal.
  H7(
    {
      id: "hw3_enemy_within",
      name: "The Enemy Within",
      description:
        "Whisper treason to one enemy rook or queen. Over the next 8 of their turns, the third time they move that piece, its patience snaps and it defects: it serves you for your next 4 turns, then returns to them. Working it hard is what turns it - they can leave it standing, or trade it away, to keep it loyal. If it is captured while it fights for you, the treason ends. Kings never turn.",
      flavor: "You lean on your strongest arm until the day it lets you fall.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to seduce",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "q";
              }),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.armed = false;
        inst.state.moves = 0;
        inst.state.turns = 8;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.armed) {
          if (tickDefect(inst, move, api) === "ended") inst.spent = true;
          return;
        }
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        const movedIt = move.color === api.opp && move.from === sq && move.to !== sq;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true; // traded off before it turned
          return;
        }
        if (movedIt) {
          const n = ((inst.state.moves as number) ?? 0) + 1;
          inst.state.moves = n;
          if (n >= 3) {
            api.setPieceColor(sq, api.me);
            inst.state.armed = true;
            inst.state.myTurns = 4;
            return;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to seduce a major";
        return inst.state.armed
          ? `defected, ${(inst.state.myTurns as number) ?? 0} of your turns left`
          : `${sqName(sq)} turns on its 3rd move (${(inst.state.moves as number) ?? 0}/3)`;
      },
    },
  ),

  // vs: Tolling Bell (alternating slider lock) and Gathering Storm (escalates
  // from turn 1). This lies DORMANT, then STRIKES: after 3 quiet turns their
  // diagonal pieces are locked for 3 turns. Spend the bishops early.
  H7(
    {
      id: "hw3_eclipse",
      name: "The Long Eclipse",
      description:
        "A shadow crosses the sun over their army. For their first 3 turns nothing seems wrong, then the eclipse falls: for the following 3 of their turns their bishops and queen are blind and cannot move at all. The knights, rooks, pawns and king see fine throughout. The schedule is fixed - use the diagonal pieces before the dark, and rely on the others during it.",
      flavor: "The astronomers warned them. The astronomers always do.",
      fx: { motif: "jail", pieces: ["b", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst) => {
        const left = turnsLeft(inst);
        if (left <= 0 || left > 3 || moves.length === 0) return moves; // dark only in the last 3
        const kept = moves.filter((m) => m.piece !== "b" && m.piece !== "q");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => {
        const left = turnsLeft(inst);
        return left > 3
          ? `the eclipse falls in ${left - 3} of their turns`
          : `total eclipse, ${left} of their turns left`;
      },
    },
  ),

  // vs: Compounding Misery / Contagion (spread a status). This is a CHAINED
  // curse: cutting off the marked head spawns two more. Capture the piece and
  // two of their neighbors freeze; isolate it first to starve the spawn.
  // Balance review: retiered T7 -> T6 (H6). The payload only fires when the
  // CASTER chooses to capture the branded head - a caster-optional upside that
  // the victim can largely ignore - so its curse value is well below the T7
  // band (The Enemy Within's 4-turn major defection, The Long Eclipse's 3-turn
  // queen+bishop lockout). It is stamped H6 in place; the block is kept in
  // source order rather than moved, and only its `.tier` field (what the draft
  // pool reads) changes.
  H6(
    {
      id: "hw3_hydra_hex",
      name: "Hydra Hex",
      description:
        "Brand one enemy piece as the hydra's head, for the next 8 of their turns. If you cut it off (capture the branded piece), two heads grow back: the two enemy pieces nearest where it fell are frozen for 2 of their turns each. Leaving the head alone lets the curse expire harmlessly; capturing it while it stands alone, far from help, gives the new heads nothing to seize. Kings are neither head nor spawn.",
      flavor: "Strike, and the wound answers with two more mouths.",
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
              label: "Choose the enemy piece to brand as the head",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 8;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null || inst.spent) return;
        // Head cut off: two nearest neighbors freeze.
        if (move.capturedSquare === sq && move.from !== sq) {
          const grabbed: Square[] = [];
          const pool = mySquares(api.board, api.opp)
            .filter((s) => api.board.pieces[s]!.type !== "k")
            .sort((a, b) => cheb(a, sq) - cheb(b, sq) || a - b);
          for (const s of pool) {
            if (grabbed.length >= 2) break;
            grabbed.push(s);
          }
          for (const s of grabbed) {
            // Fired on MY capturing move: the post-move tick belongs to me and
            // does not touch an opp-owned freeze, so 2 gives exactly 2 of theirs.
            addEffect(api, { kind: "freeze", sq: s, owner: api.opp, turns: 2, skin: "vines" });
          }
          inst.spent = true;
          return;
        }
        inst.state.sq = followSq(sq, move);
        if (inst.state.sq == null) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null ? "activate to brand the head" : `head at ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // vs: Blood Price (next capture -> a SKIP) and Queen's Ransom (queen moves).
  // This taxes EVERY capture with a mourning freeze on a bystander piece.
  H7(
    {
      id: "hw3_pyrrhic_toll",
      name: "Pyrrhic Toll",
      description:
        "Victory itself is cursed: for your opponent's next 6 turns, each time any of their pieces captures, the army mourns and one of their other pieces (chosen by the curse) is frozen for 1 of their turns. Every kill they take costs them a beat somewhere else on the board. Refusing trades avoids the toll entirely; a grinding, capture-heavy game bleeds them dry. Kings never mourn.",
      flavor: "Another such victory and we are undone.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          const pool = mySquares(api.board, api.opp).filter(
            (sq) => sq !== move.to && api.board.pieces[sq]!.type !== "k",
          );
          if (pool.length > 0) {
            const sq = pool[api.rng.int(pool.length)];
            // Added during their own move: 2 leaves exactly 1 of their turns.
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "petal" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

// ------------------------------- TIER 8 ------------------------------------

const T8: Buff[] = [
  // vs: Crown of Thorns (per-check freeze on the checker). This ESCALATES: it
  // ignores single checks and only answers a repeated assault, freezing the
  // whole ring around your king after the second check. Do not stack checks.
  H8(
    {
      id: "hw3_martyrs_crown",
      name: "Martyr's Crown",
      description:
        "A patient briar guards your king for your opponent's next 6 turns. A single check passes unpunished, but on the second time they place your king in check, the thorns lash out: every enemy piece standing next to your king is frozen for 2 of their turns, and the count resets. Persistent, hammering checks are what trigger it - a single decisive check, or threats aimed elsewhere, cost them nothing.",
      flavor: "Crown me in thorns. I will wear them, and so will you.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.thorns = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && isInCheck(api.board, api.me)) {
          const t = ((inst.state.thorns as number) ?? 0) + 1;
          if (t >= 2) {
            const myKing = mySquares(api.board, api.me).find(
              (sq) => api.board.pieces[sq]!.type === "k",
            );
            if (myKing != null) {
              for (const sq of mySquares(api.board, api.opp)) {
                if (api.board.pieces[sq]!.type === "k") continue;
                if (cheb(sq, myKing) === 1) {
                  // Added during their own move: 3 leaves exactly 2 of their turns.
                  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3, skin: "vines" });
                }
              }
            }
            inst.state.thorns = 0;
          } else {
            inst.state.thorns = t;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `${(inst.state.thorns as number) ?? 0}/2 thorns set, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Gathering Storm (staged filter) and Compounding Misery (scaling freeze).
  // This is a self-winding ENGINE: it counts their turns and periodically
  // discharges, freezing their strongest piece every third turn. Chained escalation.
  H8(
    {
      id: "hw3_curse_engine",
      name: "The Curse Engine",
      description:
        "A grinding machine of malice runs over their army for the next 9 of their turns. Every turn it winds one notch tighter; on every third notch it discharges, freezing whichever of their pieces is strongest for 2 of their turns, then resets. It cannot be reasoned with, only outlasted - three discharges across its life, each snuffing their best piece for a spell. Their king is never seized.",
      flavor: "Tick. Tick. Tick. Clang.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 9;
        inst.state.wind = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const w = ((inst.state.wind as number) ?? 0) + 1;
          if (w >= 3) {
            inst.state.wind = 0;
            let best: Square | null = null;
            let bv = -1;
            for (const sq of mySquares(api.board, api.opp)) {
              const t = api.board.pieces[sq]!.type;
              if (t === "k") continue;
              if (VAL[t] > bv || (VAL[t] === bv && best != null && sq < best)) {
                bv = VAL[t];
                best = sq;
              }
            }
            if (best != null) {
              // Added during their own move: 3 leaves exactly 2 of their turns.
              addEffect(api, { kind: "freeze", sq: best, owner: api.opp, turns: 3, skin: "shock" });
            }
          } else {
            inst.state.wind = w;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `winding ${(inst.state.wind as number) ?? 0}/3, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: War Rations (a capture BUDGET) and Palsied Hands. This is a blood TITHE
  // in material: each time they capture a real piece, one of their own pawns is
  // taken as tribute. Refuse the trade, or bleed a pawn for every kill.
  H8(
    {
      id: "hw3_blood_tithe",
      name: "Blood Tithe",
      description:
        "A tithe is levied on every kill: for your opponent's next 6 turns, whenever they capture anything larger than a pawn, one of their own pawns (chosen by the curse) is claimed as tribute and removed from the board. Trading pawn for pawn is untaxed; every heavier trade quietly costs them a pawn on top. Once they have no pawns left, the tithe goes unpaid. Refusing trades starves it entirely.",
      flavor: "The tax collector takes his cut of every corpse.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.captured &&
          move.captured !== "p"
        ) {
          const pawns = mySquares(api.board, api.opp, "p");
          if (pawns.length > 0) {
            const sq = pawns[api.rng.int(pawns.length)];
            api.removePiece(sq);
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // vs: Tarnished Crown (freezes the promoted piece) and Stage Fright (bans
  // promotion). This DISTORTS the rule: for the duration, every pawn they queen
  // is forced down to a knight instead. Delay the promotion past the window.
  H8(
    {
      id: "hw3_inverted_crown",
      name: "The Inverted Crown",
      description:
        "The rules of coronation are turned upside down: for your opponent's next 6 turns, any pawn that reaches the last rank is crowned not as they choose but as a mere knight, no matter what they promote to. A knight is still a piece, but never the queen they hoped for. Holding a pawn back until the curse lifts restores a proper coronation.",
      flavor: "By royal decree, all new crowns are made of tin.",
      fx: { motif: "slow", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.promotion) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type !== "n" && p.type !== "k") {
            api.setPieceType(move.to, "n");
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

export const HEX_WAVE3: Buff[] = [...T1, ...T2, ...T3, ...T4, ...T5, ...T6, ...T7, ...T8];


