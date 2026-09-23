// URL contract for the single-card play stage (/dev/plays?id=...), shared by
// the page and by scripts/polish/card-strip.ts, which builds these URLs.
//
// Pure module: no React, no DOM, no engine state. Everything the stage needs
// to replay one card's play exactly the same way twice is in the URL, so a
// strip captured before a revamp and one captured after it differ only in the
// art.
//
//   id       card id (required for the stage view)
//   sq       cast square, algebraic ("e4"). What the board is told the card
//            was played on (SigPlaySlot.sq); the diff-less lead and every
//            "cast" / "aim" anchored scene stage there.
//   target   comma list of target squares ("e7,d7"). Engine drive: preferred
//            picks, in order. Stage drive: the victim squares of the diff.
//   side     w | b, the caster (default w)
//   view     w | b, the colour at the bottom of the board (default: side)
//   anim     full | fast | off (html[data-anim]; full is the app's "normal")
//   fx       0.5 .. 2, the --fx-dur multiplier (default 1)
//   level    0 .. 4, the effects dial (fxToggle); default leaves it alone (2)
//   drive    auto | engine | stage (default auto: engine when the card can
//            be used here, else the synthetic stage diff; see CardStage)
//   event    play | grant (default play). grant: the card is ACQUIRED by the
//            caster instead of used, which is what a draft pick shows: the
//            entrance beat (and, for an instant, its play, as live)
//   pos      board preset id from the lab (opening, sparse-midgame,
//            promotion-race, bare-kings). Unset: the opening, and when the
//            card has no valid use there the engine drive tries the other
//            presets before falling back to the synthetic diff
//   place    comma list of piece edits applied after the preset:
//            "wQd4" puts a white queen on d4, "-e2" empties e2
//   n        stage drive only: how many default victims to pick (default 3)
//   live     1 = send the board what live surfaces send today (no sq, no
//            caster); default sends both, which is the anchoring contract
//   inplace  1 = engine drive mutates the sandbox IN PLACE and re-renders a
//            shallow copy, which is what the local bot game does (it passes
//            fxBoard={game.board} after an in-place activation). Default
//            clones, as an online update does. Single-shot: reload to replay
//   autoplay 1 = play once the stage is ready (after `delay` ms, default 400)
//   size     board width in px (default 480)
//   bare     1 = hide the page chrome, leaving only the board (for capture)

import type { Color, PieceType, Square } from "@/engine/types";

export type StageAnim = "normal" | "fast" | "off";
export type StageDrive = "auto" | "engine" | "stage";
export type StageEvent = "play" | "grant";

export interface PiecePlace {
  sq: Square;
  piece: { type: PieceType; color: Color } | null;
}

export interface StageParams {
  id: string;
  sq: Square | null;
  targets: Square[];
  side: Color;
  view: Color;
  anim: StageAnim;
  fx: number;
  level: number | null;
  drive: StageDrive;
  event: StageEvent;
  /** null = not named in the URL (the opening, with preset search). */
  pos: string | null;
  place: PiecePlace[];
  n: number;
  live: boolean;
  inplace: boolean;
  autoplay: boolean;
  delay: number;
  size: number;
  bare: boolean;
}

/** "e4" -> 28; anything else -> null (never throws on a bad URL). */
export function sqFromName(raw: string | null | undefined): Square | null {
  if (!raw) return null;
  const m = /^([a-h])([1-8])$/.exec(raw.trim().toLowerCase());
  if (!m) return null;
  return (Number(m[2]) - 1) * 8 + (m[1].charCodeAt(0) - 97);
}

export function sqToName(sq: Square): string {
  return "abcdefgh"[sq % 8] + String(Math.floor(sq / 8) + 1);
}

function color(raw: string | null, dflt: Color): Color {
  return raw === "w" || raw === "b" ? raw : dflt;
}

export function parsePlace(raw: string | null | undefined): PiecePlace[] {
  if (!raw) return [];
  const out: PiecePlace[] = [];
  for (const tok of raw.split(",").map((t) => t.trim()).filter(Boolean)) {
    if (tok.startsWith("-")) {
      const sq = sqFromName(tok.slice(1));
      if (sq != null) out.push({ sq, piece: null });
      continue;
    }
    const m = /^([wb])([pnbrqkPNBRQK])([a-h][1-8])$/.exec(tok);
    if (!m) continue;
    const sq = sqFromName(m[3]);
    if (sq == null) continue;
    out.push({ sq, piece: { color: m[1] as Color, type: m[2].toLowerCase() as PieceType } });
  }
  return out;
}

/** Read the stage parameters from a query string. Unknown or malformed values
 *  fall back to their defaults rather than failing, so a typo still stages
 *  something and the info panel shows what was actually used. */
export function parseStageParams(search: string): StageParams | null {
  const q = new URLSearchParams(search);
  const id = (q.get("id") ?? "").trim();
  if (!id) return null;
  const side = color(q.get("side"), "w");
  const animRaw = (q.get("anim") ?? "full").toLowerCase();
  const anim: StageAnim = animRaw === "off" ? "off" : animRaw === "fast" ? "fast" : "normal";
  const fxRaw = Number(q.get("fx") ?? "1");
  const fx = Number.isFinite(fxRaw) ? Math.max(0.5, Math.min(2, fxRaw)) : 1;
  const levelRaw = q.get("level");
  const levelNum = levelRaw == null ? NaN : Number(levelRaw);
  const driveRaw = q.get("drive");
  const drive: StageDrive = driveRaw === "engine" || driveRaw === "stage" ? driveRaw : "auto";
  const nRaw = Number(q.get("n") ?? "3");
  const sizeRaw = Number(q.get("size") ?? "480");
  const delayRaw = Number(q.get("delay") ?? "400");
  return {
    id,
    sq: sqFromName(q.get("sq")),
    targets: (q.get("target") ?? "")
      .split(",")
      .map((s) => sqFromName(s))
      .filter((s): s is Square => s != null),
    side,
    view: color(q.get("view"), side),
    anim,
    fx,
    level: Number.isInteger(levelNum) && levelNum >= 0 && levelNum <= 4 ? levelNum : null,
    drive,
    event: q.get("event") === "grant" ? "grant" : "play",
    pos: q.get("pos") || null,
    place: parsePlace(q.get("place")),
    n: Number.isInteger(nRaw) && nRaw >= 1 && nRaw <= 16 ? nRaw : 3,
    live: q.get("live") === "1",
    inplace: q.get("inplace") === "1",
    autoplay: q.get("autoplay") === "1",
    delay: Number.isFinite(delayRaw) ? Math.max(0, Math.min(10_000, delayRaw)) : 400,
    size: Number.isFinite(sizeRaw) ? Math.max(200, Math.min(1000, Math.round(sizeRaw))) : 480,
    bare: q.get("bare") === "1",
  };
}

/** The inverse, for links and for the strip script. Only non-default values
 *  are written so a URL reads as what makes it different. */
export function stageQuery(p: Partial<StageParams> & { id: string }): string {
  const q = new URLSearchParams();
  q.set("id", p.id);
  if (p.sq != null) q.set("sq", sqToName(p.sq));
  if (p.targets && p.targets.length) q.set("target", p.targets.map(sqToName).join(","));
  if (p.side && p.side !== "w") q.set("side", p.side);
  if (p.view && p.view !== (p.side ?? "w")) q.set("view", p.view);
  if (p.anim && p.anim !== "normal") q.set("anim", p.anim);
  if (p.fx != null && p.fx !== 1) q.set("fx", String(p.fx));
  if (p.level != null) q.set("level", String(p.level));
  if (p.drive && p.drive !== "auto") q.set("drive", p.drive);
  if (p.event && p.event !== "play") q.set("event", p.event);
  if (p.pos) q.set("pos", p.pos);
  if (p.place && p.place.length) {
    q.set(
      "place",
      p.place.map((e) => (e.piece ? `${e.piece.color}${e.piece.type.toUpperCase()}${sqToName(e.sq)}` : `-${sqToName(e.sq)}`)).join(","),
    );
  }
  if (p.n != null && p.n !== 3) q.set("n", String(p.n));
  if (p.live) q.set("live", "1");
  if (p.inplace) q.set("inplace", "1");
  if (p.autoplay) q.set("autoplay", "1");
  if (p.delay != null && p.delay !== 400) q.set("delay", String(p.delay));
  if (p.size != null && p.size !== 480) q.set("size", String(p.size));
  if (p.bare) q.set("bare", "1");
  return q.toString();
}

// --- Pick preference ----------------------------------------------------------

/** Chebyshev distance between two squares, in cells. */
export function sqDist(a: Square, b: Square): number {
  return Math.max(Math.abs((a % 8) - (b % 8)), Math.abs((a >> 3) - (b >> 3)));
}

/** Distance from the board centre, so an unrequested pick lands mid-board
 *  (where a scene is easiest to read) rather than on the lowest square index,
 *  which is always a corner. Ties break on the square index for determinism. */
function centreScore(sq: Square): number {
  const dx = (sq % 8) - 3.5;
  const dy = (sq >> 3) - 3.5;
  return dx * dx + dy * dy;
}

/**
 * Choose one square from a target step's candidates.
 *
 *  1. The first still-unused requested square that is a legal candidate.
 *  2. Else the candidate nearest the first unused requested square.
 *  3. Else (nothing requested) the candidate nearest the previous pick, so a
 *     multi-pick card groups its targets; the first pick falls back to the
 *     candidate nearest the board centre.
 */
export function preferSquare(
  candidates: readonly Square[],
  requested: readonly Square[],
  used: readonly Square[],
  prev: Square | null,
): Square | null {
  if (candidates.length === 0) return null;
  const fresh = candidates.filter((c) => !used.includes(c));
  const pool = fresh.length ? fresh : [...candidates];
  const want = requested.filter((r) => !used.includes(r));
  for (const r of want) if (pool.includes(r)) return r;
  const byScore = (score: (s: Square) => number) =>
    [...pool].sort((a, b) => score(a) - score(b) || a - b)[0];
  if (want.length) return byScore((s) => sqDist(s, want[0]) * 100 + centreScore(s));
  if (prev != null) return byScore((s) => sqDist(s, prev) * 100 + centreScore(s));
  return byScore(centreScore);
}
