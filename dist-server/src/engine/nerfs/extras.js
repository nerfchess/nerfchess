"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRA_NERFS = exports.FAMINE = exports.COUNTING_SHEEP = exports.ARMORY = exports.SWITCHBACK = exports.COLD_FEET = exports.TRIBUTE = exports.SCHOLARSHIP = exports.PILGRIMAGE = exports.SLOWPOKE = exports.DOMINO = exports.COURT_JESTER = exports.VERTIGO = exports.ARTILLERY = exports.NEAT_FREAK = exports.COURT_MARTIAL = exports.BURNING_BRIDGES = exports.FRESH_FACES = exports.QUARANTINE = exports.HALL_OF_MIRRORS = exports.ICY_SQUARES = exports.RHYTHM_MASTER = exports.KNIGHT_PARADE = exports.PROMOTION_PHOBIA = exports.TRIPWIRE = exports.ECHO_CHAMBER = exports.VANISHING_POINT = exports.HOARDER = exports.WAGON_TRAIN = exports.SUNRISE = exports.SACRED_FILE = exports.PHOBIA_OF_EDGES = exports.TIDY_DESK = exports.HONEY_TRAP = exports.ROYAL_GUARD = exports.PAWN_STORM = exports.ASCETIC = exports.GOLDFISH = exports.HEAVY_BOOTS = exports.CLERGY = exports.RUSTY_KNIGHTS = exports.MIRROR_MARCH = exports.CONSTRICTION = exports.SOLAR_FLARE = exports.VAMPIRIC = exports.PAWN_DUTY = exports.MAGNETIC_KINGS = exports.KINGFISHER = exports.TIMID = void 0;
const board_1 = require("../board");
const types_1 = require("../types");
const cheb = (a, b) => Math.max(Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)), Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)));
const adj = (a, b) => a !== b && Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)) <= 1 && Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)) <= 1;
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function db(d) {
    return { ...d, implemented: true };
}
function pieceSquares(board, color, type) {
    const out = [];
    for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (!p)
            continue;
        if (p.color === color && (!type || p.type === type))
            out.push(sq);
    }
    return out;
}
exports.TIMID = db({
    id: "timid",
    name: "Timid",
    description: "Your pieces can't capture anything worth more than themselves... unless attacked.",
    flavor: "Punch up? Only when cornered.",
    tier: 3,
    icon: "rabbit",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const attacked = (0, board_1.attackedBy)(ctx.board, opp);
        return moves.filter((m) => {
            if (!m.captured || m.captured === "k")
                return true;
            if (PIECE_VAL[m.captured] <= PIECE_VAL[m.piece])
                return true;
            return attacked.has(m.from);
        });
    },
});
exports.KINGFISHER = db({
    id: "kingfisher",
    name: "Kingfisher",
    description: "Your king must capture if it can.",
    flavor: "A taste for blood.",
    tier: 4,
    icon: "crown",
    implemented: true,
    filterMoves: (moves) => {
        const kingCaps = moves.filter((m) => m.piece === "k" && m.captured);
        return kingCaps.length ? kingCaps : moves;
    },
    hint: (_s, _c, legal) => {
        const kc = legal.filter((m) => m.piece === "k" && m.captured);
        if (!kc.length)
            return null;
        return {
            text: "Your king hungers — it must take.",
            squares: Array.from(new Set(kc.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.MAGNETIC_KINGS = db({
    id: "magnetic_kings",
    name: "Magnetic Kings",
    description: "Each turn, your king must end closer to (or as close as) the enemy king.",
    flavor: "An inexorable pull.",
    tier: 4,
    icon: "magnet",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const oks = (0, board_1.findKing)(ctx.board, opp);
        const mks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (oks == null || mks == null)
            return moves;
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
exports.PAWN_DUTY = db({
    id: "pawn_duty",
    name: "Pawn Duty",
    description: "Every third turn, you must move a pawn.",
    flavor: "Discipline above all.",
    tier: 3,
    icon: "footprints",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const turn = ctx.moveNumber + 1;
        if (turn % 3 !== 0)
            return moves;
        const pawn = moves.filter((m) => m.piece === "p");
        return pawn.length ? pawn : moves;
    },
});
exports.VAMPIRIC = db({
    id: "vampiric",
    name: "Vampiric",
    description: "You can only capture on dark squares.",
    flavor: "Sunlight burns.",
    tier: 3,
    icon: "moon",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !m.captured || ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 === 0),
});
exports.SOLAR_FLARE = db({
    id: "solar_flare",
    name: "Solar Flare",
    description: "You can only capture on light squares.",
    flavor: "Daylight, only.",
    tier: 3,
    icon: "sun",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !m.captured || ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 === 1),
});
exports.CONSTRICTION = db({
    id: "constriction",
    name: "Constriction",
    description: "Each of your turns, the playable board shrinks one rank from the back.",
    flavor: "The walls close in.",
    tier: 4,
    icon: "minimize",
    implemented: true,
    init: () => ({ closed: 0 }),
    onTurnStart: (_s, ctx) => ({ closed: Math.min(3, Math.floor(ctx.moveNumber / 6)) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        if (s.closed <= 0)
            return moves;
        const forbidden = (sq) => {
            const r = (0, types_1.RANK)(sq);
            if (ctx.me === "w")
                return r < s.closed;
            return r > 7 - s.closed;
        };
        return moves.filter((m) => !forbidden(m.from) && !forbidden(m.to));
    },
    visual: (state, ctx) => {
        const s = state;
        const banned = [];
        for (let r = 0; r < s.closed; r++) {
            const rank = ctx.me === "w" ? r : 7 - r;
            for (let f = 0; f < 8; f++)
                banned.push((0, types_1.SQ)(f, rank));
        }
        return { bannedSquares: banned };
    },
});
exports.MIRROR_MARCH = db({
    id: "mirror_march",
    name: "Mirror March",
    description: "Your move must mirror the file direction of your opponent's last move.",
    flavor: "Copycat.",
    tier: 4,
    icon: "git-compare",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const dx = (0, types_1.FILE)(last.to) - (0, types_1.FILE)(last.from);
        if (dx === 0)
            return moves; // no constraint on perfectly straight opponent moves
        const sign = Math.sign(dx);
        return moves.filter((m) => Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)) === sign);
    },
});
exports.RUSTY_KNIGHTS = db({
    id: "rusty_knights",
    name: "Rusty Knights",
    description: "Knights can only move once every other turn.",
    flavor: "Their joints creak.",
    tier: 2,
    icon: "horse",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        if (ctx.myLastMove?.piece === "n")
            return moves.filter((m) => m.piece !== "n");
        return moves;
    },
});
exports.CLERGY = db({
    id: "clergy",
    name: "Clergy",
    description: "Your bishops never retreat.",
    flavor: "The faith does not waver.",
    tier: 2,
    icon: "cross",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const dir = ctx.me === "w" ? 1 : -1;
        return moves.filter((m) => m.piece !== "b" || ((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) * dir >= 0);
    },
});
exports.HEAVY_BOOTS = db({
    id: "heavy_boots",
    name: "Heavy Boots",
    description: "All non-pawn moves are distance ≤ 3.",
    flavor: "Lift, drag, place.",
    tier: 3,
    icon: "boot",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.piece === "p" || cheb(m.from, m.to) <= 3),
});
exports.GOLDFISH = db({
    id: "goldfish",
    name: "Goldfish",
    description: "You can't move a piece you moved 3 turns ago.",
    flavor: "Wait — what was I doing?",
    tier: 3,
    icon: "fish",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        if (mine.length < 3)
            return moves;
        const three = mine[mine.length - 3];
        return moves.filter((m) => m.from !== three.to);
    },
});
exports.ASCETIC = db({
    id: "ascetic",
    name: "Ascetic",
    description: "You can capture at most one piece per piece type.",
    flavor: "One vice each.",
    tier: 5,
    icon: "ban",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const eaten = new Set();
        for (const m of ctx.board.history) {
            if (m.color === ctx.me && m.captured)
                eaten.add(m.captured);
        }
        return moves.filter((m) => !m.captured || m.captured === "k" || !eaten.has(m.captured));
    },
});
exports.PAWN_STORM = db({
    id: "pawn_storm",
    name: "Pawn Storm",
    description: "If your last move wasn't a pawn move, you must move a pawn (if possible).",
    flavor: "Send in the infantry.",
    tier: 3,
    icon: "wind",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        if (ctx.myLastMove?.piece === "p")
            return moves;
        const pawn = moves.filter((m) => m.piece === "p");
        return pawn.length ? pawn : moves;
    },
});
exports.ROYAL_GUARD = db({
    id: "royal_guard",
    name: "Royal Guard",
    description: "Pieces adjacent to your king at turn start can't move.",
    flavor: "Don't leave his side.",
    tier: 3,
    icon: "shield-check",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return moves;
        return moves.filter((m) => m.piece === "k" || !adj(m.from, ks));
    },
});
exports.HONEY_TRAP = db({
    id: "honey_trap",
    name: "Honey Trap",
    description: "Your queen can't move unless attacked.",
    flavor: "She waits, smiling.",
    tier: 4,
    icon: "honey",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const attacks = (0, board_1.attackedBy)(ctx.board, opp);
        return moves.filter((m) => m.piece !== "q" || attacks.has(m.from));
    },
});
exports.TIDY_DESK = db({
    id: "tidy_desk",
    name: "Tidy Desk",
    description: "By move 25, you must have at least one piece on each rank of your half.",
    flavor: "Everything in its place.",
    tier: 4,
    icon: "layout-grid",
    implemented: true,
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 25)
            return null;
        const ranks = ctx.me === "w" ? [0, 1, 2, 3] : [4, 5, 6, 7];
        for (const r of ranks) {
            let has = false;
            for (let f = 0; f < 8; f++) {
                const p = ctx.board.pieces[(0, types_1.SQ)(f, r)];
                if (p && p.color === ctx.me) {
                    has = true;
                    break;
                }
            }
            if (!has)
                return { reason: `rank ${r + 1} empty` };
        }
        return null;
    },
});
exports.PHOBIA_OF_EDGES = db({
    id: "phobia_of_edges",
    name: "Phobia of Edges",
    description: "If a piece is on the rim, it must move.",
    flavor: "Don't look down.",
    tier: 3,
    icon: "frame",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const onRim = (sq) => {
            const f = (0, types_1.FILE)(sq), r = (0, types_1.RANK)(sq);
            return f === 0 || f === 7 || r === 0 || r === 7;
        };
        const rimPieces = new Set();
        for (const sq of pieceSquares(ctx.board, ctx.me)) {
            if (onRim(sq))
                rimPieces.add(sq);
        }
        if (!rimPieces.size)
            return moves;
        const fromRim = moves.filter((m) => rimPieces.has(m.from));
        return fromRim.length ? fromRim : moves;
    },
});
exports.SACRED_FILE = db({
    id: "sacred_file",
    name: "Sacred File",
    description: "A random file is sacred. You can't capture on it.",
    flavor: "Hallowed ground.",
    tier: 2,
    icon: "shield-question",
    implemented: true,
    init: (rng) => ({ file: rng.int(8) }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => !m.captured || (0, types_1.FILE)(m.to) !== s.file);
    },
    visual: (state) => {
        const s = state;
        const sqs = [];
        for (let r = 0; r < 8; r++)
            sqs.push((0, types_1.SQ)(s.file, r));
        return { bannedSquares: sqs };
    },
});
exports.SUNRISE = db({
    id: "sunrise",
    name: "Sunrise",
    description: "On odd turns you must move forward; on even turns you may move freely.",
    flavor: "Mornings demand progress.",
    tier: 3,
    icon: "sunrise",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const turn = ctx.moveNumber + 1;
        if (turn % 2 === 0)
            return moves;
        const dir = ctx.me === "w" ? 1 : -1;
        const forward = moves.filter((m) => ((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) * dir > 0);
        return forward.length ? forward : moves;
    },
});
exports.WAGON_TRAIN = db({
    id: "wagon_train",
    name: "Wagon Train",
    description: "All your moves must be to a square adjacent to your most recent move's destination.",
    flavor: "Keep the column tight.",
    tier: 4,
    icon: "route",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => adj(m.to, last.to) || m.to === last.to);
    },
});
exports.HOARDER = db({
    id: "hoarder",
    name: "Hoarder",
    description: "You lose if you ever have fewer pawns than at the start of the game.",
    flavor: "Don't lose a single one.",
    tier: 5,
    icon: "wheat",
    implemented: true,
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        const pawns = pieceSquares(ctx.board, ctx.me, "p").length;
        return pawns < 8 ? { reason: "lost a pawn" } : null;
    },
});
exports.VANISHING_POINT = db({
    id: "vanishing_point",
    name: "Vanishing Point",
    description: "Your pieces can't move to the same square twice in the game.",
    flavor: "Each step, the last of its kind.",
    tier: 5,
    icon: "circle-off",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const used = new Set();
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                used.add(m.to);
        return moves.filter((m) => !used.has(m.to));
    },
});
exports.ECHO_CHAMBER = db({
    id: "echo_chamber",
    name: "Echo Chamber",
    description: "You must move to the same rank as your last move's destination.",
    flavor: "It bounces around in here.",
    tier: 4,
    icon: "audio-waveform",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const filtered = moves.filter((m) => (0, types_1.RANK)(m.to) === (0, types_1.RANK)(last.to));
        return filtered.length ? filtered : moves;
    },
});
exports.TRIPWIRE = db({
    id: "tripwire",
    name: "Tripwire",
    description: "A random rank is a tripwire. If you ever cross it backwards, you lose.",
    flavor: "Snap.",
    tier: 4,
    icon: "trip",
    implemented: true,
    init: (rng) => ({ rank: 1 + rng.int(6) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        const dir = ctx.me === "w" ? -1 : 1;
        return moves.filter((m) => {
            // backwards crossing of the rank
            const r1 = (0, types_1.RANK)(m.from), r2 = (0, types_1.RANK)(m.to);
            if (dir === -1)
                return !(r1 > s.rank && r2 <= s.rank);
            return !(r1 < s.rank && r2 >= s.rank);
        });
    },
    visual: (state) => {
        const s = state;
        const sqs = [];
        for (let f = 0; f < 8; f++)
            sqs.push((0, types_1.SQ)(f, s.rank));
        return { highlightSquares: sqs };
    },
});
exports.PROMOTION_PHOBIA = db({
    id: "promotion_phobia",
    name: "Promotion Phobia",
    description: "Your pawns can't promote — they get stuck on the back rank.",
    flavor: "Stage fright.",
    tier: 4,
    icon: "x-circle",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !m.promotion),
});
exports.KNIGHT_PARADE = db({
    id: "knight_parade",
    name: "Knight Parade",
    description: "You must move each knight at least once before moving the same knight twice.",
    flavor: "Take turns.",
    tier: 3,
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
        if (!lastKnight)
            return moves;
        return moves.filter((m) => m.piece !== "n" || m.from !== lastKnight.to);
    },
});
exports.RHYTHM_MASTER = db({
    id: "rhythm_master",
    name: "Rhythm Master",
    description: "You must alternate captures and non-captures.",
    flavor: "And one, and two, and...",
    tier: 4,
    icon: "music",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const wantCapture = !last.captured;
        const filtered = moves.filter((m) => !!m.captured === wantCapture);
        return filtered.length ? filtered : moves;
    },
});
exports.ICY_SQUARES = db({
    id: "icy_squares",
    name: "Icy Squares",
    description: "After moving to a square, the piece must keep moving in the same direction next turn (if possible).",
    flavor: "Slide.",
    tier: 4,
    icon: "snowflake",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const df = Math.sign((0, types_1.FILE)(last.to) - (0, types_1.FILE)(last.from));
        const dr = Math.sign((0, types_1.RANK)(last.to) - (0, types_1.RANK)(last.from));
        if (df === 0 && dr === 0)
            return moves;
        const slides = moves.filter((m) => {
            if (m.from !== last.to)
                return false;
            return Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)) === df &&
                Math.sign((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) === dr;
        });
        return slides.length ? slides : moves;
    },
});
exports.HALL_OF_MIRRORS = db({
    id: "hall_of_mirrors",
    name: "Hall of Mirrors",
    description: "Your pieces can't move to a square whose file mirror (h-a) is empty.",
    flavor: "Reflection required.",
    tier: 4,
    icon: "split",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const legal = moves.filter((m) => {
            const mirror = (0, types_1.SQ)(7 - (0, types_1.FILE)(m.to), (0, types_1.RANK)(m.to));
            return !!ctx.board.pieces[mirror];
        });
        return legal.length ? legal : moves;
    },
});
exports.QUARANTINE = db({
    id: "quarantine",
    name: "Quarantine",
    description: "If your king is checked, only the king may move that turn. You can't move back to your first two ranks.",
    flavor: "Lock down.",
    tier: 4,
    icon: "biohazard",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const homeRanks = ctx.me === "w" ? [0, 1] : [6, 7];
        const noRetreat = moves.filter((m) => !homeRanks.includes((0, types_1.RANK)(m.to)) || homeRanks.includes((0, types_1.RANK)(m.from)));
        if ((0, board_1.isInCheck)(ctx.board, ctx.me)) {
            const k = noRetreat.filter((m) => m.piece === "k");
            return k.length ? k : noRetreat;
        }
        return noRetreat;
    },
});
exports.FRESH_FACES = db({
    id: "fresh_faces",
    name: "Fresh Faces",
    description: "Each turn, you must move a piece that hasn't moved yet — until none remain.",
    flavor: "Everyone gets a turn.",
    tier: 4,
    icon: "users",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const moved = new Set();
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                moved.add(m.to);
        const fresh = moves.filter((m) => !moved.has(m.from));
        return fresh.length ? fresh : moves;
    },
});
exports.BURNING_BRIDGES = db({
    id: "burning_bridges",
    name: "Burning Bridges",
    description: "Sliders can't pass over a square they previously crossed.",
    flavor: "The path collapses behind you.",
    tier: 5,
    icon: "flame",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const burned = new Set();
        for (const m of ctx.board.history) {
            if (m.color !== ctx.me)
                continue;
            const df = Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.sign((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            const steps = Math.max(Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)), Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)));
            if (m.piece === "n" || m.piece === "p" || m.piece === "k")
                continue;
            for (let i = 1; i < steps; i++) {
                burned.add((0, types_1.SQ)((0, types_1.FILE)(m.from) + df * i, (0, types_1.RANK)(m.from) + dr * i));
            }
        }
        return moves.filter((m) => {
            if (m.piece === "n" || m.piece === "p" || m.piece === "k")
                return true;
            const df = Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.sign((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            const steps = Math.max(Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)), Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)));
            for (let i = 1; i < steps; i++) {
                if (burned.has((0, types_1.SQ)((0, types_1.FILE)(m.from) + df * i, (0, types_1.RANK)(m.from) + dr * i)))
                    return false;
            }
            return true;
        });
    },
});
exports.COURT_MARTIAL = db({
    id: "court_martial",
    name: "Court Martial",
    description: "A piece that's attacked at turn start can't capture.",
    flavor: "Under investigation.",
    tier: 4,
    icon: "gavel",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const attacks = (0, board_1.attackedBy)(ctx.board, opp);
        return moves.filter((m) => !m.captured || !attacks.has(m.from));
    },
});
exports.NEAT_FREAK = db({
    id: "neat_freak",
    name: "Neat Freak",
    description: "After turn 10, you lose if any two pieces share a diagonal.",
    flavor: "Don't crowd me.",
    tier: 5,
    icon: "ruler",
    implemented: true,
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 10)
            return null;
        const mine = pieceSquares(ctx.board, ctx.me);
        for (let i = 0; i < mine.length; i++) {
            for (let j = i + 1; j < mine.length; j++) {
                const a = mine[i], b = mine[j];
                if (Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)) === Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b))) {
                    return { reason: "two pieces share a diagonal" };
                }
            }
        }
        return null;
    },
});
exports.ARTILLERY = db({
    id: "artillery",
    name: "Artillery",
    description: "Rooks must capture at distance ≥ 4.",
    flavor: "Range is everything.",
    tier: 3,
    icon: "crosshair",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !(m.piece === "r" && m.captured && cheb(m.from, m.to) < 4)),
});
exports.VERTIGO = db({
    id: "vertigo",
    name: "Vertigo",
    description: "Can't move a piece more than 2 ranks in one move.",
    flavor: "Don't look up.",
    tier: 3,
    icon: "spiral",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) <= 2),
});
exports.COURT_JESTER = db({
    id: "court_jester",
    name: "Court Jester",
    description: "Your queen can only move like a knight.",
    flavor: "A fool with a crown.",
    tier: 4,
    icon: "party-popper",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (m.piece !== "q")
            return true;
        const df = Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
        const dr = Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
        return (df === 1 && dr === 2) || (df === 2 && dr === 1);
    }),
});
exports.DOMINO = db({
    id: "domino",
    name: "Domino",
    description: "Each move must end adjacent to your previous move's destination.",
    flavor: "Tip them over in sequence.",
    tier: 4,
    icon: "spline",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => adj(m.to, last.to));
    },
});
exports.SLOWPOKE = db({
    id: "slowpoke",
    name: "Slowpoke",
    description: "All your moves must be distance exactly 1.",
    flavor: "Step. By. Step.",
    tier: 4,
    icon: "footprints",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => cheb(m.from, m.to) === 1),
});
exports.PILGRIMAGE = db({
    id: "pilgrimage",
    name: "Pilgrimage",
    description: "Your king must reach the opposite back rank by move 30.",
    flavor: "To the holy land.",
    tier: 5,
    icon: "map",
    implemented: true,
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 30)
            return null;
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return null;
        const target = ctx.me === "w" ? 7 : 0;
        return (0, types_1.RANK)(ks) === target ? null : { reason: "king didn't make pilgrimage" };
    },
});
exports.SCHOLARSHIP = db({
    id: "scholarship",
    name: "Scholarship",
    description: "You can only move a piece type after the opponent has moved it once.",
    flavor: "Learn first; then act.",
    tier: 3,
    icon: "book-open",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const learned = new Set();
        for (const m of ctx.board.history)
            if (m.color !== ctx.me)
                learned.add(m.piece);
        const filtered = moves.filter((m) => learned.has(m.piece));
        return filtered.length ? filtered : moves;
    },
});
exports.TRIBUTE = db({
    id: "tribute",
    name: "Tribute",
    description: "Every 8 turns, you must lose a pawn (move it to a defended enemy attack).",
    flavor: "Pay the toll.",
    tier: 5,
    icon: "coins",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const turn = ctx.moveNumber + 1;
        if (turn === 0 || turn % 8 !== 0)
            return moves;
        const opp = ctx.me === "w" ? "b" : "w";
        const oppAttacks = (0, board_1.attackedBy)(ctx.board, opp);
        const sacrifices = moves.filter((m) => m.piece === "p" && oppAttacks.has(m.to));
        return sacrifices.length ? sacrifices : moves;
    },
});
exports.COLD_FEET = db({
    id: "cold_feet",
    name: "Cold Feet",
    description: "Your king can't move into the center 16 squares.",
    flavor: "Stay on the wing.",
    tier: 2,
    icon: "wind",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (m.piece !== "k")
            return true;
        const f = (0, types_1.FILE)(m.to), r = (0, types_1.RANK)(m.to);
        return !(f >= 2 && f <= 5 && r >= 2 && r <= 5);
    }),
});
exports.SWITCHBACK = db({
    id: "switchback",
    name: "Switchback",
    description: "You can't move in the same direction (file delta sign) twice in a row.",
    flavor: "Zig and zag.",
    tier: 3,
    icon: "shuffle",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const lastDf = Math.sign((0, types_1.FILE)(last.to) - (0, types_1.FILE)(last.from));
        const lastDr = Math.sign((0, types_1.RANK)(last.to) - (0, types_1.RANK)(last.from));
        return moves.filter((m) => {
            const df = Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.sign((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            return !(df === lastDf && dr === lastDr);
        });
    },
});
exports.ARMORY = db({
    id: "armory",
    name: "Armory",
    description: "Your rooks must stay defended at all times.",
    flavor: "Don't leave them in the open.",
    tier: 5,
    icon: "shield",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const legal = moves.filter((m) => {
            const nb = (0, board_1.makeMove)(ctx.board, m);
            const defenders = (0, board_1.attackedBy)(nb, ctx.me);
            const rooks = pieceSquares(nb, ctx.me, "r");
            return rooks.every((sq) => defenders.has(sq));
        });
        return legal.length ? legal : moves;
    },
});
exports.COUNTING_SHEEP = db({
    id: "counting_sheep",
    name: "Counting Sheep",
    description: "Once you've moved a piece type 5 times, you can't move it again.",
    flavor: "Five's the limit.",
    tier: 4,
    icon: "list-ordered",
    implemented: true,
    progress: (_s, ctx) => {
        const counts = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                counts[m.piece]++;
        let max = 0;
        let which = "p";
        for (const t of ["p", "n", "b", "r", "q", "k"]) {
            if (counts[t] > max) {
                max = counts[t];
                which = t;
            }
        }
        const names = { p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "kings" };
        return { value: Math.min(max, 5), max: 5, label: `${max}/5 ${names[which]} moved` };
    },
    filterMoves: (moves, _s, ctx) => {
        const counts = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                counts[m.piece]++;
        return moves.filter((m) => counts[m.piece] < 5);
    },
});
exports.FAMINE = db({
    id: "famine",
    name: "Famine",
    description: "After move 15, you can't capture pawns.",
    flavor: "No more bread.",
    tier: 3,
    icon: "wheat-off",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        if (ctx.moveNumber < 15)
            return moves;
        return moves.filter((m) => m.captured !== "p");
    },
});
exports.EXTRA_NERFS = [
    exports.TIMID,
    exports.KINGFISHER,
    exports.MAGNETIC_KINGS,
    exports.PAWN_DUTY,
    exports.VAMPIRIC,
    exports.SOLAR_FLARE,
    exports.CONSTRICTION,
    exports.MIRROR_MARCH,
    exports.RUSTY_KNIGHTS,
    exports.HEAVY_BOOTS,
    exports.GOLDFISH,
    exports.ASCETIC,
    exports.PAWN_STORM,
    exports.ROYAL_GUARD,
    exports.HONEY_TRAP,
    exports.TIDY_DESK,
    exports.PHOBIA_OF_EDGES,
    exports.SACRED_FILE,
    exports.SUNRISE,
    exports.WAGON_TRAIN,
    exports.HOARDER,
    exports.VANISHING_POINT,
    exports.ECHO_CHAMBER,
    exports.TRIPWIRE,
    exports.PROMOTION_PHOBIA,
    exports.KNIGHT_PARADE,
    exports.RHYTHM_MASTER,
    exports.ICY_SQUARES,
    exports.HALL_OF_MIRRORS,
    exports.QUARANTINE,
    exports.FRESH_FACES,
    exports.BURNING_BRIDGES,
    exports.COURT_MARTIAL,
    exports.NEAT_FREAK,
    exports.ARTILLERY,
    exports.VERTIGO,
    exports.COURT_JESTER,
    exports.DOMINO,
    exports.SLOWPOKE,
    exports.PILGRIMAGE,
    exports.SCHOLARSHIP,
    exports.TRIBUTE,
    exports.SWITCHBACK,
    exports.ARMORY,
    exports.COUNTING_SHEEP,
    exports.FAMINE,
];
