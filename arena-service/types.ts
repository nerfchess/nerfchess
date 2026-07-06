// Shared types for the arena service (Tier 2 · M1).
// NOTE: in M2 these move to src/lib/arena/types.ts so the DO's /arena handler
// imports the exact same shapes. Kept local for M1 to stay fully isolated.
import type { BuffPick } from "../src/engine/buff";

export type Color = "w" | "b";

/** One resolved draft interaction — the EXACT union the DO replays via
 *  applyStoredDraftAction (worker.ts). `ply` = accepted moves at the time. */
export type StoredDraftAction =
  | { ply: number; color: Color; a: "pick"; index: number; cards: { id: string; tier: number }[] }
  | { ply: number; color: Color; a: "bank" }
  | { ply: number; color: Color; a: "use"; buffIndex: number; picks: BuffPick[] };

/** Archive-ready finished-game record. This is exactly what M2's DO side needs
 *  to (a) archive via recordFinishedGame and (b) apply Glicko to both house
 *  accounts. `replayVersion` MUST match the Worker's REPLAY_VERSION. */
export interface ArenaFinishedRecord {
  id: string;
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec: number; incrementSec: number };
  mode: "nerf" | "buff";
  draft: true;
  cadence: number;
  draftSeed: number;
  moves: string[];
  draftActions: StoredDraftAction[];
  bots: Record<Color, string>; // persona ids
  seats: Record<Color, { name: string; rating: number }>;
  result: { winner: Color | "draw" | null; reason: string };
  rated: true;
  replayVersion: number;
  startedAt: number;
  completedAt: number;
}

/** What the arena POSTs to the DO's /arena/games registry (Tier 2 / M2). */
export interface ExternalGameMeta {
  id: string;
  mode: "nerf" | "buff";
  timeSec: number;
  incrementSec: number;
  moves: number;
  seats: Record<Color, { userId: string; name: string; rating: number }>;
}

export interface ArenaGameSummary {
  id: string;
  mode: "nerf" | "buff";
  pool: string;
  seats: Record<Color, { name: string; rating: number }>;
  ply: number;
  clocks: Record<Color, number>;
  startedAt: number;
}

/** Bootstrap state the DO turns into a spectator `wstart` (Tier 2 / M3). Only
 *  posted for a WATCHED, STARTED game — the DO holds no replica until then, so
 *  a spectator waits (a few seconds) rather than see a nerf-draft-pending board
 *  it cannot reconstruct (hidden nerfs). */
export interface ArenaSnapshot {
  id: string;
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec: number; incrementSec: number };
  mode: "nerf" | "buff";
  draft: true;
  draftSeed: number;
  cadence: number;
  moves: string[];
  draftActions: StoredDraftAction[];
  clocks: Record<Color, number>;
  startedAt: number; // 0 until the game leaves the opening nerf draft
  seats: Record<Color, { userId: string; name: string; rating: number }>;
}

/** One spectator event the arena pushes to the DO for a watched game (Tier 2 /
 *  M3). The DO advances its ephemeral replica and relays the matching frame to
 *  the sockets watching this game. `card` rides a `use` so the effect renders on
 *  spectator replicas (a fired buff's face is public anyway). */
export type ArenaFrame =
  | ({ kind: "snapshot" } & ArenaSnapshot)
  | { kind: "move"; id: string; ply: number; u: string; clocks: Record<Color, number> }
  | { kind: "draft"; id: string; action: StoredDraftAction; card?: { id: string; tier: number } };

export const other = (c: Color): Color => (c === "w" ? "b" : "w");
