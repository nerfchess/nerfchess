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
import { BUFF_BY_ID } from "./buffs/library";
import {
  NerfGame,
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  playMove,
  rerollDraft,
  resolveDiffFlag,
} from "./game";
import { PLAYABLE_NERFS } from "./nerfs/library";
import type { Color, Move } from "./types";

/** One resolved draft interaction. Structurally a subset of the DO's
 *  StoredDraftAction (extra fields like `cards` are ignored here). */
export type EngineDraftAction =
  | { ply: number; color: Color; a: "pick"; index: number; cards?: { id: string; tier: number }[] }
  | { ply: number; color: Color; a: "bank" }
  // A reroll advances the shared draft rngState exactly like a normal roll
  // (see rerollOffer), so every roll AFTER it depends on it having happened.
  // It must be replayed or the reconstructed offers — and therefore the picks
  // and the board — silently diverge from the DO's.
  | { ply: number; color: Color; a: "reroll" }
  // Owner god-panel summon: seats a held card outside the draft. It changes
  // the seat's hand (and hand indices), so later `use` actions depend on it.
  | { ply: number; color: Color; a: "grant"; id: string }
  // A Chess Diff sub-game decided by a clock flag (`color` flagged).
  | { ply: number; color: Color; a: "diffFlag" }
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
  else if (action.a === "reroll") rerollDraft(game, action.color);
  else if (action.a === "grant") {
    // Tier is re-derived from the library (mirrors the DO's replay) so a
    // stored value can never drift from the card definition.
    const def = BUFF_BY_ID[action.id];
    if (def) acquireBuff(game, action.color, action.id, def.tier);
  } else if (action.a === "diffFlag") resolveDiffFlag(game, action.color);
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

/** Rebuild the position after exactly `ply` half-moves — the reconstruction
 *  history review needs to jump to an arbitrary past position, INCLUDING one a
 *  board-rewriting card diverged from move history. Because it replays the moves
 *  interleaved with the draft-action record through the engine (not plain
 *  move-replay through makeMove), it reproduces summons, removals, teleports,
 *  drops, and timed losses exactly as they happened live — the very mutations
 *  `historyDiverged` marks as unreplayable from moves alone.
 *
 *  Returns null when the record cannot replay that far (an unknown nerf id, or a
 *  stored move that no longer resolves — a version desync). The caller treats
 *  null as "unreconstructable" and keeps review locked rather than showing a
 *  wrong board, so this degrades gracefully for records the engine can't span. */
export function boardAtPlyFromRecord(m: EngineMatch, ply: number): NerfGame | null {
  const end = Math.max(0, Math.min(ply, m.moves.length));
  // Slicing the move list bounds the replay: replayToPosition applies every
  // action recorded at ply <= end (an action's `ply` is the accepted-move count
  // when it fired), which is exactly the set of mutations in effect after `end`
  // half-moves — the same interleaving the live game had at that point.
  return replayToPosition({ ...m, moves: m.moves.slice(0, end) });
}
