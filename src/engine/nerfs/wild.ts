import { Nerf } from "../nerf";
import { attackedBy, findKing, initialBoard, isInCheck, makeMove } from "../board";
import { Color, FILE, PieceType, RANK, SQ, Square, inBoard } from "../types";

// WILD_NERFS: a fresh batch of secret handicaps. Every nerf handicaps YOUR OWN
// play by filtering your own legal moves (filterMoves), tracking a counter
// across turns (init + onTurnStart), or adding a loss condition (checkLoss).
//
// SAFETY: a nerf must never truly soft-lock. Restriction filters that could
// remove every move return the unfiltered list as a fallback (`? filtered :
// moves`); pure single-square/file/rank bans lean on the engine's empty-filter
// safety net (it falls back to all legal moves if a filter returns []).

const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

const adj = (a: Square, b: Square) =>
  a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;

// Relative rank 1..8 from `color`'s perspective (1 = own back rank).
const relRank = (color: Color, sq: Square) =>
  color === "w" ? RANK(sq) + 1 : 8 - RANK(sq);

const other = (c: Color): Color => (c === "w" ? "b" : "w");

const CENTER4 = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];

function pieceSquares(
  board: { pieces: ({ type: PieceType; color: Color } | null)[] },
  color: Color,
  type?: PieceType,
): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p) continue;
    if (p.color === color && (!type || p.type === type)) out.push(sq);
  }
  return out;
}

function db(d: Nerf): Nerf {
  return { ...d, implemented: true };
}

// --------------------------- TIER 1 (trivial) ---------------------------

export const MOONLIT_KING: Nerf = db({
  id: "wn_moonlit_king", name: "Moonlit King", tier: 2, icon: "moon", implemented: true,
  description: "Your king can only move to dark squares.",
  flavor: "He walks only where the moon touches.",
  filterMoves: (moves) =>
    moves.filter((m) => m.piece !== "k" || (FILE(m.to) + RANK(m.to)) % 2 === 0),
});

export const NO_TAKEBACKS: Nerf = db({
  id: "wn_no_takebacks", name: "No Takebacks", tier: 2, icon: "rotate-ccw", implemented: true,
  description: "You can't move a piece to the exact square your last move started from.",
  flavor: "What's done is done.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    return moves.filter((m) => m.to !== last.from);
  },
});

export const EDGE_SHY_QUEEN: Nerf = db({
  id: "wn_edge_shy_queen", name: "Edge-Shy Queen", tier: 2, icon: "crown", implemented: true,
  description: "Your queen can't move onto the a-file or the h-file.",
  flavor: "She keeps clear of the walls.",
  filterMoves: (moves) =>
    moves.filter((m) => m.piece !== "q" || (FILE(m.to) !== 0 && FILE(m.to) !== 7)),
});

export const WALLFLOWER: Nerf = db({
  id: "wn_wallflower", name: "Wallflower", tier: 2, icon: "castle", implemented: true,
  description: "Your rooks can't move onto the four center squares (d4, d5, e4, e5).",
  flavor: "The towers hug the walls.",
  filterMoves: (moves) =>
    moves.filter((m) => m.piece !== "r" || !CENTER4.includes(m.to)),
});

// --------------------------- TIER 2 (easy) ---------------------------

export const SABBATH: Nerf = db({
  id: "wn_sabbath", name: "Sabbath", tier: 2, icon: "calendar", implemented: true,
  description: "On every 7th turn of yours, you can't capture, except a capture that gets your king out of check is always legal.",
  flavor: "One day of rest in seven.",
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 7 !== 0) return moves;
    const inCheck = isInCheck(ctx.board, ctx.me);
    return moves.filter((m) => {
      if (!m.captured) return true;
      // Capturing the checking piece (a capture that resolves the check) is
      // always allowed, even on the sabbath turn.
      return inCheck && !isInCheck(makeMove(ctx.board, m), ctx.me);
    });
  },
});

export const GENTLE_GIANT: Nerf = db({
  id: "wn_gentle_giant", name: "Gentle Giant", tier: 2, icon: "crown", implemented: true,
  description: "Your queen can't capture pawns, unless your king is in check.",
  flavor: "She won't stoop to swatting foot soldiers.",
  filterMoves: (moves, _s, ctx) => {
    // The restriction pauses while your king is in check: on the turn you must
    // answer a check, the queen may take pawns freely.
    if (isInCheck(ctx.board, ctx.me)) return moves;
    return moves.filter((m) => !(m.piece === "q" && m.captured === "p"));
  },
});

export const NO_GOING_HOME: Nerf = db({
  id: "wn_no_going_home", name: "No Going Home", tier: 3, icon: "home", implemented: true,
  description: "Your non-pawn pieces can't move back onto your own back rank.",
  flavor: "The officers have burned the barracks.",
  filterMoves: (moves, _s, ctx) =>
    moves.filter((m) => m.piece === "p" || relRank(ctx.me, m.to) !== 1),
});

export const KNIGHT_TOLL: Nerf = db({
  id: "wn_knight_toll", name: "Knight Toll", tier: 3, icon: "swords", implemented: true,
  description: "You can't capture with a knight if a knight of yours captured on your previous turn.",
  flavor: "The horses need a turn to recover.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (last && last.piece === "n" && last.captured) {
      return moves.filter((m) => !(m.piece === "n" && m.captured));
    }
    return moves;
  },
});

// --------------------------- TIER 3 (common) ---------------------------

export const PAWN_SHY: Nerf = db({
  id: "wn_pawn_shy", name: "Pawn Shy", tier: 4, icon: "shield", implemented: true,
  description: "You can't move any piece onto a square guarded by an enemy pawn.",
  flavor: "The infantry's picket line is untouchable.",
  filterMoves: (moves, _s, ctx) => {
    const opp = other(ctx.me);
    const dir = opp === "w" ? 1 : -1;
    const guarded = new Set<number>();
    for (const sq of pieceSquares(ctx.board, opp, "p")) {
      const f = FILE(sq), r = RANK(sq);
      for (const df of [-1, 1]) {
        if (inBoard(f + df, r + dir)) guarded.add(SQ(f + df, r + dir));
      }
    }
    return moves.filter((m) => !guarded.has(m.to));
  },
});

export const LONELY_KING: Nerf = db({
  id: "wn_lonely_king", name: "Lonely King", tier: 4, icon: "crown", implemented: true,
  description: "Your king can't move to a square adjacent to one of your own pieces.",
  flavor: "His majesty demands personal space.",
  filterMoves: (moves, _s, ctx) =>
    moves.filter((m) => {
      if (m.piece !== "k") return true;
      for (let sq = 0; sq < 64; sq++) {
        if (sq === m.from) continue;
        const p = ctx.board.pieces[sq];
        if (p && p.color === ctx.me && adj(sq, m.to)) return false;
      }
      return true;
    }),
});

export const SHORT_QUEEN: Nerf = db({
  id: "wn_short_queen", name: "Short Queen", tier: 4, icon: "crown", implemented: true,
  description: "Your queen can't move more than 4 squares in a single move.",
  flavor: "Her long game is a memory.",
  filterMoves: (moves) =>
    moves.filter((m) => m.piece !== "q" || cheb(m.from, m.to) <= 4),
});

export const STAMPEDE: Nerf = db({
  id: "wn_stampede", name: "Stampede", tier: 4, icon: "swords", implemented: true,
  description: "If you moved a knight on your last turn, you must move a knight again this turn (if you can).",
  flavor: "Once the herd starts, it can't stop.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.myLastMove?.piece !== "n") return moves;
    const knights = moves.filter((m) => m.piece === "n");
    return knights.length ? knights : moves;
  },
  hint: (_s, ctx, legal) => {
    if (ctx.myLastMove?.piece !== "n") return null;
    const knights = legal.filter((m) => m.piece === "n");
    if (!knights.length) return null;
    return {
      text: "The herd is running: move a knight again.",
      squares: Array.from(new Set(knights.map((m) => m.from))),
      tone: "warn",
    };
  },
});

export const SLOW_START: Nerf = db({
  id: "wn_slow_start", name: "Slow Start", tier: 4, icon: "hourglass", implemented: true,
  description: "For your first 6 moves, you can only move pawns and knights.",
  flavor: "The heavy pieces sleep in.",
  filterMoves: (moves, _s, ctx) =>
    ctx.moveNumber < 6
      ? moves.filter((m) => m.piece === "p" || m.piece === "n")
      : moves,
});

export const SLOW_BURN: Nerf = db({
  id: "wn_slow_burn", name: "Slow Burn", tier: 4, icon: "clock", implemented: true,
  description: "You can't capture anything before your 6th move.",
  flavor: "Patience. Let it build.",
  filterMoves: (moves, _s, ctx) =>
    ctx.moveNumber < 5 ? moves.filter((m) => !m.captured) : moves,
});

export const FLINCH: Nerf = db({
  id: "wn_flinch", name: "Flinch", tier: 4, icon: "shield-alert", implemented: true,
  description: "While your king is in check, you can't capture; you have to get out another way.",
  flavor: "Under fire, your hands shake too much to grab.",
  filterMoves: (moves, _s, ctx) => {
    if (!isInCheck(ctx.board, ctx.me)) return moves;
    const quiet = moves.filter((m) => !m.captured);
    return quiet.length ? quiet : moves;
  },
});

// --------------------------- TIER 4 (severe) ---------------------------

export const WEIGH_STATION: Nerf = db({
  id: "wn_weigh_station", name: "Weigh Station", tier: 4, icon: "anchor", implemented: true,
  description: "Your rooks and queen can't cross into the enemy half (relative ranks 5 to 8).",
  flavor: "The heavy pieces are too big for the border checkpoint.",
  filterMoves: (moves, _s, ctx) =>
    moves.filter((m) => (m.piece !== "r" && m.piece !== "q") || relRank(ctx.me, m.to) <= 4),
});

export const QUARANTINE_ZONE: Nerf = db({
  id: "wn_quarantine_zone", name: "Quarantine Zone", tier: 4, icon: "biohazard", implemented: true,
  description: "A random 2x2 block of squares is sealed off, shown from the first turn; you can't move any piece onto it, unless the seal would leave you fewer than three legal moves.",
  flavor: "Do not cross the tape.",
  init: (rng) => {
    const f = rng.int(7); // 0..6, so f+1 <= 7
    const r = 1 + rng.int(5); // 1..5, so r+1 <= 6
    return { zone: [SQ(f, r), SQ(f + 1, r), SQ(f, r + 1), SQ(f + 1, r + 1)] };
  },
  filterMoves: (moves, state) => {
    const s = state as { zone: number[] };
    const set = new Set(s.zone);
    const ok = moves.filter((m) => !set.has(m.to));
    // Guarantee at least three legal moves: if the seal is too constraining,
    // drop it for the turn rather than choke the position.
    return ok.length >= 3 ? ok : moves;
  },
  visual: (state) => ({ bannedSquares: (state as { zone: number[] }).zone }),
  hint: (state) => {
    const s = state as { zone: number[] };
    const corner = Math.min(...s.zone);
    return { text: `A 2x2 block is sealed off (corner ${"abcdefgh"[FILE(corner)]}${RANK(corner) + 1}).`, tone: "info" };
  },
});

export const SHIFTING_SANDS: Nerf = db({
  id: "wn_shifting_sands", name: "Shifting Sands", tier: 4, icon: "wind", implemented: true,
  description: "Each turn, a random file is closed; you can't move any piece onto it this turn, unless the closure would leave you fewer than three legal moves. Next turn's closed file is revealed a turn early.",
  flavor: "The dunes move overnight.",
  init: (rng) => ({ file: rng.int(8), next: rng.int(8) }),
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { file: number; next: number };
    return { file: s.next, next: rng.int(8) };
  },
  filterMoves: (moves, state) => {
    const s = state as { file: number };
    const ok = moves.filter((m) => FILE(m.to) !== s.file);
    return ok.length >= 3 ? ok : moves;
  },
  visual: (state) => {
    const s = state as { file: number; next: number };
    const banned: number[] = [];
    for (let r = 0; r < 8; r++) banned.push(SQ(s.file, r));
    const highlight: number[] = [];
    for (let r = 0; r < 8; r++) highlight.push(SQ(s.next, r));
    return { bannedSquares: banned, highlightSquares: highlight };
  },
  hint: (state) => {
    const s = state as { file: number; next: number };
    return {
      text: `The ${"abcdefgh"[s.file]}-file is buried in sand this turn; the ${"abcdefgh"[s.next]}-file closes next turn.`,
      tone: "info",
    };
  },
});

export const GLASS_JAW: Nerf = db({
  id: "wn_glass_jaw", name: "Glass Jaw", tier: 5, icon: "crown", implemented: true,
  description: "You can't make a move that leaves your queen attacked by the enemy.",
  flavor: "Keep her chin tucked at all times.",
  filterMoves: (moves, _s, ctx) => {
    const opp = other(ctx.me);
    const safe = moves.filter((m) => {
      const nb = makeMove(ctx.board, m);
      const qs = pieceSquares(nb, ctx.me, "q");
      if (!qs.length) return true;
      const atk = attackedBy(nb, opp);
      return !qs.some((sq) => atk.has(sq));
    });
    return safe.length ? safe : moves;
  },
});

export const TAX_SEASON: Nerf = db({
  id: "wn_tax_season", name: "Tax Season", tier: 4, icon: "coins", implemented: true,
  description: "Every 6th turn of yours, if you can capture, you must.",
  flavor: "The collector always takes his cut.",
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 6 !== 0) return moves;
    const caps = moves.filter((m) => m.captured);
    return caps.length ? caps : moves;
  },
  hint: (_s, ctx, legal) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 6 !== 0) return null;
    const caps = legal.filter((m) => m.captured);
    if (!caps.length) return null;
    return {
      text: "Tax is due: you must capture this turn.",
      squares: Array.from(new Set(caps.map((m) => m.from))),
      tone: "warn",
    };
  },
});

export const CURFEW: Nerf = db({
  id: "wn_curfew", name: "Curfew", tier: 5, icon: "moon", implemented: true,
  description: "After your 25th move, you can't move any piece into the enemy half (relative ranks 5 to 8).",
  flavor: "The border closes at the 25th bell.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 25) return moves;
    const home = moves.filter((m) => relRank(ctx.me, m.to) <= 4);
    return home.length ? home : moves;
  },
});

// --------------------------- TIER 5 (brutal) ---------------------------

export const GRAVITY: Nerf = db({
  id: "wn_gravity", name: "Gravity", tier: 5, icon: "arrow-down", implemented: true,
  description: "None of your pieces may move more than two ranks ahead of your own king, unless the piece already starts more than two ranks ahead (a piece inside the region may move freely).",
  flavor: "The army can't outrun its monarch.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    const cap = relRank(ctx.me, ks) + 2;
    const ok = moves.filter(
      (m) =>
        m.piece === "k" ||
        relRank(ctx.me, m.from) > cap || // already inside the region: may leave normally
        relRank(ctx.me, m.to) <= cap,
    );
    return ok.length ? ok : moves;
  },
});

export const BOTTOM_FEEDER: Nerf = db({
  id: "wn_bottom_feeder", name: "Bottom Feeder", tier: 6, icon: "fish", implemented: true,
  description: "You can only capture pawns. You can't capture any other piece, except the enemy king to win.",
  flavor: "Scraps only.",
  filterMoves: (moves) =>
    moves.filter((m) => !m.captured || m.captured === "p" || m.captured === "k"),
});

export const MIMICRY: Nerf = db({
  id: "wn_mimicry", name: "Mimicry", tier: 6, icon: "copy", implemented: true,
  description: "You must move the same piece type as your opponent's last move, if you can.",
  flavor: "Whatever they did, you do.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const match = moves.filter((m) => m.piece === last.piece);
    return match.length ? match : moves;
  },
  hint: (_s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return null;
    const names: Record<PieceType, string> = {
      p: "a pawn", n: "a knight", b: "a bishop", r: "a rook", q: "your queen", k: "your king",
    };
    return { text: `They moved ${names[last.piece]}. So must you.`, tone: "info" };
  },
});

export const FOLLOW_THE_LEADER: Nerf = db({
  id: "wn_follow_the_leader", name: "Follow the Leader", tier: 6, icon: "columns", implemented: true,
  description: "You must move a piece onto the same file as your opponent's last move's destination, if you can.",
  flavor: "March in their column.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const f = FILE(last.to);
    const match = moves.filter((m) => FILE(m.to) === f);
    return match.length ? match : moves;
  },
  visual: (state, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return {};
    const f = FILE(last.to);
    const sqs: number[] = [];
    for (let r = 0; r < 8; r++) sqs.push(SQ(f, r));
    return { highlightSquares: sqs };
  },
});

export const BODYGUARD: Nerf = db({
  id: "wn_bodyguard", name: "Bodyguard", tier: 6, icon: "shield", implemented: true,
  description: "You lose if your king ever has no friendly piece adjacent to it (after your first move).",
  flavor: "A king is never left alone.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (p && p.color === ctx.me && adj(sq, ks)) return null;
    }
    return { reason: "the king was left with no escort" };
  },
});

export const METEOR_SHOWER: Nerf = db({
  id: "wn_meteor_shower", name: "Meteor Shower", tier: 5, icon: "sparkles", implemented: true,
  description: "Each turn, five random squares are struck and sealed; you can't move any piece onto them this turn, unless the strike would leave you fewer than three legal moves. Next turn's five squares are revealed a turn early.",
  flavor: "Look out below.",
  init: (rng) => {
    const roll = () => {
      const set = new Set<number>();
      while (set.size < 5) set.add(rng.int(64));
      return Array.from(set);
    };
    return { banned: roll(), next: roll() };
  },
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { banned: number[]; next: number[] };
    const set = new Set<number>();
    while (set.size < 5) set.add(rng.int(64));
    return { banned: s.next, next: Array.from(set) };
  },
  filterMoves: (moves, state) => {
    const s = state as { banned: number[] };
    const set = new Set(s.banned);
    const ok = moves.filter((m) => !set.has(m.to));
    return ok.length >= 3 ? ok : moves;
  },
  visual: (state) => {
    const s = state as { banned: number[]; next: number[] };
    return { bannedSquares: s.banned, highlightSquares: s.next };
  },
});

// --------------------------- TIER 6 (cruel) ---------------------------

export const KINGS_LEASH: Nerf = db({
  id: "wn_kings_leash", name: "King's Leash", tier: 6, icon: "crown", implemented: true,
  description: "You can't move any piece to a square more than 3 king-steps from your own king. If no compliant move exists, only your king may move.",
  flavor: "Nobody strays far from the throne.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    const ok = moves.filter((m) => cheb(m.to, ks) <= 3);
    if (ok.length) return ok;
    // No compliant move: fall back to a king move rather than opening the whole
    // board back up.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const REGICIDE_CLOCK: Nerf = db({
  id: "wn_regicide_clock", name: "Regicide Clock", tier: 6, icon: "target", implemented: true,
  description: "You must give check at least once every 6 of your turns, or you lose.",
  flavor: "Keep the pressure on, or the clock runs out.",
  init: () => ({ sinceCheck: 0 }),
  onTurnStart: (_s, ctx) => {
    const opp = other(ctx.me);
    let board = initialBoard();
    let streak = 0;
    for (const m of ctx.board.history) {
      board = makeMove(board, m);
      if (m.color === ctx.me) {
        streak = isInCheck(board, opp) ? 0 : streak + 1;
      }
    }
    return { sinceCheck: streak };
  },
  filterMoves: (moves, state, ctx) => {
    const s = state as { sinceCheck: number };
    if (s.sinceCheck < 7) return moves;
    const opp = other(ctx.me);
    const checks = moves.filter((m) => isInCheck(makeMove(ctx.board, m), opp));
    return checks.length ? checks : moves;
  },
  checkLoss: (_state, ctx) => {
    if (ctx.moveNumber < 8) return null;
    // Recompute the streak fresh from history rather than reading the
    // onTurnStart-maintained state, which is one move stale at loss-check time
    // and would let the player dodge the loss (and steal a king capture) for an
    // extra move.
    const opp = other(ctx.me);
    let board = initialBoard();
    let streak = 0;
    for (const m of ctx.board.history) {
      board = makeMove(board, m);
      if (m.color === ctx.me) {
        streak = isInCheck(board, opp) ? 0 : streak + 1;
      }
    }
    return streak >= 8 ? { reason: "the pressure lapsed for too long" } : null;
  },
  progress: (state) => {
    const s = state as { sinceCheck: number };
    return { value: Math.min(s.sinceCheck, 8), max: 8, label: `${s.sinceCheck}/8 turns since check` };
  },
});

export const EQUALIZER: Nerf = db({
  id: "wn_equalizer", name: "Equalizer", tier: 6, icon: "scale", implemented: true,
  description: "You lose if your piece count ever differs from your opponent's by more than 3, in either direction.",
  flavor: "The scales must stay level.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const opp = other(ctx.me);
    const mine = pieceSquares(ctx.board, ctx.me).length;
    const theirs = pieceSquares(ctx.board, opp).length;
    return Math.abs(mine - theirs) > 3 ? { reason: "the scales tipped too far" } : null;
  },
});

export const DEADLINE_QUEEN: Nerf = db({
  id: "wn_deadline_queen", name: "Deadline", tier: 6, icon: "sword", implemented: true,
  description: "You must capture the enemy queen by your 25th move, or you lose.",
  flavor: "Her head, before the bell.",
  progress: (_s, ctx) => ({
    value: Math.min(ctx.capturedByMe.q, 1),
    max: 1,
    label: ctx.capturedByMe.q >= 1
      ? "queen taken"
      : `${Math.max(0, 25 - ctx.moveNumber)} turns to take the queen`,
  }),
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 25) return null;
    return ctx.capturedByMe.q >= 1 ? null : { reason: "the enemy queen still stands" };
  },
  hint: (_s, ctx) => {
    if (ctx.moveNumber >= 25 || ctx.capturedByMe.q >= 1) return null;
    const remaining = 25 - ctx.moveNumber;
    if (remaining > 8) return null;
    return {
      text: `Take the enemy queen within ${remaining} more turn${remaining === 1 ? "" : "s"} or lose.`,
      tone: "warn",
    };
  },
});

export const DAISY_CHAIN: Nerf = db({
  id: "wn_daisy_chain", name: "Daisy Chain", tier: 6, icon: "spline", implemented: true,
  description: "The piece you move must start its move adjacent to the square your last move ended on (if any such move exists).",
  flavor: "Link every step to the last.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const chained = moves.filter((m) => m.from === last.to || adj(m.from, last.to));
    return chained.length ? chained : moves;
  },
});

// --------------------------- TIER 7 (punishing) ---------------------------

export const GLASS_QUEEN: Nerf = db({
  id: "wn_glass_queen", name: "Glass Queen", tier: 6, icon: "crown", implemented: true,
  description: "You lose if you end one of your turns with your queen attacked by the enemy.",
  flavor: "One touch and she shatters.",
  // Rebalance 2026-07: judged only after YOUR OWN move (the after-my-move
  // grace pattern from cowardly / eye_for_an_eye). Previously the queen
  // shattered the instant an opponent's ordinary developing move happened to
  // attack her: an unanswerable lottery loss. Now that move gives you one turn
  // to rescue her (move her, block the line, or capture the attacker) before
  // the glass is judged. Still tier 7.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    const queens = pieceSquares(ctx.board, ctx.me, "q");
    if (!queens.length) return null;
    const atk = attackedBy(ctx.board, other(ctx.me));
    return queens.some((sq) => atk.has(sq)) ? { reason: "the glass queen was menaced" } : null;
  },
  hint: (_s, ctx) => {
    const queens = pieceSquares(ctx.board, ctx.me, "q");
    if (!queens.length) return null;
    const atk = attackedBy(ctx.board, other(ctx.me));
    const menaced = queens.filter((sq) => atk.has(sq));
    if (!menaced.length) return null;
    return {
      text: "Your glass queen is menaced. End this turn with her safe or lose.",
      squares: menaced,
      tone: "warn",
    };
  },
});

export const PIN_CUSHION: Nerf = db({
  id: "wn_pin_cushion", name: "Pin Cushion", tier: 7, icon: "crosshair", implemented: true,
  description: "You lose if you end one of your turns with two or more of your pieces (other than the king) attacked by the enemy at once.",
  flavor: "Get forked, get finished.",
  // Rebalance 2026-07: judged only after YOUR OWN move. The old instant
  // judgment meant any opponent move that attacked two of your pieces (a fork,
  // or often just a routine developing move) ended the game before you could
  // respond. Now you get one turn to break the double attack: move a target,
  // block a line, or remove the attacker. Ending your own turn with two
  // pieces hanging is still the promised loss. Still tier 7.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    const atk = attackedBy(ctx.board, other(ctx.me));
    let count = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (p && p.color === ctx.me && p.type !== "k" && atk.has(sq)) {
        count++;
        if (count >= 2) return { reason: "two of your pieces were attacked at once" };
      }
    }
    return null;
  },
  hint: (_s, ctx) => {
    const atk = attackedBy(ctx.board, other(ctx.me));
    const hit: number[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (p && p.color === ctx.me && p.type !== "k" && atk.has(sq)) hit.push(sq);
    }
    if (hit.length < 2) return null;
    return {
      text: "Two of your pieces are attacked. End this turn with at most one attacked or lose.",
      squares: hit,
      tone: "warn",
    };
  },
});

export const ROYAL_MERIDIAN: Nerf = db({
  id: "wn_royal_meridian", name: "Royal Meridian", tier: 7, icon: "plus", implemented: true,
  description: "Every piece you move must land on your king's file or your king's rank.",
  flavor: "All roads run through the crown.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    const kf = FILE(ks), kr = RANK(ks);
    const ok = moves.filter((m) => FILE(m.to) === kf || RANK(m.to) === kr);
    return ok.length ? ok : moves;
  },
});

export const KINGPIN: Nerf = db({
  id: "wn_kingpin", name: "Kingpin", tier: 7, icon: "crown", implemented: true,
  description: "Only your king may capture. No other piece can make a capture.",
  flavor: "The boss does all the dirty work himself.",
  filterMoves: (moves) => moves.filter((m) => !m.captured || m.piece === "k"),
});

// --------------------------- TIER 8 (unhinged) ---------------------------

export const HOUSE_OF_CARDS: Nerf = db({
  id: "wn_house_of_cards", name: "House of Cards", tier: 8, icon: "layers", implemented: true,
  description: "From your 6th move on, you lose if you end one of your turns with any of your pieces (other than the king) attacked and undefended.",
  flavor: "One loose card and the whole thing falls.",
  // Rebalance 2026-07: judged only after YOUR OWN move. Previously an
  // opponent move that created the attack toppled the house immediately, with
  // no chance to respond; the filter-based sibling no_hanging_pieces (tier 6)
  // at least let you fix things. Now the opponent's threat gives you one turn
  // to defend, trade, or retreat the loose card; failing to end your turn
  // clean is still the promised tier-8 loss.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 5) return null;
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    const me = ctx.me;
    const oppAtk = attackedBy(ctx.board, other(me));
    const myDef = attackedBy(ctx.board, me);
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (!p || p.color !== me || p.type === "k") continue;
      if (oppAtk.has(sq) && !myDef.has(sq)) return { reason: "a piece was left hanging" };
    }
    return null;
  },
  hint: (_s, ctx) => {
    if (ctx.moveNumber < 5) return null;
    const oppAtk = attackedBy(ctx.board, other(ctx.me));
    const myDef = attackedBy(ctx.board, ctx.me);
    const loose: number[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (!p || p.color !== ctx.me || p.type === "k") continue;
      if (oppAtk.has(sq) && !myDef.has(sq)) loose.push(sq);
    }
    if (!loose.length) return null;
    return {
      text: "A card is loose: end this turn with no piece hanging or the house falls.",
      squares: loose,
      tone: "warn",
    };
  },
});

export const GLASS_ARMY: Nerf = db({
  id: "wn_glass_army", name: "Glass Army", tier: 8, icon: "shield-alert", implemented: true,
  description: "You lose the moment the opponent captures any of your non-pawn pieces (knight, bishop, rook, or queen).",
  flavor: "Lose one officer and the whole line breaks.",
  checkLoss: (_s, ctx) => {
    const c = ctx.capturedFromMe;
    return c.n + c.b + c.r + c.q > 0 ? { reason: "an officer was lost" } : null;
  },
});

export const PERFECT_DEFENSE: Nerf = db({
  id: "wn_perfect_defense", name: "Perfect Defense", tier: 8, icon: "shield", implemented: true,
  description: "You can't make any move that leaves one of your pieces (other than the king) standing on a square the enemy attacks, even if it is defended.",
  flavor: "Not a single soldier in the crosshairs.",
  filterMoves: (moves, _s, ctx) => {
    const me = ctx.me;
    const opp = other(me);
    const safe = moves.filter((m) => {
      const nb = makeMove(ctx.board, m);
      const atk = attackedBy(nb, opp);
      for (let sq = 0; sq < 64; sq++) {
        const p = nb.pieces[sq];
        if (p && p.color === me && p.type !== "k" && atk.has(sq)) return false;
      }
      return true;
    });
    return safe.length ? safe : moves;
  },
});

export const FLOOR_IS_LAVA: Nerf = db({
  id: "wn_floor_is_lava", name: "The Floor Is Lava", tier: 8, icon: "flame", implemented: true,
  description: "Each turn, four random ranks turn to lava; you can't move a piece from or onto those ranks this turn.",
  flavor: "Mind your step.",
  init: () => ({ ranks: [] as number[] }),
  onTurnStart: (_s, _ctx, rng) => {
    const set = new Set<number>();
    while (set.size < 4) set.add(rng.int(8));
    return { ranks: Array.from(set) };
  },
  filterMoves: (moves, state) => {
    const s = state as { ranks: number[] };
    const set = new Set(s.ranks);
    const ok = moves.filter((m) => !set.has(RANK(m.from)) && !set.has(RANK(m.to)));
    return ok.length ? ok : moves;
  },
  visual: (state) => {
    const s = state as { ranks: number[] };
    const sqs: number[] = [];
    for (const r of s.ranks) for (let f = 0; f < 8; f++) sqs.push(SQ(f, r));
    return { bannedSquares: sqs };
  },
});

// --------------------------- AGGREGATE ---------------------------

export const WILD_NERFS: Nerf[] = [
  // Tier 1
  MOONLIT_KING, NO_TAKEBACKS, EDGE_SHY_QUEEN, WALLFLOWER,
  // Tier 2
  SABBATH, GENTLE_GIANT, NO_GOING_HOME, KNIGHT_TOLL,
  // Tier 3
  PAWN_SHY, LONELY_KING, SHORT_QUEEN, STAMPEDE, SLOW_START, SLOW_BURN, FLINCH,
  // Tier 4
  WEIGH_STATION, QUARANTINE_ZONE, SHIFTING_SANDS, GLASS_JAW, TAX_SEASON, CURFEW,
  // Tier 5
  GRAVITY, BOTTOM_FEEDER, MIMICRY, FOLLOW_THE_LEADER, BODYGUARD, METEOR_SHOWER,
  // Tier 6
  KINGS_LEASH, REGICIDE_CLOCK, EQUALIZER, DEADLINE_QUEEN, DAISY_CHAIN,
  // Tier 7
  GLASS_QUEEN, PIN_CUSHION, ROYAL_MERIDIAN, KINGPIN,
  // Tier 8
  HOUSE_OF_CARDS, GLASS_ARMY, PERFECT_DEFENSE, FLOOR_IS_LAVA,
];
