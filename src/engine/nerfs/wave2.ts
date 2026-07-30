// Nerf wave 2 (2026-07): the expansion batch that fills the thin tiers of the
// nerf ladder (1, 2, 7, 8) with immediately-readable handicaps. Spread into
// ALL_IMPLEMENTED by implemented.ts; ids are prefixed nw2_ so they can never
// collide with existing nerfs. Every nerf here has a passive-effect composition
// generated into src/components/effects/passive/compositions.ts
// (npx tsx scripts/gen-passive-compositions.ts, enforced by
// npm run test:passive-registry).
//
// SAFETY: same contract as the expanded library. A nerf must never leave you
// with zero legal moves in a normal opening position. Every rule below leaves
// moves from the start (checked per card in the comments), and conditional
// filters keep the `filtered.length ? filtered : moves` fallback; the engine's
// own empty-filter net (legalMoves) backstops the pure bans.

import {
  Color,
  FILE,
  GameContext,
  Nerf,
  RANK,
  adj,
  cheb,
  filter,
  findKing,
  isInCheck,
  makeMove,
  nerf,
} from "./expanded/shared";
import { initialBoard } from "../board";

const other = (c: Color): Color => (c === "w" ? "b" : "w");

// ---------------------------------------------------------------------------
// Tier 1 (Trivial): flavorful, low-impact, always easy to play around.
// ---------------------------------------------------------------------------

const LATE_RISER: Nerf = nerf(
  {
    id: "nw2_late_riser",
    name: "Late Riser",
    tier: 2,
    icon: "moon",
    description: "Your queen can't move during your first four moves. From your fifth move on she is free.",
    flavor: "Her majesty does not do mornings.",
  },
  {
    // Distinct from cloistered_queen (frozen until you castle, tier 7) and
    // slow_start (pawns and knights only for 6 moves, tier 3): a short, fixed
    // delay on one piece that rarely moves that early anyway. Opening-safe:
    // every non-queen move survives.
    filterMoves: (moves, _s, ctx) =>
      ctx.moveNumber < 4 ? moves.filter((m) => m.piece !== "q") : moves,
  },
);

const OPENING_CEREMONY: Nerf = nerf(
  {
    id: "nw2_opening_ceremony",
    name: "Opening Ceremony",
    tier: 1,
    icon: "flag",
    description: "Your fourth move of the game must be a pawn move.",
    flavor: "The parade goes first. Then the war.",
  },
  {
    // Activation delayed until after move 3: the pawn-move requirement now lands
    // on your fourth move (moveNumber 3) instead of your first. Opening-safe:
    // several pawns can still push on move four, so the filter never empties
    // the list when it applies, and the opening probe (move one) is untouched.
    filterMoves: (moves, _s, ctx) =>
      ctx.moveNumber === 3 ? moves.filter((m) => m.piece === "p") : moves,
  },
);

const GENTLE_SHEPHERDS: Nerf = nerf(
  {
    id: "nw2_gentle_shepherds",
    name: "Gentle Shepherds",
    tier: 1,
    icon: "church",
    description: "Your bishops can't capture pawns.",
    flavor: "The shepherds tend the flock; they do not eat it.",
  },
  {
    // Completes the piece-specific pawn-mercy family next to soft_paws
    // (knights can't capture pawns, tier 1); elephants_fear_mice (ALL
    // non-pawns, tier 3) is the strict superset one ladder rung up.
    filterMoves: filter((m) => !(m.piece === "b" && m.captured === "p")),
  },
);

const SILENT_INFANTRY: Nerf = nerf(
  {
    id: "nw2_silent_infantry",
    name: "Silent Infantry",
    tier: 1,
    icon: "hand",
    description: "From your fourth move on, your pawns can't give check: any pawn move that would leave the enemy king in check is forbidden. A pawn may still capture the king itself.",
    flavor: "Foot soldiers do not address the enemy crown.",
  },
  {
    // Distinct from respectful (NO move of yours may give check, tier 5): only
    // pawn checks are banned, a rare and easily avoided situation. The lethal
    // exception (capturing the king) keeps the game winnable by pawn. Activation
    // is delayed until after move 3, so the restriction is inert for your first
    // three moves (moveNumber < 3) and only bites from your fourth move on.
    filterMoves: (moves, _s, ctx) => {
      if (ctx.moveNumber < 3) return moves;
      const opp = other(ctx.me);
      return moves.filter(
        (m) =>
          m.piece !== "p" ||
          m.captured === "k" ||
          !isInCheck(makeMove(ctx.board, m), opp),
      );
    },
  },
);

// ---------------------------------------------------------------------------
// Tier 2 (Easy): small tactical friction.
// ---------------------------------------------------------------------------

const CLEAN_HANDS: Nerf = nerf(
  {
    id: "nw2_clean_hands",
    name: "Clean Hands",
    tier: 2,
    icon: "hand",
    description: "Your king can't capture anything, unless the captured piece is checking your king. Capturing the checker is always legal.",
    flavor: "Royalty does not do its own butchering.",
  },
  {
    // Fills the last gap in the "X can't capture" family (queen trophy_wife,
    // rooks pen_pusher, bishops monastic_vows, knights horse_tranquilizer,
    // pawns conscientious_objectors). Mild until endgames, where a king who
    // can't eat pawns is real friction: keep an escort piece to do the taking.
    // Exception: the king may always capture a piece that is checking him, i.e.
    // a capture that, with that piece removed and the king in place, ends the
    // check.
    filterMoves: (moves, _s, ctx) => {
      const ks = findKing(ctx.board, ctx.me);
      const inCheck = ks != null && isInCheck(ctx.board, ctx.me);
      return moves.filter((m) => {
        if (!(m.piece === "k" && m.captured)) return true;
        if (!inCheck) return false;
        const relieved = { ...ctx.board, pieces: ctx.board.pieces.slice() };
        relieved.pieces[m.capturedSquare ?? m.to] = null;
        return !isInCheck(relieved, ctx.me);
      });
    },
  },
);

const COLD_TRAIL: Nerf = nerf(
  {
    id: "nw2_cold_trail",
    name: "Cold Trail",
    tier: 3,
    icon: "footprints",
    description: "You can't move any piece onto the square your opponent's last move just left.",
    flavor: "Their footprints are still warm. Don't step in them.",
  },
  {
    // Mirror of no_takebacks (your OWN last origin square, tier 1). Banning
    // the opponent's vacated square blocks natural re-occupations and some
    // recaptures, so it sits one rung up. Single-square ban: the engine's
    // empty-filter net covers the rare forced case.
    filterMoves: (moves, _s, ctx) => {
      const last = ctx.opponentLastMove;
      if (!last || last.drop) return moves;
      return moves.filter((m) => m.to !== last.from);
    },
  },
);

const RUSTY_HINGES: Nerf = nerf(
  {
    id: "nw2_rusty_hinges",
    name: "Rusty Hinges",
    tier: 2,
    icon: "lock",
    description: "You can only castle during your first ten moves. From your 11th move on, the castle gate is rusted shut, unless you have no other legal move: then a single emergency castle is allowed, once per game.",
    flavor: "Oil it now or never close it at all.",
  },
  {
    // Distinct from no_drawbridge (never castle, tier 1) and castle_curfew
    // (LOSE if not castled by move 20, tier 4): a use-it-or-lose-it window.
    // Play around it by committing to a king plan early. Once-per-game
    // exemption: from move 11 on, if filtering out castles would leave you with
    // no legal move, the castle is allowed through. Castling spends your
    // castling rights, so this emergency exit can be taken at most once.
    filterMoves: (moves, _s, ctx) => {
      if (ctx.moveNumber < 10) return moves;
      const open = moves.filter((m) => !m.castle);
      return open.length ? open : moves;
    },
    progress: (_s, ctx) => {
      const castled = ctx.board.history.some((m) => m.color === ctx.me && !!m.castle);
      if (castled) return { value: 10, max: 10, label: "castled in time" };
      const used = Math.min(ctx.moveNumber, 10);
      return {
        value: used,
        max: 10,
        label: used >= 10 ? "gate rusted shut" : used + "/10 moves before the gate rusts",
      };
    },
  },
);

const MINOR_NOBILITY: Nerf = nerf(
  {
    id: "nw2_minor_nobility",
    name: "Minor Nobility",
    tier: 1,
    icon: "sprout",
    description: "Your pawns can only promote to knights or bishops, never to queens or rooks.",
    flavor: "The crown ennobles, but only so far.",
  },
  {
    // Distinct from promotion_phobia (no promotion at all, tier 3) and the fan
    // clubs (forced promotion piece PLUS royal movement limits, tier 4): pure
    // underpromotion, felt only in endgames.
    filterMoves: filter(
      (m) => !m.promotion || m.promotion === "n" || m.promotion === "b",
    ),
  },
);

// ---------------------------------------------------------------------------
// Tier 7 (Punishing): unhinged but survivable.
// ---------------------------------------------------------------------------

const CHAMELEON: Nerf = nerf(
  {
    id: "nw2_chameleon",
    name: "Chameleon",
    tier: 7,
    icon: "copy",
    description: "Every move must end on the same colour square it started on. Your knights can never move, your pawns can only double-step or capture, and your king and rooks step diagonally or an even number of squares. With no such move, your king may move anywhere.",
      tip: "Your knights are dead weight, so trade them off early.",
    flavor: "Blend in. Never break pattern.",
  },
  {
    // Distinct from hopscotch (alternate destination colors, tier 5),
    // simon_says (match the opponent's color, tier 5) and colorblind (random
    // banned color, tier 5): each move is locked to its own origin color.
    // Opening-safe: all eight double pawn pushes keep color. Castling keeps
    // color on both wings (e1-g1, e1-c1), so the king can still find shelter.
    // Escape hatch: when no move keeps color, the king (and only the king) may
    // move to any square, a tighter relief than the engine's own empty-filter
    // net (which would free every piece).
    filterMoves: (moves) => {
      const onColor = moves.filter(
        (m) => (FILE(m.from) + RANK(m.from)) % 2 === (FILE(m.to) + RANK(m.to)) % 2,
      );
      if (onColor.length) return onColor;
      const kingMoves = moves.filter((m) => m.piece === "k");
      return kingMoves.length ? kingMoves : moves;
    },
  },
);

const ROYAL_ENTOURAGE: Nerf = nerf(
  {
    id: "nw2_royal_entourage",
    name: "Royal Entourage",
    tier: 7,
    icon: "users",
    description: "For your first three moves you may move anything. From your fourth move on, you can only move pieces that start within two king-steps of your own king. Everything farther away stands and waits.",
    flavor: "If the king can't see you, you don't exist.",
  },
  {
    // Distinct from kings_leash (DESTINATION within 3 of the king, tier 6) and
    // noble_steed (adjacent to a knight, tier 7): a source-based radius, so
    // the whole army crawls forward with the crown. Opening-safe: c/d/e/f/g
    // pawns and the king's bishop and knight all start inside the radius.
    // Fallback keeps a move when the entourage is boxed in. The rule starts on
    // move 4 (moveNumber >= 3) so the first three moves cannot be soft-locked.
    filterMoves: (moves, _s, ctx) => {
      if (ctx.moveNumber < 3) return moves;
      const ks = findKing(ctx.board, ctx.me);
      if (ks == null) return moves;
      const near = moves.filter((m) => cheb(m.from, ks) <= 2);
      return near.length ? near : moves;
    },
  },
);

const METRONOME: Nerf = nerf(
  {
    id: "nw2_metronome",
    name: "Metronome",
    tier: 7,
    icon: "music",
    description: "Each move must travel exactly as many squares, in king-steps, as your previous move, whenever such a move exists. A knight's move always counts as two. A spawned or teleported piece must move on the ongoing tempo immediately.",
      tip: "Short moves are easier to repeat, so setting a beat of one keeps you flexible.",
    flavor: "Tick. Tock. Same beat, forever.",
  },
  {
    // Distinct from going_the_distance (at least the OPPONENT's last distance,
    // tier 6) and slowpoke (always exactly one, tier 6): you are chained to
    // your own previous distance. Play around it by settling into a beat you
    // can sustain (single pawn steps, or the knight's steady two). The beat is
    // read from your last move that has a real origin: a spawn (drop) is skipped
    // rather than resetting the tempo, so spawned and teleported pieces are
    // bound by the ongoing beat immediately.
    filterMoves: (moves, _s, ctx) => {
      const h = ctx.board.history;
      let idx = -1;
      for (let i = h.length - 1; i >= 0; i--) {
        if (h[i].color === ctx.me && !h[i].drop) { idx = i; break; }
      }
      if (idx < 0) return moves;
      const need = cheb(h[idx].from, h[idx].to);
      const onBeat = moves.filter((m) => cheb(m.from, m.to) === need);
      return onBeat.length ? onBeat : moves;
    },
    hint: (_s, ctx, legal) => {
      const h = ctx.board.history;
      let idx = -1;
      for (let i = h.length - 1; i >= 0; i--) {
        if (h[i].color === ctx.me && !h[i].drop) { idx = i; break; }
      }
      if (idx < 0) return null;
      const need = cheb(h[idx].from, h[idx].to);
      const onBeat = legal.filter((m) => cheb(m.from, m.to) === need);
      if (!onBeat.length) return null;
      return {
        text: `The metronome beats ${need}: this move must travel exactly ${need} square${need === 1 ? "" : "s"}.`,
        squares: Array.from(new Set(onBeat.map((m) => m.from))),
        tone: "warn",
      };
    },
  },
);

const GRANDSTANDING: Nerf = nerf(
  {
    id: "nw2_grandstanding",
    name: "Grandstanding",
    tier: 7,
    icon: "sparkles",
    description: "Every move you make must be one of the longest available this turn: no legal move may travel farther (in king-steps) than the one you pick. If no full-length move exists, your king may move to any square instead.",
    flavor: "Why walk when the crowd wants to see you fly?",
  },
  {
    // Distinct from metronome (locked to your own last distance) and
    // going_the_distance (opponent-relative minimum): an absolute maximum
    // each turn. Counterplay is real: keep your lines closed so the longest
    // available move stays short. The maximum is always achieved by at least
    // one move, so the king escape below is a defensive net that essentially
    // never fires; when it does, only the king (not the whole army) is freed.
    filterMoves: (moves) => {
      let max = 0;
      for (const m of moves) max = Math.max(max, cheb(m.from, m.to));
      const longest = moves.filter((m) => cheb(m.from, m.to) === max);
      if (longest.length) return longest;
      const kingMoves = moves.filter((m) => m.piece === "k");
      return kingMoves.length ? kingMoves : moves;
    },
    hint: (_s, _ctx, legal) => {
      if (!legal.length) return null;
      let max = 0;
      for (const m of legal) max = Math.max(max, cheb(m.from, m.to));
      if (max <= 1) return null;
      return {
        text: `Grandstanding: this turn's move must travel ${max} squares.`,
        squares: Array.from(new Set(legal.map((m) => m.from))),
        tone: "info",
      };
    },
  },
);

// ---------------------------------------------------------------------------
// Tier 8 (Unhinged): brutal, but always with a line of play that manages it.
// ---------------------------------------------------------------------------

const KILLING_SPREE: Nerf = nerf(
  {
    id: "nw2_killing_spree",
    name: "Killing Spree",
    tier: 8,
    icon: "swords",
    description: "Once you capture, the spree begins: every one of your following turns must also capture, or you lose. Declining an available capture, or starting a turn mid-spree with no capture at all, loses immediately. Capturing the enemy king ends the spree in victory.",
      tip: "Do not take the first capture until you can see the chain through to the end.",
    flavor: "The first taste is free. After that, the hunger owns you.",
  },
  {
    // Distinct from barbarian_rage (must capture after a capture but never
    // loses, tier 4) and eye_for_an_eye (OPPONENT's capture obliges yours,
    // tier 5): here your own first capture commits you until the king falls.
    // Managed line: play pacifist (total_pacifism at tier 8 proves that is
    // survivable) until you can count a chain that ends on the king. The spree
    // is enforced as a loss condition, not a move filter: non-captures stay
    // legal but end the game, so declining an available capture loses just the
    // same as running out of captures to make.
    checkLoss: (_s, ctx) => {
      // Judged right after my move (a king capture already ended the game via
      // the king-capture check, which runs first). Mid-spree, ANY move that is
      // not a capture loses now, whether the capture was declined or none was
      // available.
      const mine = ctx.board.history.filter((m) => m.color === ctx.me);
      const h = ctx.board.history;
      if (!h.length || h[h.length - 1].color !== ctx.me) return null;
      const n = mine.length;
      if (n < 2) return null;
      return mine[n - 2].captured && !mine[n - 1].captured
        ? { reason: "the spree was broken" }
        : null;
    },
    hint: (_s, ctx, legal) => {
      if (!ctx.myLastMove?.captured) return null;
      const caps = legal.filter((m) => m.captured);
      if (!caps.length) {
        return { text: "The spree demands blood and there is none to spill. This move loses.", tone: "warn" };
      }
      return {
        text: "Killing spree: you must capture again this turn or you lose.",
        squares: Array.from(new Set(caps.map((m) => m.from))),
        tone: "warn",
      };
    },
  },
);

/** Squares of my pieces that have captured at some point (and are therefore
 * petrified). Walks history forward, carrying each cursed piece's square along
 * its own move chain; a cursed piece that gets captured clears its square. */
function petrifiedSquares(ctx: GameContext): Set<number> {
  const cursed = new Set<number>();
  for (const m of ctx.board.history) {
    if (m.color !== ctx.me) {
      const capSq = m.capturedSquare ?? (m.captured ? m.to : null);
      if (capSq != null) cursed.delete(capSq);
      continue;
    }
    const wasCursed = cursed.has(m.from);
    cursed.delete(m.from);
    if (m.piece !== "k" && (wasCursed || !!m.captured)) cursed.add(m.to);
  }
  return cursed;
}

const PYRRHIC_VICTORIES: Nerf = nerf(
  {
    id: "nw2_pyrrhic_victories",
    name: "Pyrrhic Victories",
    tier: 8,
    icon: "mountain",
    description: "Any of your pieces that captures turns to stone and can never move again; a petrified piece can still be captured by your opponent. Your king is immune to the curse.",
    flavor: "Every victory costs a soldier.",
  },
  {
    // Distinct from battle_fatigue (capture cooldown until a quiet move,
    // tier 2) and medusa (enemy-queen gaze freeze, tier 5): here the freeze is
    // permanent and self-inflicted by every capture. The king exemption keeps
    // the mandatory "never a frozen king" rule: he can always capture freely,
    // so the game stays winnable even with a stone army. Managed line: spend
    // only the pieces you can afford to lose as statues.
    filterMoves: (moves, _s, ctx) => {
      const cursed = petrifiedSquares(ctx);
      if (!cursed.size) return moves;
      const alive = moves.filter((m) => !cursed.has(m.from));
      return alive.length ? alive : moves;
    },
    visual: (_s, ctx) => {
      const cursed = petrifiedSquares(ctx);
      return cursed.size ? { highlightSquares: Array.from(cursed) } : {};
    },
    progress: (_s, ctx) => {
      const n = petrifiedSquares(ctx).size;
      return { value: Math.min(n, 15), max: 15, label: n + " piece" + (n === 1 ? "" : "s") + " turned to stone" };
    },
  },
);

const DOOMSDAY_CLOCK: Nerf = nerf(
  {
    id: "nw2_doomsday_clock",
    name: "Doomsday Clock",
    tier: 8,
    icon: "hourglass",
    description: "You must capture the enemy king by your 30th move, or you lose. From your 12th move on you must also give check at least once every six of your own moves: let six of your moves pass with no check and you lose.",
    flavor: "The bell was cast the day you were born.",
  },
  {
    // Distinct from siege (a rook by move 20, tier 6) and deadline_queen (the
    // queen by move 25, tier 6): the whole game is on the clock, and from move
    // 12 a second clock demands constant pressure. Managed line: play for the
    // win from move one and keep landing checks so neither clock runs out.
    checkLoss: (_s, ctx) => {
      if (ctx.moveNumber >= 30) return { reason: "the doomsday clock struck" };
      // Check clock: from move 12 on, replay to find my most recent check and
      // lose if six of my own moves have gone by without one. Recomputed fresh
      // from history (not onTurnStart state) so my just-made check counts now.
      if (ctx.moveNumber >= 12) {
        const opp = other(ctx.me);
        let board = initialBoard();
        let myMoves = 0;
        let lastCheck = 0;
        for (const m of ctx.board.history) {
          board = makeMove(board, m);
          if (m.color === ctx.me) {
            myMoves += 1;
            if (isInCheck(board, opp)) lastCheck = myMoves;
          }
        }
        if (myMoves - lastCheck >= 6) return { reason: "the check clock ran dry" };
      }
      return null;
    },
    progress: (_s, ctx) => ({
      value: Math.min(ctx.moveNumber, 30),
      max: 30,
      label: Math.min(ctx.moveNumber, 30) + "/30 moves on the clock",
    }),
    hint: (_s, ctx) => {
      const remaining = 30 - ctx.moveNumber;
      if (remaining > 8 || remaining < 0) return null;
      return {
        text: `Doomsday: capture the enemy king within ${remaining} more move${remaining === 1 ? "" : "s"} or lose.`,
        tone: "warn",
      };
    },
  },
);

const SHIELD_WALL: Nerf = nerf(
  {
    id: "nw2_shield_wall",
    name: "Shield Wall",
    tier: 7,
    icon: "shield",
    description: "Your king must always end your turn with at least one of your own pawns adjacent to him, or you lose. If the shield is broken on the opponent's turn, you get one move to restore it.",
    flavor: "A bare king is a dead king.",
  },
  {
    // Distinct from bodyguard (ANY friendly piece adjacent, judged instantly,
    // tier 5): pawns can't trail the king around, so this is a whole game
    // shape at tier 8. Judged only after YOUR move (the after-my-move grace
    // pattern from cowardly / eye_for_an_eye), so an opponent capture of the
    // shield pawn gives you one turn to step back to the wall or push a new
    // pawn to the king. Managed line: keep the king inside his pawn shelter
    // and never spend the last nearby pawn.
    checkLoss: (_s, ctx) => {
      if (ctx.moveNumber === 0) return null;
      const h = ctx.board.history;
      const last = h[h.length - 1];
      if (!last || last.color !== ctx.me) return null;
      const ks = findKing(ctx.board, ctx.me);
      if (ks == null) return null;
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.board.pieces[sq];
        if (p && p.color === ctx.me && p.type === "p" && adj(sq, ks)) return null;
      }
      return { reason: "the king was left without his shield" };
    },
    hint: (_s, ctx) => {
      const ks = findKing(ctx.board, ctx.me);
      if (ks == null) return null;
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.board.pieces[sq];
        if (p && p.color === ctx.me && p.type === "p" && adj(sq, ks)) return null;
      }
      return {
        text: "Your king has no pawn beside him. End this turn next to a pawn or lose.",
        squares: [ks],
        tone: "warn",
      };
    },
  },
);

export const NERF_WAVE2: Nerf[] = [
  // Tier 1
  LATE_RISER,
  OPENING_CEREMONY,
  GENTLE_SHEPHERDS,
  SILENT_INFANTRY,
  // Tier 2
  CLEAN_HANDS,
  COLD_TRAIL,
  RUSTY_HINGES,
  MINOR_NOBILITY,
  // Tier 7
  CHAMELEON,
  ROYAL_ENTOURAGE,
  METRONOME,
  GRANDSTANDING,
  // Tier 8
  KILLING_SPREE,
  PYRRHIC_VICTORIES,
  DOOMSDAY_CLOCK,
  SHIELD_WALL,
];
