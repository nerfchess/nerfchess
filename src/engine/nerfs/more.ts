import { Nerf } from "../nerf";
import { attackedBy, findKing, initialBoard, isInCheck, makeMove } from "../board";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, squareName } from "../types";

const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

const adj = (a: Square, b: Square) =>
  a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;

const PIECE_VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function db(d: Nerf): Nerf {
  return { ...d, implemented: true };
}

// Replays `count` half-moves from the initial position. Used by nerfs that
// need to inspect a past position (e.g. "did my last move give check?").
function boardAfter(history: Move[], count: number): BoardState {
  let board = initialBoard();
  for (let i = 0; i < count && i < history.length; i++) {
    board = makeMove(board, history[i]);
  }
  return board;
}

function pieceSquares(board: { pieces: ({ type: PieceType; color: Color } | null)[] }, color: Color, type?: PieceType) {
  const out: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p) continue;
    if (p.color === color && (!type || p.type === type)) out.push(sq);
  }
  return out;
}

// Squares of the opponent pieces currently giving check to `me`'s king.
// Rays are cast outward from the king so each slider ray stops at its first
// blocker (no x-raying). Used by Battle Fatigue to always allow capturing a
// checker.
function checkingSquares(board: BoardState, me: Color): Set<number> {
  const out = new Set<number>();
  const ks = findKing(board, me);
  if (ks == null) return out;
  const opp: Color = me === "w" ? "b" : "w";
  const kf = FILE(ks), kr = RANK(ks);
  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  for (const [df, dr] of KNIGHT) {
    const f = kf + df, r = kr + dr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = board.pieces[SQ(f, r)];
    if (p && p.color === opp && p.type === "n") out.add(SQ(f, r));
  }
  const oppDir = opp === "w" ? 1 : -1;
  for (const df of [-1, 1]) {
    const f = kf + df, r = kr - oppDir;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = board.pieces[SQ(f, r)];
    if (p && p.color === opp && p.type === "p") out.add(SQ(f, r));
  }
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [df, dr] of DIAG) {
    let f = kf + df, r = kr + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const p = board.pieces[SQ(f, r)];
      if (p) { if (p.color === opp && (p.type === "b" || p.type === "q")) out.add(SQ(f, r)); break; }
      f += df; r += dr;
    }
  }
  for (const [df, dr] of ORTH) {
    let f = kf + df, r = kr + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const p = board.pieces[SQ(f, r)];
      if (p) { if (p.color === opp && (p.type === "r" || p.type === "q")) out.add(SQ(f, r)); break; }
      f += df; r += dr;
    }
  }
  return out;
}

// ------------------------- NERFS -------------------------

export const ROOK_BUDDIES: Nerf = db({
  id: "rook_buddies", name: "Rook Buddies", tier: 3, icon: "link", implemented: true,
  description: "Your rooks can't move while any piece sits between them on your home rank; clear the back rank between them first.",
  filterMoves: (moves, _s, ctx) => {
    const homeR = ctx.me === "w" ? 0 : 7;
    const rooks = pieceSquares(ctx.board, ctx.me, "r").filter((sq) => RANK(sq) === homeR);
    // The lock only bites while two rooks still sit on the home rank with a
    // piece between them. A lone rook, or one already developed off the home
    // rank, is always free: freezing it would strand that rook for the rest of
    // the game (the earlier version blanket-froze every rook whenever fewer
    // than two sat home).
    if (rooks.length < 2) return moves;
    rooks.sort((a, b) => FILE(a) - FILE(b));
    const [a, b] = [rooks[0], rooks[rooks.length - 1]];
    let blocked = false;
    for (let f = FILE(a) + 1; f < FILE(b); f++) {
      if (ctx.board.pieces[SQ(f, homeR)]) { blocked = true; break; }
    }
    return blocked ? moves.filter((m) => m.piece !== "r") : moves;
  },
});

export const SEPARATION_ANXIETY: Nerf = db({
  id: "separation_anxiety", name: "Separation Anxiety", tier: 2, icon: "shield", implemented: true,
  description: "Pawns adjacent to your king can't move away from him.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    return moves.filter((m) => {
      if (m.piece !== "p") return true;
      if (!adj(m.from, ks)) return true;
      return adj(m.to, ks);
    });
  },
});

export const CROSSING_THE_RUBICON: Nerf = db({
  id: "crossing_the_rubicon", name: "Crossing the Rubicon", tier: 2, implemented: true,
  description: "Once a piece crosses to the opponent's half, it can't return.",
  filterMoves: (moves, _s, ctx) => {
    const oppHalf = (sq: number) => (ctx.me === "w" ? RANK(sq) >= 4 : RANK(sq) <= 3);
    return moves.filter((m) => !(oppHalf(m.from) && !oppHalf(m.to)));
  },
});

export const QUEEN_DISGUISE: Nerf = db({
  id: "queen_disguise", name: "Queen Disguise", tier: 3, implemented: true,
  description: "Your queen is secretly either a rook or a bishop. Once you move it like one, you can't move it like the other.",
  init: () => ({ locked: null as "r" | "b" | null }),
  onTurnStart: (state, ctx) => {
    const s = state as { locked: "r" | "b" | null };
    if (s.locked) return s;
    const last = [...ctx.board.history].reverse().find((m) => m.color === ctx.me && m.piece === "q");
    if (!last) return s;
    const straight = FILE(last.from) === FILE(last.to) || RANK(last.from) === RANK(last.to);
    return { locked: straight ? "r" : "b" };
  },
  filterMoves: (moves, state) => {
    const s = state as { locked: "r" | "b" | null };
    return moves.filter((m) => {
      if (m.piece !== "q") return true;
      const straight = FILE(m.from) === FILE(m.to) || RANK(m.from) === RANK(m.to);
      if (s.locked === "r") return straight;
      if (s.locked === "b") return !straight;
      return true;
    });
  },
});

export const QUEEN_BEE: Nerf = db({
  id: "queen_bee", name: "Queen Bee", tier: 2, implemented: true,
  description: "Once you capture with your queen, you can no longer move queens. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const captured = ctx.board.history.some((m) => m.color === ctx.me && m.piece === "q" && m.captured);
    return captured ? moves.filter((m) => m.piece !== "q") : moves;
  },
});

export const ENTRENCHED: Nerf = db({
  id: "entrenched", name: "Entrenched", tier: 4, implemented: true,
  description: "Rooks can't move more than 2 squares.",
  filterMoves: (moves) => moves.filter((m) => m.piece !== "r" || cheb(m.from, m.to) <= 2),
});

export const QUIT_HORSING_AROUND: Nerf = db({
  id: "quit_horsing_around", name: "Quit Horsing Around", tier: 2, implemented: true,
  description: "If you moved a knight last move, you can't move a knight this move.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.myLastMove?.piece === "n") return moves.filter((m) => m.piece !== "n");
    return moves;
  },
});

export const ROYAL_JUBILEE: Nerf = db({
  id: "royal_jubilee", name: "Royal Jubilee", tier: 4, implemented: true,
  description: "Whenever you capture a non-pawn, you must move your king or queen on the next move.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last || !last.captured || last.captured === "p" || last.captured === "k") return moves;
    const royal = moves.filter((m) => m.piece === "k" || m.piece === "q");
    return royal.length ? royal : moves;
  },
});

export const PRIMA_DONNA: Nerf = db({
  id: "prima_donna", name: "Prima Donna", tier: 2, implemented: true,
  description: "Can't have more than one pawn on the same file, except one open file may hold doubled pawns: the file of your most advanced pawn (ties break to the lower file).",
  filterMoves: (moves, _s, ctx) => {
    // One exempt ("open") file where doubling is allowed. A defender choice flow
    // is not practical here, so we pick deterministically: the file of the most
    // advanced pawn (the defender's most valuable affected pawn, nearest
    // promotion); ties break to the lower file.
    const pawns = pieceSquares(ctx.board, ctx.me, "p");
    let exemptFile = -1;
    let bestAdv = -1;
    for (const sq of pawns) {
      const adv = ctx.me === "w" ? RANK(sq) : 7 - RANK(sq);
      if (adv > bestAdv || (adv === bestAdv && (exemptFile === -1 || FILE(sq) < exemptFile))) {
        bestAdv = adv;
        exemptFile = FILE(sq);
      }
    }
    return moves.filter((m) => {
      if (m.piece !== "p") return true;
      if (FILE(m.from) === FILE(m.to)) return true; // same file, fine
      if (FILE(m.to) === exemptFile) return true; // the open file may double
      // Moving to a new file: check destination file has no other pawn (other than this)
      for (let r = 0; r < 8; r++) {
        const sq = SQ(FILE(m.to), r);
        if (sq === m.from) continue;
        const p = ctx.board.pieces[sq];
        if (p && p.type === "p" && p.color === ctx.me) return false;
      }
      return true;
    });
  },
});

export const SEPARATION_CHURCH_STATE: Nerf = db({
  id: "separation_church_state", name: "Separation of Church and State", tier: 2, implemented: true,
  description: "Can't move bishops next to a king and can't move king next to a bishop.",
  filterMoves: (moves, _s, ctx) => {
    return moves.filter((m) => {
      if (m.piece === "b") {
        for (let sq = 0; sq < 64; sq++) {
          const p = ctx.board.pieces[sq];
          if (p && p.type === "k" && adj(sq, m.to)) return false;
        }
      }
      if (m.piece === "k") {
        for (let sq = 0; sq < 64; sq++) {
          if (sq === m.from) continue;
          const p = ctx.board.pieces[sq];
          if (p && p.type === "b" && adj(sq, m.to)) return false;
        }
      }
      return true;
    });
  },
});

export const ESCORT_MISSION: Nerf = db({
  id: "escort_mission", name: "Escort Mission", tier: 1, implemented: true,
  description: "If your king can capture, it must. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const kingCaps = moves.filter((m) => m.piece === "k" && m.captured);
    return kingCaps.length ? kingCaps : moves;
  },
});

export const BATTLE_FATIGUE: Nerf = db({
  id: "battle_fatigue", name: "Battle Fatigue", tier: 2, implemented: true,
  description: "After a piece captures, it can't capture again until it makes a non-capturing move. Capturing a piece that is checking your king is always allowed.",
  filterMoves: (moves, _s, ctx) => {
    // A piece at square sq is fatigued if its most recent move was a capture.
    const fatigued = new Set<number>();
    const history = ctx.board.history;
    // Walk in reverse and track the most recent move per "tracked" square
    const seen = new Set<number>();
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (m.color !== ctx.me) continue;
      if (seen.has(m.to)) continue;
      seen.add(m.to);
      if (m.captured) fatigued.add(m.to);
    }
    // A fatigued piece may still capture a piece that is checking our king.
    const checkers = checkingSquares(ctx.board, ctx.me);
    return moves.filter((m) => {
      if (!m.captured) return true;
      if (!fatigued.has(m.from)) return true;
      const capSq = m.capturedSquare ?? m.to;
      return checkers.has(capSq);
    });
  },
});

export const SNIPERS: Nerf = db({
  id: "snipers", name: "Snipers", tier: 4, implemented: true,
  description: "Bishops can only capture from distance ≥ 4.",
  filterMoves: (moves) =>
    moves.filter((m) => !(m.piece === "b" && m.captured && cheb(m.from, m.to) < 4)),
});

export const DIPLOMATIC_IMMUNITY: Nerf = db({
  id: "diplomatic_immunity", name: "Diplomatic Immunity", tier: 3, implemented: true,
  description: "Can't capture a piece that just moved, unless that move was a capture. While your king is in check, this restriction is paused for the move.",
  filterMoves: (moves, _s, ctx) => {
    if (isInCheck(ctx.board, ctx.me)) return moves;
    const last = ctx.opponentLastMove;
    if (!last || last.captured) return moves;
    return moves.filter((m) => !(m.captured && m.to === last.to));
  },
});

export const FEMME_FATALE: Nerf = db({
  id: "femme_fatale", name: "Femme Fatale", tier: 3, implemented: true,
  description: "You can only capture the enemy king with your queen.",
  filterMoves: (moves) =>
    moves.filter((m) => !(m.captured === "k" && m.piece !== "q")),
});

export const GET_DOWN_MR_PRESIDENT: Nerf = db({
  id: "get_down_mr_president", name: "Get Down Mr. President", tier: 5, implemented: true,
  description: "Can't move your king while in check.",
  filterMoves: (moves, _s, ctx) =>
    isInCheck(ctx.board, ctx.me) ? moves.filter((m) => m.piece !== "k") : moves,
});

export const POWER_CELLS: Nerf = db({
  id: "power_cells", name: "Power Cells", tier: 5, implemented: true,
  description: "Can't move a piece farther than the number of pawns you have.",
  filterMoves: (moves, _s, ctx) => {
    const pawns = pieceSquares(ctx.board, ctx.me, "p").length;
    const within = moves.filter((m) => cheb(m.from, m.to) <= pawns);
    return within.length ? within : moves;
  },
});

export const UNSPOOLING: Nerf = db({
  id: "unspooling", name: "Unspooling", tier: 6, implemented: true,
  description: "Total move distance budget = 100. When you run out, you lose.",
  progress: (state) => {
    const s = state as { used: number };
    const used = Math.min(s.used ?? 0, 100);
    return { value: used, max: 100, label: `${used}/100 distance used` };
  },
  init: () => ({ used: 0 }),
  onTurnStart: (_s, ctx) => {
    let used = 0;
    for (const m of ctx.board.history) if (m.color === ctx.me) used += cheb(m.from, m.to);
    return { used };
  },
  filterMoves: (moves, state) => {
    const s = state as { used: number };
    const remaining = 100 - s.used;
    return moves.filter((m) => cheb(m.from, m.to) <= remaining);
  },
  checkLoss: (_state, ctx) => {
    // Recompute the spent distance fresh from history rather than reading the
    // onTurnStart-maintained state, which is one move stale at loss-check time
    // and would let the player keep moving (and even steal a king capture) for
    // an extra move after the budget is spent. Mirrors onTurnStart's tally.
    let used = 0;
    for (const m of ctx.board.history) if (m.color === ctx.me) used += cheb(m.from, m.to);
    return used >= 100 ? { reason: "out of distance" } : null;
  },
});

export const EVIL_TWIN: Nerf = db({
  id: "evil_twin", name: "Evil Twin", tier: 3, implemented: true,
  description: "If you can capture a piece with a same-type piece, you must. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const twins = moves.filter((m) => m.captured && m.piece === m.captured);
    return twins.length ? twins : moves;
  },
});

export const DOCTOR_OCTOPUS: Nerf = db({
  id: "doctor_octopus", name: "Doctor Octopus", tier: 5, implemented: true,
  description: "Can only capture non-king pieces 8 times total.",
  progress: (_s, ctx) => {
    const caps = ctx.board.history.filter((m) => m.color === ctx.me && m.captured && m.captured !== "k").length;
    return { value: Math.min(caps, 8), max: 8, label: `${Math.min(caps, 8)}/8 captures used` };
  },
  filterMoves: (moves, _s, ctx) => {
    const caps = ctx.board.history.filter((m) => m.color === ctx.me && m.captured && m.captured !== "k").length;
    if (caps >= 8) return moves.filter((m) => !m.captured || m.captured === "k");
    return moves;
  },
});

export const PROTECTED_PAWNS: Nerf = db({
  id: "protected_pawns", name: "Protected Pawns", tier: 3, implemented: true,
  description: "Can only move pawns to defended squares.",
  filterMoves: (moves, _s, ctx) => {
    const myAttacks = attackedBy(ctx.board, ctx.me);
    return moves.filter((m) => m.piece !== "p" || myAttacks.has(m.to));
  },
});

export const JUST_PASSING_THROUGH: Nerf = db({
  id: "just_passing_through", name: "Just Passing Through", tier: 2, implemented: true,
  description: "Can't capture on a fixed random rank, shown on the board. The restriction never leaves you fewer than three legal moves.",
  init: (rng) => ({ rank: rng.int(8) }),
  filterMoves: (moves, state) => {
    const s = state as { rank: number };
    const filtered = moves.filter((m) => !(m.captured && RANK(m.to) === s.rank));
    return filtered.length >= 3 ? filtered : moves;
  },
  visual: (state) => {
    const r = (state as { rank: number }).rank;
    const sqs: number[] = [];
    for (let f = 0; f < 8; f++) sqs.push(SQ(f, r));
    return { highlightSquares: sqs };
  },
  hint: (state) => {
    const r = (state as { rank: number }).rank;
    return { text: `No captures on rank ${r + 1} this game.`, tone: "info" };
  },
});

export const REMORSEFUL: Nerf = db({
  id: "remorseful", name: "Remorseful", tier: 4, implemented: true,
  description: "Can't capture twice in a row.",
  filterMoves: (moves, _s, ctx) =>
    ctx.myLastMove?.captured ? moves.filter((m) => !m.captured) : moves,
});

export const SHAPESHIFTER: Nerf = db({
  id: "shapeshifter", name: "Shapeshifter", tier: 4, implemented: true,
  description: "For your first 3 moves the queen moves normally. From then on she is a bishop; capturing a non-pawn turns her into a copy of that piece, and capturing a knight freezes her.",
  init: () => ({ form: "b" as PieceType, frozen: false }),
  onTurnStart: (state, ctx) => {
    let form: PieceType = "b";
    let frozen = false;
    for (const m of ctx.board.history) {
      if (m.color !== ctx.me) continue;
      if (m.piece === "q" && m.captured && m.captured !== "p" && m.captured !== "k") {
        form = m.captured;
        if (m.captured === "n") frozen = true;
      }
    }
    void state;
    return { form, frozen };
  },
  filterMoves: (moves, state, ctx) => {
    if (ctx.moveNumber < 3) return moves; // activation delayed until after your move 3
    const s = state as { form: PieceType; frozen: boolean };
    return moves.filter((m) => {
      if (m.piece !== "q") return true;
      if (s.frozen) return false;
      const df = Math.abs(FILE(m.to) - FILE(m.from));
      const dr = Math.abs(RANK(m.to) - RANK(m.from));
      if (s.form === "b") return df === dr;
      if (s.form === "r") return df === 0 || dr === 0;
      if (s.form === "n") return (df === 1 && dr === 2) || (df === 2 && dr === 1);
      return true;
    });
  },
});

export const HORSE_EATS_FIRST: Nerf = db({
  id: "horse_eats_first", name: "Horse Eats First", tier: 5, implemented: true,
  description: "As long as you have a knight, you can only capture with knights. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const hasKnight = pieceSquares(ctx.board, ctx.me, "n").length > 0;
    if (!hasKnight) return moves;
    return moves.filter((m) => !m.captured || m.piece === "n");
  },
});

export const WINDUP_TOYS: Nerf = db({
  id: "windup_toys", name: "Windup Toys", tier: 5, implemented: true,
  description: "After move 12, can't move knights or bishops.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 12) return moves;
    return moves.filter((m) => m.piece !== "n" && m.piece !== "b");
  },
});

export const ABSTINENCE: Nerf = db({
  id: "abstinence", name: "Abstinence", tier: 7, implemented: true,
  description: "If your opponent ever has two same-type non-pawns adjacent inside your half of the board, you lose.",
  // Rebalance 2026-07: the pair now only counts when BOTH pieces stand in your
  // half. The old board-wide trigger fired on completely ordinary opponent
  // play in their own camp (connected rooks on the back rank, doubled rooks on
  // a file) with zero counterplay for the owner. Restricted to your half, the
  // owner can actually fight it: contest invading pieces and break up pairs
  // before they settle. Still tier 7.
  checkLoss: (_s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const inMyHalf = (sq: number) => (ctx.me === "w" ? RANK(sq) <= 3 : RANK(sq) >= 4);
    for (let a = 0; a < 64; a++) {
      const pa = ctx.board.pieces[a];
      if (!pa || pa.color !== opp || pa.type === "p" || pa.type === "k") continue;
      if (!inMyHalf(a)) continue;
      for (let b = a + 1; b < 64; b++) {
        const pb = ctx.board.pieces[b];
        if (!pb || pb.color !== opp || pb.type !== pa.type) continue;
        if (inMyHalf(b) && adj(a, b)) return { reason: "two same-type invaders paired up in your half" };
      }
    }
    return null;
  },
});

export const YOU_BEST_NOT_MISS: Nerf = db({
  id: "you_best_not_miss", name: "You Best Not Miss", tier: 6, implemented: true,
  description: "If you end your turn giving check, you must capture the king next turn or lose.",
  init: () => ({ owed: false }),
  onTurnStart: (_s, ctx) => {
    // Replay to the position right after my last move and see whether it left
    // the opponent in check. If so, this turn's move must capture their king.
    const h = ctx.board.history;
    let lastMineIdx = -1;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].color === ctx.me) { lastMineIdx = i; break; }
    }
    if (lastMineIdx < 0) return { owed: false };
    const after = boardAfter(h, lastMineIdx + 1);
    const opp = ctx.me === "w" ? "b" : "w";
    return { owed: isInCheck(after, opp) };
  },
  checkLoss: (state, ctx) => {
    const s = state as { owed: boolean };
    if (!s.owed) return null;
    // Judged immediately after my move (a king capture would already have
    // ended the game via the king-capture check, which runs first).
    const last = ctx.board.history[ctx.board.history.length - 1];
    if (!last || last.color !== ctx.me) return null;
    return last.captured === "k" ? null : { reason: "checked but didn't finish the king" };
  },
  hint: (state) => {
    const s = state as { owed: boolean };
    if (!s.owed) return null;
    return { text: "You gave check. Capture the king this turn or lose.", tone: "warn" };
  },
});

export const EYE_OF_SAURON: Nerf = db({
  id: "eye_of_sauron", name: "Eye of Sauron", tier: 6, implemented: true,
  description: "As long as you have a rook, non-pawns can't go past the rook's farthest sight.",
  filterMoves: (moves, _s, ctx) => {
    const rooks = pieceSquares(ctx.board, ctx.me, "r");
    if (!rooks.length) return moves;
    let maxRank = ctx.me === "w" ? 0 : 7;
    for (const rsq of rooks) {
      // farthest forward rank reachable by ray
      const f = FILE(rsq);
      const dir = ctx.me === "w" ? 1 : -1;
      let r = RANK(rsq);
      while (true) {
        const nr = r + dir;
        if (nr < 0 || nr > 7) break;
        const t = SQ(f, nr);
        r = nr;
        if (ctx.board.pieces[t]) break;
      }
      if (ctx.me === "w") maxRank = Math.max(maxRank, r);
      else maxRank = Math.min(maxRank, r);
    }
    return moves.filter((m) => {
      if (m.piece === "p") return true;
      if (ctx.me === "w") return RANK(m.to) <= maxRank;
      return RANK(m.to) >= maxRank;
    });
  },
});

export const SAVIOR_COMPLEX: Nerf = db({
  id: "savior_complex", name: "Savior Complex", tier: 6, implemented: true,
  description: "When in check, must move your queen, or lose.",
  filterMoves: (moves, _s, ctx) => {
    if (!isInCheck(ctx.board, ctx.me)) return moves;
    const q = moves.filter((m) => m.piece === "q");
    return q.length ? q : moves;
  },
  checkLoss: (_s, ctx) => {
    if (!isInCheck(ctx.board, ctx.me)) return null;
    const q = pieceSquares(ctx.board, ctx.me, "q");
    return q.length ? null : { reason: "in check without queen" };
  },
});

export const RECONNAISSANCE: Nerf = db({
  id: "reconnaissance", name: "Reconnaissance", tier: 6, implemented: true,
  description: "Start unable to capture. After seeing each opponent piece type move, you may capture that type.",
  init: () => ({ known: [] as PieceType[] }),
  onTurnStart: (_s, ctx) => {
    const known = new Set<PieceType>();
    for (const m of ctx.board.history) if (m.color !== ctx.me) known.add(m.piece);
    return { known: Array.from(known) };
  },
  filterMoves: (moves, state) => {
    const s = state as { known: PieceType[] };
    return moves.filter((m) => !m.captured || s.known.includes(m.captured));
  },
});

export const CONTROL_CENTER: Nerf = db({
  id: "control_center", name: "Control Center", tier: 4, implemented: true,
  description: "Non-capturing moves must go to files c, d, e, or f, unless the piece already starts on those files, in which case it may leave normally.",
  filterMoves: (moves) =>
    moves.filter(
      (m) =>
        m.captured ||
        (FILE(m.from) >= 2 && FILE(m.from) <= 5) ||
        (FILE(m.to) >= 2 && FILE(m.to) <= 5),
    ),
});

export const HAUNTED: Nerf = db({
  id: "haunted", name: "Haunted", tier: 4, implemented: true,
  description: "Can't move to a square where you've previously captured.",
  filterMoves: (moves, _s, ctx) => {
    const haunted = new Set<number>();
    for (const m of ctx.board.history) if (m.color === ctx.me && m.captured) haunted.add(m.to);
    return moves.filter((m) => !haunted.has(m.to));
  },
});

export const TOWER_DEFENSE: Nerf = db({
  id: "tower_defense", name: "Tower Defense", tier: 6, implemented: true,
  description: "Can't move rooks. If you lose all rooks, you lose.",
  filterMoves: (moves) => moves.filter((m) => m.piece !== "r"),
  checkLoss: (_s, ctx) =>
    pieceSquares(ctx.board, ctx.me, "r").length === 0 && ctx.moveNumber > 0
      ? { reason: "all rooks lost" }
      : null,
});

export const PARANOID: Nerf = db({
  id: "paranoid", name: "Paranoid", tier: 6, implemented: true,
  description: "Your king must always be defended, or you lose.",
  checkLoss: (_s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    if (ctx.moveNumber === 0) return null;
    const defenders = attackedBy(ctx.board, ctx.me);
    return defenders.has(ks) ? null : { reason: "king undefended" };
  },
});

export const BIPARTISANSHIP: Nerf = db({
  id: "bipartisanship", name: "Bipartisanship", tier: 5, implemented: true,
  description: "Can't move left twice in a row or right twice in a row.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const lastDx = FILE(last.to) - FILE(last.from);
    if (lastDx === 0) return moves;
    const sign = Math.sign(lastDx);
    return moves.filter((m) => Math.sign(FILE(m.to) - FILE(m.from)) !== sign);
  },
});

export const SHELLSHOCKED: Nerf = db({
  id: "shellshocked", name: "Shellshocked", tier: 4, implemented: true,
  description: "When opponent captures, pieces adjacent to the captured square can't move next turn.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last || !last.captured) return moves;
    const center = last.capturedSquare ?? last.to;
    return moves.filter((m) => !adj(m.from, center));
  },
});

export const COMFORT_ZONE: Nerf = db({
  id: "comfort_zone", name: "Comfort Zone", tier: 3, implemented: true,
  description: "If at least three of your moves reach the revealed random square, you must move to it. Next turn's square is shown a turn early.",
  init: (rng) => ({ target: rng.int(64), next: rng.int(64) }),
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { target: number; next: number };
    return { target: s.next, next: rng.int(64) };
  },
  filterMoves: (moves, state) => {
    const s = state as { target: number };
    const hits = moves.filter((m) => m.to === s.target);
    return hits.length >= 3 ? hits : moves;
  },
  visual: (state) => ({ highlightSquares: [(state as { target: number }).target] }),
  hint: (state) => {
    const s = state as { target: number; next: number };
    return { text: `Comfort zone: this turn ${squareName(s.target)}, next turn ${squareName(s.next)}.`, tone: "info" };
  },
});

export const LETHAL_ATTRACTION: Nerf = db({
  id: "lethal_attraction", name: "Lethal Attraction", tier: 4, implemented: true,
  description: "Can't make moves that move a piece farther from opponent's king than it started.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const oks = findKing(ctx.board, opp);
    if (oks == null) return moves;
    return moves.filter((m) => cheb(m.to, oks) <= cheb(m.from, oks));
  },
});

export const MODEST: Nerf = db({
  id: "modest", name: "Modest", tier: 6, implemented: true,
  description: "Lose if you have more pieces than opponent.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const opp = ctx.me === "w" ? "b" : "w";
    const mine = pieceSquares(ctx.board, ctx.me).length;
    const theirs = pieceSquares(ctx.board, opp).length;
    return mine > theirs ? { reason: "outnumber opponent" } : null;
  },
});

export const TRIPLE_PLAY: Nerf = db({
  id: "triple_play", name: "Triple Play", tier: 5, implemented: true,
  description: "Can only capture the enemy king while you have 3 of a set piece type, shown from the start. The restriction is dropped whenever it would leave you fewer than three legal moves.",
  init: (rng) => ({ type: rng.pick(["n", "b", "r"] as PieceType[]) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { type: PieceType };
    const count = pieceSquares(ctx.board, ctx.me, s.type).length;
    if (count >= 3) return moves;
    const filtered = moves.filter((m) => m.captured !== "k");
    return filtered.length >= 3 ? filtered : moves;
  },
  // Reveal the random restriction up front (a turn ahead of when it can matter):
  // name the piece type you must collect three of.
  hint: (state, ctx) => {
    const s = state as { type: PieceType };
    const names: Record<PieceType, string> = {
      p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "kings",
    };
    const count = pieceSquares(ctx.board, ctx.me, s.type).length;
    return {
      text: `You may only capture the enemy king while you hold three ${names[s.type]} (you have ${count}).`,
      tone: count >= 3 ? "info" : "warn",
    };
  },
});

export const SIBLING_RIVALRY: Nerf = db({
  id: "sibling_rivalry", name: "Sibling Rivalry", tier: 4, implemented: true,
  description: "Can't move a piece adjacent to an opponent's piece of same type.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    return moves.filter((m) => {
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.board.pieces[sq];
        if (p && p.color === opp && p.type === m.piece && adj(sq, m.from)) return false;
      }
      return true;
    });
  },
});

export const TORCHLIGHT: Nerf = db({
  id: "torchlight", name: "Torchlight", tier: 6, implemented: true,
  description: "Non-pawns can only move if start or end square is adjacent to one of your pawns.",
  filterMoves: (moves, _s, ctx) => {
    const pawns = pieceSquares(ctx.board, ctx.me, "p");
    return moves.filter((m) => {
      if (m.piece === "p") return true;
      return pawns.some((ps) => adj(ps, m.from) || adj(ps, m.to));
    });
  },
});

export const TURN_OTHER_CHEEK: Nerf = db({
  id: "turn_other_cheek", name: "Turn the Other Cheek", tier: 5, implemented: true,
  description: "Can't recapture.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last || !last.captured) return moves;
    return moves.filter((m) => !(m.captured && m.to === last.to));
  },
});

export const GAMBLER: Nerf = db({
  id: "gambler", name: "Gambler", tier: 4, implemented: true,
  description: "Can't move a specific piece type, re-randomized each turn and revealed one turn early. The ban is dropped whenever it would leave you fewer than three legal moves.",
  init: (rng) => ({
    banned: rng.pick(["p", "n", "b", "r", "q", "k"] as PieceType[]),
    next: rng.pick(["p", "n", "b", "r", "q", "k"] as PieceType[]),
  }),
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { banned: PieceType; next: PieceType };
    return { banned: s.next, next: rng.pick(["p", "n", "b", "r", "q", "k"] as PieceType[]) };
  },
  filterMoves: (moves, state) => {
    const s = state as { banned: PieceType };
    const filtered = moves.filter((m) => m.piece !== s.banned);
    return filtered.length >= 3 ? filtered : moves;
  },
  hint: (state) => {
    const s = state as { banned: PieceType; next: PieceType };
    const names: Record<PieceType, string> = {
      p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "your king",
    };
    return { text: `The dice say: no moving ${names[s.banned]} this turn, ${names[s.next]} next turn.`, tone: "warn" };
  },
});

export const BLINDED_BY_SUN: Nerf = db({
  id: "blinded_by_sun", name: "Blinded by the Sun", tier: 3, implemented: true,
  description: "Can't end your turn attacking a fixed random square, shown on the board. The restriction never leaves you fewer than three legal moves.",
  init: (rng) => ({ sq: rng.int(64) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { sq: number };
    const legal = moves.filter((m) => {
      const nb = makeMove(ctx.board, m);
      return !attackedBy(nb, ctx.me).has(s.sq);
    });
    return legal.length >= 3 ? legal : moves;
  },
  visual: (state) => ({ bannedSquares: [(state as { sq: number }).sq] }),
  hint: (state) => ({ text: `Don't end your turn attacking ${squareName((state as { sq: number }).sq)}.`, tone: "info" }),
});

export const BISHOP_FAN_CLUB: Nerf = db({
  id: "bishop_fan_club", name: "Bishop Fan Club", tier: 5, implemented: true,
  description: "Must promote to bishops. King and queen can only move diagonally.",
  filterMoves: (moves) =>
    moves.filter((m) => {
      if (m.promotion && m.promotion !== "b") return false;
      if (m.piece === "k" || m.piece === "q") {
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        if (df !== dr) return false;
      }
      return true;
    }),
});

export const CHIVALRY: Nerf = db({
  id: "chivalry", name: "Chivalry", tier: 4, implemented: true,
  description: "Can only capture heavies (rooks, queens) with a knight. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    return moves.filter((m) => !((m.captured === "r" || m.captured === "q") && m.piece !== "n"));
  },
});

export const SPREAD_OUT: Nerf = db({
  id: "spread_out", name: "Spread Out", tier: 6, implemented: true,
  description: "Can't move a non-pawn adjacent to another of your non-pawns. Can't castle.",
  filterMoves: (moves, _s, ctx) =>
    moves.filter((m) => {
      if (m.castle) return false;
      if (m.piece === "p") return true;
      for (let sq = 0; sq < 64; sq++) {
        if (sq === m.from) continue;
        const p = ctx.board.pieces[sq];
        if (p && p.color === ctx.me && p.type !== "p" && adj(sq, m.to)) return false;
      }
      return true;
    }),
});

export const PEONS_FIRST: Nerf = db({
  id: "peons_first", name: "Peons First", tier: 4, implemented: true,
  description: "Can't move pieces that are one square behind one of your pawns.",
  filterMoves: (moves, _s, ctx) => {
    const dir = ctx.me === "w" ? 1 : -1;
    return moves.filter((m) => {
      const aheadR = RANK(m.from) + dir;
      if (aheadR < 0 || aheadR > 7) return true;
      const aheadSq = SQ(FILE(m.from), aheadR);
      const p = ctx.board.pieces[aheadSq];
      return !(p && p.color === ctx.me && p.type === "p");
    });
  },
});

export const MOVING_DAY: Nerf = db({
  id: "moving_day", name: "Moving Day", tier: 4, implemented: true,
  description: "After turn 20, no piece may be on your home row.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 3) return null; // activation delayed until after your move 3
    if (ctx.moveNumber < 20) return null;
    const homeR = ctx.me === "w" ? 0 : 7;
    for (let f = 0; f < 8; f++) {
      const p = ctx.board.pieces[SQ(f, homeR)];
      if (p && p.color === ctx.me) return { reason: "piece on home row" };
    }
    return null;
  },
});

export const ODDBALL: Nerf = db({
  id: "oddball", name: "Oddball", tier: 4, implemented: true,
  description: "Can only capture on odd-numbered moves.",
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1; // 1-indexed move I'm about to make
    if (turn % 2 === 1) return moves;
    return moves.filter((m) => !m.captured);
  },
});

export const EVEN_KEELED: Nerf = db({
  id: "even_keeled", name: "Even Keeled", tier: 5, implemented: true,
  description: "Can only capture on even-numbered moves.",
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 2 === 0) return moves;
    return moves.filter((m) => !m.captured);
  },
});

export const SOCIAL_DISTANCING: Nerf = db({
  id: "social_distancing", name: "Social Distancing", tier: 4, implemented: true,
  description: "Can't make non-capturing moves to squares adjacent to opponent pieces. The forbidden ring around enemy pieces is shown on the board.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    return moves.filter((m) => {
      if (m.captured) return true;
      for (let sq = 0; sq < 64; sq++) {
        const p = ctx.board.pieces[sq];
        if (p && p.color === opp && adj(sq, m.to)) return false;
      }
      return true;
    });
  },
  // Reveal the restricted region: every square adjacent to an enemy piece.
  visual: (_s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const ring = new Set<number>();
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (!p || p.color !== opp) continue;
      const f0 = FILE(sq), r0 = RANK(sq);
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        const f = f0 + df, r = r0 + dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) continue;
        ring.add(SQ(f, r));
      }
    }
    return { bannedSquares: Array.from(ring) };
  },
});

export const DRAG: Nerf = db({
  id: "drag", name: "Drag", tier: 6, implemented: true,
  description: "Your queen is now royal: if it is captured, you lose.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    return pieceSquares(ctx.board, ctx.me, "q").length === 0
      ? { reason: "queen-king captured" }
      : null;
  },
});

export const STIR_CRAZY: Nerf = db({
  id: "stir_crazy", name: "Stir Crazy", tier: 3, implemented: true,
  description: "If you haven't moved your king for 4 turns, you must on the 5th.",
  filterMoves: (moves, _s, ctx) => {
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    let sinceKing = 0;
    for (let i = mine.length - 1; i >= 0; i--) {
      if (mine[i].piece === "k") break;
      sinceKing++;
    }
    if (sinceKing < 4) return moves;
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const ROOK_ON_SEVENTH: Nerf = db({
  id: "rook_on_seventh", name: "Rook on the Seventh", tier: 5, implemented: true,
  description: "By move 15, you must get a rook to your 7th rank. Once a rook has reached it, that rook may leave normally without breaking the pledge.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 15) return null;
    const targetR = ctx.me === "w" ? 6 : 1;
    for (let f = 0; f < 8; f++) {
      const p = ctx.board.pieces[SQ(f, targetR)];
      if (p && p.color === ctx.me && p.type === "r") return null;
    }
    // A rook already inside the region may leave normally: once any rook of
    // yours has ever landed on the 7th rank, the pledge stays satisfied.
    const everReached = ctx.board.history.some(
      (m) => m.color === ctx.me && m.piece === "r" && RANK(m.to) === targetR,
    );
    if (everReached) return null;
    return { reason: "no rook on seventh" };
  },
});

export const GUERILLA_TACTICS: Nerf = db({
  id: "guerilla_tactics", name: "Guerilla Tactics", tier: 6, implemented: true,
  description: "After a capturing move, you must return the capturing piece to its previous square if possible.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last || !last.captured) return moves;
    const required = moves.filter((m) => m.from === last.to && m.to === last.from);
    return required.length ? required : moves;
  },
});

export const CHEERLEADERS: Nerf = db({
  id: "cheerleaders", name: "Cheerleaders", tier: 4, implemented: true,
  description: "Non-pawns can only capture if adjacent to one of your pawns.",
  filterMoves: (moves, _s, ctx) => {
    const pawns = pieceSquares(ctx.board, ctx.me, "p");
    return moves.filter((m) => {
      if (!m.captured) return true;
      if (m.piece === "p") return true;
      return pawns.some((ps) => adj(ps, m.from));
    });
  },
});

export const SCOUTING_AHEAD: Nerf = db({
  id: "scouting_ahead", name: "Scouting Ahead", tier: 3, implemented: true,
  description: "As long as you have a pawn, non-pawns can't go ahead of your most advanced pawn.",
  filterMoves: (moves, _s, ctx) => {
    const pawns = pieceSquares(ctx.board, ctx.me, "p");
    if (!pawns.length) return moves;
    let advanced = ctx.me === "w" ? 0 : 7;
    for (const sq of pawns) {
      if (ctx.me === "w") advanced = Math.max(advanced, RANK(sq));
      else advanced = Math.min(advanced, RANK(sq));
    }
    return moves.filter((m) => {
      if (m.piece === "p") return true;
      return ctx.me === "w" ? RANK(m.to) <= advanced : RANK(m.to) >= advanced;
    });
  },
});

export const WARLORD: Nerf = db({
  id: "warlord", name: "Warlord", tier: 4, implemented: true,
  description: "From turn 12 onward, your king can't be on your first two ranks. From turn 11, while your king is still on those ranks, you are warned one move early.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 12) return null;
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    const home = ctx.me === "w" ? [0, 1] : [6, 7];
    return home.includes(RANK(ks)) ? { reason: "king on home ranks" } : null;
  },
  // Reveal the coming restriction one move early: warn while the king still
  // sits on the first two ranks as the deadline nears.
  hint: (_s, ctx) => {
    if (ctx.moveNumber < 11) return null;
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    const home = ctx.me === "w" ? [0, 1] : [6, 7];
    if (!home.includes(RANK(ks))) return null;
    if (ctx.moveNumber < 12) {
      return { text: "Next turn your king may not be on your first two ranks. March it forward.", squares: [ks], tone: "warn" };
    }
    return { text: "Your king must leave your first two ranks or you lose.", squares: [ks], tone: "warn" };
  },
});

export const MEDUSA: Nerf = db({
  id: "medusa", name: "Medusa", tier: 6, implemented: true,
  description: "Pieces attacked by opponent's queen are stone; they cannot move.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const queens = pieceSquares(ctx.board, opp, "q");
    if (!queens.length) return moves;
    // Cast queen rays on the REAL board so the queen's own blockers stop each
    // ray at the first occupied square (no x-raying through friendly pawns).
    const QUEEN_DIRS = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    const stoned = new Set<number>();
    for (const q of queens) {
      const qf = FILE(q), qr = RANK(q);
      for (const [df, dr] of QUEEN_DIRS) {
        let f = qf + df, r = qr + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const sq = SQ(f, r);
          stoned.add(sq);
          if (ctx.board.pieces[sq]) break; // ray stops at the first occupied square
          f += df;
          r += dr;
        }
      }
    }
    return moves.filter((m) => !stoned.has(m.from));
  },
});

export const FISCHER_RANDOM_ENDGAME: Nerf = db({
  id: "fischer_random_endgame", name: "Fischer Random Endgame", tier: 7, implemented: true,
  description: "By move 20, all your non-pawns must be on home row AND on a square they couldn't have started on.",
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 20) return null;
    const homeR = ctx.me === "w" ? 0 : 7;
    const orig: Record<PieceType, number[]> = {
      r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [],
    };
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (!p || p.color !== ctx.me || p.type === "p") continue;
      if (RANK(sq) !== homeR) return { reason: "non-pawn not on home row" };
      if (orig[p.type].includes(FILE(sq))) return { reason: "piece on original file" };
    }
    return null;
  },
});

export const CENTRALIZED_COMMAND: Nerf = db({
  id: "centralized_command", name: "Centralized Command", tier: 6, implemented: true,
  description: "Can only capture if you moved your king in the last 3 turns. If that would leave you no legal move, a king move is allowed.",
  filterMoves: (moves, _s, ctx) => {
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    const recent = mine.slice(-3);
    const movedKing = recent.some((m) => m.piece === "k");
    if (movedKing) return moves;
    const filtered = moves.filter((m) => !m.captured);
    if (filtered.length) return filtered;
    // No compliant move exists (every legal move is a barred capture): allow a
    // king move as the escape.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const STAND_YOUR_GROUND: Nerf = db({
  id: "stand_your_ground", name: "Stand Your Ground", tier: 6, implemented: true,
  description: "Pieces can only capture if attacked.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const oppAttacks = attackedBy(ctx.board, opp);
    return moves.filter((m) => !m.captured || oppAttacks.has(m.from));
  },
});

export const ALWAYS_CHECK_IT_MIGHT_BE_MATE: Nerf = db({
  id: "always_check_it_might_be_mate", name: "Always Check, It Might Be Mate", tier: 7, implemented: true,
  description: "If you are checked, you lose.",
  checkLoss: (_s, ctx) => (isInCheck(ctx.board, ctx.me) ? { reason: "in check" } : null),
});

export const GLORIOUS_BATTLE: Nerf = db({
  id: "glorious_battle", name: "Glorious Battle", tier: 7, implemented: true,
  description: "On a midgame move drawn at random (you are warned two turns ahead), the battle begins: for 3 consecutive moves you must capture, or lose.",
  // Rebalance 2026-07, three surgical changes to what was a pure lottery:
  //  - the window now starts on move 9-16 (was 4-11, often before any contact
  //    exists, making the required captures physically unavailable);
  //  - the window is 3 turns (was 4): needing an available capture on four
  //    consecutive turns was rarely survivable even with perfect prep;
  //  - the start is announced two turns in advance via hint, so the owner can
  //    build up capture targets (keep tension, refuse early trades) instead of
  //    being executed by hidden state. Still tier 7.
  init: (rng) => ({ start: 9 + rng.int(8) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { start: number };
    const turn = ctx.moveNumber + 1;
    if (turn < s.start || turn >= s.start + 3) return moves;
    const caps = moves.filter((m) => m.captured);
    return caps.length ? caps : moves;
  },
  checkLoss: (state, ctx) => {
    const s = state as { start: number };
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    const end = Math.min(mine.length, s.start + 2);
    for (let i = s.start - 1; i < end; i++) {
      if (i < 0 || i >= mine.length) continue;
      if (!mine[i].captured) return { reason: "missed required capture" };
    }
    return null;
  },
  progress: (state, ctx) => {
    const s = state as { start: number };
    const turn = ctx.moveNumber + 1;
    if (turn >= s.start + 3) return { value: 3, max: 3, label: "battle survived" };
    if (turn < s.start) return { value: 0, max: 3, label: `battle begins on your move ${s.start}` };
    return { value: turn - s.start, max: 3, label: `battle turn ${turn - s.start + 1} of 3` };
  },
  hint: (state, ctx, legal) => {
    const s = state as { start: number };
    const turn = ctx.moveNumber + 1;
    if (turn >= s.start && turn < s.start + 3) {
      const caps = legal.filter((m) => m.captured);
      if (!caps.length) {
        return { text: "The battle rages and you have no capture. This move loses.", tone: "warn" };
      }
      return {
        text: `Glorious battle (turn ${turn - s.start + 1} of 3): you must capture.`,
        squares: Array.from(new Set(caps.map((m) => m.from))),
        tone: "warn",
      };
    }
    if (turn >= s.start - 2 && turn < s.start) {
      return {
        text: `The glorious battle begins on your move ${s.start}: line up captures now.`,
        tone: "info",
      };
    }
    return null;
  },
});

export const FLATTERER: Nerf = db({
  id: "flatterer", name: "Flatterer", tier: 6, implemented: true,
  description: "If opponent moves a pawn, you must move a pawn. Same for non-pawns.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const needPawn = last.piece === "p";
    const filtered = moves.filter((m) => (m.piece === "p") === needPawn);
    return filtered.length ? filtered : moves;
  },
});

export const MESSY_DIVORCE: Nerf = db({
  id: "messy_divorce", name: "Messy Divorce", tier: 5, implemented: true,
  description: "Pieces can't move from queenside to kingside or vice versa.",
  filterMoves: (moves) =>
    moves.filter((m) => (FILE(m.from) < 4) === (FILE(m.to) < 4)),
});

export const LEVELING_UP: Nerf = db({
  id: "leveling_up", name: "Leveling Up", tier: 6, implemented: true,
  description: "Can't capture a piece type until you've captured its predecessor. A move granted by another card can't make a barred capture legal.",
  // The filter runs over the full move set (including moves another card injects),
  // and there is no escape hatch that returns the unfiltered list, so a barred
  // capture stays barred no matter how it was offered.
  filterMoves: (moves, _s, ctx) => {
    const order: PieceType[] = ["p", "n", "b", "r", "q"];
    const got = new Set<PieceType>();
    for (const m of ctx.board.history) if (m.color === ctx.me && m.captured) got.add(m.captured);
    return moves.filter((m) => {
      if (!m.captured || m.captured === "k") return true;
      const idx = order.indexOf(m.captured);
      if (idx <= 0) return true;
      return got.has(order[idx - 1]);
    });
  },
});

export const HOMELAND_SECURITY: Nerf = db({
  id: "homeland_security", name: "Homeland Security", tier: 6, implemented: true,
  description: "If opponent enters your two home ranks, you lose.",
  checkLoss: (_s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const home = ctx.me === "w" ? [0, 1] : [6, 7];
    for (let sq = 0; sq < 64; sq++) {
      const p = ctx.board.pieces[sq];
      if (p && p.color === opp && home.includes(RANK(sq))) return { reason: "enemy in homeland" };
    }
    return null;
  },
});

export const COWERING_IN_FEAR: Nerf = db({
  id: "cowering_in_fear", name: "Cowering in Fear", tier: 6, implemented: true,
  description: "Can't move a piece of less value than one opponent has captured from you.",
  filterMoves: (moves, _s, ctx) => {
    let max = 0;
    const caps = ctx.capturedFromMe;
    for (const t of ["p", "n", "b", "r", "q"] as PieceType[]) {
      if (caps[t] > 0) max = Math.max(max, PIECE_VAL[t]);
    }
    if (max === 0) return moves;
    const brave = moves.filter((m) => PIECE_VAL[m.piece] >= max);
    return brave.length ? brave : moves;
  },
});

export const BARBARIAN_RAGE: Nerf = db({
  id: "barbarian_rage", name: "Barbarian Rage", tier: 4, implemented: true,
  description: "If you captured last move, you must capture this move if able. Once per game, when every available capture would lose material, the rage relents and you may play any move; that exemption is used up the first time you make a non-capturing move while enraged.",
  filterMoves: (moves, _s, ctx) => {
    if (!ctx.myLastMove?.captured) return moves; // not enraged
    const caps = moves.filter((m) => m.captured);
    if (!caps.length) return moves; // nothing to force
    // Once-per-game exemption: if it hasn't been spent and every available
    // capture would lose material, let the rage relent this turn. The exemption
    // is treated as spent the first time an enraged turn ends in a non-capture
    // (reconstructed from history, since move choice is not stored in state).
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    let exemptionSpent = false;
    for (let i = 1; i < mine.length; i++) {
      if (mine[i - 1].captured && !mine[i].captured) { exemptionSpent = true; break; }
    }
    if (!exemptionSpent) {
      const opp = ctx.me === "w" ? "b" : "w";
      const hasCompliant = caps.some((m) => {
        if (m.captured && PIECE_VAL[m.captured] >= PIECE_VAL[m.piece]) return true;
        const nb = makeMove(ctx.board, m);
        return !attackedBy(nb, opp).has(m.to);
      });
      if (!hasCompliant) return moves; // exemption applies this turn
    }
    return caps;
  },
});

export const MY_KINGDOM_FOR_A_HORSE: Nerf = db({
  id: "my_kingdom_for_a_horse", name: "My Kingdom for a Horse", tier: 6, implemented: true,
  description: "If opponent captures a knight of yours, you lose.",
  checkLoss: (_s, ctx) =>
    ctx.capturedFromMe.n > 0 ? { reason: "lost a knight" } : null,
});

export const EYE_FOR_AN_EYE: Nerf = db({
  id: "eye_for_an_eye", name: "Eye for an Eye", tier: 6, implemented: true,
  description: "If opponent captures, you must capture next turn or lose.",
  filterMoves: (moves, _s, ctx) => {
    if (!ctx.opponentLastMove?.captured) return moves;
    const caps = moves.filter((m) => m.captured);
    return caps.length ? caps : moves;
  },
  checkLoss: (_s, ctx) => {
    // Judged immediately after my move: if the opponent's move just before it
    // was a capture, mine must be one too. filterMoves already forces captures
    // when any exist, so this only fires when no capture was available.
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    const prev = h[h.length - 2];
    if (!prev || prev.color === ctx.me || !prev.captured) return null;
    return last.captured ? null : { reason: "failed to avenge a capture" };
  },
  hint: (_s, ctx, legal) => {
    if (!ctx.opponentLastMove?.captured) return null;
    const caps = legal.filter((m) => m.captured);
    if (!caps.length) {
      return { text: "They captured and you have no capture. This move loses.", tone: "warn" };
    }
    return {
      text: "Eye for an eye: you must capture this turn.",
      squares: Array.from(new Set(caps.map((m) => m.from))),
      tone: "warn",
    };
  },
});

export const SIMON_SAYS: Nerf = db({
  id: "simon_says", name: "Simon Says", tier: 6, implemented: true,
  description: "Must move onto same color square as opponent's last move.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const lastColor = (FILE(last.to) + RANK(last.to)) % 2;
    return moves.filter((m) => (FILE(m.to) + RANK(m.to)) % 2 === lastColor);
  },
});

export const IRRESISTIBLE: Nerf = db({
  id: "irresistible", name: "Irresistible", tier: 5, implemented: true,
  description: "If you can move a piece adjacent to the opponent's king (that isn't already), you must, unless every such move would hang the piece (leave it attacked and undefended), in which case the pull relents and you may play any move.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const oks = findKing(ctx.board, opp);
    if (oks == null) return moves;
    const lures = moves.filter((m) => adj(m.to, oks) && !adj(m.from, oks));
    if (!lures.length) return moves;
    // Exemption when no safe compliant move exists: if every luring move would
    // hang the piece (ends attacked and undefended, and is not a
    // favorable-or-equal capture), the pull relents this turn.
    const safeExists = lures.some((m) => {
      if (m.captured && PIECE_VAL[m.captured] >= PIECE_VAL[m.piece]) return true;
      const nb = makeMove(ctx.board, m);
      const attacked = attackedBy(nb, opp).has(m.to);
      const defended = attackedBy(nb, ctx.me).has(m.to);
      return !attacked || defended;
    });
    return safeExists ? lures : moves;
  },
});

export const BOASTFUL: Nerf = db({
  id: "boastful", name: "Boastful", tier: 7, implemented: true,
  description: "You lose if you end one of your turns with fewer pieces than your opponent.",
  // Rebalance 2026-07: judged only after YOUR OWN move (the after-my-move
  // grace pattern from cowardly / eye_for_an_eye). Previously the loss fired
  // the instant the opponent's capture resolved, so any trade sequence where
  // they took first was an immediate loss with no chance to recapture. Now an
  // opponent capture gives you one move to restore parity (recapture) before
  // the count is judged. Still tier 7.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    const opp = ctx.me === "w" ? "b" : "w";
    return pieceSquares(ctx.board, ctx.me).length < pieceSquares(ctx.board, opp).length
      ? { reason: "outnumbered" }
      : null;
  },
  hint: (_s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const mine = pieceSquares(ctx.board, ctx.me).length;
    const theirs = pieceSquares(ctx.board, opp).length;
    if (mine >= theirs) return null;
    return { text: "You are outnumbered. End this turn with equal material or lose.", tone: "warn" };
  },
});

export const WINDS_OF_FATE: Nerf = db({
  id: "winds_of_fate", name: "Winds of Fate", tier: 4, implemented: true,
  description: "Each turn you randomly can't move left or can't move right, revealed a turn early. The restriction is dropped whenever it would leave you fewer than three legal moves.",
  init: (rng) => ({ banned: rng.int(2) === 0 ? "l" : "r", next: rng.int(2) === 0 ? "l" : "r" }),
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { banned: "l" | "r"; next: "l" | "r" };
    return { banned: s.next, next: rng.int(2) === 0 ? "l" : "r" };
  },
  filterMoves: (moves, state) => {
    const s = state as { banned: "l" | "r"; next: "l" | "r" };
    const filtered = moves.filter((m) => {
      const dx = FILE(m.to) - FILE(m.from);
      if (s.banned === "l") return dx >= 0;
      return dx <= 0;
    });
    return filtered.length >= 3 ? filtered : moves;
  },
  hint: (state) => {
    const s = state as { banned: "l" | "r"; next: "l" | "r" };
    const name = (d: "l" | "r") => (d === "l" ? "left" : "right");
    return { text: `Winds of Fate: no moving ${name(s.banned)} this turn, ${name(s.next)} next turn.`, tone: "warn" };
  },
});

export const MONKEY_SEE: Nerf = db({
  id: "monkey_see", name: "Monkey See", tier: 6, implemented: true,
  description: "Can only capture with piece types your opponent has captured with. If that leaves no legal move, a king move is allowed.",
  filterMoves: (moves, _s, ctx) => {
    const types = new Set<PieceType>();
    for (const m of ctx.board.history) if (m.color !== ctx.me && m.captured) types.add(m.piece);
    const filtered = moves.filter((m) => !m.captured || types.has(m.piece));
    if (filtered.length) return filtered;
    // No compliant move exists (every legal move is a barred capture): allow a
    // king move as the escape.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
  hint: (_s, ctx) => {
    const names: Record<PieceType, string> = {
      p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "king",
    };
    const types = new Set<PieceType>();
    for (const m of ctx.board.history) if (m.color !== ctx.me && m.captured) types.add(m.piece);
    if (types.size === 0) return { text: "You can't capture yet. Your opponent hasn't captured with anything.", tone: "info" };
    return { text: `You may capture with: ${[...types].map((t) => names[t]).join(", ")}.`, tone: "info" };
  },
});

export const TRUE_LOVE: Nerf = db({
  id: "true_love", name: "True Love", tier: 6, implemented: true,
  description: "King and queen can only move to squares adjacent to each other.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    const qs = pieceSquares(ctx.board, ctx.me, "q")[0];
    return moves.filter((m) => {
      if (m.piece === "k") {
        const other = qs;
        if (other == null) return true;
        return adj(m.to, other);
      }
      if (m.piece === "q") {
        if (ks == null) return true;
        return adj(m.to, ks);
      }
      return true;
    });
  },
});

export const SUPERSTITIOUS: Nerf = db({
  id: "superstitious", name: "Superstitious", tier: 4, implemented: true,
  description: "Can't move to a square where opponent has captured.",
  filterMoves: (moves, _s, ctx) => {
    const cursed = new Set<number>();
    for (const m of ctx.board.history) if (m.color !== ctx.me && m.captured) cursed.add(m.to);
    return moves.filter((m) => !cursed.has(m.to));
  },
});

export const EAT_YOUR_VEGETABLES: Nerf = db({
  id: "eat_your_vegetables", name: "Eat Your Vegetables", tier: 5, implemented: true,
  description: "Can't capture non-pawns until opponent has ≤ 4 pawns remaining.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const pawns = pieceSquares(ctx.board, opp, "p").length;
    if (pawns <= 4) return moves;
    return moves.filter((m) => !m.captured || m.captured === "p" || m.captured === "k");
  },
});

export const BLOODTHIRSTY: Nerf = db({
  id: "bloodthirsty", name: "Bloodthirsty", tier: 6, implemented: true,
  description: "After turn 3, if you go 2 turns without capturing, you must capture if able. No move granted by another card can dodge the required capture.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    const last2 = mine.slice(-2);
    if (last2.length === 2 && !last2[0].captured && !last2[1].captured) {
      const caps = moves.filter((m) => m.captured);
      return caps.length ? caps : moves;
    }
    return moves;
  },
});

export const LEFT_FOR_DEAD: Nerf = db({
  id: "left_for_dead", name: "Left for Dead", tier: 5, implemented: true,
  description: "Can only capture leftward (file decreasing).",
  filterMoves: (moves) =>
    moves.filter((m) => !m.captured || FILE(m.to) < FILE(m.from)),
});

export const CRUSADE: Nerf = db({
  id: "crusade", name: "Crusade", tier: 5, implemented: true,
  description: "For 4 moves starting on a random move (announced a turn early), if at least three of your moves reach a specific random square, you must move to it.",
  init: (rng) => ({ start: 4 + rng.int(10), sq: rng.int(64) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { start: number; sq: number };
    const turn = ctx.moveNumber + 1;
    if (turn < s.start || turn >= s.start + 4) return moves;
    const hits = moves.filter((m) => m.to === s.sq);
    return hits.length >= 3 ? hits : moves;
  },
  visual: (state) => ({ highlightSquares: [(state as { sq: number }).sq] }),
  hint: (state, ctx) => {
    const s = state as { start: number; sq: number };
    const turn = ctx.moveNumber + 1;
    if (turn === s.start - 1) {
      return { text: `Crusade begins next turn: prepare to reach ${squareName(s.sq)}.`, squares: [s.sq], tone: "info" };
    }
    if (turn < s.start || turn >= s.start + 4) return null;
    const turnsLeft = s.start + 4 - turn;
    return {
      text: `Crusade: if three or more moves reach ${squareName(s.sq)}, you must take one (${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left, started turn ${s.start}).`,
      squares: [s.sq],
      tone: "warn",
    };
  },
});

export const HEDONIC_TREADMILL: Nerf = db({
  id: "hedonic_treadmill", name: "Hedonic Treadmill", tier: 6, implemented: true,
  description: "Must move a piece at least as valuable as opponent's last moved piece.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const need = PIECE_VAL[last.piece];
    const filtered = moves.filter((m) => PIECE_VAL[m.piece] >= need);
    return filtered.length ? filtered : moves;
  },
});

export const DEATH_WISH: Nerf = db({
  // Rebalance 2026-07: tier 6 -> 8. Whenever any suicidal king step exists the
  // filter forces it, and the opponent then simply takes the king: strictly
  // more lethal than bottled_lightning (any king move forced, tier 8). The
  // counterplay (keep every square around the king occupied or unattacked) is
  // the same boxed-king puzzle as bottled_lightning, so it belongs on the same
  // rung. Mechanics unchanged.
  id: "death_wish", name: "Death Wish", tier: 8, implemented: true,
  description: "If you can move king into check, you must.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const suicidal = moves.filter((m) => {
      if (m.piece !== "k") return false;
      const nb = makeMove(ctx.board, m);
      return attackedBy(nb, opp).has(m.to);
    });
    return suicidal.length ? suicidal : moves;
  },
});

export const CHECKERS: Nerf = db({
  id: "checkers", name: "Checkers", tier: 6, implemented: true,
  description: "Must capture if able. Your king is exempt: a king move is always allowed instead.",
  filterMoves: (moves) => {
    const caps = moves.filter((m) => m.captured);
    if (!caps.length) return moves;
    // A king move is always allowed as an escape from the forced capture.
    return moves.filter((m) => m.captured || m.piece === "k");
  },
});

export const CLOSED_BOOK: Nerf = db({
  id: "closed_book", name: "Closed Book", tier: 5, implemented: true,
  description: "You lose if two or more files ever have none of your pawns on them.",
  // Rebalance 2026-07: one open file is now tolerated; the loss fires at two.
  // The old rule (ANY open file loses) meant that losing a single lone-file
  // pawn, or making almost any pawn capture yourself (it empties the source
  // file), was an instant loss: effectively glass pawns at tier 6. With one
  // file of slack you can absorb a pawn break or make one capture toward a
  // file, and the identity (keep your pawn structure intact) survives.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    let open = 0;
    for (let f = 0; f < 8; f++) {
      let has = false;
      for (let r = 0; r < 8; r++) {
        const p = ctx.board.pieces[SQ(f, r)];
        if (p && p.color === ctx.me && p.type === "p") { has = true; break; }
      }
      if (!has) open++;
    }
    return open >= 2 ? { reason: "two files fell open" } : null;
  },
  progress: (_s, ctx) => {
    let open = 0;
    for (let f = 0; f < 8; f++) {
      let has = false;
      for (let r = 0; r < 8; r++) {
        const p = ctx.board.pieces[SQ(f, r)];
        if (p && p.color === ctx.me && p.type === "p") { has = true; break; }
      }
      if (!has) open++;
    }
    return { value: Math.min(open, 2), max: 2, label: `${open}/2 open files` };
  },
});

export const COVERING_FIRE: Nerf = db({
  id: "covering_fire", name: "Covering Fire", tier: 4, implemented: true,
  description: "Can only capture a piece if you can capture it two different ways.",
  filterMoves: (moves) => {
    const capCounts = new Map<number, number>();
    for (const m of moves) if (m.captured) capCounts.set(m.to, (capCounts.get(m.to) ?? 0) + 1);
    return moves.filter((m) => !m.captured || (capCounts.get(m.to) ?? 0) >= 2);
  },
});

export const UNLUCKY: Nerf = db({
  id: "unlucky", name: "Unlucky", tier: 6, implemented: true,
  description: "Half the squares are unusable each turn, re-randomized.",
  init: () => ({ banned: [] as number[] }),
  onTurnStart: (_s, _ctx, rng) => {
    const all = Array.from({ length: 64 }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return { banned: all.slice(0, 32) };
  },
  filterMoves: (moves, state) => {
    const s = state as { banned: number[] };
    const set = new Set(s.banned);
    return moves.filter((m) => !set.has(m.from) && !set.has(m.to));
  },
  visual: (state) => ({ bannedSquares: (state as { banned: number[] }).banned }),
});

export const JUMPY: Nerf = db({
  id: "jumpy", name: "Jumpy", tier: 6, implemented: true,
  description: "When possible, must move an attacked piece.",
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const attacked = attackedBy(ctx.board, opp);
    const fromAttacked = moves.filter((m) => attacked.has(m.from));
    return fromAttacked.length ? fromAttacked : moves;
  },
});

export const HOPSCOTCH: Nerf = db({
  id: "hopscotch", name: "Hopscotch", tier: 5, implemented: true,
  description: "Must alternate light/dark destination squares. The required destination color is shown each turn.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const lastColor = (FILE(last.to) + RANK(last.to)) % 2;
    return moves.filter((m) => (FILE(m.to) + RANK(m.to)) % 2 !== lastColor);
  },
  // Reveal the restricted region: the destination color required this turn.
  hint: (_s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) {
      return { text: "Hopscotch: your first move is free, then you must alternate square colors.", tone: "info" };
    }
    const lastColor = (FILE(last.to) + RANK(last.to)) % 2;
    const need = 1 - lastColor === 1 ? "light" : "dark";
    return { text: `Hopscotch: this turn you must land on a ${need} square.`, tone: "info" };
  },
});

export const LEAPS_AND_BOUNDS: Nerf = db({
  id: "leaps_and_bounds", name: "Leaps and Bounds", tier: 6, implemented: true,
  description: "Every move must be a leap: a piece can't move to a square adjacent to the square it's leaving. A move granted by another card must also be a leap.",
  // Bans any move of chebyshev distance 1 (the most common bug report was that this
  // drawback "had no effect": the old version only restricted the exact piece that
  // moved last turn, so it almost never triggered). Since every pawn promotion is a
  // one-square advance or diagonal capture, this also naturally blocks promotions.
  filterMoves: (moves) => moves.filter((m) => !adj(m.to, m.from)),
});

export const COLORBLIND: Nerf = db({
  id: "colorblind", name: "Colorblind", tier: 5, implemented: true,
  description: "Can't move to one random color of squares, re-randomized each turn and revealed one turn early. The restriction is dropped whenever it would leave you fewer than three legal moves.",
  init: (rng) => ({ banned: rng.int(2) as 0 | 1, next: rng.int(2) as 0 | 1 }),
  onTurnStart: (state, _ctx, rng) => {
    const s = state as { banned: 0 | 1; next: 0 | 1 };
    return { banned: s.next, next: rng.int(2) as 0 | 1 };
  },
  filterMoves: (moves, state) => {
    const s = state as { banned: 0 | 1; next: 0 | 1 };
    const filtered = moves.filter((m) => (FILE(m.to) + RANK(m.to)) % 2 !== s.banned);
    return filtered.length >= 3 ? filtered : moves;
  },
  hint: (state) => {
    const s = state as { banned: 0 | 1; next: 0 | 1 };
    const name = (c: 0 | 1) => (c === 1 ? "light" : "dark");
    return { text: `Colorblind: no moving to ${name(s.banned)} squares this turn, ${name(s.next)} next turn.`, tone: "warn" };
  },
});

export const INCHING_FORWARD: Nerf = db({
  id: "inching_forward", name: "Inching Forward", tier: 6, implemented: true,
  description: "After turn 6, king must be in front of home rank. Required rank advances every 6 turns, up to your 7th rank.",
  // Rebalance 2026-07: the required rank is now capped at your 7th rank
  // (advance <= 6). The uncapped ladder demanded a rank beyond the board from
  // your 48th move on, which was a GUARANTEED loss in any long game, with no
  // line of play that could satisfy it. With the cap, the endgame demand is
  // "keep your king on the enemy's second rank or deeper": brutal, but a real
  // target a king can reach and hold. Still tier 6.
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 6) return null;
    const advance = Math.min(6, Math.floor(ctx.moveNumber / 6));
    const required = ctx.me === "w" ? advance : 7 - advance;
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    if (ctx.me === "w" && RANK(ks) < required) return { reason: "king too far back" };
    if (ctx.me === "b" && RANK(ks) > required) return { reason: "king too far back" };
    return null;
  },
});

// Simple board evaluation for "Stockfish-like" nerfs
function bestHeuristicMove(moves: Move[]): Move | null {
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    let s = 0;
    if (m.captured) s += PIECE_VAL[m.captured] * 10 - PIECE_VAL[m.piece];
    if (m.promotion) s += PIECE_VAL[m.promotion];
    // Prefer central destinations
    const cf = Math.abs(FILE(m.to) - 3.5);
    const cr = Math.abs(RANK(m.to) - 3.5);
    s += 4 - (cf + cr);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

export const ICHTHYOPHOBE: Nerf = db({
  id: "ichthyophobe", name: "Ichthyophobe", tier: 3, implemented: true,
  description:
    "Each turn you can't play the move a simple greedy engine would pick (its single best move by a one ply look: the most valuable safe capture, or a basic developing move when there is no capture). Every other legal move is fine; if that one move is your only legal move, you may still play it. This activates only after your move 3.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves;
    const best = bestHeuristicMove(moves);
    if (!best) return moves;
    const filtered = moves.filter((m) => !(m.from === best.from && m.to === best.to && m.promotion === best.promotion));
    return filtered.length ? filtered : moves;
  },
});

export const LEFT_TO_RIGHT: Nerf = db({
  id: "left_to_right", name: "Left to Right", tier: 6, implemented: true,
  description: "Unless you just moved to the rightmost file, must move right of your last move's destination. If no rightward move exists, a king move is allowed.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    if (FILE(last.to) === 7) return moves;
    const rightward = moves.filter((m) => FILE(m.to) > FILE(last.to));
    if (rightward.length) return rightward;
    // No compliant (rightward) move exists: allow a king move as the escape.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const FRIENDLY_FIRE: Nerf = db({
  id: "friendly_fire", name: "Friendly Fire", tier: 6, implemented: true,
  description: "Can only move to squares defended by another of your pieces. A move granted by another card must also land on a defended square.",
  filterMoves: (moves, _s, ctx) => {
    // We need defenders excluding the moving piece. Simulate by removing the piece from its square.
    const defended = moves.filter((m) => {
      const fake = { ...ctx.board, pieces: ctx.board.pieces.slice() };
      fake.pieces[m.from] = null;
      return attackedBy(fake, ctx.me).has(m.to);
    });
    return defended.length ? defended : moves;
  },
});

export const GOING_THE_DISTANCE: Nerf = db({
  id: "going_the_distance", name: "Going the Distance", tier: 6, implemented: true,
  description: "Must move at least as far as opponent's last move. If nothing reaches that far, a king move is allowed.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const need = cheb(last.from, last.to);
    const filtered = moves.filter((m) => cheb(m.from, m.to) >= need);
    if (filtered.length) return filtered;
    // No compliant move exists (nothing reaches the required distance): allow a
    // king move as the escape.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

// True if any of `me`'s pawns is attacked by the opponent and not defended by
// one of `me`'s own pieces. Used by Helicopter Parent's two-strike rule.
function pawnExposed(board: BoardState, me: Color): boolean {
  const opp: Color = me === "w" ? "b" : "w";
  const attackers = attackedBy(board, opp);
  const defenders = attackedBy(board, me);
  for (const sq of pieceSquares(board, me, "p")) {
    if (attackers.has(sq) && !defenders.has(sq)) return true;
  }
  return false;
}

export const HELICOPTER_PARENT: Nerf = db({
  id: "helicopter_parent", name: "Helicopter Parent", tier: 6, implemented: true,
  description: "If you end one of your turns with a pawn that is attacked and undefended, you are warned. You lose only if a pawn is still attacked and undefended at the end of your next turn.",
  // Rebalance 2026-07, two surgical changes:
  //  - a pawn now has to be ATTACKED and undefended (was: undefended, even
  //    with no attacker anywhere), which made every pawn advance a standing
  //    death sentence and was harder than house_of_cards a full two tiers up;
  //  - judged only after YOUR move, so when the opponent's move creates the
  //    threat you get one turn to defend the child (or move it) first.
  // Follow-up: the first offending turn only warns; you lose only if you end a
  // second turn in a row with a pawn attacked and undefended. `warned` is set in
  // onTurnStart from the position right after your previous move (checkLoss
  // cannot mutate state), so a lone bad turn is survivable if you repair it.
  // The card keeps its identity: hover over threatened pawns. Still tier 6.
  init: () => ({ warned: false }),
  onTurnStart: (_s, ctx) => {
    // Were you already exposed at the end of your previous move? If so you enter
    // this turn under a standing warning.
    const h = ctx.board.history;
    let lastMineIdx = -1;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].color === ctx.me) { lastMineIdx = i; break; }
    }
    if (lastMineIdx < 0) return { warned: false };
    const after = boardAfter(h, lastMineIdx + 1);
    return { warned: pawnExposed(after, ctx.me) };
  },
  checkLoss: (state, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const h = ctx.board.history;
    const last = h[h.length - 1];
    if (!last || last.color !== ctx.me) return null;
    if (!pawnExposed(ctx.board, ctx.me)) return null; // safe now: repaired or never exposed
    // A pawn is attacked and undefended after my move. Lose only if I was
    // already warned coming into this turn (exposed last turn too); otherwise
    // this is the first offense and only warns.
    const s = state as { warned: boolean };
    return s.warned ? { reason: "a pawn was left in danger for a second turn" } : null;
  },
  hint: (state, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const attackers = attackedBy(ctx.board, opp);
    const defenders = attackedBy(ctx.board, ctx.me);
    const exposed = pieceSquares(ctx.board, ctx.me, "p").filter(
      (sq) => attackers.has(sq) && !defenders.has(sq),
    );
    const s = state as { warned: boolean };
    if (s.warned) {
      return {
        text: "Helicopter warning: a pawn was left attacked and undefended. Leave every pawn safe this turn or lose.",
        squares: exposed,
        tone: "warn",
      };
    }
    if (!exposed.length) return null;
    return {
      text: "A pawn is attacked and undefended. Repair it this turn or you will be warned.",
      squares: exposed,
      tone: "info",
    };
  },
});

export const EXCLUSIVITY_CLAUSE: Nerf = db({
  id: "exclusivity_clause", name: "Exclusivity Clause", tier: 6, implemented: true,
  description: "Can't move to squares more than one of your pieces can move to. Pieces a card spawns or teleports in are counted at once.",
  filterMoves: (moves) => {
    const counts = new Map<number, number>();
    for (const m of moves) counts.set(m.to, (counts.get(m.to) ?? 0) + 1);
    return moves.filter((m) => (counts.get(m.to) ?? 0) === 1);
  },
});

export const RELAY_RACE: Nerf = db({
  id: "relay_race", name: "Relay Race", tier: 6, implemented: true,
  description: "If you can move a piece adjacent to your last move's destination, you must.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const adjMoves = moves.filter((m) => adj(m.to, last.to));
    return adjMoves.length ? adjMoves : moves;
  },
});

function pickWorstMove(moves: Move[]): Move | null {
  if (!moves.length) return null;
  let worst = moves[0];
  let worstScore = Infinity;
  for (const m of moves) {
    let s2 = 0;
    if (m.captured) s2 -= PIECE_VAL[m.captured] * 10;
    s2 += PIECE_VAL[m.piece];
    const cf = Math.abs(FILE(m.to) - 3.5);
    const cr = Math.abs(RANK(m.to) - 3.5);
    s2 += cf + cr;
    if (m.piece === "k") s2 -= 2;
    if (s2 < worstScore) { worstScore = s2; worst = m; }
  }
  return worst;
}

export const DEVIL_ON_SHOULDER: Nerf = db({
  id: "devil_on_shoulder", name: "Devil on Your Shoulder", tier: 6, implemented: true,
  description: "Each turn the devil suggests a bad move. Ignore him 7 turns in a row and on the 8th you must obey. A piece a card spawns or teleports in can be the demanded move at once.",
  init: () => ({ streak: 0 }),
  onTurnStart: (state, ctx) => {
    const prev = (state as { streak: number }).streak ?? 0;
    const last = [...ctx.board.history].reverse().find((m) => m.color === ctx.me);
    if (!last) return { streak: 0 };
    return { streak: (prev + 1) % 8 };
  },
  filterMoves: (moves, state) => {
    const s = state as { streak: number };
    if (s.streak < 7) return moves;
    const worst = pickWorstMove(moves);
    return worst ? [worst] : moves;
  },
  hint: (state, _c, legal) => {
    const s = state as { streak: number };
    const worst = pickWorstMove(legal);
    if (!worst) return null;
    if (s.streak >= 7) {
      return {
        text: "The devil demands obedience this turn.",
        squares: [worst.from, worst.to],
        tone: "warn",
      };
    }
    const left = 7 - s.streak;
    return {
      text: `Devil whispers a bad move. Ignore ${left} more turn${left === 1 ? "" : "s"} or be forced to obey.`,
      squares: [worst.from, worst.to],
      tone: "info",
    };
  },
});

export const REFLECTIVE: Nerf = db({
  id: "reflective", name: "Reflective", tier: 7, implemented: true,
  description: "Non-pawns must move to squares whose mirror across the center is occupied.",
  filterMoves: (moves, _s, ctx) => {
    return moves.filter((m) => {
      if (m.piece === "p") return true;
      const mirror = SQ(7 - FILE(m.to), 7 - RANK(m.to));
      return !!ctx.board.pieces[mirror];
    });
  },
});

export const OBSESSION: Nerf = db({
  id: "obsession", name: "Obsession", tier: 6, implemented: true,
  description: "Each turn, a random square. If you can move to it, you must.",
  init: () => ({ sq: 0 }),
  onTurnStart: (_s, _ctx, rng) => ({ sq: rng.int(64) }),
  filterMoves: (moves, state) => {
    const s = state as { sq: number };
    const hits = moves.filter((m) => m.to === s.sq);
    return hits.length ? hits : moves;
  },
  visual: (state) => ({ highlightSquares: [(state as { sq: number }).sq] }),
});

export const BOXING_WITH_SHADOW: Nerf = db({
  id: "boxing_with_shadow", name: "Boxing with Shadow", tier: 6, implemented: true,
  description: "From your move 4 on, when opponent moves, if you can move to the square they vacated, you must.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves; // the rule starts on your move 4
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const hits = moves.filter((m) => m.to === last.from);
    return hits.length ? hits : moves;
  },
});

export const NOBLE_STEED: Nerf = db({
  id: "noble_steed", name: "Noble Steed", tier: 6, implemented: true,
  description: "Non-knight pieces can only move if adjacent to one of your knights.",
  filterMoves: (moves, _s, ctx) => {
    const knights = pieceSquares(ctx.board, ctx.me, "n");
    if (!knights.length) return moves;
    const escorted = moves.filter((m) => {
      if (m.piece === "n") return true;
      return knights.some((k) => adj(k, m.from));
    });
    return escorted.length ? escorted : moves;
  },
});

export const TAKING_TURNS: Nerf = db({
  id: "taking_turns", name: "Taking Turns", tier: 6, implemented: true,
  description: "Can't move a piece a second time until every piece of its type has moved once.",
  filterMoves: (moves, _s, ctx) => {
    // A piece has moved iff its current square was ever a destination of one of
    // my moves (my moves can't land on my own pieces, so the occupant of such a
    // square must be the piece that moved there, or a later mover, also moved).
    // Castling rooks slip through this net; that's an accepted approximation.
    const movedSquares = new Set<number>();
    for (const m of ctx.board.history) if (m.color === ctx.me) movedSquares.add(m.to);
    const unmovedByType: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    for (const sq of pieceSquares(ctx.board, ctx.me)) {
      if (!movedSquares.has(sq)) unmovedByType[ctx.board.pieces[sq]!.type]++;
    }
    const filtered = moves.filter(
      (m) => !movedSquares.has(m.from) || unmovedByType[m.piece] === 0,
    );
    return filtered.length ? filtered : moves;
  },
});

export const HAND_AND_GIGABRAIN: Nerf = db({
  id: "hand_and_gigabrain", name: "Hand and Gigabrain", tier: 6, implemented: true,
  description: "Must move the piece type Stockfish recommends.",
  filterMoves: (moves) => {
    const best = bestHeuristicMove(moves);
    if (!best) return moves;
    const filtered = moves.filter((m) => m.piece === best.piece);
    return filtered.length ? filtered : moves;
  },
});

export const CRENELLATIONS: Nerf = db({
  id: "crenellations", name: "Crenellations", tier: 5, implemented: true,
  description: "Pawns can only move to a fixed random color of squares, shown from the start. The restriction is dropped whenever it would leave you fewer than three legal moves.",
  init: (rng) => ({ color: rng.int(2) as 0 | 1 }),
  filterMoves: (moves, state) => {
    const s = state as { color: 0 | 1 };
    const filtered = moves.filter((m) => m.piece !== "p" || (FILE(m.to) + RANK(m.to)) % 2 === s.color);
    return filtered.length >= 3 ? filtered : moves;
  },
  hint: (state) => {
    const s = state as { color: 0 | 1 };
    return { text: `Your pawns may only step on ${s.color === 1 ? "light" : "dark"} squares.`, tone: "info" };
  },
});

export const LEADING_THE_CHARGE: Nerf = db({
  id: "leading_the_charge", name: "Leading the Charge", tier: 3, implemented: true,
  description: "As long as you have a knight, non-knights can't be ahead of your most advanced knight.",
  filterMoves: (moves, _s, ctx) => {
    const knights = pieceSquares(ctx.board, ctx.me, "n");
    if (!knights.length) return moves;
    let advanced = ctx.me === "w" ? 0 : 7;
    for (const sq of knights) {
      if (ctx.me === "w") advanced = Math.max(advanced, RANK(sq));
      else advanced = Math.min(advanced, RANK(sq));
    }
    return moves.filter((m) => {
      if (m.piece === "n") return true;
      return ctx.me === "w" ? RANK(m.to) <= advanced : RANK(m.to) >= advanced;
    });
  },
});

export const ACTIVE_VOLCANO: Nerf = db({
  id: "active_volcano", name: "Active Volcano", tier: 4, implemented: true,
  description: "Can't move onto or orthogonally adjacent to a fixed random square, shown on the board. The restriction never leaves you fewer than three legal moves.",
  init: (rng) => ({ sq: rng.int(64) }),
  filterMoves: (moves, state) => {
    const s = state as { sq: number };
    const filtered = moves.filter((m) => {
      if (m.to === s.sq) return false;
      const df = Math.abs(FILE(m.to) - FILE(s.sq));
      const dr = Math.abs(RANK(m.to) - RANK(s.sq));
      return !((df === 0 && dr === 1) || (df === 1 && dr === 0));
    });
    return filtered.length >= 3 ? filtered : moves;
  },
  visual: (state) => ({ bannedSquares: [(state as { sq: number }).sq] }),
  hint: (state) => ({ text: `Volcano: avoid ${squareName((state as { sq: number }).sq)} and its orthogonal neighbors.`, tone: "info" }),
});

export const NURTURER: Nerf = db({
  id: "nurturer", name: "Nurturer", tier: 6, implemented: true,
  description: "Can't capture the enemy king until you've promoted a pawn.",
  filterMoves: (moves, _s, ctx) => {
    const promoted = ctx.board.history.some((m) => m.color === ctx.me && m.promotion);
    if (promoted) return moves;
    return moves.filter((m) => m.captured !== "k");
  },
});

export const PRINCE_CHARMING: Nerf = db({
  id: "prince_charming", name: "Prince Charming", tier: 4, implemented: true,
  description: "If your queen is attacked, must move a knight if possible.",
  filterMoves: (moves, _s, ctx) => {
    const queen = pieceSquares(ctx.board, ctx.me, "q")[0];
    if (queen == null) return moves;
    const opp = ctx.me === "w" ? "b" : "w";
    const attacks = attackedBy(ctx.board, opp);
    if (!attacks.has(queen)) return moves;
    const knightMoves = moves.filter((m) => m.piece === "n");
    return knightMoves.length ? knightMoves : moves;
  },
});

export const ABSOLUTION: Nerf = db({
  id: "absolution", name: "Absolution", tier: 6, implemented: true,
  description: "After a non-bishop captures, it must start a turn adjacent to a bishop before it can capture again. If that would leave you no legal move, a king move is allowed.",
  filterMoves: (moves, _s, ctx) => {
    // Track per-source-square whether it captured (non-bishop) and hasn't been "absolved".
    const sinful = new Set<number>();
    const seen = new Set<number>();
    const bishops = pieceSquares(ctx.board, ctx.me, "b");
    for (let i = ctx.board.history.length - 1; i >= 0; i--) {
      const m = ctx.board.history[i];
      if (m.color !== ctx.me) continue;
      if (seen.has(m.to)) continue;
      seen.add(m.to);
      if (m.captured && m.piece !== "b") sinful.add(m.to);
    }
    // Absolve those currently adjacent to a bishop.
    for (const sq of Array.from(sinful)) {
      if (bishops.some((b) => adj(b, sq))) sinful.delete(sq);
    }
    const filtered = moves.filter((m) => !(m.captured && sinful.has(m.from)));
    if (filtered.length) return filtered;
    // No compliant move exists (every legal move is a barred capture): allow a
    // king move as the escape.
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const QUICKSAND: Nerf = db({
  id: "quicksand", name: "Quicksand", tier: 4, implemented: true,
  description:
    "The 4th and 5th ranks are quicksand, shown on the board. If one of your pieces lands on the same 4th or 5th rank square for the second time in the game (tracing that piece's own path, not necessarily on consecutive moves), it is stuck and can never move from that square again. A piece one visit from being stuck is flagged the move before.",
  filterMoves: (moves, _s, ctx) => {
    // A piece is stuck if that SAME piece has ended on this middle-rank square
    // (rank 3 or 4) at least twice. Follow the current piece's own move chain
    // backward so landings by earlier, different pieces don't count.
    const stuck = new Set<number>();
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    for (const sq of pieceSquares(ctx.board, ctx.me)) {
      const r = RANK(sq);
      if (r !== 3 && r !== 4) continue;
      let pos = sq;
      let landingsHere = 0;
      for (let i = mine.length - 1; i >= 0; i--) {
        const m = mine[i];
        if (m.to === pos) {
          if (m.to === sq) landingsHere++;
          pos = m.from; // trace this same piece back to where it came from
        }
      }
      if (landingsHere >= 2) stuck.add(sq);
    }
    return moves.filter((m) => !stuck.has(m.from));
  },
  // Reveal the quicksand ranks (the restricted region) on the board.
  visual: () => {
    const sqs: number[] = [];
    for (let f = 0; f < 8; f++) { sqs.push(SQ(f, 3)); sqs.push(SQ(f, 4)); }
    return { highlightSquares: sqs };
  },
  // Warn a move early: a piece already sitting on a middle-rank square it has
  // visited once will be stuck if it ever returns there.
  hint: (_s, ctx) => {
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    const primed: number[] = [];
    for (const sq of pieceSquares(ctx.board, ctx.me)) {
      const r = RANK(sq);
      if (r !== 3 && r !== 4) continue;
      let pos = sq;
      let landings = 0;
      for (let i = mine.length - 1; i >= 0; i--) {
        const m = mine[i];
        if (m.to === pos) { if (m.to === sq) landings++; pos = m.from; }
      }
      if (landings === 1) primed.push(sq);
    }
    if (!primed.length) return null;
    return { text: "Quicksand: a flagged piece will be stuck if it ever returns to this square.", squares: primed, tone: "warn" };
  },
});

export const ROOK_FAN_CLUB: Nerf = db({
  id: "rook_fan_club", name: "Rook Fan Club", tier: 5, implemented: true,
  description: "Must promote to rooks. King/queen can't move diagonally.",
  filterMoves: (moves) =>
    moves.filter((m) => {
      if (m.promotion && m.promotion !== "r") return false;
      if (m.piece === "k" || m.piece === "q") {
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        if (df > 0 && dr > 0) return false;
      }
      return true;
    }),
});

export const LADIES_FIRST: Nerf = db({
  id: "ladies_first", name: "Ladies First", tier: 5, implemented: true,
  description: "Can only move king if you moved queen on previous turn.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (last?.piece === "q") return moves;
    return moves.filter((m) => m.piece !== "k");
  },
});

export const BRIDGE_OVER_TROUBLED_WATER: Nerf = db({
  id: "bridge_over_troubled_water", name: "Bridge Over Troubled Water", tier: 6, implemented: true,
  description: "A river runs through the middle. From your move 4 on, cross only via the center files.",
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves; // the rule starts on your move 4
    return moves.filter((m) => {
      const r1 = RANK(m.from), r2 = RANK(m.to);
      const crosses = (r1 <= 3 && r2 >= 4) || (r1 >= 4 && r2 <= 3);
      if (!crosses) return true;
      return FILE(m.to) === 3 || FILE(m.to) === 4;
    });
  },
});

export const ROYAL_BERTH: Nerf = db({
  id: "royal_berth", name: "Royal Berth", tier: 6, implemented: true,
  description: "Can't place a piece adjacent to your king.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    return moves.filter((m) => m.piece === "k" || !adj(m.to, ks));
  },
});

export const VELOCIRAPTOR: Nerf = db({
  id: "velociraptor", name: "Velociraptor", tier: 7, implemented: true,
  description: "Can only capture a piece type if opponent moved that type in their last 3 moves.",
  filterMoves: (moves, _s, ctx) => {
    const recent = new Set<PieceType>();
    const oppMoves = ctx.board.history.filter((m) => m.color !== ctx.me).slice(-3);
    for (const m of oppMoves) recent.add(m.piece);
    return moves.filter((m) => !m.captured || m.captured === "k" || recent.has(m.captured));
  },
});

export const SECRET_GARDEN: Nerf = db({
  id: "secret_garden", name: "Secret Garden", tier: 6, implemented: true,
  description: "Two of your pawns have secret gardens. Don't trespass.",
  init: (rng, color) => {
    // Pick two random pawn starting files for this color; garden = the 3x3 area in front of that pawn.
    const files: number[] = [];
    while (files.length < 2) {
      const f = rng.int(8);
      if (!files.includes(f)) files.push(f);
    }
    const startR = color === "w" ? 1 : 6;
    const dir = color === "w" ? 1 : -1;
    const gardens: number[] = [];
    for (const f of files) {
      for (let df = -1; df <= 1; df++) {
        for (let dr = 1; dr <= 3; dr++) {
          const nf = f + df;
          const nr = startR + dr * dir;
          if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) gardens.push(SQ(nf, nr));
        }
      }
    }
    return { gardens: Array.from(new Set(gardens)) };
  },
  filterMoves: (moves, state) => {
    const s = state as { gardens: number[] };
    const set = new Set(s.gardens);
    return moves.filter((m) => !set.has(m.to));
  },
  visual: (state) => ({ bannedSquares: (state as { gardens: number[] }).gardens }),
});

export const THUNDERDOME: Nerf = db({
  id: "thunderdome", name: "Thunderdome", tier: 6, implemented: true,
  description:
    "The center 16 squares (files c to f, ranks 3 to 6) are the thunderdome. Once one of your pieces is on those squares it can never move out of the zone for the rest of the game (it may still move within the zone). Pieces enter; pieces do not leave.",
  filterMoves: (moves) => {
    const inDome = (sq: number) => {
      const f = FILE(sq), r = RANK(sq);
      return f >= 2 && f <= 5 && r >= 2 && r <= 5;
    };
    return moves.filter((m) => !(inDome(m.from) && !inDome(m.to)));
  },
});

export const INDECISIVE: Nerf = db({
  id: "indecisive", name: "Indecisive", tier: 6, implemented: true,
  description: "Pieces can't capture if they have multiple possible capture moves.",
  filterMoves: (moves) => {
    const capCount = new Map<number, number>();
    for (const m of moves) if (m.captured) capCount.set(m.from, (capCount.get(m.from) ?? 0) + 1);
    return moves.filter((m) => !m.captured || (capCount.get(m.from) ?? 0) === 1);
  },
});

export const UNREQUITED_LOVE: Nerf = db({
  id: "unrequited_love", name: "Unrequited Love", tier: 6, implemented: true,
  description: "King can't move away from queen; queen can't move toward king.",
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    const qs = pieceSquares(ctx.board, ctx.me, "q")[0];
    if (qs == null || ks == null) return moves;
    return moves.filter((m) => {
      if (m.piece === "k") return cheb(m.to, qs) <= cheb(m.from, qs);
      if (m.piece === "q") return cheb(m.to, ks) >= cheb(m.from, ks);
      return true;
    });
  },
});

export const TORPEDOES: Nerf = db({
  id: "torpedoes", name: "Torpedoes", tier: 4, implemented: true,
  description: "If you made a non-capturing pawn move last turn and can move it again, you must, unless every such continuation would hang the pawn (leave it attacked and undefended), in which case the compulsion relents and you may play any move.",
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last || last.piece !== "p" || last.captured) return moves;
    const same = moves.filter((m) => m.from === last.to && m.piece === "p");
    if (!same.length) return moves;
    // Exemption when no safe compliant move exists: if every forced
    // continuation would hang the pawn (ends attacked and undefended, and is
    // not a favorable-or-equal capture), the compulsion relents this turn.
    const opp = ctx.me === "w" ? "b" : "w";
    const safeExists = same.some((m) => {
      if (m.captured && PIECE_VAL[m.captured] >= PIECE_VAL[m.piece]) return true;
      const nb = makeMove(ctx.board, m);
      const attacked = attackedBy(nb, opp).has(m.to);
      const defended = attackedBy(nb, ctx.me).has(m.to);
      return !attacked || defended;
    });
    return safeExists ? same : moves;
  },
});

export const THEOCRACY: Nerf = db({
  id: "theocracy", name: "Theocracy", tier: 5, implemented: true,
  description: "On odd/even moves, can only capture with bishops. This activates only after your move 3.",
  init: (rng) => ({ parity: rng.int(2) as 0 | 1 }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { parity: 0 | 1 };
    if (ctx.moveNumber < 3) return moves;
    const turn = ctx.moveNumber + 1;
    if (turn % 2 !== s.parity) return moves;
    return moves.filter((m) => !m.captured || m.piece === "b");
  },
  hint: (state, ctx) => {
    const s = state as { parity: 0 | 1 };
    if (ctx.moveNumber < 3) return null;
    const turn = ctx.moveNumber + 1;
    if (turn % 2 !== s.parity) return null;
    return { text: "A holy turn: only bishops may capture.", tone: "info" };
  },
});

export const BOTTLED_LIGHTNING: Nerf = db({
  id: "bottled_lightning", name: "Bottled Lightning", tier: 8, implemented: true,
  description: "If you can move your king, you must.",
  filterMoves: (moves) => {
    const km = moves.filter((m) => m.piece === "k");
    return km.length ? km : moves;
  },
});

export const FOG_OF_WAR_OLD: Nerf = db({
  id: "fog_of_war_old", name: "Fog of War (extended)", tier: 7, icon: "cloud-fog", implemented: true,
  description: "Hide opponent pieces entirely.",
  visual: () => ({ fogged: true }),
});

// ------------------------- AGGREGATE -------------------------

export const MORE_NERFS: Nerf[] = [
  ROOK_BUDDIES, SEPARATION_ANXIETY, CROSSING_THE_RUBICON, QUEEN_DISGUISE, QUEEN_BEE,
  ENTRENCHED, QUIT_HORSING_AROUND, ROYAL_JUBILEE, PRIMA_DONNA, SEPARATION_CHURCH_STATE,
  ESCORT_MISSION, BATTLE_FATIGUE, SNIPERS, DIPLOMATIC_IMMUNITY, FEMME_FATALE,
  GET_DOWN_MR_PRESIDENT, POWER_CELLS, UNSPOOLING, EVIL_TWIN, DOCTOR_OCTOPUS,
  PROTECTED_PAWNS, JUST_PASSING_THROUGH, REMORSEFUL, SHAPESHIFTER, HORSE_EATS_FIRST,
  WINDUP_TOYS, ABSTINENCE, YOU_BEST_NOT_MISS, EYE_OF_SAURON, SAVIOR_COMPLEX,
  RECONNAISSANCE, CONTROL_CENTER, HAUNTED, TOWER_DEFENSE, PARANOID,
  BIPARTISANSHIP, SHELLSHOCKED, COMFORT_ZONE, LETHAL_ATTRACTION, MODEST,
  TRIPLE_PLAY, SIBLING_RIVALRY, TORCHLIGHT, TURN_OTHER_CHEEK, GAMBLER,
  BLINDED_BY_SUN, BISHOP_FAN_CLUB, CHIVALRY, SPREAD_OUT, PEONS_FIRST,
  MOVING_DAY, ODDBALL, EVEN_KEELED, SOCIAL_DISTANCING, DRAG,
  STIR_CRAZY, ROOK_ON_SEVENTH, GUERILLA_TACTICS, CHEERLEADERS, SCOUTING_AHEAD,
  WARLORD, MEDUSA, FISCHER_RANDOM_ENDGAME, CENTRALIZED_COMMAND, STAND_YOUR_GROUND,
  ALWAYS_CHECK_IT_MIGHT_BE_MATE, GLORIOUS_BATTLE, FLATTERER, MESSY_DIVORCE, LEVELING_UP,
  HOMELAND_SECURITY, COWERING_IN_FEAR, BARBARIAN_RAGE, MY_KINGDOM_FOR_A_HORSE, EYE_FOR_AN_EYE,
  SIMON_SAYS, IRRESISTIBLE, BOASTFUL, WINDS_OF_FATE, MONKEY_SEE,
  TRUE_LOVE, SUPERSTITIOUS, EAT_YOUR_VEGETABLES, BLOODTHIRSTY, LEFT_FOR_DEAD,
  CRUSADE, FOG_OF_WAR_OLD, HEDONIC_TREADMILL, DEATH_WISH, CHECKERS,
  CLOSED_BOOK, COVERING_FIRE, UNLUCKY, JUMPY,
  HOPSCOTCH, LEAPS_AND_BOUNDS, COLORBLIND, INCHING_FORWARD, ICHTHYOPHOBE,
  LEFT_TO_RIGHT, FRIENDLY_FIRE, GOING_THE_DISTANCE, HELICOPTER_PARENT, EXCLUSIVITY_CLAUSE,
  RELAY_RACE, DEVIL_ON_SHOULDER, REFLECTIVE, OBSESSION, BOXING_WITH_SHADOW,
  NOBLE_STEED, TAKING_TURNS, CRENELLATIONS, LEADING_THE_CHARGE,
  ACTIVE_VOLCANO, PRINCE_CHARMING, ABSOLUTION, QUICKSAND,
  ROOK_FAN_CLUB, LADIES_FIRST, BRIDGE_OVER_TROUBLED_WATER, ROYAL_BERTH, VELOCIRAPTOR,
  THUNDERDOME, INDECISIVE, UNREQUITED_LOVE, TORPEDOES,
  THEOCRACY, BOTTLED_LIGHTNING,
];
