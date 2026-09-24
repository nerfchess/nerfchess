// The engine service's one unit of work: validate a /move body, replay the
// position under the match's card overrides, and pick a house move. Pure and
// synchronous, so it runs the same inside a worker thread (searchPool.ts) and
// in-process in the tests (test/server.test.ts).
//
// Every request field past the original { match, skill, profile,
// remainingClockMs, replayVersion } is optional and additive: an old worker
// that sends none of them gets exactly the old behaviour, and a new worker
// talking to an old box gets its extra fields ignored.
import { setDraftPoolOverrides, type DraftPoolOverrides } from "../src/engine/draft";
import { replayToPosition, type EngineMatch } from "../src/engine/replay";
import type { SearchStats } from "../src/engine/ai";
import type { Move } from "../src/engine/types";
import {
  HOUSE_SKILL_PROFILES,
  housePersona,
  pickHouseMove,
  sanitizeResolvedProfile,
  type HouseSkill,
} from "../src/lib/server/bots";

// A non-binding safety cap on any one search. Moves in lockstep with
// HOUSE_REMOTE_CEILING_MS and HOUSE_SKILL_PROFILES in src/lib/server/bots.ts;
// a ceiling only ever clamps down, so the two sides can deploy in any order.
// negamax hard-deadlines at the budget it is given, so this is a bound, not a
// midpoint.
export const REMOTE_SEARCH_CEILING_MS = 1800;

// Derived from the roster's profile map so the accepted tiers never drift out
// of sync with bots.ts when the skill tiers change.
const VALID_SKILLS = new Set<number>(Object.keys(HOUSE_SKILL_PROFILES).map(Number));

/** A /move body after validation. Unknown fields are dropped here. */
export interface SearchTask {
  match: EngineMatch & { cardOverrides?: DraftPoolOverrides | null };
  skill: HouseSkill;
  profile?: unknown;
  remainingClockMs?: number;
  /** Persona user id; resolved on the box, an unknown id means none. */
  persona?: string;
  incrementSec?: number;
  /** Search ceiling for this request, already shrunk by its queue wait. */
  ceilingMs: number;
}

export interface SearchResult {
  move: Move | null;
  /** The root's best score from the mover's side, centipawns, when the move
   * came from a completed search; null for a book move, a blunder, a forced
   * reply, or when no depth completed. */
  scoreCp: number | null;
  /** Deepest completed ply (0 when the move did not come from a search). */
  depth: number;
}

export type ParsedBody =
  | { ok: true; task: Omit<SearchTask, "ceilingMs">; replayVersion: unknown; deadlineMs?: number }
  | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Only the two documented override keys, with the shapes setDraftPoolOverrides
 * expects. Anything else is dropped rather than refused, so a malformed field
 * degrades to "no overrides" (the old behaviour), never to a broken replay. */
export function sanitizeCardOverrides(raw: unknown): DraftPoolOverrides | null {
  if (!isObj(raw)) return null;
  const out: DraftPoolOverrides = {};
  if (Array.isArray(raw.off)) {
    const off = raw.off.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 80);
    if (off.length) out.off = off.slice(0, 500);
  }
  if (isObj(raw.tier)) {
    const tier: Record<string, number> = {};
    for (const [id, t] of Object.entries(raw.tier).slice(0, 500)) {
      if (Number.isInteger(t) && (t as number) >= 1 && (t as number) <= 8) tier[id] = t as number;
    }
    if (Object.keys(tier).length) out.tier = tier;
  }
  return out.off || out.tier ? out : null;
}

/** Validate a parsed JSON body. Structural garbage is a 400; the version check
 * and the pool's deadline handling stay with the caller. */
export function parseMoveBody(body: unknown): ParsedBody {
  if (!isObj(body)) return { ok: false, error: "body" };
  const m = body.match;
  if (!isObj(m) || !isObj(m.setup) || !Array.isArray(m.moves) || !m.moves.every((x) => typeof x === "string")) {
    return { ok: false, error: "match" };
  }
  const setup = m.setup;
  if (typeof setup.whiteNerfId !== "string" || typeof setup.blackNerfId !== "string" || !finite(setup.seed)) {
    return { ok: false, error: "match" };
  }
  if (m.draftActions != null && !Array.isArray(m.draftActions)) return { ok: false, error: "match" };
  if (!finite(body.skill) || !VALID_SKILLS.has(body.skill)) return { ok: false, error: "skill" };
  const match = m as unknown as SearchTask["match"];
  const task: Omit<SearchTask, "ceilingMs"> = { match, skill: body.skill as HouseSkill };
  if (body.profile != null) task.profile = body.profile;
  if (finite(body.remainingClockMs) && body.remainingClockMs >= 0) task.remainingClockMs = body.remainingClockMs;
  if (typeof body.persona === "string" && body.persona.length < 80) task.persona = body.persona;
  if (finite(body.incrementSec) && body.incrementSec >= 0) task.incrementSec = Math.min(body.incrementSec, 180);
  const deadlineMs = finite(body.deadlineMs) && body.deadlineMs > 0 ? body.deadlineMs : undefined;
  return { ok: true, task, replayVersion: body.replayVersion, ...(deadlineMs != null ? { deadlineMs } : {}) };
}

/** Repertoire seed for a request with no known persona: stable for one side
 * of one game (so a line is followed consistently), different across games
 * and between the two sides. */
export function varietySeedFor(seed: number, turn: "w" | "b"): number {
  let h = Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= turn === "w" ? 0x27d4eb2f : 0x165667b1;
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35);
  return (h ^ (h >>> 13)) >>> 0;
}

/** Replay the stored record under its own card overrides, exactly as the DO
 * does (worker.ts replayForward: overrides only for draft matches), and clear
 * them again before returning so nothing else sees them. */
export function replayWithOverrides(match: SearchTask["match"]) {
  setDraftPoolOverrides(match.draft ? sanitizeCardOverrides(match.cardOverrides) : null);
  try {
    return replayToPosition(match);
  } finally {
    setDraftPoolOverrides(null);
  }
}

// The blunder branch inside pickHouseMove is nondeterministic by design, so a
// local RNG is correct here: only the replayed BOARD must match the DO's, and
// that is guaranteed by the shared engine, the REPLAY_VERSION guard and the
// card overrides installed around the replay.
const randomInt = (max: number) => Math.floor(Math.random() * max);

export function runSearch(task: SearchTask, random: (max: number) => number = randomInt): SearchResult {
  const overrides = task.match.draft ? sanitizeCardOverrides(task.match.cardOverrides) : null;
  // The overrides stay installed through the search too: a search that plays
  // into a draft point rolls offers from the same pools the DO would.
  setDraftPoolOverrides(overrides);
  try {
    const game = replayToPosition(task.match);
    if (!game) return { move: null, scoreCp: null, depth: 0 };
    // Honor the DO's resolved profile when present (re-clamped), else baked.
    const profile = task.profile != null ? sanitizeResolvedProfile(task.skill, task.profile) : undefined;
    const persona = task.persona ? housePersona(task.persona) : undefined;
    const stats: SearchStats = { depth: 0, rootMoves: 0 };
    const move = pickHouseMove(game, task.skill, random, task.remainingClockMs, task.ceilingMs, profile, persona, {
      ...(persona ? {} : { varietySeed: varietySeedFor(task.match.setup.seed, game.board.turn) }),
      ...(task.incrementSec != null ? { incrementSec: task.incrementSec } : {}),
      stats,
    });
    const scoreCp = stats.depth > 0 && finite(stats.scoreCp) ? Math.round(stats.scoreCp) : null;
    return { move, scoreCp, depth: stats.depth };
  } finally {
    setDraftPoolOverrides(null);
  }
}
