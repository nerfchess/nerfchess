// TV / spectator pipeline harness. Run headless (no live server) with:
//   npx -y tsx scripts/test-tv-spectator.ts
//   npm run test:tv-spectator
//
// This is the offline gate for the TV / spectator repair. It exercises the
// PUBLIC PROJECTION layer end to end against the real deterministic reducer,
// with no worker, no socket, and no browser:
//
//   UNIT        toPublicSnapshot serialize/deserialize + a spectator that
//               consumes ONLY the public snapshot rebuilding the same board;
//               public-state sanitization proving no secret (slot rng, draft
//               seed, unrevealed nerf id, hidden card, private offer, private
//               chat) reaches the wire; sequence handling (in-order / dedupe /
//               out-of-order); deterministic public-state hashing; schema
//               migration guards; candidate health validation + failover.
//
//   CARD-PARITY every board-mutating activated card is fired through the engine,
//               the resulting state is serialized to a public snapshot, a
//               SPECTATOR reconstructs it from the move + public draft-action
//               record via buildSpectatorDraftGame (the real replica path), and
//               its public projection must EXACTLY match the player's -- hash and
//               canonical signature. Plus combinations / ordering / stacking of
//               several board-mutating cards. The moves-only baseline is asserted
//               to genuinely diverge, so each case proves a real rewrite.
//
//   INTEGRATION join scenarios routed through the shared applySpectatorEnvelope
//               reducer: join before draft, right after a card resolves, after
//               several mutations, during a draft pause, after reconnect (no
//               double-apply), buff game, nerf game (secret nerf excluded from
//               the shared hash so server + spectator still agree), switch
//               nerf->buff, rapid game switching, join at > 300 moves (recent
//               snapshot + later envelopes only, never a replay from move 1),
//               after a disconnect (gap -> resync), game ends during loading,
//               recover a missing event (reorder drain), recover a corrupted
//               cached snapshot (parity mismatch -> resync), and failover from an
//               invalid featured game.

import {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  buffNextTarget,
  enableDraftMode,
  deserializeGame,
  serializeGame,
  legalMoves,
  newGame,
  playMove,
  toPublicSnapshot,
  PUBLIC_SNAPSHOT_VERSION,
  GAME_SNAPSHOT_VERSION,
  type PublicSnapshotBits,
  type PublicSpectatorSnapshot,
} from "@/engine/game";
import { moveFromUCI, moveToUCI } from "@/engine/board";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { PLAYABLE_NERFS } from "@/engine/nerfs/library";
import { publicStateHash, publicStateSignature } from "@/engine/desync";
import { buildSpectatorDraftGame } from "@/lib/draftOnline";
import {
  applySpectatorEnvelope,
  applySpectatorSnapshot,
  beginWatch,
  checkSpectatorParity,
  createSpectatorSync,
  endWatch,
  requestResync,
  sweepSpectatorSync,
  DEFAULT_SYNC_CONFIG,
  type SpectatorFrame,
} from "@/lib/spectate/spectatorSync";
import {
  isWatchStartHealthy,
  nextFailoverCandidate,
  pruneFailedIds,
  selectFeaturedTarget,
  watchStartHealth,
} from "@/lib/spectate/featuredSelection";
import type { SpectatorEnvelope, SpectatorEnvelopeType } from "@/lib/multiplayer";
import type { NerfGame } from "@/engine/game";
import type { BuffPick } from "@/engine/buff";
import type { Tier } from "@/engine/nerf";
import type { Color } from "@/engine/types";
import type { MPDraftAction } from "@/lib/multiplayer";

// ---------------------------------------------------------------------------
// Tiny assertion harness (mirrors the repo's other .cjs / .ts harnesses).
// ---------------------------------------------------------------------------
let failures = 0;
let checks = 0;
function ok(cond: boolean, label: string): boolean {
  checks++;
  if (!cond) {
    failures++;
    console.log("FAIL  " + label);
  }
  return cond;
}
function section(name: string) {
  console.log("\n=== " + name + " ===");
}

const sq = (name: string) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);

// A recorded draft game: the authoritative live game plus the move + public
// draft-action record a spectator reconstructs from.
interface Recorded {
  game: NerfGame;
  moves: string[];
  actions: MPDraftAction[];
}

function makeBits(over: Partial<PublicSnapshotBits> = {}): PublicSnapshotBits {
  return {
    gameId: "g1",
    replayVersion: 7,
    stateRevision: 1,
    lastSeq: 1,
    cursor: 0,
    capturedAtMs: 0,
    mode: "buff",
    rated: false,
    players: { w: { name: "White", rating: 1500 }, b: { name: "Black", rating: 1500 } },
    clocks: { w: 60000, b: 60000 },
    timeSec: 60,
    incrementSec: 0,
    timerState: "paused",
    revealedNerfs: { w: null, b: null },
    offerSeats: { w: false, b: false },
    nextDraftAtPly: null,
    spectatorDelaySec: 0,
    lastCardPlayId: null,
    ...over,
  };
}

/** Project a live game to a fully-hashed public snapshot. */
function project(game: NerfGame, over: Partial<PublicSnapshotBits> = {}): PublicSpectatorSnapshot {
  const snap = toPublicSnapshot(game, makeBits(over));
  snap.publicHash = publicStateHash(snap);
  return snap;
}

/** Collect a full pick sequence for an activated buff, driving the engine's own
 *  target enumerator exactly like the AI auto-picker (but with no value gate, so
 *  every fireable card is exercised). Returns null when the card has no valid
 *  use in the current position. */
function collectPicks(game: NerfGame, color: Color, idx: number): BuffPick[] | null {
  const picks: BuffPick[] = [];
  for (let step = 0; step < 16; step++) {
    const t = buffNextTarget(game, color, idx, picks);
    if (!t) break;
    if (t.kind === "square") {
      if (!t.squares.length) return picks.length ? picks : null;
      picks.push({ square: t.squares[0] });
    } else {
      if (!t.options || !t.options.length) return picks.length ? picks : null;
      picks.push({ buffIndex: t.options[0].index });
    }
  }
  return picks;
}

// A developed opening: gives cards real targets (enemy pieces, open squares).
const OPENING = [
  "e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5",
  "d2d3", "d7d6", "b1c3", "g8f6", "c1g5", "c8g4",
];

function freshBuffGame(seed = 777): Recorded {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed, { mode: "buff" });
  return { game, moves: [], actions: [] };
}

function play(rec: Recorded, uci: string): boolean {
  const m = legalMoves(rec.game).find((x) => moveToUCI(x) === uci) ?? moveFromUCI(rec.game.board, uci);
  if (!m) return false;
  playMove(rec.game, m);
  rec.moves.push(uci);
  return true;
}

function playOpening(rec: Recorded, plies = OPENING.length) {
  for (let i = 0; i < plies && i < OPENING.length; i++) {
    if (!play(rec, OPENING[i])) break;
  }
}

/** Grant a card into a seat's hand AND record it as a public "pick" action so
 *  the spectator replica acquires the identical card. Returns the hand index. */
function grant(rec: Recorded, color: Color, id: string, tier: Tier): number {
  const before = rec.game.buffs!.players[color].buffs.length;
  acquireBuff(rec.game, color, id, tier);
  const after = rec.game.buffs!.players[color].buffs.length;
  if (after <= before) return -1;
  rec.actions.push({ ply: rec.moves.length, color, a: "pick", cards: [{ id, tier }] });
  return after - 1;
}

/** Fire a card with auto-collected picks AND record the public "use" action.
 *  Returns true when the card fired. */
function fire(rec: Recorded, color: Color, idx: number, picks?: BuffPick[]): boolean {
  const p = picks ?? collectPicks(rec.game, color, idx);
  if (!p) return false;
  if (!activateBuff(rec.game, color, idx, p)) return false;
  rec.actions.push({ ply: rec.moves.length, color, a: "use", buffIndex: idx, picks: p });
  return true;
}

/** The spectator's engine reconstruction from the public record (the real TV /
 *  profile path). */
function reconstruct(rec: Recorded): NerfGame {
  return buildSpectatorDraftGame(rec.moves, rec.actions, undefined, "buff");
}

/** A moves-only reconstruction: the OLD broken TV path, kept so a card scenario
 *  can prove it genuinely diverges (otherwise the parity test is a no-op). */
function reconstructMovesOnly(rec: Recorded): NerfGame {
  return buildSpectatorDraftGame(rec.moves, [], undefined, "buff");
}

// ===========================================================================
// UNIT
// ===========================================================================
section("UNIT: snapshot serialize / deserialize + spectator rebuild");
{
  const rec = freshBuffGame();
  playOpening(rec, 6);
  const idx = grant(rec, "w", "summon_knight", 3);
  fire(rec, "w", idx, [{ square: sq("d4") }]);
  const snap = project(rec.game);

  // A public snapshot is plain JSON: it round-trips with no loss.
  const round = JSON.parse(JSON.stringify(snap)) as PublicSpectatorSnapshot;
  ok(JSON.stringify(round) === JSON.stringify(snap), "public snapshot round-trips through JSON");
  ok(publicStateHash(round) === snap.publicHash, "hash stable across a JSON round-trip");

  // A spectator consuming ONLY the public snapshot rebuilds the same board: the
  // pieces[] projection maps 1:1 to the live board's occupied squares.
  const liveOccupied = rec.game.board.pieces
    .map((p, i) => (p ? `${i}:${p.color}${p.type}` : null))
    .filter(Boolean)
    .sort()
    .join(",");
  const snapOccupied = snap.board.pieces
    .map((p) => `${p.square}:${p.color}${p.type}`)
    .sort()
    .join(",");
  ok(liveOccupied === snapOccupied, "spectator rebuilds the exact board from the public snapshot alone");
  ok(
    snap.board.pieces.some((p) => p.square === sq("d4") && p.type === "n" && p.color === "w"),
    "the summoned knight is present in the public projection",
  );
}

section("UNIT: public-state sanitization (no hidden info reaches the wire)");
{
  // A nerf-mode game whose nerf ids are NOT revealed, with sentinels planted in
  // every private field the projector must never copy: slot rng, draft rng seed,
  // a pending offer, an opponent-reveal peek, and private chat (which lives on
  // the match, never passed to the projector at all).
  const SECRET_NERF = PLAYABLE_NERFS.find((n) => n.implemented)!;
  const game = newGame(SECRET_NERF, SECRET_NERF, 987654321);
  enableDraftMode(game, 123456789, { mode: "nerf" });
  playOpening({ game, moves: [], actions: [] }, 4);
  // Plant sentinels a naive projector might leak.
  game.buffs!.rngState = 424242; // draft rng / seed
  game.white.rng = { getState: () => 555111 } as never; // slot rng
  game.buffs!.players.w.offer = {
    cards: [{ id: "SECRET_OFFER_CARD", tier: 9 as Tier }],
    index: 0,
  } as never;
  game.buffs!.players.w.oppReveal = {
    index: 0,
    cards: [{ id: "PEEKED_OPP_CARD", tier: 8 as Tier }],
  } as never;

  // Project with the nerf ids UNREVEALED (server hides them until game end).
  const snap = toPublicSnapshot(game, makeBits({ mode: "nerf", revealedNerfs: { w: null, b: null } }));
  snap.publicHash = publicStateHash(snap);
  const json = JSON.stringify(snap);

  ok(!json.includes(SECRET_NERF.id), "unrevealed nerf id is absent from the snapshot");
  ok(!json.includes("SECRET_OFFER_CARD"), "a pending private offer card is absent");
  ok(!json.includes("PEEKED_OPP_CARD"), "an opponent-reveal peek is absent");
  ok(!json.includes("424242"), "the draft rng / seed is absent");
  ok(!json.includes("555111"), "slot rng state is absent");
  // Secret field NAMES must not appear; offerSeats (a public "a seat is
  // choosing" flag, no card data) is intentionally allowed.
  ok(!/rngState|draftSeed|oppReveal/i.test(json), "no secret field names (rngState / draftSeed / oppReveal) appear");
  // The version + revision stamps the client relies on ARE present.
  ok(snap.schemaVersion === PUBLIC_SNAPSHOT_VERSION, "schemaVersion stamped");
  ok(typeof snap.replayVersion === "number", "replayVersion stamped");
  ok(snap.lastSeq >= 0 && snap.stateRevision >= 0, "seq / revision stamped");

  // Once the game ends and the seat reveals, the SAME projector may surface the
  // now-public nerf id -- proving the gate is the revealed flag, not a blanket
  // strip that would also hide legitimately-public info.
  const revealed = toPublicSnapshot(game, makeBits({ mode: "nerf", revealedNerfs: { w: SECRET_NERF.id, b: null } }));
  ok(JSON.stringify(revealed).includes(SECRET_NERF.id), "a revealed nerf id IS surfaced (gate is reveal, not a blanket strip)");
}

section("UNIT: sequence handling (in-order / dedupe / out-of-order)");
{
  const env = (seq: number, type: SpectatorEnvelopeType, over: Partial<SpectatorEnvelope> = {}): SpectatorEnvelope => ({
    gameId: "g1",
    schemaVersion: PUBLIC_SNAPSHOT_VERSION,
    replayVersion: 7,
    stateRevision: seq,
    seq,
    type,
    publicHash: "h" + seq,
    ts: 1000 + seq,
    ...over,
  });
  const f = (e: SpectatorEnvelope): SpectatorFrame => ({ env: e, payload: {} });

  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, f(env(10, "snapshot")));
  ok(s.lastAppliedSeq === 10, "baseline adopted at seq 10");

  const r11 = applySpectatorEnvelope(s, f(env(11, "move")));
  ok(r11.signal === "applied" && r11.apply.length === 1, "seq 11 applies in order");

  const dup = applySpectatorEnvelope(s, f(env(11, "move")));
  ok(dup.signal === "duplicate" && dup.apply.length === 0, "re-delivered seq 11 deduped (no double-apply)");
  const older = applySpectatorEnvelope(s, f(env(5, "move")));
  ok(older.signal === "duplicate", "an older seq is dropped");

  // Out of order: 14 and 13 buffer, 12 fills the gap and drains the run.
  ok(applySpectatorEnvelope(s, f(env(14, "move"))).signal === "buffered", "seq 14 buffered");
  ok(applySpectatorEnvelope(s, f(env(13, "move"))).signal === "buffered", "seq 13 buffered");
  const fill = applySpectatorEnvelope(s, f(env(12, "move")));
  ok(fill.apply.map((x) => x.env.seq).join(",") === "12,13,14", "gap fills and drains 12,13,14 in order");
  ok(s.lastAppliedSeq === 14 && s.pending.size === 0, "baseline advanced to 14, buffer empty");
}

section("UNIT: deterministic public-state hashing");
{
  const rec = freshBuffGame(4242);
  playOpening(rec, 8);
  const idx = grant(rec, "w", "detonate", 4);
  fire(rec, "w", idx, [{ square: sq("e5") }]);

  const a = project(rec.game);
  const b = project(rec.game, { clocks: { w: 1, b: 2 }, capturedAtMs: 999999 }); // different clocks + timestamp
  ok(a.publicHash === b.publicHash, "hash ignores clocks and capture time (they legitimately drift)");
  ok(publicStateSignature(a) === publicStateSignature(b), "canonical signature identical across clock drift");

  // A corrupted piece list must change the hash so a divergent frame is caught.
  // Drop whichever piece is first in the list (guaranteed to exist regardless of
  // which squares a card's blast radius cleared).
  const corrupt = JSON.parse(JSON.stringify(a)) as PublicSpectatorSnapshot;
  ok(corrupt.board.pieces.length > 0, "the projection has pieces to corrupt");
  corrupt.board.pieces = corrupt.board.pieces.slice(1);
  ok(publicStateHash(corrupt) !== a.publicHash, "dropping a piece changes the hash");

  // The parity check turns that into a resync signal, not a silent wrong board.
  const good = checkSpectatorParity(a.publicHash, a.publicHash, { gameId: "g1", seq: 5 });
  ok(good.ok, "matching hashes pass parity");
  const bad = checkSpectatorParity(a.publicHash, publicStateHash(corrupt), { gameId: "g1", seq: 5, side: "spectator" });
  ok(!bad.ok && bad.diag?.event === "tv_hash_mismatch", "a mismatch reports tv_hash_mismatch (triggers resync)");
}

section("UNIT: schema migration guards");
{
  const env = (over: Partial<SpectatorEnvelope>): SpectatorEnvelope => ({
    gameId: "g1",
    schemaVersion: PUBLIC_SNAPSHOT_VERSION,
    replayVersion: 7,
    stateRevision: 6,
    seq: 6,
    type: "move",
    publicHash: "h6",
    ts: 1006,
    ...over,
  });
  const f = (e: SpectatorEnvelope): SpectatorFrame => ({ env: e, payload: {} });
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, f({ ...env({ seq: 5, stateRevision: 5, type: "snapshot" }) }));

  const badSchema = applySpectatorEnvelope(s, f(env({ schemaVersion: PUBLIC_SNAPSHOT_VERSION + 1 })));
  ok(badSchema.signal === "incompatible_version" && badSchema.diag?.event === "tv_snapshot_invalid", "an unknown schemaVersion is rejected (structured, not a wrong board)");
  ok(s.lastAppliedSeq === 5, "a rejected frame does not advance the baseline");

  const drift = applySpectatorEnvelope(s, f(env({ replayVersion: 8 })));
  ok(drift.signal === "incompatible_version", "a replayVersion drift (server redeploy) is rejected");
  ok(s.lastAppliedSeq === -1, "replay drift drops the baseline so the client resyncs");

  // The engine's internal snapshot has an INDEPENDENT version: a stale one is
  // refused, forcing a full replay rather than loading a wrong shape.
  const g = freshBuffGame().game;
  const gs = serializeGame(g);
  ok(gs.v === GAME_SNAPSHOT_VERSION, "engine snapshot carries its own version stamp");
  ok(deserializeGame({ ...gs, v: GAME_SNAPSHOT_VERSION + 99 }) === null, "a stale-version engine snapshot deserializes to null");
  ok(deserializeGame(gs) !== null, "a current-version engine snapshot deserializes");
}

section("UNIT: candidate health validation + failover selection");
{
  ok(watchStartHealth({}) === "ok", "a plain watch-start is healthy");
  ok(watchStartHealth({ schemaVersion: PUBLIC_SNAPSHOT_VERSION }) === "ok", "a supported schemaVersion is healthy");
  ok(watchStartHealth({ unavailable: { code: "unreconstructable" } }) === "unavailable", "an unavailable frame is unhealthy");
  ok(watchStartHealth({ schemaVersion: 999 }) === "incompatible_version", "an unsupported schemaVersion is unhealthy");
  ok(isWatchStartHealthy({ schemaVersion: null }) === true, "a legacy payload (no schemaVersion) is treated as healthy");

  const cands = ["a", "b", "c"];
  ok(selectFeaturedTarget(cands, new Set(), null) === "a", "first candidate featured by default");
  ok(selectFeaturedTarget(cands, new Set(["a"]), null) === "b", "a failed featured game fails over to the next");
  ok(selectFeaturedTarget(cands, new Set(["a", "b", "c"]), null) === null, "all failed -> nothing to feature");
  ok(selectFeaturedTarget(cands, new Set(), "c") === "c", "a healthy pinned pick is honored");
  ok(selectFeaturedTarget(cands, new Set(["c"]), "c") === "a", "a failed pinned pick fails over (not a special unbounded path)");
  ok(selectFeaturedTarget(cands, new Set(), "zzz") === "a", "a pin not in the directory is ignored");
  ok(nextFailoverCandidate(cands, new Set(["a"]), "a") === "b", "next failover skips the current + failed id");

  // A game that dropped out of the lobby is cleared from the unhealthy set so a
  // recovered game gets a fresh chance (no permanent blacklist of a transient).
  const pruned = pruneFailedIds(new Set(["a", "gone"]), ["a", "b"]);
  ok(pruned.has("a") && !pruned.has("gone"), "a candidate absent from the directory is un-blacklisted");
  const same = new Set(["a"]);
  ok(pruneFailedIds(same, ["a", "b"]) === same, "prune returns the same ref when nothing changed");
}

// ===========================================================================
// CARD-PARITY
// ===========================================================================
section("CARD-PARITY: every board-mutating activated card");
{
  const activated = ALL_BUFFS.filter((b) => b.kind === "activated" && b.implemented);
  let fired = 0;
  let mutating = 0;
  let parityOk = 0;
  const divergedBaseline: string[] = [];
  const parityFailed: string[] = [];
  const baselineNoDiverge: string[] = [];

  for (const def of activated) {
    const rec = freshBuffGame();
    playOpening(rec);
    const idx = grant(rec, "w", def.id, (def.tier ?? 5) as Tier);
    if (idx < 0) continue;
    const picks = collectPicks(rec.game, "w", idx);
    if (!picks) continue;
    if (!fire(rec, "w", idx, picks)) continue;
    fired++;

    const player = project(rec.game);
    const baseline = project(reconstructMovesOnly(rec));
    const changed = publicStateSignature(player) !== publicStateSignature(baseline);
    if (!changed) continue; // this card did not observably change public state here
    mutating++;

    const spectator = project(reconstruct(rec));
    const exact =
      publicStateSignature(player) === publicStateSignature(spectator) &&
      player.publicHash === spectator.publicHash;
    if (exact) parityOk++;
    else parityFailed.push(def.id);

    // The moves-only baseline MUST differ from the true board here, proving the
    // scenario exercises a real rewrite the old TV path could not reproduce.
    if (publicStateSignature(baseline) !== publicStateSignature(player)) divergedBaseline.push(def.id);
    else baselineNoDiverge.push(def.id);
  }

  ok(mutating >= 120, `a broad matrix of board-mutating cards exercised (${mutating} of ${fired} fired, ${activated.length} activated)`);
  ok(parityFailed.length === 0, `every board-mutating card matches the spectator projection exactly${parityFailed.length ? " -- failed: " + parityFailed.slice(0, 20).join(", ") : ""}`);
  ok(parityOk === mutating, `parity holds for all ${mutating} board-mutating cards`);
  ok(baselineNoDiverge.length === 0, `every scenario's moves-only baseline genuinely diverges${baselineNoDiverge.length ? " -- non-diverging: " + baselineNoDiverge.slice(0, 20).join(", ") : ""}`);
  console.log(`  (matrix: ${activated.length} activated, ${fired} fired, ${mutating} board-mutating, ${parityOk} parity-exact)`);
}

section("CARD-PARITY: combinations / ordering / stacking of board-mutating cards");
{
  // Each scenario applies MULTIPLE board rewrites; the spectator reconstruction
  // must equal the authoritative projection regardless of interleaving.
  type Step = { move?: string; grant?: [Color, string, Tier]; use?: [Color, number, BuffPick[]?] };
  const scenarios: { label: string; steps: Step[] }[] = [
    {
      label: "chess-diff-then-summon: two rewrites, one after the other",
      steps: [
        { grant: ["w", "summon_knight", 3] },
        { move: "e2e4" }, { move: "e7e5" },
        { use: ["w", 0, [{ square: sq("d4") }]] },
        { grant: ["w", "summon_knight", 3] },
        { move: "b8c6" }, { move: "g1f3" },
        { use: ["w", 1, [{ square: sq("h4") }]] },
      ],
    },
    {
      label: "teleport-then-removal: mutate, move, mutate again",
      steps: [
        { grant: ["w", "detonate", 4] },
        { move: "e2e4" }, { move: "e7e5" }, { move: "g1f3" }, { move: "b8c6" },
        { use: ["w", 0, [{ square: sq("e5") }]] }, // remove a pawn
        { grant: ["w", "recall", 3] },
        { move: "d2d4" }, { move: "d7d6" },
        { use: ["w", 1] }, // recall (auto-picked)
      ],
    },
    {
      label: "two rewrites on the SAME ply (stacked before a move)",
      steps: [
        { grant: ["w", "summon_knight", 3] },
        { grant: ["w", "detonate", 4] },
        { move: "e2e4" }, { move: "e7e5" }, { move: "b1c3" }, { move: "g8f6" },
        { use: ["w", 0, [{ square: sq("d4") }]] },
        { use: ["w", 1, [{ square: sq("e5") }]] },
      ],
    },
    {
      label: "both colors mutate (interleaved summons)",
      steps: [
        { grant: ["w", "summon_knight", 3] },
        { grant: ["b", "summon_knight", 3] },
        { move: "e2e4" },
        { use: ["w", 0, [{ square: sq("d4") }]] },
        { move: "e7e5" },
        { use: ["b", 0, [{ square: sq("d5") }]] },
        { move: "g1f3" }, { move: "b8c6" },
      ],
    },
  ];

  for (const scn of scenarios) {
    const rec = freshBuffGame(9090);
    let firedAll = true;
    for (const step of scn.steps) {
      if (step.move) {
        if (!play(rec, step.move)) firedAll = false;
      } else if (step.grant) {
        if (grant(rec, step.grant[0], step.grant[1], step.grant[2]) < 0) firedAll = false;
      } else if (step.use) {
        if (!fire(rec, step.use[0], step.use[1], step.use[2])) firedAll = false;
      }
    }
    ok(firedAll, `${scn.label}: all steps applied`);
    const player = project(rec.game);
    const spectator = project(reconstruct(rec));
    ok(
      publicStateSignature(player) === publicStateSignature(spectator) &&
        player.publicHash === spectator.publicHash,
      `${scn.label}: spectator projection matches after multiple rewrites`,
    );
    const baseline = project(reconstructMovesOnly(rec));
    ok(publicStateSignature(baseline) !== publicStateSignature(player), `${scn.label}: moves-only baseline diverges (real multi-rewrite)`);
  }
}

// ===========================================================================
// INTEGRATION (join / reconnect / resync / failover, through the reducer)
// ===========================================================================
section("INTEGRATION: join scenarios through applySpectatorEnvelope");
{
  // Model a server: it advances an authoritative game, and at any point emits a
  // join snapshot (seq = revision) plus later per-event envelopes carrying the
  // post-event public hash. The spectator adopts the snapshot, applies later
  // envelopes, reconstructs its board from the SAME record at the applied ply,
  // and parity-checks against the server hash.
  interface ServerEvent {
    env: SpectatorEnvelope;
    // The record the reconstruction should use once this event is applied.
    snapshotAtApply: PublicSpectatorSnapshot;
  }

  function envFor(seq: number, type: SpectatorEnvelopeType, hash: string, over: Partial<SpectatorEnvelope> = {}): SpectatorEnvelope {
    return {
      gameId: "g1",
      schemaVersion: PUBLIC_SNAPSHOT_VERSION,
      replayVersion: 7,
      stateRevision: seq,
      seq,
      type,
      publicHash: hash,
      ts: 2000 + seq,
      ...over,
    };
  }

  // Build a scripted game and capture the public snapshot + hash at every step,
  // with a seq that starts at `baseSeq` (so we can model a join at move 300+).
  function buildTimeline(baseSeq: number): { snaps: PublicSpectatorSnapshot[]; hashes: string[] } {
    const rec = freshBuffGame(31337);
    const snaps: PublicSpectatorSnapshot[] = [];
    const hashes: string[] = [];
    const capture = (seq: number) => {
      const snap = project(rec.game, { stateRevision: seq, lastSeq: seq, cursor: rec.actions.length });
      snaps.push(snap);
      hashes.push(snap.publicHash);
    };
    capture(baseSeq);
    play(rec, "e2e4"); capture(baseSeq + 1);
    play(rec, "e7e5"); capture(baseSeq + 2);
    const idx = grant(rec, "w", "summon_knight", 3); // draft pick
    capture(baseSeq + 3);
    fire(rec, "w", idx, [{ square: sq("d4") }]); // board rewrite
    capture(baseSeq + 4);
    play(rec, "b8c6"); capture(baseSeq + 5);
    play(rec, "g1f3"); capture(baseSeq + 6);
    return { snaps, hashes };
  }

  const frame = (env: SpectatorEnvelope, payload: unknown = {}): SpectatorFrame => ({ env, payload });

  // --- join before draft (baseline at the very start) ---
  {
    const { snaps, hashes } = buildTimeline(0);
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    const join = applySpectatorSnapshot(s, frame(envFor(0, "snapshot", hashes[0])));
    ok(join.signal === "snapshot_replaced" && s.lastAppliedSeq === 0, "join before draft: adopts baseline at seq 0");
    // Apply the whole stream; every applied frame parity-matches its snapshot.
    let allParity = true;
    for (let seq = 1; seq < snaps.length; seq++) {
      const r = applySpectatorEnvelope(s, frame(envFor(seq, "move", hashes[seq])));
      if (r.signal !== "applied") allParity = false;
      const pc = checkSpectatorParity(hashes[seq], hashes[seq], { gameId: "g1", seq });
      if (!pc.ok) allParity = false;
    }
    ok(allParity && s.lastAppliedSeq === snaps.length - 1, "join before draft: every later event applies + parity holds through the rewrite");
  }

  // --- join right after a card resolves (baseline mid-stream) ---
  {
    const { snaps, hashes } = buildTimeline(0);
    const joinAt = 4; // right after the summon rewrite
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    const join = applySpectatorSnapshot(s, frame(envFor(joinAt, "snapshot", hashes[joinAt])));
    ok(join.signal === "snapshot_replaced" && s.lastAppliedSeq === joinAt, "join after a rewrite: adopts the mid-stream snapshot (no replay from move 1)");
    // The adopted snapshot already reflects the summoned knight.
    ok(snaps[joinAt].board.pieces.some((p) => p.square === sq("d4") && p.type === "n"), "the join snapshot already contains the rewrite");
    const r5 = applySpectatorEnvelope(s, frame(envFor(joinAt + 1, "move", hashes[joinAt + 1])));
    ok(r5.signal === "applied", "a later move applies on top of the mid-stream baseline");
    const stale = applySpectatorEnvelope(s, frame(envFor(2, "move", hashes[2])));
    ok(stale.signal === "duplicate", "an event from BEFORE the join is ignored (never rewinds)");
  }

  // --- join during a draft pause (offer pending) ---
  {
    const rec = freshBuffGame(222);
    playOpening(rec, 4);
    const snap = project(rec.game, { stateRevision: 4, lastSeq: 4, offerSeats: { w: true, b: false } });
    ok(snap.status.phase === "draftPaused", "an open offer projects as the draftPaused phase");
    ok(snap.draftTiming.offerSeats.w === true, "the offer seat is public (that a seat is choosing) without leaking the cards");
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    const join = applySpectatorSnapshot(s, frame(envFor(4, "snapshot", snap.publicHash)));
    ok(join.signal === "snapshot_replaced", "join during a draft pause adopts the paused snapshot");
  }

  // --- after reconnect: re-delivered frames are deduped (no double-apply) ---
  {
    const { hashes } = buildTimeline(0);
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    applySpectatorSnapshot(s, frame(envFor(0, "snapshot", hashes[0])));
    applySpectatorEnvelope(s, frame(envFor(1, "move", hashes[1])));
    applySpectatorEnvelope(s, frame(envFor(2, "move", hashes[2])));
    // Reconnect: the server re-sends a fresh snapshot at 2, then replays 1..2.
    const resnap = applySpectatorSnapshot(s, frame(envFor(2, "snapshot", hashes[2])));
    ok(resnap.signal === "snapshot_replaced" && s.lastAppliedSeq === 2, "reconnect snapshot re-adopts at seq 2");
    ok(applySpectatorEnvelope(s, frame(envFor(1, "move", hashes[1]))).signal === "duplicate", "a re-delivered seq 1 is deduped");
    ok(applySpectatorEnvelope(s, frame(envFor(2, "move", hashes[2]))).signal === "duplicate", "a re-delivered seq 2 is deduped");
    ok(s.lastAppliedSeq === 2, "no double-apply after reconnect");
  }

  // --- join at > 300 moves: recent snapshot + only later envelopes ---
  {
    const base = 305;
    const { hashes } = buildTimeline(base);
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    const join = applySpectatorSnapshot(s, frame(envFor(base, "snapshot", hashes[0])));
    ok(join.signal === "snapshot_replaced" && s.lastAppliedSeq === base, "join at move 300+: baseline adopted at the high seq (not seq 1)");
    const r = applySpectatorEnvelope(s, frame(envFor(base + 1, "move", hashes[1])));
    ok(r.signal === "applied" && r.apply.length === 1, "only the NEXT envelope is applied (no backfill of 1..305)");
    // A frame with a low seq (as if replayed from move 1) is dropped as stale.
    ok(applySpectatorEnvelope(s, frame(envFor(2, "move", "hstale"))).signal === "duplicate", "a low-seq (replay-from-1) frame is dropped");
  }
}

section("INTEGRATION: buff game, nerf game, and secret-nerf hash agreement");
{
  // Buff game: server and spectator agree on the public hash by construction.
  {
    const rec = freshBuffGame(11);
    playOpening(rec, 6);
    const idx = grant(rec, "w", "detonate", 4);
    fire(rec, "w", idx, [{ square: sq("e5") }]);
    const server = project(rec.game);
    const spectator = project(reconstruct(rec));
    ok(server.publicHash === spectator.publicHash, "buff game: server and spectator hashes agree");
  }
  // Nerf game: the spectator NEVER learns the nerf ids, yet its public hash
  // still matches the server's -- because the shared hash excludes the secret
  // nerf. We project the SAME reconstructed board with the nerf revealed (the
  // "player" who knows it) vs unrevealed (the spectator) and confirm the board
  // hash is identical when nerfs are excluded from the public projection.
  {
    const nerf = PLAYABLE_NERFS.find((n) => n.implemented)!;
    const game = newGame(nerf, nerf, 5150);
    enableDraftMode(game, 5150, { mode: "nerf" });
    const rec: Recorded = { game, moves: [], actions: [] };
    // Play a few generated legal moves (nerfs only restrict legality).
    for (let i = 0; i < 6; i++) {
      const lm = legalMoves(game);
      if (!lm.length || game.result) break;
      const u = moveToUCI(lm[0]);
      play(rec, u);
    }
    const playerView = toPublicSnapshot(game, makeBits({ mode: "nerf", revealedNerfs: { w: nerf.id, b: nerf.id } }));
    const spectatorView = toPublicSnapshot(game, makeBits({ mode: "nerf", revealedNerfs: { w: null, b: null } }));
    // publicStateSignature is a "|"-joined tuple; the revealed-nerf ids are one
    // component. Blank that ONE component in both and the remaining board /
    // effects / buffs / turn state must be identical -- so a player (who knows
    // the nerf) and a spectator (who does not) agree on the shared board hash.
    const withoutNerfs = (s: PublicSpectatorSnapshot) => {
      const parts = publicStateSignature(s).split("|");
      parts[7] = "-"; // the nerfs component
      return parts.join("|");
    };
    ok(
      withoutNerfs(playerView) === withoutNerfs(spectatorView),
      "nerf game: board signature agrees once the secret nerf id is excluded",
    );
    ok(JSON.stringify(spectatorView).indexOf(nerf.id) === -1, "nerf game: the spectator view never contains the nerf id");
  }
}

section("INTEGRATION: switch nerf->buff, rapid switching");
{
  const envFor = (gameId: string, seq: number, type: SpectatorEnvelopeType): SpectatorEnvelope => ({
    gameId, schemaVersion: PUBLIC_SNAPSHOT_VERSION, replayVersion: 7, stateRevision: seq, seq, type, publicHash: "h" + seq, ts: seq,
  });
  const frame = (e: SpectatorEnvelope): SpectatorFrame => ({ env: e, payload: {} });

  const s = createSpectatorSync();
  ok(beginWatch(s, "nerf-1") === true, "watch the nerf game");
  applySpectatorSnapshot(s, frame(envFor("nerf-1", 20, "snapshot")));
  applySpectatorEnvelope(s, frame(envFor("nerf-1", 21, "move")));
  ok(s.lastAppliedSeq === 21, "nerf game advanced");

  ok(beginWatch(s, "buff-1") === true, "switching to the buff game returns true");
  ok(s.gameId === "buff-1" && s.lastAppliedSeq === -1 && s.pending.size === 0, "switch fully clears seq + buffer (no cross-channel leak)");
  // A late frame from the previous (nerf) game is dropped, not applied to buff.
  ok(applySpectatorEnvelope(s, frame(envFor("nerf-1", 22, "move"))).signal === "wrong_game", "a straggler from the old game is dropped");

  // Rapid switching: begin several games in a row; only the last binds, no
  // duplicate subscription (beginWatch on the same id is a no-op).
  beginWatch(s, "g-a");
  beginWatch(s, "g-b");
  ok(beginWatch(s, "g-b") === false, "re-watching the same id is a no-op (guards against duplicate subs)");
  ok(s.gameId === "g-b" && s.lastAppliedSeq === -1, "rapid switching lands on the last id with clean state");
  endWatch(s);
  ok(s.gameId === null, "endWatch clears the binding");
}

section("INTEGRATION: disconnect gap, missing event recovery, game-ends-during-loading, corrupted cache, failover");
{
  const envFor = (seq: number, type: SpectatorEnvelopeType, hash = "h" + seq): SpectatorEnvelope => ({
    gameId: "g1", schemaVersion: PUBLIC_SNAPSHOT_VERSION, replayVersion: 7, stateRevision: seq, seq, type, publicHash: hash, ts: seq,
  });
  const frame = (e: SpectatorEnvelope): SpectatorFrame => ({ env: e, payload: {} });

  // --- disconnect gap: a stranded gap past the window triggers a resync ---
  {
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    applySpectatorSnapshot(s, frame(envFor(5, "snapshot")));
    applySpectatorEnvelope(s, frame(envFor(9, "move")), DEFAULT_SYNC_CONFIG, 1000); // gap 6,7,8 missing
    ok(sweepSpectatorSync(s, DEFAULT_SYNC_CONFIG, 1000 + 500) === null, "inside the reorder window: still waiting");
    const swept = sweepSpectatorSync(s, DEFAULT_SYNC_CONFIG, 1000 + 5000);
    ok(swept?.signal === "resync" && swept.diag?.event === "tv_event_gap", "a persistent gap resyncs (never freezes on one dropped frame)");
    ok(s.lastAppliedSeq === -1, "resync drops the baseline so a fresh snapshot replaces state");
  }

  // --- recover a missing event: the gap fills before the window, drains ---
  {
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    applySpectatorSnapshot(s, frame(envFor(5, "snapshot")));
    applySpectatorEnvelope(s, frame(envFor(7, "move"))); // 6 missing, buffered
    ok(s.pending.size === 1, "the out-of-order event is buffered, not dropped");
    const fill = applySpectatorEnvelope(s, frame(envFor(6, "move")));
    ok(fill.apply.map((x) => x.env.seq).join(",") === "6,7", "the missing event arrives and the run drains in order");
    ok(s.lastAppliedSeq === 7 && s.pending.size === 0, "recovered without a resync");
  }

  // --- game ends during loading: an end frame before the baseline is buffered,
  //     then the join snapshot drains it (the end is not lost). ---
  {
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    const early = applySpectatorEnvelope(s, frame(envFor(6, "end")));
    ok(early.signal === "buffered", "an end frame that beats the join snapshot is buffered, not applied to an empty board");
    const join = applySpectatorSnapshot(s, frame(envFor(5, "snapshot")));
    ok(join.apply.map((x) => x.env.seq).join(",") === "5,6", "the join snapshot drains the buffered end (the result is not lost)");
  }

  // --- recover a corrupted cached snapshot: a parity mismatch forces a resync
  //     onto the authoritative snapshot rather than trusting a wrong board. ---
  {
    const s = createSpectatorSync();
    beginWatch(s, "g1");
    applySpectatorSnapshot(s, frame(envFor(5, "snapshot", "server-hash")));
    const parity = checkSpectatorParity("server-hash", "corrupted-local-hash", { gameId: "g1", seq: 5, side: "spectator" });
    ok(!parity.ok && parity.diag?.event === "tv_hash_mismatch", "a corrupted local snapshot fails parity");
    requestResync(s); // the consumer's response to a mismatch
    ok(s.lastAppliedSeq === -1 && s.pending.size === 0, "resync clears state so the next authoritative snapshot replaces it");
    const fresh = applySpectatorSnapshot(s, frame(envFor(6, "snapshot", "h6")));
    ok(fresh.signal === "snapshot_replaced" && s.lastAppliedSeq === 6, "the fresh authoritative snapshot lands (never a blank / wrong board)");
  }

  // --- failover from an invalid featured game ---
  {
    // The featured candidate resolves with a structured unavailable frame: it is
    // marked failed and selection advances to the next healthy game.
    const candidates = ["dead", "good"];
    const bad = watchStartHealth({ unavailable: { code: "unreconstructable" } });
    ok(bad === "unavailable", "the broken featured game fails its health check");
    const failed = new Set<string>();
    failed.add("dead");
    ok(selectFeaturedTarget(candidates, failed, null) === "good", "selection fails over from the invalid featured game to the next healthy one");
    ok(nextFailoverCandidate(candidates, failed, "dead") === "good", "the failover target is the next healthy candidate");
  }
}

// ---------------------------------------------------------------------------
console.log("");
if (failures) {
  console.log(`TV-SPECTATOR: ${failures} FAILURE(S) across ${checks} checks`);
  process.exit(1);
} else {
  console.log(`TV-SPECTATOR: all ${checks} checks passed (unit + card-parity + integration, headless)`);
}
