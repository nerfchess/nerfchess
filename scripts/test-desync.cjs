// Zero-dependency desync harness. Run after `npm run server:build`.
//
//   npm run test:desync
//
// Part 1 verifies the telemetry fingerprint (deterministic, order-independent
// over the legal move list, changes when the position changes, and
// compareFingerprints flags real divergences).
//
// Part 2 simulates a server-authoritative Draft game against a client replica
// wired the way the worker + draftOnline wire them: the replica sees the
// opponent's picks masked (tier-only placeholders), learns identities through
// the same reveal rules the worker uses (instants at pick, activations at
// use, passives whose hooks observably fire via the pre-move dtState), and
// merges the filtered draft state after every settled action. Each scenario
// asserts the replica's BOARD (which no dtState frame can repair) stays
// byte-identical to the server's through board-mutating cards:
//   - an activated removal (Detonate) mid-game,
//   - a hidden passive detonation (Detonation Field) firing on a capture,
//     plus a legacy-replica control proving the reveal is what saves it,
//   - a summon + capture + revive sequence (captured-pool coherence),
//   - stale en-passant targets after instant removals and turn-consuming
//     teleports (the phantom en passant guard).

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  newGameAsColor,
  playMove,
} = load("game.js");
const { moveFromUCI, moveToUCI, positionKey } = load("board.js");
const { BUFF_BY_ID } = load("buffs/library.js");
const { ALL_NERFS } = load("nerfs/library.js");
const {
  desyncFingerprint,
  legalMovesSignature,
  compareFingerprints,
  activeRuleIds,
  fnv1a,
} = load("desync.js");

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);

// ---------------------------------------------------------------------------
// Part 1: fingerprint core.
// ---------------------------------------------------------------------------

const nerf = ALL_NERFS.find((n) => n.implemented) || ALL_NERFS[0];
const g0 = newGameAsColor(nerf, "w", 12345);

const fpA = desyncFingerprint(g0);
const fpB = desyncFingerprint(g0);
check(fpA.hash === fpB.hash, "fingerprint not deterministic for the same game");
check(/^[0-9a-f]{8}$/.test(fpA.hash), `hash is not 8 hex chars: ${fpA.hash}`);

const moves = legalMoves(g0);
const shuffled = [...moves].reverse();
check(
  legalMovesSignature(moves) === legalMovesSignature(shuffled),
  "legalMovesSignature is order dependent",
);

const g1 = playMove(g0, moves[0]);
const fp1 = desyncFingerprint(g1);
check(fp1.hash !== fpA.hash, "fingerprint did not change after a move");

const same = compareFingerprints(fpA, fpB);
check(same.ok === true, "compareFingerprints marked identical states as diverged");
const diff = compareFingerprints(fpA, fp1);
check(diff.ok === false, "compareFingerprints missed a real divergence");
check(diff.diverged.pos === true, "divergence did not flag a position change");

const rules = activeRuleIds(g0);
check(
  rules.some((r) => r.startsWith("w:")) && rules.some((r) => r.startsWith("b:")),
  "activeRuleIds is missing a nerf id",
);

check(fnv1a("abc") === fnv1a("abc"), "fnv1a not stable");
check(fnv1a("abc") !== fnv1a("abd"), "fnv1a collided on trivially different input");

// ---------------------------------------------------------------------------
// Part 2: server vs client-replica simulation for draft games.
// ---------------------------------------------------------------------------

const clone = (x) => JSON.parse(JSON.stringify(x));

// The worker's static reveal rules: instants show their effect at pick, and a
// passive opponent-move filter is felt (and painted) from the moment it is
// drafted, so both go out unmasked (see isBuffRevealed in worker.ts).
function isRevealedStatic(def) {
  return !!def && (def.kind === "instant" || (def.kind === "passive" && !!def.filterOpponentMoves));
}

function requireCard(id) {
  const def = BUFF_BY_ID[id];
  if (!def || !def.implemented) throw new Error(`harness card missing or unimplemented: ${id}`);
  return def;
}

// A duel: the authoritative server game plus black's replica of it. `legacy`
// models the pre-fix worker (no init-fire or hook-fire reveals) for negative
// controls.
function newDuel(seed, opts = {}) {
  const server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(server, seed, { mode: "buff" });
  const replica = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  // Placeholder seed, like the client: replica offer rolls are discarded.
  enableDraftMode(replica, 1, { mode: "buff" });
  return { server, replica, viewer: "b", revealed: new Set(), legacy: !!opts.legacy };
}

// The dtState round-trip: draftStateFor's per-seat masking merged back with
// mergeDraftState. Never touches the board: that is the whole point of these
// scenarios.
function syncDraftState(env) {
  const sbs = env.server.buffs;
  const rbs = env.replica.buffs;
  rbs.cadence = sbs.cadence;
  rbs.effects = clone(sbs.effects);
  rbs.extraMoves = { ...sbs.extraMoves };
  rbs.skips = { ...sbs.skips };
  rbs.chainKingGuard = sbs.chainKingGuard;
  if (sbs.historyDiverged) rbs.historyDiverged = true;
  for (const color of ["w", "b"]) {
    const sps = sbs.players[color];
    const rps = rbs.players[color];
    rps.buffs = sps.buffs.map((b) => {
      const def = BUFF_BY_ID[b.id];
      const open =
        color === env.viewer ||
        (env.legacy
          ? !!def && def.kind === "instant"
          : env.revealed.has(b) || isRevealedStatic(def));
      return open
        ? clone(b)
        : {
            id: "",
            tier: b.tier,
            state: {},
            ...(b.spent ? { spent: true } : {}),
            ...(b.nullified ? { nullified: true } : {}),
          };
    });
    rps.draftsTaken = sps.draftsTaken;
    rps.nextDraftAt = sps.nextDraftAt;
    rps.offer = color === env.viewer ? clone(sps.offer) : null;
    if (color === env.viewer) rps.flags = clone(sps.flags);
    if (sps.nerfRemoved) rps.nerfRemoved = true;
    rps.revived = clone(sps.revived);
  }
}

// A resolved pick (dtResolved): the server acquires for real; the replica
// acquires revealed cards and pushes an inert placeholder for masked ones.
// Mirrors resolveDraftPick's init-fire reveal: a pick whose init touched the
// board or effects goes out unmasked.
function opPick(env, color, id, tier) {
  const def = requireCard(id);
  const sbs = env.server.buffs;
  const effectsBefore = sbs.effects.length;
  const mutationsBefore = sbs.mutations || 0;
  acquireBuff(env.server, color, id, tier);
  const inst = sbs.players[color].buffs[sbs.players[color].buffs.length - 1];
  const initFired =
    sbs.effects.length !== effectsBefore || (sbs.mutations || 0) !== mutationsBefore;
  if (initFired && !env.legacy) env.revealed.add(inst);
  const open =
    color === env.viewer ||
    (env.legacy ? def.kind === "instant" : isRevealedStatic(def) || env.revealed.has(inst));
  if (open) acquireBuff(env.replica, color, id, tier);
  else env.replica.buffs.players[color].buffs.push({ id: "", tier, state: {} });
  syncDraftState(env);
}

// A buff use (dtUsed): identity goes public on use, both sides run the same
// activateBuff, then the settle dtState round-trip.
function opUse(env, color, buffIndex, picks) {
  const inst = env.server.buffs.players[color].buffs[buffIndex];
  const ok = activateBuff(env.server, color, buffIndex, picks);
  env.revealed.add(inst);
  const rinst = env.replica.buffs.players[color].buffs[buffIndex];
  if (rinst && !rinst.id) {
    rinst.id = inst.id;
    rinst.tier = inst.tier;
  }
  const rok = activateBuff(env.replica, color, buffIndex, picks);
  syncDraftState(env);
  return ok && rok;
}

// An accepted move. Mirrors commitMove: the server plays first; if a hidden
// passive's hook observably fired, the replica receives its identity plus
// PRE-move state (the pre-move dtState frame) before applying the move, so
// its own playMove replays the same mutation. Fresh replica offer rolls are
// discarded like playReplicaMove does.
function opMove(env, uci) {
  const pre = clone(env.server.buffs);
  const smove = legalMoves(env.server).find((m) => moveToUCI(m) === uci);
  if (!smove) throw new Error(`server move not legal: ${uci}`);
  playMove(env.server, smove);
  if (!env.legacy) {
    for (const f of env.server.buffs.lastHookMutations || []) {
      const inst = env.server.buffs.players[f.color].buffs[f.index];
      if (env.revealed.has(inst)) continue;
      env.revealed.add(inst);
      const rinst = env.replica.buffs.players[f.color].buffs[f.index];
      const preInst = pre.players[f.color].buffs[f.index];
      if (rinst && !rinst.id && preInst) {
        rinst.id = preInst.id;
        rinst.tier = preInst.tier;
        rinst.state = preInst.state;
        if (preInst.spent) rinst.spent = true;
        if (preInst.nullified) rinst.nullified = true;
      }
    }
  }
  const offersBefore = {
    w: env.replica.buffs.players.w.offer,
    b: env.replica.buffs.players.b.offer,
  };
  const rmove =
    legalMoves(env.replica).find((m) => moveToUCI(m) === uci) ??
    moveFromUCI(env.replica.board, uci);
  if (!rmove) throw new Error(`replica cannot build move: ${uci}`);
  playMove(env.replica, rmove);
  for (const c of ["w", "b"]) {
    if (env.replica.buffs.players[c].offer !== offersBefore[c]) {
      env.replica.buffs.players[c].offer = null;
    }
  }
}

function assertConverged(env, label) {
  check(
    positionKey(env.server.board) === positionKey(env.replica.board),
    `${label}: replica board diverged from the server`,
  );
  check(
    JSON.stringify(env.server.captured) === JSON.stringify(env.replica.captured),
    `${label}: capture pools diverged`,
  );
  const cmp = compareFingerprints(desyncFingerprint(env.replica), desyncFingerprint(env.server));
  check(cmp.ok, `${label}: fingerprints diverged (${JSON.stringify(cmp.diverged)})`);
}

// --- Scenario 1: activated removal (Detonate) mid-game ----------------------
{
  const env = newDuel(101);
  opPick(env, "w", "detonate", 4); // masked at pick (activated)
  opMove(env, "e2e4");
  opMove(env, "e7e5");
  check(opUse(env, "w", 0, [{ square: sq("e4") }]), "detonate: activation failed");
  check(!env.server.board.pieces[sq("e4")], "detonate: server e4 pawn survived");
  check(!env.server.board.pieces[sq("e5")], "detonate: server e5 pawn survived the blast");
  check(env.server.board.turn === "b", "detonate: activation did not consume the turn");
  check(env.server.buffs.historyDiverged === true, "detonate: historyDiverged not set");
  check(env.replica.buffs.historyDiverged === true, "detonate: replica historyDiverged not set");
  assertConverged(env, "detonate");
}

// --- Scenario 2: hidden passive detonation fires on a capture ---------------
{
  const env = newDuel(202);
  opPick(env, "w", "detonation_field", 6); // passive, masked at pick
  opMove(env, "e2e4");
  opMove(env, "e7e5");
  opMove(env, "d1h5");
  opMove(env, "b8c6");
  opMove(env, "h5f7"); // Qxf7: the capture detonates g8/f8/g7 on the server
  const fired = env.server.buffs.lastHookMutations || [];
  check(
    fired.some((f) => f.color === "w" && f.index === 0),
    "detonation_field: engine did not log the fired hook",
  );
  check(!env.server.board.pieces[sq("g8")], "detonation_field: server g8 survived the blast");
  check(!env.server.board.pieces[sq("f8")], "detonation_field: server f8 survived the blast");
  check(!env.server.board.pieces[sq("g7")], "detonation_field: server g7 survived the blast");
  check(!!env.server.board.pieces[sq("e8")], "detonation_field: the king must survive");
  assertConverged(env, "detonation_field");

  // Negative control: a legacy replica (no fire-time reveal) MUST diverge
  // here; this is exactly the desync the reveal fixes.
  const legacy = newDuel(202, { legacy: true });
  opPick(legacy, "w", "detonation_field", 6);
  for (const u of ["e2e4", "e7e5", "d1h5", "b8c6", "h5f7"]) opMove(legacy, u);
  check(
    positionKey(legacy.server.board) !== positionKey(legacy.replica.board),
    "legacy control: masked passive detonation unexpectedly stayed in sync",
  );
}

// --- Scenario 3: summon + capture + revive (captured-pool coherence) --------
{
  const env = newDuel(303);
  opPick(env, "w", "summon_knight", 3);
  check(opUse(env, "w", 0, [{ square: sq("d4") }]), "summon: activation failed");
  check(env.server.board.pieces[sq("d4")]?.type === "n", "summon: no knight on d4");
  opMove(env, "e7e5");
  opMove(env, "a2a3");
  opMove(env, "e5d4"); // black captures the summoned knight
  check(env.server.captured.b.n === 1, "summon: captured pool missed the knight");
  check(env.replica.captured.b.n === 1, "summon: replica captured pool missed the knight");
  opPick(env, "w", "resurrect", 4);
  check(opUse(env, "w", 1, [{ square: sq("c3") }]), "revive: activation failed");
  check(env.server.board.pieces[sq("c3")]?.type === "n", "revive: knight did not return");
  check(env.server.buffs.players.w.revived.n === 1, "revive: server revived pool not deducted");
  check(env.replica.buffs.players.w.revived.n === 1, "revive: replica revived pool not deducted");
  assertConverged(env, "summon+revive");
}

// --- Scenario 4: stale en passant after board-mutating cards ----------------
{
  // 4a: an instant removal deletes the double-stepped pawn; the stale ep
  // target must not yield a phantom capture on either side.
  const env = newDuel(404);
  opMove(env, "e2e4");
  opMove(env, "a7a6");
  opMove(env, "e4e5");
  opMove(env, "d7d5"); // ep target d6, exd6 available
  check(
    legalMoves(env.server).some((m) => moveToUCI(m) === "e5d6"),
    "ep: en passant should be available before the removal",
  );
  opPick(env, "w", "cataclysm", 6); // instant: clears every black pawn
  check(!env.server.board.pieces[sq("d5")], "ep: cataclysm left the d5 pawn");
  check(
    !legalMoves(env.server).some((m) => moveToUCI(m) === "e5d6"),
    "ep: server still offers a phantom en passant capture",
  );
  check(
    !legalMoves(env.replica).some((m) => moveToUCI(m) === "e5d6"),
    "ep: replica still offers a phantom en passant capture",
  );
  assertConverged(env, "ep-cataclysm");

  // 4b: a turn-consuming relocate clears the ep target on the handover.
  const env2 = newDuel(405);
  opMove(env2, "e2e4");
  opMove(env2, "a7a6");
  opMove(env2, "e4e5");
  opMove(env2, "d7d5");
  opPick(env2, "w", "warp_field", 4);
  check(
    opUse(env2, "w", 0, [{ square: sq("d1") }, { square: sq("e2") }]),
    "ep: warp_field activation failed",
  );
  check(env2.server.board.pieces[sq("e2")]?.type === "q", "ep: queen did not teleport");
  check(env2.server.board.epTarget === null, "ep: server kept a stale ep target after the buff turn");
  check(env2.replica.board.epTarget === null, "ep: replica kept a stale ep target after the buff turn");
  assertConverged(env2, "ep-warp");
}

// --- makeMove no-op guard: refused moves must not tick anything -------------
{
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 7);
  const before = positionKey(g.board);
  playMove(g, { from: sq("a3"), to: sq("a4"), piece: "p", color: "w" }); // empty origin
  check(g.board.history.length === 0, "no-op guard: refused move entered history");
  check(g.board.turn === "w", "no-op guard: refused move flipped the turn");
  check(positionKey(g.board) === before, "no-op guard: refused move changed the board");
  playMove(g, { from: sq("a3"), to: sq("a4"), piece: "p", color: "w", captured: "p" });
  check(
    g.captured.w.p === 0,
    "no-op guard: refused move still counted a capture (revive pools would corrupt)",
  );
}

// ---------------------------------------------------------------------------
// Part 3: turn/ply authority — a dropped or same-ply-diverged move frame must
// never leave the two clients disagreeing on whose turn it is. This mirrors
// OnlineMatch's move-frame guards:
//   (a) a ply that does not follow the local ply forces a resync (the server
//       stamps each move with its post-move ply);
//   (b) a post-move position hash that differs from the server's forces a
//       resync (positionKey includes the side to move, so this also catches a
//       turn that drifted at the same ply — e.g. a draft off-parity turn).
// In both cases the fix is to rebuild from the server's authoritative move
// list, which restores the correct side to move.
// ---------------------------------------------------------------------------

// The server's per-move wire frame: post-move ply plus the authoritative
// position fingerprint (fnv1a(positionKey)), exactly as commitMove ships them.
function serverMoveFrame(server, uci) {
  const mv = legalMoves(server).find((m) => moveToUCI(m) === uci);
  if (!mv) throw new Error(`server move not legal: ${uci}`);
  playMove(server, mv);
  return { u: uci, ply: server.board.history.length, f: fnv1a(positionKey(server.board)) };
}

// The component's move-frame handler distilled to the sync-relevant path.
// Returns { resync: reason|null }. The fingerprint compare runs on a clone so a
// rejected frame leaves the replica untouched (the component returns before
// applyGame), then the accepted case commits to the real replica.
function handleMoveFrame(replica, frame) {
  // Guard 1 (ply): the frame must be exactly one ahead of us. Otherwise a
  // frame was missed or duplicated and board.turn has drifted from the server.
  if (frame.ply !== replica.board.history.length + 1) {
    return { resync: `ply ${frame.ply} != local ${replica.board.history.length + 1}` };
  }
  const trial = clone(replica);
  let lm =
    legalMoves(trial).find((m) => moveToUCI(m) === frame.u) || moveFromUCI(trial.board, frame.u);
  if (!lm) return { resync: `unreproducible ${frame.u}` };
  playMove(trial, lm);
  // Guard 2 (position/turn hash): our post-move position must match the
  // server's authoritative hash, side-to-move included.
  if (frame.f && fnv1a(positionKey(trial.board)) !== frame.f) {
    return { resync: `hash mismatch at ply ${frame.ply}` };
  }
  const move =
    legalMoves(replica).find((m) => moveToUCI(m) === frame.u) || moveFromUCI(replica.board, frame.u);
  playMove(replica, move);
  return { resync: null };
}

// A resync: the server replays the full move list into a fresh start frame and
// the client rebuilds from it (buildGameFromStart). Modelled by replaying the
// server's authoritative move history from the initial position.
function resyncReplica(server, seed) {
  const rebuilt = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  for (const uci of server.board.history.map(moveToUCI)) {
    const m = legalMoves(rebuilt).find((x) => moveToUCI(x) === uci) || moveFromUCI(rebuilt.board, uci);
    if (!m) throw new Error(`resync cannot replay ${uci}`);
    playMove(rebuilt, m);
  }
  return rebuilt;
}

// 3a: a dropped move frame leaves the replica behind the server. The next
// frame's ply guard must catch the gap and, crucially, must NOT silently apply
// the incoming move onto the stale board (the pre-fix path could, landing the
// replica on a wrong turn). A resync then converges turn and position.
{
  const seed = 555;
  const server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  let replica = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);

  // Move 1 (white e2e4): the replica DROPS this frame (never applies it).
  serverMoveFrame(server, "e2e4");
  check(
    positionKey(replica.board) !== positionKey(server.board),
    "turn-sync 3a: replica should be behind the server after dropping a frame",
  );

  // Move 2 (black e7e5): the frame arrives, now a ply ahead of the replica.
  const f2 = serverMoveFrame(server, "e7e5");
  const r2 = handleMoveFrame(replica, f2);
  check(r2.resync !== null, "turn-sync 3a: ply guard missed the dropped-frame gap");
  // The rejected frame must leave the replica untouched — no silent mis-apply
  // onto the stale board (which is how a wrong turn used to stick).
  check(
    replica.board.history.length === 0,
    "turn-sync 3a: a resync-triggering frame must not advance the replica",
  );

  // The resync restores the authoritative side to move (and position).
  replica = resyncReplica(server, seed);
  check(
    replica.board.turn === server.board.turn,
    "turn-sync 3a: resync did not restore the server's side to move",
  );
  check(
    positionKey(replica.board) === positionKey(server.board),
    "turn-sync 3a: resync did not restore the server's position",
  );
}

// 3b: a replica that silently diverged earlier sits at the RIGHT ply but a
// wrong position. The ply guard cannot see it; the fingerprint guard must.
{
  const seed = 666;
  const server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  let replica = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);

  // Server plays e2e4 (ply 1). The replica already drifted: it holds d2d4
  // instead (a prior silent divergence), same ply, same side to move.
  serverMoveFrame(server, "e2e4");
  playMove(replica, legalMoves(replica).find((m) => moveToUCI(m) === "d2d4"));
  check(replica.board.history.length === 1, "turn-sync 3b: replica should be at ply 1");
  check(replica.board.turn === server.board.turn, "turn-sync 3b: ply-1 turns should match by parity");

  // Server plays e7e5 (ply 2). Its fingerprint describes an e4/e5 board; the
  // replica applying e7e5 onto its d4/e5 board hashes differently.
  const f2 = serverMoveFrame(server, "e7e5");
  const r = handleMoveFrame(replica, f2);
  check(r.resync !== null, "turn-sync 3b: fingerprint guard missed the same-ply board drift");
  check(/hash/.test(r.resync), `turn-sync 3b: expected a hash-mismatch resync, got ${r.resync}`);

  // The resync converges the replica back onto the server's board.
  replica = resyncReplica(server, seed);
  check(
    positionKey(replica.board) === positionKey(server.board),
    "turn-sync 3b: resync did not converge the position",
  );
}

// 3d: the pure whose-turn case. Two replicas at the SAME position but with a
// different side to move (a draft turnColor drift can produce this at equal
// ply) must hash differently, so the server's per-move fingerprint can never
// certify a client that is on the wrong turn. This is the invariant the
// fingerprint guard leans on to keep both clients agreeing on whose turn it is.
{
  const seed = 888;
  const a = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  for (const uci of ["e2e4", "e7e5"]) {
    const m = legalMoves(a).find((x) => moveToUCI(x) === uci);
    playMove(a, m);
  }
  const b = clone(a);
  b.board.turn = b.board.turn === "w" ? "b" : "w"; // same pieces, wrong turn
  check(
    positionKey(a.board) !== positionKey(b.board),
    "turn-sync 3d: side to move must be part of positionKey",
  );
  check(
    fnv1a(positionKey(a.board)) !== fnv1a(positionKey(b.board)),
    "turn-sync 3d: the move fingerprint must distinguish whose turn it is",
  );
}

// 3c: a clean lockstep frame must NOT resync (the guards do not false-fire).
{
  const seed = 777;
  const server = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  const replica = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  for (const uci of ["e2e4", "e7e5", "g1f3", "b8c6"]) {
    const frame = serverMoveFrame(server, uci);
    const r = handleMoveFrame(replica, frame);
    check(r.resync === null, `turn-sync 3c: lockstep frame ${uci} spuriously resynced (${r.resync})`);
    check(
      replica.board.turn === server.board.turn,
      `turn-sync 3c: turns diverged after lockstep ${uci}`,
    );
  }
  check(
    positionKey(replica.board) === positionKey(server.board),
    "turn-sync 3c: lockstep replay diverged from the server",
  );
}

if (errors.length) {
  console.error("desync harness FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `OK: desync harness passed (fingerprint core, sample hash ${fpA.hash}, ${rules.length} rule ids; ` +
    `4 server-vs-replica scenarios + legacy divergence control + no-op guard + 4 turn/ply guards)`,
);
