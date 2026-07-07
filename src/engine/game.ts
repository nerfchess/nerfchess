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
  DraftMode,
  effectTickColor,
  newBuffMatchState,
} from "./buff";
import { pawnRankOk } from "./buffs/helpers";
import { BUFF_BY_ID } from "./buffs/library";
import { DEFAULT_CADENCE, NERF_MODE_CADENCE, bankOffer, rollOffer, rollSharedTiers } from "./draft";
import { Nerf, NerfState, GameContext, Tier } from "./nerf";
import { RNG } from "./rng";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square } from "./types";

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

// Buff mode games have no handicaps at all: both players run this nerf.
export const UNRESTRICTED_NERF: Nerf = {
  id: "none",
  name: "No nerf",
  description: "Buff mode: no handicap. Win with the buffs you draft.",
  tier: 1,
  implemented: true,
};

/** Turn an ordinary game into a draft-mode game. The mode picks the section
 * ruleset: "nerf" (opening nerf pick, nerf-modifier buffs on a slow cadence),
 * "buff" (no nerfs, nerf-modifier buffs excluded), or absent for the legacy
 * merged rules so saved games keep replaying unchanged. */
export function enableDraftMode(
  game: NerfGame,
  seed: number,
  opts?: { mode?: DraftMode; cadence?: number; stackFor?: Color; stackBoost?: number },
) {
  const cadence = opts?.cadence ?? (opts?.mode === "nerf" ? NERF_MODE_CADENCE : DEFAULT_CADENCE);
  game.buffs = newBuffMatchState(seed, cadence, opts?.mode);
  // "Stacked draft" preset: give one seat a persistent tier lift on every
  // offer. Seeded here (not per-offer) so the boost is part of the match's
  // deterministic setup and replays identically. Must be re-applied on every
  // rebuild that recreates game.buffs, exactly like cadence/mode.
  if (opts?.stackFor && opts.stackBoost && opts.stackBoost > 0) {
    game.buffs.players[opts.stackFor].flags.stackBoost = opts.stackBoost;
  }
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

/** Freeze and walnut bind to the piece standing on their square. Once that
 * piece is gone (captured, or removed/relocated by another buff) the effect
 * must go with it: a walnut or freeze marker can never linger on an empty
 * square or transfer onto a capturing enemy piece. Called after every move and
 * after every buff-driven board mutation. */
function pruneOrphanedSquareEffects(game: NerfGame) {
  const bs = game.buffs;
  if (!bs) return;
  bs.effects = bs.effects.filter((e) => {
    // A trade-off timer whose piece was captured (or otherwise vanished)
    // before it expired has nothing left to reclaim: drop it like a freeze.
    if (e.kind !== "freeze" && e.kind !== "walnut" && e.kind !== "timed_loss") return true;
    const p = game.board.pieces[e.sq];
    return !!p && p.color === e.owner;
  });
}

/** Fire trade-off timers (timed_loss) that have counted down to zero: the owner
 * pays the delayed price on their tracked piece before the expired effect is
 * filtered out. The piece is either removed or reverted to another type (a
 * temporary grant taken back). Never touches a king, and the loss is uncounted:
 * the piece is reclaimed by its own owner's bargain, not captured by the
 * opponent, so revive pools and material counters stay truthful. */
function fireExpiredTradeOffs(game: NerfGame) {
  const bs = game.buffs;
  if (!bs) return;
  for (const e of bs.effects) {
    if (e.kind !== "timed_loss" || e.turns == null || e.turns > 0) continue;
    const p = game.board.pieces[e.sq];
    if (!p || p.color !== e.owner || p.type === "k") continue;
    bs.historyDiverged = true;
    bs.mutations = (bs.mutations ?? 0) + 1;
    if (e.then === "demote" && e.into && e.into !== "k") {
      game.board.pieces[e.sq] = { ...p, type: e.into };
    } else {
      game.board.pieces[e.sq] = null;
    }
  }
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
  // Every direct board mutation bumps the transient counter so apply paths
  // (playMove's hook loop, the game server's pick handling) can tell whether
  // a hook or init observably changed the board. Only counted when the board
  // actually changes, so a refused relocation or a no-op removal never
  // reveals a card that did nothing visible.
  const mutated = () => {
    bs.mutations = (bs.mutations ?? 0) + 1;
  };
  return {
    board: game.board,
    me,
    opp,
    bs,
    mine: bs.players[me],
    theirs: bs.players[opp],
    rng: slot.rng,
    capturedFromMe: game.captured[opp],
    capturedByMe: game.captured[me],
    place: (sq, type, color) => {
      bs.historyDiverged = true;
      mutated();
      game.board.pieces[sq] = { type, color };
    },
    removePiece: (sq, opts) => {
      const p = game.board.pieces[sq];
      if (!p) return;
      bs.historyDiverged = true;
      mutated();
      game.board.pieces[sq] = null;
      // A piece destroyed by a buff is a real loss: count it as captured by
      // the other side so material counters and the owner's revivable pool
      // (Resurrect and friends) stay truthful. Kings are never removed by
      // buffs; the guard is a backstop. Whole-board rewrites (Perfect
      // Rewind, Genesis) and effect-expiry removals of summoned pieces pass
      // `uncounted` instead: those pieces were never lost to the opponent,
      // so counting them would corrupt the revive pools and any
      // capturedFromMe-based nerf conditions.
      if (p && p.type !== "k" && !opts?.uncounted) {
        game.captured[p.color === "w" ? "b" : "w"][p.type] += 1;
      }
    },
    relocate: (from, to) => {
      const p = game.board.pieces[from];
      // Nothing to relocate: bail before the write below could null out a
      // piece already standing on `to`.
      if (!p) return;
      // Anchor: an enemy piece bound by its owner's Anchor buff cannot be
      // pushed or swapped by my buffs (its own moves are unaffected).
      if (
        p &&
        p.color !== me &&
        bs.players[p.color].buffs.some(
          (b) => b.id === "anchor" && !b.spent && !b.nullified && b.state.sq === from,
        )
      ) {
        return;
      }
      // Pawns can never stand on rank 1 or rank 8: refuse the relocation
      // outright, whatever card asked for it (cards filter their destination
      // zones too; this is the backstop).
      if (p?.type === "p" && !pawnRankOk(to)) {
        return;
      }
      bs.historyDiverged = true;
      mutated();
      game.board.pieces[from] = null;
      game.board.pieces[to] = p;
    },
    setPieceType: (sq, type) => {
      bs.historyDiverged = true;
      const p = game.board.pieces[sq];
      if (p) {
        mutated();
        game.board.pieces[sq] = { ...p, type };
      }
    },
    setPieceColor: (sq, color) => {
      bs.historyDiverged = true;
      const p = game.board.pieces[sq];
      if (p) {
        mutated();
        game.board.pieces[sq] = { ...p, color };
      }
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
    adjustClock: (req) => {
      (bs.clockFx ??= []).push({ caster: me, ...req });
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

/** A barred effect whose squares form exactly one complete file or rank is a
 * board-splitting WALL, not just a no-landing zone (Fault Line, Great Wall,
 * Great Divide, Sundering, and the whole-file / whole-rank hexes all build one
 * such line per pick). Blocking only the landing square lets a piece jump the
 * wall: a knight leaps clean over the barred squares, and a slider glides
 * through the empty ones. Detecting this shape lets legalMoves also reject any
 * move that CROSSES the line. Returns the wall's axis and line index, or null
 * for partial barred zones (Bunker, the Kraken 3x3 seal, a multi-rank scorched
 * band) which only block landing. A thick band (two or more adjacent ranks or
 * files) needs no crossing rule: a knight cannot leap a two-wide barrier, so
 * its landing square always falls inside the band and the landing filter alone
 * stops it. */
function wallLine(squares: Square[]): { axis: "file" | "rank"; line: number } | null {
  if (squares.length !== 8) return null;
  const f0 = FILE(squares[0]);
  if (squares.every((s) => FILE(s) === f0) && new Set(squares.map((s) => RANK(s))).size === 8) {
    return { axis: "file", line: f0 };
  }
  const r0 = RANK(squares[0]);
  if (squares.every((s) => RANK(s) === r0) && new Set(squares.map((s) => FILE(s))).size === 8) {
    return { axis: "rank", line: r0 };
  }
  return null;
}

export function legalMoves(game: NerfGame): Move[] {
  if (game.result) return [];
  let all = generateMoves(game.board);
  const me = game.board.turn;
  const opp: Color = me === "w" ? "b" : "w";
  const slot = me === "w" ? game.white : game.black;
  const bs = game.buffs;
  let frozenOwnCount = 0;

  if (bs) {
    // Frozen pieces cannot move. Walnuts (hexed pieces) are freezes with a
    // different board marker, so they share the lockdown path.
    const frozen = new Set(
      bs.effects
        .filter(
          (e) => (e.kind === "freeze" || e.kind === "walnut") && e.owner === me && effectActive(e),
        )
        .map((e) => (e.kind === "freeze" || e.kind === "walnut" ? e.sq : -1)),
    );
    frozenOwnCount = frozen.size;
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
    const beforeNerf = all;
    const filtered = slot.nerf.filterMoves(all, slot.state, ctx);
    // Safety net: a move-restriction nerf must never zero out the mover's
    // options. That is a self-stalemate / soft-lock, not an intended loss
    // (loss conditions run separately via checkLoss). The rule harness only
    // probes each nerf from the opening, so nerfs that empty the list in a
    // mid or endgame position (statue_king, no_mans_land, scorched_earth,
    // the no-backward family, etc.) slipped through. If a nerf empties the
    // list while legal moves existed, relax it for this one turn. Every such
    // nerf still shapes play on every turn where at least one legal move
    // survives its filter, which is nearly all of them.
    all = filtered.length > 0 ? filtered : beforeNerf;
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
              // A shield never protects the king itself. King invulnerability
              // is exclusively king_safe / Immortal King (documented, and it
              // carries a drawback). Without this, a permanent square shield
              // parked on the king (Sanctuary) or a whole-army shield would
              // make the king uncapturable forever and the game unwinnable.
              if (game.board.pieces[cap]?.type === "k") return true;
              return e.squares ? !e.squares.includes(cap) : false;
            });
          }
          break;
        case "barred": {
          // A wall never seals the king away from capture. Winning is king
          // capture (there is no checkmate), so a permanent barred file or rank
          // sitting over the enemy king would otherwise soft-lock the game as
          // unwinnable (the Sundering / Great Divide / Fissure trap). A move
          // that captures the king ignores the wall; every other move into a
          // barred square is still blocked.
          if (e.against === me) {
            all = all.filter((m) => m.captured === "k" || !e.squares.includes(m.to));
            // Board-split walls (a full barred file or rank) must also block any
            // move that CROSSES the line, not merely one that lands on it: a
            // knight leaps over the barred squares and a slider glides through
            // the empty ones, so the landing filter above lets both jump the
            // wall. Reject moves whose from/to sit on opposite sides of the
            // line. King captures stay exempt (same unwinnability guard as
            // above). Non-soft-lock: never strand the mover. If blocking
            // crossings would empty the list (every remaining piece is across
            // the wall from where it must go), relax this wall for the turn so
            // the mover keeps its moves on its own side.
            const wall = wallLine(e.squares);
            if (wall) {
              const side = (sq: Square) =>
                (wall.axis === "file" ? FILE(sq) : RANK(sq)) - wall.line;
              const kept = all.filter(
                (m) => m.captured === "k" || side(m.from) * side(m.to) >= 0,
              );
              if (kept.length > 0) all = kept;
            }
          }
          break;
        }
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
        case "short_leash":
          // Berserker's hangover: the owner may only step one square (king
          // distance) with any piece. King captures stay exempt so the game
          // is always winnable, and if the leash would strand the mover with
          // no move it is relaxed for the turn rather than soft-locking.
          if (e.owner === me) {
            const kept = all.filter(
              (m) =>
                m.captured === "k" ||
                Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1,
            );
            if (kept.length > 0) all = kept;
          }
          break;
      }
    }
    const oppApi = makeBuffApi(game, opp);
    for (const { inst, def } of heldBuffs(game, opp)) {
      if (def.filterOpponentMoves) all = def.filterOpponentMoves(all, inst, oppApi);
    }
    // Chained-move king guard: while a player is bursting through extra
    // moves or opponent skips, capturing the king is off the table until the
    // opponent has played one reply move. The final chained move may still
    // give check or create threats; it just cannot end the game on the spot.
    if (bs.chainKingGuard === me || bs.extraMoves[me] > 0 || bs.skips[opp] > 0) {
      all = all.filter((m) => m.captured !== "k");
    }
    // Panic step: while mass freeze (3 or more of my pieces frozen) is
    // active, my king keeps its plain one-square quiet steps regardless of
    // zone effects, so a freeze plus extra-move stack can never leave a side
    // with no meaningful reply.
    if (frozenOwnCount >= 3) {
      for (const m of generateMoves(game.board)) {
        if (m.piece !== "k" || m.captured) continue;
        if (Math.abs(FILE(m.to) - FILE(m.from)) > 1 || Math.abs(RANK(m.to) - RANK(m.from)) > 1) {
          continue;
        }
        if (!all.some((x) => x.from === m.from && x.to === m.to)) all.push(m);
      }
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
  const nextBoard = makeMove(game.board, move);
  // makeMove refused the move (empty origin square or the self-capture
  // backstop): treat the whole ply as a no-op. Counting the capture or
  // ticking effect timers against a board that did not change would desync
  // the capture pools (revives) and effect clocks from the board itself.
  if (nextBoard === game.board) return game;
  if (move.captured) {
    game.captured[move.color][move.captured] += 1;
  }
  game.board = nextBoard;
  const bs = game.buffs;
  if (bs) {
    // A reply move from the other side lifts the chained-move king guard.
    if (bs.chainKingGuard && bs.chainKingGuard !== move.color) bs.chainKingGuard = undefined;
    // Buff bookkeeping: piece tracking, charge consumption, timed passives.
    // Record which hooks observably fired (a board mutation or a new board
    // effect): the game server reveals those cards to the table, because a
    // replica that does not know a card's identity cannot replay its hook,
    // and a skipped board mutation is a permanent desync. State-only changes
    // (charge counters) stay private; dtState frames resync those.
    const fired: { color: Color; index: number }[] = [];
    for (const color of ["w", "b"] as Color[]) {
      const api = makeBuffApi(game, color);
      for (const { inst, def } of heldBuffs(game, color)) {
        if (!def.onMovePlayed) continue;
        const effectsBefore = bs.effects.length;
        const mutationsBefore = bs.mutations ?? 0;
        def.onMovePlayed(inst, move, api);
        if (bs.effects.length !== effectsBefore || (bs.mutations ?? 0) !== mutationsBefore) {
          fired.push({ color, index: bs.players[color].buffs.indexOf(inst) });
        }
      }
    }
    bs.lastHookMutations = fired.length > 0 ? fired : undefined;
    // Shielded squares follow the shielded piece when its owner moves it.
    for (const e of bs.effects) {
      if (e.kind === "shield" && e.squares && move.color === e.owner) {
        const idx = e.squares.indexOf(move.from);
        if (idx >= 0) e.squares[idx] = move.to;
      }
      // A trade-off timer tracks its piece the same way, so the delayed loss
      // still lands on the right square after the piece moves.
      if (e.kind === "timed_loss" && e.owner === move.color && e.sq === move.from) {
        e.sq = move.to;
      }
    }
    // Tick down effects whose timer runs on the mover's turns.
    for (const e of bs.effects) {
      if (e.turns != null && effectTickColor(e) === move.color) e.turns -= 1;
    }
    // Pay any trade-off timer that just reached zero before it is filtered out.
    fireExpiredTradeOffs(game);
    bs.effects = bs.effects.filter((e) => e.turns == null || e.turns > 0);
    // A captured or buff-removed piece leaves its freeze/walnut behind; drop
    // those orphaned markers so they never haunt an empty or enemy-held square.
    pruneOrphanedSquareEffects(game);
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
  // replay until then. Once a buff has mutated the board directly the replay
  // no longer reproduces the position (it would crash on moves whose pieces
  // were summoned or removed outside history), so repetition detection is
  // suspended for the rest of the game.
  if (game.board.halfmove >= 8 && !bs?.historyDiverged && countRepetitions(game.board) >= 3) {
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
      bs.chainKingGuard = move.color;
    } else if (bs.skips[game.board.turn] > 0) {
      bs.skips[game.board.turn] -= 1;
      game.board.turn = move.color;
      game.board.epTarget = null;
      bs.chainKingGuard = move.color;
    }
    // Buff draft cadence: both players draft at the same time. The shared
    // trigger runs on total plies (a full round is two plies), so neither
    // side ever runs a draft ahead of the other. White rolls first for a
    // stable RNG stream; draft-block effects eat offers individually.
    if (bs.nextDraftAtPly == null) {
      // Saved games from the per-player cadence era resume on the earlier
      // of the two old thresholds.
      bs.nextDraftAtPly = Math.min(bs.players.w.nextDraftAt, bs.players.b.nextDraftAt) * 2;
    }
    if (game.board.history.length >= bs.nextDraftAtPly) {
      bs.nextDraftAtPly += bs.cadence * 2;
      // One shared tier roll per round: both offers use the same pair.
      const tiers = rollSharedTiers(bs);
      for (const color of ["w", "b"] as Color[]) {
        const ps = bs.players[color];
        ps.nextDraftAt += bs.cadence;
        if (ps.offer) continue;
        if ((ps.flags.blockedDrafts ?? 0) > 0) {
          ps.flags.blockedDrafts = (ps.flags.blockedDrafts ?? 0) - 1;
        } else {
          rollOffer(bs, color, tiers);
        }
      }
    }
  }
  // Apply onTurnStart for the new mover BEFORE legal-move evaluation
  applyTurnStart(game);
  resolveNoMoves(game);
  return game;
}

/** The no-move rule, run whenever the side to move may have changed or lost
 * options: no moves available = loss for the side to move (their king will be
 * captured). In draft mode a player can be locked down purely by buff effects
 * (Mass Freeze, World End...). That is a forced pass, not a loss: their
 * effect timers tick as if they had moved and the turn goes back. If the
 * opponent is locked down too, the game is a draw. */
function resolveNoMoves(game: NerfGame) {
  if (game.result) return;
  if (legalMoves(game).length > 0) return;
  const bs = game.buffs;
  if (bs && generateMoves(game.board).length > 0) {
    const stuck = game.board.turn;
    for (const e of bs.effects) {
      if (e.turns != null && effectTickColor(e) === stuck) e.turns -= 1;
    }
    fireExpiredTradeOffs(game);
    bs.effects = bs.effects.filter((e) => e.turns == null || e.turns > 0);
    pruneOrphanedSquareEffects(game);
    game.board.turn = stuck === "w" ? "b" : "w";
    game.board.epTarget = null;
    applyTurnStart(game);
    if (legalMoves(game).length === 0) {
      game.result = { winner: "draw", reason: "mutual paralysis" };
    }
    return;
  }
  game.result = {
    winner: game.board.turn === "w" ? "b" : "w",
    reason: "no legal moves",
  };
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
  const target = def.targets(inst, makeBuffApi(game, color), picks);
  // Graceful termination for count-based cards ("teleport N", "N pieces become
  // amazons", "remove N enemy pawns"...). Once at least one target is picked, a
  // step that offers no remaining candidates means the board has fewer eligible
  // targets than the card's nominal count. Rather than stranding the player on a
  // step they can neither satisfy nor skip, end collection here so the effect
  // resolves with the picks gathered so far (every such effect iterates over its
  // picks, so it simply applies to as many as were available). Steps already
  // marked finishable, and the very first step (picks.length === 0, a genuinely
  // unusable card), keep their existing behavior.
  if (target && picks.length > 0) {
    if (target.kind === "square" && target.squares.length === 0 && !target.finishable) return null;
    if (target.kind === "enemy-buff" && target.options.length === 0) return null;
  }
  return target;
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
  const effectsBefore = bs.effects.length;
  def.effect?.(inst, makeBuffApi(game, color), picks);
  // A turn-consuming activation costs the activator this turn, so protective
  // timers it just created must not also burn a tick on the opponent's
  // immediate reply: "for N turns" means N turns AFTER the activation turn.
  // Only self-protection effects (shield / king-safe) suffer this overlap;
  // effects constraining the opponent (freeze, barred...) already deliver
  // their full N turns starting from the reply.
  if (!def.freeAction) {
    for (const e of bs.effects.slice(effectsBefore)) {
      if ((e.kind === "shield" || e.kind === "king_safe") && e.turns != null) e.turns += 1;
    }
  }
  if (def.spendOnUse !== false) inst.spent = true;
  // Any activated use can reshape the board, so the activator cannot capture
  // the king until the opponent has replied (same guard as chained moves).
  bs.chainKingGuard = color;
  settleAfterBuff(game);
  // Using a buff consumes the turn unless the card is a free action (the
  // extra-move family, which already acts within the activator's turn).
  if (!game.result && !def.freeAction && game.board.turn === color) {
    passTurnAfterBuff(game, color);
  }
  return true;
}

/** A buff use that costs the turn runs the same handover bookkeeping
 * playMove does after a regular move: tick the activator's effect timers,
 * hand the move over (extra moves and pending skips still absorb it), start
 * the new mover's turn, and apply the forced-pass / no-move rules. */
function passTurnAfterBuff(game: NerfGame, color: Color) {
  const bs = game.buffs!;
  for (const e of bs.effects) {
    if (e.turns != null && effectTickColor(e) === color) e.turns -= 1;
  }
  fireExpiredTradeOffs(game);
  bs.effects = bs.effects.filter((e) => e.turns == null || e.turns > 0);
  pruneOrphanedSquareEffects(game);
  const opp: Color = color === "w" ? "b" : "w";
  if (bs.extraMoves[color] > 0) {
    bs.extraMoves[color] -= 1;
  } else if (bs.skips[opp] > 0) {
    bs.skips[opp] -= 1;
  } else {
    game.board.turn = opp;
  }
  game.board.epTarget = null;
  applyTurnStart(game);
  resolveNoMoves(game);
}

/** After a buff mutates the board, re-run loss checks (a removal or freeze can
 * decide the game on the spot). */
function settleAfterBuff(game: NerfGame) {
  if (game.result) return;
  // A buff that removed or relocated a walnutted/frozen piece must drop its
  // now-orphaned marker before anything else reads the effect list.
  pruneOrphanedSquareEffects(game);
  const result = checkLossConditions(game);
  if (result) {
    game.result = result;
    return;
  }
  // An instant buff resolved from a draft pick (Mass Freeze, World End...)
  // can lock the current mover down outside any move handover. Run the same
  // no-move rule as playMove so the game force-passes or ends instead of
  // soft-locking with a stuck player.
  resolveNoMoves(game);
}

/** Auto-resolve a pending offer for a bot: prefer the highest-tier card it can
 * actually use, otherwise just take the higher tier. Passives and instants
 * resolve themselves; activated cards score slightly lower because the bot's
 * auto-targeting is cruder than a human's. Reveal cards score zero because
 * the bot cannot act on the information, and when every option is unusable
 * or purely informational the bot banks the draft instead. */
export function aiResolveDraft(game: NerfGame, color: Color) {
  const choice = aiDraftChoice(game, color);
  if (!choice) return;
  if (choice.action === "bank") bankDraft(game, color);
  else pickDraftCard(game, color, choice.index);
}

/** The decision behind aiResolveDraft, without applying it: which card to
 * pick, or bank. Lets the game server resolve a house player's offer through
 * its own recorded-action flow (resolveDraftPick / resolveDraftBank) so the
 * match record stays identical to a human game's. */
export function aiDraftChoice(
  game: NerfGame,
  color: Color,
): { action: "pick"; index: number } | { action: "bank" } | null {
  const bs = game.buffs;
  if (!bs) return null;
  const offer = bs.players[color].offer;
  if (!offer) return null;
  let best = 0;
  let bestScore = -1;
  offer.cards.forEach((card, i) => {
    const def = BUFF_BY_ID[card.id];
    const usable =
      !def || !def.implemented || def.category === "info"
        ? 0
        : aiCanUse(def)
          ? 100
          : def.kind === "activated"
            ? 80
            : 0;
    const score = usable + card.tier;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  // Nothing here the bot can profit from: bank for a higher tier next time,
  // unless this offer already came from a banked skip.
  if (bestScore < 50 && !offer.banked) return { action: "bank" };
  return { action: "pick", index: best };
}

// ---------------------------------------------------------------------------
// AI buff activation
// ---------------------------------------------------------------------------

const AI_PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Score a candidate square for auto-targeting: enemy pieces dominate (by
 * value), then own pieces, then empty squares by centrality. */
function aiSquareScore(game: NerfGame, me: Color, sq: Square): number {
  const p = game.board.pieces[sq];
  const centrality = 7 - Math.max(Math.abs(FILE(sq) - 3.5), Math.abs(RANK(sq) - 3.5)) * 2;
  if (!p) return centrality;
  const base = AI_PIECE_VALUE[p.type] * 20;
  return p.color === me ? 100 + base + centrality : 1000 + base + centrality;
}

/** Collect a full pick sequence for an activated buff without a UI. Returns
 * null when the buff currently has no valid use, plus a rough value of the
 * best target so the caller can decide whether firing now is worth it. */
function aiCollectPicks(
  game: NerfGame,
  color: Color,
  buffIndex: number,
): { picks: BuffPick[]; value: number } | null {
  const opp: Color = color === "w" ? "b" : "w";
  const picks: BuffPick[] = [];
  let value = 0;
  for (let step = 0; step < 16; step++) {
    const target = buffNextTarget(game, color, buffIndex, picks);
    if (!target) return { picks, value };
    if (target.kind === "square") {
      if (!target.squares.length) return null;
      let best = target.squares[0];
      let bestScore = -1;
      for (const sq of target.squares) {
        const score = aiSquareScore(game, color, sq);
        if (score > bestScore) {
          bestScore = score;
          best = sq;
        }
      }
      const piece = game.board.pieces[best];
      if (piece && piece.color === opp) value = Math.max(value, AI_PIECE_VALUE[piece.type]);
      picks.push({ square: best });
    } else {
      if (!target.options.length) return null;
      const best = target.options.reduce((a, b) => (b.tier > a.tier ? b : a));
      value = Math.max(value, best.tier);
      picks.push({ buffIndex: best.index });
    }
  }
  return { picks, value };
}

/** Fire at most one of the bot's activated buffs, auto-picking targets.
 * Offensive cards wait for a target worth at least a minor piece so a
 * one-shot isn't wasted on a pawn; defensive/placement cards (no enemy piece
 * among the candidates) fire as soon as they are usable. Returns the used
 * card when a buff was activated (the board and effects may have changed),
 * so callers can tell the player what just hit the board. */
export function aiActivateBuffs(
  game: NerfGame,
  color: Color,
): { id: string; tier: Tier } | null {
  const choice = aiChooseBuffActivation(game, color);
  if (!choice) return null;
  const inst = game.buffs!.players[color].buffs[choice.buffIndex];
  if (activateBuff(game, color, choice.buffIndex, choice.picks)) {
    return { id: inst.id, tier: inst.tier };
  }
  return null;
}

/** The decision behind aiActivateBuffs, without applying it: the first held
 * buff worth firing right now plus its auto-picked targets, or null. Lets the
 * game server activate a house player's buff through its own recorded-action
 * flow so the match record stays identical to a human game's. */
export function aiChooseBuffActivation(
  game: NerfGame,
  color: Color,
): { buffIndex: number; picks: BuffPick[] } | null {
  const bs = game.buffs;
  if (!bs || game.result || game.board.turn !== color) return null;
  const ps = bs.players[color];
  const inDanger = isInCheck(game.board, color);
  for (let i = 0; i < ps.buffs.length; i++) {
    const inst = ps.buffs[i];
    const def = BUFF_BY_ID[inst.id];
    if (!def?.implemented || def.kind !== "activated" || inst.spent || inst.nullified) continue;
    // Reusable cards (spendOnUse: false) stay activatable forever; once one
    // is online (bound to a piece or zone, or running) the bot must not burn
    // its turns re-activating it.
    if (
      def.spendOnUse === false &&
      (inst.state.sq != null ||
        inst.state.sqs != null ||
        inst.state.squares != null ||
        inst.state.active === true)
    ) {
      continue;
    }
    const collected = aiCollectPicks(game, color, i);
    if (!collected) continue;
    const hitsEnemy = collected.picks.some((p) => {
      if (p.buffIndex !== undefined) return true;
      const piece = p.square !== undefined ? game.board.pieces[p.square] : null;
      return !!piece && piece.color !== color;
    });
    // Offensive one-shots hold out for a knight's worth of value.
    if (hitsEnemy && collected.value < 3) continue;
    // Protective cards wait for actual danger instead of firing blind.
    if (!hitsEnemy && def.category === "protection" && !inDanger) continue;
    return { buffIndex: i, picks: collected.picks };
  }
  return null;
}

export function resign(game: NerfGame, color: Color): NerfGame {
  if (game.result) return game;
  game.result = { winner: color === "w" ? "b" : "w", reason: "resignation" };
  return game;
}
