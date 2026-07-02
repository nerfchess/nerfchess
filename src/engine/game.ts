import { countRepetitions, generateMoves, initialBoard, isInCheck, kingCaptured, makeMove } from "./board";
import { Nerf, NerfState, GameContext, Tier } from "./nerf";
import { RNG } from "./rng";
import { BoardState, Color, FILE, Move, PieceType, RANK } from "./types";

export interface PlayerSlot {
  nerf: Nerf;
  state: NerfState;
  color: Color;
  rng: RNG;
}

export interface GameResult {
  winner: Color | "draw" | null;
  reason: string;
}

export interface NerfGame {
  board: BoardState;
  white: PlayerSlot;
  black: PlayerSlot;
  result: GameResult | null;
  startedAt: number;
  // running counters per color
  captured: Record<Color, { p: number; n: number; b: number; r: number; q: number; k: number }>;
}

function emptyCounts() {
  return { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
}

export function newGame(whiteNerf: Nerf, blackNerf: Nerf, seed: number): NerfGame {
  const rng = new RNG(seed);
  const wRng = rng.fork();
  const bRng = rng.fork();
  const board = initialBoard();
  const white: PlayerSlot = {
    nerf: whiteNerf,
    state: whiteNerf.init ? whiteNerf.init(wRng, "w") : {},
    color: "w",
    rng: wRng,
  };
  const black: PlayerSlot = {
    nerf: blackNerf,
    state: blackNerf.init ? blackNerf.init(bRng, "b") : {},
    color: "b",
    rng: bRng,
  };
  const game: NerfGame = {
    board,
    white,
    black,
    result: null,
    startedAt: Date.now(),
    captured: { w: emptyCounts(), b: emptyCounts() },
  };
  // Run onTurnStart for the first player
  applyTurnStart(game);
  return game;
}

const NOOP_NERF: Nerf = {
  id: "noop",
  name: "Unknown",
  description: "",
  tier: 1,
  implemented: true,
};

export function newGameAsColor(myNerf: Nerf, myColor: Color, mySeed: number): NerfGame {
  const myRng = RNG.fromState(mySeed);
  const opponentRng = new RNG(0);
  const whiteNerf = myColor === "w" ? myNerf : NOOP_NERF;
  const blackNerf = myColor === "b" ? myNerf : NOOP_NERF;
  const whiteRng = myColor === "w" ? myRng : opponentRng;
  const blackRng = myColor === "b" ? myRng : opponentRng;
  const board = initialBoard();
  const white: PlayerSlot = {
    nerf: whiteNerf,
    state: whiteNerf.init ? whiteNerf.init(whiteRng, "w") : {},
    color: "w",
    rng: whiteRng,
  };
  const black: PlayerSlot = {
    nerf: blackNerf,
    state: blackNerf.init ? blackNerf.init(blackRng, "b") : {},
    color: "b",
    rng: blackRng,
  };
  const game: NerfGame = {
    board,
    white,
    black,
    result: null,
    startedAt: Date.now(),
    captured: { w: emptyCounts(), b: emptyCounts() },
  };
  applyTurnStart(game);
  return game;
}

export function makeContext(game: NerfGame, color: Color): GameContext {
  const me = color === "w" ? game.white : game.black;
  const opp = color === "w" ? game.black : game.white;
  // count moves I've made
  const moveNumber = game.board.history.filter((m) => m.color === color).length;
  const myLast = [...game.board.history].reverse().find((m) => m.color === color) ?? null;
  const oppLast = [...game.board.history].reverse().find((m) => m.color !== color) ?? null;
  return {
    board: game.board,
    me: color,
    opponentLastMove: oppLast,
    myLastMove: myLast,
    moveNumber,
    capturedByMe: game.captured[color],
    capturedFromMe: game.captured[color === "w" ? "b" : "w"],
  };
}

export function applyTurnStart(game: NerfGame) {
  const slot = game.board.turn === "w" ? game.white : game.black;
  if (slot.nerf.onTurnStart) {
    const ctx = makeContext(game, slot.color);
    slot.state = slot.nerf.onTurnStart(slot.state, ctx, slot.rng);
  }
}

export function legalMoves(game: NerfGame): Move[] {
  if (game.result) return [];
  const all = generateMoves(game.board);
  const slot = game.board.turn === "w" ? game.white : game.black;
  if (!slot.nerf.filterMoves) return all;
  const ctx = makeContext(game, slot.color);
  return slot.nerf.filterMoves(all, slot.state, ctx);
}

export function checkLossConditions(game: NerfGame): GameResult | null {
  // King capture check first
  const captured = kingCaptured(game.board);
  if (captured) {
    return { winner: captured === "w" ? "b" : "w", reason: "king captured" };
  }
  for (const color of ["w", "b"] as Color[]) {
    const slot = color === "w" ? game.white : game.black;
    if (!slot.nerf.checkLoss) continue;
    const ctx = makeContext(game, color);
    const res = slot.nerf.checkLoss(slot.state, ctx);
    if (res) {
      return { winner: color === "w" ? "b" : "w", reason: `${slot.nerf.name}: ${res.reason}` };
    }
  }
  return null;
}

export function playMove(game: NerfGame, move: Move): NerfGame {
  if (game.result) return game;
  if (move.captured) {
    game.captured[move.color][move.captured] += 1;
  }
  game.board = makeMove(game.board, move);
  // Check loss conditions
  const result = checkLossConditions(game);
  if (result) {
    game.result = result;
    return game;
  }
  // Standard draw rules: fifty moves without a capture or pawn move, and
  // threefold repetition of the same position with the same side to move.
  // These run inside playMove so every consumer (AI games, the multiplayer
  // worker, and client-side replays of server move lists) agrees on when a
  // game is drawn.
  if (game.board.halfmove >= 100) {
    game.result = { winner: "draw", reason: "draw by the fifty-move rule" };
    return game;
  }
  // A repetition needs at least 8 reversible plies, so skip the history
  // replay until then.
  if (game.board.halfmove >= 8 && countRepetitions(game.board) >= 3) {
    game.result = { winner: "draw", reason: "draw by threefold repetition" };
    return game;
  }
  // No moves available = loss for side to move (king will be captured)
  const slot = game.board.turn === "w" ? game.white : game.black;
  // Apply onTurnStart for the new mover BEFORE legal-move evaluation
  applyTurnStart(game);
  const moves = legalMoves(game);
  if (moves.length === 0) {
    game.result = {
      winner: game.board.turn === "w" ? "b" : "w",
      reason: "no legal moves",
    };
  }
  return game;
}

export function currentHint(game: NerfGame, color: Color) {
  const slot = color === "w" ? game.white : game.black;
  if (!slot.nerf.hint) return null;
  if (game.result || game.board.turn !== color) return null;
  const ctx = makeContext(game, color);
  return slot.nerf.hint(slot.state, ctx, legalMoves(game));
}

export function resign(game: NerfGame, color: Color): NerfGame {
  if (game.result) return game;
  game.result = { winner: color === "w" ? "b" : "w", reason: "resignation" };
  return game;
}
