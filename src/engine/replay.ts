// Deterministic position reconstruction from a stored game record.
//
// The game-server Durable Object rebuilds a live NerfGame by replaying the
// whole move + draft-action stream through the engine (see `gameFromMatch` in
// worker.ts). That logic lives in the DO because it also tracks per-move
// "reveal" visibility for the wire. The house-bot ENGINE, however, only needs
// the resulting board to choose a move — no reveal bookkeeping — so this module
// carries a `this`-free copy of just the board-reconstruction half.
//
// It is the piece the off-DO engine service (docs/bot-offload-tier1-engine-
// service.md) bundles: the DO ships a StoredMatch subset (`EngineMatch`), the
// service replays it here with the SAME engine, then searches. Because both
// sides call the identical engine primitives, the reconstructed board is
// byte-identical to the DO's — provided the engine versions match (the service
// version-guards on REPLAY_VERSION, and the DO re-validates the returned move
// against its own legalMoves, so any drift fails safe).
//
// Keep this in lockstep with `gameFromMatch`: if the DO's replay loop changes,
// change it here too (and bump REPLAY_VERSION).

import { moveToUCI } from "./board";
import type { BuffPick, DraftMode } from "./buff";
import {
  NerfGame,
  UNRESTRICTED_NERF,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
} from "./game";
import { PLAYABLE_NERFS } from "./nerfs/library";
import type { Color, Move } from "./types";

/** One resolved draft interaction. Structurally a subset of the DO's
 *  StoredDraftAction (extra fields like `cards` are ignored here). */
export type EngineDraftAction =
  | { ply: number; color: Color; a: "pick"; index: number; cards?: { id: string; tier: number }[] }
  | { ply: number; color: Color; a: "bank" }
  | { ply: number; color: Color; a: "use"; buffIndex: number; picks: BuffPick[] };

/** The StoredMatch subset needed to reconstruct a position. Never carries
 *  clocks, sessions, tokens, or any PII — only what the engine replays. */
export interface EngineMatch {
  setup: { whiteNerfId: string; blackNerfId: string; seed: number };
  mode?: DraftMode;
  draft?: boolean;
  draftSeed?: number;
  cadence?: number;
  stacked?: boolean;
  moves: string[];
  draftActions?: EngineDraftAction[];
}

/** Resolve a UCI string to the matching legal move in the current position.
 *  Moved here from worker.ts so the DO and the engine service share one
 *  implementation. */
export function moveByUci(game: NerfGame, uci: string): Move | undefined {
  return legalMoves(game).find((candidate) => moveToUCI(candidate) === uci);
}

function applyEngineDraftAction(game: NerfGame, action: EngineDraftAction): void {
  if (action.a === "pick") pickDraftCard(game, action.color, action.index);
  else if (action.a === "bank") bankDraft(game, action.color);
  else activateBuff(game, action.color, action.buffIndex, action.picks);
}

/** Rebuild the position from a stored record. Mirrors `gameFromMatch` minus the
 *  reveal bookkeeping (which is wire-visibility only and does not affect the
 *  board or the legal-move set). Returns null if the record cannot replay
 *  (unknown nerf id, or a stored move that is no longer legal — i.e. a version
 *  desync); the caller treats null as "no move". */
export function replayToPosition(m: EngineMatch): NerfGame | null {
  const nerfById = (id: string) =>
    m.mode === "buff" ? UNRESTRICTED_NERF : PLAYABLE_NERFS.find((nerf) => nerf.id === id);
  const white = nerfById(m.setup.whiteNerfId);
  const black = nerfById(m.setup.blackNerfId);
  if (!white || !black) return null;

  let game = newGame(white, black, m.setup.seed);
  if (m.draft) {
    enableDraftMode(game, m.draftSeed ?? m.setup.seed, {
      mode: m.mode,
      ...(m.cadence ? { cadence: m.cadence } : {}),
      ...(m.stacked ? { stackFor: "b" as Color, stackBoost: 2 } : {}),
    });
  }

  const actions = m.draftActions ?? [];
  let cursor = 0;
  const applyActionsUpTo = (ply: number) => {
    while (cursor < actions.length && actions[cursor].ply <= ply) {
      applyEngineDraftAction(game, actions[cursor]);
      cursor += 1;
    }
  };

  for (let i = 0; i < m.moves.length; i++) {
    applyActionsUpTo(i);
    const move = moveByUci(game, m.moves[i]);
    if (!move) return null;
    game = playMove(game, move);
  }
  applyActionsUpTo(m.moves.length);
  return game;
}
