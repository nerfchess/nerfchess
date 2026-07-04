import { countRepetitions, generateMoves, initialBoard, isInCheck, kingCaptured, makeMove } from "./board";
import {
  ActiveEffect,
  aiCanUse,
  Buff,
  BuffApi,
  BuffInstance,
  BuffMatchState,
  BuffPick,
  BuffTarget,
  effectTickColor,
  newBuffMatchState,
} from "./buff";
import { BUFF_BY_ID } from "./buffs/library";
import { DEFAULT_CADENCE, bankOffer, rollOffer } from "./draft";
import { Nerf, NerfState, GameContext, Tier } from "./nerf";
import { RNG } from "./rng";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ } from "./types";

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
  /** Present only in draft-mode games: buffs, drafts, and board effects. */
  buffs?: BuffMatchState;
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

// What a player's nerf becomes when a Nerf Breaker style buff removes it.
const FREED_NERF: Nerf = {
  id: "nerf_removed",
  name: "Unshackled",
  description: "This nerf was removed by a buff. No handicap remains.",
  tier: 1,
  implemented: true,
};

/** Turn an ordinary game into a draft-mode game (nerf draft + buff drafts). */
export function enableDraftMode(game: NerfGame, seed: number, cadence = DEFAULT_CADENCE) {
  game.buffs = newBuffMatchState(seed, cadence);
}

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

// ---------------------------------------------------------------------------
// Buff system (draft mode)
// ---------------------------------------------------------------------------

function effectActive(e: ActiveEffect): boolean {
  return e.turns == null || e.turns > 0;
}

/** True while a nerf is suspended (Grace Period) or removed (Nerf Breaker). */
export function nerfDisabled(game: NerfGame, color: Color): boolean {
  const bs = game.buffs;
  if (!bs) return false;
  if (bs.players[color].nerfRemoved) return true;
  return bs.effects.some(
    (e) => e.kind === "nerf_suspended" && e.owner === color && effectActive(e),
  );
}

export function makeBuffApi(game: NerfGame, me: Color): BuffApi {
  const bs = game.buffs!;
  const opp: Color = me === "w" ? "b" : "w";
  const slot = me === "w" ? game.white : game.black;
  return {
    board: game.board,
    me,
    opp,
    bs,
    mine: bs.players[me],
    theirs: bs.players[opp],
    rng: slot.rng,
    capturedFromMe: game.captured[opp],
    place: (sq, type, color) => {
      game.board.pieces[sq] = { type, color };
    },
    removePiece: (sq) => {
      game.board.pieces[sq] = null;
    },
    relocate: (from, to) => {
      const p = game.board.pieces[from];
      game.board.pieces[from] = null;
      game.board.pieces[to] = p;
    },
    setPieceType: (sq, type) => {
      const p = game.board.pieces[sq];
      if (p) game.board.pieces[sq] = { ...p, type };
    },
    setPieceColor: (sq, color) => {
      const p = game.board.pieces[sq];
      if (p) game.board.pieces[sq] = { ...p, color };
    },
    restoreCastling: () => {
      const homeR = me === "w" ? 0 : 7;
      const king = game.board.pieces[SQ(4, homeR)];
      if (!king || king.type !== "k" || king.color !== me) return;
      const kingside = game.board.pieces[SQ(7, homeR)];
      const queenside = game.board.pieces[SQ(0, homeR)];
      if (kingside?.type === "r" && kingside.color === me) {
        if (me === "w") game.board.castling.wk = true;
        else game.board.castling.bk = true;
      }
      if (queenside?.type === "r" && queenside.color === me) {
        if (me === "w") game.board.castling.wq = true;
        else game.board.castling.bq = true;
      }
    },
    removeMyNerf: () => {
      slot.nerf = FREED_NERF;
      slot.state = {};
      bs.players[me].nerfRemoved = true;
    },
  };
}

function heldBuffs(game: NerfGame, color: Color): { inst: BuffInstance; def: Buff }[] {
  const bs = game.buffs;
  if (!bs) return [];
  return bs.players[color].buffs
    .filter((b) => !b.spent && !b.nullified)
    .map((inst) => ({ inst, def: BUFF_BY_ID[inst.id] }))
    .filter((x): x is { inst: BuffInstance; def: Buff } => !!x.def);
}

export function legalMoves(game: NerfGame): Move[] {
  if (game.result) return [];
  let all = generateMoves(game.board);
  const me = game.board.turn;
  const opp: Color = me === "w" ? "b" : "w";
  const slot = me === "w" ? game.white : game.black;
  const bs = game.buffs;

  if (bs) {
    // Frozen pieces cannot move.
    const frozen = new Set(
      bs.effects
        .filter((e) => e.kind === "freeze" && e.owner === me && effectActive(e))
        .map((e) => (e.kind === "freeze" ? e.sq : -1)),
    );
    if (frozen.size) all = all.filter((m) => !frozen.has(m.from));

    // My buffs may add moves. Nerf constraints are applied afterwards, so a
    // handicap still governs buff-granted movement.
    const api = makeBuffApi(game, me);
    for (const { inst, def } of heldBuffs(game, me)) {
      def.augmentMoves?.(all, inst, api);
    }
  }

  if (slot.nerf.filterMoves && !nerfDisabled(game, me)) {
    const ctx = makeContext(game, slot.color);
    all = slot.nerf.filterMoves(all, slot.state, ctx);
  }

  if (bs) {
    // Opponent protections and zone effects restrict my options.
    for (const e of bs.effects) {
      if (!effectActive(e)) continue;
      switch (e.kind) {
        case "shield":
          if (e.owner === opp) {
            all = all.filter((m) => {
              const cap = m.capturedSquare ?? (m.captured ? m.to : null);
              if (cap == null) return true;
              return e.squares ? !e.squares.includes(cap) : false;
            });
          }
          break;
        case "barred":
          if (e.against === me) all = all.filter((m) => !e.squares.includes(m.to));
          break;
        case "king_safe":
          if (e.owner === opp) all = all.filter((m) => m.captured !== "k");
          break;
        case "no_pawn_advance":
          if (e.against === me) {
            all = all.filter((m) => !(m.piece === "p" && FILE(m.from) === FILE(m.to)));
          }
          break;
        case "king_only":
          if (e.against === me) all = all.filter((m) => m.piece === "k");
          break;
      }
    }
    const oppApi = makeBuffApi(game, opp);
    for (const { inst, def } of heldBuffs(game, opp)) {
      if (def.filterOpponentMoves) all = def.filterOpponentMoves(all, inst, oppApi);
    }
  }
  return all;
}

export function checkLossConditions(game: NerfGame): GameResult | null {
  // King capture check first
  const captured = kingCaptured(game.board);
  if (captured) {
    return { winner: captured === "w" ? "b" : "w", reason: "king captured" };
  }
  for (const color of ["w", "b"] as Color[]) {
    const slot = color === "w" ? game.white : game.black;
    if (!slot.nerf.checkLoss || nerfDisabled(game, color)) continue;
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
  const bs = game.buffs;
  if (bs) {
    // Buff bookkeeping: piece tracking, charge consumption, timed passives.
    for (const color of ["w", "b"] as Color[]) {
      const api = makeBuffApi(game, color);
      for (const { inst, def } of heldBuffs(game, color)) {
        def.onMovePlayed?.(inst, move, api);
      }
    }
    // Shielded squares follow the shielded piece when its owner moves it.
    for (const e of bs.effects) {
      if (e.kind === "shield" && e.squares && move.color === e.owner) {
        const idx = e.squares.indexOf(move.from);
        if (idx >= 0) e.squares[idx] = move.to;
      }
    }
    // Tick down effects whose timer runs on the mover's turns.
    for (const e of bs.effects) {
      if (e.turns != null && effectTickColor(e) === move.color) e.turns -= 1;
    }
    bs.effects = bs.effects.filter((e) => e.turns == null || e.turns > 0);
  }
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
  if (bs) {
    // Turn manipulation: extra moves keep the turn with the mover; skips hand
    // it straight back. En passant is cleared on any irregular turn flow.
    if (bs.extraMoves[move.color] > 0) {
      bs.extraMoves[move.color] -= 1;
      game.board.turn = move.color;
      game.board.epTarget = null;
    } else if (bs.skips[game.board.turn] > 0) {
      bs.skips[game.board.turn] -= 1;
      game.board.turn = move.color;
      game.board.epTarget = null;
    }
    // Buff draft cadence: the mover's own move count reaching the threshold
    // rolls a fresh offer (unless a draft-block effect eats it).
    const ps = bs.players[move.color];
    const ownMoves = game.board.history.filter((m) => m.color === move.color).length;
    if (!ps.offer && ownMoves >= ps.nextDraftAt) {
      ps.nextDraftAt += bs.cadence;
      if ((ps.flags.blockedDrafts ?? 0) > 0) {
        ps.flags.blockedDrafts = (ps.flags.blockedDrafts ?? 0) - 1;
      } else {
        rollOffer(bs, move.color);
      }
    }
  }
  // No moves available = loss for side to move (king will be captured)
  const slot = game.board.turn === "w" ? game.white : game.black;
  // Apply onTurnStart for the new mover BEFORE legal-move evaluation
  applyTurnStart(game);
  const moves = legalMoves(game);
  if (moves.length === 0) {
    // In draft mode a player can be locked down purely by buff effects
    // (mass freeze, World End...). That is a forced pass, not a loss: their
    // effect timers tick as if they had moved and the turn goes back.
    if (bs && generateMoves(game.board).length > 0) {
      const stuck = game.board.turn;
      for (const e of bs.effects) {
        if (e.turns != null && effectTickColor(e) === stuck) e.turns -= 1;
      }
      bs.effects = bs.effects.filter((e) => e.turns == null || e.turns > 0);
      game.board.turn = stuck === "w" ? "b" : "w";
      game.board.epTarget = null;
      applyTurnStart(game);
      if (legalMoves(game).length === 0) {
        game.result = { winner: "draw", reason: "mutual paralysis" };
      }
      return game;
    }
    game.result = {
      winner: game.board.turn === "w" ? "b" : "w",
      reason: "no legal moves",
    };
  }
  return game;
}

export function currentHint(game: NerfGame, color: Color) {
  const slot = color === "w" ? game.white : game.black;
  if (!slot.nerf.hint || nerfDisabled(game, color)) return null;
  if (game.result || game.board.turn !== color) return null;
  const ctx = makeContext(game, color);
  return slot.nerf.hint(slot.state, ctx, legalMoves(game));
}

// ---------------------------------------------------------------------------
// Draft resolution and buff activation (draft mode only)
// ---------------------------------------------------------------------------

/** Add a buff to a player (drafted, stolen at creation, or debug-granted). */
export function acquireBuff(game: NerfGame, color: Color, id: string, tier: Tier) {
  const bs = game.buffs;
  const def = BUFF_BY_ID[id];
  if (!bs || !def?.implemented) return;
  const ps = bs.players[color];
  const inst: BuffInstance = { id, tier, state: {} };
  if ((ps.flags.nullifyIncoming ?? 0) > 0) {
    ps.flags.nullifyIncoming = (ps.flags.nullifyIncoming ?? 0) - 1;
    inst.nullified = true;
    ps.buffs.push(inst);
    return;
  }
  const api = makeBuffApi(game, color);
  def.init?.(inst, api);
  ps.buffs.push(inst);
  if (def.kind === "instant") {
    def.effect?.(inst, api, []);
    inst.spent = true;
    settleAfterBuff(game);
  }
}

/** Resolve the pending offer by taking the card at `cardIndex`. */
export function pickDraftCard(game: NerfGame, color: Color, cardIndex: number) {
  const bs = game.buffs;
  if (!bs) return;
  const ps = bs.players[color];
  const offer = ps.offer;
  if (!offer || !offer.cards[cardIndex]) return;
  const takeAll = (ps.flags.takeBoth ?? 0) > 0;
  if (takeAll) ps.flags.takeBoth = (ps.flags.takeBoth ?? 0) - 1;
  ps.offer = null;
  const indexes = takeAll ? offer.cards.map((_, i) => i) : [cardIndex];
  for (const i of indexes) {
    acquireBuff(game, color, offer.cards[i].id, offer.cards[i].tier);
  }
}

/** Skip the pending offer and bank +1 tier for the next draft. */
export function bankDraft(game: NerfGame, color: Color) {
  const bs = game.buffs;
  if (!bs) return;
  bankOffer(bs.players[color]);
}

/** Next target request for an activated buff, or null when picks are complete. */
export function buffNextTarget(
  game: NerfGame,
  color: Color,
  buffIndex: number,
  picks: BuffPick[],
): BuffTarget | null {
  const bs = game.buffs;
  if (!bs) return null;
  const inst = bs.players[color].buffs[buffIndex];
  const def = inst && BUFF_BY_ID[inst.id];
  if (!inst || !def?.targets || inst.spent || inst.nullified) return null;
  return def.targets(inst, makeBuffApi(game, color), picks);
}

/** Use an activated buff with the collected picks. Returns success. */
export function activateBuff(
  game: NerfGame,
  color: Color,
  buffIndex: number,
  picks: BuffPick[],
): boolean {
  const bs = game.buffs;
  if (!bs || game.result) return false;
  const inst = bs.players[color].buffs[buffIndex];
  const def = inst && BUFF_BY_ID[inst.id];
  if (!inst || !def || def.kind !== "activated" || inst.spent || inst.nullified) return false;
  def.effect?.(inst, makeBuffApi(game, color), picks);
  if (def.spendOnUse !== false) inst.spent = true;
  settleAfterBuff(game);
  return true;
}

/** After a buff mutates the board, re-run loss checks (a removal or freeze can
 * decide the game on the spot). */
function settleAfterBuff(game: NerfGame) {
  if (game.result) return;
  const result = checkLossConditions(game);
  if (result) game.result = result;
}

/** Auto-resolve a pending offer for a bot: prefer the highest-tier card it can
 * actually use without a targeting UI, otherwise just take the higher tier. */
export function aiResolveDraft(game: NerfGame, color: Color) {
  const bs = game.buffs;
  if (!bs) return;
  const offer = bs.players[color].offer;
  if (!offer) return;
  let best = 0;
  let bestScore = -1;
  offer.cards.forEach((card, i) => {
    const def = BUFF_BY_ID[card.id];
    const score = (def && aiCanUse(def) ? 100 : 0) + card.tier;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  pickDraftCard(game, color, best);
}

export function resign(game: NerfGame, color: Color): NerfGame {
  if (game.result) return game;
  game.result = { winner: color === "w" ? "b" : "w", reason: "resignation" };
  return game;
}
