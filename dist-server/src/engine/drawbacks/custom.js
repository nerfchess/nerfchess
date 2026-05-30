"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeCustom = describeCustom;
exports.buildCustomDrawback = buildCustomDrawback;
exports.loadCustomDrawbacks = loadCustomDrawbacks;
exports.saveCustomDrawback = saveCustomDrawback;
exports.deleteCustomDrawback = deleteCustomDrawback;
const board_1 = require("../board");
const types_1 = require("../types");
const PIECE_NAMES = {
    p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens", k: "the king",
};
function ruleText(r) {
    switch (r.kind) {
        case "ban_file": return `You can't move to the ${"abcdefgh"[r.file]}-file.`;
        case "ban_rank": return `You can't move to rank ${r.rank + 1}.`;
        case "no_capture_piece": return `You can't capture ${PIECE_NAMES[r.piece]}.`;
        case "no_move_piece": return `You can't move ${PIECE_NAMES[r.piece]}.`;
        case "no_backward": return "You can't move backward.";
        case "only_captures": return "Every move must be a capture, if any capture is available.";
        case "no_captures": return "You can't capture at all.";
        case "lose_if_no_piece": return `You lose if you have no ${PIECE_NAMES[r.piece]}.`;
        case "lose_if_enemy_adjacent_to_king":
            return "You lose if any enemy piece is adjacent to your king.";
    }
}
function describeCustom(d) {
    return d.rules.map(ruleText).join(" ");
}
const adj = (a, b) => a !== b && Math.abs((0, types_1.FILE)(a) - (0, types_1.FILE)(b)) <= 1 && Math.abs((0, types_1.RANK)(a) - (0, types_1.RANK)(b)) <= 1;
function buildCustomDrawback(spec) {
    return {
        id: spec.id,
        name: spec.name,
        description: spec.description || describeCustom(spec),
        flavor: "A homemade curse.",
        tier: 3,
        icon: "wand",
        implemented: true,
        filterMoves: (moves, _s, ctx) => {
            let out = moves;
            const dir = ctx.me === "w" ? 1 : -1;
            let mustCapture = false;
            for (const r of spec.rules) {
                switch (r.kind) {
                    case "ban_file":
                        out = out.filter((m) => (0, types_1.FILE)(m.to) !== r.file);
                        break;
                    case "ban_rank":
                        out = out.filter((m) => (0, types_1.RANK)(m.to) !== r.rank);
                        break;
                    case "no_capture_piece":
                        out = out.filter((m) => m.captured !== r.piece);
                        break;
                    case "no_move_piece":
                        out = out.filter((m) => m.piece !== r.piece);
                        break;
                    case "no_backward":
                        out = out.filter((m) => ((0, types_1.RANK)(m.to) - (0, types_1.RANK)(m.from)) * dir >= 0);
                        break;
                    case "only_captures":
                        mustCapture = true;
                        break;
                    case "no_captures":
                        out = out.filter((m) => !m.captured);
                        break;
                    default:
                        break;
                }
            }
            if (mustCapture) {
                const caps = out.filter((m) => !!m.captured);
                if (caps.length)
                    out = caps;
            }
            return out;
        },
        checkLoss: (_s, ctx) => {
            for (const r of spec.rules) {
                if (r.kind === "lose_if_no_piece") {
                    const has = ctx.board.pieces.some((p) => p && p.color === ctx.me && p.type === r.piece);
                    if (!has)
                        return { reason: `no ${PIECE_NAMES[r.piece]} remain` };
                }
                if (r.kind === "lose_if_enemy_adjacent_to_king") {
                    const ks = (0, board_1.findKing)(ctx.board, ctx.me);
                    if (ks != null) {
                        for (let sq = 0; sq < 64; sq++) {
                            const p = ctx.board.pieces[sq];
                            if (p && p.color !== ctx.me && adj(sq, ks)) {
                                return { reason: "enemy adjacent to king" };
                            }
                        }
                    }
                }
            }
            return null;
        },
    };
}
const STORE_KEY = "dc:custom-drawbacks";
function loadCustomDrawbacks() {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((d) => typeof d === "object" && d && typeof d.id === "string" && typeof d.name === "string" && Array.isArray(d.rules));
    }
    catch {
        return [];
    }
}
function saveCustomDrawback(d) {
    if (typeof window === "undefined")
        return;
    const list = loadCustomDrawbacks().filter((x) => x.id !== d.id);
    list.push(d);
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
}
function deleteCustomDrawback(id) {
    if (typeof window === "undefined")
        return;
    const list = loadCustomDrawbacks().filter((x) => x.id !== id);
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
}
