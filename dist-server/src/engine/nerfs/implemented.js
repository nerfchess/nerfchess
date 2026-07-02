"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMPLEMENTED_BY_ID = exports.ALL_IMPLEMENTED = exports.SCENT_OF_BLOOD = exports.SIEGE = exports.RESPECTFUL = exports.DEER_IN_HEADLIGHTS = exports.HOLD_THEM_BACK = exports.KING_OF_THE_HILL = exports.ALTERNATOR = exports.INSIDE_THE_LINES = exports.STOP_STALLING = exports.SPICE_OF_LIFE = exports.SIMPLIFIER = exports.FAR_SIGHTED = exports.ELEPHANTS_FEAR_MICE = exports.PUNCHING_DOWN = exports.STAY_AT_HOME_MOM = exports.CONSCIENTIOUS_OBJECTORS = exports.PROFESSIONAL_COURTESY = exports.OUTFLANKED = exports.NO_SHUFFLING = exports.SHADOW_QUEEN = exports.NUMBER_OF_THE_BEAST = exports.HORSE_TRANQUILIZER = exports.SKITTISH = exports.SCORCHED_EARTH = exports.SLEEPY_KING = exports.PACK_MENTALITY = exports.HAND_AND_BRAINLESS = exports.COWARDLY = exports.FOG_OF_WAR = exports.RISING_WATER = exports.UNTITLED_DUCK = exports.CHAMPING_AT_THE_BIT = exports.WHITES_OF_THEIR_EYES = exports.FORWARD_MARCH = exports.HIPSTER = exports.TRUANT = exports.GREEDY = exports.PACMAN = exports.IVORY_TOWER = exports.SIMP = exports.THREE_CHECK = exports.OUT_OF_BREATH = exports.LAME_DUCK = exports.TROPHY_WIFE = exports.TRUE_GENTLEMAN = exports.VEGAN = exports.CESS = exports.LUCKY = void 0;
const board_1 = require("../board");
const types_1 = require("../types");
const more_1 = require("./more");
const extras_1 = require("./extras");
const cheb = (a, b) => Math.max(Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)), Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)));
const adj = (a, b) => a !== b && Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)) <= 1 && Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)) <= 1;
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// Helpers to make defining a nerf less verbose
function db(d) {
    return { ...d, implemented: true };
}
exports.LUCKY = db({
    id: "lucky",
    name: "Lucky",
    description: "You have no nerf. A rare gift from the gods of chess.",
    flavor: "Today, fortune smiles upon you.",
    tier: 1,
    icon: "sparkles",
    implemented: true,
});
exports.CESS = db({
    id: "cess",
    name: "Cess",
    description: "You can't move to the h-file.",
    flavor: "An invisible wall hugs the right edge of your world.",
    tier: 1,
    icon: "ban",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => (0, types_1.FILE)(m.to) !== 7),
});
exports.VEGAN = db({
    id: "vegan",
    name: "Vegan",
    description: "You can't capture knights.",
    flavor: "Horses are friends, not food.",
    tier: 1,
    icon: "leaf",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.captured !== "n"),
});
exports.TRUE_GENTLEMAN = db({
    id: "true_gentleman",
    name: "True Gentleman",
    description: "You can't capture queens.",
    flavor: "It simply isn't done.",
    tier: 1,
    icon: "crown",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.captured !== "q"),
});
exports.TROPHY_WIFE = db({
    id: "trophy_wife",
    name: "Trophy Wife",
    description: "Your queen can't capture.",
    flavor: "She is for display only.",
    tier: 2,
    icon: "gem",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !(m.piece === "q" && m.captured)),
});
exports.LAME_DUCK = db({
    id: "lame_duck",
    name: "Lame Duck",
    description: "You can't move your king at all.",
    flavor: "His majesty is paralyzed with indecision.",
    tier: 3,
    icon: "lock",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.piece !== "k"),
});
exports.OUT_OF_BREATH = db({
    id: "out_of_breath",
    name: "Out of Breath",
    description: "You can only move your king once the entire game.",
    flavor: "Royal cardio is not what it used to be.",
    tier: 2,
    icon: "wind",
    implemented: true,
    progress: (state) => {
        const s = state;
        return { value: s.kingMoves ?? 0, max: 1, label: `${s.kingMoves ?? 0}/1 king moves used` };
    },
    init: () => ({ kingMoves: 0 }),
    filterMoves: (moves, state) => {
        const s = state;
        if (s.kingMoves >= 1)
            return moves.filter((m) => m.piece !== "k");
        return moves;
    },
    // Increment when we make a king move; done in onTurnStart of the SAME color (next turn we see history).
    onTurnStart: (state, ctx) => {
        const s = state;
        const kingMoves = ctx.board.history.filter((m) => m.color === ctx.me && m.piece === "k").length;
        return { ...s, kingMoves };
    },
});
exports.THREE_CHECK = db({
    id: "three_check",
    name: "Three Check",
    description: "If you have been checked three times total, you lose.",
    flavor: "Three strikes and you're out.",
    tier: 1,
    icon: "alert-triangle",
    implemented: true,
    progress: (state) => {
        const s = state;
        return { value: s.checks ?? 0, max: 3, label: `${s.checks ?? 0}/3 checks taken` };
    },
    init: () => ({ checks: 0 }),
    onTurnStart: (state, ctx) => {
        // If we start a turn in check, increment.
        const s = state;
        if ((0, board_1.isInCheck)(ctx.board, ctx.me)) {
            return { checks: s.checks + 1 };
        }
        return s;
    },
    checkLoss: (state) => {
        const s = state;
        return s.checks >= 3 ? { reason: "checked 3 times" } : null;
    },
});
exports.SIMP = db({
    id: "simp",
    name: "Simp",
    description: "You lose if you have no queen.",
    flavor: "Without her, what is the point of anything?",
    tier: 2,
    icon: "heart",
    implemented: true,
    checkLoss: (state, ctx) => {
        const hasQueen = ctx.board.pieces.some((p) => p && p.type === "q" && p.color === ctx.me);
        return hasQueen ? null : { reason: "queen lost" };
    },
});
exports.IVORY_TOWER = db({
    id: "ivory_tower",
    name: "Ivory Tower",
    description: "You lose if any opponent piece is adjacent to your king.",
    flavor: "Royalty does not mingle.",
    tier: 4,
    icon: "tower-control",
    implemented: true,
    checkLoss: (state, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return null;
        for (let sq = 0; sq < 64; sq++) {
            const p = ctx.board.pieces[sq];
            if (!p || p.color === ctx.me)
                continue;
            if (adj(sq, ks))
                return { reason: "enemy adjacent to king" };
        }
        return null;
    },
});
exports.PACMAN = db({
    id: "pacman",
    name: "Pacman",
    description: "If you can capture a pawn, you must.",
    flavor: "Waka waka waka.",
    tier: 3,
    icon: "circle-dot",
    implemented: true,
    progress: (_s, ctx) => ({
        value: ctx.capturedByMe.p,
        max: 8,
        label: `${ctx.capturedByMe.p}/8 pawns eaten`,
    }),
    filterMoves: (moves) => {
        const pawnCaptures = moves.filter((m) => m.captured === "p");
        return pawnCaptures.length ? pawnCaptures : moves;
    },
    hint: (_s, _c, legal) => {
        const caps = legal.filter((m) => m.captured === "p");
        if (!caps.length)
            return null;
        return {
            text: "You must capture a pawn this turn.",
            squares: Array.from(new Set(caps.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.GREEDY = db({
    id: "greedy",
    name: "Greedy",
    description: "If you can capture a higher-value piece, you must (can't capture a lesser piece when a greater is available).",
    flavor: "Eyes always on the biggest prize.",
    tier: 1,
    icon: "coins",
    implemented: true,
    filterMoves: (moves) => {
        let max = 0;
        for (const m of moves)
            if (m.captured && m.captured !== "k")
                max = Math.max(max, PIECE_VAL[m.captured]);
        if (max === 0)
            return moves;
        return moves.filter((m) => {
            if (!m.captured || m.captured === "k")
                return true;
            return PIECE_VAL[m.captured] >= max;
        });
    },
    hint: (_s, _c, legal) => {
        let max = 0;
        for (const m of legal)
            if (m.captured && m.captured !== "k")
                max = Math.max(max, PIECE_VAL[m.captured]);
        if (max === 0)
            return null;
        const names = { 1: "pawn", 3: "minor piece", 5: "rook", 9: "queen" };
        const must = legal.filter((m) => m.captured && PIECE_VAL[m.captured] >= max);
        return {
            text: `You must capture the ${names[max] ?? `${max}-point piece`}.`,
            squares: Array.from(new Set(must.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.TRUANT = db({
    id: "truant",
    name: "Truant",
    description: "You can't move the same piece twice in a row.",
    flavor: "Pieces demand a fair rotation.",
    tier: 2,
    icon: "shuffle",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => m.from !== last.to);
    },
});
exports.HIPSTER = db({
    id: "hipster",
    name: "Hipster",
    description: "You can't move the same piece type as your opponent's last move.",
    flavor: "If they did it, it's already over.",
    tier: 2,
    icon: "glasses",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => m.piece !== last.piece);
    },
});
exports.FORWARD_MARCH = db({
    id: "forward_march",
    name: "Forward March",
    description: "You can't move backward.",
    flavor: "There is no looking back. There is only forward.",
    tier: 3,
    icon: "arrow-up",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const dir = ctx.me === "w" ? 1 : -1;
        return moves.filter((m) => ((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) * dir >= 0);
    },
});
exports.WHITES_OF_THEIR_EYES = db({
    id: "whites_of_their_eyes",
    name: "Whites of Their Eyes",
    description: "Capturing moves must be at distance ≤ 2 (Chebyshev).",
    flavor: "Don't shoot until you see the whites of their eyes.",
    tier: 2,
    icon: "eye",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !m.captured || cheb(m.from, m.to) <= 2),
});
exports.CHAMPING_AT_THE_BIT = db({
    id: "champing_at_the_bit",
    name: "Champing at the Bit",
    description: "All pawn moves must be distance 2.",
    flavor: "Why walk when you can sprint?",
    tier: 3,
    icon: "fast-forward",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.piece !== "p" || Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) === 2),
});
exports.UNTITLED_DUCK = db({
    id: "untitled_duck",
    name: "Untitled duck nerf",
    description: "A duck sits on a random square at game start. You can't pass through it or land on it.",
    flavor: "Quack.",
    tier: 1,
    icon: "bird",
    implemented: true,
    init: (rng) => {
        // pick a non-back-rank, non-piece square
        const candidates = [];
        for (let r = 2; r <= 5; r++)
            for (let f = 0; f < 8; f++)
                candidates.push((0, types_1.SQ)(f, r));
        return { duck: rng.pick(candidates) };
    },
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => {
            if (m.to === s.duck)
                return false;
            // sliders must not pass through; we approximate by checking interior squares of straight-line moves
            const df = Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.sign((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            const steps = Math.max(Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)), Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)));
            // Only check pass-through for sliders & pawns/king straight lines (knight jumps over)
            if (m.piece === "n")
                return true;
            for (let i = 1; i < steps; i++) {
                if ((0, types_1.SQ)((0, types_1.FILE)(m.from) + df * i, (0, types_1.RANK)(m.from) + dr * i) === s.duck)
                    return false;
            }
            return true;
        });
    },
    visual: (state) => ({ duckSquare: state.duck }),
});
exports.RISING_WATER = db({
    id: "rising_water",
    name: "Rising Water",
    description: "Every 10 of your turns, water rises one rank from rank 1. You can't move underwater pieces or to underwater squares.",
    flavor: "The tide is rising.",
    tier: 5,
    icon: "waves",
    implemented: true,
    init: () => ({ level: 0 }),
    onTurnStart: (state, ctx) => {
        const turn = ctx.moveNumber; // number of my moves played so far
        const level = Math.min(7, Math.floor(turn / 10));
        return { level };
    },
    filterMoves: (moves, state, ctx) => {
        const s = state;
        if (s.level <= 0)
            return moves;
        // Water rises from white's side (rank 1, rank 2, ...) regardless of color; universal water layer
        const underwater = (sq) => (0, types_1.RANK)(sq) < s.level;
        return moves.filter((m) => !underwater(m.from) && !underwater(m.to));
    },
    visual: (state) => ({ waterRank: state.level }),
});
exports.FOG_OF_WAR = db({
    id: "fog_of_war",
    name: "Fog of War",
    description: "You can't see opponent's pieces (except when capturing, captures, or check).",
    flavor: "Shapes in the mist.",
    tier: 4,
    icon: "cloud-fog",
    implemented: true,
    visual: () => ({ fogged: true }),
});
exports.COWARDLY = db({
    id: "cowardly",
    name: "Cowardly",
    description: "When opponent captures, you must move backward, or lose.",
    flavor: "Run away! Run away!",
    tier: 5,
    icon: "rewind",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last || !last.captured)
            return moves;
        const dir = ctx.me === "w" ? -1 : 1; // backward for me
        const backward = moves.filter((m) => ((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) * (dir > 0 ? 1 : -1) > 0);
        return backward;
    },
    hint: (_s, ctx, legal) => {
        if (!ctx.opponentLastMove?.captured)
            return null;
        return {
            text: "They captured. You must retreat this turn or lose.",
            squares: Array.from(new Set(legal.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.HAND_AND_BRAINLESS = db({
    id: "hand_and_brainless",
    name: "Hand and Brainless",
    description: "Each turn, a random piece type. You must move that type if possible.",
    flavor: "A voice in your head names a piece. You obey.",
    tier: 5,
    icon: "dice-5",
    implemented: true,
    init: () => ({ piece: "p" }),
    onTurnStart: (_state, _ctx, rng) => {
        const types = ["p", "n", "b", "r", "q", "k"];
        return { piece: rng.pick(types) };
    },
    filterMoves: (moves, state) => {
        const s = state;
        const filtered = moves.filter((m) => m.piece === s.piece);
        return filtered.length ? filtered : moves;
    },
    hint: (state, _c, legal) => {
        const s = state;
        const names = {
            p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
        };
        const matching = legal.filter((m) => m.piece === s.piece);
        if (matching.length === 0) {
            return { text: `The voice says ${names[s.piece]}, but none can move. Pick anything.`, tone: "info" };
        }
        return {
            text: `The voice says: move a ${names[s.piece]}.`,
            squares: Array.from(new Set(matching.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.PACK_MENTALITY = db({
    id: "pack_mentality",
    name: "Pack Mentality",
    description: "Pieces must move to squares adjacent to another of your pieces.",
    flavor: "Never alone, never.",
    tier: 3,
    icon: "users",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        return moves.filter((m) => {
            for (let sq = 0; sq < 64; sq++) {
                if (sq === m.from)
                    continue;
                const p = ctx.board.pieces[sq];
                if (p && p.color === ctx.me && adj(sq, m.to))
                    return true;
            }
            return false;
        });
    },
});
exports.SLEEPY_KING = db({
    id: "sleepy_king",
    name: "Sleepy King",
    description: "Your king can only move when in check.",
    flavor: "Don't wake him unless you must.",
    tier: 2,
    icon: "moon",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        if ((0, board_1.isInCheck)(ctx.board, ctx.me))
            return moves;
        return moves.filter((m) => m.piece !== "k");
    },
    hint: (_s, ctx) => {
        if ((0, board_1.isInCheck)(ctx.board, ctx.me)) {
            return { text: "The king stirs. He can move while in check.", tone: "info" };
        }
        return null;
    },
});
exports.SCORCHED_EARTH = db({
    id: "scorched_earth",
    name: "Scorched Earth",
    description: "You can't move to a square you've previously moved FROM.",
    flavor: "Burn the bridges. There is no return.",
    tier: 4,
    icon: "flame",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const burned = new Set();
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                burned.add(m.from);
        return moves.filter((m) => !burned.has(m.to));
    },
});
exports.SKITTISH = db({
    id: "skittish",
    name: "Skittish",
    description: "While in check, you must move your king.",
    flavor: "Run, your majesty.",
    tier: 2,
    icon: "alert",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        if (!(0, board_1.isInCheck)(ctx.board, ctx.me))
            return moves;
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length ? kingMoves : moves;
    },
    hint: (_s, ctx) => {
        if (!(0, board_1.isInCheck)(ctx.board, ctx.me))
            return null;
        return { text: "You're in check. Only the king may flee.", tone: "warn" };
    },
});
exports.HORSE_TRANQUILIZER = db({
    id: "horse_tranquilizer",
    name: "Horse Tranquilizer",
    description: "Your knights can't capture.",
    flavor: "Their hooves are heavy with sleep.",
    tier: 2,
    icon: "moon",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !(m.piece === "n" && m.captured)),
});
exports.NUMBER_OF_THE_BEAST = db({
    id: "number_of_the_beast",
    name: "Number of the Beast",
    description: "You can't move to the 6th rank.",
    flavor: "Six is the cursed number.",
    tier: 1,
    icon: "ban",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => (0, types_1.RANK)(m.to) !== 5),
});
exports.SHADOW_QUEEN = db({
    id: "shadow_queen",
    name: "Shadow Queen",
    description: "Your queen can only move to dark squares.",
    flavor: "She walks only in shadow.",
    tier: 2,
    icon: "moon-star",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (m.piece !== "q")
            return true;
        // dark squares: (file + rank) even (a1 is dark)
        return ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 === 0;
    }),
});
exports.NO_SHUFFLING = db({
    id: "no_shuffling",
    name: "No Shuffling",
    description: "Your rooks can't move sideways.",
    flavor: "Vertical or nothing.",
    tier: 3,
    icon: "arrow-up-down",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => m.piece !== "r" || (0, types_1.FILE)(m.from) === (0, types_1.FILE)(m.to)),
});
exports.OUTFLANKED = db({
    id: "outflanked",
    name: "Outflanked",
    description: "You can't capture on the rim. The enemy king is fair game anywhere.",
    flavor: "The edges are scorched ground.",
    tier: 3,
    icon: "square-dashed",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (!m.captured || m.captured === "k")
            return true;
        const f = (0, types_1.FILE)(m.to), r = (0, types_1.RANK)(m.to);
        return f !== 0 && f !== 7 && r !== 0 && r !== 7;
    }),
});
exports.PROFESSIONAL_COURTESY = db({
    id: "professional_courtesy",
    name: "Professional Courtesy",
    description: "Non-pawn pieces can't capture pieces of their own type.",
    flavor: "We do not stoop to such things.",
    tier: 2,
    icon: "handshake",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (m.piece === "p")
            return true;
        if (!m.captured)
            return true;
        return m.piece !== m.captured;
    }),
});
exports.CONSCIENTIOUS_OBJECTORS = db({
    id: "conscientious_objectors",
    name: "Conscientious Objectors",
    description: "Your pawns can't capture.",
    flavor: "They refuse to draw blood.",
    tier: 2,
    icon: "feather",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !(m.piece === "p" && m.captured)),
});
exports.STAY_AT_HOME_MOM = db({
    id: "stay_at_home_mom",
    name: "Stay-at-Home Mom",
    description: "Your queen can only move within your two home ranks.",
    flavor: "She manages the home front.",
    tier: 3,
    icon: "home",
    implemented: true,
    filterMoves: (moves, _s, ctx) => moves.filter((m) => {
        if (m.piece !== "q")
            return true;
        const home = ctx.me === "w" ? [0, 1] : [6, 7];
        return home.includes((0, types_1.RANK)(m.to));
    }),
});
exports.PUNCHING_DOWN = db({
    id: "punching_down",
    name: "Punching Down",
    description: "Pieces can't capture pieces worth more than themselves.",
    flavor: "Pick on someone your own size.",
    tier: 3,
    icon: "shield",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        if (!m.captured || m.captured === "k")
            return true;
        return PIECE_VAL[m.piece] >= PIECE_VAL[m.captured];
    }),
});
exports.ELEPHANTS_FEAR_MICE = db({
    id: "elephants_fear_mice",
    name: "Elephants Fear Mice",
    description: "Your non-pawn pieces can't capture pawns.",
    flavor: "Even kings dread the squeak.",
    tier: 3,
    icon: "rat",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !(m.piece !== "p" && m.captured === "p")),
});
exports.FAR_SIGHTED = db({
    id: "far_sighted",
    name: "Far Sighted",
    description: "You can't capture adjacent pieces (Chebyshev distance > 1).",
    flavor: "Your eyes don't focus that close.",
    tier: 3,
    icon: "eye",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => !m.captured || cheb(m.from, m.to) > 1),
});
exports.SIMPLIFIER = db({
    id: "simplifier",
    name: "Simplifier",
    description: "If you can capture with an equal- or lesser-value piece, you must.",
    flavor: "Trade up. Always trade up.",
    tier: 3,
    icon: "scale",
    implemented: true,
    filterMoves: (moves) => {
        const favorable = moves.filter((m) => m.captured && m.captured !== "k" && PIECE_VAL[m.piece] <= PIECE_VAL[m.captured]);
        return favorable.length ? favorable : moves;
    },
    hint: (_s, _c, legal) => {
        const favorable = legal.filter((m) => m.captured && m.captured !== "k" && PIECE_VAL[m.piece] <= PIECE_VAL[m.captured]);
        if (!favorable.length)
            return null;
        return {
            text: "You must take a favorable trade.",
            squares: Array.from(new Set(favorable.map((m) => m.from))),
            tone: "warn",
        };
    },
});
exports.SPICE_OF_LIFE = db({
    id: "spice_of_life",
    name: "Spice of Life",
    description: "You can't move the same piece type twice in a row.",
    flavor: "Variety is everything.",
    tier: 2,
    icon: "shuffle",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => m.piece !== last.piece);
    },
});
exports.STOP_STALLING = db({
    id: "stop_stalling",
    name: "Stop Stalling",
    description: "Your pieces can't move laterally.",
    flavor: "Forward, backward, anywhere but sideways.",
    tier: 3,
    icon: "move-vertical",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => (0, types_1.RANK)(m.from) !== (0, types_1.RANK)(m.to)),
});
exports.INSIDE_THE_LINES = db({
    id: "inside_the_lines",
    name: "Inside the Lines",
    description: "You can't move ONTO the rim. Pieces already on the rim may stay there.",
    flavor: "Color outside the lines, lose your turn.",
    tier: 3,
    icon: "frame",
    implemented: true,
    filterMoves: (moves) => moves.filter((m) => {
        const onRim = (sq) => {
            const f = (0, types_1.FILE)(sq), r = (0, types_1.RANK)(sq);
            return f === 0 || f === 7 || r === 0 || r === 7;
        };
        return !onRim(m.to) || onRim(m.from);
    }),
});
exports.ALTERNATOR = db({
    id: "alternator",
    name: "Alternator",
    description: "You must alternate pawn moves and non-pawn moves.",
    flavor: "Step left, step right.",
    tier: 3,
    icon: "alternate",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const needPawn = last.piece !== "p";
        const filtered = moves.filter((m) => (m.piece === "p") === needPawn);
        return filtered.length ? filtered : moves;
    },
    hint: (_s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return null;
        return {
            text: last.piece === "p"
                ? "You moved a pawn last turn. Now move a non-pawn."
                : "You moved a non-pawn. Now move a pawn.",
            tone: "info",
        };
    },
});
exports.KING_OF_THE_HILL = db({
    id: "king_of_the_hill",
    name: "King of the Hill",
    description: "After your first move, you lose unless one of your pieces sits on d4, d5, e4, or e5.",
    flavor: "Hold the high ground.",
    tier: 4,
    icon: "mountain",
    implemented: true,
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 1)
            return null;
        const center = [(0, types_1.SQ)(3, 3), (0, types_1.SQ)(3, 4), (0, types_1.SQ)(4, 3), (0, types_1.SQ)(4, 4)];
        for (const sq of center) {
            const p = ctx.board.pieces[sq];
            if (p && p.color === ctx.me)
                return null;
        }
        return { reason: "no piece on the hill" };
    },
});
exports.HOLD_THEM_BACK = db({
    id: "hold_them_back",
    name: "Hold Them Back",
    description: "You lose the moment any enemy pawn enters your half of the board.",
    flavor: "Not one step.",
    tier: 5,
    icon: "shield-alert",
    implemented: true,
    checkLoss: (_s, ctx) => {
        const myHalf = ctx.me === "w" ? [0, 1, 2, 3] : [4, 5, 6, 7];
        for (let sq = 0; sq < 64; sq++) {
            const p = ctx.board.pieces[sq];
            if (p && p.color !== ctx.me && p.type === "p" && myHalf.includes((0, types_1.RANK)(sq))) {
                return { reason: "enemy pawn breached your half" };
            }
        }
        return null;
    },
});
exports.DEER_IN_HEADLIGHTS = db({
    id: "deer_in_headlights",
    name: "Deer in the Headlights",
    description: "You can't move pieces that are currently under attack.",
    flavor: "Frozen.",
    tier: 5,
    icon: "zap",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const attacked = (0, board_1.attackedBy)(ctx.board, opp);
        return moves.filter((m) => !attacked.has(m.from));
    },
});
exports.RESPECTFUL = db({
    id: "respectful",
    name: "Respectful",
    description: "You can't end your turn giving check.",
    flavor: "Don't be rude.",
    tier: 4,
    icon: "hand",
    implemented: true,
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        return moves.filter((m) => {
            const nb = (0, board_1.makeMove)(ctx.board, m);
            return !(0, board_1.isInCheck)(nb, opp);
        });
    },
});
exports.SIEGE = db({
    id: "siege",
    name: "Siege",
    description: "You must capture at least one enemy rook by move 20, or you lose.",
    flavor: "Break their towers, or fall with them.",
    tier: 4,
    icon: "sword",
    implemented: true,
    progress: (_s, ctx) => ({
        value: Math.min(ctx.capturedByMe.r, 1),
        max: 1,
        label: ctx.capturedByMe.r >= 1
            ? "Siege complete"
            : `${Math.max(0, 20 - ctx.moveNumber)} turns to take a rook`,
    }),
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 20)
            return null;
        return ctx.capturedByMe.r >= 1 ? null : { reason: "failed siege" };
    },
    hint: (_s, ctx) => {
        if (ctx.moveNumber >= 20 || ctx.capturedByMe.r >= 1)
            return null;
        const remaining = 20 - ctx.moveNumber;
        if (remaining > 8)
            return null;
        return {
            text: `Capture a rook within ${remaining} more turn${remaining === 1 ? "" : "s"} or lose.`,
            tone: "warn",
        };
    },
});
exports.SCENT_OF_BLOOD = db({
    id: "scent_of_blood",
    name: "The Scent of Blood",
    description: "If one of your pieces can capture, it must: that piece, this turn.",
    flavor: "Once they smell it, nothing else matters.",
    tier: 4,
    icon: "droplet",
    implemented: true,
    filterMoves: (moves) => {
        const fromsWithCap = new Set();
        for (const m of moves)
            if (m.captured)
                fromsWithCap.add(m.from);
        if (fromsWithCap.size === 0)
            return moves;
        return moves.filter((m) => {
            if (!fromsWithCap.has(m.from))
                return true;
            return !!m.captured;
        });
    },
    hint: (_s, _c, legal) => {
        const sources = new Set();
        for (const m of legal)
            if (m.captured)
                sources.add(m.from);
        if (sources.size === 0)
            return null;
        return {
            text: "A piece smells blood. If it moves, it must capture.",
            squares: Array.from(sources),
            tone: "warn",
        };
    },
});
exports.ALL_IMPLEMENTED = [
    exports.LUCKY,
    exports.CESS,
    exports.VEGAN,
    exports.TRUE_GENTLEMAN,
    exports.TROPHY_WIFE,
    exports.LAME_DUCK,
    exports.OUT_OF_BREATH,
    exports.THREE_CHECK,
    exports.SIMP,
    exports.IVORY_TOWER,
    exports.PACMAN,
    exports.GREEDY,
    exports.TRUANT,
    exports.HIPSTER,
    exports.FORWARD_MARCH,
    exports.WHITES_OF_THEIR_EYES,
    exports.CHAMPING_AT_THE_BIT,
    exports.UNTITLED_DUCK,
    exports.RISING_WATER,
    exports.FOG_OF_WAR,
    exports.COWARDLY,
    exports.PACK_MENTALITY,
    exports.SLEEPY_KING,
    exports.SCORCHED_EARTH,
    exports.SKITTISH,
    exports.HORSE_TRANQUILIZER,
    exports.NUMBER_OF_THE_BEAST,
    exports.SHADOW_QUEEN,
    exports.NO_SHUFFLING,
    exports.OUTFLANKED,
    exports.PROFESSIONAL_COURTESY,
    exports.CONSCIENTIOUS_OBJECTORS,
    exports.STAY_AT_HOME_MOM,
    exports.PUNCHING_DOWN,
    exports.ELEPHANTS_FEAR_MICE,
    exports.FAR_SIGHTED,
    exports.SIMPLIFIER,
    exports.SPICE_OF_LIFE,
    exports.STOP_STALLING,
    exports.INSIDE_THE_LINES,
    exports.ALTERNATOR,
    exports.KING_OF_THE_HILL,
    exports.HOLD_THEM_BACK,
    exports.DEER_IN_HEADLIGHTS,
    exports.RESPECTFUL,
    exports.SIEGE,
    exports.SCENT_OF_BLOOD,
    ...more_1.MORE_NERFS,
    ...extras_1.EXTRA_NERFS,
];
exports.IMPLEMENTED_BY_ID = Object.fromEntries(exports.ALL_IMPLEMENTED.map((d) => [d.id, d]));
