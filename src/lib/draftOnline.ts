import type { BuffInstance, BuffMatchState, DraftMode } from "@/engine/buff";
import { moveFromUCI, moveToUCI } from "@/engine/board";
import {
  NerfGame,
  acquireBuff,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
  resolveDiffFlag,
} from "@/engine/game";
import type { Nerf, Tier } from "@/engine/nerf";
import type { Color, Move } from "@/engine/types";
import type { MPDraftAction, MPDraftCard, MPDraftState, MPHiddenCard } from "@/lib/multiplayer";

// A masked card in the local replica: a BuffInstance-shaped placeholder with
// an empty id. Every engine hook looks defs up by id and skips unknown ones,
// so placeholders are inert; the dock renders them face-down (tier only).
export function isHiddenBuff(inst: BuffInstance | MPHiddenCard): inst is MPHiddenCard {
  return "hidden" in inst && inst.hidden === true;
}

export function hiddenPlaceholder(card: MPHiddenCard): BuffInstance {
  return {
    id: "",
    tier: card.tier as Tier,
    state: {},
    ...(card.spent ? { spent: true } : {}),
    ...(card.nullified ? { nullified: true } : {}),
  };
}

// ---------------------------------------------------------------------------
// Client-side replica of a server-authoritative Draft game.
//
// The server never shares its draft RNG (that would let a client predict
// every future offer), so replicas roll placeholder offers locally and the
// server's dtOffer / dtState frames supply the real cards. Everything else
// (held buffs, board effects, tempo counters, board mutations) replays
// deterministically from the public draft action record.
// ---------------------------------------------------------------------------

/** Apply one public draft action to a local replica. */
export function applyDraftAction(game: NerfGame, action: MPDraftAction) {
  const bs = game.buffs;
  if (!bs) return;
  const ps = bs.players[action.color];
  if (action.a === "pick") {
    // Mirror pickDraftCard without needing the (possibly hidden) offer:
    // revealed cards run acquireBuff (the same init and instant effects the
    // server ran); masked cards land as inert face-down placeholders so the
    // buff-list indices stay aligned with the server's.
    ps.offer = null;
    if ((ps.flags.takeBoth ?? 0) > 0) ps.flags.takeBoth = (ps.flags.takeBoth ?? 0) - 1;
    for (const card of action.cards) {
      if (isHiddenCard(card)) {
        if ((ps.flags.nullifyIncoming ?? 0) > 0 && card.nullified) {
          ps.flags.nullifyIncoming = (ps.flags.nullifyIncoming ?? 0) - 1;
        }
        ps.buffs.push(hiddenPlaceholder(card));
      } else {
        acquireBuff(game, action.color, card.id, card.tier as Tier);
      }
    }
  } else if (action.a === "bank") {
    bankDraft(game, action.color);
  } else if (action.a === "diffFlag") {
    // A Chess Diff clock flag (a server-time event the move stream cannot
    // carry): end the diff against the flagged color and resume the paused
    // game, exactly as the server did.
    resolveDiffFlag(game, action.color);
  } else {
    // A use names the fired card: fill in a previously masked slot so the
    // engine can apply the real effect.
    const inst = ps.buffs[action.buffIndex];
    if (inst && !inst.id && action.card) {
      inst.id = action.card.id;
      inst.tier = action.card.tier as Tier;
    }
    activateBuff(game, action.color, action.buffIndex, action.picks);
  }
}

function isHiddenCard(card: MPDraftCard | MPHiddenCard): card is MPHiddenCard {
  return "hidden" in card && card.hidden === true;
}

/** A server-accepted move applied to a replica. Placeholder offer rolls and
 * reveal snapshots (rolled with the replica's dummy RNG) are discarded so
 * only server frames ever populate offers and reveals. */
export function playReplicaMove(game: NerfGame, move: Move): NerfGame {
  const bs = game.buffs;
  if (!bs) return playMove(game, move);
  const before = {
    w: { offer: bs.players.w.offer, oppReveal: bs.players.w.oppReveal },
    b: { offer: bs.players.b.offer, oppReveal: bs.players.b.oppReveal },
  };
  const next = playMove(game, move);
  const nbs = next.buffs;
  if (nbs) {
    for (const color of ["w", "b"] as Color[]) {
      if (nbs.players[color].offer !== before[color].offer) nbs.players[color].offer = null;
      if (nbs.players[color].oppReveal !== before[color].oppReveal) {
        nbs.players[color].oppReveal = before[color].oppReveal;
      }
    }
  }
  return next;
}

/** Merge a per-seat (or spectator) filtered dtState into the replica. Fields
 * the server withheld keep their replay-derived local values: opponent flags
 * without picksVisible are still tracked correctly by replaying the public
 * action record, and spectators never merge offers or reveals at all. */
export function mergeDraftState(bs: BuffMatchState, state: MPDraftState, myColor: Color | null) {
  bs.cadence = state.cadence;
  bs.effects = state.effects;
  bs.extraMoves = { ...state.extraMoves };
  bs.skips = { ...state.skips };
  bs.chainKingGuard = state.chainKingGuard;
  if (state.historyDiverged) bs.historyDiverged = true;
  for (const color of ["w", "b"] as Color[]) {
    const ps = bs.players[color];
    const ws = state.players[color];
    if (!ws) continue;
    ps.buffs = ws.buffs.map((b) => (isHiddenBuff(b) ? hiddenPlaceholder(b) : b));
    ps.draftsTaken = ws.draftsTaken;
    ps.nextDraftAt = ws.nextDraftAt;
    ps.offer = ws.offer ?? null;
    if (ws.flags) ps.flags = ws.flags;
    if (color === myColor) {
      ps.oppReveal = (ws.oppReveal as typeof ps.oppReveal) ?? null;
    }
    if (ws.nerfRemoved) ps.nerfRemoved = true;
    if (ws.revived) ps.revived = ws.revived as typeof ps.revived;
    // Crazyhouse-style pocket: authoritative from the server so a drop never
    // desyncs. Legacy frames omit it; the replica then keeps its replayed value.
    if (ws.inventory) ps.inventory = ws.inventory as typeof ps.inventory;
    // Skip announcements: carried so the skipped player's client can pop the
    // reason instead of showing a silently missing draft.
    if (ws.lastSkip !== undefined) ps.lastSkip = ws.lastSkip;
  }
}

/** Game over: the end frame carries every held buff with its real identity
 * (the draft analogue of both nerfs going public). Swap the replica's lists,
 * masked placeholders included, for the revealed record. */
export function revealHeldBuffs(
  bs: BuffMatchState,
  draftBuffs: Record<Color, { id: string; tier: number; spent?: boolean; nullified?: boolean }[]>,
) {
  for (const color of ["w", "b"] as Color[]) {
    const revealed = draftBuffs[color];
    if (!revealed) continue;
    bs.players[color].buffs = revealed.map((b, i) => {
      const existing = bs.players[color].buffs[i];
      if (existing && existing.id === b.id) return existing;
      return {
        id: b.id,
        tier: b.tier as Tier,
        state: {},
        ...(b.spent ? { spent: true } : {}),
        ...(b.nullified ? { nullified: true } : {}),
      };
    });
  }
}

/** Replay server moves and the public draft record interleaved by ply, so
 * board mutations from buffs land exactly where they did on the server. */
export function replayDraftGame(game: NerfGame, moves: string[], actions: MPDraftAction[]): NerfGame {
  let cursor = 0;
  const applyUpTo = (ply: number) => {
    while (cursor < actions.length && actions[cursor].ply <= ply) {
      applyDraftAction(game, actions[cursor]);
      cursor += 1;
    }
  };
  for (let i = 0; i < moves.length; i++) {
    applyUpTo(i);
    // A server-accepted move the replica cannot regenerate (a hidden nerf or
    // buff effect it does not know about) is applied raw instead of aborting
    // the replay: the server already validated it, and stopping mid-replay
    // would strand the board several plies behind for the rest of the game.
    const move =
      legalMoves(game).find((candidate) => moveToUCI(candidate) === moves[i]) ??
      moveFromUCI(game.board, moves[i]);
    if (!move) return game;
    game = playReplicaMove(game, move);
  }
  applyUpTo(moves.length);
  return game;
}

/** Replay server moves + the public draft record but STOP after `ply`
 * half-moves, so a spectator (or the TV board) can reconstruct any past
 * position — including one a board-rewriting card diverged from move history.
 * Because it replays the draft actions through the engine (not plain
 * move-replay), summons, removals, teleports, drops, and timed losses are
 * reproduced exactly, so history review works PAST a divergence instead of
 * locking. Draft actions carry the accepted-move count at which they fired, so
 * only those recorded at ply <= `ply` are applied — the same interleaving the
 * live game had after that many moves. */
export function replayDraftGameToPly(
  game: NerfGame,
  moves: string[],
  actions: MPDraftAction[],
  ply: number,
): NerfGame {
  const end = Math.max(0, Math.min(ply, moves.length));
  let cursor = 0;
  const applyUpTo = (upto: number) => {
    while (cursor < actions.length && actions[cursor].ply <= upto) {
      applyDraftAction(game, actions[cursor]);
      cursor += 1;
    }
  };
  for (let i = 0; i < end; i++) {
    applyUpTo(i);
    const move =
      legalMoves(game).find((candidate) => moveToUCI(candidate) === moves[i]) ??
      moveFromUCI(game.board, moves[i]);
    if (!move) return game;
    game = playReplicaMove(game, move);
  }
  applyUpTo(end);
  return game;
}

// Spectators never learn either rule, so both sides replay with a no-op
// nerf. Server-validated moves are always found: nerfs only restrict moves,
// and buff-granted ones come back through the replayed public record.
const SPECTATOR_NERF: Nerf = {
  id: "noop",
  name: "Unknown",
  description: "",
  tier: 1,
  implemented: true,
};

/** Build a spectator replica of a draft game from a wstart payload. */
export function buildSpectatorDraftGame(
  moves: string[],
  actions: MPDraftAction[],
  state?: MPDraftState,
  mode?: DraftMode,
): NerfGame {
  const game = newGame(SPECTATOR_NERF, SPECTATOR_NERF, 1);
  enableDraftMode(game, 1, { mode });
  const replayed = replayDraftGame(game, moves, actions);
  if (state && replayed.buffs) mergeDraftState(replayed.buffs, state, null);
  return replayed;
}

/** Build a spectator replica of a draft game AT a past ply, for history review
 * that must jump PAST a board rewrite. Reconstructs from the move + action
 * record through the engine so the position is faithful even when
 * historyDiverged is set (plain move-replay would show a wrong board). No
 * dtState is merged: it carries the CURRENT effect/buff state, which does not
 * belong on a past position. Callers verify the replica reached the requested
 * ply (board.history.length === ply) and fall back to the live board / a locked
 * notice when it did not, rather than trusting a short reconstruction. */
export function buildSpectatorDraftGameAtPly(
  moves: string[],
  actions: MPDraftAction[],
  ply: number,
  mode?: DraftMode,
): NerfGame {
  const game = newGame(SPECTATOR_NERF, SPECTATOR_NERF, 1);
  enableDraftMode(game, 1, { mode });
  return replayDraftGameToPly(game, moves, actions, ply);
}

export type DraftZones = {
  frozen: number[];
  shielded: number[];
  ward: number[];
  barred: number[];
  strike: number[];
  /** Pieces hexed into walnuts: a heavy nut that can only shuffle one square. */
  walnut: number[];
  /** Per-frozen-square visual theme (glue, stun, sleep, tar...): the mechanic
   * is identical, only the paint differs so two "stuck" cards never look the
   * same. Missing entry = the default "ice" frost. */
  frozenSkin: Record<number, string>;
  /** Per-square remaining turns for the effect on it (freeze/walnut/shield/
   * ward/barred/locked/strike). null = permanent. Powers the hover duration. */
  turns: Record<number, number | null>;
  /** Pieces shackled by a king-only or no-pawn-advance hex: they cannot move
   * while the hex holds, so they are marked with a chain. */
  locked: number[];
  /** Untriggered banana peels from EITHER player, marked with the peel.
   * Placed traps are public the moment they land (owner rule: full
   * visibility), so both players see every peel. */
  banana: number[];
  /** Every other placed trap, drawn with its own realistic marker (owner
   * request: "a super realistic animation and icon" for placements). Same
   * visibility rule as the peels: public to both players from placement. */
  traps: TrapMark[];
  /** Doomed pieces (timed_loss effects: Death Arcana and friends): the piece
   * on this square dies when the countdown reaches zero. */
  doom: { sq: number; turns: number }[];
};

export type TrapKind = "mine" | "sinkhole" | "trapdoor" | "whoopee" | "landlord" | "beartrap";

export interface TrapMark {
  sq: number;
  kind: TrapKind;
  /** Card name, for the hover tooltip. */
  name: string;
}

/** Squares held in place by an active Immobilizer: enemy non-king pieces
 * adjacent to the bound piece. Painted with the frozen tint so the lockdown
 * is visible on the board instead of silently pruning moves. */
function immobilizedSquares(game: NerfGame): number[] {
  const bs = game.buffs;
  if (!bs) return [];
  const out: number[] = [];
  for (const color of ["w", "b"] as Color[]) {
    for (const inst of bs.players[color].buffs) {
      if (inst.id !== "immobilizer" || inst.spent || inst.nullified) continue;
      const sq = inst.state.sq as number | undefined;
      if (sq == null) continue;
      const holder = game.board.pieces[sq];
      if (!holder || holder.color !== color) continue;
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const f = (sq % 8) + df, r = (sq >> 3) + dr;
          if (f < 0 || f > 7 || r < 0 || r > 7) continue;
          const n = r * 8 + f;
          const p = game.board.pieces[n];
          if (p && p.color !== color && p.type !== "k") out.push(n);
        }
      }
    }
  }
  return out;
}

/** Board paint for the public zone effects, matching the bot game's wiring:
 * frozen pieces, sanctuary squares, barred squares for each side, and the
 * lightning-struck squares' brief flash. */
export function draftZones(game: NerfGame, myColor: Color): DraftZones {
  const zones: DraftZones = { frozen: [], shielded: [], ward: [], barred: [], strike: [], walnut: [], frozenSkin: {}, turns: {}, locked: [], banana: [], traps: [], doom: [] };
  if (!game.buffs) return zones;
  zones.frozen.push(...immobilizedSquares(game));
  const addTrap = (sq: number, kind: TrapKind, name: string) => {
    if (!zones.traps.some((t) => t.sq === sq)) zones.traps.push({ sq, kind, name });
  };
  // Placed traps are stored on their buff instance (not in effects) and are
  // PUBLIC from the moment they land: every activation is broadcast with its
  // targets (dtUsed / the public action record), so both replicas hold the
  // squares. Paint them for BOTH players; nothing placed stays hidden.
  for (const color of ["w", "b"] as Color[]) {
    for (const inst of game.buffs.players[color].buffs) {
      if (inst.spent || inst.nullified) continue;
      if (inst.id === "banana_peel") {
        // Current cards store a list in state.sqs; older saves a single sq.
        const sqs =
          (inst.state.sqs as number[] | undefined) ??
          (inst.state.sq != null ? [inst.state.sq as number] : []);
        for (const sq of sqs) if (!zones.banana.includes(sq)) zones.banana.push(sq);
      } else if (
        inst.id === "void" ||
        inst.id === "abyss" ||
        inst.id === "void_realm" ||
        inst.id === "we_flood" ||
        inst.id === "wc_black_hole" ||
        inst.id === "wc_haunted_house"
      ) {
        // Void squares swallow enemy pieces that enter: painted as a hostile
        // barrier for the threatened side and as the owner's ward. The flood /
        // black hole / haunted house voids were previously painted NOWHERE:
        // an invisible trap the opponent could not play around.
        const sqs = (inst.state.squares as number[] | undefined) ?? [];
        (color === myColor ? zones.ward : zones.barred).push(...sqs);
      } else if (inst.id === "minefield" || inst.id === "sinkhole") {
        // Void-mechanic traps with their own realistic markers.
        const sqs = (inst.state.squares as number[] | undefined) ?? [];
        for (const sq of sqs) addTrap(sq, inst.id === "minefield" ? "mine" : "sinkhole", inst.id === "minefield" ? "Mine" : "Sinkhole");
      } else if (inst.id === "landlord") {
        const sqs = (inst.state.squares as number[] | undefined) ?? [];
        for (const sq of sqs) addTrap(sq, "landlord", "Claimed by the Landlord");
      } else if (inst.id === "trapdoor") {
        // Armed while its timed window is open (state.turns ticks down).
        const sq = inst.state.sq as number | undefined;
        const turns = (inst.state.turns as number | undefined) ?? 0;
        if (sq != null && turns > 0) addTrap(sq, "trapdoor", "Trapdoor");
      } else if (inst.id === "bear_trap") {
        // Set and unsprung: the steel jaws wait on the square (once it snaps
        // the card is spent and the caught piece wears the beartrap skin).
        const sq = inst.state.sq as number | undefined;
        if (sq != null) addTrap(sq, "beartrap", "Bear Trap");
      } else if (inst.id === "whoopee_cushion") {
        // Hidden until it fires; once armed the gag rides the sitting piece,
        // so the cushion mark leaves the square.
        const sq = inst.state.cushion as number | undefined;
        if (sq != null && inst.state.armed == null) addTrap(sq, "whoopee", "Whoopee Cushion");
      } else if (inst.id === "flypaper_file") {
        // A limed file, while its window is open: same hostile/ward split.
        const sq = inst.state.sq as number | undefined;
        const turns = (inst.state.turns as number | undefined) ?? 0;
        if (sq != null && turns > 0) {
          const file = sq % 8;
          const squares = Array.from({ length: 8 }, (_, r) => r * 8 + file);
          (color === myColor ? zones.ward : zones.barred).push(...squares);
        }
      }
    }
  }
  const noteTurns = (sq: number, turns: number | null) => {
    // Keep the LONGEST remaining timer when two effects overlap a square: the
    // piece stays affected until the last one lifts, so the shorter timer would
    // undercount how many turns it is truly stuck (the "says 1 turn left but it
    // is really more" bug). null means permanent, which always wins.
    const cur = zones.turns[sq];
    if (cur === undefined) {
      zones.turns[sq] = turns;
      return;
    }
    if (cur == null) return; // already permanent: the longest possible
    if (turns == null || turns > cur) zones.turns[sq] = turns;
  };
  for (const e of game.buffs.effects) {
    if (e.turns != null && e.turns <= 0) continue;
    if (e.kind === "freeze") {
      zones.frozen.push(e.sq);
      zones.frozenSkin[e.sq] = e.skin ?? "ice";
      noteTurns(e.sq, e.turns);
    } else if (e.kind === "walnut") {
      zones.walnut.push(e.sq);
      noteTurns(e.sq, e.turns);
    } else if (e.kind === "timed_loss") {
      // A doomed piece (Death Arcana style): badge with the countdown.
      if (e.turns != null && e.turns > 0) {
        zones.doom.push({ sq: e.sq, turns: e.turns });
        noteTurns(e.sq, e.turns);
      }
    } else if (e.kind === "shield") {
      if (e.squares) {
        // Only paint a shield square that still holds the owner's piece. A
        // square-bound shield whose piece moved off or was captured leaves a
        // stale entry in e.squares, which would otherwise keep the green tint
        // lit forever. Mirrors the whole-army branch's piece-presence check,
        // and both clients read the same synced board so it stays in sync.
        for (const sq of e.squares) {
          const p = game.board.pieces[sq];
          if (p && p.color === e.owner) {
            zones.shielded.push(sq);
            noteTurns(sq, e.turns);
          }
        }
      } else {
        for (let sq = 0; sq < 64; sq++) {
          const p = game.board.pieces[sq];
          if (p && p.color === e.owner) {
            zones.shielded.push(sq);
            noteTurns(sq, e.turns);
          }
        }
      }
    } else if (e.kind === "barred") {
      (e.against === myColor ? zones.barred : zones.ward).push(...e.squares);
      for (const sq of e.squares) noteTurns(sq, e.turns);
    } else if (e.kind === "strike") {
      zones.strike.push(...e.squares);
    } else if (e.kind === "king_only") {
      // Only the king may move: every other friendly piece is shackled.
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (p && p.color === e.against && p.type !== "k") {
          zones.locked.push(sq);
          noteTurns(sq, e.turns);
        }
      }
    } else if (e.kind === "no_pawn_advance") {
      // Pawns can't advance: mark them as shackled.
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (p && p.color === e.against && p.type === "p") {
          zones.locked.push(sq);
          noteTurns(sq, e.turns);
        }
      }
    }
  }
  return zones;
}

// Card markers for the result-screen match timeline, drawn from the public
// action stream this viewer holds: "use" activations and revealed "pick"s are
// the moments a card visibly landed (masked/held picks never reach this
// stream with an id). Shared by the live game view, the spectator view, and
// archived replays so all three screens tell the same card history.
export function cardEventsFromDtActions(
  actions: MPDraftAction[],
): { ply: number; color?: Color; cardId?: string; tier?: number }[] {
  const out: { ply: number; color?: Color; cardId?: string; tier?: number }[] = [];
  for (const a of actions) {
    if (a.a === "use" && a.card?.id) {
      out.push({ ply: a.ply, color: a.color, cardId: a.card.id, tier: a.card.tier });
    } else if (a.a === "pick") {
      for (const c of a.cards) {
        if ("id" in c && c.id) out.push({ ply: a.ply, color: a.color, cardId: c.id, tier: c.tier });
      }
    }
  }
  return out;
}
