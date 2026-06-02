"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_http_1 = require("node:http");
const node_https_1 = require("node:https");
const node_crypto_1 = require("node:crypto");
const board_1 = require("../src/engine/board");
const library_1 = require("../src/engine/drawbacks/library");
const game_1 = require("../src/engine/game");
const rng_1 = require("../src/engine/rng");
const ws_1 = __importStar(require("ws"));
const host = process.env.HOST || "127.0.0.1";
const port = parseInt(process.env.PORT || "8080", 10);
const socketPath = process.env.SOCKET_PATH || "/socket/v1";
const allowedOrigins = new Set((process.env.GAME_SERVER_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean));
const matches = new Map();
const disconnectGraceMs = 15 * 1000;
function pickDrawbackId() {
    const pool = library_1.PLAYABLE_DRAWBACKS.filter((drawback) => drawback.id !== "lucky");
    return pool[Math.floor(Math.random() * pool.length)].id;
}
function randomCode() {
    const chars = "BCDFGHJKMNPQRSTVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
function newCode() {
    let code = randomCode();
    while (matches.has(code))
        code = randomCode();
    return code;
}
function newToken() {
    return (0, node_crypto_1.randomBytes)(16).toString("hex");
}
function send(client, t, d) {
    if (!client || client.readyState !== ws_1.default.OPEN)
        return;
    client.send(JSON.stringify(d === undefined ? { t } : { t, d }));
}
function broadcast(match, t, d) {
    send(match.clients.w, t, d);
    send(match.clients.b, t, d);
}
function attachClient(match, client, color) {
    const existing = match.clients[color];
    if (existing && existing !== client && existing.readyState === ws_1.default.OPEN) {
        existing.close(1000, "Reconnected from another tab");
    }
    client.matchId = match.id;
    client.color = color;
    client.token = match.tokens[color];
    match.clients[color] = client;
    delete match.disconnectedAt[color];
}
function startPayload(match, color) {
    const clocks = currentClocks(match);
    return {
        id: match.id,
        color,
        token: match.tokens[color],
        ...match.setup,
        wc: Math.round(clocks.w),
        bc: Math.round(clocks.b),
        moves: match.game?.board.history.map(board_1.moveToUCI) ?? [],
    };
}
function sendStart(match, color) {
    send(match.clients[color], "start", startPayload(match, color));
    if (match.game?.result) {
        const clocks = currentClocks(match);
        send(match.clients[color], "end", {
            result: match.game.result,
            wc: Math.round(clocks.w),
            bc: Math.round(clocks.b),
        });
    }
}
function error(client, code, message) {
    send(client, "error", { code, message });
}
function currentClocks(match, now = Date.now()) {
    const clocks = { ...match.clocks };
    if (!match.setup.timeSec || !match.game || match.game.result || match.runningSince === null)
        return clocks;
    const active = match.game.board.turn;
    clocks[active] = Math.max(0, clocks[active] - (now - match.runningSince));
    return clocks;
}
function finishOnFlag(match, now = Date.now()) {
    if (!match.game || match.game.result || !match.setup.timeSec)
        return false;
    const clocks = currentClocks(match, now);
    const active = match.game.board.turn;
    if (clocks[active] > 0)
        return false;
    match.clocks = clocks;
    match.runningSince = null;
    match.game.result = {
        winner: active === "w" ? "b" : "w",
        reason: active === "w" ? "white ran out of time" : "black ran out of time",
    };
    finish(match);
    return true;
}
function finish(match) {
    if (!match.game?.result)
        return;
    match.completedAt = Date.now();
    const clocks = currentClocks(match);
    broadcast(match, "end", {
        result: match.game.result,
        wc: Math.round(clocks.w),
        bc: Math.round(clocks.b),
    });
}
function createMatch(client, data) {
    if (client.matchId)
        return error(client, "already_joined", "This connection already belongs to a game.");
    const requested = (data || {});
    const timeSec = Number.isInteger(requested.timeSec) ? Number(requested.timeSec) : 600;
    const incrementSec = Number.isInteger(requested.incrementSec) ? Number(requested.incrementSec) : 0;
    if (timeSec < 0 || timeSec > 7200 || incrementSec < 0 || incrementSec > 60) {
        return error(client, "invalid_clock", "Unsupported time control.");
    }
    const id = newCode();
    const match = {
        id,
        setup: {
            whiteDrawbackId: pickDrawbackId(),
            blackDrawbackId: pickDrawbackId(),
            seed: (0, rng_1.makeSeed)(),
            timeSec,
            incrementSec,
        },
        clients: { w: client },
        tokens: { w: newToken(), b: newToken() },
        disconnectedAt: {},
        game: null,
        clocks: { w: timeSec * 1000, b: timeSec * 1000 },
        runningSince: null,
        drawOfferBy: null,
        createdAt: Date.now(),
        completedAt: null,
    };
    matches.set(id, match);
    attachClient(match, client, "w");
    send(client, "created", { id, color: "w", token: match.tokens.w });
}
function joinMatch(client, data) {
    if (client.matchId)
        return error(client, "already_joined", "This connection already belongs to a game.");
    const id = String(data?.id || "").trim().toUpperCase();
    const match = matches.get(id);
    if (!match || match.game || match.clients.b) {
        return error(client, "not_found", "That code is not accepting a player.");
    }
    attachClient(match, client, "b");
    const white = library_1.PLAYABLE_DRAWBACKS.find((drawback) => drawback.id === match.setup.whiteDrawbackId);
    const black = library_1.PLAYABLE_DRAWBACKS.find((drawback) => drawback.id === match.setup.blackDrawbackId);
    if (!white || !black)
        return error(client, "server_error", "Could not prepare this game.");
    match.game = (0, game_1.newGame)(white, black, match.setup.seed);
    match.runningSince = Date.now();
    for (const color of ["w", "b"]) {
        sendStart(match, color);
    }
}
function reconnectMatch(client, data) {
    if (client.matchId)
        return error(client, "already_joined", "This connection already belongs to a game.");
    const request = (data || {});
    const id = String(request.id || "").trim().toUpperCase();
    const color = request.color === "w" || request.color === "b" ? request.color : null;
    const token = typeof request.token === "string" ? request.token : "";
    const match = matches.get(id);
    if (!match || !color || match.tokens[color] !== token) {
        return error(client, "reconnect_failed", "Could not resume that game.");
    }
    attachClient(match, client, color);
    if (!match.game) {
        return send(client, "created", { id, color, token: match.tokens[color] });
    }
    sendStart(match, color);
}
function playClientMove(client, data) {
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match?.game || !client.color)
        return error(client, "no_game", "Join a game before sending moves.");
    if (finishOnFlag(match))
        return;
    if (match.game.result)
        return error(client, "game_over", "This game is over.");
    if (match.game.board.turn !== client.color)
        return error(client, "not_your_turn", "It is not your turn.");
    const request = (data || {});
    const uci = typeof request.u === "string" ? request.u.toLowerCase() : "";
    if (Number.isInteger(request.ply) && Number(request.ply) !== match.game.board.history.length) {
        return error(client, "stale_ply", "Your board is out of date.");
    }
    const move = (0, game_1.legalMoves)(match.game).find((candidate) => (0, board_1.moveToUCI)(candidate) === uci);
    if (!move)
        return error(client, "illegal_move", "That move is not legal in the current position.");
    const now = Date.now();
    match.clocks = currentClocks(match, now);
    if (match.drawOfferBy && match.drawOfferBy !== client.color) {
        const declinedBy = client.color;
        match.drawOfferBy = null;
        broadcast(match, "drawDeclined", { color: declinedBy });
    }
    const nextGame = (0, game_1.playMove)(match.game, move);
    match.game = nextGame;
    if (match.setup.timeSec)
        match.clocks[client.color] += match.setup.incrementSec * 1000;
    match.runningSince = nextGame.result ? null : now;
    broadcast(match, "move", {
        u: uci,
        ply: nextGame.board.history.length,
        wc: Math.round(match.clocks.w),
        bc: Math.round(match.clocks.b),
    });
    if (nextGame.result)
        finish(match);
}
function resignGame(client) {
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match?.game || !client.color)
        return error(client, "no_game", "Join a game before resigning.");
    if (finishOnFlag(match) || match.game.result)
        return;
    match.clocks = currentClocks(match);
    match.runningSince = null;
    match.game = (0, game_1.resign)(match.game, client.color);
    finish(match);
}
function offerDraw(client) {
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match?.game || !client.color)
        return error(client, "no_game", "Join a game before offering a draw.");
    if (finishOnFlag(match) || match.game.result)
        return;
    if (match.drawOfferBy === client.color)
        return error(client, "draw_pending", "Your draw offer is already pending.");
    if (match.drawOfferBy && match.drawOfferBy !== client.color)
        return acceptDraw(client);
    match.drawOfferBy = client.color;
    broadcast(match, "drawOffer", { color: client.color });
}
function acceptDraw(client) {
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match?.game || !client.color)
        return error(client, "no_game", "Join a game before accepting a draw.");
    if (finishOnFlag(match) || match.game.result)
        return;
    if (!match.drawOfferBy || match.drawOfferBy === client.color) {
        return error(client, "no_draw_offer", "There is no opponent draw offer to accept.");
    }
    match.clocks = currentClocks(match);
    match.runningSince = null;
    match.drawOfferBy = null;
    match.game.result = { winner: "draw", reason: "draw by agreement" };
    finish(match);
}
function declineDraw(client) {
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match?.game || !client.color)
        return error(client, "no_game", "Join a game before declining a draw.");
    if (finishOnFlag(match) || match.game.result)
        return;
    if (!match.drawOfferBy || match.drawOfferBy === client.color) {
        return error(client, "no_draw_offer", "There is no opponent draw offer to decline.");
    }
    match.drawOfferBy = null;
    broadcast(match, "drawDeclined", { color: client.color });
}
function onMessage(client, raw) {
    let frame;
    try {
        frame = JSON.parse(raw.toString());
    }
    catch {
        return error(client, "bad_json", "Messages must be JSON objects.");
    }
    switch (frame.t) {
        case "create":
            return createMatch(client, frame.d);
        case "join":
            return joinMatch(client, frame.d);
        case "reconnect":
            return reconnectMatch(client, frame.d);
        case "move":
            return playClientMove(client, frame.d);
        case "resign":
            return resignGame(client);
        case "drawOffer":
            return offerDraw(client);
        case "drawAccept":
            return acceptDraw(client);
        case "drawDecline":
            return declineDraw(client);
        case "p": {
            const match = client.matchId ? matches.get(client.matchId) : undefined;
            const clocks = match ? currentClocks(match) : null;
            return send(client, "n", clocks ? { wc: Math.round(clocks.w), bc: Math.round(clocks.b) } : undefined);
        }
        default:
            return error(client, "unknown_message", "Unknown message type.");
    }
}
const tlsKey = process.env.TLS_KEY_PATH;
const tlsCert = process.env.TLS_CERT_PATH;
if ((tlsKey && !tlsCert) || (!tlsKey && tlsCert)) {
    throw new Error("Set both TLS_KEY_PATH and TLS_CERT_PATH, or neither.");
}
const server = tlsKey && tlsCert
    ? (0, node_https_1.createServer)({ key: (0, node_fs_1.readFileSync)(tlsKey), cert: (0, node_fs_1.readFileSync)(tlsCert) })
    : (0, node_http_1.createServer)();
const websocket = new ws_1.WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
server.on("request", (request, response) => {
    if (request.url === "/healthz") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, games: matches.size }));
        return;
    }
    response.writeHead(404);
    response.end();
});
server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "/", "http://server").pathname;
    const origin = request.headers.origin;
    if (pathname !== socketPath || (allowedOrigins.size > 0 && (!origin || !allowedOrigins.has(origin)))) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
    }
    websocket.handleUpgrade(request, socket, head, (client) => websocket.emit("connection", client, request));
});
websocket.on("connection", (socket) => {
    const client = socket;
    client.alive = true;
    client.on("pong", () => {
        client.alive = true;
    });
    client.on("message", (raw) => onMessage(client, raw));
    client.on("close", () => {
        const match = client.matchId ? matches.get(client.matchId) : undefined;
        if (!match)
            return;
        if (client.color && match.clients[client.color] === client) {
            delete match.clients[client.color];
            match.disconnectedAt[client.color] = Date.now();
        }
    });
});
const maintenance = setInterval(() => {
    const now = Date.now();
    for (const client of websocket.clients) {
        const active = client;
        if (active.alive === false) {
            active.terminate();
            continue;
        }
        active.alive = false;
        active.ping();
    }
    for (const [id, match] of matches) {
        finishOnFlag(match, now);
        for (const color of ["w", "b"]) {
            const disconnectedAt = match.disconnectedAt[color];
            const opponent = color === "w" ? match.clients.b : match.clients.w;
            if (disconnectedAt && opponent && now - disconnectedAt > disconnectGraceMs) {
                send(opponent, "opponentGone");
                delete match.disconnectedAt[color];
            }
        }
        const expiry = match.completedAt ?? match.createdAt;
        const bothDisconnected = !match.clients.w && !match.clients.b;
        if ((match.completedAt && now - expiry > 60 * 60 * 1000) ||
            (!match.game && now - expiry > 30 * 60 * 1000) ||
            (match.game && bothDisconnected && now - Math.max(match.disconnectedAt.w ?? 0, match.disconnectedAt.b ?? 0) > 30 * 60 * 1000)) {
            matches.delete(id);
        }
    }
}, 5000);
maintenance.unref();
server.listen(port, host, () => {
    const scheme = tlsKey ? "wss" : "ws";
    console.log(`[game-server] listening on ${scheme}://${host}:${port}${socketPath}`);
});
