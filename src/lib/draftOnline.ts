import type { BuffMatchState } from "@/engine/buff";
import { moveToUCI } from "@/engine/board";
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
import type { MPDraftAction, MPDraftState } from "@/lib/multiplayer";

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
    // Mirror pickDraftCard without needing the (possibly hidden) offer: the
    // acquired cards are public, and acquireBuff runs the same init and
    // instant effects the server ran.
    ps.offer = null;
    if ((ps.flags.takeBoth ?? 0) > 0) ps.flags.takeBoth = (ps.flags.takeBoth ?? 0) - 1;
    for (const card of action.cards) acquireBuff(game, action.color, card.id, card.tier as Tier);
  } else if (action.a === "bank") {
    bankDraft(game, action.color);
  } else {
    activateBuff(game, action.color, action.buffIndex, action.picks);
  }
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
    ps.buffs = ws.buffs;
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
    const move = legalMoves(game).find((candidate) => moveToUCI(candidate) === moves[i]);
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
): NerfGame {
  const game = newGame(SPECTATOR_NERF, SPECTATOR_NERF, 1);
  enableDraftMode(game, 1);
  const replayed = replayDraftGame(game, moves, actions);
  if (state && replayed.buffs) mergeDraftState(replayed.buffs, state, null);
  return replayed;
}

export type DraftZones = { frozen: number[]; shielded: number[]; ward: number[]; barred: number[] };

/** Board paint for the public zone effects, matching the bot game's wiring:
 * frozen pieces, sanctuary squares, and barred squares for each side. */
export function draftZones(game: NerfGame, myColor: Color): DraftZones {
  const zones: DraftZones = { frozen: [], shielded: [], ward: [], barred: [] };
  if (!game.buffs) return zones;
  for (const e of game.buffs.effects) {
    if (e.turns != null && e.turns <= 0) continue;
    if (e.kind === "freeze") zones.frozen.push(e.sq);
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
    }
  }
  return zones;
}
