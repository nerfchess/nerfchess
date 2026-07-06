import type { BuffInstance, BuffMatchState, DraftMode } from "@/engine/buff";
import { moveFromUCI, moveToUCI } from "@/engine/board";
import {
  NerfGame,
  acquireBuff,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} from "@/engine/game";
import type { Nerf, Tier } from "@/engine/nerf";
import type { Color, Move } from "@/engine/types";
import type { MPDraftAction, MPDraftCard, MPDraftState, MPHiddenCard } from "@/lib/multiplayer";

// A masked card in the local replica: a BuffInstance-shaped placeholder with
// an empty id. Every engine hook looks defs up by id and skips unknown ones,
// so placeholders are inert; the dock renders them face-down (tier only).
export function isHiddenBuff(inst: BuffInstance | MPHiddenCard): inst is MPHiddenCard {
  return "hidden" in inst && inst.hidden === true;
}

export function hiddenPlaceholder(card: MPHiddenCard): BuffInstance {
  return {
    id: "",
    tier: card.tier as Tier,
    state: {},
    ...(card.spent ? { spent: true } : {}),
    ...(card.nullified ? { nullified: true } : {}),
  };
}

// ---------------------------------------------------------------------------
// Client-side replica of a server-authoritative Draft game.
//
// The server never shares its draft RNG (that would let a client predict
// every future offer), so replicas roll placeholder offers locally and the
// server's dtOffer / dtState frames supply the real cards. Everything else
// (held buffs, board effects, tempo counters, board mutations) replays
// deterministically from the public draft action record.
// ---------------------------------------------------------------------------

/** Apply one public draft action to a local replica. */
export function applyDraftAction(game: NerfGame, action: MPDraftAction) {
  const bs = game.buffs;
  if (!bs) return;
  const ps = bs.players[action.color];
  if (action.a === "pick") {
    // Mirror pickDraftCard without needing the (possibly hidden) offer:
    // revealed cards run acquireBuff (the same init and instant effects the
    // server ran); masked cards land as inert face-down placeholders so the
    // buff-list indices stay aligned with the server's.
    ps.offer = null;
    if ((ps.flags.takeBoth ?? 0) > 0) ps.flags.takeBoth = (ps.flags.takeBoth ?? 0) - 1;
    for (const card of action.cards) {
      if (isHiddenCard(card)) {
        if ((ps.flags.nullifyIncoming ?? 0) > 0 && card.nullified) {
          ps.flags.nullifyIncoming = (ps.flags.nullifyIncoming ?? 0) - 1;
        }
        ps.buffs.push(hiddenPlaceholder(card));
      } else {
        acquireBuff(game, action.color, card.id, card.tier as Tier);
      }
    }
  } else if (action.a === "bank") {
    bankDraft(game, action.color);
  } else {
    // A use names the fired card: fill in a previously masked slot so the
    // engine can apply the real effect.
    const inst = ps.buffs[action.buffIndex];
    if (inst && !inst.id && action.card) {
      inst.id = action.card.id;
      inst.tier = action.card.tier as Tier;
    }
    activateBuff(game, action.color, action.buffIndex, action.picks);
  }
}

function isHiddenCard(card: MPDraftCard | MPHiddenCard): card is MPHiddenCard {
  return "hidden" in card && card.hidden === true;
}

/** A server-accepted move applied to a replica. Placeholder offer rolls and
 * reveal snapshots (rolled with the replica's dummy RNG) are discarded so
 * only server frames ever populate offers and reveals. */
export function playReplicaMove(game: NerfGame, move: Move): NerfGame {
  const bs = game.buffs;
  if (!bs) return playMove(game, move);
  const before = {
    w: { offer: bs.players.w.offer, oppReveal: bs.players.w.oppReveal },
    b: { offer: bs.players.b.offer, oppReveal: bs.players.b.oppReveal },
  };
  const next = playMove(game, move);
  const nbs = next.buffs;
  if (nbs) {
    for (const color of ["w", "b"] as Color[]) {
      if (nbs.players[color].offer !== before[color].offer) nbs.players[color].offer = null;
      if (nbs.players[color].oppReveal !== before[color].oppReveal) {
        nbs.players[color].oppReveal = before[color].oppReveal;
      }
    }
  }
  return next;
}

/** Merge a per-seat (or spectator) filtered dtState into the replica. Fields
 * the server withheld keep their replay-derived local values: opponent flags
 * without picksVisible are still tracked correctly by replaying the public
 * action record, and spectators never merge offers or reveals at all. */
export function mergeDraftState(bs: BuffMatchState, state: MPDraftState, myColor: Color | null) {
  bs.cadence = state.cadence;
  bs.effects = state.effects;
  bs.extraMoves = { ...state.extraMoves };
  bs.skips = { ...state.skips };
  bs.chainKingGuard = state.chainKingGuard;
  if (state.historyDiverged) bs.historyDiverged = true;
  for (const color of ["w", "b"] as Color[]) {
    const ps = bs.players[color];
    const ws = state.players[color];
    if (!ws) continue;
    ps.buffs = ws.buffs.map((b) => (isHiddenBuff(b) ? hiddenPlaceholder(b) : b));
    ps.draftsTaken = ws.draftsTaken;
    ps.nextDraftAt = ws.nextDraftAt;
    ps.offer = ws.offer ?? null;
    if (ws.flags) ps.flags = ws.flags;
    if (color === myColor) {
      ps.oppReveal = (ws.oppReveal as typeof ps.oppReveal) ?? null;
    }
    if (ws.nerfRemoved) ps.nerfRemoved = true;
    if (ws.revived) ps.revived = ws.revived as typeof ps.revived;
  }
}

/** Game over: the end frame carries every held buff with its real identity
 * (the draft analogue of both nerfs going public). Swap the replica's lists,
 * masked placeholders included, for the revealed record. */
export function revealHeldBuffs(
  bs: BuffMatchState,
  draftBuffs: Record<Color, { id: string; tier: number; spent?: boolean; nullified?: boolean }[]>,
) {
  for (const color of ["w", "b"] as Color[]) {
    const revealed = draftBuffs[color];
    if (!revealed) continue;
    bs.players[color].buffs = revealed.map((b, i) => {
      const existing = bs.players[color].buffs[i];
      if (existing && existing.id === b.id) return existing;
      return {
        id: b.id,
        tier: b.tier as Tier,
        state: {},
        ...(b.spent ? { spent: true } : {}),
        ...(b.nullified ? { nullified: true } : {}),
      };
    });
  }
}

/** Replay server moves and the public draft record interleaved by ply, so
 * board mutations from buffs land exactly where they did on the server. */
export function replayDraftGame(game: NerfGame, moves: string[], actions: MPDraftAction[]): NerfGame {
  let cursor = 0;
  const applyUpTo = (ply: number) => {
    while (cursor < actions.length && actions[cursor].ply <= ply) {
      applyDraftAction(game, actions[cursor]);
      cursor += 1;
    }
  };
  for (let i = 0; i < moves.length; i++) {
    applyUpTo(i);
    // A server-accepted move the replica cannot regenerate (a hidden nerf or
    // buff effect it does not know about) is applied raw instead of aborting
    // the replay: the server already validated it, and stopping mid-replay
    // would strand the board several plies behind for the rest of the game.
    const move =
      legalMoves(game).find((candidate) => moveToUCI(candidate) === moves[i]) ??
      moveFromUCI(game.board, moves[i]);
    if (!move) return game;
    game = playReplicaMove(game, move);
  }
  applyUpTo(moves.length);
  return game;
}

// Spectators never learn either rule, so both sides replay with a no-op
// nerf. Server-validated moves are always found: nerfs only restrict moves,
// and buff-granted ones come back through the replayed public record.
const SPECTATOR_NERF: Nerf = {
  id: "noop",
  name: "Unknown",
  description: "",
  tier: 1,
  implemented: true,
};

/** Build a spectator replica of a draft game from a wstart payload. */
export function buildSpectatorDraftGame(
  moves: string[],
  actions: MPDraftAction[],
  state?: MPDraftState,
  mode?: DraftMode,
): NerfGame {
  const game = newGame(SPECTATOR_NERF, SPECTATOR_NERF, 1);
  enableDraftMode(game, 1, { mode });
  const replayed = replayDraftGame(game, moves, actions);
  if (state && replayed.buffs) mergeDraftState(replayed.buffs, state, null);
  return replayed;
}

export type DraftZones = {
  frozen: number[];
  shielded: number[];
  ward: number[];
  barred: number[];
  strike: number[];
  /** Pieces hexed into walnuts: frozen, but painted with the nut marker. */
  walnut: number[];
  /** Pieces shackled by a king-only or no-pawn-advance hex: they cannot move
   * while the hex holds, so they are marked with a chain. */
  locked: number[];
  /** Banana peels the VIEWER has tossed and not yet triggered. Shown only to
   * the owner (a trap keeps its surprise), marked with the peel. */
  banana: number[];
};

/** Squares held in place by an active Immobilizer: enemy non-king pieces
 * adjacent to the bound piece. Painted with the frozen tint so the lockdown
 * is visible on the board instead of silently pruning moves. */
function immobilizedSquares(game: NerfGame): number[] {
  const bs = game.buffs;
  if (!bs) return [];
  const out: number[] = [];
  for (const color of ["w", "b"] as Color[]) {
    for (const inst of bs.players[color].buffs) {
      if (inst.id !== "immobilizer" || inst.spent || inst.nullified) continue;
      const sq = inst.state.sq as number | undefined;
      if (sq == null) continue;
      const holder = game.board.pieces[sq];
      if (!holder || holder.color !== color) continue;
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const f = (sq % 8) + df, r = (sq >> 3) + dr;
          if (f < 0 || f > 7 || r < 0 || r > 7) continue;
          const n = r * 8 + f;
          const p = game.board.pieces[n];
          if (p && p.color !== color && p.type !== "k") out.push(n);
        }
      }
    }
  }
  return out;
}

/** Board paint for the public zone effects, matching the bot game's wiring:
 * frozen pieces, sanctuary squares, barred squares for each side, and the
 * lightning-struck squares' brief flash. */
export function draftZones(game: NerfGame, myColor: Color): DraftZones {
  const zones: DraftZones = { frozen: [], shielded: [], ward: [], barred: [], strike: [], walnut: [], locked: [], banana: [] };
  if (!game.buffs) return zones;
  zones.frozen.push(...immobilizedSquares(game));
  // Banana peels the viewer has tossed: a hidden trap stored on the buff
  // instance (not in effects), shown only to its owner so the surprise
  // survives, until an enemy piece slips on it and the peel is spent.
  for (const inst of game.buffs.players[myColor].buffs) {
    if (inst.id !== "banana_peel" || inst.spent || inst.nullified) continue;
    const sq = inst.state.sq as number | undefined;
    if (sq != null && !zones.banana.includes(sq)) zones.banana.push(sq);
  }
  for (const e of game.buffs.effects) {
    if (e.turns != null && e.turns <= 0) continue;
    if (e.kind === "freeze") zones.frozen.push(e.sq);
    else if (e.kind === "walnut") zones.walnut.push(e.sq);
    else if (e.kind === "shield") {
      if (e.squares) zones.shielded.push(...e.squares);
      else {
        for (let sq = 0; sq < 64; sq++) {
          const p = game.board.pieces[sq];
          if (p && p.color === e.owner) zones.shielded.push(sq);
        }
      }
    } else if (e.kind === "barred") {
      (e.against === myColor ? zones.barred : zones.ward).push(...e.squares);
    } else if (e.kind === "strike") {
      zones.strike.push(...e.squares);
    } else if (e.kind === "king_only") {
      // Only the king may move: every other friendly piece is shackled.
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (p && p.color === e.against && p.type !== "k") zones.locked.push(sq);
      }
    } else if (e.kind === "no_pawn_advance") {
      // Pawns can't advance: mark them as shackled.
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (p && p.color === e.against && p.type === "p") zones.locked.push(sq);
      }
    }
  }
  return zones;
}
