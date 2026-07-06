// Desync telemetry core.
//
// NerfChess is authoritative on the server (a single Durable Object), but the
// client also runs the same engine to show legal moves and animate. When the
// two disagree (a nerf or hex filter applied on one side and not the other, a
// buff effect that ticked differently, a replay divergence) the game "desyncs"
// and trust evaporates. These are pure functions with no engine mutation, so
// both sides can compute an identical short fingerprint from the same game and
// compare a single token instead of shipping whole boards and move lists.
//
// Wiring (see the PR notes): the server attaches desyncFingerprint(game).hash
// to the state it already sends each client; the client recomputes the
// fingerprint from the state it rendered and, on a hash mismatch, reports the
// two hashes plus the `rules` list (which names the handicaps and effects most
// likely responsible) to a lightweight endpoint. Real traffic then names the
// culprit rule instead of us hunting blind.

import { moveToUCI, positionKey } from "./board";
import { legalMoves, NerfGame } from "./game";
import { Move } from "./types";

/** Deterministic 32-bit FNV-1a hash as an 8-char hex string. Same input gives
 * the same output on the client and the server (plain integer math, no deps),
 * so the two can compare one short token. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Canonical, order-independent signature of a legal-move list. Sorted so two
 * engines that generate the same set of moves in a different order still agree.
 * Captures and buff-granted moves (via) are encoded so a move that changed only
 * in those flags still shows as a divergence. */
export function legalMovesSignature(moves: Move[]): string {
  return moves
    .map((m) => moveToUCI(m) + (m.captured ? "x" : "") + (m.via ? "@" + m.via : ""))
    .sort()
    .join(",");
}

/** The handicaps and board effects currently in play, as stable ids. On a
 * divergence this is the short list of likely culprits: both nerfs, every
 * active board effect kind, and each side's unspent held buffs. Sorted for a
 * stable fingerprint. */
export function activeRuleIds(game: NerfGame): string[] {
  const ids: string[] = [`w:${game.white.nerf.id}`, `b:${game.black.nerf.id}`];
  const bs = game.buffs;
  if (bs) {
    for (const e of bs.effects) ids.push(`fx:${e.kind}`);
    for (const c of ["w", "b"] as const) {
      for (const inst of bs.players[c].buffs) {
        if (!inst.spent && !inst.nullified) ids.push(`${c}buff:${inst.id}`);
      }
    }
  }
  return ids.sort();
}

export interface DesyncFingerprint {
  /** Placement, side to move, castling rights, en passant target. */
  pos: string;
  /** FNV-1a of the sorted legal-move signature. */
  moves: string;
  /** Active nerf / hex / effect / held-buff ids: the likely culprits. */
  rules: string[];
  /** FNV-1a over pos + moves + rules: the single token the two sides compare. */
  hash: string;
}

/** Full fingerprint of a game's authoritative state for desync telemetry. */
export function desyncFingerprint(game: NerfGame): DesyncFingerprint {
  const pos = positionKey(game.board);
  const moves = fnv1a(legalMovesSignature(legalMoves(game)));
  const rules = activeRuleIds(game);
  const hash = fnv1a(pos + "|" + moves + "|" + rules.join(","));
  return { pos, moves, rules, hash };
}

/** A client/server comparison result, ready to log or beacon. `ok` short
 * circuits the common (matching) case so callers only report real divergences.
 * The two fingerprints are kept so a report can show exactly what differed. */
export interface DesyncCheck {
  ok: boolean;
  clientHash: string;
  serverHash: string;
  /** Which of the sub-parts diverged, to narrow the cause. */
  diverged: { pos: boolean; moves: boolean; rules: boolean };
  /** The union of rule ids either side had active: the culprit shortlist. */
  rules: string[];
}

/** Compare a fingerprint the client computed against the server's. Returns a
 * compact result; when `ok` is false the caller should report it. */
export function compareFingerprints(
  client: DesyncFingerprint,
  server: DesyncFingerprint,
): DesyncCheck {
  const diverged = {
    pos: client.pos !== server.pos,
    moves: client.moves !== server.moves,
    rules: client.rules.join(",") !== server.rules.join(","),
  };
  const ok = client.hash === server.hash;
  const rules = Array.from(new Set([...client.rules, ...server.rules])).sort();
  return { ok, clientHash: client.hash, serverHash: server.hash, diverged, rules };
}
