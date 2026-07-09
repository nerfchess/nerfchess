import { cloneBoard, generateMoves } from "@/engine/board";
import { legalMoves, type NerfGame } from "@/engine/game";
import type { Nerf, NerfState, GameContext } from "@/engine/nerf";
import { FILE, inBoard, RANK, SQ, type BoardState, type Color, type Move, type PieceType } from "@/engine/types";

const PROMOTIONS: PieceType[] = ["q", "r", "b", "n"];

function moveKey(move: Move): string {
  return `${move.from}:${move.to}:${move.promotion ?? ""}:${move.captured ?? ""}`;
}

function pushUnique(moves: Move[], move: Move) {
  if (!moves.some((existing) => moveKey(existing) === moveKey(move))) {
    moves.push(move);
  }
}

// Restrictions a queued premove must already respect. The engine's legalMoves
// applies these to its own output; speculative extras (recaptures, empty-
// diagonal pawn captures) are generated outside that pipeline, so the same
// rules are re-imposed here. Mirrors the effect semantics in engine/game.ts
// legalMoves; king captures stay exempt exactly as they are there.
function restrictExtras(
  extras: Move[],
  game: NerfGame,
  me: Color,
  nerf: Nerf | null,
  nerfState: NerfState | null,
  ctx: GameContext | null,
): Move[] {
  let out = extras;
  const bs = game.buffs;
  if (bs) {
    const active = (turns: number | null | undefined) => turns == null || turns > 0;
    const frozen = new Set<number>();
    const walnut = new Set<number>();
    const barredTo = new Set<number>();
    let kingOnly = false;
    let shortLeash = false;
    let pawnHalt = false;
    for (const e of bs.effects) {
      if (e.kind === "freeze" && e.owner === me && active(e.turns)) frozen.add(e.sq);
      else if (e.kind === "walnut" && e.owner === me && active(e.turns)) walnut.add(e.sq);
      else if (e.kind === "king_only" && e.against === me && active(e.turns)) kingOnly = true;
      else if (e.kind === "short_leash" && e.owner === me && active(e.turns)) shortLeash = true;
      else if (e.kind === "no_pawn_advance" && e.against === me && active(e.turns)) pawnHalt = true;
      else if (e.kind === "barred" && e.against === me && active(e.turns)) {
        for (const sq of e.squares) barredTo.add(sq);
      }
    }
    const oneStep = (m: Move) =>
      Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1;
    out = out.filter(
      (m) =>
        !frozen.has(m.from) &&
        (!walnut.has(m.from) || oneStep(m)) &&
        (!kingOnly || m.piece === "k" || m.captured === "k") &&
        (!shortLeash || oneStep(m) || m.captured === "k") &&
        (m.captured === "k" || !barredTo.has(m.to)) &&
        (!pawnHalt || !(m.piece === "p" && FILE(m.from) === FILE(m.to))),
    );
  }
  if (nerf?.filterMoves && nerfState && ctx) {
    try {
      out = nerf.filterMoves(out, nerfState, ctx);
    } catch {}
  }
  return out;
}

// Premove options on a turn-flipped board, STRICT: a move that is illegal
// right now cannot be queued. When `game` is provided the base set is the real
// legalMoves pipeline on a turn-flipped copy (buff-granted movement included,
// nerf filter, freezes, walls, king-only... all applied), so the picker simply
// refuses squares the piece could not go to. Speculative extras stay on top of
// that base so the two premoves that genuinely anticipate the opponent
// (recapturing your own square, a pawn capture onto a currently-empty
// diagonal) remain available, but they too respect the active restrictions.
// Queued premoves are still re-validated at execution, so an anticipated
// capture that never materializes just drops.
export function premoveOptionsFor(
  board: BoardState,
  me: Color,
  nerf: Nerf | null,
  nerfState: NerfState | null,
  ctx: GameContext | null,
  game?: NerfGame | null,
): Move[] {
  let filtered: Move[] | null = null;
  if (game && !game.result) {
    try {
      const flipped: NerfGame = {
        ...game,
        board: { ...cloneBoard(board), turn: me },
      };
      filtered = legalMoves(flipped);
    } catch {
      filtered = null;
    }
  }
  if (!filtered) {
    // No game context (or the engine hiccuped): fall back to the pseudo-legal
    // set through the nerf filter. Premoves must never crash the board.
    const base = generateMoves(board);
    filtered = base;
    if (nerf?.filterMoves && nerfState && ctx) {
      try {
        filtered = nerf.filterMoves(base, nerfState, ctx);
      } catch {
        filtered = base;
      }
    }
  }
  const extras: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p || p.color !== me || p.type === "k") continue;

    const targetFile = FILE(sq);
    const targetRank = RANK(sq);
    const pawnDir = me === "w" ? 1 : -1;
    const pawnFromRank = targetRank - pawnDir;
    const promoRank = me === "w" ? 7 : 0;
    for (const df of [-1, 1]) {
      const pawnFromFile = targetFile + df;
      if (!inBoard(pawnFromFile, pawnFromRank)) continue;
      const from = SQ(pawnFromFile, pawnFromRank);
      const pawn = board.pieces[from];
      if (!pawn || pawn.color !== me || pawn.type !== "p") continue;
      const base: Move = {
        from,
        to: sq,
        piece: "p",
        color: me,
        captured: p.type,
        capturedSquare: sq,
      };
      if (targetRank === promoRank) {
        for (const promotion of PROMOTIONS) {
          pushUnique(extras, { ...base, promotion });
        }
      } else {
        pushUnique(extras, base);
      }
    }

    const tmp = cloneBoard(board);
    tmp.pieces[sq] = null;
    const all = generateMoves(tmp);
    for (const m of all) {
      if (m.to !== sq) continue;
      if (m.piece === "p" && FILE(m.from) === FILE(m.to)) continue;
      pushUnique(extras, { ...m, captured: p.type, capturedSquare: sq });
    }
  }

  // Speculative pawn captures: offer a pawn's forward-diagonal squares as
  // premove targets even when EMPTY, so a player can pre-capture a piece they
  // expect to land there. Enemy-occupied diagonals are already legal in `base`
  // and own-piece diagonals are the recapture case handled above; this fills
  // in the empty squares. Re-validation at execution fires it only if a real
  // capture exists then (a pawn cannot legally move diagonally onto an empty
  // square), so an anticipated capture that never materializes just drops.
  for (let sq = 0; sq < 64; sq++) {
    const pawn = board.pieces[sq];
    if (!pawn || pawn.color !== me || pawn.type !== "p") continue;
    const dir = me === "w" ? 1 : -1;
    const toRank = RANK(sq) + dir;
    if (toRank < 0 || toRank > 7) continue;
    const promoRank = me === "w" ? 7 : 0;
    for (const df of [-1, 1]) {
      const toFile = FILE(sq) + df;
      if (!inBoard(toFile, toRank)) continue;
      const to = SQ(toFile, toRank);
      if (board.pieces[to]) continue; // enemy/own diagonals handled elsewhere
      const mv: Move = { from: sq, to, piece: "p", color: me };
      if (toRank === promoRank) {
        for (const promotion of PROMOTIONS) pushUnique(extras, { ...mv, promotion });
      } else {
        pushUnique(extras, mv);
      }
    }
  }

  // Speculative extras obey the same board restrictions the base set already
  // went through, so a frozen piece (or a king-only turn, a walled square...)
  // cannot be premoved even speculatively.
  const constrained = game ? restrictExtras(extras, game, me, nerf, nerfState, ctx) : extras;

  const out = [...filtered];
  for (const m of constrained) pushUnique(out, m);
  return out;
}
