/// <reference types="@cloudflare/workers-types" />

// Shape check for the finished-game record the arena service posts to
// /api/arena/end. Kept out of the route file so the regression script
// (scripts/polish/api-unit-test.ts) can exercise it without a bearer token.

import { isHouseUserId } from "./bots";

// Mirrors the DO's ArenaEndRecord (worker.ts): the subset of the arena's
// ArenaFinishedRecord this route archives.
export type Color = "w" | "b";
export type StoredDraftAction =
  | { ply: number; color: Color; a: "pick"; index: number; cards: { id: string; tier: number }[] }
  | { ply: number; color: Color; a: "bank" }
  | { ply: number; color: Color; a: "use"; buffIndex: number; picks: unknown[] };
export type ArenaEndRecord = {
  id: string;
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec: number; incrementSec: number };
  mode: "nerf" | "buff";
  moves: string[];
  bots: Record<Color, string>;
  seats: Record<Color, { name: string }>;
  result: { winner: Color | "draw" | null; reason: string };
  startedAt: number;
  completedAt: number;
  draftSeed?: number;
  cadence?: number;
  draftActions?: StoredDraftAction[];
  replayVersion?: number;
};

// A record from the arena is trusted for WHO may send it (the bearer), not for
// its shape: a missing seat used to throw inside the archive call and answer
// 500, and any string was accepted as the rating category (F097). Every field
// the archive and the Glicko update read is checked here, so a malformed
// record is a 400 bad_record and nothing is written.
export const MAX_RECORD_BYTES = 1_000_000;
const MAX_PLIES = 2000;
const WINNERS = new Set(["w", "b", "draw"]);

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isShortString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export function validArenaEndRecord(rec: unknown): rec is ArenaEndRecord {
  if (!rec || typeof rec !== "object") return false;
  const r = rec as Partial<ArenaEndRecord>;
  if (!isShortString(r.id, 64) || !/^[A-Za-z0-9_-]+$/.test(r.id)) return false;
  if (r.mode !== "nerf" && r.mode !== "buff") return false;
  if (!r.bots || !isHouseUserId(r.bots.w) || !isHouseUserId(r.bots.b)) return false;
  if (!r.seats || !isShortString(r.seats.w?.name, 64) || !isShortString(r.seats.b?.name, 64)) return false;
  const s = r.setup;
  if (
    !s ||
    !isShortString(s.whiteNerfId, 80) ||
    !isShortString(s.blackNerfId, 80) ||
    !isFiniteNumber(s.seed) ||
    !Number.isInteger(s.timeSec) ||
    !Number.isInteger(s.incrementSec) ||
    s.timeSec < 0 ||
    s.incrementSec < 0
  ) {
    return false;
  }
  if (!Array.isArray(r.moves) || r.moves.length > MAX_PLIES || !r.moves.every((m) => isShortString(m, 64))) {
    return false;
  }
  if (!r.result || typeof r.result !== "object") return false;
  if (r.result.winner !== null && !WINNERS.has(r.result.winner as string)) return false;
  if (!isShortString(r.result.reason, 64)) return false;
  if (!isFiniteNumber(r.startedAt) || !isFiniteNumber(r.completedAt)) return false;
  if (r.draftActions !== undefined && !Array.isArray(r.draftActions)) return false;
  if (r.draftSeed !== undefined && !isFiniteNumber(r.draftSeed)) return false;
  if (r.cadence !== undefined && !isFiniteNumber(r.cadence)) return false;
  if (r.replayVersion !== undefined && !Number.isInteger(r.replayVersion)) return false;
  return true;
}
