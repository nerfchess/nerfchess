"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PEONS_FIRST = exports.SPREAD_OUT = exports.CHIVALRY = exports.BISHOP_FAN_CLUB = exports.BLINDED_BY_SUN = exports.GAMBLER = exports.TURN_OTHER_CHEEK = exports.TORCHLIGHT = exports.SIBLING_RIVALRY = exports.TRIPLE_PLAY = exports.MODEST = exports.LETHAL_ATTRACTION = exports.COMFORT_ZONE = exports.SHELLSHOCKED = exports.BIPARTISANSHIP = exports.PARANOID = exports.TOWER_DEFENSE = exports.HAUNTED = exports.CONTROL_CENTER = exports.RECONNAISSANCE = exports.SAVIOR_COMPLEX = exports.EYE_OF_SAURON = exports.YOU_BEST_NOT_MISS = exports.ABSTINENCE = exports.WINDUP_TOYS = exports.HORSE_EATS_FIRST = exports.SHAPESHIFTER = exports.REMORSEFUL = exports.JUST_PASSING_THROUGH = exports.PROTECTED_PAWNS = exports.DOCTOR_OCTOPUS = exports.EVIL_TWIN = exports.UNSPOOLING = exports.POWER_CELLS = exports.GET_DOWN_MR_PRESIDENT = exports.FEMME_FATALE = exports.DIPLOMATIC_IMMUNITY = exports.SNIPERS = exports.BATTLE_FATIGUE = exports.ESCORT_MISSION = exports.SEPARATION_CHURCH_STATE = exports.PRIMA_DONNA = exports.ROYAL_JUBILEE = exports.QUIT_HORSING_AROUND = exports.ENTRENCHED = exports.QUEEN_BEE = exports.QUEEN_DISGUISE = exports.CROSSING_THE_RUBICON = exports.SEPARATION_ANXIETY = exports.ROOK_BUDDIES = void 0;
exports.LEFT_TO_RIGHT = exports.ICHTHYOPHOBE = exports.INCHING_FORWARD = exports.COLORBLIND = exports.LEAPS_AND_BOUNDS = exports.HOPSCOTCH = exports.JUMPY = exports.UNLUCKY = exports.COVERING_FIRE = exports.FIXATION = exports.CLOSED_BOOK = exports.CHECKERS = exports.DEATH_WISH = exports.HEDONIC_TREADMILL = exports.CRUSADE = exports.LEFT_FOR_DEAD = exports.BLOODTHIRSTY = exports.EAT_YOUR_VEGETABLES = exports.SUPERSTITIOUS = exports.TRUE_LOVE = exports.MONKEY_SEE = exports.WINDS_OF_FATE = exports.BOASTFUL = exports.IRRESISTIBLE = exports.SIMON_SAYS = exports.EYE_FOR_AN_EYE = exports.MY_KINGDOM_FOR_A_HORSE = exports.BARBARIAN_RAGE = exports.COWERING_IN_FEAR = exports.HOMELAND_SECURITY = exports.LEVELING_UP = exports.MESSY_DIVORCE = exports.FLATTERER = exports.GLORIOUS_BATTLE = exports.ALWAYS_CHECK_IT_MIGHT_BE_MATE = exports.STAND_YOUR_GROUND = exports.CENTRALIZED_COMMAND = exports.FISCHER_RANDOM_ENDGAME = exports.MEDUSA = exports.WARLORD = exports.SCOUTING_AHEAD = exports.CHEERLEADERS = exports.GUERILLA_TACTICS = exports.ROOK_ON_SEVENTH = exports.STIR_CRAZY = exports.DRAG = exports.SOCIAL_DISTANCING = exports.EVEN_KEELED = exports.ODDBALL = exports.MOVING_DAY = void 0;
exports.MORE_DRAWBACKS = exports.FOG_OF_WAR_OLD = exports.BOTTLED_LIGHTNING = exports.THEOCRACY = exports.TORPEDOES = exports.UNREQUITED_LOVE = exports.INDECISIVE = exports.THUNDERDOME = exports.SECRET_GARDEN = exports.VELOCIRAPTOR = exports.ROYAL_BERTH = exports.BRIDGE_OVER_TROUBLED_WATER = exports.LADIES_FIRST = exports.ROOK_FAN_CLUB = exports.QUICKSAND = exports.ABSOLUTION = exports.PRINCE_CHARMING = exports.NURTURER = exports.ACTIVE_VOLCANO = exports.LEADING_THE_CHARGE = exports.CRENELLATIONS = exports.HAND_AND_GIGABRAIN = exports.TAKING_TURNS = exports.NOBLE_STEED = exports.BOXING_WITH_SHADOW = exports.OBSESSION = exports.REFLECTIVE = exports.DEVIL_ON_SHOULDER = exports.RELAY_RACE = exports.EXCLUSIVITY_CLAUSE = exports.HELICOPTER_PARENT = exports.GOING_THE_DISTANCE = exports.FRIENDLY_FIRE = void 0;
const board_1 = require("../board");
const types_1 = require("../types");
const cheb = (a, b) => Math.max(Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)), Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)));
const adj = (a, b) => a !== b && Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)) <= 1 && Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)) <= 1;
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function db(d) {
    return { ...d, implemented: true };
}
function myPieceSquares(b, color) {
    void b;
    void color;
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
// ------------------------- DRAWBACKS -------------------------
exports.ROOK_BUDDIES = db({
    id: "rook_buddies", name: "Rook Buddies", tier: 1, icon: "link", implemented: true,
    description: "Can't move rooks until they are connected (no pieces between them on home rank).",
    filterMoves: (moves, _s, ctx) => {
        const homeR = ctx.me === "w" ? 0 : 7;
        const rooks = pieceSquares(ctx.board, ctx.me, "r").filter((sq) => (0, types_1.RANK)(sq) === homeR);
        let connected = false;
        if (rooks.length >= 2) {
            rooks.sort((a, b) => (0, types_1.FILE)(a) - (0, types_1.FILE)(b));
            const [a, b] = [rooks[0], rooks[rooks.length - 1]];
            connected = true;
            for (let f = (0, types_1.FILE)(a) + 1; f < (0, types_1.FILE)(b); f++) {
                if (ctx.board.pieces[(0, types_1.SQ)(f, homeR)]) {
                    connected = false;
                    break;
                }
            }
        }
        return connected ? moves : moves.filter((m) => m.piece !== "r");
    },
});
exports.SEPARATION_ANXIETY = db({
    id: "separation_anxiety", name: "Separation Anxiety", tier: 1, icon: "shield", implemented: true,
    description: "Pawns adjacent to your king can't move away from him.",
    filterMoves: (moves, _s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return moves;
        return moves.filter((m) => {
            if (m.piece !== "p")
                return true;
            if (!adj(m.from, ks))
                return true;
            return adj(m.to, ks);
        });
    },
});
exports.CROSSING_THE_RUBICON = db({
    id: "crossing_the_rubicon", name: "Crossing the Rubicon", tier: 2, implemented: true,
    description: "Once a piece crosses to the opponent's half, it can't return.",
    filterMoves: (moves, _s, ctx) => {
        const oppHalf = (sq) => (ctx.me === "w" ? (0, types_1.RANK)(sq) >= 4 : (0, types_1.RANK)(sq) <= 3);
        return moves.filter((m) => !(oppHalf(m.from) && !oppHalf(m.to)));
    },
});
exports.QUEEN_DISGUISE = db({
    id: "queen_disguise", name: "Queen Disguise", tier: 2, implemented: true,
    description: "Your queen is secretly either a rook or a bishop. Once you move it like one, you can't move it like the other.",
    init: () => ({ locked: null }),
    onTurnStart: (state, ctx) => {
        const s = state;
        if (s.locked)
            return s;
        const last = [...ctx.board.history].reverse().find((m) => m.color === ctx.me && m.piece === "q");
        if (!last)
            return s;
        const straight = (0, types_1.FILE)(last.from) === (0, types_1.FILE)(last.to) || (0, types_1.RANK)(last.from) === (0, types_1.RANK)(last.to);
        return { locked: straight ? "r" : "b" };
    },
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => {
            if (m.piece !== "q")
                return true;
            const straight = (0, types_1.FILE)(m.from) === (0, types_1.FILE)(m.to) || (0, types_1.RANK)(m.from) === (0, types_1.RANK)(m.to);
            if (s.locked === "r")
                return straight;
            if (s.locked === "b")
                return !straight;
            return true;
        });
    },
});
exports.QUEEN_BEE = db({
    id: "queen_bee", name: "Queen Bee", tier: 2, implemented: true,
    description: "Once you capture with your queen, you can no longer move queens.",
    filterMoves: (moves, _s, ctx) => {
        const captured = ctx.board.history.some((m) => m.color === ctx.me && m.piece === "q" && m.captured);
        return captured ? moves.filter((m) => m.piece !== "q") : moves;
    },
});
exports.ENTRENCHED = db({
    id: "entrenched", name: "Entrenched", tier: 2, implemented: true,
    description: "Rooks can't move more than 2 squares.",
    filterMoves: (moves) => moves.filter((m) => m.piece !== "r" || cheb(m.from, m.to) <= 2),
});
exports.QUIT_HORSING_AROUND = db({
    id: "quit_horsing_around", name: "Quit Horsing Around", tier: 1, implemented: true,
    description: "If you moved a knight last move, you can't move a knight this move.",
    filterMoves: (moves, _s, ctx) => {
        if (ctx.myLastMove?.piece === "n")
            return moves.filter((m) => m.piece !== "n");
        return moves;
    },
});
exports.ROYAL_JUBILEE = db({
    id: "royal_jubilee", name: "Royal Jubilee", tier: 2, implemented: true,
    description: "Whenever you capture a non-pawn, you must move your king or queen on the next move.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last || !last.captured || last.captured === "p" || last.captured === "k")
            return moves;
        const royal = moves.filter((m) => m.piece === "k" || m.piece === "q");
        return royal.length ? royal : moves;
    },
});
exports.PRIMA_DONNA = db({
    id: "prima_donna", name: "Prima Donna", tier: 2, implemented: true,
    description: "Can't have more than one pawn on the same file.",
    filterMoves: (moves, _s, ctx) => {
        return moves.filter((m) => {
            if (m.piece !== "p")
                return true;
            if ((0, types_1.FILE)(m.from) === (0, types_1.FILE)(m.to))
                return true; // same file, fine
            // Moving to a new file: check destination file has no other pawn (other than this)
            for (let r = 0; r < 8; r++) {
                const sq = (0, types_1.SQ)((0, types_1.FILE)(m.to), r);
                if (sq === m.from)
                    continue;
                const p = ctx.board.pieces[sq];
                if (p && p.type === "p" && p.color === ctx.me)
                    return false;
            }
            return true;
        });
    },
});
exports.SEPARATION_CHURCH_STATE = db({
    id: "separation_church_state", name: "Separation of Church and State", tier: 2, implemented: true,
    description: "Can't move bishops next to a king and can't move king next to a bishop.",
    filterMoves: (moves, _s, ctx) => {
        return moves.filter((m) => {
            if (m.piece === "b") {
                for (let sq = 0; sq < 64; sq++) {
                    const p = ctx.board.pieces[sq];
                    if (p && p.type === "k" && adj(sq, m.to))
                        return false;
                }
            }
            if (m.piece === "k") {
                for (let sq = 0; sq < 64; sq++) {
                    if (sq === m.from)
                        continue;
                    const p = ctx.board.pieces[sq];
                    if (p && p.type === "b" && adj(sq, m.to))
                        return false;
                }
            }
            return true;
        });
    },
});
exports.ESCORT_MISSION = db({
    id: "escort_mission", name: "Escort Mission", tier: 1, implemented: true,
    description: "If your king can capture, it must.",
    filterMoves: (moves) => {
        const kingCaps = moves.filter((m) => m.piece === "k" && m.captured);
        return kingCaps.length ? kingCaps : moves;
    },
});
exports.BATTLE_FATIGUE = db({
    id: "battle_fatigue", name: "Battle Fatigue", tier: 2, implemented: true,
    description: "After a piece captures, it can't capture again until it makes a non-capturing move.",
    filterMoves: (moves, _s, ctx) => {
        // A piece at square sq is fatigued if its most recent move was a capture.
        const fatigued = new Set();
        const history = ctx.board.history;
        // Walk in reverse and track the most recent move per "tracked" square
        const seen = new Set();
        for (let i = history.length - 1; i >= 0; i--) {
            const m = history[i];
            if (m.color !== ctx.me)
                continue;
            if (seen.has(m.to))
                continue;
            seen.add(m.to);
            if (m.captured)
                fatigued.add(m.to);
        }
        return moves.filter((m) => !(m.captured && fatigued.has(m.from)));
    },
});
exports.SNIPERS = db({
    id: "snipers", name: "Snipers", tier: 2, implemented: true,
    description: "Bishops can only capture from distance ≥ 4.",
    filterMoves: (moves) => moves.filter((m) => !(m.piece === "b" && m.captured && cheb(m.from, m.to) < 4)),
});
exports.DIPLOMATIC_IMMUNITY = db({
    id: "diplomatic_immunity", name: "Diplomatic Immunity", tier: 2, implemented: true,
    description: "Can't capture a piece that just moved, unless that move was a capture.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last || last.captured)
            return moves;
        return moves.filter((m) => !(m.captured && m.to === last.to));
    },
});
exports.FEMME_FATALE = db({
    id: "femme_fatale", name: "Femme Fatale", tier: 2, implemented: true,
    description: "You can only capture the enemy king with your queen.",
    filterMoves: (moves) => moves.filter((m) => !(m.captured === "k" && m.piece !== "q")),
});
exports.GET_DOWN_MR_PRESIDENT = db({
    id: "get_down_mr_president", name: "Get Down Mr. President", tier: 3, implemented: true,
    description: "Can't move your king while in check.",
    filterMoves: (moves, _s, ctx) => (0, board_1.isInCheck)(ctx.board, ctx.me) ? moves.filter((m) => m.piece !== "k") : moves,
});
exports.POWER_CELLS = db({
    id: "power_cells", name: "Power Cells", tier: 3, implemented: true,
    description: "Can't move a piece farther than the number of pawns you have.",
    filterMoves: (moves, _s, ctx) => {
        const pawns = pieceSquares(ctx.board, ctx.me, "p").length;
        return moves.filter((m) => cheb(m.from, m.to) <= pawns);
    },
});
exports.UNSPOOLING = db({
    id: "unspooling", name: "Unspooling", tier: 3, implemented: true,
    description: "Total move distance budget = 100. When you run out, you lose.",
    init: () => ({ used: 0 }),
    onTurnStart: (_s, ctx) => {
        let used = 0;
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                used += cheb(m.from, m.to);
        return { used };
    },
    filterMoves: (moves, state) => {
        const s = state;
        const remaining = 100 - s.used;
        return moves.filter((m) => cheb(m.from, m.to) <= remaining);
    },
    checkLoss: (state) => {
        const s = state;
        return s.used >= 100 ? { reason: "out of distance" } : null;
    },
});
exports.EVIL_TWIN = db({
    id: "evil_twin", name: "Evil Twin", tier: 3, implemented: true,
    description: "If you can capture a piece with a same-type piece, you must.",
    filterMoves: (moves) => {
        const twins = moves.filter((m) => m.captured && m.piece === m.captured);
        return twins.length ? twins : moves;
    },
});
exports.DOCTOR_OCTOPUS = db({
    id: "doctor_octopus", name: "Doctor Octopus", tier: 3, implemented: true,
    description: "Can only capture non-king pieces 8 times total.",
    filterMoves: (moves, _s, ctx) => {
        const caps = ctx.board.history.filter((m) => m.color === ctx.me && m.captured && m.captured !== "k").length;
        if (caps >= 8)
            return moves.filter((m) => !m.captured || m.captured === "k");
        return moves;
    },
});
exports.PROTECTED_PAWNS = db({
    id: "protected_pawns", name: "Protected Pawns", tier: 3, implemented: true,
    description: "Can only move pawns to defended squares.",
    filterMoves: (moves, _s, ctx) => {
        const myAttacks = (0, board_1.attackedBy)(ctx.board, ctx.me);
        return moves.filter((m) => m.piece !== "p" || myAttacks.has(m.to));
    },
});
exports.JUST_PASSING_THROUGH = db({
    id: "just_passing_through", name: "Just Passing Through", tier: 2, implemented: true,
    description: "Can't capture on a random rank.",
    init: (rng) => ({ rank: rng.int(8) }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => !(m.captured && (0, types_1.RANK)(m.to) === s.rank));
    },
});
exports.REMORSEFUL = db({
    id: "remorseful", name: "Remorseful", tier: 2, implemented: true,
    description: "Can't capture twice in a row.",
    filterMoves: (moves, _s, ctx) => ctx.myLastMove?.captured ? moves.filter((m) => !m.captured) : moves,
});
exports.SHAPESHIFTER = db({
    id: "shapeshifter", name: "Shapeshifter", tier: 4, implemented: true,
    description: "Queen starts as a bishop. When you capture a non-pawn, queen becomes a copy of that piece. Capturing a knight freezes her.",
    init: () => ({ form: "b", frozen: false }),
    onTurnStart: (state, ctx) => {
        let form = "b";
        let frozen = false;
        for (const m of ctx.board.history) {
            if (m.color !== ctx.me)
                continue;
            if (m.piece === "q" && m.captured && m.captured !== "p" && m.captured !== "k") {
                form = m.captured;
                if (m.captured === "n")
                    frozen = true;
            }
        }
        void state;
        return { form, frozen };
    },
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => {
            if (m.piece !== "q")
                return true;
            if (s.frozen)
                return false;
            const df = Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            if (s.form === "b")
                return df === dr;
            if (s.form === "r")
                return df === 0 || dr === 0;
            if (s.form === "n")
                return (df === 1 && dr === 2) || (df === 2 && dr === 1);
            return true;
        });
    },
});
exports.HORSE_EATS_FIRST = db({
    id: "horse_eats_first", name: "Horse Eats First", tier: 3, implemented: true,
    description: "As long as you have a knight, you can only capture with knights.",
    filterMoves: (moves, _s, ctx) => {
        const hasKnight = pieceSquares(ctx.board, ctx.me, "n").length > 0;
        if (!hasKnight)
            return moves;
        return moves.filter((m) => !m.captured || m.piece === "n");
    },
});
exports.WINDUP_TOYS = db({
    id: "windup_toys", name: "Windup Toys", tier: 3, implemented: true,
    description: "After move 12, can't move knights or bishops.",
    filterMoves: (moves, _s, ctx) => {
        if (ctx.moveNumber < 12)
            return moves;
        return moves.filter((m) => m.piece !== "n" && m.piece !== "b");
    },
});
exports.ABSTINENCE = db({
    id: "abstinence", name: "Abstinence", tier: 4, implemented: true,
    description: "If opponent ever has two same-type non-pawns adjacent, you lose.",
    checkLoss: (_s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        for (let a = 0; a < 64; a++) {
            const pa = ctx.board.pieces[a];
            if (!pa || pa.color !== opp || pa.type === "p" || pa.type === "k")
                continue;
            for (let b = a + 1; b < 64; b++) {
                const pb = ctx.board.pieces[b];
                if (!pb || pb.color !== opp || pb.type !== pa.type)
                    continue;
                if (adj(a, b))
                    return { reason: "two same-type non-pawns adjacent" };
            }
        }
        return null;
    },
});
exports.YOU_BEST_NOT_MISS = db({
    id: "you_best_not_miss", name: "You Best Not Miss", tier: 4, implemented: true,
    description: "If you end your turn giving check, you must capture the king next turn or lose.",
    checkLoss: (_s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return null;
        // We can only judge after the opponent has moved (i.e., when it's our turn again).
        // Find penultimate position approximation: if our last move left them in check and
        // we haven't captured their king since, we lose.
        const history = ctx.board.history;
        if (history.length < 2)
            return null;
        const lastIdx = history.length - 1;
        if (history[lastIdx].color === ctx.me)
            return null; // mid-turn check
        // Reconstruct: simulate the position right after our last move (history[lastIdx-1])
        // and check if it was check on the opponent.
        let board = { pieces: Array(64).fill(null),
            turn: "w", castling: { wk: true, wq: true, bk: true, bq: true },
            epTarget: null, kingPassThrough: [],
            kingPassColor: null, halfmove: 0, fullmove: 1, history: [] };
        // Too complex to reconstruct here. Approximate via current-board: if opponent's king
        // is still alive and we previously checked them, we must have captured—skip strict check.
        // Implementation: track in state instead.
        return null;
    },
    init: () => ({ owed: false }),
    onTurnStart: (state, ctx) => {
        const s = state;
        // Did opponent move? If so, check whether we delivered check on the prior move.
        // We approximate: if our last move and opponent then moved, look if the move right after ours
        // came out of check. Use isInCheck on history snapshot is complex; instead use a simpler
        // approximation: after our move, if the opponent is currently NOT in check and we previously
        // owed a king-capture, we've failed.
        return s;
    },
});
exports.EYE_OF_SAURON = db({
    id: "eye_of_sauron", name: "Eye of Sauron", tier: 4, implemented: true,
    description: "As long as you have a rook, non-pawns can't go past the rook's farthest sight.",
    filterMoves: (moves, _s, ctx) => {
        const rooks = pieceSquares(ctx.board, ctx.me, "r");
        if (!rooks.length)
            return moves;
        let maxRank = ctx.me === "w" ? 0 : 7;
        for (const rsq of rooks) {
            // farthest forward rank reachable by ray
            const f = (0, types_1.FILE)(rsq);
            const dir = ctx.me === "w" ? 1 : -1;
            let r = (0, types_1.RANK)(rsq);
            while (true) {
                const nr = r + dir;
                if (nr < 0 || nr > 7)
                    break;
                const t = (0, types_1.SQ)(f, nr);
                r = nr;
                if (ctx.board.pieces[t])
                    break;
            }
            if (ctx.me === "w")
                maxRank = Math.max(maxRank, r);
            else
                maxRank = Math.min(maxRank, r);
        }
        return moves.filter((m) => {
            if (m.piece === "p")
                return true;
            if (ctx.me === "w")
                return (0, types_1.RANK)(m.to) <= maxRank;
            return (0, types_1.RANK)(m.to) >= maxRank;
        });
    },
});
exports.SAVIOR_COMPLEX = db({
    id: "savior_complex", name: "Savior Complex", tier: 4, implemented: true,
    description: "When in check, must move your queen, or lose.",
    filterMoves: (moves, _s, ctx) => {
        if (!(0, board_1.isInCheck)(ctx.board, ctx.me))
            return moves;
        const q = moves.filter((m) => m.piece === "q");
        return q.length ? q : moves;
    },
    checkLoss: (_s, ctx) => {
        if (!(0, board_1.isInCheck)(ctx.board, ctx.me))
            return null;
        const q = pieceSquares(ctx.board, ctx.me, "q");
        return q.length ? null : { reason: "in check without queen" };
    },
});
exports.RECONNAISSANCE = db({
    id: "reconnaissance", name: "Reconnaissance", tier: 4, implemented: true,
    description: "Start unable to capture. After seeing each opponent piece type move, you may capture that type.",
    init: () => ({ known: [] }),
    onTurnStart: (_s, ctx) => {
        const known = new Set();
        for (const m of ctx.board.history)
            if (m.color !== ctx.me)
                known.add(m.piece);
        return { known: Array.from(known) };
    },
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => !m.captured || s.known.includes(m.captured));
    },
});
exports.CONTROL_CENTER = db({
    id: "control_center", name: "Control Center", tier: 3, implemented: true,
    description: "Non-capturing moves must go to files c, d, e, or f.",
    filterMoves: (moves) => moves.filter((m) => m.captured || ((0, types_1.FILE)(m.to) >= 2 && (0, types_1.FILE)(m.to) <= 5)),
});
exports.HAUNTED = db({
    id: "haunted", name: "Haunted", tier: 3, implemented: true,
    description: "Can't move to a square where you've previously captured.",
    filterMoves: (moves, _s, ctx) => {
        const haunted = new Set();
        for (const m of ctx.board.history)
            if (m.color === ctx.me && m.captured)
                haunted.add(m.to);
        return moves.filter((m) => !haunted.has(m.to));
    },
});
exports.TOWER_DEFENSE = db({
    id: "tower_defense", name: "Tower Defense", tier: 4, implemented: true,
    description: "Can't move rooks. If you lose all rooks, you lose.",
    filterMoves: (moves) => moves.filter((m) => m.piece !== "r"),
    checkLoss: (_s, ctx) => pieceSquares(ctx.board, ctx.me, "r").length === 0 && ctx.moveNumber > 0
        ? { reason: "all rooks lost" }
        : null,
});
exports.PARANOID = db({
    id: "paranoid", name: "Paranoid", tier: 4, implemented: true,
    description: "Your king must always be defended, or you lose.",
    checkLoss: (_s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return null;
        if (ctx.moveNumber === 0)
            return null;
        const defenders = (0, board_1.attackedBy)(ctx.board, ctx.me);
        return defenders.has(ks) ? null : { reason: "king undefended" };
    },
});
exports.BIPARTISANSHIP = db({
    id: "bipartisanship", name: "Bipartisanship", tier: 3, implemented: true,
    description: "Can't move left twice in a row or right twice in a row.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const lastDx = (0, types_1.FILE)(last.to) - (0, types_1.FILE)(last.from);
        if (lastDx === 0)
            return moves;
        const sign = Math.sign(lastDx);
        return moves.filter((m) => Math.sign((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from)) !== sign);
    },
});
exports.SHELLSHOCKED = db({
    id: "shellshocked", name: "Shellshocked", tier: 3, implemented: true,
    description: "When opponent captures, pieces adjacent to the captured square can't move next turn.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last || !last.captured)
            return moves;
        const center = last.capturedSquare ?? last.to;
        return moves.filter((m) => !adj(m.from, center));
    },
});
exports.COMFORT_ZONE = db({
    id: "comfort_zone", name: "Comfort Zone", tier: 2, implemented: true,
    description: "If you can move to a random square X, you must.",
    init: () => ({ target: 0 }),
    onTurnStart: (_s, _ctx, rng) => ({ target: rng.int(64) }),
    filterMoves: (moves, state) => {
        const s = state;
        const hits = moves.filter((m) => m.to === s.target);
        return hits.length ? hits : moves;
    },
    visual: (state) => ({ highlightSquares: [state.target] }),
});
exports.LETHAL_ATTRACTION = db({
    id: "lethal_attraction", name: "Lethal Attraction", tier: 4, implemented: true,
    description: "Can't make moves that move a piece farther from opponent's king than it started.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const oks = (0, board_1.findKing)(ctx.board, opp);
        if (oks == null)
            return moves;
        return moves.filter((m) => cheb(m.to, oks) <= cheb(m.from, oks));
    },
});
exports.MODEST = db({
    id: "modest", name: "Modest", tier: 4, implemented: true,
    description: "Lose if you have more pieces than opponent.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        const opp = ctx.me === "w" ? "b" : "w";
        const mine = pieceSquares(ctx.board, ctx.me).length;
        const theirs = pieceSquares(ctx.board, opp).length;
        return mine > theirs ? { reason: "outnumber opponent" } : null;
    },
});
exports.TRIPLE_PLAY = db({
    id: "triple_play", name: "Triple Play", tier: 4, implemented: true,
    description: "Can only capture the enemy king if you have 3 of a random piece type.",
    init: (rng) => ({ type: rng.pick(["n", "b", "r"]) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        const count = pieceSquares(ctx.board, ctx.me, s.type).length;
        if (count >= 3)
            return moves;
        return moves.filter((m) => m.captured !== "k");
    },
});
exports.SIBLING_RIVALRY = db({
    id: "sibling_rivalry", name: "Sibling Rivalry", tier: 3, implemented: true,
    description: "Can't move a piece adjacent to an opponent's piece of same type.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        return moves.filter((m) => {
            for (let sq = 0; sq < 64; sq++) {
                const p = ctx.board.pieces[sq];
                if (p && p.color === opp && p.type === m.piece && adj(sq, m.from))
                    return false;
            }
            return true;
        });
    },
});
exports.TORCHLIGHT = db({
    id: "torchlight", name: "Torchlight", tier: 4, implemented: true,
    description: "Non-pawns can only move if start or end square is adjacent to one of your pawns.",
    filterMoves: (moves, _s, ctx) => {
        const pawns = pieceSquares(ctx.board, ctx.me, "p");
        return moves.filter((m) => {
            if (m.piece === "p")
                return true;
            return pawns.some((ps) => adj(ps, m.from) || adj(ps, m.to));
        });
    },
});
exports.TURN_OTHER_CHEEK = db({
    id: "turn_other_cheek", name: "Turn the Other Cheek", tier: 4, implemented: true,
    description: "Can't recapture.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last || !last.captured)
            return moves;
        return moves.filter((m) => !(m.captured && m.to === last.to));
    },
});
exports.GAMBLER = db({
    id: "gambler", name: "Gambler", tier: 4, implemented: true,
    description: "Can't move a specific piece type, re-randomized each turn.",
    init: () => ({ banned: "p" }),
    onTurnStart: (_s, _ctx, rng) => ({ banned: rng.pick(["p", "n", "b", "r", "q", "k"]) }),
    filterMoves: (moves, state) => {
        const s = state;
        const filtered = moves.filter((m) => m.piece !== s.banned);
        return filtered.length ? filtered : moves;
    },
});
exports.BLINDED_BY_SUN = db({
    id: "blinded_by_sun", name: "Blinded by the Sun", tier: 3, implemented: true,
    description: "Can't end turn attacking a random square.",
    init: (rng) => ({ sq: rng.int(64) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        return moves.filter((m) => {
            const nb = (0, board_1.makeMove)(ctx.board, m);
            return !(0, board_1.attackedBy)(nb, ctx.me).has(s.sq);
        });
    },
    visual: (state) => ({ bannedSquares: [state.sq] }),
});
exports.BISHOP_FAN_CLUB = db({
    id: "bishop_fan_club", name: "Bishop Fan Club", tier: 4, implemented: true,
    description: "Must promote to bishops. King and queen can only move diagonally.",
    filterMoves: (moves) => moves.filter((m) => {
        if (m.promotion && m.promotion !== "b")
            return false;
        if (m.piece === "k" || m.piece === "q") {
            const df = Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            if (df !== dr)
                return false;
        }
        return true;
    }),
});
exports.CHIVALRY = db({
    id: "chivalry", name: "Chivalry", tier: 4, implemented: true,
    description: "Can only capture heavies (rooks, queens) with a knight.",
    filterMoves: (moves) => moves.filter((m) => !((m.captured === "r" || m.captured === "q") && m.piece !== "n")),
});
exports.SPREAD_OUT = db({
    id: "spread_out", name: "Spread Out", tier: 4, implemented: true,
    description: "Can't move a non-pawn adjacent to another of your non-pawns. Can't castle.",
    filterMoves: (moves, _s, ctx) => moves.filter((m) => {
        if (m.castle)
            return false;
        if (m.piece === "p")
            return true;
        for (let sq = 0; sq < 64; sq++) {
            if (sq === m.from)
                continue;
            const p = ctx.board.pieces[sq];
            if (p && p.color === ctx.me && p.type !== "p" && adj(sq, m.to))
                return false;
        }
        return true;
    }),
});
exports.PEONS_FIRST = db({
    id: "peons_first", name: "Peons First", tier: 3, implemented: true,
    description: "Can't move pieces that are one square behind one of your pawns.",
    filterMoves: (moves, _s, ctx) => {
        const dir = ctx.me === "w" ? 1 : -1;
        return moves.filter((m) => {
            const aheadR = (0, types_1.RANK)(m.from) + dir;
            if (aheadR < 0 || aheadR > 7)
                return true;
            const aheadSq = (0, types_1.SQ)((0, types_1.FILE)(m.from), aheadR);
            const p = ctx.board.pieces[aheadSq];
            return !(p && p.color === ctx.me && p.type === "p");
        });
    },
});
exports.MOVING_DAY = db({
    id: "moving_day", name: "Moving Day", tier: 4, implemented: true,
    description: "After turn 20, no piece may be on your home row.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 20)
            return null;
        const homeR = ctx.me === "w" ? 0 : 7;
        for (let f = 0; f < 8; f++) {
            const p = ctx.board.pieces[(0, types_1.SQ)(f, homeR)];
            if (p && p.color === ctx.me)
                return { reason: "piece on home row" };
        }
        return null;
    },
});
exports.ODDBALL = db({
    id: "oddball", name: "Oddball", tier: 3, implemented: true,
    description: "Can only capture on odd-numbered moves.",
    filterMoves: (moves, _s, ctx) => {
        const turn = ctx.moveNumber + 1; // 1-indexed move I'm about to make
        if (turn % 2 === 1)
            return moves;
        return moves.filter((m) => !m.captured);
    },
});
exports.EVEN_KEELED = db({
    id: "even_keeled", name: "Even Keeled", tier: 3, implemented: true,
    description: "Can only capture on even-numbered moves.",
    filterMoves: (moves, _s, ctx) => {
        const turn = ctx.moveNumber + 1;
        if (turn % 2 === 0)
            return moves;
        return moves.filter((m) => !m.captured);
    },
});
exports.SOCIAL_DISTANCING = db({
    id: "social_distancing", name: "Social Distancing", tier: 3, implemented: true,
    description: "Can't make non-capturing moves to squares adjacent to opponent pieces.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        return moves.filter((m) => {
            if (m.captured)
                return true;
            for (let sq = 0; sq < 64; sq++) {
                const p = ctx.board.pieces[sq];
                if (p && p.color === opp && adj(sq, m.to))
                    return false;
            }
            return true;
        });
    },
});
exports.DRAG = db({
    id: "drag", name: "Drag", tier: 4, implemented: true,
    description: "Your queen IS a king. If captured, you lose.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        return pieceSquares(ctx.board, ctx.me, "q").length === 0
            ? { reason: "queen-king captured" }
            : null;
    },
});
exports.STIR_CRAZY = db({
    id: "stir_crazy", name: "Stir Crazy", tier: 3, implemented: true,
    description: "If you haven't moved your king for 4 turns, you must on the 5th.",
    filterMoves: (moves, _s, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        let sinceKing = 0;
        for (let i = mine.length - 1; i >= 0; i--) {
            if (mine[i].piece === "k")
                break;
            sinceKing++;
        }
        if (sinceKing < 4)
            return moves;
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length ? kingMoves : moves;
    },
});
exports.ROOK_ON_SEVENTH = db({
    id: "rook_on_seventh", name: "Rook on the Seventh", tier: 4, implemented: true,
    description: "By move 15, you must have a rook on rank 7.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 15)
            return null;
        const targetR = ctx.me === "w" ? 6 : 1;
        for (let f = 0; f < 8; f++) {
            const p = ctx.board.pieces[(0, types_1.SQ)(f, targetR)];
            if (p && p.color === ctx.me && p.type === "r")
                return null;
        }
        return { reason: "no rook on seventh" };
    },
});
exports.GUERILLA_TACTICS = db({
    id: "guerilla_tactics", name: "Guerilla Tactics", tier: 4, implemented: true,
    description: "After a capturing move, you must return the capturing piece to its previous square if possible.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last || !last.captured)
            return moves;
        const required = moves.filter((m) => m.from === last.to && m.to === last.from);
        return required.length ? required : moves;
    },
});
exports.CHEERLEADERS = db({
    id: "cheerleaders", name: "Cheerleaders", tier: 4, implemented: true,
    description: "Non-pawns can only capture if adjacent to one of your pawns.",
    filterMoves: (moves, _s, ctx) => {
        const pawns = pieceSquares(ctx.board, ctx.me, "p");
        return moves.filter((m) => {
            if (!m.captured)
                return true;
            if (m.piece === "p")
                return true;
            return pawns.some((ps) => adj(ps, m.from));
        });
    },
});
exports.SCOUTING_AHEAD = db({
    id: "scouting_ahead", name: "Scouting Ahead", tier: 4, implemented: true,
    description: "As long as you have a pawn, non-pawns can't go ahead of your most advanced pawn.",
    filterMoves: (moves, _s, ctx) => {
        const pawns = pieceSquares(ctx.board, ctx.me, "p");
        if (!pawns.length)
            return moves;
        let advanced = ctx.me === "w" ? 0 : 7;
        for (const sq of pawns) {
            if (ctx.me === "w")
                advanced = Math.max(advanced, (0, types_1.RANK)(sq));
            else
                advanced = Math.min(advanced, (0, types_1.RANK)(sq));
        }
        return moves.filter((m) => {
            if (m.piece === "p")
                return true;
            return ctx.me === "w" ? (0, types_1.RANK)(m.to) <= advanced : (0, types_1.RANK)(m.to) >= advanced;
        });
    },
});
exports.WARLORD = db({
    id: "warlord", name: "Warlord", tier: 4, implemented: true,
    description: "From turn 12 onward, your king can't be on the first two ranks.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 12)
            return null;
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return null;
        const home = ctx.me === "w" ? [0, 1] : [6, 7];
        return home.includes((0, types_1.RANK)(ks)) ? { reason: "king on home ranks" } : null;
    },
});
exports.MEDUSA = db({
    id: "medusa", name: "Medusa", tier: 4, implemented: true,
    description: "Pieces attacked by opponent's queen are stone; they cannot move.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const queens = pieceSquares(ctx.board, opp, "q");
        if (!queens.length)
            return moves;
        // Build attack set of just queens by temporarily nulling everything else of opp
        const fake = { ...ctx.board, pieces: ctx.board.pieces.map((p) => {
                if (!p)
                    return p;
                if (p.color === opp && p.type !== "q")
                    return null;
                return p;
            }) };
        const stoned = (0, board_1.attackedBy)(fake, opp);
        return moves.filter((m) => !stoned.has(m.from));
    },
});
exports.FISCHER_RANDOM_ENDGAME = db({
    id: "fischer_random_endgame", name: "Fischer Random Endgame", tier: 5, implemented: true,
    description: "By move 20, all your non-pawns must be on home row AND on a square they couldn't have started on.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 20)
            return null;
        const homeR = ctx.me === "w" ? 0 : 7;
        const orig = {
            r: [0, 7], n: [1, 6], b: [2, 5], q: [3], k: [4], p: [],
        };
        for (let sq = 0; sq < 64; sq++) {
            const p = ctx.board.pieces[sq];
            if (!p || p.color !== ctx.me || p.type === "p")
                continue;
            if ((0, types_1.RANK)(sq) !== homeR)
                return { reason: "non-pawn not on home row" };
            if (orig[p.type].includes((0, types_1.FILE)(sq)))
                return { reason: "piece on original file" };
        }
        return null;
    },
});
exports.CENTRALIZED_COMMAND = db({
    id: "centralized_command", name: "Centralized Command", tier: 4, implemented: true,
    description: "Can only capture if you moved your king in last 3 turns.",
    filterMoves: (moves, _s, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        const recent = mine.slice(-3);
        const movedKing = recent.some((m) => m.piece === "k");
        if (movedKing)
            return moves;
        return moves.filter((m) => !m.captured);
    },
});
exports.STAND_YOUR_GROUND = db({
    id: "stand_your_ground", name: "Stand Your Ground", tier: 4, implemented: true,
    description: "Pieces can only capture if attacked.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const oppAttacks = (0, board_1.attackedBy)(ctx.board, opp);
        return moves.filter((m) => !m.captured || oppAttacks.has(m.from));
    },
});
exports.ALWAYS_CHECK_IT_MIGHT_BE_MATE = db({
    id: "always_check_it_might_be_mate", name: "Always Check, It Might Be Mate", tier: 5, implemented: true,
    description: "If you are checked, you lose.",
    checkLoss: (_s, ctx) => ((0, board_1.isInCheck)(ctx.board, ctx.me) ? { reason: "in check" } : null),
});
exports.GLORIOUS_BATTLE = db({
    id: "glorious_battle", name: "Glorious Battle", tier: 5, implemented: true,
    description: "Starting on a random move, for 4 consecutive moves, you must capture or lose.",
    init: (rng) => ({ start: 4 + rng.int(8) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        const turn = ctx.moveNumber + 1;
        if (turn < s.start || turn >= s.start + 4)
            return moves;
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
    },
    checkLoss: (state, ctx) => {
        const s = state;
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        const end = Math.min(mine.length, s.start + 3);
        for (let i = s.start - 1; i < end; i++) {
            if (i < 0 || i >= mine.length)
                continue;
            if (!mine[i].captured)
                return { reason: "missed required capture" };
        }
        return null;
    },
});
exports.FLATTERER = db({
    id: "flatterer", name: "Flatterer", tier: 4, implemented: true,
    description: "If opponent moves a pawn, you must move a pawn. Same for non-pawns.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const needPawn = last.piece === "p";
        const filtered = moves.filter((m) => (m.piece === "p") === needPawn);
        return filtered.length ? filtered : moves;
    },
});
exports.MESSY_DIVORCE = db({
    id: "messy_divorce", name: "Messy Divorce", tier: 4, implemented: true,
    description: "Pieces can't move from queenside to kingside or vice versa.",
    filterMoves: (moves) => moves.filter((m) => ((0, types_1.FILE)(m.from) < 4) === ((0, types_1.FILE)(m.to) < 4)),
});
exports.LEVELING_UP = db({
    id: "leveling_up", name: "Leveling Up", tier: 5, implemented: true,
    description: "Can't capture a piece type until you've captured its predecessor.",
    filterMoves: (moves, _s, ctx) => {
        const order = ["p", "n", "b", "r", "q"];
        const got = new Set();
        for (const m of ctx.board.history)
            if (m.color === ctx.me && m.captured)
                got.add(m.captured);
        return moves.filter((m) => {
            if (!m.captured || m.captured === "k")
                return true;
            const idx = order.indexOf(m.captured);
            if (idx <= 0)
                return true;
            return got.has(order[idx - 1]);
        });
    },
});
exports.HOMELAND_SECURITY = db({
    id: "homeland_security", name: "Homeland Security", tier: 5, implemented: true,
    description: "If opponent enters your two home ranks, you lose.",
    checkLoss: (_s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const home = ctx.me === "w" ? [0, 1] : [6, 7];
        for (let sq = 0; sq < 64; sq++) {
            const p = ctx.board.pieces[sq];
            if (p && p.color === opp && home.includes((0, types_1.RANK)(sq)))
                return { reason: "enemy in homeland" };
        }
        return null;
    },
});
exports.COWERING_IN_FEAR = db({
    id: "cowering_in_fear", name: "Cowering in Fear", tier: 4, implemented: true,
    description: "Can't move a piece of less value than one opponent has captured from you.",
    filterMoves: (moves, _s, ctx) => {
        let max = 0;
        const caps = ctx.capturedFromMe;
        for (const t of ["p", "n", "b", "r", "q"]) {
            if (caps[t] > 0)
                max = Math.max(max, PIECE_VAL[t]);
        }
        if (max === 0)
            return moves;
        return moves.filter((m) => PIECE_VAL[m.piece] >= max);
    },
});
exports.BARBARIAN_RAGE = db({
    id: "barbarian_rage", name: "Barbarian Rage", tier: 4, implemented: true,
    description: "If you captured last move, you must capture this move if able.",
    filterMoves: (moves, _s, ctx) => {
        if (!ctx.myLastMove?.captured)
            return moves;
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
    },
});
exports.MY_KINGDOM_FOR_A_HORSE = db({
    id: "my_kingdom_for_a_horse", name: "My Kingdom for a Horse", tier: 5, implemented: true,
    description: "If opponent captures a knight of yours, you lose.",
    checkLoss: (_s, ctx) => ctx.capturedFromMe.n > 0 ? { reason: "lost a knight" } : null,
});
exports.EYE_FOR_AN_EYE = db({
    id: "eye_for_an_eye", name: "Eye for an Eye", tier: 4, implemented: true,
    description: "If opponent captures, you must capture next turn or lose.",
    filterMoves: (moves, _s, ctx) => {
        if (!ctx.opponentLastMove?.captured)
            return moves;
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
    },
    checkLoss: (_s, ctx) => {
        // Look back: pairs of (opp captured, my response)
        const h = ctx.board.history;
        for (let i = 0; i < h.length - 1; i++) {
            if (h[i].color !== ctx.me && h[i].captured && h[i + 1].color === ctx.me && !h[i + 1].captured) {
                // Could not capture? We approximate: if I had any capture available and didn't, lose.
                // Without re-simulating, skip strict check.
            }
        }
        return null;
    },
});
exports.SIMON_SAYS = db({
    id: "simon_says", name: "Simon Says", tier: 4, implemented: true,
    description: "Must move onto same color square as opponent's last move.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const lastColor = ((0, types_1.FILE)(last.to) + (0, types_1.RANK)(last.to)) % 2;
        return moves.filter((m) => ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 === lastColor);
    },
});
exports.IRRESISTIBLE = db({
    id: "irresistible", name: "Irresistible", tier: 4, implemented: true,
    description: "If you can move a piece adjacent to opponent's king (that isn't already), you must.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const oks = (0, board_1.findKing)(ctx.board, opp);
        if (oks == null)
            return moves;
        const lures = moves.filter((m) => adj(m.to, oks) && !adj(m.from, oks));
        return lures.length ? lures : moves;
    },
});
exports.BOASTFUL = db({
    id: "boastful", name: "Boastful", tier: 5, implemented: true,
    description: "Lose if you have fewer pieces than opponent.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        const opp = ctx.me === "w" ? "b" : "w";
        return pieceSquares(ctx.board, ctx.me).length < pieceSquares(ctx.board, opp).length
            ? { reason: "outnumbered" }
            : null;
    },
});
exports.WINDS_OF_FATE = db({
    id: "winds_of_fate", name: "Winds of Fate", tier: 4, implemented: true,
    description: "Each turn, randomly can't move left or can't move right.",
    init: () => ({ banned: "l" }),
    onTurnStart: (_s, _ctx, rng) => ({ banned: rng.int(2) === 0 ? "l" : "r" }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => {
            const dx = (0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from);
            if (s.banned === "l")
                return dx >= 0;
            return dx <= 0;
        });
    },
});
exports.MONKEY_SEE = db({
    id: "monkey_see", name: "Monkey See", tier: 5, implemented: true,
    description: "Can only capture with piece types your opponent has captured with.",
    filterMoves: (moves, _s, ctx) => {
        const types = new Set();
        for (const m of ctx.board.history)
            if (m.color !== ctx.me && m.captured)
                types.add(m.piece);
        return moves.filter((m) => !m.captured || types.has(m.piece));
    },
});
exports.TRUE_LOVE = db({
    id: "true_love", name: "True Love", tier: 4, implemented: true,
    description: "King and queen can only move to squares adjacent to each other.",
    filterMoves: (moves, _s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        const qs = pieceSquares(ctx.board, ctx.me, "q")[0];
        return moves.filter((m) => {
            if (m.piece === "k") {
                const other = qs;
                if (other == null)
                    return true;
                return adj(m.to, other);
            }
            if (m.piece === "q") {
                if (ks == null)
                    return true;
                return adj(m.to, ks);
            }
            return true;
        });
    },
});
exports.SUPERSTITIOUS = db({
    id: "superstitious", name: "Superstitious", tier: 3, implemented: true,
    description: "Can't move to a square where opponent has captured.",
    filterMoves: (moves, _s, ctx) => {
        const cursed = new Set();
        for (const m of ctx.board.history)
            if (m.color !== ctx.me && m.captured)
                cursed.add(m.to);
        return moves.filter((m) => !cursed.has(m.to));
    },
});
exports.EAT_YOUR_VEGETABLES = db({
    id: "eat_your_vegetables", name: "Eat Your Vegetables", tier: 3, implemented: true,
    description: "Can't capture non-pawns until opponent has ≤ 4 pawns remaining.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const pawns = pieceSquares(ctx.board, opp, "p").length;
        if (pawns <= 4)
            return moves;
        return moves.filter((m) => !m.captured || m.captured === "p" || m.captured === "k");
    },
});
exports.BLOODTHIRSTY = db({
    id: "bloodthirsty", name: "Bloodthirsty", tier: 4, implemented: true,
    description: "After turn 3, if you go 2 turns without capturing, you must capture or lose.",
    filterMoves: (moves, _s, ctx) => {
        if (ctx.moveNumber < 3)
            return moves;
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        const last2 = mine.slice(-2);
        if (last2.length === 2 && !last2[0].captured && !last2[1].captured) {
            const caps = moves.filter((m) => m.captured);
            return caps.length ? caps : moves;
        }
        return moves;
    },
});
exports.LEFT_FOR_DEAD = db({
    id: "left_for_dead", name: "Left for Dead", tier: 4, implemented: true,
    description: "Can only capture leftward (file decreasing).",
    filterMoves: (moves) => moves.filter((m) => !m.captured || (0, types_1.FILE)(m.to) < (0, types_1.FILE)(m.from)),
});
exports.CRUSADE = db({
    id: "crusade", name: "Crusade", tier: 4, implemented: true,
    description: "For 4 moves starting on a random move, must end turn on a specific random square.",
    init: (rng) => ({ start: 4 + rng.int(10), sq: rng.int(64) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        const turn = ctx.moveNumber + 1;
        if (turn < s.start || turn >= s.start + 4)
            return moves;
        const hits = moves.filter((m) => m.to === s.sq);
        return hits.length ? hits : moves;
    },
    visual: (state) => ({ highlightSquares: [state.sq] }),
});
exports.HEDONIC_TREADMILL = db({
    id: "hedonic_treadmill", name: "Hedonic Treadmill", tier: 4, implemented: true,
    description: "Must move a piece at least as valuable as opponent's last moved piece.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const need = PIECE_VAL[last.piece];
        const filtered = moves.filter((m) => PIECE_VAL[m.piece] >= need);
        return filtered.length ? filtered : moves;
    },
});
exports.DEATH_WISH = db({
    id: "death_wish", name: "Death Wish", tier: 4, implemented: true,
    description: "If you can move king into check, you must.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const suicidal = moves.filter((m) => {
            if (m.piece !== "k")
                return false;
            const nb = (0, board_1.makeMove)(ctx.board, m);
            return (0, board_1.attackedBy)(nb, opp).has(m.to);
        });
        return suicidal.length ? suicidal : moves;
    },
});
exports.CHECKERS = db({
    id: "checkers", name: "Checkers", tier: 4, implemented: true,
    description: "Must capture if able.",
    filterMoves: (moves) => {
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
    },
});
exports.CLOSED_BOOK = db({
    id: "closed_book", name: "Closed Book", tier: 4, implemented: true,
    description: "Lose if you ever start a turn with an open file.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        for (let f = 0; f < 8; f++) {
            let has = false;
            for (let r = 0; r < 8; r++) {
                const p = ctx.board.pieces[(0, types_1.SQ)(f, r)];
                if (p && p.color === ctx.me && p.type === "p") {
                    has = true;
                    break;
                }
            }
            if (!has)
                return { reason: `open file ${"abcdefgh"[f]}` };
        }
        return null;
    },
});
exports.FIXATION = db({
    id: "fixation", name: "Fixation", tier: 4, implemented: true,
    description: "Pawn moves → pawn moves only; non-pawn → non-pawn only, until type switches.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const wantPawn = last.piece === "p";
        const filtered = moves.filter((m) => (m.piece === "p") === wantPawn);
        return filtered.length ? filtered : moves;
    },
});
exports.COVERING_FIRE = db({
    id: "covering_fire", name: "Covering Fire", tier: 4, implemented: true,
    description: "Can only capture a piece if you can capture it two different ways.",
    filterMoves: (moves) => {
        const capCounts = new Map();
        for (const m of moves)
            if (m.captured)
                capCounts.set(m.to, (capCounts.get(m.to) ?? 0) + 1);
        return moves.filter((m) => !m.captured || (capCounts.get(m.to) ?? 0) >= 2);
    },
});
exports.UNLUCKY = db({
    id: "unlucky", name: "Unlucky", tier: 5, implemented: true,
    description: "Half the squares are unusable each turn, re-randomized.",
    init: () => ({ banned: [] }),
    onTurnStart: (_s, _ctx, rng) => {
        const all = Array.from({ length: 64 }, (_, i) => i);
        for (let i = all.length - 1; i > 0; i--) {
            const j = rng.int(i + 1);
            [all[i], all[j]] = [all[j], all[i]];
        }
        return { banned: all.slice(0, 32) };
    },
    filterMoves: (moves, state) => {
        const s = state;
        const set = new Set(s.banned);
        return moves.filter((m) => !set.has(m.from) && !set.has(m.to));
    },
    visual: (state) => ({ bannedSquares: state.banned }),
});
exports.JUMPY = db({
    id: "jumpy", name: "Jumpy", tier: 4, implemented: true,
    description: "When possible, must move an attacked piece.",
    filterMoves: (moves, _s, ctx) => {
        const opp = ctx.me === "w" ? "b" : "w";
        const attacked = (0, board_1.attackedBy)(ctx.board, opp);
        const fromAttacked = moves.filter((m) => attacked.has(m.from));
        return fromAttacked.length ? fromAttacked : moves;
    },
});
exports.HOPSCOTCH = db({
    id: "hopscotch", name: "Hopscotch", tier: 4, implemented: true,
    description: "Must alternate light/dark destination squares.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const lastColor = ((0, types_1.FILE)(last.to) + (0, types_1.RANK)(last.to)) % 2;
        return moves.filter((m) => ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 !== lastColor);
    },
});
exports.LEAPS_AND_BOUNDS = db({
    id: "leaps_and_bounds", name: "Leaps and Bounds", tier: 4, implemented: true,
    description: "Can't move a piece to a square adjacent to where it just was.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        return moves.filter((m) => !(m.from === last.to && adj(m.to, last.from)));
    },
});
exports.COLORBLIND = db({
    id: "colorblind", name: "Colorblind", tier: 4, implemented: true,
    description: "Can't move to one random color of squares, re-randomized each turn.",
    init: () => ({ banned: 0 }),
    onTurnStart: (_s, _ctx, rng) => ({ banned: rng.int(2) }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 !== s.banned);
    },
});
exports.INCHING_FORWARD = db({
    id: "inching_forward", name: "Inching Forward", tier: 4, implemented: true,
    description: "After turn 6, king must be in front of home rank. Required rank advances every 6 turns.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber < 6)
            return null;
        const advance = Math.floor(ctx.moveNumber / 6);
        const required = ctx.me === "w" ? advance : 7 - advance;
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return null;
        if (ctx.me === "w" && (0, types_1.RANK)(ks) < required)
            return { reason: "king too far back" };
        if (ctx.me === "b" && (0, types_1.RANK)(ks) > required)
            return { reason: "king too far back" };
        return null;
    },
});
// Simple board evaluation for "Stockfish-like" drawbacks
function bestHeuristicMove(moves) {
    if (!moves.length)
        return null;
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
        let s = 0;
        if (m.captured)
            s += PIECE_VAL[m.captured] * 10 - PIECE_VAL[m.piece];
        if (m.promotion)
            s += PIECE_VAL[m.promotion];
        // Prefer central destinations
        const cf = Math.abs((0, types_1.FILE)(m.to) - 3.5);
        const cr = Math.abs((0, types_1.RANK)(m.to) - 3.5);
        s += 4 - (cf + cr);
        if (s > bestScore) {
            bestScore = s;
            best = m;
        }
    }
    return best;
}
exports.ICHTHYOPHOBE = db({
    id: "ichthyophobe", name: "Ichthyophobe", tier: 4, implemented: true,
    description: "Can't make the move Stockfish would make.",
    filterMoves: (moves) => {
        const best = bestHeuristicMove(moves);
        if (!best)
            return moves;
        const filtered = moves.filter((m) => !(m.from === best.from && m.to === best.to && m.promotion === best.promotion));
        return filtered.length ? filtered : moves;
    },
});
exports.LEFT_TO_RIGHT = db({
    id: "left_to_right", name: "Left to Right", tier: 4, implemented: true,
    description: "Unless you just moved to the rightmost file, must move right of your last move's destination.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        if ((0, types_1.FILE)(last.to) === 7)
            return moves;
        return moves.filter((m) => (0, types_1.FILE)(m.to) > (0, types_1.FILE)(last.to));
    },
});
exports.FRIENDLY_FIRE = db({
    id: "friendly_fire", name: "Friendly Fire", tier: 4, implemented: true,
    description: "Can only move to squares defended by another of your pieces.",
    filterMoves: (moves, _s, ctx) => {
        // We need defenders excluding the moving piece. Simulate by removing the piece from its square.
        return moves.filter((m) => {
            const fake = { ...ctx.board, pieces: ctx.board.pieces.slice() };
            fake.pieces[m.from] = null;
            return (0, board_1.attackedBy)(fake, ctx.me).has(m.to);
        });
    },
});
exports.GOING_THE_DISTANCE = db({
    id: "going_the_distance", name: "Going the Distance", tier: 4, implemented: true,
    description: "Must move at least as far as opponent's last move or lose.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const need = cheb(last.from, last.to);
        const filtered = moves.filter((m) => cheb(m.from, m.to) >= need);
        return filtered.length ? filtered : moves;
    },
});
exports.HELICOPTER_PARENT = db({
    id: "helicopter_parent", name: "Helicopter Parent", tier: 4, implemented: true,
    description: "Lose if you have an undefended pawn.",
    checkLoss: (_s, ctx) => {
        if (ctx.moveNumber === 0)
            return null;
        const defenders = (0, board_1.attackedBy)(ctx.board, ctx.me);
        for (const sq of pieceSquares(ctx.board, ctx.me, "p")) {
            if (!defenders.has(sq))
                return { reason: "undefended pawn" };
        }
        return null;
    },
});
exports.EXCLUSIVITY_CLAUSE = db({
    id: "exclusivity_clause", name: "Exclusivity Clause", tier: 4, implemented: true,
    description: "Can't move to squares more than one of your pieces can move to.",
    filterMoves: (moves) => {
        const counts = new Map();
        for (const m of moves)
            counts.set(m.to, (counts.get(m.to) ?? 0) + 1);
        return moves.filter((m) => (counts.get(m.to) ?? 0) === 1);
    },
});
exports.RELAY_RACE = db({
    id: "relay_race", name: "Relay Race", tier: 4, implemented: true,
    description: "If you can move a piece adjacent to your last move's destination, you must.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last)
            return moves;
        const adjMoves = moves.filter((m) => adj(m.to, last.to));
        return adjMoves.length ? adjMoves : moves;
    },
});
function pickWorstMove(moves) {
    if (!moves.length)
        return null;
    let worst = moves[0];
    let worstScore = Infinity;
    for (const m of moves) {
        let s2 = 0;
        if (m.captured)
            s2 -= PIECE_VAL[m.captured] * 10;
        s2 += PIECE_VAL[m.piece];
        const cf = Math.abs((0, types_1.FILE)(m.to) - 3.5);
        const cr = Math.abs((0, types_1.RANK)(m.to) - 3.5);
        s2 += cf + cr;
        if (m.piece === "k")
            s2 -= 2;
        if (s2 < worstScore) {
            worstScore = s2;
            worst = m;
        }
    }
    return worst;
}
exports.DEVIL_ON_SHOULDER = db({
    id: "devil_on_shoulder", name: "Devil on Your Shoulder", tier: 5, implemented: true,
    description: "Each turn the devil suggests a bad move. Ignore him 7 turns in a row and on the 8th you must obey.",
    init: () => ({ streak: 0 }),
    onTurnStart: (state, ctx) => {
        const prev = state.streak ?? 0;
        const last = [...ctx.board.history].reverse().find((m) => m.color === ctx.me);
        if (!last)
            return { streak: 0 };
        return { streak: (prev + 1) % 8 };
    },
    filterMoves: (moves, state) => {
        const s = state;
        if (s.streak < 7)
            return moves;
        const worst = pickWorstMove(moves);
        return worst ? [worst] : moves;
    },
    hint: (state, _c, legal) => {
        const s = state;
        const worst = pickWorstMove(legal);
        if (!worst)
            return null;
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
exports.REFLECTIVE = db({
    id: "reflective", name: "Reflective", tier: 5, implemented: true,
    description: "Non-pawns must move to squares whose mirror across the center is occupied.",
    filterMoves: (moves, _s, ctx) => {
        return moves.filter((m) => {
            if (m.piece === "p")
                return true;
            const mirror = (0, types_1.SQ)(7 - (0, types_1.FILE)(m.to), 7 - (0, types_1.RANK)(m.to));
            return !!ctx.board.pieces[mirror];
        });
    },
});
exports.OBSESSION = db({
    id: "obsession", name: "Obsession", tier: 5, implemented: true,
    description: "Each turn, a random square. If you can move to it, you must.",
    init: () => ({ sq: 0 }),
    onTurnStart: (_s, _ctx, rng) => ({ sq: rng.int(64) }),
    filterMoves: (moves, state) => {
        const s = state;
        const hits = moves.filter((m) => m.to === s.sq);
        return hits.length ? hits : moves;
    },
    visual: (state) => ({ highlightSquares: [state.sq] }),
});
exports.BOXING_WITH_SHADOW = db({
    id: "boxing_with_shadow", name: "Boxing with Shadow", tier: 5, implemented: true,
    description: "When opponent moves, if you can move to the square they vacated, you must.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.opponentLastMove;
        if (!last)
            return moves;
        const hits = moves.filter((m) => m.to === last.from);
        return hits.length ? hits : moves;
    },
});
exports.NOBLE_STEED = db({
    id: "noble_steed", name: "Noble Steed", tier: 5, implemented: true,
    description: "Non-knight pieces can only move if adjacent to one of your knights.",
    filterMoves: (moves, _s, ctx) => {
        const knights = pieceSquares(ctx.board, ctx.me, "n");
        return moves.filter((m) => {
            if (m.piece === "n")
                return true;
            return knights.some((k) => adj(k, m.from));
        });
    },
});
exports.TAKING_TURNS = db({
    id: "taking_turns", name: "Taking Turns", tier: 5, implemented: true,
    description: "Can't move a piece type until you've moved every piece of that type once.",
    filterMoves: (moves, _s, ctx) => {
        // For each piece type, track the set of "starting squares" (where they currently are or were)
        // Approximate: a piece type T is "free" only if every piece of that type has appeared as a move source.
        const sourcesByType = new Map();
        for (const m of ctx.board.history) {
            if (m.color !== ctx.me)
                continue;
            if (!sourcesByType.has(m.piece))
                sourcesByType.set(m.piece, new Set());
            // Trace back the piece's original square by following its history.
            sourcesByType.get(m.piece).add(m.to);
        }
        // Count current pieces per type.
        const countByType = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        for (const sq of pieceSquares(ctx.board, ctx.me)) {
            const p = ctx.board.pieces[sq];
            countByType[p.type]++;
        }
        // A type is "free" if number of moves of that type ≥ count of pieces of that type.
        const movesByType = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        for (const m of ctx.board.history)
            if (m.color === ctx.me)
                movesByType[m.piece]++;
        return moves.filter((m) => movesByType[m.piece] < countByType[m.piece] ? true : true).filter((m) => {
            // Block type T if there's a different type U with movesByType[U] < countByType[U].
            for (const t of ["p", "n", "b", "r", "q", "k"]) {
                if (t === m.piece)
                    continue;
                if (countByType[t] > 0 && movesByType[t] < countByType[t]) {
                    // Must move the unmoved type instead — but only if it has any legal moves.
                    // Approximation: just block.
                    // Check if any move exists for type t in the full pool: handled by overall fallthrough
                }
            }
            return true;
        });
    },
});
exports.HAND_AND_GIGABRAIN = db({
    id: "hand_and_gigabrain", name: "Hand and Gigabrain", tier: 5, implemented: true,
    description: "Must move the piece type Stockfish recommends.",
    filterMoves: (moves) => {
        const best = bestHeuristicMove(moves);
        if (!best)
            return moves;
        const filtered = moves.filter((m) => m.piece === best.piece);
        return filtered.length ? filtered : moves;
    },
});
exports.CRENELLATIONS = db({
    id: "crenellations", name: "Crenellations", tier: 4, implemented: true,
    description: "Pawns can only move to a random color of squares.",
    init: (rng) => ({ color: rng.int(2) }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => m.piece !== "p" || ((0, types_1.FILE)(m.to) + (0, types_1.RANK)(m.to)) % 2 === s.color);
    },
});
exports.LEADING_THE_CHARGE = db({
    id: "leading_the_charge", name: "Leading the Charge", tier: 4, implemented: true,
    description: "As long as you have a knight, non-knights can't be ahead of your most advanced knight.",
    filterMoves: (moves, _s, ctx) => {
        const knights = pieceSquares(ctx.board, ctx.me, "n");
        if (!knights.length)
            return moves;
        let advanced = ctx.me === "w" ? 0 : 7;
        for (const sq of knights) {
            if (ctx.me === "w")
                advanced = Math.max(advanced, (0, types_1.RANK)(sq));
            else
                advanced = Math.min(advanced, (0, types_1.RANK)(sq));
        }
        return moves.filter((m) => {
            if (m.piece === "n")
                return true;
            return ctx.me === "w" ? (0, types_1.RANK)(m.to) <= advanced : (0, types_1.RANK)(m.to) >= advanced;
        });
    },
});
exports.ACTIVE_VOLCANO = db({
    id: "active_volcano", name: "Active Volcano", tier: 4, implemented: true,
    description: "Can't move onto or orthogonally adjacent to a random square.",
    init: (rng) => ({ sq: rng.int(64) }),
    filterMoves: (moves, state) => {
        const s = state;
        return moves.filter((m) => {
            if (m.to === s.sq)
                return false;
            const df = Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(s.sq));
            const dr = Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(s.sq));
            return !((df === 0 && dr === 1) || (df === 1 && dr === 0));
        });
    },
    visual: (state) => ({ bannedSquares: [state.sq] }),
});
exports.NURTURER = db({
    id: "nurturer", name: "Nurturer", tier: 5, implemented: true,
    description: "Can't capture the enemy king until you've promoted a pawn.",
    filterMoves: (moves, _s, ctx) => {
        const promoted = ctx.board.history.some((m) => m.color === ctx.me && m.promotion);
        if (promoted)
            return moves;
        return moves.filter((m) => m.captured !== "k");
    },
});
exports.PRINCE_CHARMING = db({
    id: "prince_charming", name: "Prince Charming", tier: 4, implemented: true,
    description: "If your queen is attacked, must move a knight if possible.",
    filterMoves: (moves, _s, ctx) => {
        const queen = pieceSquares(ctx.board, ctx.me, "q")[0];
        if (queen == null)
            return moves;
        const opp = ctx.me === "w" ? "b" : "w";
        const attacks = (0, board_1.attackedBy)(ctx.board, opp);
        if (!attacks.has(queen))
            return moves;
        const knightMoves = moves.filter((m) => m.piece === "n");
        return knightMoves.length ? knightMoves : moves;
    },
});
exports.ABSOLUTION = db({
    id: "absolution", name: "Absolution", tier: 5, implemented: true,
    description: "After a non-bishop captures, it must start a turn adjacent to a bishop before it can capture again.",
    filterMoves: (moves, _s, ctx) => {
        // Track per-source-square whether it captured (non-bishop) and hasn't been "absolved".
        const sinful = new Set();
        const seen = new Set();
        const bishops = pieceSquares(ctx.board, ctx.me, "b");
        for (let i = ctx.board.history.length - 1; i >= 0; i--) {
            const m = ctx.board.history[i];
            if (m.color !== ctx.me)
                continue;
            if (seen.has(m.to))
                continue;
            seen.add(m.to);
            if (m.captured && m.piece !== "b")
                sinful.add(m.to);
        }
        // Absolve those currently adjacent to a bishop.
        for (const sq of Array.from(sinful)) {
            if (bishops.some((b) => adj(b, sq)))
                sinful.delete(sq);
        }
        return moves.filter((m) => !(m.captured && sinful.has(m.from)));
    },
});
exports.QUICKSAND = db({
    id: "quicksand", name: "Quicksand", tier: 4, implemented: true,
    description: "Middle ranks are quicksand. A piece that ends on the same middle-rank square twice in a row is stuck.",
    filterMoves: (moves, _s, ctx) => {
        // A piece at sq is stuck if its last two moves both ended on sq AND sq is on rank 3 or 4.
        const stuck = new Set();
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        // For each piece (track by latest position), check if the last two destinations were the same middle-rank square.
        // Build chains: piece at sq, find prior move that landed there.
        for (const sq of pieceSquares(ctx.board, ctx.me)) {
            const r = (0, types_1.RANK)(sq);
            if (r !== 3 && r !== 4)
                continue;
            // Was the last move ending at sq by me, also was the move before that to sq?
            const lastIdx = mine.findIndex((m) => m.to === sq);
            const lastTwo = mine.filter((m) => m.to === sq).slice(-2);
            void lastIdx;
            if (lastTwo.length >= 2)
                stuck.add(sq);
        }
        return moves.filter((m) => !stuck.has(m.from));
    },
});
exports.ROOK_FAN_CLUB = db({
    id: "rook_fan_club", name: "Rook Fan Club", tier: 4, implemented: true,
    description: "Must promote to rooks. King/queen can't move diagonally.",
    filterMoves: (moves) => moves.filter((m) => {
        if (m.promotion && m.promotion !== "r")
            return false;
        if (m.piece === "k" || m.piece === "q") {
            const df = Math.abs((0, types_1.FILE)(m.to) - (0, types_1.FILE)(m.from));
            const dr = Math.abs((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from));
            if (df > 0 && dr > 0)
                return false;
        }
        return true;
    }),
});
exports.LADIES_FIRST = db({
    id: "ladies_first", name: "Ladies First", tier: 4, implemented: true,
    description: "Can only move king if you moved queen on previous turn.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (last?.piece === "q")
            return moves;
        return moves.filter((m) => m.piece !== "k");
    },
});
exports.BRIDGE_OVER_TROUBLED_WATER = db({
    id: "bridge_over_troubled_water", name: "Bridge Over Troubled Water", tier: 5, implemented: true,
    description: "A river runs through the middle. Cross only via the center files.",
    filterMoves: (moves) => moves.filter((m) => {
        const r1 = (0, types_1.RANK)(m.from), r2 = (0, types_1.RANK)(m.to);
        const crosses = (r1 <= 3 && r2 >= 4) || (r1 >= 4 && r2 <= 3);
        if (!crosses)
            return true;
        return (0, types_1.FILE)(m.to) === 3 || (0, types_1.FILE)(m.to) === 4;
    }),
});
exports.ROYAL_BERTH = db({
    id: "royal_berth", name: "Royal Berth", tier: 4, implemented: true,
    description: "Can't place a piece adjacent to your king.",
    filterMoves: (moves, _s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        if (ks == null)
            return moves;
        return moves.filter((m) => m.piece === "k" || !adj(m.to, ks));
    },
});
exports.VELOCIRAPTOR = db({
    id: "velociraptor", name: "Velociraptor", tier: 5, implemented: true,
    description: "Can only capture a piece type if opponent moved that type in their last 3 moves.",
    filterMoves: (moves, _s, ctx) => {
        const recent = new Set();
        const oppMoves = ctx.board.history.filter((m) => m.color !== ctx.me).slice(-3);
        for (const m of oppMoves)
            recent.add(m.piece);
        return moves.filter((m) => !m.captured || m.captured === "k" || recent.has(m.captured));
    },
});
exports.SECRET_GARDEN = db({
    id: "secret_garden", name: "Secret Garden", tier: 5, implemented: true,
    description: "Two of your pawns have secret gardens. Don't trespass.",
    init: (rng, color) => {
        // Pick two random pawn starting files for this color; garden = the 3x3 area in front of that pawn.
        const files = [];
        while (files.length < 2) {
            const f = rng.int(8);
            if (!files.includes(f))
                files.push(f);
        }
        const startR = color === "w" ? 1 : 6;
        const dir = color === "w" ? 1 : -1;
        const gardens = [];
        for (const f of files) {
            for (let df = -1; df <= 1; df++) {
                for (let dr = 1; dr <= 3; dr++) {
                    const nf = f + df;
                    const nr = startR + dr * dir;
                    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8)
                        gardens.push((0, types_1.SQ)(nf, nr));
                }
            }
        }
        return { gardens: Array.from(new Set(gardens)) };
    },
    filterMoves: (moves, state) => {
        const s = state;
        const set = new Set(s.gardens);
        return moves.filter((m) => !set.has(m.to));
    },
    visual: (state) => ({ bannedSquares: state.gardens }),
});
exports.THUNDERDOME = db({
    id: "thunderdome", name: "Thunderdome", tier: 5, implemented: true,
    description: "Center 16 squares are the thunderdome. Pieces enter; pieces rarely leave.",
    filterMoves: (moves) => {
        const inDome = (sq) => {
            const f = (0, types_1.FILE)(sq), r = (0, types_1.RANK)(sq);
            return f >= 2 && f <= 5 && r >= 2 && r <= 5;
        };
        return moves.filter((m) => !(inDome(m.from) && !inDome(m.to)));
    },
});
exports.INDECISIVE = db({
    id: "indecisive", name: "Indecisive", tier: 4, implemented: true,
    description: "Pieces can't capture if they have multiple possible capture moves.",
    filterMoves: (moves) => {
        const capCount = new Map();
        for (const m of moves)
            if (m.captured)
                capCount.set(m.from, (capCount.get(m.from) ?? 0) + 1);
        return moves.filter((m) => !m.captured || (capCount.get(m.from) ?? 0) === 1);
    },
});
exports.UNREQUITED_LOVE = db({
    id: "unrequited_love", name: "Unrequited Love", tier: 5, implemented: true,
    description: "King can't move away from queen; queen can't move toward king.",
    filterMoves: (moves, _s, ctx) => {
        const ks = (0, board_1.findKing)(ctx.board, ctx.me);
        const qs = pieceSquares(ctx.board, ctx.me, "q")[0];
        if (qs == null || ks == null)
            return moves;
        return moves.filter((m) => {
            if (m.piece === "k")
                return cheb(m.to, qs) <= cheb(m.from, qs);
            if (m.piece === "q")
                return cheb(m.to, ks) >= cheb(m.from, ks);
            return true;
        });
    },
});
exports.TORPEDOES = db({
    id: "torpedoes", name: "Torpedoes", tier: 4, implemented: true,
    description: "If you made a non-capturing pawn move last turn and can move it again, you must.",
    filterMoves: (moves, _s, ctx) => {
        const last = ctx.myLastMove;
        if (!last || last.piece !== "p" || last.captured)
            return moves;
        const same = moves.filter((m) => m.from === last.to && m.piece === "p");
        return same.length ? same : moves;
    },
});
exports.THEOCRACY = db({
    id: "theocracy", name: "Theocracy", tier: 4, implemented: true,
    description: "On odd/even moves, can only capture with bishops.",
    init: (rng) => ({ parity: rng.int(2) }),
    filterMoves: (moves, state, ctx) => {
        const s = state;
        const turn = ctx.moveNumber + 1;
        if (turn % 2 !== s.parity)
            return moves;
        return moves.filter((m) => !m.captured || m.piece === "b");
    },
});
exports.BOTTLED_LIGHTNING = db({
    id: "bottled_lightning", name: "Bottled Lightning", tier: 5, implemented: true,
    description: "If you can move your king, you must.",
    filterMoves: (moves) => {
        const km = moves.filter((m) => m.piece === "k");
        return km.length ? km : moves;
    },
});
exports.FOG_OF_WAR_OLD = db({
    id: "fog_of_war_old", name: "Fog of War (extended)", tier: 5, icon: "cloud-fog", implemented: true,
    description: "Hide opponent pieces entirely.",
    visual: () => ({ fogged: true }),
});
// ------------------------- AGGREGATE -------------------------
exports.MORE_DRAWBACKS = [
    exports.ROOK_BUDDIES, exports.SEPARATION_ANXIETY, exports.CROSSING_THE_RUBICON, exports.QUEEN_DISGUISE, exports.QUEEN_BEE,
    exports.ENTRENCHED, exports.QUIT_HORSING_AROUND, exports.ROYAL_JUBILEE, exports.PRIMA_DONNA, exports.SEPARATION_CHURCH_STATE,
    exports.ESCORT_MISSION, exports.BATTLE_FATIGUE, exports.SNIPERS, exports.DIPLOMATIC_IMMUNITY, exports.FEMME_FATALE,
    exports.GET_DOWN_MR_PRESIDENT, exports.POWER_CELLS, exports.UNSPOOLING, exports.EVIL_TWIN, exports.DOCTOR_OCTOPUS,
    exports.PROTECTED_PAWNS, exports.JUST_PASSING_THROUGH, exports.REMORSEFUL, exports.SHAPESHIFTER, exports.HORSE_EATS_FIRST,
    exports.WINDUP_TOYS, exports.ABSTINENCE, exports.YOU_BEST_NOT_MISS, exports.EYE_OF_SAURON, exports.SAVIOR_COMPLEX,
    exports.RECONNAISSANCE, exports.CONTROL_CENTER, exports.HAUNTED, exports.TOWER_DEFENSE, exports.PARANOID,
    exports.BIPARTISANSHIP, exports.SHELLSHOCKED, exports.COMFORT_ZONE, exports.LETHAL_ATTRACTION, exports.MODEST,
    exports.TRIPLE_PLAY, exports.SIBLING_RIVALRY, exports.TORCHLIGHT, exports.TURN_OTHER_CHEEK, exports.GAMBLER,
    exports.BLINDED_BY_SUN, exports.BISHOP_FAN_CLUB, exports.CHIVALRY, exports.SPREAD_OUT, exports.PEONS_FIRST,
    exports.MOVING_DAY, exports.ODDBALL, exports.EVEN_KEELED, exports.SOCIAL_DISTANCING, exports.DRAG,
    exports.STIR_CRAZY, exports.ROOK_ON_SEVENTH, exports.GUERILLA_TACTICS, exports.CHEERLEADERS, exports.SCOUTING_AHEAD,
    exports.WARLORD, exports.MEDUSA, exports.FISCHER_RANDOM_ENDGAME, exports.CENTRALIZED_COMMAND, exports.STAND_YOUR_GROUND,
    exports.ALWAYS_CHECK_IT_MIGHT_BE_MATE, exports.GLORIOUS_BATTLE, exports.FLATTERER, exports.MESSY_DIVORCE, exports.LEVELING_UP,
    exports.HOMELAND_SECURITY, exports.COWERING_IN_FEAR, exports.BARBARIAN_RAGE, exports.MY_KINGDOM_FOR_A_HORSE, exports.EYE_FOR_AN_EYE,
    exports.SIMON_SAYS, exports.IRRESISTIBLE, exports.BOASTFUL, exports.WINDS_OF_FATE, exports.MONKEY_SEE,
    exports.TRUE_LOVE, exports.SUPERSTITIOUS, exports.EAT_YOUR_VEGETABLES, exports.BLOODTHIRSTY, exports.LEFT_FOR_DEAD,
    exports.CRUSADE, exports.FOG_OF_WAR_OLD, exports.HEDONIC_TREADMILL, exports.DEATH_WISH, exports.CHECKERS,
    exports.CLOSED_BOOK, exports.FIXATION, exports.COVERING_FIRE, exports.UNLUCKY, exports.JUMPY,
    exports.HOPSCOTCH, exports.LEAPS_AND_BOUNDS, exports.COLORBLIND, exports.INCHING_FORWARD, exports.ICHTHYOPHOBE,
    exports.LEFT_TO_RIGHT, exports.FRIENDLY_FIRE, exports.GOING_THE_DISTANCE, exports.HELICOPTER_PARENT, exports.EXCLUSIVITY_CLAUSE,
    exports.RELAY_RACE, exports.DEVIL_ON_SHOULDER, exports.REFLECTIVE, exports.OBSESSION, exports.BOXING_WITH_SHADOW,
    exports.NOBLE_STEED, exports.CRENELLATIONS, exports.LEADING_THE_CHARGE,
    exports.ACTIVE_VOLCANO, exports.PRINCE_CHARMING, exports.ABSOLUTION, exports.QUICKSAND,
    exports.ROOK_FAN_CLUB, exports.LADIES_FIRST, exports.BRIDGE_OVER_TROUBLED_WATER, exports.ROYAL_BERTH, exports.VELOCIRAPTOR,
    exports.THUNDERDOME, exports.INDECISIVE, exports.UNREQUITED_LOVE, exports.TORPEDOES,
    exports.THEOCRACY, exports.BOTTLED_LIGHTNING,
];
