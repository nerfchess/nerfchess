import { Nerf } from "../nerf";
import { attackedBy, findKing, isInCheck, makeMove } from "../board";
import { Color, FILE, Move, PieceType, RANK, SQ, Square } from "../types";

const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

const adj = (a: Square, b: Square) =>
  a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;

const PIECE_VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function db(d: Nerf): Nerf {
  return { ...d, implemented: true };
}

function pieceSquares(
  board: { pieces: ({ type: PieceType; color: Color } | null)[] },
  color: Color,
  type?: PieceType,
) {
  const out: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p) continue;
    if (p.color === color && (!type || p.type === type)) out.push(sq);
  }
  return out;
}

export const TIMID: Nerf = db({
  id: "timid",
  name: "Timid",
  description: "Your pieces can't capture an enemy worth more than the capturing piece, unless that capturing piece is itself under enemy attack.",
  flavor: "Punch up? Only when cornered.",
  tier: 4,
  icon: "rabbit",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const attacked = attackedBy(ctx.board, opp);
    return moves.filter((m) => {
      if (!m.captured || m.captured === "k") return true;
      if (PIECE_VAL[m.captured] <= PIECE_VAL[m.piece]) return true;
      return attacked.has(m.from);
    });
  },
});

export const KINGFISHER: Nerf = db({
  id: "kingfisher",
  name: "Kingfisher",
  description: "Starting after your third move, when your king can capture it must dive for the richest prize: it has to take the most valuable enemy piece within its reach.",
  flavor: "The kingfisher always dives for the biggest fish.",
  tier: 4,
  icon: "crown",
  implemented: true,
  // Distinct from escort_mission (king must take, any target): the kingfisher
  // is forced onto the HIGHEST-value king capture available.
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves; // activation delayed until after move 3
    const kingCaps = moves.filter((m) => m.piece === "k" && m.captured);
    if (!kingCaps.length) return moves;
    const best = Math.max(...kingCaps.map((m) => (m.captured ? PIECE_VAL[m.captured] : 0)));
    return kingCaps.filter((m) => (m.captured ? PIECE_VAL[m.captured] : 0) === best);
  },
  hint: (_s, ctx, legal) => {
    if (ctx.moveNumber < 3) return null;
    const kc = legal.filter((m) => m.piece === "k" && m.captured);
    if (!kc.length) return null;
    return {
      text: "Your king dives for the richest prize.",
      squares: Array.from(new Set(kc.map((m) => m.from))),
      tone: "warn",
    };
  },
});

export const MAGNETIC_KINGS: Nerf = db({
  id: "magnetic_kings",
  name: "Magnetic Kings",
  description: "When you move your king, it must not end up farther from the enemy king than it started (equal distance is allowed). Moving any other piece is unrestricted.",
  flavor: "An inexorable pull.",
  tier: 6,
  icon: "magnet",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const oks = findKing(ctx.board, opp);
    const mks = findKing(ctx.board, ctx.me);
    if (oks == null || mks == null) return moves;
    const startDist = cheb(mks, oks);
    return moves.filter((m) => {
      if (m.piece !== "k") {
        // king stays put → distance unchanged → fine
        return true;
      }
      return cheb(m.to, oks) <= startDist;
    });
  },
});

export const PAWN_DUTY: Nerf = db({
  id: "pawn_duty",
  name: "Pawn Duty",
  description: "Every third turn, you must move a pawn.",
  flavor: "Discipline above all.",
  tier: 4,
  icon: "footprints",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 3 !== 0) return moves;
    const pawn = moves.filter((m) => m.piece === "p");
    return pawn.length ? pawn : moves;
  },
});

export const VAMPIRIC: Nerf = db({
  id: "vampiric",
  name: "Vampiric",
  description: "You can only capture on dark squares, starting on your second move. The forbidden light squares are shown from the start.",
  flavor: "Sunlight burns.",
  tier: 4,
  icon: "moon",
  implemented: true,
  filterMoves: (moves, _s, ctx) =>
    ctx.moveNumber < 1
      ? moves
      : moves.filter((m) => !m.captured || (FILE(m.to) + RANK(m.to)) % 2 === 0),
  visual: () => {
    const light: number[] = [];
    for (let sq = 0; sq < 64; sq++) if ((FILE(sq) + RANK(sq)) % 2 === 1) light.push(sq);
    return { bannedSquares: light };
  },
});

export const SOLAR_FLARE: Nerf = db({
  id: "solar_flare",
  name: "Solar Flare",
  description: "You can only capture on light squares, starting on your second move. The forbidden dark squares are shown from the start.",
  flavor: "Daylight, only.",
  tier: 4,
  icon: "sun",
  implemented: true,
  filterMoves: (moves, _s, ctx) =>
    ctx.moveNumber < 1
      ? moves
      : moves.filter((m) => !m.captured || (FILE(m.to) + RANK(m.to)) % 2 === 1),
  visual: () => {
    const dark: number[] = [];
    for (let sq = 0; sq < 64; sq++) if ((FILE(sq) + RANK(sq)) % 2 === 0) dark.push(sq);
    return { bannedSquares: dark };
  },
});

export const CONSTRICTION: Nerf = db({
  id: "constriction",
  name: "Constriction",
  description: "Every 6 of your turns, the playable board loses a rank from the back, up to 3 ranks. This restriction cannot be overridden by card effects.",
  flavor: "The walls close in.",
  tier: 6,
  icon: "minimize",
  implemented: true,
  init: () => ({ closed: 0 }),
  onTurnStart: (_s, ctx) => ({ closed: Math.min(3, Math.floor(ctx.moveNumber / 6)) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { closed: number };
    if (s.closed <= 0) return moves;
    const forbidden = (sq: number) => {
      const r = RANK(sq);
      if (ctx.me === "w") return r < s.closed;
      return r > 7 - s.closed;
    };
    return moves.filter((m) => !forbidden(m.from) && !forbidden(m.to));
  },
  visual: (state, ctx) => {
    const s = state as { closed: number };
    const banned: number[] = [];
    for (let r = 0; r < s.closed; r++) {
      const rank = ctx.me === "w" ? r : 7 - r;
      for (let f = 0; f < 8; f++) banned.push(SQ(f, rank));
    }
    return { bannedSquares: banned };
  },
});

export const MIRROR_MARCH: Nerf = db({
  id: "mirror_march",
  name: "Mirror March",
  description: "Your move must go the same file direction (left or right) as your opponent's last move, except a piece already on the edge file in that direction may move any way.",
  flavor: "Copycat.",
  tier: 5,
  icon: "git-compare",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.opponentLastMove;
    if (!last) return moves;
    const dx = FILE(last.to) - FILE(last.from);
    if (dx === 0) return moves; // no constraint on perfectly straight opponent moves
    const sign = Math.sign(dx);
    const same = moves.filter((m) => {
      if (Math.sign(FILE(m.to) - FILE(m.from)) === sign) return true;
      // a piece already on the edge file in the forced direction may leave normally
      return sign < 0 ? FILE(m.from) === 0 : FILE(m.from) === 7;
    });
    return same.length ? same : moves;
  },
});

export const RUSTY_KNIGHTS: Nerf = db({
  id: "rusty_knights",
  name: "Rusty Knights",
  description: "Knights can only move once every other turn.",
  flavor: "Their joints creak.",
  tier: 3,
  icon: "horse",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    if (ctx.myLastMove?.piece === "n") return moves.filter((m) => m.piece !== "n");
    return moves;
  },
});

export const CLERGY: Nerf = db({
  id: "clergy",
  name: "Clergy",
  description: "Your bishops can't move backward toward your own side; each bishop move must stay level or advance toward the enemy.",
  flavor: "The faith does not waver.",
  tier: 3,
  icon: "cross",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const dir = ctx.me === "w" ? 1 : -1;
    return moves.filter(
      (m) => m.piece !== "b" || (RANK(m.to) - RANK(m.from)) * dir >= 0,
    );
  },
});

export const HEAVY_BOOTS: Nerf = db({
  id: "heavy_boots",
  name: "Heavy Boots",
  description: "All non-pawn moves are distance ≤ 3.",
  flavor: "Lift, drag, place.",
  tier: 4,
  icon: "boot",
  implemented: true,
  filterMoves: (moves) =>
    moves.filter((m) => m.piece === "p" || cheb(m.from, m.to) <= 3),
});

export const GOLDFISH: Nerf = db({
  id: "goldfish",
  name: "Goldfish",
  description: "You can't move a piece you moved 3 turns ago.",
  flavor: "Wait, what was I doing?",
  tier: 4,
  icon: "fish",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    if (mine.length < 3) return moves;
    const three = mine[mine.length - 3];
    return moves.filter((m) => m.from !== three.to);
  },
});

export const ASCETIC: Nerf = db({
  id: "ascetic",
  name: "Ascetic",
  description: "You can capture at most one piece per piece type. If no move complies, your king may move instead.",
  flavor: "One vice each.",
  tier: 6,
  icon: "ban",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const eaten = new Set<PieceType>();
    for (const m of ctx.board.history) {
      if (m.color === ctx.me && m.captured) eaten.add(m.captured);
    }
    const compliant = moves.filter((m) => !m.captured || m.captured === "k" || !eaten.has(m.captured));
    if (compliant.length) return compliant;
    // no compliant move exists: fall back to a king move so you are not stuck
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const PAWN_STORM: Nerf = db({
  id: "pawn_storm",
  name: "Pawn Storm",
  description: "If your last move wasn't a pawn move, you must move a pawn (if possible).",
  flavor: "Send in the infantry.",
  tier: 6,
  icon: "wind",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    if (ctx.myLastMove?.piece === "p") return moves;
    const pawn = moves.filter((m) => m.piece === "p");
    return pawn.length ? pawn : moves;
  },
});

export const ROYAL_GUARD: Nerf = db({
  id: "royal_guard",
  name: "Royal Guard",
  description: "Your non-king pieces that are adjacent to your king at the start of your turn can't move. The king itself may still move.",
  flavor: "Don't leave his side.",
  tier: 4,
  icon: "shield-check",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return moves;
    return moves.filter((m) => m.piece === "k" || !adj(m.from, ks));
  },
});

export const HONEY_TRAP: Nerf = db({
  id: "honey_trap",
  name: "Honey Trap",
  description: "Your queen can't move unless she is currently under attack by an enemy piece.",
  flavor: "She waits, smiling.",
  tier: 5,
  icon: "honey",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const attacks = attackedBy(ctx.board, opp);
    return moves.filter((m) => m.piece !== "q" || attacks.has(m.from));
  },
});

export const TIDY_DESK: Nerf = db({
  id: "tidy_desk",
  name: "Tidy Desk",
  description: "By move 25, you must have at least one piece on every rank of your half but one; you may leave a single rank of your choosing open.",
  flavor: "Everything in its place.",
  tier: 5,
  icon: "layout-grid",
  implemented: true,
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 25) return null;
    const ranks = ctx.me === "w" ? [0, 1, 2, 3] : [4, 5, 6, 7];
    const empty: number[] = [];
    for (const r of ranks) {
      let has = false;
      for (let f = 0; f < 8; f++) {
        const p = ctx.board.pieces[SQ(f, r)];
        if (p && p.color === ctx.me) { has = true; break; }
      }
      if (!has) empty.push(r);
    }
    // one rank of your choosing may be left open: you only lose once two or more are empty
    if (empty.length >= 2) return { reason: `ranks ${empty.map((r) => r + 1).join(", ")} empty` };
    return null;
  },
});

export const PHOBIA_OF_EDGES: Nerf = db({
  id: "phobia_of_edges",
  name: "Phobia of Edges",
  description: "If a piece is on the rim, it must move.",
  flavor: "Don't look down.",
  tier: 5,
  icon: "frame",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const onRim = (sq: number) => {
      const f = FILE(sq), r = RANK(sq);
      return f === 0 || f === 7 || r === 0 || r === 7;
    };
    const rimPieces = new Set<number>();
    for (const sq of pieceSquares(ctx.board, ctx.me)) {
      if (onRim(sq)) rimPieces.add(sq);
    }
    if (!rimPieces.size) return moves;
    const fromRim = moves.filter((m) => rimPieces.has(m.from));
    return fromRim.length ? fromRim : moves;
  },
});

export const SACRED_FILE: Nerf = db({
  id: "sacred_file",
  name: "Sacred File",
  description: "A random file is sacred, shown from the start. From your second turn on, you can't capture on it, unless the ban would leave you fewer than three legal moves.",
  flavor: "Hallowed ground.",
  tier: 2,
  icon: "shield-question",
  implemented: true,
  init: (rng) => ({ file: rng.int(8) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { file: number };
    if (ctx.moveNumber < 1) return moves; // revealed from the start, but the ban waits one turn
    const filtered = moves.filter((m) => !m.captured || FILE(m.to) !== s.file);
    return filtered.length >= 3 ? filtered : moves;
  },
  visual: (state) => {
    const s = state as { file: number };
    const sqs: number[] = [];
    for (let r = 0; r < 8; r++) sqs.push(SQ(s.file, r));
    return { bannedSquares: sqs };
  },
});

export const SUNRISE: Nerf = db({
  id: "sunrise",
  name: "Sunrise",
  description: "On odd turns you must move forward; on even turns you may move freely.",
  flavor: "Mornings demand progress.",
  tier: 5,
  icon: "sunrise",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 2 === 0) return moves;
    const dir = ctx.me === "w" ? 1 : -1;
    const forward = moves.filter((m) => (RANK(m.to) - RANK(m.from)) * dir > 0);
    return forward.length ? forward : moves;
  },
});

export const WAGON_TRAIN: Nerf = db({
  id: "wagon_train",
  name: "Wagon Train",
  description: "Keep the column in its lane: each move must land on the same file as your previous move's destination or a file right next to it.",
  flavor: "Keep the column tight.",
  tier: 8,
  icon: "route",
  implemented: true,
  // Distinct from domino (full king-adjacency of the two destinations): wagon
  // train only constrains the file, so the column stays within a three-file
  // lane while the rank stays free.
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const near = moves.filter((m) => Math.abs(FILE(m.to) - FILE(last.to)) <= 1);
    return near.length ? near : moves;
  },
});

export const HOARDER: Nerf = db({
  id: "hoarder",
  name: "Hoarder",
  description: "If you ever have fewer than 8 pawns, you lose the game.",
  flavor: "Don't lose a single one.",
  tier: 8,
  icon: "wheat",
  implemented: true,
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber === 0) return null;
    const pawns = pieceSquares(ctx.board, ctx.me, "p").length;
    return pawns < 8 ? { reason: "lost a pawn" } : null;
  },
});

export const VANISHING_POINT: Nerf = db({
  id: "vanishing_point",
  name: "Vanishing Point",
  description: "Your pieces can't move to the same square twice in the game.",
  flavor: "Each step, the last of its kind.",
  tier: 6,
  icon: "circle-off",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const used = new Set<number>();
    for (const m of ctx.board.history) if (m.color === ctx.me) used.add(m.to);
    const fresh = moves.filter((m) => !used.has(m.to));
    return fresh.length ? fresh : moves;
  },
});

export const ECHO_CHAMBER: Nerf = db({
  id: "echo_chamber",
  name: "Echo Chamber",
  description: "Starting on move 4, you must move to the same rank as your last move's destination.",
  flavor: "It bounces around in here.",
  tier: 6,
  icon: "audio-waveform",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves; // rule starts on move 4 so the opening cannot be soft-locked
    const last = ctx.myLastMove;
    if (!last) return moves;
    const filtered = moves.filter((m) => RANK(m.to) === RANK(last.to));
    return filtered.length ? filtered : moves;
  },
});

export const TRIPWIRE: Nerf = db({
  id: "tripwire",
  name: "Tripwire",
  description: "A random rank is a tripwire, shown from the start. From your second turn on, you can't cross it backwards, unless the ban would leave you fewer than three legal moves.",
  flavor: "Snap.",
  tier: 4,
  icon: "trip",
  implemented: true,
  init: (rng) => ({ rank: 1 + rng.int(6) }),
  filterMoves: (moves, state, ctx) => {
    const s = state as { rank: number };
    if (ctx.moveNumber < 1) return moves; // revealed from the start, but the ban waits one turn
    const dir = ctx.me === "w" ? -1 : 1;
    const filtered = moves.filter((m) => {
      // backwards crossing of the rank
      const r1 = RANK(m.from), r2 = RANK(m.to);
      if (dir === -1) return !(r1 > s.rank && r2 <= s.rank);
      return !(r1 < s.rank && r2 >= s.rank);
    });
    return filtered.length >= 3 ? filtered : moves;
  },
  visual: (state) => {
    const s = state as { rank: number };
    const sqs: number[] = [];
    for (let f = 0; f < 8; f++) sqs.push(SQ(f, s.rank));
    return { highlightSquares: sqs };
  },
});

export const PROMOTION_PHOBIA: Nerf = db({
  id: "promotion_phobia",
  name: "Promotion Phobia",
  description: "Your pawns can't promote, so they can't advance onto the back rank. A pawn already on the back rank may still move away normally.",
  flavor: "Stage fright.",
  tier: 3,
  icon: "x-circle",
  implemented: true,
  filterMoves: (moves) => moves.filter((m) => !m.promotion),
});

export const KNIGHT_PARADE: Nerf = db({
  id: "knight_parade",
  name: "Knight Parade",
  description: "You must move each knight at least once before moving the same knight twice.",
  flavor: "Take turns.",
  tier: 4,
  icon: "horse",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    // Track which knights (by current square) have moved. A knight that just
    // moved is at its `to` square; we don't allow moving from a knight square
    // whose piece has already moved before another knight has moved.
    // Simpler: alternate between knights based on last knight move.
    const lastKnight = [...ctx.board.history]
      .reverse()
      .find((m) => m.color === ctx.me && m.piece === "n");
    if (!lastKnight) return moves;
    return moves.filter((m) => m.piece !== "n" || m.from !== lastKnight.to);
  },
});

export const RHYTHM_MASTER: Nerf = db({
  id: "rhythm_master",
  name: "Rhythm Master",
  description: "You must alternate captures and non-captures. If no move complies, your king may move instead.",
  flavor: "And one, and two, and...",
  tier: 6,
  icon: "music",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const wantCapture = !last.captured;
    const filtered = moves.filter((m) => !!m.captured === wantCapture);
    if (filtered.length) return filtered;
    // no compliant move exists: fall back to a king move so you are not stuck
    const kingMoves = moves.filter((m) => m.piece === "k");
    return kingMoves.length ? kingMoves : moves;
  },
});

export const ICY_SQUARES: Nerf = db({
  id: "icy_squares",
  name: "Icy Squares",
  description: "Starting on move 4, after you move a piece it must slide once more in the same direction on your next move (if possible). Forced slides don't force another.",
  flavor: "Slide.",
  tier: 6,
  icon: "snowflake",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 3) return moves; // rule starts on move 4 so the opening cannot be soft-locked
    const last = ctx.myLastMove;
    if (!last) return moves;
    const df = Math.sign(FILE(last.to) - FILE(last.from));
    const dr = Math.sign(RANK(last.to) - RANK(last.from));
    if (df === 0 && dr === 0) return moves;
    // The ice only carries a piece one extra step: if the last move was
    // itself the slide continuing the move before it, the piece has already
    // slid and this turn is free.
    const mine = ctx.board.history.filter((m) => m.color === ctx.me);
    const prev = mine[mine.length - 2];
    if (
      prev &&
      last.from === prev.to &&
      df === Math.sign(FILE(prev.to) - FILE(prev.from)) &&
      dr === Math.sign(RANK(prev.to) - RANK(prev.from))
    ) {
      return moves;
    }
    const slides = moves.filter((m) => {
      if (m.from !== last.to) return false;
      return Math.sign(FILE(m.to) - FILE(m.from)) === df &&
             Math.sign(RANK(m.to) - RANK(m.from)) === dr;
    });
    return slides.length ? slides : moves;
  },
});

export const QUARANTINE: Nerf = db({
  id: "quarantine",
  name: "Quarantine",
  description: "You can't move a piece into your own first two ranks from outside them (pieces already on those ranks may still move within them). Separately, while your king is in check, only your king may move.",
  flavor: "Lock down.",
  tier: 5,
  icon: "biohazard",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const homeRanks = ctx.me === "w" ? [0, 1] : [6, 7];
    const noRetreat = moves.filter((m) => !homeRanks.includes(RANK(m.to)) || homeRanks.includes(RANK(m.from)));
    if (isInCheck(ctx.board, ctx.me)) {
      const k = noRetreat.filter((m) => m.piece === "k");
      return k.length ? k : noRetreat;
    }
    return noRetreat;
  },
});

export const FRESH_FACES: Nerf = db({
  id: "fresh_faces",
  name: "Fresh Faces",
  description: "Each turn, you must move a piece that hasn't moved yet, until none remain.",
  flavor: "Everyone gets a turn.",
  tier: 6,
  icon: "users",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const moved = new Set<number>();
    for (const m of ctx.board.history) if (m.color === ctx.me) moved.add(m.to);
    const fresh = moves.filter((m) => !moved.has(m.from));
    return fresh.length ? fresh : moves;
  },
});

export const BURNING_BRIDGES: Nerf = db({
  id: "burning_bridges",
  name: "Burning Bridges",
  description: "Your bishops, rooks, and queen can't travel over a square they have already passed over earlier in the game.",
  flavor: "The path collapses behind you.",
  tier: 5,
  icon: "flame",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const burned = new Set<number>();
    for (const m of ctx.board.history) {
      if (m.color !== ctx.me) continue;
      const df = Math.sign(FILE(m.to) - FILE(m.from));
      const dr = Math.sign(RANK(m.to) - RANK(m.from));
      const steps = Math.max(
        Math.abs(FILE(m.to) - FILE(m.from)),
        Math.abs(RANK(m.to) - RANK(m.from)),
      );
      if (m.piece === "n" || m.piece === "p" || m.piece === "k") continue;
      for (let i = 1; i < steps; i++) {
        burned.add(SQ(FILE(m.from) + df * i, RANK(m.from) + dr * i));
      }
    }
    return moves.filter((m) => {
      if (m.piece === "n" || m.piece === "p" || m.piece === "k") return true;
      const df = Math.sign(FILE(m.to) - FILE(m.from));
      const dr = Math.sign(RANK(m.to) - RANK(m.from));
      const steps = Math.max(
        Math.abs(FILE(m.to) - FILE(m.from)),
        Math.abs(RANK(m.to) - RANK(m.from)),
      );
      for (let i = 1; i < steps; i++) {
        if (burned.has(SQ(FILE(m.from) + df * i, RANK(m.from) + dr * i))) return false;
      }
      return true;
    });
  },
});

export const COURT_MARTIAL: Nerf = db({
  id: "court_martial",
  name: "Court Martial",
  description: "A piece that's attacked at turn start can't capture.",
  flavor: "Under investigation.",
  tier: 3,
  icon: "gavel",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const opp = ctx.me === "w" ? "b" : "w";
    const attacks = attackedBy(ctx.board, opp);
    return moves.filter((m) => !m.captured || !attacks.has(m.from));
  },
});

export const NEAT_FREAK: Nerf = db({
  id: "neat_freak",
  name: "Neat Freak",
  description: "After turn 10, you lose if two of your pieces of the same type (pawns aside) ever share a diagonal.",
  flavor: "Don't crowd me.",
  tier: 8,
  icon: "ruler",
  implemented: true,
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 10) return null;
    const byType: Partial<Record<PieceType, number[]>> = {};
    for (const sq of pieceSquares(ctx.board, ctx.me)) {
      const t = ctx.board.pieces[sq]!.type;
      if (t === "p" || t === "k") continue;
      (byType[t] ||= []).push(sq);
    }
    for (const t of Object.keys(byType) as PieceType[]) {
      const list = byType[t]!;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (Math.abs(FILE(a) - FILE(b)) === Math.abs(RANK(a) - RANK(b))) {
            return { reason: "two same pieces share a diagonal" };
          }
        }
      }
    }
    return null;
  },
});

export const ARTILLERY: Nerf = db({
  id: "artillery",
  name: "Artillery",
  description: "Rooks must capture at distance ≥ 4.",
  flavor: "Range is everything.",
  tier: 4,
  icon: "crosshair",
  implemented: true,
  filterMoves: (moves) =>
    moves.filter((m) => !(m.piece === "r" && m.captured && cheb(m.from, m.to) < 4)),
});

export const VERTIGO: Nerf = db({
  id: "vertigo",
  name: "Vertigo",
  description: "Can't move a piece more than 2 ranks in one move.",
  flavor: "Don't look up.",
  tier: 4,
  icon: "spiral",
  implemented: true,
  filterMoves: (moves) =>
    moves.filter((m) => Math.abs(RANK(m.to) - RANK(m.from)) <= 2),
});

export const COURT_JESTER: Nerf = db({
  id: "court_jester",
  name: "Court Jester",
  description: "Your queen can only move like a knight.",
  flavor: "A fool with a crown.",
  tier: 5,
  icon: "party-popper",
  implemented: true,
  filterMoves: (moves) =>
    moves.filter((m) => {
      if (m.piece !== "q") return true;
      const df = Math.abs(FILE(m.to) - FILE(m.from));
      const dr = Math.abs(RANK(m.to) - RANK(m.from));
      return (df === 1 && dr === 2) || (df === 2 && dr === 1);
    }),
});

export const DOMINO: Nerf = db({
  id: "domino",
  name: "Domino",
  description: "Each move must end adjacent to your previous move's destination. Spawned and teleported pieces obey this immediately.",
  flavor: "Tip them over in sequence.",
  tier: 6,
  icon: "spline",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const near = moves.filter((m) => adj(m.to, last.to));
    return near.length ? near : moves;
  },
});

export const SLOWPOKE: Nerf = db({
  id: "slowpoke",
  name: "Slowpoke",
  description: "All your moves must be distance exactly 1. On every fifth turn, a single knight leap is allowed instead.",
  flavor: "Step. By. Step.",
  tier: 6,
  icon: "footprints",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const allowLeap = (ctx.moveNumber + 1) % 5 === 0; // one knight leap every five owner turns
    return moves.filter((m) => {
      if (cheb(m.from, m.to) === 1) return true;
      if (allowLeap && m.piece === "n") {
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        return (df === 1 && dr === 2) || (df === 2 && dr === 1);
      }
      return false;
    });
  },
});

export const PILGRIMAGE: Nerf = db({
  id: "pilgrimage",
  name: "Pilgrimage",
  description: "Your king must reach the opposite back rank by move 30.",
  flavor: "To the holy land.",
  tier: 7,
  icon: "map",
  implemented: true,
  checkLoss: (_s, ctx) => {
    if (ctx.moveNumber < 30) return null;
    const ks = findKing(ctx.board, ctx.me);
    if (ks == null) return null;
    const target = ctx.me === "w" ? 7 : 0;
    return RANK(ks) === target ? null : { reason: "king didn't make pilgrimage" };
  },
});

export const SCHOLARSHIP: Nerf = db({
  id: "scholarship",
  name: "Scholarship",
  description: "You can only move a piece type after the opponent has moved it once.",
  flavor: "Learn first; then act.",
  tier: 5,
  icon: "book-open",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const learned = new Set<PieceType>();
    for (const m of ctx.board.history) if (m.color !== ctx.me) learned.add(m.piece);
    const filtered = moves.filter((m) => learned.has(m.piece));
    return filtered.length ? filtered : moves;
  },
});

export const TRIBUTE: Nerf = db({
  id: "tribute",
  name: "Tribute",
  description: "Every 8th turn, if you can push a pawn onto a square the enemy attacks, you must.",
  flavor: "Pay the toll.",
  tier: 6,
  icon: "coins",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const turn = ctx.moveNumber + 1;
    if (turn % 8 !== 0) return moves;
    const opp = ctx.me === "w" ? "b" : "w";
    const oppAttacks = attackedBy(ctx.board, opp);
    const sacrifices = moves.filter((m) => m.piece === "p" && oppAttacks.has(m.to));
    return sacrifices.length ? sacrifices : moves;
  },
});

export const COLD_FEET: Nerf = db({
  id: "cold_feet",
  name: "Cold Feet",
  description: "Your king can't move into the center 16 squares.",
  flavor: "Stay on the wing.",
  tier: 2,
  icon: "wind",
  implemented: true,
  filterMoves: (moves) =>
    moves.filter((m) => {
      if (m.piece !== "k") return true;
      const f = FILE(m.to), r = RANK(m.to);
      return !(f >= 2 && f <= 5 && r >= 2 && r <= 5);
    }),
});

export const SWITCHBACK: Nerf = db({
  id: "switchback",
  name: "Switchback",
  description: "You can't move in the exact same direction (same file and rank step) twice in a row.",
  flavor: "Zig and zag.",
  tier: 5,
  icon: "shuffle",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const last = ctx.myLastMove;
    if (!last) return moves;
    const lastDf = Math.sign(FILE(last.to) - FILE(last.from));
    const lastDr = Math.sign(RANK(last.to) - RANK(last.from));
    const zigzag = moves.filter((m) => {
      const df = Math.sign(FILE(m.to) - FILE(m.from));
      const dr = Math.sign(RANK(m.to) - RANK(m.from));
      return !(df === lastDf && dr === lastDr);
    });
    return zigzag.length ? zigzag : moves;
  },
});

export const ARMORY: Nerf = db({
  id: "armory",
  name: "Armory",
  description: "Your rooks must stay defended at all times.",
  flavor: "Don't leave them in the open.",
  tier: 5,
  icon: "shield",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    const legal = moves.filter((m) => {
      const nb = makeMove(ctx.board, m);
      const defenders = attackedBy(nb, ctx.me);
      const rooks = pieceSquares(nb, ctx.me, "r");
      return rooks.every((sq) => defenders.has(sq));
    });
    return legal.length ? legal : moves;
  },
});

export const COUNTING_SHEEP: Nerf = db({
  id: "counting_sheep",
  name: "Counting Sheep",
  description: "Once you've moved a piece type 5 times, you can't move it again.",
  flavor: "Five's the limit.",
  tier: 6,
  icon: "list-ordered",
  implemented: true,
  progress: (_s, ctx) => {
    const counts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    for (const m of ctx.board.history) if (m.color === ctx.me) counts[m.piece]++;
    let max = 0;
    let which: PieceType = "p";
    for (const t of ["p", "n", "b", "r", "q", "k"] as PieceType[]) {
      if (counts[t] > max) { max = counts[t]; which = t; }
    }
    const names: Record<PieceType, string> = { p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "kings" };
    return { value: Math.min(max, 5), max: 5, label: `${max}/5 ${names[which]} moved` };
  },
  filterMoves: (moves, _s, ctx) => {
    const counts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    for (const m of ctx.board.history) if (m.color === ctx.me) counts[m.piece]++;
    const allowed = moves.filter((m) => counts[m.piece] < 5);
    return allowed.length ? allowed : moves;
  },
});

export const FAMINE: Nerf = db({
  id: "famine",
  name: "Famine",
  description: "After move 15, you can't capture pawns.",
  flavor: "No more bread.",
  tier: 4,
  icon: "wheat-off",
  implemented: true,
  filterMoves: (moves, _s, ctx) => {
    if (ctx.moveNumber < 15) return moves;
    return moves.filter((m) => m.captured !== "p");
  },
});

export const EXTRA_NERFS: Nerf[] = [
  TIMID,
  KINGFISHER,
  MAGNETIC_KINGS,
  PAWN_DUTY,
  VAMPIRIC,
  SOLAR_FLARE,
  CONSTRICTION,
  MIRROR_MARCH,
  RUSTY_KNIGHTS,
  HEAVY_BOOTS,
  GOLDFISH,
  ASCETIC,
  PAWN_STORM,
  ROYAL_GUARD,
  HONEY_TRAP,
  TIDY_DESK,
  PHOBIA_OF_EDGES,
  SACRED_FILE,
  SUNRISE,
  WAGON_TRAIN,
  HOARDER,
  VANISHING_POINT,
  ECHO_CHAMBER,
  TRIPWIRE,
  PROMOTION_PHOBIA,
  KNIGHT_PARADE,
  RHYTHM_MASTER,
  ICY_SQUARES,
  QUARANTINE,
  FRESH_FACES,
  BURNING_BRIDGES,
  COURT_MARTIAL,
  NEAT_FREAK,
  ARTILLERY,
  VERTIGO,
  COURT_JESTER,
  DOMINO,
  SLOWPOKE,
  PILGRIMAGE,
  SCHOLARSHIP,
  TRIBUTE,
  SWITCHBACK,
  ARMORY,
  COUNTING_SHEEP,
  FAMINE,
  CLERGY,
];
